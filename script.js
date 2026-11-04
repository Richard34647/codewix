// ==========================================================================
// CodeWix — script.js (Direct ngrok Connection)
// ==========================================================================

console.log('[CodeWix] script.js file evaluated');

window.addEventListener('DOMContentLoaded', function () {
  var auth = null;
  var db = null;

  if (typeof firebase === 'undefined') {
    console.error('[CodeWix] firebase missing.');
  } else {
    try {
      if (!firebase.apps.length) {
        firebase.initializeApp({
          apiKey: "AIzaSyAitVY1Ho7SzJQGUOyJMxfcOp11AOX0uKI",
          authDomain: "codewix-16971.firebaseapp.com",
          projectId: "codewix-16971",
          storageBucket: "codewix-16971.firebasestorage.app",
          messagingSenderId: "1060917593178",
          appId: "1:1060917593178:web:8ce61640aa476bf135c463",
          measurementId: "G-RPX2BV738C"
        });
      }
      auth = firebase.auth();
      if (firebase.firestore) db = firebase.firestore();
      console.log('[CodeWix] Firebase ready ✔');
    } catch (err) { console.error('[CodeWix] init failed:', err); }
  }

  function $(id) { return document.getElementById(id); }
  function showError(el, msg) { if (el) { el.textContent = msg; el.style.display = 'block'; } else alert(msg); }
  function hideError(el) { if (el) el.style.display = 'none'; }
  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function showToast(msg, type) {
    var t = document.createElement('div');
    t.className = 'toast ' + (type || '');
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.classList.add('show'); }, 10);
    setTimeout(function () {
      t.classList.remove('show');
      setTimeout(function () { document.body.removeChild(t); }, 300);
    }, 2400);
  }
  function formatDate(ts) {
    if (!ts) return '';
    var d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString();
  }
  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }
  function extensionForLang(lang) {
    var map = {
      'javascript':'js','js':'js','jsx':'jsx','typescript':'ts','ts':'ts','tsx':'tsx',
      'python':'py','py':'py','html':'html','xml':'html','css':'css','scss':'scss',
      'json':'json','yaml':'yml','yml':'yml','bash':'sh','sh':'sh','shell':'sh',
      'sql':'sql','java':'java','c':'c','cpp':'cpp','csharp':'cs','cs':'cs','go':'go',
      'rust':'rs','php':'php','ruby':'rb','swift':'swift','kotlin':'kt',
      'markdown':'md','md':'md','text':'txt','plaintext':'txt'
    };
    return map[String(lang).toLowerCase()] || 'txt';
  }
  function readFileAsText(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(reader.error); };
      reader.readAsText(file);
    });
  }
  function resizeImage(file, maxWidth, maxHeight) {
    return new Promise(function(resolve, reject) {
      var reader = new FileReader();
      reader.onload = function(e) {
        var img = new Image();
        img.onload = function() {
          var width = img.width;
          var height = img.height;
          if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; }
          if (height > maxHeight) { width = Math.round((width * maxHeight) / height); height = maxHeight; }
          var canvas = document.createElement('canvas');
          canvas.width = width; canvas.height = height;
          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // ======================================================================
  // THEME TOGGLE, UPGRADE POPUP & ADMIN BUTTON INJECTION
  // ======================================================================
  var ADMIN_EMAIL = 'wilcoxr889@gmail.com';
  var isUserPremium = false;
  var isUserAdmin = false;

  var savedTheme = localStorage.getItem('codewix_theme');
  if (savedTheme === 'light') document.body.classList.add('light-mode');

  var navMenu = document.querySelector('nav') || document.querySelector('.studio-nav');
  if (navMenu) {
    var themeBtn = document.createElement('button');
    themeBtn.className = 'theme-toggle-btn';
    themeBtn.id = 'themeToggleBtn';
    themeBtn.innerHTML = document.body.classList.contains('light-mode') ? '🌙' : '☀️';
    themeBtn.addEventListener('click', function() {
      document.body.classList.toggle('light-mode');
      var isLight = document.body.classList.contains('light-mode');
      localStorage.setItem('codewix_theme', isLight ? 'light' : 'dark');
      themeBtn.innerHTML = isLight ? '🌙' : '☀️';
    });
    navMenu.appendChild(themeBtn);

    var popupHTML = `
      <div id="upgradePopup" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(2,6,23,0.85); z-index:9999; justify-content:center; align-items:center; backdrop-filter:blur(4px);">
        <div style="background:#1e293b; border:1px solid #334155; border-radius:16px; padding:40px; max-width:500px; text-align:center; box-shadow:0 20px 50px rgba(0,0,0,0.5); position:relative;">
          <button onclick="document.getElementById('upgradePopup').style.display='none'" style="position:absolute; top:15px; right:20px; background:none; border:none; color:#94a3b8; font-size:24px; cursor:pointer;">&times;</button>
          <div style="font-size:48px; margin-bottom:15px;">🚀</div>
          <h2 style="color:#38bdf8; margin-bottom:10px;">Unlock CodeWix Premium</h2>
          <p style="color:#cbd5e1; margin-bottom:20px; font-size:16px;">You are currently on the free plan.</p>
          <ul style="text-align:left; color:#cbd5e1; margin-bottom:30px; line-height:1.8; padding-left:20px;">
            <li><strong style="color:#fff;">Unlimited AI Coding:</strong> Chat without daily limits.</li>
            <li><strong style="color:#fff;">Extended Video Generation:</strong> Create 10-second videos (Free is limited to 5s).</li>
            <li><strong style="color:#fff;">Priority Image Rendering:</strong> Faster generation with premium models.</li>
          </ul>
          <a href="upgrade.html" style="display:block; width:100%; padding:14px; background:#fbbf24; color:#020617; text-decoration:none; border-radius:8px; font-weight:bold; font-size:16px;">Upgrade for $5/month</a>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', popupHTML);

    if (auth) {
      auth.onAuthStateChanged(async function(user) {
        if (!user) return;
        const tokenResult = await user.getIdTokenResult();
        isUserPremium = tokenResult.claims.premium === true;
        isUserAdmin = user.email === ADMIN_EMAIL;

        if (isUserAdmin && !document.getElementById('adminNavBtn')) {
          var adminBtn = document.createElement('a');
          adminBtn.href = 'admin.html';
          adminBtn.id = 'adminNavBtn';
          adminBtn.innerHTML = '👑 Admin';
          adminBtn.style.cssText = 'background:#38bdf8;color:#020617;padding:6px 12px;border-radius:6px;font-weight:bold;margin-left:10px;text-decoration:none;';
          navMenu.appendChild(adminBtn);
        }
      });
    }
  }

  document.querySelectorAll('nav').forEach(function (nav) {
    if (!nav.querySelector('a[href="learn.html"]') && !nav.classList.contains('studio-nav')) {
      var a = document.createElement('a');
      a.href = 'learn.html'; a.textContent = 'Learn';
      var home = nav.querySelector('a[href="index.html"]');
      if (home && home.nextSibling) nav.insertBefore(a, home.nextSibling);
      else nav.appendChild(a);
    }
  });

  var path = location.pathname.toLowerCase();
  var protectedPages = ['dashboard.html', 'ai-assistance.html', 'learn.html', 'publish.html'];
  var onProtectedPage = protectedPages.some(function (p) { return path.indexOf(p) !== -1; });

  if (auth && onProtectedPage) {
    auth.onAuthStateChanged(function (user) {
      if (!user) { location.replace('login.html'); return; }
      if (!user.emailVerified) {
        alert('Please verify your email to access this page.');
        auth.signOut().then(function () { location.replace('login.html'); });
        return;
      }
      if ($('dashUser'))  $('dashUser').textContent  = user.email.split('@')[0];
      if ($('userEmail')) $('userEmail').textContent = user.email;
    });
  }

  function logout(e) {
    if (e) e.preventDefault();
    if (!auth) { location.href = 'login.html'; return; }
    auth.signOut().then(function () { location.replace('login.html'); });
  }
  if ($('logoutBtn'))  $('logoutBtn').addEventListener('click', logout);
  if ($('logoutLink')) $('logoutLink').addEventListener('click', logout);

  // ======================================================================
  // Register & Login
  // ======================================================================
  if ($('registerForm')) {
    $('registerForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var email = $('email').value.trim(), password = $('password').value;
      var username = $('username') ? $('username').value.trim() : '';
      var errBox = $('errorBox'); hideError(errBox);
      if (!auth) { showError(errBox, 'Firebase not loaded.'); return; }
      var submitBtn = $('registerForm').querySelector('button[type="submit"]');
      var orig = submitBtn ? submitBtn.textContent : 'Sign Up';
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Creating account…'; }

      auth.createUserWithEmailAndPassword(email, password)
        .then(function (uc) {
          var user = uc.user;
          if (username && user.updateProfile) return user.updateProfile({ displayName: username }).then(function () { return user; });
          return user;
        })
        .then(function (user) {
          return fetch('/api/send-verification-email', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userEmail: user.email, userName: username || user.email.split('@')[0], redirectUrl: window.location.origin + '/verify.html' })
          }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); });
        })
        .then(function (result) {
          if (!result.ok) {
            showError(errBox, 'Account created but verification email failed: ' + (result.data.error || 'unknown'));
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = orig; }
            return;
          }
          alert('Registration successful! We sent a verification link to ' + email + '. Check your inbox.');
          window.location.href = 'login.html';
        })
        .catch(function (err) {
          var msg = err.message;
          if (err.code === 'auth/email-already-in-use') msg = 'That email is already registered.';
          else if (err.code === 'auth/weak-password') msg = 'Password must be at least 6 characters.';
          showError(errBox, msg);
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = orig; }
        });
    });
  }

  if ($('loginForm')) {
    var pendingVerificationEmail = null;
    $('loginForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var email = $('email').value.trim(), password = $('password').value;
      var errBox = $('errorBox');
      if (errBox) { errBox.className = 'error-box'; errBox.innerHTML = ''; errBox.style.display = 'none'; }
      if (!auth) { showError(errBox, 'Firebase not loaded.'); return; }
      var submitBtn = $('loginForm').querySelector('button[type="submit"]');
      var orig = submitBtn ? submitBtn.textContent : 'Log In';
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Logging in…'; }

      auth.signInWithEmailAndPassword(email, password)
        .then(function (uc) {
          var user = uc.user;
          if (!user.emailVerified) {
            pendingVerificationEmail = user.email;
            return auth.signOut().then(function () {
              if (errBox) {
                errBox.innerHTML = '<div style="margin-bottom:10px;">Please verify your email before logging in.</div>' +
                  '<button type="button" class="resend-verify-btn">Resend verification email</button>';
                errBox.style.display = 'block';
              }
            });
          }
          alert('Login successful!');
          window.location.href = 'dashboard.html';
        })
        .catch(function (err) {
          var msg = err.message;
          if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') msg = 'Incorrect email or password.';
          else if (err.code === 'auth/user-not-found') msg = 'No account found with that email.';
          showError(errBox, msg);
        })
        .finally(function () { if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = orig; } });
    });

    var errBoxEl = $('errorBox');
    if (errBoxEl) {
      errBoxEl.addEventListener('click', function (e) {
        var btn = e.target.closest('.resend-verify-btn');
        if (!btn || !pendingVerificationEmail) return;
        btn.disabled = true; btn.textContent = 'Sending…';
        fetch('/api/send-verification-email', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userEmail: pendingVerificationEmail, redirectUrl: window.location.origin + '/verify.html' })
        })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
        .then(function (res) {
          if (!res.ok) { errBoxEl.className = 'error-box'; errBoxEl.textContent = 'Could not resend: ' + (res.data.error || 'unknown'); return; }
          errBoxEl.className = 'success-box';
          errBoxEl.textContent = '✅ New verification email sent.';
        })
        .catch(function () { errBoxEl.className = 'error-box'; errBoxEl.textContent = 'Could not reach server.'; });
      });
    }
  }

  // ======================================================================
  // AI Assistant (Direct ngrok connection)
  // ======================================================================
  var chatContainer      = $('chatContainer');
  var chatInput          = $('chatInput');
  var sendBtn            = $('sendBtn');
  var thinkingToggle     = $('thinkingToggle');

  if (chatContainer && chatInput && sendBtn) {
    console.log('[CodeWix] AI Assistant detected');
    
    var attachBtn = document.createElement('button');
    attachBtn.id = 'chatAttachBtn'; attachBtn.type = 'button'; attachBtn.innerHTML = '📎';
    attachBtn.style.cssText = 'background:transparent;border:none;font-size:20px;cursor:pointer;padding:0 8px;color:#cbd5e1;';
    if (sendBtn.parentNode) sendBtn.parentNode.insertBefore(attachBtn, sendBtn);

    var mediaTogglesHTML = `
      <label class="thinking-toggle" style="margin-left: 10px;">
        <input type="checkbox" id="imageGenToggle">
        <span class="toggle-slider" style="background: #f472b6;"></span> 🎨 Image Mode
      </label>
      <label class="thinking-toggle" style="margin-left: 10px;">
        <input type="checkbox" id="videoGenToggle">
        <span class="toggle-slider" style="background: #a78bfa;"></span> 🎬 Video Mode
      </label>
    `;
    if (thinkingToggle && thinkingToggle.parentNode) thinkingToggle.parentNode.insertAdjacentHTML('beforeend', mediaTogglesHTML);
    var imageGenToggle = $('imageGenToggle');
    var videoGenToggle = $('videoGenToggle');

    var conversation = [];
    var authUser = null;

    if (auth) auth.onAuthStateChanged(user => {
      if (user) { authUser = user; }
    });

    function appendMessage(role) {
      var div = document.createElement('div');
      div.className = 'chat-message ' + (role === 'user' ? 'user-message' : 'assistant-message');
      div.innerHTML = '<div class="message-role">' + (role === 'user' ? 'You' : 'Assistant') + '</div><div class="message-content"></div>';
      chatContainer.appendChild(div); chatContainer.scrollTop = chatContainer.scrollHeight;
      return div;
    }

    async function generateVideo(promptText) {
      if (!promptText) { showToast('Please type a prompt.', 'error'); return; }

      var userDiv = appendMessage('user'); 
      userDiv.querySelector('.message-content').innerHTML = '<div class="text-part">' + escapeHtml(promptText) + '</div>';
      
      var assistantDiv = appendMessage('assistant');
      var messageContent = assistantDiv.querySelector('.message-content');
      messageContent.innerHTML = '<div class="text-part"><span class="typing-dot">●</span><span class="typing-dot">●</span><span class="typing-dot">●</span> Generating video (this takes a few minutes on CPU)...</div>';

      try {
        // 1. Get the ngrok URL from Render
        const configRes = await fetch('/api/config');
        const configData = await configRes.json();
        const localAiUrl = configData.localAiUrl;
        
        if (!localAiUrl || localAiUrl === 'YOUR_NGROK_URL_HERE') throw new Error('Local AI URL is not configured.');

        // 2. Start the job directly on your laptop (with ngrok bypass header)
        var res = await fetch(`${localAiUrl}/generate`, {
          method: 'POST', 
          headers: { 
            'Content-Type': 'application/json', 
            'ngrok-skip-browser-warning': 'true' 
          },
          body: JSON.stringify({ prompt: promptText })
        });

        const startData = await res.json();
        if (!res.ok) throw new Error(startData.error || 'Failed to start');
        const jobId = startData.job_id;

        // 3. Poll your laptop directly
        let attempts = 0;
        let consecutiveErrors = 0;
        const maxAttempts = 60; // 60 attempts * 5 seconds = 5 minutes

        const pollInterval = setInterval(async () => {
          attempts++;
          if (attempts > maxAttempts) {
            clearInterval(pollInterval);
            messageContent.innerHTML = `<div class="text-part" style="color: #f87171;">Error: Generation timed out.</div>`;
            return;
          }

          try {
            const statusRes = await fetch(`${localAiUrl}/status/${jobId}`, {
              headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            const statusData = await statusRes.json();
            consecutiveErrors = 0;

            if (statusData.status === 'completed') {
              clearInterval(pollInterval);
              const videoUrl = `${localAiUrl}/video/${jobId}?ngrok-skip-browser-warning=true`;
              messageContent.innerHTML = `
                <div class="text-part">Here is your video: <strong>"${escapeHtml(promptText)}"</strong></div>
                <div style="margin-top: 10px;"><video src="${videoUrl}" controls style="max-width:100%; border-radius:8px; border:2px solid #334155;"></video></div>
              `;
            } else if (statusData.status === 'failed') {
              clearInterval(pollInterval);
              messageContent.innerHTML = `<div class="text-part" style="color: #f87171;">Error: ${escapeHtml(statusData.error)}</div>`;
            }
          } catch (pollErr) {
            console.error("Polling error:", pollErr);
            consecutiveErrors++;
            if (consecutiveErrors >= 10) {
              clearInterval(pollInterval);
              messageContent.innerHTML = `<div class="text-part" style="color: #f87171;">Connection lost after multiple retries.</div>`;
            }
          }
        }, 5000);

      } catch (err) {
        messageContent.innerHTML = `<div class="text-part" style="color: #f87171;">Error: ${escapeHtml(err.message)}</div>`;
      }
    }

    async function generateImage(promptText) {
      if (!promptText) { showToast('Please type a prompt.', 'error'); return; }
      var userDiv = appendMessage('user'); 
      userDiv.querySelector('.message-content').innerHTML = '<div class="text-part">' + escapeHtml(promptText) + '</div>';
      
      var assistantDiv = appendMessage('assistant');
      var messageContent = assistantDiv.querySelector('.message-content');
      messageContent.innerHTML = '<div class="text-part"><span class="typing-dot">●</span><span class="typing-dot">●</span><span class="typing-dot">●</span> Drawing...</div>';

      try {
        var idToken = await authUser.getIdToken();
        var res = await fetch('/api/generate-image', {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + idToken },
          body: JSON.stringify({ prompt: promptText })
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Image failed'); }
        const objectUrl = URL.createObjectURL(await res.blob());

        messageContent.innerHTML = `<div class="text-part">Here is your image: <strong>"${escapeHtml(promptText)}"</strong></div>
          <div style="margin-top: 10px;"><img src="${objectUrl}" style="max-width:100%; border-radius:8px; border:2px solid #334155;" /></div>
          <div style="margin-top: 10px; font-size: 12px;"><a href="${objectUrl}" target="_blank" style="color:#38bdf8;">Open Full Size ↗</a> | <a href="${objectUrl}" download="codewix.jpg" style="color:#38bdf8;">Download ⬇</a></div>`;
      } catch (err) { messageContent.innerHTML = `<div class="text-part" style="color: #f87171;">Error: ${escapeHtml(err.message)}</div>`; }
    }

    function handleSend() {
      var text = chatInput.value.trim();
      if (!text) return;
      
      if (videoGenToggle && videoGenToggle.checked) generateVideo(text);
      else if (imageGenToggle && imageGenToggle.checked) generateImage(text);
      else {
        // Basic chat fallback if neither toggle is on
        var userDiv = appendMessage('user');
        userDiv.querySelector('.message-content').innerHTML = '<div class="text-part">' + escapeHtml(text) + '</div>';
        var assistantDiv = appendMessage('assistant');
        assistantDiv.querySelector('.message-content').innerHTML = '<div class="text-part">Please turn on 🎨 Image Mode or 🎬 Video Mode to use the AI features.</div>';
      }
      
      chatInput.value = ''; 
      chatInput.style.height = 'auto';
    }

    sendBtn.addEventListener('click', handleSend);
    chatInput.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } });
  }

}); // end DOMContentLoaded
