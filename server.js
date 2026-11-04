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
// BULLETPROOF FIREBASE INITIALIZATION
// ==========================================
console.log('\n=============================================');
console.log('🔍 LOOKING FOR FIREBASE CREDENTIALS...');
console.log('=============================================\n');

try {
  const localPath = path.join(__dirname, 'firebase-service-account.json');
  const renderSecretPath = '/etc/secrets/firebase-service-account.json';
  
  if (fs.existsSync(renderSecretPath)) {
    // 1. Render Secret File
    const serviceAccount = JSON.parse(fs.readFileSync(renderSecretPath, 'utf8'));
    admin.initializeApp({ 
      credential: admin.credential.cert(serviceAccount), 
      storageBucket: 'codewix-16971.firebasestorage.app' 
    });
    console.log('✅ [Firebase Admin] Initialized via Render Secret File (/etc/secrets/)');
  } 
  else if (fs.existsSync(localPath)) {
    // 2. Local JSON file (Desktop app)
    const serviceAccount = JSON.parse(fs.readFileSync(localPath, 'utf8'));
    admin.initializeApp({ 
      credential: admin.credential.cert(serviceAccount), 
      storageBucket: 'codewix-16971.firebasestorage.app' 
    });
    console.log('✅ [Firebase Admin] Initialized via local JSON file');
  } 
  else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
    // 3. Split Environment Variables
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      }),
      storageBucket: 'codewix-16971.firebasestorage.app'
    });
    console.log('✅ [Firebase Admin] Initialized via environment variables');
  } 
  else {
    console.error('❌ [Firebase Admin] CRITICAL ERROR: No credentials found!');
  }
} catch (err) { 
  console.error('❌ [Firebase Admin] init failed:', err.message); 
}

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
    return res.status(500).json({ error: 'Auth not configured. Missing Firebase credentials on server.' });
  }
  const header = req.headers.authorization || '';
  const idToken = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!idToken) return res.status(401).json({ error: 'Missing auth token.' });
  try { 
    req.user = await admin.auth().verifyIdToken(idToken); 
    req.isPremium = req.user.premium === true;
    next(); 
  } catch (err) { return res.status(401).json({ error: 'Invalid auth token.' }); }
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
// NEW: ADMIN UPGRADE ROUTE
// ==========================================
app.post('/api/admin/upgrade-user', requireAuth, async (req, res) => {
  const ADMIN_EMAIL = 'wilcox889@gmail.com'; // 👈 Make sure this is YOUR email
  
  // 1. Verify the requester is YOU
  if (req.user.email !== ADMIN_EMAIL) {
    return res.status(403).json({ error: 'Unauthorized. Admin only.' });
  }

  const { targetEmail } = req.body;
  if (!targetEmail) return res.status(400).json({ error: 'Target email is required.' });

  try {
    // 2. Find the user in Firebase Auth
    const userRecord = await admin.auth().getUserByEmail(targetEmail);
    const uid = userRecord.uid;

    // 3. Set the custom claim to premium
    await admin.auth().setCustomUserClaims(uid, { premium: true });

    // 4. Mark their upgrade request as completed in Firestore
    const requests = await admin.firestore().collection('upgrade_requests').where('email', '==', targetEmail).where('status', '==', 'pending').get();
    const batch = admin.firestore().batch();
    requests.forEach(doc => batch.update(doc.ref, { status: 'completed' }));
    await batch.commit();

    res.json({ ok: true, message: `Successfully upgraded ${targetEmail} to Premium!` });
  } catch (err) {
    console.error('Admin upgrade error:', err);
    res.status(500).json({ error: err.message });
  }
});

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
      stream: true
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

// ---- API: Image Generation ------------------------------------------------
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
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate image: ' + err.message });
  }
});

// ---- API: Video Generation (Freemium) -------------------------------------
app.post('/api/generate-video', requireAuth, async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt is required.' });

  const ADMIN_EMAIL = 'wilcox889@gmail.com'; // 👈 Your email for admin bypass
  const isAdmin = req.user.email === ADMIN_EMAIL;

  // Free users get 5s, Premium/Admin get 10s
  let videoDuration = (req.isPremium || isAdmin) ? 10 : 5;

  try {
    const response = await fetch('https://inferenceport.ai/v1/videos/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        model: 'wan-fast', 
        prompt: prompt,
        duration: videoDuration
      })
    });

    if (!response.ok) {
       const errText = await response.text();
       throw new Error('Video generation failed: ' + errText);
    }
    
    const data = await response.json();
    
    res.json({ 
      videoUrl: data.url || data.data?.[0]?.url || data.video_url,
      duration: videoDuration,
      isPremium: req.isPremium || isAdmin
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate video: ' + err.message });
  }
});

// ---- API: Run Code (Python Locally, Others via Judge0) --------------------
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

// ---- API: Uptime Status (UptimeRobot) -------------------------------------
app.get('/api/uptime-status', async (req, res) => {
  const apiKey = process.env.UPTIMEROBOT_API_KEY;
  if (!apiKey) return res.json({ status: 'unknown' });
  try {
    const response = await fetch('https://api.uptimerobot.com/v2/getMonitors', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey, format: 'json' })
    });
    const data = await response.json();
    if (data.stat === 'ok' && data.monitors?.length > 0) {
      res.json({ status: data.monitors[0].status === 2 ? 'up' : 'down' });
    } else res.json({ status: 'unknown' });
  } catch (err) { res.json({ status: 'unknown' }); }
});

// ---- 🔥 DEBUG ROUTE (To find your missing files) 🔥 -----------------------
app.get('/debug-files', (req, res) => {
  const localFiles = fs.readdirSync(__dirname);
  let secretFiles = [];
  try { secretFiles = fs.readdirSync('/etc/secrets'); } catch (e) {}
  
  res.json({ 
    message: "Here is exactly what Render sees:",
    local_project_folder: localFiles,
    render_secrets_folder: secretFiles
  });
});

// ---- Fallbacks ------------------------------------------------------------
app.use('/api', (req, res) => res.status(404).json({ error: 'Unknown API route.' }));
app.use(express.static(path.join(__dirname)));
app.use((req, res) => {
  const file404 = path.join(__dirname, '404.html');
  if (fs.existsSync(file404)) {
    res.status(404).sendFile(file404);
  } else {
    res.status(404).send(`404 Not Found: The file "${req.url}" does not exist, and 404.html is missing.`);
  }
});

app.listen(PORT, '0.0.0.0', () => console.log('\n✅ CodeWix running on port ' + PORT + '\n'));
