// ==========================================================================
// CodeWix — script.js (Full Master File with Admin & Lessons)
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
    t.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#1e293b;color:#fff;padding:12px 24px;border-radius:8px;z-index:99999;box-shadow:0 10px 20px rgba(0,0,0,0.5);border-left:4px solid ' + (type === 'error' ? '#ef4444' : '#38bdf8');
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 3000);
  }
  function formatDate(ts) {
    if (!ts) return '';
    var d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString();
  }
  function readFileAsText(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(reader.error); };
      reader.readAsText(file);
    });
  }

  var path = location.pathname.toLowerCase();
  var isAdminPage = path.includes('admin.html');
  var ADMIN_EMAIL = 'wilcoxr889@gmail.com';
  var isUserPremium = false;
  var isUserAdmin = false;

  // ======================================================================
  // THEME TOGGLE & ADMIN NAV BUTTON
  // ======================================================================
  var savedTheme = localStorage.getItem('codewix_theme');
  if (savedTheme === 'light') document.body.classList.add('light-mode');

  var navMenu = document.querySelector('nav') || document.querySelector('.studio-nav');
  if (navMenu && !isAdminPage) {
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
  }

  if (auth) {
    auth.onAuthStateChanged(async function(user) {
      if (!user) return;
      const tokenResult = await user.getIdTokenResult();
      isUserPremium = tokenResult.claims.premium === true;
      isUserAdmin = user.email === ADMIN_EMAIL;

      if (isUserAdmin && navMenu && !document.getElementById('adminNavBtn') && !isAdminPage) {
        var adminBtn = document.createElement('a');
        adminBtn.href = 'admin.html';
        adminBtn.id = 'adminNavBtn';
        adminBtn.innerHTML = '👑 Admin';
        adminBtn.style.cssText = 'background:#38bdf8;color:#020617;padding:6px 12px;border-radius:6px;font-weight:bold;margin-left:10px;text-decoration:none;';
        navMenu.appendChild(adminBtn);
      }
    });
  }

  // ======================================================================
  // PROTECTED ROUTES
  // ======================================================================
  var protectedPages = ['dashboard.html', 'ai-assistance.html', 'learn.html', 'publish.html', 'admin.html'];
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
      
      // Admin security check
      if (isAdminPage && user.email !== ADMIN_EMAIL) {
        location.replace('dashboard.html');
      }
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
  // ADMIN DASHBOARD LOGIC
  // ======================================================================
  if (isAdminPage) {
    document.querySelectorAll('.nav-btn[data-target]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
        
        e.target.classList.add('active');
        var targetId = e.target.getAttribute('data-target');
        $(targetId).classList.add('active');

        if (targetId === 'dashboard') loadStats();
        if (targetId === 'users') loadUsers();
        if (targetId === 'lessons') loadLessons();
      });
    });

    var getToken = async () => await auth.currentUser.getIdToken();

    var loadStats = async () => {
      try {
        const res = await fetch('/api/admin/stats', { headers: { 'Authorization': 'Bearer ' + await getToken() } });
        if (!res.ok) throw new Error('Failed to load stats');
        const data = await res.json();
        $('statUsers').textContent = data.totalUsers;
        $('statPremium').textContent = data.premiumUsers;
        $('statProjects').textContent = data.totalProjects;
        $('statLessons').textContent = data.totalLessons;
      } catch (err) { showToast(err.message, 'error'); }
    };

    var loadUsers = async () => {
      try {
        const res = await fetch('/api/admin/users', { headers: { 'Authorization': 'Bearer ' + await getToken() } });
        const data = await res.json();
        
        const tbody = $('adminUsersTable').querySelector('tbody');
        tbody.innerHTML = data.users.map(user => `
          <tr>
            <td>${escapeHtml(user.email)}</td>
            <td>${escapeHtml(user.displayName)}</td>
            <td><span class="badge ${user.premium ? 'premium' : 'free'}">${user.premium ? 'Premium' : 'Free'}</span></td>
            <td>
              <button class="btn btn-primary toggle-premium-btn" data-uid="${user.uid}">Toggle Pro</button>
              <button class="btn btn-danger delete-user-btn" data-uid="${user.uid}">Delete</button>
            </td>
          </tr>
        `).join('');
      } catch (err) { showToast(err.message, 'error'); }
    };

    var loadLessons = async () => {
      try {
        const res = await fetch('/api/lessons');
        const data = await res.json();
        
        const tbody = $('adminLessonsTable').querySelector('tbody');
        tbody.innerHTML = data.lessons.map(lesson => `
          <tr>
            <td>${escapeHtml(lesson.title)}</td>
            <td>${escapeHtml(lesson.difficulty)}</td>
            <td>${lesson.createdAt ? new Date(lesson.createdAt._seconds * 1000).toLocaleDateString() : 'Just now'}</td>
            <td><button class="btn btn-danger delete-lesson-btn" data-id="${lesson.id}">Delete</button></td>
          </tr>
        `).join('');
      } catch (err) { showToast(err.message, 'error'); }
    };

    document.addEventListener('click', async (e) => {
      if (e.target.classList.contains('toggle-premium-btn')) {
        const uid = e.target.getAttribute('data-uid');
        e.target.disabled = true;
        await fetch('/api/admin/update-user', {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + await getToken() },
          body: JSON.stringify({ uid, action: 'toggle-premium' })
        });
        loadUsers();
      }
      if (e.target.classList.contains('delete-user-btn')) {
        if(!confirm('Delete this user permanently?')) return;
        const uid = e.target.getAttribute('data-uid');
        e.target.disabled = true;
        await fetch('/api/admin/update-user', {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + await getToken() },
          body: JSON.stringify({ uid, action: 'delete' })
        });
        loadUsers();
      }
      if (e.target.classList.contains('delete-lesson-btn')) {
        if(!confirm('Delete this lesson?')) return;
        const id = e.target.getAttribute('data-id');
        e.target.disabled = true;
        await fetch('/api/admin/lessons/' + id, {
          method: 'DELETE', headers: { 'Authorization': 'Bearer ' + await getToken() }
        });
        loadLessons();
      }
    });

    if ($('saveLessonBtn')) {
      $('saveLessonBtn').addEventListener('click', async () => {
        const title = $('lessonTitle').value;
        const description = $('lessonDesc').value;
        const difficulty = $('lessonDiff').value;
        const content = $('lessonContent').value;

        if (!title || !content) return showToast('Title and Content are required.', 'error');

        $('saveLessonBtn').disabled = true;
        $('saveLessonBtn').textContent = 'Saving...';

        await fetch('/api/admin/lessons', {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + await getToken() },
          body: JSON.stringify({ title, description, difficulty, content })
        });

        $('lessonTitle').value = ''; $('lessonDesc').value = ''; $('lessonContent').value = '';
        $('saveLessonBtn').disabled = false;
        $('saveLessonBtn').textContent = 'Save Lesson';
        showToast('Lesson added successfully!');
        loadLessons();
      });
    }

    loadStats();
  }

  // ======================================================================
  // PUBLIC LEARN PAGE LOGIC
  // ======================================================================
  if ($('learnGrid')) {
    fetch('/api/lessons').then(r => r.json()).then(data => {
      if (data.lessons) {
        $('learnGrid').innerHTML = data.lessons.map(lesson => `
          <div class="lesson-card" style="background:#1e293b; padding:20px; border-radius:12px; margin-bottom:15px;">
            <h3 style="color:#38bdf8; margin-bottom:10px;">${escapeHtml(lesson.title)}</h3>
            <span style="background:#0f172a; padding:4px 8px; border-radius:4px; font-size:12px;">${escapeHtml(lesson.difficulty)}</span>
            <p style="color:#cbd5e1; margin:10px 0;">${escapeHtml(lesson.description || '')}</p>
            <button onclick="alert('Lesson content viewer coming soon!')" class="btn btn-primary">Read Lesson</button>
          </div>
        `).join('');
      }
    });
  }

  // ======================================================================
  // REGISTER & LOGIN
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
  // SANDBOX IDE
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

  var livePreviewFrame = $('livePreviewFrame');
  var files = { 'index.html': '<h1>Hello World</h1>', 'style.css': 'h1 { color: #38bdf8; }', 'script.js': 'console.log("Hello from CodeWix!");' };
  var currentFile = 'index.html';

  function updatePreview() {
    if (!livePreviewFrame) return;
    var html = files['index.html'] || '';
    var css = files['style.css'] || '';
    var js = files['script.js'] || '';
    var doc = livePreviewFrame.contentDocument || livePreviewFrame.contentWindow.document;
    doc.open();
    doc.write(`<html><head><style>${css}</style></head><body>${html}<script>${js}<\/script></body></html>`);
    doc.close();
  }

  function loadFile(filename) {
    currentFile = filename;
    if (codeEditor) codeEditor.value = files[filename] || '';
    if (window.__codewixSetEditorMode) window.__codewixSetEditorMode(filename);
    document.querySelectorAll('.file-item').forEach(el => el.classList.remove('active'));
    var activeEl = document.querySelector(`.file-item[data-file="${filename}"]`);
    if (activeEl) activeEl.classList.add('active');
  }

  if ($('runBtn')) $('runBtn').addEventListener('click', updatePreview);
  if ($('saveBtn')) $('saveBtn').addEventListener('click', () => {
    if (codeEditor) files[currentFile] = codeEditor.value;
    localStorage.setItem('codewix_files', JSON.stringify(files));
    showToast('Project saved!');
    updatePreview();
  });
  
  var savedFiles = localStorage.getItem('codewix_files');
  if (savedFiles) { try { files = JSON.parse(savedFiles); } catch(e){} }
  loadFile('index.html');
  updatePreview();

  // ======================================================================
  // AI ASSISTANT (CHAT & IMAGE)
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
    `;
    if (thinkingToggle && thinkingToggle.parentNode) thinkingToggle.parentNode.insertAdjacentHTML('beforeend', mediaTogglesHTML);
    var imageGenToggle = $('imageGenToggle');

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

    async function sendToGroq(userText) {
      var userDiv = appendMessage('user'); 
      userDiv.querySelector('.message-content').innerHTML = '<div class="text-part">' + escapeHtml(userText).replace(/\n/g, '<br>') + '</div>';
      
      var assistantDiv = appendMessage('assistant');
      var messageContent = assistantDiv.querySelector('.message-content');
      messageContent.innerHTML = '<div class="text-part streaming-text"></div>';
      var textEl = messageContent.querySelector('.streaming-text');

      sendBtn.disabled = true; chatInput.disabled = true; sendBtn.textContent = 'Thinking…';

      try {
        var idToken = await authUser.getIdToken();
        var response = await fetch('/api/chat', {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + idToken },
          body: JSON.stringify({ messages: [{ role: 'user', content: userText }], temperature: 0.7, max_completion_tokens: 2048 })
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
        // Simplified code block rendering for chat
        messageContent.innerHTML = '<div class="text-part">' + escapeHtml(reply).replace(/\n/g, '<br>').replace(/```([\s\S]*?)```/g, '<pre style="background:#0f172a;padding:10px;border-radius:4px;overflow-x:auto;"><code>$1</code></pre>') + '</div>';
      } catch (err) {
        messageContent.innerHTML = `<div class="text-part" style="color:#f87171;">Error: ${escapeHtml(err.message)}</div>`;
      } finally { 
        sendBtn.disabled = false; chatInput.disabled = false; sendBtn.textContent = 'Send'; chatInput.focus(); 
      }
    }

    function handleSend() {
      var text = chatInput.value.trim();
      if (!text) return;
      
      if (imageGenToggle && imageGenToggle.checked) generateImage(text);
      else sendToGroq(text);
      
      chatInput.value = ''; 
      chatInput.style.height = 'auto';
    }

    sendBtn.addEventListener('click', handleSend);
    chatInput.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } });
  }

  // ======================================================================
  // EXPLORE & PUBLISH PAGES
  // ======================================================================
  if ($('exploreGrid')) {
    fetch('/api/explore').then(r => r.json()).then(data => {
      if (data.sites) {
        $('exploreGrid').innerHTML = data.sites.map(site => `
          <div class="site-card" style="background:#1e293b; padding:20px; border-radius:12px; margin-bottom:15px;">
            <h3 style="color:#38bdf8;">${escapeHtml(site.projectName || site.slug)}</h3>
            <p style="color:#cbd5e1;">${escapeHtml(site.description || 'No description.')}</p>
            <a href="/s/${site.slug}" target="_blank" class="btn btn-primary" style="display:inline-block; margin-top:10px; text-decoration:none;">Visit Site</a>
          </div>
        `).join('');
      }
    });
  }

  if ($('publishForm')) {
    $('publishForm').addEventListener('submit', async function(e) {
      e.preventDefault();
      var btn = this.querySelector('button[type="submit"]');
      var orig = btn.textContent;
      btn.disabled = true; btn.textContent = 'Publishing...';
      
      try {
        var idToken = await authUser.getIdToken();
        var res = await fetch('/api/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + idToken },
          body: JSON.stringify({
            slug: $('publishSlug').value.trim(),
            projectName: $('publishName').value.trim(),
            description: $('publishDesc').value.trim(),
            files: JSON.parse(localStorage.getItem('codewix_files') || '{}')
          })
        });
        var data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to publish');
        showToast('Successfully published to ' + data.fullUrl);
        if ($('publishResult')) $('publishResult').innerHTML = `<a href="${data.url}" target="_blank">${data.fullUrl}</a>`;
      } catch (err) {
        showError($('publishError'), err.message);
      } finally {
        btn.disabled = false; btn.textContent = orig;
      }
    });
  }

}); // end DOMContentLoaded
