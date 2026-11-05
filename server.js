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
const DAILY_TOKEN_LIMIT = 100000; 
const POLLINATIONS_API_KEY = process.env.POLLINATIONS_API_KEY;
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'wilcoxr889@gmail.com').toLowerCase();
const SELAR_WEBHOOK_SECRET = process.env.SELAR_WEBHOOK_SECRET || 'my_super_secret_webhook_key';

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

// Use raw body parser for webhook to verify signatures if needed
app.use('/api/selar-webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '50mb' }));

// ==========================================
// HELPERS & MIDDLEWARE
// ==========================================
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
  if (req.isPremium) return next(); 
  const uid = req.user.uid;
  const today = new Date().toISOString().slice(0, 10);
  const ref = admin.firestore().collection('users').doc(uid).collection('usage').doc(today);
  try {
    const doc = await ref.get();
    const tokensUsed = doc.exists ? (doc.data().tokens || 0) : 0;
    if (tokensUsed >= DAILY_TOKEN_LIMIT) {
      return res.status(429).json({ error: 'Daily token limit reached. Upgrade to Pro.' });
    }
    req.rateLimitRef = ref; req.currentTokens = tokensUsed; next();
  } catch (err) { next(); }
}

async function requireAdmin(req, res, next) {
  if (!admin.apps.length) return res.status(500).json({ error: 'Auth not configured.' });
  if (!req.user || !req.user.email) return res.status(401).json({ error: 'Missing admin user.' });
  if (String(req.user.email).toLowerCase() !== ADMIN_EMAIL) return res.status(403).json({ error: 'Admin access required.' });
  next();
}

// ==========================================
// SELAR WEBHOOK (UPGRADE LOGIC)
// ==========================================
app.post('/api/selar-webhook', async (req, res) => {
  try {
    // 1. Verify Webhook Secret (Optional but highly recommended)
    // Selar typically sends custom headers or you configure the URL with a secret
    const secret = req.headers['x-selar-signature'] || req.query.secret;
    if (SELAR_WEBHOOK_SECRET && secret !== SELAR_WEBHOOK_SECRET) {
      console.warn('⚠️ Unauthorized webhook attempt');
      return res.status(401).send('Unauthorized');
    }

    const payload = JSON.parse(req.body.toString());
    
    // Check event type based on Selar documentation
    if (payload.event === 'charge.success' || payload.event === 'sale.completed' || payload.event === 'subscription.created') {
      const customerEmail = payload.data.customer.email;
      
      if (!customerEmail) {
        console.warn('⚠️ Webhook received without customer email');
        return res.status(400).send('No email provided');
      }

      console.log(`💳 Payment successful from: ${customerEmail}. Attempting upgrade...`);

      // Find user by email in Firebase
      const userRecord = await admin.auth().getUserByEmail(customerEmail);
      
      // Upgrade user to Pro
      await admin.auth().setCustomUserClaims(userRecord.uid, { premium: true });
      
      console.log(`✅ SUCCESS: User ${customerEmail} upgraded to PRO.`);
      
      // Optionally, update Firestore to keep a record
      await admin.firestore().collection('users').doc(userRecord.uid).set({
        premium: true,
        upgradedAt: admin.firestore.FieldValue.serverTimestamp(),
        paymentProvider: 'Selar'
      }, { merge: true });
    }

    res.status(200).send('Webhook received');
  } catch (err) {
    console.error('❌ Webhook Error:', err.message);
    res.status(500).send('Webhook processing failed');
  }
});

// ==========================================
// AI CHAT ROUTE
// ==========================================
app.post('/api/chat', requireAuth, checkRateLimit, async (req, res) => {
  if (!GROQ_API_KEY) return res.status(500).json({ error: 'Server is missing GROQ_API_KEY.' });
  const { messages, model, temperature, max_completion_tokens, reasoning_effort } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) return res.status(400).json({ error: 'messages array is required.' });

  try {
    let finalModel = model || 'openai/gpt-oss-120b';
    if (!req.isPremium && finalModel.includes('70b')) finalModel = 'llama-3.1-8b-instant';

    const body = {
      model: finalModel, messages: messages,
      temperature: typeof temperature === 'number' ? temperature : 0.7,
      max_completion_tokens: max_completion_tokens || 2048, stream: true,
      stream_options: { include_usage: true }
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
    let done = false, buffer = '', totalTokensUsed = 0;

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
              if (parsed.usage && parsed.usage.total_tokens) totalTokensUsed = parsed.usage.total_tokens;
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
// CONTACT & VERIFICATION
// ==========================================
app.post('/api/contact', async (req, res) => {
  const { name, email, subject, message } = req.body || {};
  if (!name || !email || !message) return res.status(400).json({ error: 'Name, email, and message are required.' });

  if (!process.env.EMAILJS_SERVICE_ID || !process.env.EMAILJS_CONTACT_TEMPLATE_ID || !process.env.EMAILJS_PUBLIC_KEY) {
     return res.status(500).json({ error: 'Server config error: EmailJS IDs are missing.' });
  }

  try {
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: process.env.EMAILJS_SERVICE_ID,
        template_id: process.env.EMAILJS_CONTACT_TEMPLATE_ID,
        user_id: process.env.EMAILJS_PUBLIC_KEY,
        accessToken: process.env.EMAILJS_PRIVATE_KEY,
        template_params: {
          from_name: name, from_email: email, subject: subject || 'New Contact Form Submission',
          message: message, to_email: 'codewix@proton.me'
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(500).json({ error: 'EmailJS Error: ' + errorText });
    }
    res.json({ ok: true, message: 'Message sent successfully' });
  } catch (err) { res.status(500).json({ error: 'Network error: ' + err.message }); }
});

app.post('/api/send-verification-email', async (req, res) => {
  const { userEmail, userName, redirectUrl } = req.body;
  if (!userEmail) return res.status(400).json({ error: 'Email required' });

  if (!process.env.EMAILJS_SERVICE_ID || !process.env.EMAILJS_TEMPLATE_ID || !process.env.EMAILJS_PUBLIC_KEY) {
     return res.status(500).json({ error: 'Server config error: EmailJS IDs are missing.' });
  }

  try {
    const link = await admin.auth().generateEmailVerificationLink(userEmail, { url: redirectUrl });
    
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: process.env.EMAILJS_SERVICE_ID,
        template_id: process.env.EMAILJS_TEMPLATE_ID,
        user_id: process.env.EMAILJS_PUBLIC_KEY,
        accessToken: process.env.EMAILJS_PRIVATE_KEY,
        template_params: {
          email: userEmail, user_name: userName || 'there', verification_link: link 
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(500).json({ error: 'EmailJS Error: ' + errorText });
    }
    res.json({ ok: true, message: 'Verification email sent' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// ADMIN & LESSONS
// ==========================================
app.get('/api/admin/stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    const usersList = await admin.auth().listUsers(1000);
    const projectsSnap = await admin.firestore().collection('published').get();
    const lessonsSnap = await admin.firestore().collection('lessons').get();
    let premiumCount = 0;
    usersList.users.forEach(u => { if (u.customClaims?.premium) premiumCount++; });
    res.json({ totalUsers: usersList.users.length, premiumUsers: premiumCount, totalProjects: projectsSnap.size, totalLessons: lessonsSnap.size });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const listUsersResult = await admin.auth().listUsers(1000);
    const users = listUsersResult.users.map(u => ({ uid: u.uid, email: u.email || '', displayName: u.displayName || 'No Name', premium: u.customClaims?.premium === true }));
    res.json({ users });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/update-user', requireAuth, requireAdmin, async (req, res) => {
  const { uid, action } = req.body || {};
  if (!uid || !action) return res.status(400).json({ error: 'uid and action are required.' });
  try {
    if (action === 'toggle-premium') {
      const userRecord = await admin.auth().getUser(uid);
      const isPremium = userRecord.customClaims?.premium === true;
      await admin.auth().setCustomUserClaims(uid, { ...(userRecord.customClaims || {}), premium: !isPremium });
      res.json({ ok: true, premium: !isPremium });
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
  } catch (err) { if (err.code === 5) return res.json({ lessons: [] }); res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/lessons', requireAuth, requireAdmin, async (req, res) => {
  const { title, description, difficulty, content } = req.body || {};
  if (!title || !content) return res.status(400).json({ error: 'title and content are required.' });
  try {
    const ref = await admin.firestore().collection('lessons').add({ title, description: description || '', difficulty: difficulty || 'Beginner', content, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    res.json({ ok: true, id: ref.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/lessons/:id', requireAuth, requireAdmin, async (req, res) => {
  try { await admin.firestore().collection('lessons').doc(req.params.id).delete(); res.json({ ok: true }); } 
  catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// PUBLISH, EXPLORE, IDE RUNNER
// ==========================================
app.post('/api/run', requireAuth, async (req, res) => {
  const { language, code } = req.body || {};
  if (!language || !code) return res.status(400).json({ error: 'language and code are required.' });
  const lang = language.toLowerCase();

  if (lang === 'py' || lang === 'python') {
    const tempFile = path.join(os.tmpdir(), `script_${Date.now()}.py`);
    fs.writeFileSync(tempFile, code);
    exec(`python3 ${tempFile}`, { timeout: 120000 }, (error, stdout, stderr) => {
      try { fs.unlinkSync(tempFile); } catch (e) {}
      let finalErr = stderr;
      if (error) { finalErr = error.killed ? "❌ PROCESS KILLED: Exceeded time/memory limits." : (!stderr && !stdout ? "❌ SERVER KILLED PROCESS: Out of Memory." : error.message); }
      res.json({ output: stdout || '', stderr: finalErr || '', code: error ? 1 : 0 });
    });
    return;
  }

  const langMap = { 'php': 68, 'js': 63, 'javascript': 63, 'cpp': 54, 'c++': 54, 'c': 50, 'java': 62, 'rb': 72, 'ruby': 72, 'go': 60, 'rs': 73, 'rust': 73, 'ts': 74, 'cs': 51 };
  const langId = langMap[lang];
  if (!langId) return res.status(400).json({ error: 'Unsupported language.' });

  try {
    const response = await fetch('https://ce.judge0.com/submissions?base64_encoded=false&wait=true', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ language_id: langId, source_code: code })
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
  try {
    const ref = admin.firestore().collection('published').doc(req.body.slug);
    const doc = await ref.get();
    if (doc.exists && doc.data().uid === req.user.uid) { await ref.delete(); res.json({ ok: true }); } 
    else { res.status(403).json({ error: 'Not your site.' }); }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/my-published', requireAuth, async (req, res) => {
  try {
    const snap = await admin.firestore().collection('published').where('uid', '==', req.user.uid).orderBy('updatedAt', 'desc').get();
    res.json({ sites: snap.docs.map(doc => ({ slug: doc.id, ...doc.data(), updatedAt: doc.data().updatedAt?.toDate().toISOString() })) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/explore', async (req, res) => {
  try {
    const snap = await admin.firestore().collection('published').orderBy('updatedAt', 'desc').limit(60).get();
    res.json({ sites: snap.docs.map(doc => ({ slug: doc.id, ...doc.data(), updatedAt: doc.data().updatedAt?.toDate().toISOString() })) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/user/:username', async (req, res) => {
  try {
    const snap = await admin.firestore().collection('published').where('username', '==', req.params.username).orderBy('updatedAt', 'desc').get();
    res.json({ username: req.params.username, count: snap.size, sites: snap.docs.map(doc => ({ slug: doc.id, ...doc.data(), updatedAt: doc.data().updatedAt?.toDate().toISOString() })) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/s/:slug', async (req, res, next) => {
  if (!admin.apps.length) return next();
  try {
    const doc = await admin.firestore().collection('published').doc(req.params.slug).get();
    if (!doc.exists) return res.status(404).sendFile(path.join(__dirname, '404.html'));
    const data = doc.data();
    
    if (data.password && data.password !== req.query.pw) {
      return res.send(`<html><body style="background:#0f172a;color:#fff;font-family:sans-serif;text-align:center;padding-top:100px;"><h2>🔒 Password Protected</h2><form method="GET" style="margin-top:20px;"><input type="password" name="pw" placeholder="Password" style="padding:10px;border-radius:5px;"><button type="submit" style="padding:10px 20px;background:#38bdf8;border:none;border-radius:5px;">Unlock</button></form></body></html>`);
    }

    const files = data.files || {};
    doc.ref.update({ views: admin.firestore.FieldValue.increment(1) }).catch(() => {});
    let rawHtml = resolveAssetUrls(files['index.html'] || '', files);
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${data.projectName || req.params.slug}</title><style>${files['style.css'] || ''}</style></head><body>${rewritePublishedLinks(rawHtml, req.params.slug)}<script>${files['script.js'] || ''}<\/script></body></html>`;
    res.send(html);
  } catch (err) { next(); }
});

app.get('/u/:username', (req, res) => res.sendFile(path.join(__dirname, 'profile.html')));
app.use('/api', (req, res) => res.status(404).json({ error: 'Unknown API route.' }));
app.use(express.static(path.join(__dirname)));
app.use((req, res) => res.status(404).sendFile(path.join(__dirname, '404.html')));

app.listen(PORT, '0.0.0.0', () => console.log('\n✅ CodeWix running on port ' + PORT + '\n'));
