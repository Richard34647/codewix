// ==========================================================================
// CodeWix Server — static + Groq + EmailJS + Rate limiting + Publishing + 404
// ==========================================================================

require('dotenv').config();
const express = require('express');
const path = require('path');
const admin = require('firebase-admin');
const emailjs = require('@emailjs/nodejs');

const app = express();
const PORT = process.env.PORT || 5500;

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const RATE_LIMIT_PER_DAY = parseInt(process.env.RATE_LIMIT_PER_DAY || '50', 10);

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({ credential: admin.credential.cert(sa) });
    console.log('[Firebase Admin] initialized via FIREBASE_SERVICE_ACCOUNT');
  } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId:   process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey:  process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      })
    });
    console.log('[Firebase Admin] initialized via split env vars');
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
    console.log('[Firebase Admin] initialized via GOOGLE_APPLICATION_CREDENTIALS');
  } else {
    console.warn('[Firebase Admin] No credentials found.');
  }
} catch (err) {
  console.error('[Firebase Admin] init failed:', err.message);
}

let emailjsReady = false;
if (process.env.EMAILJS_PUBLIC_KEY && process.env.EMAILJS_PRIVATE_KEY) {
  emailjs.init({
    publicKey:  process.env.EMAILJS_PUBLIC_KEY,
    privateKey: process.env.EMAILJS_PRIVATE_KEY,
  });
  emailjsReady = true;
  console.log('[EmailJS] initialized');
} else {
  console.warn('[EmailJS] Missing keys');
}

app.use(express.json({ limit: '5mb' }));

async function requireAuth(req, res, next) {
  if (!admin.apps.length) return res.status(500).json({ error: 'Auth not configured.' });
  const header = req.headers.authorization || '';
  const idToken = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!idToken) return res.status(401).json({ error: 'Missing auth token.' });
  try {
    req.user = await admin.auth().verifyIdToken(idToken);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid auth token.' });
  }
}

async function checkRateLimit(req, res, next) {
  const uid = req.user.uid;
  const today = new Date().toISOString().slice(0, 10);
  const ref = admin.firestore().collection('users').doc(uid).collection('usage').doc(today);
  try {
    const doc = await ref.get();
    const count = doc.exists ? (doc.data().count || 0) : 0;
    if (count >= RATE_LIMIT_PER_DAY) {
      return res.status(429).json({
        error: 'Daily limit reached. You have used ' + count + ' of ' + RATE_LIMIT_PER_DAY + ' AI messages today.',
        limit: RATE_LIMIT_PER_DAY, used: count, remaining: 0, date: today
      });
    }
    req.rateLimitRef = ref;
    req.rateLimitCount = count;
    next();
  } catch (err) { next(); }
}

function incrementUsage(ref, currentCount) {
  ref.set({ count: (currentCount || 0) + 1, lastUsed: new Date().toISOString() }, { merge: true })
    .catch(function (err) { console.error('[rate] increment failed:', err.message); });
}

app.get('/api/rate-limit-status', requireAuth, async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const ref = admin.firestore().collection('users').doc(req.user.uid).collection('usage').doc(today);
  try {
    const doc = await ref.get();
    const used = doc.exists ? (doc.data().count || 0) : 0;
    res.json({ limit: RATE_LIMIT_PER_DAY, used, remaining: Math.max(0, RATE_LIMIT_PER_DAY - used), date: today });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/chat', requireAuth, checkRateLimit, async (req, res) => {
  if (!GROQ_API_KEY) return res.status(500).json({ error: 'Server is missing GROQ_API_KEY.' });
  const { messages, model, temperature, max_completion_tokens, reasoning_effort } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required.' });
  }
  try {
    const body = {
      model: model || 'openai/gpt-oss-120b',
      messages: messages,
      temperature: typeof temperature === 'number' ? temperature : 0.7,
      max_completion_tokens: max_completion_tokens || 2048
    };
    if (reasoning_effort) body.reasoning_effort = reasoning_effort;

    const groqRes = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + GROQ_API_KEY },
      body: JSON.stringify(body)
    });
    const data = await groqRes.json();
    if (!groqRes.ok) return res.status(groqRes.status).json(data);
    incrementUsage(req.rateLimitRef, req.rateLimitCount);
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: 'Failed to reach Groq: ' + err.message });
  }
});

app.post('/api/publish', requireAuth, async (req, res) => {
  const { slug, projectName, description, files } = req.body || {};

  if (!slug || !files) return res.status(400).json({ error: 'slug and files are required.' });
  if (!/^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/.test(slug)) {
    return res.status(400).json({ error: 'Slug must be 3-32 characters, lowercase letters, numbers and hyphens only.' });
  }

  const reserved = ['api', 'admin', 'www', 'app', 'dashboard', 'login', 'register',
                    'learn', 'explore', 'profile', 'about', 'contact', 'tos', 'privacy',
                    'settings', 'help', 'support', 'blog', 'docs', 'auth', 'user'];
  if (reserved.indexOf(slug) !== -1) {
    return res.status(400).json({ error: 'That name is reserved. Try another.' });
  }

  try {
    const pubRef = admin.firestore().collection('published').doc(slug);
    const existing = await pubRef.get();

    if (existing.exists && existing.data().uid !== req.user.uid) {
      return res.status(409).json({ error: 'That name is already taken by another user.' });
    }

    const email = req.user.email || '';
    const username = email.split('@')[0] || 'user';

    const payload = {
      uid: req.user.uid,
      username: username,
      slug: slug,
      projectName: projectName || 'Untitled',
      description: description || '',
      files: files,
      views: existing.exists ? (existing.data().views || 0) : 0,
      publishedAt: existing.exists ? existing.data().publishedAt : admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await pubRef.set(payload);

    res.json({
      ok: true,
      url: '/s/' + slug,
      fullUrl: (req.protocol + '://' + req.get('host') + '/s/' + slug)
    });
  } catch (err) {
    console.error('[publish] error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/unpublish', requireAuth, async (req, res) => {
  const { slug } = req.body || {};
  if (!slug) return res.status(400).json({ error: 'slug is required.' });
  try {
    const ref = admin.firestore().collection('published').doc(slug);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: 'Not found.' });
    if (doc.data().uid !== req.user.uid) return res.status(403).json({ error: 'Not your site.' });
    await ref.delete();
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/my-published', requireAuth, async (req, res) => {
  try {
    const snap = await admin.firestore().collection('published')
      .where('uid', '==', req.user.uid)
      .orderBy('updatedAt', 'desc')
      .get();
    const sites = [];
    snap.forEach(function (doc) {
      const d = doc.data();
      sites.push({
        slug: d.slug,
        projectName: d.projectName,
        description: d.description,
        views: d.views || 0,
        updatedAt: d.updatedAt ? d.updatedAt.toDate().toISOString() : null
      });
    });
    res.json({ sites: sites });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/explore', async (req, res) => {
  try {
    const snap = await admin.firestore().collection('published')
      .orderBy('updatedAt', 'desc')
      .limit(60)
      .get();
    const sites = [];
    snap.forEach(function (doc) {
      const d = doc.data();
      sites.push({
        slug: d.slug,
        username: d.username,
        projectName: d.projectName,
        description: d.description,
        views: d.views || 0,
        updatedAt: d.updatedAt ? d.updatedAt.toDate().toISOString() : null
      });
    });
    res.json({ sites: sites });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/user/:username', async (req, res) => {
  const username = req.params.username;
  try {
    const snap = await admin.firestore().collection('published')
      .where('username', '==', username)
      .orderBy('updatedAt', 'desc')
      .get();
    const sites = [];
    let uid = null;
    snap.forEach(function (doc) {
      const d = doc.data();
      uid = d.uid;
      sites.push({
        slug: d.slug,
        projectName: d.projectName,
        description: d.description,
        views: d.views || 0,
        updatedAt: d.updatedAt ? d.updatedAt.toDate().toISOString() : null
      });
    });
    res.json({ username, uid, sites, count: sites.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/send-verification-email', async (req, res) => {
  const { userEmail, userName, redirectUrl } = req.body || {};
  if (!userEmail) return res.status(400).json({ error: 'userEmail is required.' });
  if (!emailjsReady) return res.status(500).json({ error: 'EmailJS is not configured.' });
  if (!admin.apps.length) return res.status(500).json({ error: 'Firebase Admin not initialized.' });

  try {
    const actionCodeSettings = {
      url: redirectUrl || 'https://codewix.com/verify.html',
      handleCodeInApp: false
    };
    const verificationLink = await admin.auth().generateEmailVerificationLink(userEmail, actionCodeSettings);
    const result = await emailjs.send(
      process.env.EMAILJS_SERVICE_ID,
      process.env.EMAILJS_TEMPLATE_ID,
      { to_email: userEmail, email: userEmail, user_name: userName || 'there', verification_link: verificationLink }
    );
    console.log('[verify] sent to', userEmail, '— status:', result.status);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[verify] FULL ERROR:', err);
    res.status(500).json({ error: err.text || err.message || JSON.stringify(err) });
  }
});

app.post('/api/contact', async (req, res) => {
  const { name, email, subject, message } = req.body || {};
  if (!name || !email || !subject || !message) return res.status(400).json({ error: 'All fields required.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email.' });
  if (!emailjsReady) return res.status(500).json({ error: 'Email not configured.' });
  if (!process.env.EMAILJS_CONTACT_TEMPLATE_ID) return res.status(500).json({ error: 'Contact template not configured.' });

  try {
    const result = await emailjs.send(
      process.env.EMAILJS_SERVICE_ID,
      process.env.EMAILJS_CONTACT_TEMPLATE_ID,
      { from_name: name, reply_to: email, subject: subject, message: message, to_email: 'codewix@proton.me' }
    );
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.text || err.message || 'Failed to send.' });
  }
});

app.get('/s/:slug', async (req, res, next) => {
  const slug = req.params.slug;
  if (!admin.apps.length) return next();

  try {
    const doc = await admin.firestore().collection('published').doc(slug).get();
    if (!doc.exists) return res.status(404).sendFile(path.join(__dirname, '404.html'));

    const data = doc.data();
    const files = data.files || {};

    doc.ref.update({ views: admin.firestore.FieldValue.increment(1) }).catch(function () {});

    const html = '<!DOCTYPE html><html><head><meta charset="UTF-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
      '<title>' + (data.projectName || slug) + '</title>' +
      '<style>' + (files['style.css'] || '') + '</style>' +
      '</head><body>' +
      (files['index.html'] || '') +
      '<script>' + (files['script.js'] || '') + '<\/script>' +
      '<div style="position:fixed;bottom:12px;right:12px;z-index:99999;' +
      'background:rgba(2,6,23,0.9);color:#cbd5e1;padding:8px 14px;' +
      'border-radius:20px;font-family:Arial,sans-serif;font-size:12px;' +
      'border:1px solid #334155;text-decoration:none;backdrop-filter:blur(8px);">' +
      '<a href="/" style="color:#38bdf8;text-decoration:none;font-weight:bold;">⚡ Built with CodeWix</a>' +
      '</div>' +
      '</body></html>';

    res.send(html);
  } catch (err) {
    console.error('[s/:slug] error:', err);
    next();
  }
});

app.get('/u/:username', function (req, res) {
  res.sendFile(path.join(__dirname, 'profile.html'));
});

app.use('/api', function (req, res) {
  res.status(404).json({ error: 'Unknown API route.' });
});

app.use(express.static(path.join(__dirname)));

app.use(function (req, res) {
  res.status(404).sendFile(path.join(__dirname, '404.html'));
});

app.listen(PORT, '0.0.0.0', function () {
  console.log('\n✅ CodeWix running on port ' + PORT);
  console.log('   GROQ:      ' + (GROQ_API_KEY ? 'YES ✔' : 'NO ❌'));
  console.log('   EmailJS:   ' + (emailjsReady ? 'YES ✔' : 'NO ❌'));
  console.log('   FB Admin:  ' + (admin.apps.length ? 'YES ✔' : 'NO ❌') + '\n');
});