// ==========================================================================
// CodeWix — app logic (classic script, no ES modules)
// Handles: Firebase auth, session guard, logout, register, login,
//          sandbox IDE, Groq AI assistant (via /api/chat on server.js)
// ==========================================================================

console.log('[CodeWix] script.js file evaluated');

window.addEventListener('DOMContentLoaded', function () {
  console.log('[CodeWix] DOMContentLoaded fired');

  // ======================================================================
  // 1. Firebase boot (compat SDK)
  // ======================================================================
  var auth = null;

  if (typeof firebase === 'undefined') {
    console.error('[CodeWix] firebase global is undefined. Missing compat SDK script tags?');
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
      console.log('[CodeWix] Firebase ready ✔');
    } catch (err) {
      console.error('[CodeWix] Firebase init failed:', err);
    }
  }

  // ======================================================================
  // 2. Helpers
  // ======================================================================
  function $(id) { return document.getElementById(id); }

  function showError(el, msg) {
    if (el) { el.textContent = msg; el.style.display = 'block'; }
    else { alert(msg); }
  }
  function hideError(el) { if (el) el.style.display = 'none'; }

  // ======================================================================
  // 3. Auth guard — only protects dashboard.html
  // ======================================================================
  var onDashboard = location.pathname.toLowerCase().indexOf('dashboard.html') !== -1;

  if (auth && onDashboard) {
    auth.onAuthStateChanged(function (user) {
      console.log('[CodeWix] auth state:', user ? user.email : 'signed out');
      if (!user) { location.replace('login.html'); return; }
      if ($('dashUser'))  $('dashUser').textContent  = user.email.split('@')[0];
      if ($('userEmail')) $('userEmail').textContent = user.email;
    });
  }

  // ======================================================================
  // 4. Logout
  // ======================================================================
  function logout(e) {
    if (e) e.preventDefault();
    if (!auth) { location.href = 'login.html'; return; }
    auth.signOut().then(function () { location.replace('login.html'); });
  }
  if ($('logoutBtn'))  $('logoutBtn').addEventListener('click', logout);
  if ($('logoutLink')) $('logoutLink').addEventListener('click', logout);

  // ======================================================================
  // 5. Register
  // ======================================================================
  if ($('registerForm')) {
    console.log('[CodeWix] register form detected');
    $('registerForm').addEventListener('submit', function (e) {
      e.preventDefault();
      console.log('[CodeWix] register submit');
      var email = $('email').value.trim();
      var password = $('password').value;
      var errBox = $('errorBox');
      hideError(errBox);
      if (!auth) { showError(errBox, 'Firebase not loaded.'); return; }
      auth.createUserWithEmailAndPassword(email, password)
        .then(function () {
          alert('Registration successful! Taking you to your dashboard…');
          location.href = 'dashboard.html';
        })
        .catch(function (err) {
          console.error('[CodeWix] register error:', err);
          showError(errBox, err.message);
        });
    });
  }

  // ======================================================================
  // 6. Login
  // ======================================================================
  if ($('loginForm')) {
    console.log('[CodeWix] login form detected');
    $('loginForm').addEventListener('submit', function (e) {
      e.preventDefault();
      console.log('[CodeWix] login submit');
      var email = $('email').value.trim();
      var password = $('password').value;
      var errBox = $('errorBox');
      hideError(errBox);
      if (!auth) { showError(errBox, 'Firebase not loaded.'); return; }
      auth.signInWithEmailAndPassword(email, password)
        .then(function () {
          alert('Login successful! Loading your workspace…');
          location.href = 'dashboard.html';
        })
        .catch(function (err) {
          console.error('[CodeWix] login error:', err);
          showError(errBox, 'Authentication failed: ' + err.message);
        });
    });
  }

  // ======================================================================
  // 7. Sandbox IDE (dashboard.html only)
  // ======================================================================
  var codeEditor       = $('codeEditor');
  var runCodeBtn       = $('runCodeBtn');
  var livePreviewFrame = $('livePreviewFrame');
  var currentFileLabel = $('currentFileLabel');
  var fileTreeList     = $('fileTreeList');
  var newFileBtn       = $('newFileBtn');
  var editorLineGutter = $('editorLineGutter');

  if (codeEditor || runCodeBtn || fileTreeList) {
    console.log('[CodeWix] IDE detected on this page');

    var files = {
      'index.html': '<h1>Hello World!</h1>\n<p>Edit me then click Build &amp; Run.</p>\n<button onclick="hi()">Click Me</button>\n<script>\nfunction hi(){ alert("Sandbox JS works!"); }\n<\/script>',
      'style.css':  'body{background:#0f172a;color:#38bdf8;text-align:center;padding-top:50px;font-family:sans-serif}h1{font-size:3rem}button{background:#34d399;border:none;padding:10px 20px;border-radius:4px;cursor:pointer;font-weight:bold}',
      'script.js':  'console.log("Sandbox script running.");'
    };
    var activeFile = 'index.html';

    function updateGutter() {
      if (!editorLineGutter || !codeEditor) return;
      var n = codeEditor.value.split('\n').length;
      var out = '';
      for (var i = 1; i <= n; i++) out += i + (i < n ? '\n' : '');
      editorLineGutter.textContent = out;
    }

    function renderPreview() {
      if (!livePreviewFrame) return;
      if (codeEditor) files[activeFile] = codeEditor.value;
      var html =
        '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>' +
        (files['style.css'] || '') +
        '</style></head><body>' +
        (files['index.html'] || '') +
        '<script>' + (files['script.js'] || '') + '<\/script>' +
        '</body></html>';
      livePreviewFrame.srcdoc = html;
      console.log('[CodeWix] preview rendered');
    }

    if (codeEditor) {
      codeEditor.value = files[activeFile];
      codeEditor.addEventListener('input', updateGutter);
      updateGutter();
    }

    if (runCodeBtn) {
      runCodeBtn.addEventListener('click', function () {
        console.log('[CodeWix] Build & Run clicked');
        renderPreview();
      });
    }

    renderPreview();

    if (fileTreeList) {
      fileTreeList.addEventListener('click', function (e) {
        var item = e.target.closest('.file-item');
        if (!item || !codeEditor) return;
        files[activeFile] = codeEditor.value;
        var all = document.querySelectorAll('.file-item');
        for (var i = 0; i < all.length; i++) all[i].classList.remove('active');
        item.classList.add('active');
        activeFile = item.getAttribute('data-filename');
        if (currentFileLabel) currentFileLabel.textContent = activeFile;
        codeEditor.value = files[activeFile] || '';
        updateGutter();
      });
    }

    if (newFileBtn && fileTreeList) {
      newFileBtn.addEventListener('click', function () {
        console.log('[CodeWix] New File clicked');
        var name = prompt('New filename (e.g. app.js):');
        if (!name) return;
        var clean = name.trim().toLowerCase();
        if (files[clean] !== undefined) { alert('File already exists.'); return; }
        files[clean] = '/* ' + clean + ' */\n';
        var li = document.createElement('li');
        li.className = 'file-item';
        li.setAttribute('data-filename', clean);
        var icon = '📄 ';
        if (clean.endsWith('.html')) icon = '🌐 ';
        if (clean.endsWith('.css'))  icon = '🎨 ';
        if (clean.endsWith('.js'))   icon = '⚡ ';
        li.textContent = icon + clean;
        fileTreeList.appendChild(li);
        li.click();
      });
    }
  }

  // ======================================================================
  // 8. AI Assistant (ai-assistant.html) — talks to /api/chat on server.js
  // ======================================================================
  var chatContainer  = $('chatContainer');
  var chatInput      = $('chatInput');
  var sendBtn        = $('sendBtn');
  var clearChatBtn   = $('clearChatBtn');
  var modelSelect    = $('modelSelect');
  var chatStatus     = $('chatStatus');
  var modelIndicator = $('modelIndicator');

  if (chatContainer && chatInput && sendBtn) {
    console.log('[CodeWix] AI Assistant detected');

    // Same-origin API. Works both on localhost and on Render.
    // If your front-end is served by server.js (recommended), this just works.
    var API_URL = '/api/chat';

    var conversation = [
      {
        role: 'system',
        content: 'You are the CodeWix AI Assistant. You help users learn to code, debug errors, and build projects. Keep answers concise and practical. When showing code, use fenced code blocks with the language name.'
      }
    ];

    function appendMessage(role, content) {
      var div = document.createElement('div');
      div.className = 'chat-message ' + (role === 'user' ? 'user-message' : 'assistant-message');
      div.innerHTML =
        '<div class="message-role">' + (role === 'user' ? 'You' : 'Assistant') + '</div>' +
        '<div class="message-content"></div>';
      div.querySelector('.message-content').textContent = content;
      chatContainer.appendChild(div);
      chatContainer.scrollTop = chatContainer.scrollHeight;
      return div;
    }

    function setStatus(msg) { if (chatStatus) chatStatus.textContent = msg; }

    function setLoading(loading) {
      sendBtn.disabled = loading;
      chatInput.disabled = loading;
      sendBtn.textContent = loading ? 'Thinking…' : 'Send';
    }

    async function sendToGroq(userText) {
      var model = modelSelect ? modelSelect.value : 'llama-3.3-70b-versatile';
      if (modelIndicator) modelIndicator.textContent = model;

      conversation.push({ role: 'user', content: userText });
      appendMessage('user', userText);

      var typingBubble = appendMessage('assistant', '');
      typingBubble.querySelector('.message-content').innerHTML =
        '<span class="typing-dot">●</span><span class="typing-dot">●</span><span class="typing-dot">●</span>';

      setLoading(true);
      setStatus('Thinking…');

      try {
        var response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: model,
            messages: conversation,
            temperature: 0.7,
            max_completion_tokens: 2048
          })
        });

        var data = await response.json();

        if (!response.ok) {
          var msg =
            (data && data.error && (data.error.message || data.error)) ||
            ('HTTP ' + response.status);
          throw new Error(msg);
        }

        var reply = data.choices &&
                    data.choices[0] &&
                    data.choices[0].message &&
                    data.choices[0].message.content;

        if (!reply) throw new Error('Empty response from server.');

        typingBubble.querySelector('.message-content').textContent = reply;
        conversation.push({ role: 'assistant', content: reply });
        setStatus('Ready' + (data.usage ? ' — ' + data.usage.total_tokens + ' tokens' : ''));

      } catch (err) {
        console.error('[CodeWix] chat error:', err);
        typingBubble.querySelector('.message-content').textContent =
          'Error: ' + err.message + '\n\nMake sure server.js is running and the page is loaded from the same origin.';
        conversation.pop();
        setStatus('Request failed');
      } finally {
        setLoading(false);
        chatContainer.scrollTop = chatContainer.scrollHeight;
        chatInput.focus();
      }
    }

    function handleSend() {
      var text = chatInput.value.trim();
      if (!text) return;
      chatInput.value = '';
      chatInput.style.height = 'auto';
      sendToGroq(text);
    }

    sendBtn.addEventListener('click', handleSend);

    chatInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    });

    chatInput.addEventListener('input', function () {
      chatInput.style.height = 'auto';
      chatInput.style.height = Math.min(chatInput.scrollHeight, 140) + 'px';
    });

    if (clearChatBtn) {
      clearChatBtn.addEventListener('click', function () {
        conversation = [conversation[0]];
        chatContainer.innerHTML = '';
        appendMessage('assistant', 'Chat cleared. What would you like to build?');
        setStatus('Ready');
      });
    }

    if (modelSelect && modelIndicator) {
      modelSelect.addEventListener('change', function () {
        modelIndicator.textContent = modelSelect.value;
      });
    }
  }
});