require('dotenv').config();
const express = require('express');
const path = require('path');
const admin = require('firebase-admin');
const emailjs = require('@emailjs/nodejs');
const { exec } = require('child_process');
const fs = require('fs');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 5500;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const RATE_LIMIT_PER_DAY = parseInt(process.env.RATE_LIMIT_PER_DAY || '50', 10);

// ---- Firebase Admin init --------------------------------------------------
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({ credential: admin.credential.cert(sa), storageBucket: 'codewix-16971.firebasestorage.app' });
  } else if (process.env.FIREBASE_PROJECT_ID) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      }),
      storageBucket: 'codewix-16971.firebasestorage.app'
    });
  }
} catch (err) { console.error('[Firebase Admin] init failed:', err.message); }

let emailjsReady = false;
if (process.env.EMAILJS_PUBLIC_KEY && process.env.EMAILJS_PRIVATE_KEY) {
  emailjs.init({ publicKey: process.env.EMAILJS_PUBLIC_KEY, privateKey: process.env.EMAILJS_PRIVATE_KEY });
  emailjsReady = true;
}

app.use(express.json({ limit: '5mb' }));

// ---- Helpers & Auth Middleware ---------------------------------------------
function rewritePublishedLinks(html, slug) {
  if (!html) return '';
  return html.replace(/(href|src)=(["'])(?!(?:[a-z]+:|\/\/|#|mailto:|tel:))([^"']+)\2/gi, function (match, attr, quote, url) {
    if (url.startsWith('/s/') || url.startsWith('/api/')) return match;
    if (url.startsWith('/')) return attr + '=' + quote + '/s/' + slug + url + quote;
    return attr + '=' + quote + '/s/' + slug + '/' + url + quote;
  });
}

function resolveAssetUrls(html, files) {
  if (!html) return '';
  return html.replace(/(src|href)=(["'])([^"'\n]+)\2/gi, function (match, attr, quote, url) {
    if (/^(https?:|\/\/|#|data:|mailto:|tel:)/i.test(url)) return match;
    var key = 'asset:' + url;
    if (files[key]) return attr + '=' + quote + files[key] + quote;
    return match;
  });
}

async function requireAuth(req, res, next) {
  if (!admin.apps.length) return res.status(500).json({ error: 'Auth not configured.' });
  const header = req.headers.authorization || '';
  const idToken = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!idToken) return res.status(401).json({ error: 'Missing auth token.' });
  try { req.user = await admin.auth().verifyIdToken(idToken); next(); } catch (err) { return res.status(401).json({ error: 'Invalid auth token.' }); }
}

async function checkRateLimit(req, res, next) {
  const uid = req.user.uid;
  const today = new Date().toISOString().slice(0, 10);
  const ref = admin.firestore().collection('users').doc(uid).collection('usage').doc(today);
  try {
    const doc = await ref.get();
    const count = doc.exists ? (doc.data().count || 0) : 0;
    if (count >= RATE_LIMIT_PER_DAY) return res.status(429).json({ error: 'Daily limit reached.' });
    req.rateLimitRef = ref; req.rateLimitCount = count; next();
  } catch (err) { next(); }
}

function incrementUsage(ref, currentCount) {
  ref.set({ count: (currentCount || 0) + 1, lastUsed: new Date().toISOString() }, { merge: true }).catch(() => {});
}

// ---- API: Groq chat proxy (STREAMING) ------------------------------------
app.post('/api/chat', requireAuth, checkRateLimit, async (req, res) => {
  if (!GROQ_API_KEY) return res.status(500).json({ error: 'Server is missing GROQ_API_KEY.' });
  const { messages, model, temperature, max_completion_tokens, reasoning_effort } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) return res.status(400).json({ error: 'messages array is required.' });

  try {
    const body = {
      model: model || 'openai/gpt-oss-120b',
      messages: messages,
      temperature: typeof temperature === 'number' ? temperature : 0.7,
      max_completion_tokens: max_completion_tokens || 2048,
      stream: true // 👈 ENABLE STREAMING
    };
    if (reasoning_effort) body.reasoning_effort = reasoning_effort;

    const groqRes = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + GROQ_API_KEY },
      body: JSON.stringify(body)
    });

    if (!groqRes.ok) {
      const errData = await groqRes.json();
      return res.status(groqRes.status).json(errData);
    }

    // Set headers for SSE (Server-Sent Events)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Pipe the stream to the frontend
    const reader = groqRes.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let done = false;

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      if (value) {
        res.write(decoder.decode(value, { stream: true }));
      }
    }
    res.end();
    incrementUsage(req.rateLimitRef, req.rateLimitCount);

  } catch (err) {
    console.error('[Stream Error]', err);
    if (!res.headersSent) res.status(502).json({ error: 'Failed to reach Groq: ' + err.message });
    else res.end();
  }
});

// ---- API: Other routes (Run, Publish, etc) -------------------------------
app.post('/api/run', requireAuth, async (req, res) => {
  const { language, code } = req.body || {};
  if (!language || !code) return res.status(400).json({ error: 'language and code are required.' });
  const lang = language.toLowerCase();

  if (lang === 'py' || lang === 'python') {
    const tempFile = path.join(os.tmpdir(), `script_${Date.now()}.py`);
    fs.writeFileSync(tempFile, code);
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    exec(`${pythonCmd} "${tempFile}"`, { timeout: 120000 }, (error, stdout, stderr) => {
      try { fs.unlinkSync(tempFile); } catch (e) {}
      let finalErr = stderr;
      if (error && !stderr) finalErr = error.message;
      res.json({ output: stdout || '', stderr: finalErr || '', code: error ? 1 : 0 });
    });
    return;
  }

  const langMap = { 'php': 68, 'js': 63, 'javascript': 63, 'cpp': 54, 'c++': 54, 'c': 50, 'java': 62, 'rb': 72, 'ruby': 72, 'go': 60, 'rs': 73, 'rust': 73, 'ts': 74, 'cs': 51 };
  const langId = langMap[lang];
  if (!langId) return res.status(400).json({ error: 'Unsupported language.' });

  try {
    const response = await fetch('https://ce.judge0.com/submissions?base64_encoded=false&wait=true', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language_id: langId, source_code: code })
    });
    const data = await response.json();
    res.json({ output: data.stdout || '', stderr: data.stderr || data.compile_output || '', code: data.status ? data.status.id : 0 });
  } catch (err) { res.status(500).json({ error: 'Execution engine failed: ' + err.message }); }
});

app.post('/api/publish', requireAuth, async (req, res) => { /* ... keep your existing publish code ... */ });
app.post('/api/unpublish', requireAuth, async (req, res) => { /* ... keep your existing unpublish code ... */ });
app.get('/api/my-published', requireAuth, async (req, res) => { /* ... keep your existing my-published code ... */ });
app.get('/api/explore', async (req, res) => { /* ... keep your existing explore code ... */ });
app.get('/api/user/:username', async (req, res) => { /* ... keep your existing user profile code ... */ });
app.post('/api/send-verification-email', async (req, res) => { /* ... keep your existing email code ... */ });
app.post('/api/contact', async (req, res) => { /* ... keep your existing contact code ... */ });

app.get('/s/:slug', async (req, res, next) => { /* ... keep your existing /s/:slug code ... */ });
app.get('/s/:slug/:filename', async (req, res, next) => { /* ... keep your existing /s/:slug/:filename code ... */ });
app.get('/u/:username', (req, res) => res.sendFile(path.join(__dirname, 'profile.html')));

app.use('/api', (req, res) => res.status(404).json({ error: 'Unknown API route.' }));
app.use(express.static(path.join(__dirname)));
app.use((req, res) => res.status(404).sendFile(path.join(__dirname, '404.html')));

app.listen(PORT, '0.0.0.0', () => console.log('\n✅ CodeWix Web running on port ' + PORT + '\n'));
