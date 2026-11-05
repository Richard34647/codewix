// ---- API: Contact form ----------------------------------------------------
app.post('/api/contact', async (req, res) => {
  if (!process.env.EMAILJS_SERVICE_ID || !process.env.EMAILJS_CONTACT_TEMPLATE_ID || !process.env.EMAILJS_PUBLIC_KEY) {
    return res.status(500).json({ error: 'EmailJS env vars missing in Render.' });
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
          from_name: req.body.name,
          reply_to: req.body.email,
          subject: req.body.subject,
          message: req.body.message,
          to_email: 'codewix@proton.me'
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ RAW EMAILJS CONTACT ERROR:', errorText);
      return res.status(500).json({ error: 'EmailJS Error: ' + errorText });
    }
    res.json({ ok: true });
  } catch (err) { 
    console.error('❌ Contact Network Error:', err);
    res.status(500).json({ error: err.message || 'Network error' }); 
  }
});

// ---- API: Send verification email ----------------------------------------
app.post('/api/send-verification-email', async (req, res) => {
  if (!process.env.EMAILJS_SERVICE_ID || !process.env.EMAILJS_TEMPLATE_ID || !process.env.EMAILJS_PUBLIC_KEY) {
    return res.status(500).json({ error: 'EmailJS env vars missing in Render.' });
  }
  try {
    const link = await admin.auth().generateEmailVerificationLink(req.body.userEmail, { 
      url: req.body.redirectUrl || 'https://codewi.onrender.com/verify.html' 
    });
    
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: process.env.EMAILJS_SERVICE_ID,
        template_id: process.env.EMAILJS_TEMPLATE_ID,
        user_id: process.env.EMAILJS_PUBLIC_KEY,
        accessToken: process.env.EMAILJS_PRIVATE_KEY,
        template_params: {
          to_email: req.body.userEmail, 
          user_name: req.body.userName || 'there', 
          verification_link: link 
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ RAW EMAILJS VERIFY ERROR:', errorText);
      return res.status(500).json({ error: 'EmailJS Error: ' + errorText });
    }
    res.json({ ok: true });
  } catch (err) { 
    console.error('❌ Verify Email Error:', err);
    res.status(500).json({ error: err.message || 'Unknown error' }); 
  }
});
