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
const DAILY_TOKEN_LIMIT = 100000; // 100k tokens for free users
const POLLINATIONS_API_KEY = process.env.POLLINATIONS_API_KEY;

// ==========================================
// FIREBASE ADMIN INITIALIZATION (RENDER READY)
// ==========================================
try {
  const localPath = path.join(__dirname, 'firebase-service-account.json');
  const renderSecretPath = '/etc/secrets/firebase-service-account.json';

  if (fs.existsSync(renderSecretPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(renderSecretPath, 'utf8'));
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount), storageBucket: 'codewix-16971.firebasestorage.app' });
    console.log('✅ [Firebase Admin] Initialized via Render Secret File');
  } else if (fs.existsSync(localPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(localPath, 'utf8'));
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount), storageBucket: 'codewix-16971.firebasestorage.app' });
    console.log('✅ [Firebase Admin] Initialized via local JSON file');
  } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      }),
      storageBucket: 'codewix-16971.firebasestorage.app'
    });
    console.log('✅ [Firebase Admin] Initialized via env variables');
  } else {
    console.error('❌ [Firebase Admin] CRITICAL ERROR: No credentials found!');
  }
} catch (err) { console.error('❌ [Firebase Admin] init failed:', err.message); }

let emailjsReady = false;
if (process.env.EMAILJS_PUBLIC_KEY && process.env.EMAILJS_PRIVATE_KEY) {
  emailjs.init({ publicKey: process.env.EMAILJS_PUBLIC_KEY, privateKey: process.env.EMAILJS_PRIVATE_KEY });
  emailjsReady = true;
  console.log('✅ [EmailJS] Initialized');
}

app.use(express.json({ limit: '50mb' }));

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
  try { 
    req.user = await admin.auth().verifyIdToken(idToken); 
    req.isPremium = req.user.premium === true; 
    next(); 
  } catch (err) { 
    return res.status(401).json({ error: 'Invalid auth token.' }); 
  }
}

async function checkRateLimit(req, res, next) {
  if (req.isPremium) return next(); // PRO USERS HAVE NO LIMITS

  const uid = req.user.uid;
  const today = new Date().toISOString().slice(0, 10);
  const ref = admin.firestore().collection('users').doc(uid).collection('usage').doc(today);
  
  try {
    const doc = await ref.get();
    const tokensUsed = doc.exists ? (doc.data().tokens || 0) : 0;
    if (tokensUsed >= DAILY_TOKEN_LIMIT) {
      return res.status(429).json({ error: 'Daily token limit reached. Upgrade to Pro for unlimited access.' });
    }
    req.rateLimitRef = ref; req.currentTokens = tokensUsed; next();
  } catch (err) { next(); }
}

// ==========================================
// AI CHAT ROUTE (WITH TOKEN TRACKING)
// ==========================================
app.post('/api/chat', requireAuth, checkRateLimit, async (req, res) => {
  if (!GROQ_API_KEY) return res.status(500).json({ error: 'Server is missing GROQ_API_KEY.' });
  const { messages, model, temperature, max_completion_tokens, reasoning_effort } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) return res.status(400).json({ error: 'messages array is required.' });

  try {
    let finalModel = model || 'openai/gpt-oss-120b';
    if (!req.isPremium && finalModel.includes('70b')) {
      finalModel = 'llama-3.1-8b-instant'; // Force free users to fast model
    }

    const body = {
      model: finalModel, messages: messages,
      temperature: typeof temperature === 'number' ? temperature : 0.7,
      max_completion_tokens: max_completion_tokens || 2048, stream: true,
      stream_options: { include_usage: true } // Tells Groq to send token usage at the end
    };
    if (reasoning_effort && req.isPremium) body.reasoning_effort = reasoning_effort;

    const groqRes = await fetch(GROQ_ENDPOINT, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + GROQ_API_KEY },
      body: JSON.stringify(body)
    });

    if (!groqRes.ok) {
      let errData; try { errData = await groqRes.json(); } catch(e) { errData = { error: 'Unknown Groq Error' }; }
      return res.status(groqRes.status).json({ error: errData.error?.message || errData.error || 'Groq API Error' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = groqRes.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let done = false;
    let buffer = '';
    let totalTokensUsed = 0;

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      if (value) {
        const chunk = decoder.decode(value, { stream: true });
        res.write(chunk);

        buffer += chunk;
        let lines = buffer.split('\n');
        buffer = lines.pop(); 
        
        for (let line of lines) {
          if (line.startsWith('data: ') && line.trim() !== 'data: [DONE]') {
            try {
              const parsed = JSON.parse(line.slice(6));
              if (parsed.usage && parsed.usage.total_tokens) {
                totalTokensUsed = parsed.usage.total_tokens;
              }
            } catch (e) {}
          }
        }
      }
    }
    res.end();

    if (buffer.trim().startsWith('data: ') && buffer.trim() !== 'data: [DONE]') {
      try {
        const parsed = JSON.parse(buffer.trim().slice(6));
        if (parsed.usage && parsed.usage.total_tokens) totalTokensUsed = parsed.usage.total_tokens;
      } catch (e) {}
    }

    if (!req.isPremium && totalTokensUsed > 0 && req.rateLimitRef) {
      await req.rateLimitRef.set({ tokens: admin.firestore.FieldValue.increment(totalTokensUsed) }, { merge: true });
    }

  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: 'Failed to reach Groq: ' + err.message });
    else res.end();
  }
});

// ==========================================
// FETCH USER USAGE ROUTE
// ==========================================
app.get('/api/user/usage', requireAuth, async (req, res) => {
  if (req.isPremium) return res.json({ isPremium: true, tokensUsed: 0, limit: DAILY_TOKEN_LIMIT });
  try {
    const today = new Date().toISOString().slice(0, 10);
    const doc = await admin.firestore().collection('users').doc(req.user.uid).collection('usage').doc(today).get();
    const tokensUsed = doc.exists ? (doc.data().tokens || 0) : 0;
    res.json({ isPremium: false, tokensUsed: tokensUsed, limit: DAILY_TOKEN_LIMIT });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// CONTACT FORM ROUTE
// ==========================================
app.post('/api/contact', async (req, res) => {
  const { name, email, subject, message } = req.body || {};
  if (!name || !email || !message) return res.status(400).json({ error: 'Name, email, and message are required.' });

  try {
    if (emailjsReady && process.env.EMAILJS_CONTACT_TEMPLATE_ID) {
      await emailjs.send(
        process.env.EMAILJS_SERVICE_ID, 
        process.env.EMAILJS_CONTACT_TEMPLATE_ID, 
        { from_name: name, from_email: email, subject: subject || 'New Contact Form Submission', message: message, to_email: 'codewix@proton.me' }
      );
      res.json({ ok: true, message: 'Message sent successfully' });
    } else {
      console.log('--- NEW CONTACT FORM SUBMISSION ---');
      console.log('Name:', name, '| Email:', email, '| Subject:', subject);
      console.log('Message:', message);
      res.json({ ok: true, message: 'Message received (logged to server)' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to send message: ' + err.message });
  }
});

// ==========================================
// ADMIN & LESSONS ROUTES
// ==========================================
const ADMIN_EMAIL = 'wilcoxr889@gmail.com';

app.get('/api/admin/stats', requireAuth, async (req, res) => {
  if (req.user.email !== ADMIN_EMAIL) return res.status(403).json({ error: 'Unauthorized' });
  try {
    const usersList = await admin.auth().listUsers(1000);
    const projectsSnap = await admin.firestore().collection('published').get();
    const lessonsSnap = await admin.firestore().collection('lessons').get();
    let premiumCount = 0;
    usersList.users.forEach(u => { if (u.customClaims?.premium) premiumCount++; });
    res.json({ totalUsers: usersList.users.length, premiumUsers: premiumCount, totalProjects: projectsSnap.size, totalLessons: lessonsSnap.size });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/users', requireAuth, async (req, res) => {
  if (req.user.email !== ADMIN_EMAIL) return res.status(403).json({ error: 'Unauthorized' });
  try {
    const listUsersResult = await admin.auth().listUsers(1000);
    const users = listUsersResult.users.map(u => ({ uid: u.uid, email: u.email, displayName: u.displayName || 'No Name', premium: u.customClaims?.premium === true }));
    res.json({ users });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/update-user', requireAuth, async (req, res) => {
  if (req.user.email !== ADMIN_EMAIL) return res.status(403).json({ error: 'Unauthorized' });
  const { uid, action } = req.body;
  try {
    if (action === 'toggle-premium') {
      const userRecord = await admin.auth().getUser(uid);
      const isPremium = userRecord.customClaims?.premium === true;
      await admin.auth().setCustomUserClaims(uid, { premium: !isPremium });
      res.json({ ok: true });
    } else if (action === 'delete') {
      await admin.auth().deleteUser(uid);
      res.json({ ok: true });
    }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/lessons', async (req, res) => {
  try {
    const snap = await admin.firestore().collection('lessons').orderBy('createdAt', 'desc').get();
    res.json({ lessons: snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/lessons', requireAuth, async (req, res) => {
  if (req.user.email !== ADMIN_EMAIL) return res.status(403).json({ error: 'Unauthorized' });
  const { title, description, difficulty, content } = req.body;
  try {
    const ref = await admin.firestore().collection('lessons').add({ title, description, difficulty, content, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    res.json({ ok: true, id: ref.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/lessons/:id', requireAuth, async (req, res) => {
  if (req.user.email !== ADMIN_EMAIL) return res.status(403).json({ error: 'Unauthorized' });
  try {
    await admin.firestore().collection('lessons').doc(req.params.id).delete();
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// GENERAL ROUTES (Images, Run Code, Publish)
// ==========================================
app.post('/api/generate-image', requireAuth, async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt is required.' });
  const model = req.isPremium ? 'flux' : 'sana';
  const endpoint = `https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?model=${model}&width=1024&height=1024`;
  try {
    const headers = {}; if (POLLINATIONS_API_KEY) headers['Authorization'] = `Bearer ${POLLINATIONS_API_KEY}`;
    const response = await fetch(endpoint, { headers });
    if (!response.ok) throw new Error('Image generation failed');
    res.set('Content-Type', 'image/jpeg').send(Buffer.from(await response.arrayBuffer()));
  } catch (err) { res.status(500).json({ error: 'Failed to generate image: ' + err.message }); }
});

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
      let finalErr = stderr; if (error && !stderr) finalErr = error.message;
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

app.post('/api/publish', requireAuth, async (req, res) => {
  const { slug, projectName, description, files, password } = req.body || {};
  if (!slug || !files) return res.status(400).json({ error: 'slug and files are required.' });
  if (!/^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/.test(slug)) return res.status(400).json({ error: 'Invalid slug.' });
  
  let finalPassword = null;
  if (password && req.isPremium) finalPassword = password;

  const pubRef = admin.firestore().collection('published').doc(slug);
  try {
    await admin.firestore().runTransaction(async (tx) => {
      const doc = await tx.get(pubRef);
      if (doc.exists) {
        if (doc.data().uid !== req.user.uid) throw new Error('SLUG_TAKEN');
        tx.set(pubRef, { uid: req.user.uid, username: req.user.email.split('@')[0], slug, projectName, description, files, password: finalPassword, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        return;
      }
      tx.set(pubRef, { uid: req.user.uid, username: req.user.email.split('@')[0], slug, projectName, description, files, password: finalPassword, views: 0, publishedAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    });
    res.json({ ok: true, url: '/s/' + slug, fullUrl: req.protocol + '://' + req.get('host') + '/s/' + slug });
  } catch (err) {
    if (err.message === 'SLUG_TAKEN') return res.status(409).json({ error: 'Slug taken.' });
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/unpublish', requireAuth, async (req, res) => {
  const { slug } = req.body;
  try {
    const doc = await admin.firestore().collection('published').doc(slug).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not found' });
    if (doc.data().uid !== req.user.uid) return res.status(403).json({ error: 'Unauthorized' });
    await admin.firestore().collection('published').doc(slug).delete();
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/my-published', requireAuth, async (req, res) => {
  try {
    const snap = await admin.firestore().collection('published').where('uid', '==', req.user.uid).get();
    res.json({ sites: snap.docs.map(doc => ({ slug: doc.id, ...doc.data() })) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/explore', async (req, res) => {
  try {
    const snap = await admin.firestore().collection('published').orderBy('updatedAt', 'desc').limit(50).get();
    res.json({ sites: snap.docs.map(doc => ({ slug: doc.id, ...doc.data() })) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/user/:username', async (req, res) => {
  try {
    const snap = await admin.firestore().collection('published').where('username', '==', req.params.username).orderBy('updatedAt', 'desc').get();
    res.json({ username: req.params.username, count: snap.size, sites: snap.docs.map(doc => ({ slug: doc.id, ...doc.data() })) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/s/:slug', async (req, res, next) => {
  if (!admin.apps.length) return next();
  try {
    const doc = await admin.firestore().collection('published').doc(req.params.slug).get();
    if (!doc.exists) return res.status(404).sendFile(path.join(__dirname, '404.html'));
    
    const data = doc.data();
    if (data.password && data.password !== req.query.pw) {
      return res.send(`
        <html><body style="background:#0f172a;color:#fff;font-family:sans-serif;text-align:center;padding-top:100px;">
          <h2>🔒 Password Protected Site</h2>
          <form method="GET" style="margin-top:20px;">
            <input type="password" name="pw" placeholder="Enter password" style="padding:10px;border-radius:5px;border:none;outline:none;">
            <button type="submit" style="padding:10px 20px;background:#38bdf8;border:none;border-radius:5px;font-weight:bold;cursor:pointer;">Unlock</button>
          </form>
        </body></html>
      `);
    }

    const files = data.files || {};
    doc.ref.update({ views: admin.firestore.FieldValue.increment(1) }).catch(() => {});
    let rawHtml = resolveAssetUrls(files['index.html'] || '', files);
    const html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>' + (data.projectName || req.params.slug) + '</title><style>' + (files['style.css'] || '') + '</style></head><body>' + rewritePublishedLinks(rawHtml, req.params.slug) + '<script>' + (files['script.js'] || '') + '<\/script></body></html>';
    res.send(html);
  } catch (err) { next(); }
});

// ==========================================
// FALLBACKS & SERVER START
// ==========================================
app.use('/api', (req, res) => res.status(404).json({ error: 'Unknown API route.' }));
app.use(express.static(path.join(__dirname)));
app.use((req, res) => {
  const file404 = path.join(__dirname, '404.html');
  if (fs.existsSync(file404)) res.status(404).sendFile(file404);
  else res.status(404).send(`404 Not Found`);
});

app.listen(PORT, '0.0.0.0', () => console.log('\n✅ CodeWix running on port ' + PORT + '\n'));
