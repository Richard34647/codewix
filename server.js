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
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

// ---- Firebase Admin init --------------------------------------------------
try {
  const serviceAccountPath = path.join(__dirname, 'firebase-service-account.json');
  if (fs.existsSync(serviceAccountPath)) {
    const sa = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    admin.initializeApp({ credential: admin.credential.cert(sa), storageBucket: 'codewix-16971.firebasestorage.app' });
    console.log('✅ [Firebase Admin] Initialized via JSON');
  } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      }),
      storageBucket: 'codewix-16971.firebasestorage.app'
    });
    console.log('✅ [Firebase Admin] Initialized via env vars');
  }
} catch (err) { console.error('❌ [Firebase Admin] init failed:', err.message); }

let emailjsReady = false;
if (process.env.EMAILJS_PUBLIC_KEY && process.env.EMAILJS_PRIVATE_KEY) {
  emailjs.init({ publicKey: process.env.EMAILJS_PUBLIC_KEY, privateKey: process.env.EMAILJS_PRIVATE_KEY });
  emailjsReady = true;
}

app.use(express.json({ limit: '5mb' }));

// ---- Helpers & Auth Middleware ---------------------------------------------
function rewritePublishedLinks(html, slug) { /* ... existing helper ... */ }
function resolveAssetUrls(html, files) { /* ... existing helper ... */ }

async function requireAuth(req, res, next) {
  if (!admin.apps.length) return res.status(500).json({ error: 'Auth not configured.' });
  const header = req.headers.authorization || '';
  const idToken = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!idToken) return res.status(401).json({ error: 'Missing auth token.' });
  try {
    req.user = await admin.auth().verifyIdToken(idToken);
    // 👇 Check for premium custom claim
    req.isPremium = req.user.premium === true;
    next();
  } catch (err) { return res.status(401).json({ error: 'Invalid auth token.' }); }
}

// ---- Rate Limit & Usage Tracking -------------------------------------------
async function checkRateLimit(req, res, next) { /* ... existing rate limit logic ... */ }
function incrementUsage(ref, currentCount) { /* ... existing usage increment logic ... */ }

// ---- API: Groq Chat Proxy (Streaming) --------------------------------------
app.post('/api/chat', requireAuth, checkRateLimit, async (req, res) => {
  // ... existing streaming chat logic ...
});

// ---- API: Image Generation (Pollinations) ----------------------------------
app.post('/api/generate-image', requireAuth, async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt is required.' });

  // Premium restriction: Only premium users can use high-quality models
  const model = req.isPremium ? 'flux' : 'sana'; // Free users get SANA, premium gets FLUX
  const endpoint = `https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?model=${model}&width=1024&height=1024`;

  try {
    const headers = {};
    if (POLLINATIONS_API_KEY) {
      headers['Authorization'] = `Bearer ${POLLINATIONS_API_KEY}`;
    }
    const response = await fetch(endpoint, { headers });
    
    if (!response.ok) {
      // Fallback to free public endpoint if authenticated key fails (e.g., out of credits)
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

// ---- API: Video Generation (InferencePort Proxy) ----------------------------
app.post('/api/generate-video', requireAuth, async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt is required.' });

  // Premium restriction: Only premium users can generate videos
  if (!req.isPremium) {
    return res.status(403).json({ error: 'Video generation is a premium feature. Please upgrade your account.' });
  }

  try {
    // InferencePort free video generation endpoint
    const response = await fetch('https://inferenceport.ai/v1/videos/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'wan-fast', prompt: prompt })
    });

    if (!response.ok) throw new Error('Video generation failed');
    const data = await response.json();
    // The proxy usually returns a job ID or direct URL
    res.json({ videoUrl: data.url || data.data?.[0]?.url || data.video_url });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate video: ' + err.message });
  }
});

// ---- API: Stripe Checkout (For Upgrades) -----------------------------------
app.post('/api/create-checkout-session', requireAuth, async (req, res) => {
  // ... Stripe integration logic ...
  // This would create a Stripe checkout session and return the URL.
  // You would need to install the 'stripe' npm package for this.
});

// ---- Other Routes (Publish, Unpublish, Explore, etc.) ----------------------
app.post('/api/publish', requireAuth, async (req, res) => { /* ... */ });
app.get('/api/explore', async (req, res) => { /* ... */ });
// ... rest of your existing routes ...

app.listen(PORT, '0.0.0.0', () => console.log('\n✅ CodeWix running on port ' + PORT + '\n'));
