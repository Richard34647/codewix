// ==========================================================================
// CodeWix Server — static files + Groq proxy + EmailJS verification
// ==========================================================================

require('dotenv').config();
const express = require('express');
const path = require('path');
const admin = require('firebase-admin');
const emailjs = require('@emailjs/nodejs');

const app = express();
const PORT = process.env.PORT || 5500;

// ---- Groq config ----------------------------------------------------------
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

// ---- Firebase Admin init --------------------------------------------------
// Option 1: Use a service account JSON file (local dev). Path in env var.
// Option 2: Use individual env vars (recommended for Render).
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // Full JSON string in one env var (Render-friendly)
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({ credential: admin.credential.cert(sa) });
    console.log('[Firebase Admin] initialized via FIREBASE_SERVICE_ACCOUNT');
  } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    // Split env vars
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId:   process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey:  process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      })
    });
    console.log('[Firebase Admin] initialized via split env vars');
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // Uses the file path from GOOGLE_APPLICATION_CREDENTIALS
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
    console.log('[Firebase Admin] initialized via GOOGLE_APPLICATION_CREDENTIALS');
  } else {
    console.warn('[Firebase Admin] No credentials found — verification emails will fail.');
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

// ==========================================================================
// API: Groq chat proxy
// ==========================================================================
app.post('/api/chat', async (req, res) => {
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
    res.json(data);
  } catch (err) {
    console.error('[Groq] fetch failed:', err);
    res.status(502).json({ error: 'Failed to reach Groq API: ' + err.message });
  }
});

// ==========================================================================
// API: Send verification email via EmailJS + Firebase Admin
// ==========================================================================
app.post('/api/send-verification-email', async (req, res) => {
  const { userEmail, userName, redirectUrl } = req.body || {};

  if (!userEmail) {
    return res.status(400).json({ error: 'userEmail is required.' });
  }
  if (!emailjsReady) {
    return res.status(500).json({ error: 'EmailJS is not configured on the server.' });
  }

  try {
    // 1. Generate a Firebase verification link for this user
    const actionCodeSettings = {
      url: redirectUrl || 'https://codewi.onrender.com/verify.html',
      handleCodeInApp: false
    };
    const verificationLink = await admin.auth().generateEmailVerificationLink(userEmail, actionCodeSettings);
    console.log('[verify] generated link for', userEmail);

    // 2. Send via EmailJS
    const templateParams = {
      to_email: userEmail,
      email: userEmail,                 // some templates use {{email}} instead of {{to_email}}
      user_name: userName || 'there',
      verification_link: verificationLink
    };

    const result = await emailjs.send(
      process.env.EMAILJS_SERVICE_ID,
      process.env.EMAILJS_TEMPLATE_ID,
      templateParams
    );

    console.log('[verify] EmailJS result:', result.status, result.text);
    res.status(200).json({ ok: true, message: 'Verification email sent.' });
  } catch (err) {
    console.error('[verify] failed:', err);
    res.status(500).json({
      error: err.message || 'Failed to send verification email.',
      code: err.code || 'unknown'
    });
  }
});

// ==========================================================================
// Fallback for unknown API routes
// ==========================================================================
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Unknown API route.' });
});

// ---- Static files --------------------------------------------------------
app.use(express.static(path.join(__dirname)));

// ---- Start ---------------------------------------------------------------
app.listen(PORT, '0.0.0.0', function () {
  console.log('\n✅ CodeWix running on port ' + PORT);
  console.log('   Groq proxy: POST /api/chat');
  console.log('   Email API:  POST /api/send-verification-email');
  console.log('   GROQ_API_KEY: ' + (GROQ_API_KEY ? 'YES ✔' : 'NO ❌'));
  console.log('   EmailJS:      ' + (emailjsReady ? 'YES ✔' : 'NO ❌'));
  console.log('   Firebase Admin: ' + (admin.apps.length ? 'YES ✔' : 'NO ❌') + '\n');
});