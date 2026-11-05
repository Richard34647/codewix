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
// SELAR WEBHOOK
// ==========================================
app.post('/api/selar-webhook', async (req, res) => {
  try {
    const secret = req.headers['x-selar-signature'] || req.query.secret;
    if (SELAR_WEBHOOK_SECRET && secret !== SELAR_WEBHOOK_SECRET) {
      return res.status(401).send('Unauthorized');
    }
    const payload = JSON.parse(req.body.toString());
    if (payload.event === 'charge.success' || payload.event === 'sale.completed' || payload.event === 'subscription.created') {
      const customerEmail = payload.data.customer.email;
      if (!customerEmail) return res.status(400).send('No email provided');
      
      const userRecord = await admin.auth().getUserByEmail(customerEmail);
      await admin.auth().setCustomUserClaims(userRecord.uid, { premium: true });
      await admin.firestore().collection('users').doc(userRecord.uid).set({ premium: true, upgradedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      console.log(`✅ User ${customerEmail} upgraded to PRO.`);
    }
    res.status(200).send('Webhook received');
  } catch (err) { res.status(500).send('Webhook failed'); }
});

// ==========================================
// AI CHAT ROUTE
// ==========================================
app.post('/api/chat', requireAuth, checkRateLimit, async (req, res) => {
  if (!GROQ_API_KEY) return res.status(500).json({ error: 'Missing GROQ_API_KEY.' });
  const { messages, model, temperature, max_completion_tokens, reasoning_effort } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) return res.status(400).json({ error: 'messages required.' });

  try {
    let finalModel = model || 'openai/gpt-oss-120b';
    if (!req.isPremium && finalModel.includes('70b')) finalModel = 'llama-3.1-8b-instant';

    const body = { model: finalModel, messages, temperature: temperature || 0.7, max_completion_tokens: max_completion_tokens || 2048, stream: true, stream_options: { include_usage: true } };
    if (reasoning_effort && req.isPremium) body.reasoning_effort = reasoning_effort;

    const groqRes = await fetch(GROQ_ENDPOINT, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + GROQ_API_KEY }, body: JSON.stringify(body)
    });

    if (!groqRes.ok) { const errData = await groqRes.json(); return res.status(groqRes.status).json(errData); }

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
            try { const parsed = JSON.parse(line.slice(6)); if (parsed.usage && parsed.usage.total_tokens) totalTokensUsed = parsed.usage.total_tokens; } catch (e) {}
          }
        }
      }
    }
    res.end();
    if (!req.isPremium && totalTokensUsed > 0 && req.rateLimitRef) {
      await req.rateLimitRef.set({ tokens: admin.firestore.FieldValue.increment(totalTokensUsed) }, { merge: true });
    }
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: 'Failed to reach Groq' });
    else res.end();
  }
});

app.get('/api/user/usage', requireAuth, async (req, res) => {
  if (req.isPremium) return res.json({ isPremium: true, tokensUsed: 0, limit: DAILY_TOKEN_LIMIT });
  try {
    const today = new Date().toISOString().slice(0, 10);
    const doc = await admin.firestore().collection('users').doc(req.user.uid).collection('usage').doc(today).get();
    const tokensUsed = doc.exists ? (doc.data().tokens || 0) : 0;
    res.json({ isPremium: false, tokensUsed, limit: DAILY_TOKEN_LIMIT });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// CONTACT & VERIFICATION
// ==========================================
app.post('/api/contact', async (req, res) => {
  const { name, email, subject, message } = req.body || {};
  if (!name || !email || !message) return res.status(400).json({ error: 'Fields required.' });
  try {
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service_id: process.env.EMAILJS_SERVICE_ID, template_id: process.env.EMAILJS_CONTACT_TEMPLATE_ID, user_id: process.env.EMAILJS_PUBLIC_KEY, accessToken: process.env.EMAILJS_PRIVATE_KEY, template_params: { from_name: name, from_email: email, subject: subject || 'Contact Form', message: message, to_email: 'codewix@proton.me' } })
    });
    if (!response.ok) return res.status(500).json({ error: 'EmailJS failed.' });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Network error' }); }
});

app.post('/api/send-verification-email', async (req, res) => {
  const { userEmail, userName, redirectUrl } = req.body;
  if (!userEmail) return res.status(400).json({ error: 'Email required' });
  try {
    const link = await admin.auth().generateEmailVerificationLink(userEmail, { url: redirectUrl });
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service_id: process.env.EMAILJS_SERVICE_ID, template_id: process.env.EMAILJS_TEMPLATE_ID, user_id: process.env.EMAILJS_PUBLIC_KEY, accessToken: process.env.EMAILJS_PRIVATE_KEY, template_params: { email: userEmail, user_name: userName || 'there', verification_link: link } })
    });
    if (!response.ok) return res.status(500).json({ error: 'EmailJS failed.' });
    res.json({ ok: true });
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
    let premiumCount = 0; usersList.users.forEach(u => { if (u.customClaims?.premium) premiumCount++; });
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
  try {
    if (action === 'toggle-premium') {
      const userRecord = await admin.auth().getUser(uid);
      const isPremium = userRecord.customClaims?.premium === true;
      await admin.auth().setCustomUserClaims(uid, { ...(userRecord.customClaims || {}), premium: !isPremium });
      res.json({ ok: true });
    } else if (action === 'delete') { await admin.auth().deleteUser(uid); res.json({ ok: true }); }
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
  try {
    const ref = await admin.firestore().collection('lessons').add({ title, description, difficulty, content, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    res.json({ ok: true, id: ref.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/lessons/:id', requireAuth, requireAdmin, async (req, res) => {
  try { await admin.firestore().collection('lessons').doc(req.params.id).delete(); res.json({ ok: true }); } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// PUBLISH (WITH FREE LIMIT ENFORCEMENT)
// ==========================================
app.post('/api/publish', requireAuth, async (req, res) => {
  const { slug, projectName, description, files, password } = req.body || {};
  if (!slug || !files) return res.status(400).json({ error: 'slug and files are required.' });
  
  // ENFORCE FREE LIMIT: 1 PUBLISHED SITE
  if (!req.isPremium) {
    const existing = await admin.firestore().collection('published').where('uid', '==', req.user.uid).get();
    if (existing.size >= 1) {
      return res.status(403).json({ error: 'Free users can only publish 1 site. Upgrade to Pro for unlimited live projects!' });
    }
  }

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

// ==========================================
// RENDER PUBLISHED SITE (WITH WATERMARK)
// ==========================================
app.get('/s/:slug', async (req, res, next) => {
  if (!admin.apps.length) return next();
  try {
    const doc = await admin.firestore().collection('published').doc(req.params.slug).get();
    if (!doc.exists) return res.status(404).sendFile(path.join(__dirname, '404.html'));
    const data = doc.data();
    
    if (data.password && data.password !== req.query.pw) {
      return res.send(`<html><body style="background:#0f172a;color:#fff;font-family:sans-serif;text-align:center;padding-top:100px;"><h2>🔒 Password Protected</h2><form method="GET" style="margin-top:20px;"><input type="password" name="pw" placeholder="Password" style="padding:10px;border-radius:5px;"><button type="submit" style="padding:10px 20px;background:#38bdf8;border:none;border-radius:5px;">Unlock</button></form></body></html>`);
    }

    // Fetch owner's premium status
    let isPremiumOwner = false;
    try {
      const ownerRecord = await admin.auth().getUser(data.uid);
      isPremiumOwner = ownerRecord.customClaims?.premium === true;
    } catch (err) { console.warn('Could not verify owner status'); }

    const files = data.files || {};
    doc.ref.update({ views: admin.firestore.FieldValue.increment(1) }).catch(() => {});
    
    let rawHtml = resolveAssetUrls(files['index.html'] || '', files);
    
    // Inject Watermark for Free Users
    let watermarkHtml = '';
    if (!isPremiumOwner) {
      watermarkHtml = `
        <div style="position:fixed;bottom:20px;right:20px;background:#020617;color:#38bdf8;padding:10px 16px;border-radius:20px;font-family:sans-serif;font-size:14px;font-weight:bold;box-shadow:0 4px 12px rgba(0,0,0,0.5);z-index:9999;border:1px solid #38bdf8;">
          <a href="https://codewi.onrender.com" target="_blank" style="color:#38bdf8;text-decoration:none;">Built with CodeWix 🚀</a>
        </div>
      `;
    }

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${data.projectName || req.params.slug}</title><style>${files['style.css'] || ''}</style></head><body>${rewritePublishedLinks(rawHtml, req.params.slug)}${watermarkHtml}<script>${files['script.js'] || ''}<\/script></body></html>`;
    res.send(html);
  } catch (err) { next(); }
});

app.get('/u/:username', (req, res) => res.sendFile(path.join(__dirname, 'profile.html')));
app.use('/api', (req, res) => res.status(404).json({ error: 'Unknown API route.' }));
app.use(express.static(path.join(__dirname)));
app.use((req, res) => res.status(404).sendFile(path.join(__dirname, '404.html')));

app.listen(PORT, '0.0.0.0', () => console.log('\n✅ CodeWix running on port ' + PORT + '\n'));
