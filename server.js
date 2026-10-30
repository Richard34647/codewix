// ==========================================================================
// CodeWix Server — static + Groq + EmailJS + Rate limiting + Publishing + Paiza.IO
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

// ---- Firebase Admin init --------------------------------------------------
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(sa),
      storageBucket: 'codewix-16971.firebasestorage.app'
    });
    console.log('[Firebase Admin] initialized via FIREBASE_SERVICE_ACCOUNT');
  } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId:   process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey:  process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      }),
      storageBucket: 'codewix-16971.firebasestorage.app'
    });
    console.log('[Firebase Admin] initialized via split env vars');
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      storageBucket: 'codewix-16971.firebasestorage.app'
    });
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

// ---- Helpers --------------------------------------------------------------
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

// ---- Auth middleware ------------------------------------------------------
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

// ---- Rate limit -----------------------------------------------------------
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

// ---- API: Rate limit status ----------------------------------------------
app.get('/api/rate-limit-status', requireAuth, async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const ref = admin.firestore().collection('users').doc(req.user.uid).collection('usage').doc(today);
  try {
    const doc = await ref.get();
    const used = doc.exists ? (doc.data().count || 0) : 0;
    res.json({ limit: RATE_LIMIT_PER_DAY, used, remaining: Math.max(0, RATE_LIMIT_PER_DAY - used), date: today });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ---- API: Groq chat proxy -------------------------------------------------
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

// ---- API: Run Code (Paiza.IO) ---------------------------------------------
app.post('/api/run', requireAuth, async (req, res) => {
  const { language, code } = req.body || {};
  if (!language || !code) return res.status(400).json({ error: 'language and code are required.' });

  // Map file extensions to Paiza.IO language names
  const langMap = {
    'php': 'php',
    'py': 'python3', 'python': 'python3',
    'js': 'javascript', 'javascript': 'javascript',
    'cpp': 'cpp', 'c++': 'cpp',
    'c': 'c',
    'java': 'java',
    'rb': 'ruby', 'ruby': 'ruby',
    'go': 'go',
    'rs': 'rust', 'rust': 'rust',
    'cs': 'csharp', 'csharp': 'csharp',
    'ts': 'typescript', 'typescript': 'typescript'
  };

  const paizaLang = langMap[language.toLowerCase()];
  if (!paizaLang) return res.status(400).json({ error: 'Unsupported language for execution.' });

  try {
    // Step 1: Create the execution session
    const createRes = await fetch('https://api.paiza.io/runners/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_code: code,
        language: paizaLang,
        input: '',
        api_key: 'guest'
      })
    });
    const createData = await createRes.json();
    
    if (createData.error) {
      throw new Error(createData.error);
    }

    const sessionId = createData.id;

    // Step 2: Poll for the result (Paiza.IO takes a moment to compile/run)
    let detailsData = null;
    let attempts = 0;
    const maxAttempts = 10; // Wait up to 10 seconds
    
    while (attempts < maxAttempts) {
      // Wait 1 second before checking
      await new Promise(r => setTimeout(r, 1000));
      
      const detailsRes = await fetch('https://api.paiza.io/runners/get_details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: sessionId,
          api_key: 'guest'
        })
      });
      
      detailsData = await detailsRes.json();
      
      if (detailsData.status === 'completed') {
        break;
      }
      attempts++;
    }

    if (!detailsData || detailsData.status !== 'completed') {
      throw new Error('Execution timed out. The server might be busy.');
    }

    // Combine build errors and runtime errors
    let stderr = detailsData.stderr || '';
    if (detailsData.build_stderr) stderr += '\n[Compile Output]:\n' + detailsData.build_stderr;

    res.json({
      output: detailsData.stdout || '',
      stderr: stderr.trim(),
      code: detailsData.status === 'completed' ? 0 : 1
    });

  } catch (err) {
    res.status(500).json({ error: 'Execution engine failed: ' + err.message });
  }
});

// ---- API: Publish (atomic slug reservation) ------------------------------
app.post('/api/publish', requireAuth, async (req, res) => {
  const { slug, projectName, description, files } = req.body || {};
  if (!slug || !files) return res.status(400).json({ error: 'slug and files are required.' });
  if (!/^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/.test(slug)) {
    return res.status(400).json({ error: 'Slug must be 3-32 characters, lowercase letters, numbers and hyphens only.' });
  }

  const reserved = ['api', 'admin', 'www', 'app', 'dashboard', 'login', 'register',
                    'learn', 'explore', 'profile', 'about', 'contact', 'tos', 'privacy',
                    'settings', 'help', 'support', 'blog', 'docs', 'auth', 'user',
                    's', 'u', 'static', 'public', 'assets', 'favicon', 'components'];
  if (reserved.indexOf(slug) !== -1) {
    return res.status(400).json({ error: 'That name is reserved. Try another.' });
  }

  const uid = req.user.uid;
  const email = req.user.email || '';
  const username = email.split('@')[0] || 'user';
  const pubRef = admin.firestore().collection('published').doc(slug);

  try {
    const result = await admin.firestore().runTransaction(async (tx) => {
      const doc = await tx.get(pubRef);
      if (doc.exists) {
        const existingUid = doc.data().uid;
        if (existingUid !== uid) throw new Error('SLUG_TAKEN');
        tx.set(pubRef, {
          uid: uid, username: username, slug: slug,
          projectName: projectName || 'Untitled', description: description || '',
          files: files, views: doc.data().views || 0,
          publishedAt: doc.data().publishedAt || admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return { created: false };
      }
      tx.set(pubRef, {
        uid: uid, username: username, slug: slug,
        projectName: projectName || 'Untitled', description: description || '',
        files: files, views: 0,
        publishedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return { created: true };
    });

    res.json({
      ok: true, created: result.created,
      url: '/s/' + slug,
      fullUrl: (req.protocol + '://' + req.get('host') + '/s/' + slug)
    });
  } catch (err) {
    if (err.message === 'SLUG_TAKEN') {
      return res.status(409).json({ error: 'That name is already taken. Try a different slug.' });
    }
    console.error('[publish] error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---- API: Unpublish -------------------------------------------------------
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

// ---- API: My published sites ---------------------------------------------
app.get('/api/my-published', requireAuth, async (req, res) => {
  try {
    const snap = await admin.firestore().collection('published')
      .where('uid', '==', req.user.uid).orderBy('updatedAt', 'desc').get();
    const sites = [];
    snap.forEach(function (doc) {
      const d = doc.data();
      sites.push({
        slug: d.slug, projectName: d.projectName,
        description: d.description, views: d.views || 0,
        updatedAt: d.updatedAt ? d.updatedAt.toDate().toISOString() : null
      });
    });
    res.json({ sites: sites });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ---- API: Explore ---------------------------------------------------------
app.get('/api/explore', async (req, res) => {
  try {
    const snap = await admin.firestore().collection('published')
      .orderBy('updatedAt', 'desc').limit(60).get();
    const sites = [];
    snap.forEach(function (doc) {
      const d = doc.data();
      sites.push({
        slug: d.slug, username: d.username,
        projectName: d.projectName, description: d.description,
        views: d.views || 0,
        updatedAt: d.updatedAt ? d.updatedAt.toDate().toISOString() : null
      });
    });
    res.json({ sites: sites });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ---- API: User profile ----------------------------------------------------
app.get('/api/user/:username', async (req, res) => {
  const username = req.params.username;
  try {
    const snap = await admin.firestore().collection('published')
      .where('username', '==', username).orderBy('updatedAt', 'desc').get();
    const sites = [];
    let uid = null;
    snap.forEach(function (doc) {
      const d = doc.data();
      uid = d.uid;
      sites.push({
        slug: d.slug, projectName: d.projectName,
        description: d.description, views: d.views || 0,
        updatedAt: d.updatedAt ? d.updatedAt.toDate().toISOString() : null
      });
    });
    res.json({ username, uid, sites, count: sites.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ---- API: Send verification email ----------------------------------------
app.post('/api/send-verification-email', async (req, res) => {
  const { userEmail, userName, redirectUrl } = req.body || {};
  if (!userEmail) return res.status(400).json({ error: 'userEmail is required.' });
  if (!emailjsReady) return res.status(500).json({ error: 'EmailJS is not configured.' });
  if (!admin.apps.length) return res.status(500).json({ error: 'Firebase Admin not initialized.' });

  try {
    const actionCodeSettings = {
      url: redirectUrl || 'http://localhost:5500/verify.html',
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

// ---- API: Contact form ----------------------------------------------------
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

// ---- Route: /s/:slug — published homepage ---------------------------------
app.get('/s/:slug', async (req, res, next) => {
  const slug = req.params.slug;
  if (!admin.apps.length) return next();
  try {
    const doc = await admin.firestore().collection('published').doc(slug).get();
    if (!doc.exists) return res.status(404).sendFile(path.join(__dirname, '404.html'));

    const data = doc.data();
    const files = data.files || {};
    doc.ref.update({ views: admin.firestore.FieldValue.increment(1) }).catch(function () {});

    var rawHtml = files['index.html'] || '';
    rawHtml = resolveAssetUrls(rawHtml, files);
    const composedHtml = rewritePublishedLinks(rawHtml, slug);
    const composedCss = files['style.css'] || '';
    const composedJs = files['script.js'] || '';

    const html = '<!DOCTYPE html><html><head><meta charset="UTF-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
      '<title>' + (data.projectName || slug) + '</title>' +
      '<style>' + composedCss + '</style>' +
      '</head><body>' +
      composedHtml +
      '<script>' + composedJs + '<\/script>' +
      '<div style="position:fixed;bottom:12px;right:12px;z-index:99999;' +
      'background:rgba(2,6,23,0.9);color:#cbd5e1;padding:8px 14px;' +
      'border-radius:20px;font-family:Arial,sans-serif;font-size:12px;' +
      'border:1px solid #334155;backdrop-filter:blur(8px);">' +
      '<a href="/" style="color:#38bdf8;text-decoration:none;font-weight:bold;">⚡ Built with CodeWix</a>' +
      '</div></body></html>';

    res.send(html);
  } catch (err) {
    console.error('[s/:slug] error:', err);
    next();
  }
});

// ---- Route: /s/:slug/:filename — individual files -------------------------
app.get('/s/:slug/:filename', async (req, res, next) => {
  const slug = req.params.slug;
  const filename = req.params.filename;
  if (!admin.apps.length) return next();
  try {
    const doc = await admin.firestore().collection('published').doc(slug).get();
    if (!doc.exists) return res.status(404).sendFile(path.join(__dirname, '404.html'));

    const data = doc.data();
    const files = data.files || {};
    const fileContent = files[filename];
    if (fileContent === undefined) return res.status(404).sendFile(path.join(__dirname, '404.html'));

    const ext = path.extname(filename).toLowerCase();
    const types = {
      '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
      '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp'
    };

    let finalContent = fileContent;
    if (ext === '.html' || ext === '.htm') {
      finalContent = resolveAssetUrls(fileContent, files);
      finalContent = rewritePublishedLinks(finalContent, slug);
    }

    res.type(types[ext] || 'text/plain; charset=utf-8').send(finalContent);
  } catch (err) {
    console.error('[s/:slug/:filename] error:', err);
    next();
  }
});

// ---- Route: /u/:username --------------------------------------------------
app.get('/u/:username', function (req, res) {
  res.sendFile(path.join(__dirname, 'profile.html'));
});

// ---- Fallback -------------------------------------------------------------
app.use('/api', function (req, res) {
  res.status(404).json({ error: 'Unknown API route.' });
});

app.use(express.static(path.join(__dirname)));

app.use(function (req, res) {
  res.status(404).sendFile(path.join(__dirname, '404.html'));
});

app.listen(PORT, '0.0.0.0', function () {
  console.log('\n✅ CodeWix running on port ' + PORT);
  console.log('   URL:         http://127.0.0.1:' + PORT);
  console.log('   GROQ:        ' + (GROQ_API_KEY ? 'YES ✔' : 'NO ❌'));
  console.log('   EmailJS:     ' + (emailjsReady ? 'YES ✔' : 'NO ❌'));
  console.log('   FB Admin:    ' + (admin.apps.length ? 'YES ✔' : 'NO ❌') + '\n');
});