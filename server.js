// ==========================================================================
// CodeWix Server — static files + Groq proxy + EmailJS + Rate limiting + 404
// ==========================================================================

require('dotenv').config();
const express = require('express');
const path = require('path');
const admin = require('firebase-admin');
const emailjs = require('@emailjs/nodejs');

const app = express();
const PORT = process.env.PORT || 5500;

// ---- Config ---------------------------------------------------------------
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const RATE_LIMIT_PER_DAY = parseInt(process.env.RATE_LIMIT_PER_DAY || '50', 10);

// ---- Firebase Admin init --------------------------------------------------
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
    console.warn('[Firebase Admin] No credentials found — verification emails and rate limiting will not work.');
  }
} catch (err) {
  console.error('[Firebase Admin] init failed:', err.message);
}

// ---- EmailJS init ---------------------------------------------------------
let emailjsReady = false;
if (process.env.EMAILJS_PUBLIC_KEY && process.env.EMAILJS_PRIVATE_KEY) {
  emailjs.init({
    publicKey:  process.env.EMAILJS_PUBLIC_KEY,
    privateKey: process.env.EMAILJS_PRIVATE_KEY,
  });
  emailjsReady = true;
  console.log('[EmailJS] initialized');
} else {
  console.warn('[EmailJS] Missing EMAILJS_PUBLIC_KEY or EMAILJS_PRIVATE_KEY');
}

// ---- Middleware -----------------------------------------------------------
app.use(express.json({ limit: '1mb' }));

// ---- Auth middleware (verifies Firebase ID token) -------------------------
async function requireAuth(req, res, next) {
  if (!admin.apps.length) {
    return res.status(500).json({ error: 'Auth is not configured on the server.' });
  }
  const header = req.headers.authorization || '';
  const idToken = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!idToken) {
    return res.status(401).json({ error: 'Missing auth token.' });
  }
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('[auth] token verify failed:', err.message);
    return res.status(401).json({ error: 'Invalid or expired auth token.' });
  }
}

// ---- Rate limit check -----------------------------------------------------
async function checkRateLimit(req, res, next) {
  const uid = req.user.uid;
  const today = new Date().toISOString().slice(0, 10);
  const ref = admin.firestore().collection('users').doc(uid).collection('usage').doc(today);

  try {
    const doc = await ref.get();
    const count = doc.exists ? (doc.data().count || 0) : 0;

    if (count >= RATE_LIMIT_PER_DAY) {
      return res.status(429).json({
        error: 'Daily limit reached. You have used ' + count + ' of ' + RATE_LIMIT_PER_DAY + ' AI messages today. Your limit resets at midnight UTC.',
        limit: RATE_LIMIT_PER_DAY,
        used: count,
        remaining: 0,
        date: today
      });
    }

    req.rateLimitRef = ref;
    req.rateLimitCount = count;
    next();
  } catch (err) {
    console.error('[rate] check failed:', err.message);
    next();
  }
}

// ---- Increment counter (fire-and-forget) ----------------------------------
function incrementUsage(ref, currentCount) {
  ref.set({
    count: (currentCount || 0) + 1,
    lastUsed: new Date().toISOString()
  }, { merge: true }).catch(function (err) {
    console.error('[rate] increment failed:', err.message);
  });
}

// ==========================================================================
// API: Rate limit status
// ==========================================================================
app.get('/api/rate-limit-status', requireAuth, async (req, res) => {
  const uid = req.user.uid;
  const today = new Date().toISOString().slice(0, 10);
  const ref = admin.firestore().collection('users').doc(uid).collection('usage').doc(today);

  try {
    const doc = await ref.get();
    const used = doc.exists ? (doc.data().count || 0) : 0;
    res.json({
      limit: RATE_LIMIT_PER_DAY,
      used: used,
      remaining: Math.max(0, RATE_LIMIT_PER_DAY - used),
      date: today
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================================================
// API: Groq chat proxy (auth + rate limited)
// ==========================================================================
app.post('/api/chat', requireAuth, checkRateLimit, async (req, res) => {
  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: 'Server is missing GROQ_API_KEY.' });
  }
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
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + GROQ_API_KEY
      },
      body: JSON.stringify(body)
    });
    const data = await groqRes.json();

    if (!groqRes.ok) {
      console.error('[Groq] upstream error:', groqRes.status, data);
      return res.status(groqRes.status).json(data);
    }

    incrementUsage(req.rateLimitRef, req.rateLimitCount);
    res.json(data);
  } catch (err) {
    console.error('[Groq] fetch failed:', err);
    res.status(502).json({ error: 'Failed to reach Groq API: ' + err.message });
  }
});

// ==========================================================================
// API: Send verification email
// ==========================================================================
app.post('/api/send-verification-email', async (req, res) => {
  const { userEmail, userName, redirectUrl } = req.body || {};

  if (!userEmail) return res.status(400).json({ error: 'userEmail is required.' });
  if (!emailjsReady) return res.status(500).json({ error: 'EmailJS is not configured.' });
  if (!admin.apps.length) return res.status(500).json({ error: 'Firebase Admin is not initialized.' });

  try {
    const actionCodeSettings = {
      url: redirectUrl || 'https://codewi.onrender.com/verify.html',
      handleCodeInApp: false
    };
    const verificationLink = await admin.auth().generateEmailVerificationLink(userEmail, actionCodeSettings);
    console.log('[verify] generated link for', userEmail);

    const result = await emailjs.send(
      process.env.EMAILJS_SERVICE_ID,
      process.env.EMAILJS_TEMPLATE_ID,
      {
        to_email: userEmail,
        email: userEmail,
        user_name: userName || 'there',
        verification_link: verificationLink
      }
    );

    console.log('[verify] EmailJS result:', result.status);
    res.status(200).json({ ok: true, message: 'Verification email sent.' });
  } catch (err) {
    console.error('[verify] FULL ERROR:', err);
    res.status(500).json({
      error: err.text || err.message || JSON.stringify(err),
      code: err.code || err.status || 'unknown'
    });
  }
});

// ==========================================================================
// API: Contact form
// ==========================================================================
app.post('/api/contact', async (req, res) => {
  const { name, email, subject, message } = req.body || {};

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }
  if (!emailjsReady) {
    return res.status(500).json({ error: 'Email service is not configured.' });
  }
  if (!process.env.EMAILJS_CONTACT_TEMPLATE_ID) {
    return res.status(500).json({ error: 'Contact template ID is not configured.' });
  }

  try {
    const result = await emailjs.send(
      process.env.EMAILJS_SERVICE_ID,
      process.env.EMAILJS_CONTACT_TEMPLATE_ID,
      {
        from_name: name,
        reply_to:  email,
        subject:   subject,
        message:   message,
        to_email:  'codewix@proton.me'
      }
    );
    console.log('[contact] sent from', email, '— status:', result.status);
    res.status(200).json({ ok: true, message: 'Message received.' });
  } catch (err) {
    console.error('[contact] FULL ERROR:', err);
    res.status(500).json({ error: err.text || err.message || 'Failed to send message.' });
  }
});

// ==========================================================================
// Fallback for unknown API routes
// ==========================================================================
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Unknown API route.' });
});

// ---- Static files ---------------------------------------------------------
app.use(express.static(path.join(__dirname)));

// ---- 404 fallback for non-API routes --------------------------------------
app.use(function (req, res) {
  res.status(404).sendFile(path.join(__dirname, '404.html'));
});

// ---- Start ----------------------------------------------------------------
app.listen(PORT, '0.0.0.0', function () {
  console.log('\n✅ CodeWix running on port ' + PORT);
  console.log('   Groq proxy:       POST /api/chat (auth + rate limited)');
  console.log('   Verification:     POST /api/send-verification-email');
  console.log('   Contact form:     POST /api/contact');
  console.log('   Rate limit:       GET  /api/rate-limit-status');
  console.log('   GROQ_API_KEY:     ' + (GROQ_API_KEY ? 'YES ✔' : 'NO ❌'));
  console.log('   EmailJS:          ' + (emailjsReady ? 'YES ✔' : 'NO ❌'));
  console.log('   Firebase Admin:   ' + (admin.apps.length ? 'YES ✔' : 'NO ❌'));
  console.log('   Daily AI limit:   ' + RATE_LIMIT_PER_DAY + ' messages per user\n');
});