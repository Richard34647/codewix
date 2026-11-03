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
    console.log('✅ [Firebase Admin] Initialized via FIREBASE_SERVICE_ACCOUNT');
  } else if (process.env.FIREBASE_PROJECT_ID) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      }),
      storageBucket: 'codewix-16971.firebasestorage.app'
    });
    console.log('✅ [Firebase Admin] Initialized via env vars');
  } else {
    console.warn('❌ [Firebase Admin] No credentials found.');
  }
} catch (err) { console.error('❌ [Firebase Admin] init failed:', err.message); }

let emailjsReady = false;
if (process.env.EMAILJS_PUBLIC_KEY && process.env.EMAILJS_PRIVATE_KEY) {
  emailjs.init({ publicKey: process.env.EMAILJS_PUBLIC_KEY, privateKey: process.env.EMAILJS_PRIVATE_KEY });
  emailjsReady = true;
  console.log('✅ [EmailJS] Initialized');
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
  if (!admin.apps.length) {
    console.error('❌ Auth failed: Firebase Admin not initialized.');
    return res.status(500).json({ error: 'Auth not configured. Missing Firebase credentials on server.' });
  }
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
      stream: true // ENABLE STREAMING
    };
    if (reasoning_effort) body.reasoning_effort = reasoning_effort;

    const groqRes = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + GROQ_API_KEY },
      body: JSON.stringify(body)
    });

    if (!groqRes.ok) {
      let errData;
      try { errData = await groqRes.json(); } catch(e) { errData = { error: 'Unknown Groq Error' }; }
      console.error('❌ [Groq API Error]', groqRes.status, errData);
      return res.status(groqRes.status).json({ error: errData.error?.message || errData.error || 'Groq API Error' });
    }

    if (!groqRes.body) {
      throw new Error('Groq returned an empty response body.');
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
      if (value) res.write(decoder.decode(value, { stream: true }));
    }
    res.end();
    
    // Increment usage after stream finishes
    incrementUsage(req.rateLimitRef, req.rateLimitCount);

  } catch (err) {
    console.error('❌ [Stream Error]', err);
    if (!res.headersSent) res.status(500).json({ error: 'Failed to reach Groq: ' + err.message });
    else res.end();
  }
});

// ---- API: Run Code -------------------------------------------------------
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

// ---- API: Publish --------------------------------------------------------
app.post('/api/publish', requireAuth, async (req, res) => {
  const { slug, projectName, description, files } = req.body || {};
  if (!slug || !files) return res.status(400).json({ error: 'slug and files are required.' });
  if (!/^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/.test(slug)) return res.status(400).json({ error: 'Invalid slug.' });
  
  const pubRef = admin.firestore().collection('published').doc(slug);
  try {
    const result = await admin.firestore().runTransaction(async (tx) => {
      const doc = await tx.get(pubRef);
      if (doc.exists) {
        if (doc.data().uid !== req.user.uid) throw new Error('SLUG_TAKEN');
        tx.set(pubRef, { uid: req.user.uid, username: req.user.email.split('@')[0], slug, projectName, description, files, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        return { created: false };
      }
      tx.set(pubRef, { uid: req.user.uid, username: req.user.email.split('@')[0], slug, projectName, description, files, views: 0, publishedAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      return { created: true };
    });
    res.json({ ok: true, url: '/s/' + slug, fullUrl: req.protocol + '://' + req.get('host') + '/s/' + slug });
  } catch (err) {
    if (err.message === 'SLUG_TAKEN') return res.status(409).json({ error: 'Slug taken.' });
    res.status(500).json({ error: err.message });
  }
});

// ---- API: Unpublish -------------------------------------------------------
app.post('/api/unpublish', requireAuth, async (req, res) => {
  try {
    const ref = admin.firestore().collection('published').doc(req.body.slug);
    const doc = await ref.get();
    if (doc.exists && doc.data().uid === req.user.uid) { await ref.delete(); res.json({ ok: true }); }
    else res.status(403).json({ error: 'Not your site.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ---- API: My published sites ---------------------------------------------
app.get('/api/my-published', requireAuth, async (req, res) => {
  try {
    const snap = await admin.firestore().collection('published').where('uid', '==', req.user.uid).orderBy('updatedAt', 'desc').get();
    const sites = [];
    snap.forEach(doc => sites.push({ ...doc.data(), updatedAt: doc.data().updatedAt?.toDate().toISOString() }));
    res.json({ sites });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ---- API: Explore ---------------------------------------------------------
app.get('/api/explore', async (req, res) => {
  try {
    const snap = await admin.firestore().collection('published').orderBy('updatedAt', 'desc').limit(60).get();
    const sites = [];
    snap.forEach(doc => sites.push({ ...doc.data(), updatedAt: doc.data().updatedAt?.toDate().toISOString() }));
    res.json({ sites });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ---- API: User profile ----------------------------------------------------
app.get('/api/user/:username', async (req, res) => {
  try {
    const snap = await admin.firestore().collection('published').where('username', '==', req.params.username).orderBy('updatedAt', 'desc').get();
    const sites = [];
    snap.forEach(doc => sites.push({ ...doc.data(), updatedAt: doc.data().updatedAt?.toDate().toISOString() }));
    res.json({ username: req.params.username, sites, count: sites.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ---- API: Send verification email ----------------------------------------
app.post('/api/send-verification-email', async (req, res) => {
  if (!emailjsReady) return res.status(500).json({ error: 'EmailJS not configured.' });
  try {
    const link = await admin.auth().generateEmailVerificationLink(req.body.userEmail, { url: req.body.redirectUrl || 'http://localhost:5500/verify.html' });
    await emailjs.send(process.env.EMAILJS_SERVICE_ID, process.env.EMAILJS_TEMPLATE_ID, { to_email: req.body.userEmail, user_name: req.body.userName || 'there', verification_link: link });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ---- API: Contact form ----------------------------------------------------
app.post('/api/contact', async (req, res) => {
  if (!emailjsReady) return res.status(500).json({ error: 'EmailJS not configured.' });
  try {
    await emailjs.send(process.env.EMAILJS_SERVICE_ID, process.env.EMAILJS_CONTACT_TEMPLATE_ID, { from_name: req.body.name, reply_to: req.body.email, subject: req.body.subject, message: req.body.message, to_email: 'codewix@proton.me' });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ---- Routes: /s/:slug, /s/:slug/:filename, /u/:username ------------------
app.get('/s/:slug', async (req, res, next) => {
  if (!admin.apps.length) return next();
  try {
    const doc = await admin.firestore().collection('published').doc(req.params.slug).get();
    if (!doc.exists) return res.status(404).sendFile(path.join(__dirname, '404.html'));
    const files = doc.data().files || {};
    doc.ref.update({ views: admin.firestore.FieldValue.increment(1) }).catch(() => {});
    let rawHtml = resolveAssetUrls(files['index.html'] || '', files);
    const html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>' + (doc.data().projectName || req.params.slug) + '</title><style>' + (files['style.css'] || '') + '</style></head><body>' + rewritePublishedLinks(rawHtml, req.params.slug) + '<script>' + (files['script.js'] || '') + '<\/script></body></html>';
    res.send(html);
  } catch (err) { next(); }
});

app.get('/s/:slug/:filename', async (req, res, next) => {
  if (!admin.apps.length) return next();
  try {
    const doc = await admin.firestore().collection('published').doc(req.params.slug).get();
    if (!doc.exists) return res.status(404).sendFile(path.join(__dirname, '404.html'));
    const files = doc.data().files || {};
    const file = files[req.params.filename];
    if (!file) return res.status(404).sendFile(path.join(__dirname, '404.html'));
    const ext = path.extname(req.params.filename).toLowerCase();
    let finalContent = file;
    if (ext === '.html' || ext === '.htm') finalContent = rewritePublishedLinks(resolveAssetUrls(file, files), req.params.slug);
    res.type({ '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg' }[ext] || 'text/plain').send(finalContent);
  } catch (err) { next(); }
});

app.get('/u/:username', (req, res) => res.sendFile(path.join(__dirname, 'profile.html')));

// ---- Fallbacks ------------------------------------------------------------
app.use('/api', (req, res) => res.status(404).json({ error: 'Unknown API route.' }));
app.use(express.static(path.join(__dirname)));
app.use((req, res) => res.status(404).sendFile(path.join(__dirname, '404.html')));

app.listen(PORT, '0.0.0.0', () => console.log('\n✅ CodeWix Web running on port ' + PORT + '\n'));
