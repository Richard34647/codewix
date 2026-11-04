// ==========================================================================
// CodeWix — script.js (Resilient Polling for Free Tunnels)
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
  function dataUrlToBlob(dataUrl) {
    var parts = dataUrl.split(',');
    var mimeMatch = parts[0].match(/:(.*?);/);
    var mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    var binary = atob(parts[1]);
    var array = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
    return new Blob([array], { type: mime });
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
  // Register
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

  // ======================================================================
  // Login
  // ======================================================================
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
  // Google Auth & Forgot Password
  // ======================================================================
  function handleGoogleAuth(buttonId, errBoxId) {
    if ($(buttonId)) {
      $(buttonId).addEventListener('click', function () {
        var errBox = $(errBoxId); hideError(errBox);
        if (!auth) { showError(errBox, 'Firebase not loaded.'); return; }
        var provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider)
          .then(function (result) {
            var user = result.user;
            if (!user.emailVerified) return auth.signOut().then(function () { showError(errBox, 'Please verify your Google email first.'); });
            window.location.href = 'dashboard.html';
          })
          .catch(function (error) { if (error.code !== 'auth/popup-closed-by-user') showError(errBox, error.message); });
      });
    }
  }
  handleGoogleAuth('googleLoginBtn', 'errorBox');
  handleGoogleAuth('googleRegisterBtn', 'errorBox');

  if ($('forgotForm')) {
    $('forgotForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var email = $('email').value.trim();
      var errBox = $('errorBox'), okBox = $('successBox');
      hideError(errBox); if (okBox) okBox.style.display = 'none';
      if (!auth) { showError(errBox, 'Firebase not loaded.'); return; }
      var submitBtn = $('forgotForm').querySelector('button[type="submit"]');
      var orig = submitBtn ? submitBtn.textContent : 'Send Reset Link';
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Sending…'; }

      auth.sendPasswordResetEmail(email, { url: window.location.origin + '/login.html?reset=success', handleCodeInApp: false })
        .then(function () { if (okBox) { okBox.textContent = 'If an account exists for ' + email + ', we sent a reset link.'; okBox.style.display = 'block'; } })
        .catch(function (err) { if (err.code === 'auth/user-not-found') { if (okBox) { okBox.textContent = 'If an account exists for ' + email + ', we sent a reset link.'; okBox.style.display = 'block'; } return; } showError(errBox, err.message); })
        .finally(function () { if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = orig; } });
    });
  }

  // ======================================================================
  // Sandbox IDE
  // ======================================================================
  var cm = null;
  var codeEditor = null;

  (function initCodeMirror() {
    var sourceEl = $('codeEditorSource');
    if (!sourceEl || typeof CodeMirror === 'undefined') return;
    cm = CodeMirror.fromTextArea(sourceEl, {
      theme: 'dracula', lineNumbers: true, mode: 'htmlmixed', indentUnit: 2, tabSize: 2,
      extraKeys: { 'Ctrl-Space': 'autocomplete', 'Tab': function (editor) { if (editor.somethingSelected()) editor.indentSelection('add'); else editor.replaceSelection('  '); } }
    });
    cm.on('inputRead', function (editor, change) { if (change.text && /[<>\/=.:"\-]/.test(change.text[0])) { if (!editor.state.completionActive) editor.showHint({ completeSingle: false }); } });
    codeEditor = {
      get value() { return cm.getValue(); }, set value(v) { cm.setValue(v == null ? '' : String(v)); },
      addEventListener: function (evt, fn) { if (evt === 'input' || evt === 'change') cm.on('change', function () { fn(); }); },
      focus: function () { cm.focus(); }, _cm: cm
    };
    window.__codewixSetEditorMode = function (filename) {
      if (!cm) return; var mode = 'htmlmixed'; var lower = (filename || '').toLowerCase();
      if (lower.endsWith('.css')) mode = 'css'; else if (lower.endsWith('.js')) mode = 'javascript';
      else if (lower.endsWith('.py')) mode = 'python'; else if (lower.endsWith('.cpp') || lower.endsWith('.c') || lower.endsWith('.java')) mode = 'text/x-c++src';
      else if (lower.endsWith('.go')) mode = 'go'; else if (lower.endsWith('.rs')) mode = 'rust'; else if (lower.endsWith('.php')) mode = 'php'; else if (lower.endsWith('.rb')) mode = 'ruby';
      cm.setOption('mode', mode);
    };
  })();

  // ⚠️ ABBREVIATED IN YOUR SOURCE — paste your existing IDE logic back here.
  // (file tree, save project, run code, livePreviewFrame wiring, etc.)
  var livePreviewFrame = $('livePreviewFrame');
  // ... [Insert full IDE logic here: file tree, save project, run code, etc.] ...

  // ======================================================================
  // AI Assistant (MULTIMODAL + STREAMING + MEDIA GENERATION)
  // ======================================================================
  var chatContainer      = $('chatContainer');
  var chatInput          = $('chatInput');
  var sendBtn            = $('sendBtn');
  var modelSelect        = $('modelSelect');
  var chatStatus         = $('chatStatus');
  var modelIndicator     = $('modelIndicator');
  var thinkingToggle     = $('thinkingToggle');
  var newChatBtn         = $('newChatBtn');
  var historyBtn         = $('historyBtn');
  var historyModal       = $('historyModal');
  var historyListBox     = $('historyListContainer');
  var closeHistoryBtn    = $('closeHistoryModalBtn');
  var chatTitleBar       = $('chatTitleBar');
  var currentChatTitleEl = $('currentChatTitle');

  if (chatContainer && chatInput && sendBtn) {
    console.log('[CodeWix] AI Assistant detected');

    if (navMenu && !isUserPremium && !isUserAdmin) {
      var upBtn = document.createElement('a');
      upBtn.href = 'upgrade.html';
      upBtn.id = 'upgradeNavBtn';
      upBtn.innerHTML = '⭐ Upgrade';
      upBtn.style.cssText = 'background:#fbbf24;color:#020617;padding:6px 12px;border-radius:6px;font-weight:bold;margin-left:10px;text-decoration:none;';
      navMenu.appendChild(upBtn);
    }

    var API_URL = '/api/chat';

    var attachInput = document.createElement('input');
    attachInput.type = 'file'; attachInput.id = 'chatAttachInput';
    attachInput.style.display = 'none'; attachInput.multiple = true;
    document.body.appendChild(attachInput);

    var attachBtn = document.createElement('button');
    attachBtn.id = 'chatAttachBtn'; attachBtn.type = 'button'; attachBtn.innerHTML = '📎';
    attachBtn.style.cssText = 'background:transparent;border:none;font-size:20px;cursor:pointer;padding:0 8px;color:#cbd5e1;';
    if (sendBtn.parentNode) sendBtn.parentNode.insertBefore(attachBtn, sendBtn);

    var attachPreview = document.createElement('div');
    attachPreview.id = 'chatAttachPreview';
    attachPreview.style.cssText = 'display:none;padding:8px;background:#0f172a;border-bottom:1px solid #334155;border-radius:8px 8px 0 0;display:flex;gap:8px;flex-wrap:wrap;';
    if (chatInput.parentNode) chatInput.parentNode.insertBefore(attachPreview, chatInput);

    var pendingAttachments = [];
    attachBtn.addEventListener('click', function() { attachInput.click(); });
    attachInput.addEventListener('change', async function() {
      var files = Array.from(this.files);
      for (var file of files) {
        if (file.type.startsWith('video/')) { showToast('Videos not supported here.', 'error'); continue; }
        if (file.size > 4 * 1024 * 1024) { showToast('Max 4MB', 'error'); continue; }
        var isImage = file.type.startsWith('image/');
        try {
          var data = isImage ? await resizeImage(file, 1024, 1024) : await readFileAsText(file);
          pendingAttachments.push({ name: file.name, type: isImage ? 'image' : 'text', data: data });
          renderAttachPreview();
        } catch (err) { showToast('Failed to read file', 'error'); }
      }
      this.value = '';
    });

    function renderAttachPreview() {
      attachPreview.innerHTML = '';
      if (pendingAttachments.length === 0) { attachPreview.style.display = 'none'; return; }
      attachPreview.style.display = 'flex';
      pendingAttachments.forEach(function(att, idx) {
        var chip = document.createElement('div');
        chip.style.cssText = 'display:flex;align-items:center;gap:4px;background:#1e293b;border:1px solid #334155;border-radius:16px;padding:4px 10px;font-size:12px;color:#f8fafc;';
        if (att.type === 'image') { var img = document.createElement('img'); img.src = att.data; img.style.cssText = 'width:24px;height:24px;object-fit:cover;border-radius:4px;'; chip.appendChild(img); }
        var nameSpan = document.createElement('span'); nameSpan.textContent = att.name; chip.appendChild(nameSpan);
        var removeBtn = document.createElement('button'); removeBtn.type = 'button'; removeBtn.innerHTML = '✕';
        removeBtn.style.cssText = 'background:none;border:none;color:#f87171;cursor:pointer;font-weight:bold;padding:0 4px;';
        removeBtn.onclick = function() { pendingAttachments.splice(idx, 1); renderAttachPreview(); };
        chip.appendChild(removeBtn);
        attachPreview.appendChild(chip);
      });
    }

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

    var upgradePopupHTML = `
      <div id="upgradePopupModal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(2,6,23,0.9); z-index:99999; justify-content:center; align-items:center; backdrop-filter:blur(5px);">
        <div style="background:#1e293b; border:2px solid #fbbf24; border-radius:16px; padding:40px; max-width:450px; text-align:center; box-shadow:0 20px 50px rgba(0,0,0,0.5);">
          <div style="font-size:50px; margin-bottom:10px;">🚀</div>
          <h2 style="color:#fbbf24; margin-bottom:15px;">Upgrade to Premium</h2>
          <p style="color:#cbd5e1; font-size:15px; line-height:1.6; margin-bottom:20px;">
            Unlock the full power of CodeWix AI!<br>
            Get <strong>10-second videos</strong> (instead of 5s), high-quality images, and unlimited intense coding assistance.
          </p>
          <a href="upgrade.html" class="button" style="display:block; width:100%; background:#fbbf24; color:#020617; padding:14px; border-radius:8px; font-weight:bold; text-decoration:none; margin-bottom:10px;">⭐ Upgrade for $5/month</a>
          <button onclick="document.getElementById('upgradePopupModal').style.display='none'" style="background:transparent; border:none; color:#94a3b8; cursor:pointer; font-size:14px;">Maybe later</button>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', upgradePopupHTML);
    window.showUpgradePopup = function() { document.getElementById('upgradePopupModal').style.display = 'flex'; };

    var SYSTEM_PROMPT = {
      role: 'system',
      content: 'You are the CodeWix AI Assistant. Help users learn to code, debug, and build projects. Tone: encouraging, never condescending. ALWAYS wrap code in triple-backticks.\n\nNOTE: You cannot generate images/videos directly. Tell them to use the "🎨 Image Mode" or "🎬 Video Mode" toggles!'
    };

    var conversation = [SYSTEM_PROMPT];
    var currentChatId = null, currentChatTitle = '', saveTimer = null, authUser = null, currentUserName = 'User';

    function getUsername() { if (authUser) { if (authUser.displayName) return authUser.displayName; if (authUser.email) return authUser.email.split('@')[0]; } return 'User'; }
    function chatsCollection() { return (!db || !authUser) ? null : db.collection('users').doc(authUser.uid).collection('chats'); }
    function updateTitleBar() { if (chatTitleBar && currentChatTitleEl) chatTitleBar.style.display = currentChatTitle ? 'flex' : 'none'; if(currentChatTitle) currentChatTitleEl.textContent = currentChatTitle; }
    function scheduleSave() { clearTimeout(saveTimer); saveTimer = setTimeout(saveChatNow, 700); }

    async function saveChatNow() {
      if (!authUser || !db) return;
      var msgs = conversation.filter(m => m.role !== 'system');
      if (!msgs.length) return;
      var col = chatsCollection(); if (!col) return;
      var firstUser = msgs.find(m => m.role === 'user');
      var title = currentChatTitle;
      if (!title && firstUser) {
        var textToUse = typeof firstUser.content === 'string' ? firstUser.content : (firstUser.content.find(c=>c.type==='text') || {text:'[Attachment]'}).text;
        title = textToUse.replace(/\s+/g, ' ').trim().substring(0, 48) + (textToUse.length > 48 ? '…' : '');
      }
      if (!title) title = 'New Chat';

      var sanitizedMsgs = msgs.map(m => {
        if (Array.isArray(m.content)) return { role: m.role, content: m.content.map(p => p.type === 'image_url' ? { type: 'text', text: '[Image]' } : p) };
        return m;
      });

      var payload = { title: title, messages: sanitizedMsgs, updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
      try {
        if (currentChatId) await col.doc(currentChatId).update(payload);
        else { payload.createdAt = firebase.firestore.FieldValue.serverTimestamp(); var ref = await col.add(payload); currentChatId = ref.id; }
        currentChatTitle = title; updateTitleBar();
      } catch (err) {}
    }

    function appendMessage(role) {
      var div = document.createElement('div');
      div.className = 'chat-message ' + (role === 'user' ? 'user-message' : 'assistant-message');
      div.innerHTML = '<div class="message-role">' + (role === 'user' ? 'You' : 'Assistant') + '</div><div class="message-content"></div>';
      chatContainer.appendChild(div); chatContainer.scrollTop = chatContainer.scrollHeight;
      return div;
    }

    function setUserMessage(div, content) {
      var html = '';
      if (typeof content === 'string') html = '<div class="text-part">' + escapeHtml(content).replace(/\n/g, '<br>') + '</div>';
      else if (Array.isArray(content)) {
        content.forEach(part => {
          if (part.type === 'text' && part.text.indexOf('--- File:') === -1) html += '<div class="text-part">' + escapeHtml(part.text).replace(/\n/g, '<br>') + '</div>';
          else if (part.type === 'image_url') html += '<div style="margin-top:8px;"><img src="' + part.image_url.url + '" style="max-width:200px;border-radius:8px;border:1px solid #334155;"/></div>';
        });
      }
      div.querySelector('.message-content').innerHTML = html;
    }

    function setAssistantMessage(div, content, reasoning) {
      var html = '';
      if (reasoning) html += '<details class="reasoning-section"><summary>Thinking</summary><div class="reasoning-content">' + escapeHtml(reasoning) + '</div></details>';
      var parts = String(content).split(/```/);
      for (var i = 0; i < parts.length; i++) {
        if (i % 2 === 0) {
          if (parts[i]) html += '<div class="text-part">' + escapeHtml(parts[i]).replace(/`([^`\n]+)`/g, '<code>$1</code>').replace(/\n/g, '<br>') + '</div>';
        } else {
          var body = parts[i], lang = 'code', filename = null, nl = body.indexOf('\n');
          if (nl !== -1) {
            var match = body.substring(0, nl).trim().match(/^([a-zA-Z0-9_-]+)(?:\s+(?:filename=["']?([^"'\s]+)["']?|([^"'\s]+)))?$/);
            if (match) { lang = match[1]; filename = match[2] || match[3]; body = body.substring(nl + 1); }
          }
          html += '<div class="code-block" data-lang="' + escapeHtml(lang) + '" ' + (filename ? 'data-filename="' + escapeHtml(filename) + '"' : '') + '>' +
            '<div class="code-header"><span class="code-lang">' + escapeHtml(filename || lang) + '</span><div class="code-actions">' +
            '<button type="button" class="publish-ai-btn">🚀 Publish</button><button type="button" class="send-to-editor-btn">⚡ Send to Editor</button>' +
            '<button type="button" class="download-code-btn">⬇</button><button type="button" class="copy-btn">Copy</button></div></div>' +
            '<pre><code>' + escapeHtml(body.replace(/\n$/, '')) + '</code></pre></div>';
        }
      }
      div.querySelector('.message-content').innerHTML = html;
    }

    function setLoading(l) {
      sendBtn.disabled = l; chatInput.disabled = l; attachBtn.disabled = l;
      sendBtn.textContent = l ? 'Thinking…' : 'Send';
    }

    if (auth) auth.onAuthStateChanged(user => {
      if (user) {
        authUser = user; currentUserName = getUsername();
        var col = chatsCollection(); if (!col) return;
        col.orderBy('updatedAt', 'desc').limit(1).get().then(snap => {
          if (snap.empty) {
            conversation = [SYSTEM_PROMPT];
            chatContainer.innerHTML = '<div class="chat-message assistant-message"><div class="message-role">Assistant</div><div class="message-content"><div class="text-part">Dear ' + escapeHtml(currentUserName) + ', hello! Ask me anything.</div></div></div>';
          } else {
            var doc = snap.docs[0]; currentChatId = doc.id; currentChatTitle = doc.data().title;
            conversation = [SYSTEM_PROMPT].concat(doc.data().messages || []);
            updateTitleBar(); chatContainer.innerHTML = '';
            conversation.filter(m => m.role !== 'system').forEach(m => {
              if (m.role === 'user') setUserMessage(appendMessage('user'), m.content);
              else setAssistantMessage(appendMessage('assistant'), m.content);
            });
          }
        });
      }
    });

    async function generateImage(promptText) {
      if (!promptText) { showToast('Please type a prompt.', 'error'); return; }
      var userDiv = appendMessage('user'); setUserMessage(userDiv, promptText);
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
        conversation.push({ role: 'user', content: promptText }, { role: 'assistant', content: `[Image]` }); scheduleSave();
      } catch (err) { messageContent.innerHTML = `<div class="text-part" style="color: #f87171;">Error: ${escapeHtml(err.message)}</div>`; }
    }

    async function generateVideo(promptText) {
      if (!promptText) { showToast('Please type a prompt.', 'error'); return; }

      var userDiv = appendMessage('user'); setUserMessage(userDiv, promptText);
      var assistantDiv = appendMessage('assistant');
      var messageContent = assistantDiv.querySelector('.message-content');
      messageContent.innerHTML = '<div class="text-part"><span class="typing-dot">●</span><span class="typing-dot">●</span><span class="typing-dot">●</span> Generating video (this takes a few minutes on CPU)...</div>';

      try {
        const configRes = await fetch('/api/config');
        const configData = await configRes.json();
        const localAiUrl = configData.localAiUrl;
        
        if (!localAiUrl) throw new Error('Local AI URL is not configured.');

        var res = await fetch(`${localAiUrl}/generate`, {
          method: 'POST', 
          headers: { 
            'Content-Type': 'application/json', 
            'Bypass-Tunnel-Reminder': 'true' 
          },
          body: JSON.stringify({ prompt: promptText })
        });

        const startData = await res.json();
        if (!res.ok) throw new Error(startData.error || 'Failed to start');
        const jobId = startData.job_id;

        let attempts = 0;
        let consecutiveErrors = 0; // NEW: Track consecutive errors
        const maxAttempts = 120;

        const pollInterval = setInterval(async () => {
          attempts++;
          if (attempts > maxAttempts) {
            clearInterval(pollInterval);
            messageContent.innerHTML = `<div class="text-part" style="color: #f87171;">Error: Generation timed out.</div>`;
            return;
          }

          try {
            const statusRes = await fetch(`${localAiUrl}/status/${jobId}`, {
              headers: { 'Bypass-Tunnel-Reminder': 'true' }
            });
            
            if (!statusRes.ok) throw new Error('Status fetch failed');
            const statusData = await statusRes.json();
            
            consecutiveErrors = 0; // Reset errors on success

            if (statusData.status === 'completed') {
              clearInterval(pollInterval);
              const videoUrl = `${localAiUrl}/video/${jobId}?Bypass-Tunnel-Reminder=true`;
              messageContent.innerHTML = `
                <div class="text-part">Here is your video: <strong>"${escapeHtml(promptText)}"</strong></div>
                <div style="margin-top: 10px;"><video src="${videoUrl}" controls style="max-width:100%; border-radius:8px; border:2px solid #334155;"></video></div>
              `;
              conversation.push({ role: 'user', content: promptText }, { role: 'assistant', content: `[Video]` }); scheduleSave();
            } else if (statusData.status === 'failed') {
              clearInterval(pollInterval);
              messageContent.innerHTML = `<div class="text-part" style="color: #f87171;">Error: ${escapeHtml(statusData.error)}</div>`;
            }
          } catch (pollErr) {
            console.error("Polling error:", pollErr);
            consecutiveErrors++;
            
            // Only give up if the tunnel fails 10 times IN A ROW
            if (consecutiveErrors >= 10) {
              clearInterval(pollInterval);
              messageContent.innerHTML = `<div class="text-part" style="color: #f87171;">Connection lost after multiple retries. The tunnel may have dropped.</div>`;
            }
          }
        }, 5000);

      } catch (err) {
        messageContent.innerHTML = `<div class="text-part" style="color: #f87171;">Error: ${escapeHtml(err.message)}</div>`;
      }
    }

    async function sendToGroq(userText) {
      var model = modelSelect ? modelSelect.value : 'openai/gpt-oss-120b';
      var hasImages = pendingAttachments.some(a => a.type === 'image');
      if (hasImages && !model.includes('vision')) {
        model = 'meta-llama/llama-4-scout-17b-16e-instruct';
        if (modelSelect) modelSelect.value = model;
      }

      var dynamicSystemPrompt = { role: 'system', content: SYSTEM_PROMPT.content + '\n\nBegin EVERY response with: "Dear ' + getUsername() + ', "' };
      if (conversation.length === 1 && chatContainer.querySelector('.assistant-message')) chatContainer.innerHTML = '';

      var userContentPayload = userText;
      if (pendingAttachments.length > 0) {
        userContentPayload = [{ type: 'text', text: userText }];
        pendingAttachments.forEach(att => {
          if (att.type === 'image') userContentPayload.push({ type: 'image_url', image_url: { url: att.data } });
          else userContentPayload[0].text += '\n\n--- File: ' + att.name + ' ---\n' + att.data;
        });
      }

      conversation.push({ role: 'user', content: userContentPayload });
      var userDiv = appendMessage('user'); setUserMessage(userDiv, userContentPayload); scheduleSave();
      pendingAttachments = []; renderAttachPreview();

      var assistantDiv = appendMessage('assistant');
      var messageContent = assistantDiv.querySelector('.message-content');
      messageContent.innerHTML = '<div class="text-part streaming-text"></div>';
      var textEl = messageContent.querySelector('.streaming-text');

      setLoading(true);

      try {
        var idToken = await authUser.getIdToken();
        var messagesToSend = hasImages
          ? conversation.filter(m => m.role !== 'system').map((m, i, arr) => i === arr.length - 1 ? { role: 'user', content: typeof m.content === 'string' ? dynamicSystemPrompt.content + '\n\n' + m.content : m.content.map(p => p.type === 'text' ? { type: 'text', text: dynamicSystemPrompt.content + '\n\n' + p.text } : p) } : m)
          : [dynamicSystemPrompt].concat(conversation.filter(m => m.role !== 'system'));

        var response = await fetch(API_URL, {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + idToken },
          body: JSON.stringify({ model: model, messages: messagesToSend, temperature: 0.7, max_completion_tokens: 2048 })
        });

        if (!response.ok) { let d; try { d = await response.json(); } catch(e){}; throw new Error(d?.error || 'HTTP ' + response.status); }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let reply = '', done = false, buffer = '';

        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            buffer += decoder.decode(value, { stream: true });
            let lines = buffer.split('\n'); buffer = lines.pop();
            for (let line of lines) {
              if (line.trim().startsWith('data: ')) {
                const dataStr = line.trim().slice(6);
                if (dataStr === '[DONE]') continue;
                try {
                  const delta = JSON.parse(dataStr).choices[0].delta;
                  if (delta && delta.content) {
                    reply += delta.content;
                    textEl.innerHTML = escapeHtml(reply).replace(/\n/g, '<br>');
                    chatContainer.scrollTop = chatContainer.scrollHeight;
                  }
                } catch (e) {}
              }
            }
          }
        }
        setAssistantMessage(assistantDiv, reply, '');
        conversation.push({ role: 'assistant', content: reply }); scheduleSave();
      } catch (err) {
        messageContent.innerHTML = `<div class="text-part" style="color:#f87171;">Error: ${escapeHtml(err.message)}</div>`;
        conversation.pop();
      } finally { setLoading(false); chatInput.focus(); }
    }

    function handleSend() {
      var text = chatInput.value.trim();
      if (!text && pendingAttachments.length === 0) return;
      
      if (videoGenToggle && videoGenToggle.checked) generateVideo(text);
      else if (imageGenToggle && imageGenToggle.checked) generateImage(text);
      else sendToGroq(text);
      
      chatInput.value = ''; chatInput.style.height = 'auto';
    }

    sendBtn.addEventListener('click', handleSend);
    chatInput.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } });
    chatInput.addEventListener('input', function () { chatInput.style.height = 'auto'; chatInput.style.height = Math.min(chatInput.scrollHeight, 140) + 'px'; });

    if (newChatBtn) newChatBtn.addEventListener('click', async function () {
      clearTimeout(saveTimer); await saveChatNow();
      currentChatId = null; currentChatTitle = ''; conversation = [SYSTEM_PROMPT];
      chatContainer.innerHTML = ''; updateTitleBar();
      pendingAttachments = []; renderAttachPreview();
      showToast('New chat');
    });
    // ... History modal logic ...
    if (modelSelect && modelIndicator) modelSelect.addEventListener('change', function () { modelIndicator.textContent = modelSelect.value; });
  }

  // ⚠️ ABBREVIATED IN YOUR SOURCE — paste your existing Learn, Explore,
  // Profile, Publish, Status logic back here.
  // ... (Keep your Learn, Explore, Profile, Publish, Status logic below here) ...

}); // end DOMContentLoaded
