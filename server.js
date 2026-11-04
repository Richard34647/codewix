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
const POLLINATIONS_API_KEY = process.env.POLLINATIONS_API_KEY;

// ==========================================
// FIREBASE INITIALIZATION
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

app.use(express.json({ limit: '10mb' }));

// ---- Helpers & Auth Middleware ---------------------------------------------
async function requireAuth(req, res, next) {
  if (!admin.apps.length) return res.status(500).json({ error: 'Auth not configured.' });
  const header = req.headers.authorization || '';
  const idToken = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!idToken) return res.status(401).json({ error: 'Missing auth token.' });
  try { req.user = await admin.auth().verifyIdToken(idToken); req.isPremium = req.user.premium === true; next(); } catch (err) { return res.status(401).json({ error: 'Invalid auth token.' }); }
}

async function requireAdmin(req, res, next) {
  const ADMIN_EMAIL = 'wilcoxr889@gmail.com';
  if (req.user.email !== ADMIN_EMAIL) return res.status(403).json({ error: 'Unauthorized. Admin only.' });
  next();
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

// ==========================================
// ADMIN ROUTES
// ==========================================
app.get('/api/admin/stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    const usersList = await admin.auth().listUsers(1000);
    const projectsSnap = await admin.firestore().collection('published').get();
    const lessonsSnap = await admin.firestore().collection('lessons').get();
    
    let premiumCount = 0;
    usersList.users.forEach(u => { if (u.customClaims?.premium) premiumCount++; });

    res.json({
      totalUsers: usersList.users.length,
      premiumUsers: premiumCount,
      totalProjects: projectsSnap.size,
      totalLessons: lessonsSnap.size
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const listUsersResult = await admin.auth().listUsers(1000);
    const users = listUsersResult.users.map(userRecord => ({
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName || 'No Name',
      lastSignIn: userRecord.metadata.lastSignInTime,
      premium: userRecord.customClaims?.premium === true
    }));
    res.json({ users });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/update-user', requireAuth, requireAdmin, async (req, res) => {
  const { uid, action } = req.body;
  try {
    if (action === 'toggle-premium') {
      const userRecord = await admin.auth().getUser(uid);
      const isPremium = userRecord.customClaims?.premium === true;
      await admin.auth().setCustomUserClaims(uid, { premium: !isPremium });
      res.json({ ok: true, message: `Premium status toggled.` });
    } else if (action === 'delete') {
      await admin.auth().deleteUser(uid);
      res.json({ ok: true, message: 'User deleted.' });
    } else {
      res.status(400).json({ error: 'Invalid action' });
    }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ---- Lessons Management --------------------------------------------------
app.get('/api/lessons', async (req, res) => {
  try {
    const snap = await admin.firestore().collection('lessons').orderBy('createdAt', 'desc').get();
    const lessons = [];
    snap.forEach(doc => lessons.push({ id: doc.id, ...doc.data() }));
    res.json({ lessons });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/lessons', requireAuth, requireAdmin, async (req, res) => {
  const { title, description, content, difficulty } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'Title and content required.' });
  
  try {
    const ref = await admin.firestore().collection('lessons').add({
      title, description, content, difficulty,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    res.json({ ok: true, id: ref.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/lessons/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await admin.firestore().collection('lessons').doc(req.params.id).delete();
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// GENERAL ROUTES
// ==========================================
app.post('/api/chat', requireAuth, checkRateLimit, async (req, res) => {
  if (!GROQ_API_KEY) return res.status(500).json({ error: 'Server is missing GROQ_API_KEY.' });
  const { messages, model, temperature, max_completion_tokens, reasoning_effort } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) return res.status(400).json({ error: 'messages array is required.' });

  try {
    const body = {
      model: model || 'openai/gpt-oss-120b', messages: messages,
      temperature: typeof temperature === 'number' ? temperature : 0.7,
      max_completion_tokens: max_completion_tokens || 2048, stream: true
    };
    if (reasoning_effort) body.reasoning_effort = reasoning_effort;

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
    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      if (value) res.write(decoder.decode(value, { stream: true }));
    }
    res.end();
    incrementUsage(req.rateLimitRef, req.rateLimitCount);
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: 'Failed to reach Groq: ' + err.message });
    else res.end();
  }
});

app.post('/api/generate-image', requireAuth, async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt is required.' });

  const model = req.isPremium ? 'flux' : 'sana';
  const endpoint = `https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?model=${model}&width=1024&height=1024`;

  try {
    const headers = {};
    if (POLLINATIONS_API_KEY) headers['Authorization'] = `Bearer ${POLLINATIONS_API_KEY}`;
    const response = await fetch(endpoint, { headers });

    if (!response.ok) {
      const fallbackUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true`;
      const fallbackRes = await fetch(fallbackUrl);
      if (!fallbackRes.ok) throw new Error('Image generation failed');
      const buffer = await fallbackRes.arrayBuffer();
      return res.set('Content-Type', 'image/jpeg').send(Buffer.from(buffer));
    }
    const buffer = await response.arrayBuffer();
    res.set('Content-Type', 'image/jpeg').send(Buffer.from(buffer));
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

app.post('/api/unpublish', requireAuth, async (req, res) => {
  try {
    const ref = admin.firestore().collection('published').doc(req.body.slug);
    const doc = await ref.get();
    if (doc.exists && doc.data().uid === req.user.uid) { await ref.delete(); res.json({ ok: true }); }
    else res.status(403).json({ error: 'Not your site.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/my-published', requireAuth, async (req, res) => {
  try {
    const snap = await admin.firestore().collection('published').where('uid', '==', req.user.uid).orderBy('updatedAt', 'desc').get();
    const sites = [];
    snap.forEach(doc => sites.push({ ...doc.data(), updatedAt: doc.data().updatedAt?.toDate().toISOString() }));
    res.json({ sites });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/explore', async (req, res) => {
  try {
    const snap = await admin.firestore().collection('published').orderBy('updatedAt', 'desc').limit(60).get();
    const sites = [];
    snap.forEach(doc => sites.push({ ...doc.data(), updatedAt: doc.data().updatedAt?.toDate().toISOString() }));
    res.json({ sites });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/user/:username', async (req, res) => {
  try {
    const snap = await admin.firestore().collection('published').where('username', '==', req.params.username).orderBy('updatedAt', 'desc').get();
    const sites = [];
    snap.forEach(doc => sites.push({ ...doc.data(), updatedAt: doc.data().updatedAt?.toDate().toISOString() }));
    res.json({ username: req.params.username, sites, count: sites.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/send-verification-email', async (req, res) => {
  if (!emailjsReady) return res.status(500).json({ error: 'EmailJS not configured.' });
  try {
    const link = await admin.auth().generateEmailVerificationLink(req.body.userEmail, { url: req.body.redirectUrl || 'http://localhost:5500/verify.html' });
    await emailjs.send(process.env.EMAILJS_SERVICE_ID, process.env.EMAILJS_TEMPLATE_ID, { to_email: req.body.userEmail, user_name: req.body.userName || 'there', verification_link: link });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/contact', async (req, res) => {
  if (!emailjsReady) return res.status(500).json({ error: 'EmailJS not configured.' });
  try {
    await emailjs.send(process.env.EMAILJS_SERVICE_ID, process.env.EMAILJS_CONTACT_TEMPLATE_ID, { from_name: req.body.name, reply_to: req.body.email, subject: req.body.subject, message: req.body.message, to_email: 'codewix@proton.me' });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/u/:username', (req, res) => res.sendFile(path.join(__dirname, 'profile.html')));

app.use('/api', (req, res) => res.status(404).json({ error: 'Unknown API route.' }));
app.use(express.static(path.join(__dirname)));
app.use((req, res) => {
  const file404 = path.join(__dirname, '404.html');
  if (fs.existsSync(file404)) res.status(404).sendFile(file404);
  else res.status(404).send(`404 Not Found: The file "${req.url}" does not exist, and 404.html is missing.`);
});

app.listen(PORT, '0.0.0.0', () => console.log('\n✅ CodeWix running on port ' + PORT + '\n'));
