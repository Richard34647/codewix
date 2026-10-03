// ==========================================================================
// CodeWix Server — serves static files + proxies Groq API securely
// Works locally and on Render.
// ==========================================================================

require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5500;

// ---- Config ---------------------------------------------------------------
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

if (!GROQ_API_KEY) {
  console.warn('\n⚠️  GROQ_API_KEY is not set. Add it to your .env file (or Render env vars).\n');
}

// ---- Middleware -----------------------------------------------------------
app.use(express.json({ limit: '1mb' }));

// ---- API routes (must be BEFORE static so /api/* isn't shadowed) ----------
app.post('/api/chat', async (req, res) => {
  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: 'Server is missing GROQ_API_KEY.' });
  }

  const { messages, model, temperature, max_completion_tokens } = req.body || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required.' });
  }

  try {
    const groqRes = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + GROQ_API_KEY
      },
      body: JSON.stringify({
        model: model || 'llama-3.3-70b-versatile',
        messages: messages,
        temperature: typeof temperature === 'number' ? temperature : 0.7,
        max_completion_tokens: max_completion_tokens || 2048
      })
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

// Fallback for unknown /api/* routes
app.use('/api', function (req, res) {
  res.status(404).json({ error: 'Unknown API route.' });
});

// ---- Static files ---------------------------------------------------------
app.use(express.static(path.join(__dirname)));

// ---- Start ----------------------------------------------------------------
app.listen(PORT, '0.0.0.0', function () {
  console.log('\n✅ CodeWix running on port ' + PORT);
  console.log('   Groq proxy: POST /api/chat');
  console.log('   API key loaded: ' + (GROQ_API_KEY ? 'YES ✔' : 'NO ❌') + '\n');
});