// ==========================================================================
// CodeWix — script.js (Full Master File with AI Streaming & Error Parsing)
// ==========================================================================

console.log('[CodeWix] script.js file evaluated');

window.addEventListener('DOMContentLoaded', function () {
  console.log('[CodeWix] DOMContentLoaded fired');

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
      console.log('[CodeWix] Firebase ready ✔ (firestore:', !!db, ')');
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
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
          var canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
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
  // THEME TOGGLE (DARK / LIGHT MODE)
  // ======================================================================
  var savedTheme = localStorage.getItem('codewix_theme');
  if (savedTheme === 'light') {
    document.body.classList.add('light-mode');
  }

  var navMenu = document.querySelector('nav') || document.querySelector('.studio-nav');
  if (navMenu) {
    var themeBtn = document.createElement('button');
    themeBtn.className = 'theme-toggle-btn';
    themeBtn.id = 'themeToggleBtn';
    themeBtn.title = 'Toggle Dark/Light Mode';
    themeBtn.innerHTML = document.body.classList.contains('light-mode') ? '🌙' : '☀️';
    
    themeBtn.addEventListener('click', function() {
      document.body.classList.toggle('light-mode');
      var isLight = document.body.classList.contains('light-mode');
      localStorage.setItem('codewix_theme', isLight ? 'light' : 'dark');
      themeBtn.innerHTML = isLight ? '🌙' : '☀️';
    });
    
    navMenu.appendChild(themeBtn);
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
  var protectedPages = ['dashboard.html', 'ai-assistant.html', 'learn.html', 'publish.html'];
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
  // Google Auth (Login & Register)
  // ======================================================================
  function handleGoogleAuth(buttonId, errBoxId) {
    if ($(buttonId)) {
      $(buttonId).addEventListener('click', function () {
        var errBox = $(errBoxId);
        hideError(errBox);
        
        if (!auth) { showError(errBox, 'Firebase not loaded.'); return; }

        var provider = new firebase.auth.GoogleAuthProvider();
        
        auth.signInWithPopup(provider)
          .then(function (result) {
            var user = result.user;
            if (!user.emailVerified) {
              return auth.signOut().then(function () {
                showError(errBox, 'Please verify your Google email before logging in.');
              });
            }
            window.location.href = 'dashboard.html';
          })
          .catch(function (error) {
            console.error('[Google Auth] Error:', error);
            if (error.code === 'auth/popup-closed-by-user') return;
            showError(errBox, error.message);
          });
      });
    }
  }

  handleGoogleAuth('googleLoginBtn', 'errorBox');
  handleGoogleAuth('googleRegisterBtn', 'errorBox');

  // ======================================================================
  // Forgot password
  // ======================================================================
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
        .then(function () {
          if (okBox) { okBox.textContent = 'If an account exists for ' + email + ', we sent a reset link.'; okBox.style.display = 'block'; }
        })
        .catch(function (err) {
          if (err.code === 'auth/user-not-found') {
            if (okBox) { okBox.textContent = 'If an account exists for ' + email + ', we sent a reset link.'; okBox.style.display = 'block'; }
            return;
          }
          showError(errBox, err.message);
        })
        .finally(function () { if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = orig; } });
    });
  }

  // ======================================================================
  // Sandbox IDE — CodeMirror + base64 uploads + Polyglot Runner
  // ======================================================================
  var cm = null;
  var codeEditor = null;

  (function initCodeMirror() {
    var sourceEl = $('codeEditorSource');
    if (!sourceEl || typeof CodeMirror === 'undefined') {
      console.warn('[CodeWix] CodeMirror not loaded — falling back.');
      if (sourceEl) {
        sourceEl.style.display = 'block';
        sourceEl.style.width = '100%';
        sourceEl.style.height = '100%';
        sourceEl.style.background = '#020617';
        sourceEl.style.color = '#e2e8f0';
        sourceEl.style.border = 'none';
        sourceEl.style.padding = '16px';
        sourceEl.style.fontFamily = "'Courier New', monospace";
        sourceEl.style.fontSize = '14px';
        codeEditor = {
          get value() { return sourceEl.value; },
          set value(v) { sourceEl.value = v == null ? '' : String(v); },
          addEventListener: function (t, fn) { if (t === 'input') sourceEl.addEventListener('input', fn); },
          focus: function () { sourceEl.focus(); }
        };
      }
      return;
    }

    cm = CodeMirror.fromTextArea(sourceEl, {
      theme: 'dracula',
      lineNumbers: true,
      lineWrapping: false,
      indentUnit: 2,
      tabSize: 2,
      indentWithTabs: false,
      smartIndent: true,
      autoCloseBrackets: true,
      autoCloseTags: true,
      matchBrackets: true,
      mode: 'htmlmixed',
      extraKeys: {
        'Ctrl-Space': 'autocomplete',
        'Cmd-Space': 'autocomplete',
        'Tab': function (editor) {
          if (editor.somethingSelected()) editor.indentSelection('add');
          else editor.replaceSelection('  ');
        }
      },
      hintOptions: { completeSingle: false, alignWithWord: true }
    });

    cm.on('inputRead', function (editor, change) {
      if (!change.text || !change.text[0]) return;
      var ch = change.text[0];
      if (/[<>\/=.:"\-]/.test(ch)) {
        if (!editor.state.completionActive) editor.showHint({ completeSingle: false });
        return;
      }
      var cursor = editor.getCursor();
      var line = editor.getLine(cursor.line);
      if (cursor.ch > 1 && /[a-zA-Z0-9_-]/.test(ch) && /\s/.test(line.charAt(cursor.ch - 2))) {
        if (!editor.state.completionActive) editor.showHint({ completeSingle: false });
      }
    });

    codeEditor = {
      get value() { return cm.getValue(); },
      set value(v) { cm.setValue(v == null ? '' : String(v)); },
      addEventListener: function (evt, fn) {
        if (evt === 'input' || evt === 'change') cm.on('change', function () { fn(); });
        else if (evt === 'focus') cm.on('focus', function () { fn(); });
        else if (evt === 'keydown') cm.getWrapperElement().addEventListener('keydown', fn);
        else if (evt === 'keyup') cm.getWrapperElement().addEventListener('keyup', fn);
      },
      focus: function () { cm.focus(); },
      _cm: cm
    };

    window.__codewixSetEditorMode = function (filename) {
      if (!cm) return;
      var mode = 'htmlmixed';
      var lower = (filename || '').toLowerCase();

      if (lower.endsWith('.css')) mode = 'css';
      else if (lower.endsWith('.js')) mode = 'javascript';
      else if (lower.endsWith('.py')) mode = 'python';
      else if (lower.endsWith('.c') || lower.endsWith('.cpp') || lower.endsWith('.java')) mode = 'text/x-c++src';
      else if (lower.endsWith('.go')) mode = 'go';
      else if (lower.endsWith('.rs')) mode = 'rust';
      else if (lower.endsWith('.php')) mode = 'php';
      else if (lower.endsWith('.rb')) mode = 'ruby';
      else if (lower.endsWith('.json')) mode = { name: 'javascript', json: true };
      else if (lower.endsWith('.xml')) mode = 'xml';
      else if (lower.endsWith('.md')) mode = 'markdown';

      cm.setOption('mode', mode);
      cm.setOption('hintOptions', { completeSingle: false, alignWithWord: true });
    };

    console.log('[CodeWix] CodeMirror initialized ✔');
  })();

  var runCodeBtn       = $('runCodeBtn');
  var livePreviewFrame = $('livePreviewFrame');
  var currentFileLabel = $('currentFileLabel');
  var fileTreeList     = $('fileTreeList');
  var newFileBtn       = $('newFileBtn');
  var uploadFileBtn    = $('uploadFileBtn');
  var hiddenFileInput  = $('hiddenFileInput');
  var fileContextMenu  = $('fileContextMenu');
  var unsavedIndicator = $('unsavedIndicator');
  var saveProjectBtn   = $('saveProjectBtn');
  var myProjectsBtn    = $('myProjectsBtn');
  var newProjectBtn    = $('newProjectBtn');
  var downloadFileBtn  = $('downloadFileBtn');
  var downloadZipBtn   = $('downloadZipBtn');
  var shareProjectBtn  = $('shareProjectBtn');
  var projectsModal    = $('projectsModal');
  var projectsListBox  = $('projectsListContainer');
  var closeModalBtn    = $('closeProjectsModalBtn');
  var projectStatusLbl = $('projectStatusLabel');

  // 👇 AUTO-INJECT RENAME BUTTON INTO THE DOM 👇
  var renameFileBtn = $('renameFileBtn');
  if (!renameFileBtn && newFileBtn) {
    renameFileBtn = document.createElement('button');
    renameFileBtn.id = 'renameFileBtn';
    renameFileBtn.className = newFileBtn.className || 'studio-btn ghost-btn';
    renameFileBtn.textContent = '✏️ Rename';
    renameFileBtn.style.marginLeft = '6px';
    renameFileBtn.style.marginRight = '6px';
    newFileBtn.parentNode.insertBefore(renameFileBtn, newFileBtn.nextSibling);
  }
  // 👆 AUTO-INJECT RENAME BUTTON INTO THE DOM 👆

  if (codeEditor || runCodeBtn || fileTreeList) {
    console.log('[CodeWix] IDE detected');

    var DEFAULT_FILES = {
      'index.html': '<h1>Hello World!</h1>\n<p>Edit me then click Build &amp; Run.</p>\n<button onclick="hi()">Click Me</button>\n<script>\nfunction hi(){ alert("Sandbox JS works!"); }\n<\/script>',
      'style.css':  'body{background:#0f172a;color:#38bdf8;text-align:center;padding-top:50px;font-family:sans-serif}h1{font-size:3rem}button{background:#34d399;border:none;padding:10px 20px;border-radius:4px;cursor:pointer;font-weight:bold}',
      'script.js':  'console.log("Sandbox script running.");'
    };

    var files = Object.assign({}, DEFAULT_FILES);
    var activeFile = 'index.html';
    var currentProjectId = null;
    var currentProjectName = null;
    var currentShareId = null;
    var lastSavedSnapshot = null;
    var contextTargetFile = null;

    function snapshot() { return JSON.stringify(files); }
    function markUnsaved() {
      if (!unsavedIndicator) return;
      unsavedIndicator.style.display = (lastSavedSnapshot !== snapshot()) ? 'inline' : 'none';
    }

    function isAsset(name) { return name.indexOf('asset:') === 0; }
    function assetDisplayName(name) { return name.substring(6); }

    function iconForFile(name) {
      if (isAsset(name)) {
        var lower = name.toLowerCase();
        if (lower.match(/\.(png|jpe?g|gif|webp|svg|bmp)$/)) return '🖼 ';
        if (lower.match(/\.(json|xml|yaml|yml)$/)) return '📋 ';
        if (lower.match(/\.(txt|md)$/)) return '📝 ';
        return '📎 ';
      }
      if (name.endsWith('.html')) return '🌐 ';
      if (name.endsWith('.css'))  return '🎨 ';
      if (name.endsWith('.js'))   return '⚡ ';
      if (name.endsWith('.py'))   return '🐍 ';
      if (name.endsWith('.cpp') || name.endsWith('.c')) return '⚙️ ';
      if (name.endsWith('.java')) return '☕ ';
      if (name.endsWith('.go'))   return '🐹 ';
      if (name.endsWith('.rs'))   return '🦀 ';
      if (name.endsWith('.php'))  return '🐘 ';
      return '📄 ';
    }

    function rebuildFileTree() {
      if (!fileTreeList) return;
      fileTreeList.innerHTML = '';
      Object.keys(files).forEach(function (name) {
        var li = document.createElement('li');
        li.className = 'file-item' + (name === activeFile ? ' active' : '') + (isAsset(name) ? ' asset-item' : '');
        li.setAttribute('data-filename', name);
        li.textContent = iconForFile(name) + (isAsset(name) ? assetDisplayName(name) : name);
        fileTreeList.appendChild(li);
      });
      if (currentFileLabel) {
        currentFileLabel.textContent = isAsset(activeFile) ? assetDisplayName(activeFile) : activeFile;
      }
    }

    function resolveAssets(html) {
      if (!html) return '';
      return html.replace(/(src|href)=(["'])([^"'\n]+)\2/gi, function (match, attr, quote, url) {
        if (/^(https?:|\/\/|#|data:|mailto:|tel:)/i.test(url)) return match;
        var key = 'asset:' + url;
        if (files[key]) return attr + '=' + quote + files[key] + quote;
        return match;
      });
    }

    function renderPreview() {
      if (!livePreviewFrame) return;
      if (codeEditor && !isAsset(activeFile)) files[activeFile] = codeEditor.value;
      var resolvedHtml = resolveAssets(files['index.html'] || '');
      livePreviewFrame.srcdoc =
        '<!DOCTYPE html><html><head><meta charset="UTF-8">' +
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
        '<style>' + (files['style.css'] || '') + '</style></head><body>' +
        resolvedHtml +
        '<script>' + (files['script.js'] || '') + '<\/script></body></html>';
    }

    function loadFilesIntoEditor(newFiles, projectId, projectName, shareId) {
      files = Object.assign({}, DEFAULT_FILES, newFiles || {});
      activeFile = 'index.html';
      currentProjectId = projectId || null;
      currentProjectName = projectName || null;
      currentShareId = shareId || null;
      lastSavedSnapshot = snapshot();
      if (codeEditor) codeEditor.value = files[activeFile];
      if (window.__codewixSetEditorMode) window.__codewixSetEditorMode(activeFile);
      rebuildFileTree();
      renderPreview();
      if (unsavedIndicator) unsavedIndicator.style.display = 'none';
      if (projectStatusLbl) projectStatusLbl.textContent = currentProjectName ? 'Project: ' + currentProjectName : 'No project loaded';
    }

    if (codeEditor) {
      codeEditor.value = files[activeFile];
      if (window.__codewixSetEditorMode) window.__codewixSetEditorMode(activeFile);
      lastSavedSnapshot = snapshot();
      codeEditor.addEventListener('input', function () {
        if (isAsset(activeFile)) return;
        files[activeFile] = codeEditor.value;
        markUnsaved();
      });
    }

    // Check for Remixed Project from localStorage
    var remixId = localStorage.getItem('codewix_remix_project_id');
    if (remixId && db && auth && auth.currentUser) {
      localStorage.removeItem('codewix_remix_project_id');
      db.collection('users').doc(auth.currentUser.uid).collection('projects').doc(remixId).get()
        .then(function(doc) {
          if (doc.exists) {
            var data = doc.data();
            loadFilesIntoEditor(data.files || {}, doc.id, data.name || 'Remix', null);
            showToast('Remix loaded successfully!', 'success');
          }
        })
        .catch(function(err) { console.error('[Remix Load Error]', err); });
    }

    if (runCodeBtn) {
      runCodeBtn.addEventListener('click', async function () {
        var ext = activeFile.split('.').pop().toLowerCase();
        var webLangs = ['html', 'css', 'js', 'htm'];
        
        if (webLangs.includes(ext)) {
          renderPreview();
          showToast('Preview refreshed');
          var term = $('terminalOutput');
          if (term) term.style.display = 'none';
          return;
        }

        if (!auth || !auth.currentUser) { showToast('Sign in first.', 'error'); return; }
        if (!codeEditor) return;

        var code = codeEditor.value;
        if (!code.trim()) { showToast('No code to run.', 'error'); return; }

        var outputContainer = $('terminalOutput');
        if (!outputContainer) {
          outputContainer = document.createElement('div');
          outputContainer.id = 'terminalOutput';
          outputContainer.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;background:#020617;color:#34d399;font-family:"Courier New",monospace;padding:16px;overflow:auto;z-index:100;white-space:pre-wrap;';
          var parent = livePreviewFrame ? livePreviewFrame.parentNode : null;
          if (parent) {
            parent.style.position = 'relative';
            parent.appendChild(outputContainer);
          }
        }
        
        outputContainer.style.display = 'block';
        outputContainer.textContent = 'Compiling and running ' + activeFile + '...\n\n';

        try {
          var idToken = await auth.currentUser.getIdToken();
          var res = await fetch('/api/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + idToken },
            body: JSON.stringify({ language: ext, code: code })
          });
          var data = await res.json();

          if (!res.ok) throw new Error(data.error || 'Execution failed');

          var finalOutput = data.output || '';
          
          if (!data.stderr && (finalOutput.toLowerCase().includes('<!doctype html') || finalOutput.toLowerCase().includes('<html'))) {
            if (livePreviewFrame) {
              livePreviewFrame.srcdoc = finalOutput;
            }
            outputContainer.style.display = 'none';
            showToast('Rendered Output in Preview', 'success');
            return;
          }

          if (data.stderr) finalOutput += '\n[Errors]:\n' + data.stderr;
          if (!finalOutput.trim()) finalOutput = '[Process finished with exit code ' + data.code + ']';

          outputContainer.textContent = '> Running ' + activeFile + '...\n\n' + finalOutput;
          
          var closeBtn = document.createElement('button');
          closeBtn.textContent = '✕ Close Terminal';
          closeBtn.style.cssText = 'position:absolute;top:10px;right:10px;background:#ef4444;color:white;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-weight:bold;font-size:12px;';
          closeBtn.onclick = function() { outputContainer.style.display = 'none'; };
          outputContainer.appendChild(closeBtn);

        } catch (err) {
          outputContainer.textContent = 'Error: ' + err.message;
        }
      });
    }

    if (!runCodeBtn && $('buildRunBtn')) {
      $('buildRunBtn').addEventListener('click', function(){ renderPreview(); showToast('Preview refreshed'); });
    }
    renderPreview();

    // ---- File tree clicks ---------------------------------------------
    if (fileTreeList) {
      fileTreeList.addEventListener('click', function (e) {
        var item = e.target.closest('.file-item');
        if (!item || !codeEditor) return;
        if (!isAsset(activeFile)) files[activeFile] = codeEditor.value;
        document.querySelectorAll('.file-item').forEach(function (el) { el.classList.remove('active'); });
        item.classList.add('active');
        activeFile = item.getAttribute('data-filename');
        if (currentFileLabel) {
          currentFileLabel.textContent = isAsset(activeFile) ? assetDisplayName(activeFile) : activeFile;
        }
        if (isAsset(activeFile)) {
          codeEditor.value = files[activeFile] + '\n\n<!-- This is an uploaded asset stored as base64. Use it in your HTML like: <img src="' + assetDisplayName(activeFile) + '"> -->';
          if (cm) cm.setOption('readOnly', true);
        } else {
          if (cm) cm.setOption('readOnly', false);
          codeEditor.value = files[activeFile] || '';
          if (window.__codewixSetEditorMode) window.__codewixSetEditorMode(activeFile);
        }
        if (cm) cm.focus();
        var term = $('terminalOutput');
        if (term) term.style.display = 'none';
      });

      fileTreeList.addEventListener('contextmenu', function (e) {
        var item = e.target.closest('.file-item');
        if (!item) return;
        e.preventDefault();
        contextTargetFile = item.getAttribute('data-filename');
        if (fileContextMenu) {
          fileContextMenu.style.left = e.pageX + 'px';
          fileContextMenu.style.top = e.pageY + 'px';
          fileContextMenu.style.display = 'block';
        }
      });
    }

    document.addEventListener('click', function (e) {
      if (fileContextMenu && !e.target.closest('#fileContextMenu')) {
        fileContextMenu.style.display = 'none';
      }
    });

    if (fileContextMenu) {
      fileContextMenu.addEventListener('click', function (e) {
        var btn = e.target.closest('button[data-action]');
        if (!btn || !contextTargetFile) return;
        var action = btn.getAttribute('data-action');
        var target = contextTargetFile;
        fileContextMenu.style.display = 'none';

        if (action === 'rename') {
          var newName = prompt('Rename "' + (isAsset(target) ? assetDisplayName(target) : target) + '" to:', isAsset(target) ? assetDisplayName(target) : target);
          if (!newName) return;
          newName = newName.trim().toLowerCase();
          if (!newName) return;
          var key = isAsset(target) ? 'asset:' + newName : newName;
          if (files[key] !== undefined) { alert('A file with that name already exists.'); return; }
          files[key] = files[target];
          delete files[target];
          if (activeFile === target) activeFile = key;
          rebuildFileTree();
          markUnsaved();
          renderPreview();
          showToast('Renamed');

        } else if (action === 'duplicate') {
          var base = isAsset(target) ? assetDisplayName(target) : target;
          var lastDot = base.lastIndexOf('.');
          var stem = lastDot > -1 ? base.substring(0, lastDot) : base;
          var ext  = lastDot > -1 ? base.substring(lastDot) : '';
          var copyName = stem + '-copy' + ext;
          var n = 2;
          while (files[isAsset(target) ? 'asset:' + copyName : copyName] !== undefined) {
            copyName = stem + '-copy-' + n + ext;
            n++;
          }
          var newKey = isAsset(target) ? 'asset:' + copyName : copyName;
          files[newKey] = files[target];
          rebuildFileTree();
          markUnsaved();
          showToast('Duplicated');

        } else if (action === 'download') {
          if (isAsset(target)) {
            try {
              var blob = dataUrlToBlob(files[target]);
              downloadBlob(blob, assetDisplayName(target));
              showToast('Downloaded ' + assetDisplayName(target), 'success');
            } catch (err) {
              showToast('Download failed: ' + err.message, 'error');
            }
          } else {
            downloadBlob(new Blob([files[target] || ''], { type: 'text/plain;charset=utf-8' }), target);
            showToast('Downloaded ' + target, 'success');
          }

        } else if (action === 'delete') {
          if (!confirm('Delete "' + (isAsset(target) ? assetDisplayName(target) : target) + '"?')) return;
          delete files[target];
          if (activeFile === target) {
            activeFile = Object.keys(files)[0] || 'index.html';
            if (codeEditor) codeEditor.value = files[activeFile] || '';
            if (window.__codewixSetEditorMode) window.__codewixSetEditorMode(activeFile);
          }
          rebuildFileTree();
          markUnsaved();
          renderPreview();
          showToast('Deleted');
        }
      });
    }

    if (newFileBtn) {
      newFileBtn.addEventListener('click', function () {
        var name = prompt('New filename (e.g. app.py, index.html):');
        if (!name) return;
        var clean = name.trim().toLowerCase();
        if (files[clean] !== undefined || files['asset:' + clean] !== undefined) { alert('File already exists.'); return; }
        files[clean] = '';
        rebuildFileTree();
        var li = fileTreeList.querySelector('[data-filename="' + clean + '"]');
        if (li) li.click();
        if (window.__codewixSetEditorMode) window.__codewixSetEditorMode(clean);
        markUnsaved();
      });
    }

    if (renameFileBtn) {
      renameFileBtn.addEventListener('click', function () {
        if (!activeFile) return;
        var currentName = isAsset(activeFile) ? assetDisplayName(activeFile) : activeFile;
        var newName = prompt('Rename "' + currentName + '" to:', currentName);
        if (!newName) return;
        newName = newName.trim().toLowerCase();
        if (!newName || newName === currentName) return;

        var key = isAsset(activeFile) ? 'asset:' + newName : newName;
        if (files[key] !== undefined) { alert('A file with that name already exists.'); return; }

        files[key] = files[activeFile];
        delete files[activeFile];
        activeFile = key;

        rebuildFileTree();
        markUnsaved();
        renderPreview();
        showToast('Renamed to ' + newName, 'success');
      });
    }

    if (uploadFileBtn && hiddenFileInput) {
      uploadFileBtn.addEventListener('click', function () {
        hiddenFileInput.click();
      });

      hiddenFileInput.addEventListener('change', async function () {
        var file = this.files && this.files[0];
        if (!file) return;

        if (!auth || !auth.currentUser) {
          showToast('Please sign in first.', 'error');
          this.value = '';
          return;
        }

        if (file.size > 300 * 1024) {
          showToast('File is too large. Maximum 300 KB.', 'error');
          this.value = '';
          return;
        }

        var currentSize = JSON.stringify(files).length;
        if (currentSize > 700 * 1024) {
          showToast('Project is getting too large. Delete unused files or start a new project.', 'error');
          this.value = '';
          return;
        }

        var safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]/g, '-');

        uploadFileBtn.disabled = true;
        var origText = uploadFileBtn.textContent;
        uploadFileBtn.textContent = '⏳';
        showToast('Processing…');

        try {
          var dataUrl = await readFileAsDataURL(file);
          files['asset:' + safeName] = dataUrl;
          rebuildFileTree();
          markUnsaved();
          renderPreview();
          showToast('Added ' + safeName, 'success');
        } catch (err) {
          console.error('[CodeWix] upload failed:', err);
          showToast('Failed: ' + err.message, 'error');
        } finally {
          uploadFileBtn.disabled = false;
          uploadFileBtn.textContent = origText;
          hiddenFileInput.value = '';
        }
      });
    }

    if (downloadFileBtn) {
      downloadFileBtn.addEventListener('click', function () {
        if (!codeEditor) return;
        if (isAsset(activeFile)) {
          try {
            var blob = dataUrlToBlob(files[activeFile]);
            downloadBlob(blob, assetDisplayName(activeFile));
            showToast('Downloaded ' + assetDisplayName(activeFile), 'success');
          } catch (err) {
            showToast('Download failed: ' + err.message, 'error');
          }
          return;
        }
        files[activeFile] = codeEditor.value;
        downloadBlob(new Blob([files[activeFile] || ''], { type: 'text/plain;charset=utf-8' }), activeFile);
        showToast('Downloaded ' + activeFile, 'success');
      });
    }

    if (downloadZipBtn) {
      downloadZipBtn.addEventListener('click', async function () {
        if (typeof JSZip === 'undefined') { alert('ZIP not loaded.'); return; }
        if (codeEditor && !isAsset(activeFile)) files[activeFile] = codeEditor.value;
        downloadZipBtn.disabled = true; downloadZipBtn.textContent = 'Zipping…';
        try {
          var zip = new JSZip();
          var assetFolder = zip.folder('assets');
          Object.keys(files).forEach(function (name) {
            if (isAsset(name)) {
              try {
                var blob = dataUrlToBlob(files[name]);
                assetFolder.file(assetDisplayName(name), blob, { binary: true });
              } catch (err) {
                assetFolder.file(assetDisplayName(name) + '.txt', '/* asset data was not readable */');
              }
            } else {
              zip.file(name, files[name] || '');
            }
          });
          var blob = await zip.generateAsync({ type: 'blob' });
          downloadBlob(blob, 'codewix-project.zip');
          showToast('ZIP downloaded', 'success');
        } catch (err) { showToast('ZIP failed: ' + err.message, 'error'); }
        finally { downloadZipBtn.disabled = false; downloadZipBtn.textContent = '📦 Download All'; }
      });
    }

    function projectsCollection() {
      if (!db || !auth || !auth.currentUser) return null;
      return db.collection('users').doc(auth.currentUser.uid).collection('projects');
    }

    function saveProject() {
      if (!codeEditor || !db || !auth || !auth.currentUser) { showToast('Not ready.', 'error'); return; }
      if (!isAsset(activeFile)) files[activeFile] = codeEditor.value;
      var name = currentProjectName;
      if (!name) {
        name = prompt('Name this project:', 'My Project');
        if (!name) return;
        name = name.trim(); if (!name) return;
      }
      saveProjectBtn.disabled = true; saveProjectBtn.textContent = 'Saving…';
      var payload = { name: name, files: files, activeFile: activeFile, updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
      var col = projectsCollection();
      var promise;
      if (currentProjectId) promise = col.doc(currentProjectId).update(payload);
      else { payload.createdAt = firebase.firestore.FieldValue.serverTimestamp(); promise = col.add(payload).then(function (ref) { currentProjectId = ref.id; }); }
      promise.then(function () {
        currentProjectName = name; lastSavedSnapshot = snapshot();
        if (unsavedIndicator) unsavedIndicator.style.display = 'none';
        if (projectStatusLbl) projectStatusLbl.textContent = 'Project: ' + name;
        showToast('Project saved ✔', 'success');
      }).catch(function (err) { showToast('Save failed: ' + err.message, 'error'); })
        .finally(function () { saveProjectBtn.disabled = false; saveProjectBtn.textContent = 'Save'; });
    }

    if (saveProjectBtn) saveProjectBtn.addEventListener('click', saveProject);

    async function shareProject() {
      if (!codeEditor || !db || !auth || !auth.currentUser) { showToast('Not ready.', 'error'); return; }
      if (!isAsset(activeFile)) files[activeFile] = codeEditor.value;
      if (lastSavedSnapshot !== snapshot() || !currentProjectId) {
        await new Promise(function (r) { saveProject(); setTimeout(r, 400); });
        if (!currentProjectId) return;
      }
      var shareId = currentShareId || currentProjectId;
      currentShareId = shareId;
      shareProjectBtn.disabled = true; shareProjectBtn.textContent = 'Sharing…';
      try {
        await db.collection('public').doc(shareId).set({
          name: currentProjectName || 'Untitled', files: files,
          sharedBy: auth.currentUser.uid, sharedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        await projectsCollection().doc(currentProjectId).update({ shareId: shareId });
        var url = location.origin + '/view.html?id=' + encodeURIComponent(shareId);
        try { await navigator.clipboard.writeText(url); showToast('Share link copied! 🔗', 'success'); }
        catch (e) { prompt('Copy this link:', url); }
      } catch (err) { showToast('Share failed: ' + err.message, 'error'); }
      finally { shareProjectBtn.disabled = false; shareProjectBtn.textContent = '🔗 Share'; }
    }
    if (shareProjectBtn) shareProjectBtn.addEventListener('click', shareProject);

    function openProjectsModal() {
      if (!projectsModal) return;
      projectsModal.style.display = 'flex';
      projectsListBox.innerHTML = '<p class="modal-empty">Loading…</p>';
      if (!db || !auth || !auth.currentUser) { projectsListBox.innerHTML = '<p class="modal-empty">Sign in first.</p>'; return; }
      projectsCollection().orderBy('updatedAt', 'desc').get()
        .then(function (snapshot) {
          projectsListBox.innerHTML = '';
          if (snapshot.empty) { projectsListBox.innerHTML = '<p class="modal-empty">No saved projects yet.</p>'; return; }
          snapshot.forEach(function (doc) {
            var data = doc.data() || {};
            var shareBtn = data.shareId ? '<button data-action="share" data-share="' + data.shareId + '">🔗 Link</button>' : '';
            var row = document.createElement('div');
            row.className = 'project-row';
            row.innerHTML =
              '<div class="project-info"><h3>' + escapeHtml(data.name || 'Untitled') + '</h3>' +
              '<p>Last saved: ' + formatDate(data.updatedAt) + '</p></div>' +
              '<div class="project-actions">' +
                '<button data-action="open" data-id="' + doc.id + '">Open</button>' + shareBtn +
                '<button data-action="download" data-id="' + doc.id + '">⬇ ZIP</button>' +
                '<button data-action="delete" data-id="' + doc.id + '" class="danger">Delete</button>' +
              '</div>';
            projectsListBox.appendChild(row);
          });
        })
        .catch(function (err) { projectsListBox.innerHTML = '<p class="modal-empty">Failed: ' + escapeHtml(err.message) + '</p>'; });
    }

    function closeProjectsModal() { if (projectsModal) projectsModal.style.display = 'none'; }

    if (myProjectsBtn) myProjectsBtn.addEventListener('click', openProjectsModal);
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeProjectsModal);
    if (projectsModal) projectsModal.addEventListener('click', function (e) { if (e.target === projectsModal) closeProjectsModal(); });

    if (projectsListBox) {
      projectsListBox.addEventListener('click', async function (e) {
        var btn = e.target.closest('button[data-action]'); if (!btn) return;
        var action = btn.getAttribute('data-action'), id = btn.getAttribute('data-id');
        if (action === 'open') {
          btn.disabled = true; btn.textContent = 'Opening…';
          try {
            var doc = await projectsCollection().doc(id).get();
            if (!doc.exists) { showToast('Not found.', 'error'); return; }
            var data = doc.data();
            loadFilesIntoEditor(data.files || {}, doc.id, data.name || 'Untitled', data.shareId || null);
            closeProjectsModal(); showToast('Loaded ✔', 'success');
          } catch (err) { showToast('Open failed: ' + err.message, 'error'); }
          finally { btn.disabled = false; btn.textContent = 'Open'; }
        } else if (action === 'share') {
          var shareId = btn.getAttribute('data-share');
          var url = location.origin + '/view.html?id=' + encodeURIComponent(shareId);
          try { await navigator.clipboard.writeText(url); showToast('Link copied! 🔗', 'success'); }
          catch (err) { prompt('Copy this link:', url); }
        } else if (action === 'download') {
          if (typeof JSZip === 'undefined') { showToast('ZIP missing.', 'error'); return; }
          btn.disabled = true; btn.textContent = 'Zipping…';
          try {
            var d = await projectsCollection().doc(id).get();
            if (!d.exists) { showToast('Not found.', 'error'); return; }
            var dd = d.data();
            var zip = new JSZip();
            var assetFolder = zip.folder('assets');
            Object.keys(dd.files || {}).forEach(function (name) {
              if (name.indexOf('asset:') === 0) {
                try {
                  var blob = dataUrlToBlob(dd.files[name]);
                  assetFolder.file(name.substring(6), blob, { binary: true });
                } catch (err) { /* skip */ }
              } else {
                zip.file(name, dd.files[name] || '');
              }
            });
            var blob2 = await zip.generateAsync({ type: 'blob' });
            var safe = (dd.name || 'project').replace(/[^a-z0-9-_]/gi, '_');
            downloadBlob(blob2, 'codewix-' + safe + '.zip');
          } catch (err) { showToast('ZIP failed: ' + err.message, 'error'); }
          finally { btn.disabled = false; btn.textContent = '⬇ ZIP'; }
        } else if (action === 'delete') {
          if (!confirm('Delete this project?')) return;
          projectsCollection().doc(id).delete()
            .then(function () { showToast('Deleted', 'success'); openProjectsModal(); })
            .catch(function (err) { showToast('Delete failed: ' + err.message, 'error'); });
        }
      });
    }

    if (newProjectBtn) {
      newProjectBtn.addEventListener('click', function () {
        if (lastSavedSnapshot !== snapshot()) {
          if (!confirm('Unsaved changes. Continue?')) return;
        }
        loadFilesIntoEditor(DEFAULT_FILES, null, null, null);
        showToast('New project');
      });
    }

    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); saveProject(); }
    });

    window.addEventListener('beforeunload', function (e) {
      if (lastSavedSnapshot !== null && lastSavedSnapshot !== snapshot()) { e.preventDefault(); e.returnValue = ''; }
    });

    var pending = null;
    try { pending = JSON.parse(localStorage.getItem('codewix_pending_snippet') || 'null'); } catch (e) {}
    if (pending && pending.code) {
      localStorage.removeItem('codewix_pending_snippet');
      var targetFile = null;
      if (pending.lang === 'html' && files['index.html'] !== undefined) targetFile = 'index.html';
      else if (pending.lang === 'css' && files['style.css'] !== undefined) targetFile = 'style.css';
      else if ((pending.lang === 'javascript' || pending.lang === 'js') && files['script.js'] !== undefined) targetFile = 'script.js';
      else { targetFile = 'snippet.' + extensionForLang(pending.lang); files[targetFile] = ''; rebuildFileTree(); }
      var existing = files[targetFile] || '';
      files[targetFile] = existing + (existing.trim() ? '\n\n' : '') + pending.code;
      activeFile = targetFile;
      if (codeEditor) codeEditor.value = files[activeFile];
      if (window.__codewixSetEditorMode) window.__codewixSetEditorMode(activeFile);
      rebuildFileTree(); markUnsaved(); renderPreview();
      showToast('AI snippet added to ' + targetFile, 'success');
    }
  }

  // ======================================================================
  // AI Assistant (MULTIMODAL + STREAMING)
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
    console.log('[CodeWix] AI Assistant detected (Multimodal enabled)');

    var API_URL = '/api/chat';

    var attachInput = document.createElement('input');
    attachInput.type = 'file';
    attachInput.id = 'chatAttachInput';
    attachInput.style.display = 'none';
    attachInput.multiple = true;
    document.body.appendChild(attachInput);

    var attachBtn = document.createElement('button');
    attachBtn.id = 'chatAttachBtn';
    attachBtn.type = 'button';
    attachBtn.innerHTML = '📎';
    attachBtn.title = 'Attach files or images';
    attachBtn.style.background = 'transparent';
    attachBtn.style.border = 'none';
    attachBtn.style.fontSize = '20px';
    attachBtn.style.cursor = 'pointer';
    attachBtn.style.padding = '0 8px';
    attachBtn.style.color = '#cbd5e1';

    if (sendBtn.parentNode) {
      sendBtn.parentNode.insertBefore(attachBtn, sendBtn);
    }

    var attachPreview = document.createElement('div');
    attachPreview.id = 'chatAttachPreview';
    attachPreview.style.display = 'none';
    attachPreview.style.padding = '8px';
    attachPreview.style.background = '#0f172a';
    attachPreview.style.borderBottom = '1px solid #334155';
    attachPreview.style.borderRadius = '8px 8px 0 0';
    attachPreview.style.display = 'flex';
    attachPreview.style.gap = '8px';
    attachPreview.style.flexWrap = 'wrap';

    if (chatInput.parentNode) {
      chatInput.parentNode.insertBefore(attachPreview, chatInput);
    }

    var pendingAttachments = [];

    attachBtn.addEventListener('click', function() {
      attachInput.click();
    });

    attachInput.addEventListener('change', async function() {
      var files = Array.from(this.files);
      if (!files.length) return;

      for (var file of files) {
        if (file.type.startsWith('video/')) {
          showToast('Videos are not supported. Please upload images or text files.', 'error');
          continue;
        }

        if (file.size > 4 * 1024 * 1024) {
          showToast('File too large (Max 4MB): ' + file.name, 'error');
          continue;
        }

        var isImage = file.type.startsWith('image/');
        try {
          var data = null;
          if (isImage) {
            data = await resizeImage(file, 1024, 1024);
          } else {
            data = await readFileAsText(file);
          }

          pendingAttachments.push({
            name: file.name,
            type: isImage ? 'image' : 'text',
            data: data
          });

          renderAttachPreview();
        } catch (err) {
          showToast('Failed to read ' + file.name, 'error');
        }
      }
      this.value = '';
    });

    function renderAttachPreview() {
      attachPreview.innerHTML = '';
      if (pendingAttachments.length === 0) {
        attachPreview.style.display = 'none';
        return;
      }
      attachPreview.style.display = 'flex';

      pendingAttachments.forEach(function(att, idx) {
        var chip = document.createElement('div');
        chip.style.display = 'flex';
        chip.style.alignItems = 'center';
        chip.style.gap = '4px';
        chip.style.background = '#1e293b';
        chip.style.border = '1px solid #334155';
        chip.style.borderRadius = '16px';
        chip.style.padding = '4px 10px';
        chip.style.fontSize = '12px';
        chip.style.color = '#f8fafc';

        if (att.type === 'image') {
          var img = document.createElement('img');
          img.src = att.data;
          img.style.width = '24px';
          img.style.height = '24px';
          img.style.objectFit = 'cover';
          img.style.borderRadius = '4px';
          chip.appendChild(img);
        }

        var nameSpan = document.createElement('span');
        nameSpan.textContent = att.name;
        chip.appendChild(nameSpan);

        var removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.innerHTML = '✕';
        removeBtn.style.background = 'none';
        removeBtn.style.border = 'none';
        removeBtn.style.color = '#f87171';
        removeBtn.style.cursor = 'pointer';
        removeBtn.style.fontWeight = 'bold';
        removeBtn.style.padding = '0 4px';
        removeBtn.onclick = function() {
          pendingAttachments.splice(idx, 1);
          renderAttachPreview();
        };
        chip.appendChild(removeBtn);

        attachPreview.appendChild(chip);
      });
    }

    var SYSTEM_PROMPT = {
      role: 'system',
      content: [
        'You are the CodeWix AI Assistant — the built-in AI helper for the CodeWix platform. Help users learn to code, debug errors, build projects. Keep answers concise and practical. ALWAYS wrap code in triple-backtick fenced blocks with the language name.',
        '',
        'CRITICAL INSTRUCTION FOR MULTI-FILE PROJECTS:',
        'When you provide multiple files, you MUST specify the filename on the SAME LINE as the opening backticks.',
        'Use RELATIVE links like <a href="about.html">About</a>.',
        'Example format:',
        '```html index.html',
        '<h1>Home</h1><a href="about.html">About</a>',
        '```',
        '```html about.html',
        '<h1>About Us</h1>',
        '```',
        'If you do not provide a filename, CodeWix will default to index.html, style.css, and script.js.',
        '',
        'Tone: encouraging, never condescending. Explain errors in plain English.'
      ].join('\n')
    };

    var conversation = [SYSTEM_PROMPT];
    var currentChatId = null;
    var currentChatTitle = '';
    var saveTimer = null;
    var authUser = null;
    var currentUserName = 'User';

    function getUsername() {
      if (auth && auth.currentUser) {
        if (auth.currentUser.displayName && auth.currentUser.displayName.trim() !== '') {
          return auth.currentUser.displayName.trim();
        }
        if (auth.currentUser.email) {
          return auth.currentUser.email.split('@')[0];
        }
      }
      return 'User';
    }

    function chatsCollection() {
      if (!db || !authUser) return null;
      return db.collection('users').doc(authUser.uid).collection('chats');
    }

    function updateTitleBar() {
      if (!chatTitleBar || !currentChatTitleEl) return;
      if (currentChatTitle) { chatTitleBar.style.display = 'flex'; currentChatTitleEl.textContent = currentChatTitle; }
      else chatTitleBar.style.display = 'none';
    }

    function scheduleSave() { clearTimeout(saveTimer); saveTimer = setTimeout(function () { saveChatNow(); }, 700); }

    async function saveChatNow() {
      if (!authUser || !db) return;
      var msgs = conversation.filter(function (m) { return m.role !== 'system'; });
      if (!msgs.length) return;
      var col = chatsCollection(); if (!col) return;
      var firstUser = msgs.find(function (m) { return m.role === 'user'; });
      var title = currentChatTitle;

      if (!title && firstUser) {
        var textToUse = typeof firstUser.content === 'string' ? firstUser.content : (firstUser.content.find(function(c){return c.type==='text';}) || {text:'[Attachment]'}).text;
        title = textToUse.replace(/\s+/g, ' ').trim().substring(0, 48);
        if (textToUse.length > 48) title += '…';
      }
      if (!title) title = 'New Chat';

      var sanitizedMsgs = msgs.map(function(m) {
        if (typeof m.content === 'object' && Array.isArray(m.content)) {
          var newContent = m.content.map(function(part) {
            if (part.type === 'image_url') {
              return { type: 'text', text: '[Image Attachment]' };
            }
            return part;
          });
          return { role: m.role, content: newContent };
        }
        return m;
      });

      var payload = { title: title, messages: sanitizedMsgs, updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
      try {
        if (currentChatId) await col.doc(currentChatId).update(payload);
        else { payload.createdAt = firebase.firestore.FieldValue.serverTimestamp(); var ref = await col.add(payload); currentChatId = ref.id; }
        currentChatTitle = title; updateTitleBar();
      } catch (err) { console.warn('[CodeWix] chat save failed:', err); }
    }

    function renderConversation() {
      chatContainer.innerHTML = '';
      conversation.forEach(function (m) {
        if (m.role === 'user') { var d = appendMessage('user'); setUserMessage(d, m.content); }
        else if (m.role === 'assistant') { var d2 = appendMessage('assistant'); setAssistantMessage(d2, m.content, ''); }
      });
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    function loadChat(id, data) {
      currentChatId = id || null;
      currentChatTitle = (data && data.title) || '';
      var saved = (data && data.messages) || [];
      conversation = [SYSTEM_PROMPT].concat(saved);
      updateTitleBar();
      if (saved.length) renderConversation(); else showWelcome();
    }

    function startNewChat() {
      currentChatId = null; currentChatTitle = '';
      conversation = [SYSTEM_PROMPT];
      updateTitleBar(); showWelcome(); chatInput.focus();
    }

    function showWelcome() {
      chatContainer.innerHTML =
        '<div class="chat-message assistant-message">' +
          '<div class="message-role">Assistant</div>' +
          '<div class="message-content"><div class="text-part">Dear ' + escapeHtml(currentUserName) + ', hello! I\'m your CodeWix AI Assistant. You can now attach images or code files for me to review. Ask me anything!</div></div>' +
        '</div>';
    }

    function onUserReady(user) {
      authUser = user;
      currentUserName = getUsername();

      var col = chatsCollection(); if (!col) { startNewChat(); return; }
      col.orderBy('updatedAt', 'desc').limit(1).get()
        .then(function (snap) {
          if (snap.empty) startNewChat();
          else {
            var doc = snap.docs[0];
            loadChat(doc.id, doc.data());
            setStatus('Loaded previous conversation');
            if (!doc.data().messages || doc.data().messages.length === 0) {
              showWelcome();
            }
          }
        })
        .catch(function () { startNewChat(); });
    }

    if (auth) auth.onAuthStateChanged(function (user) { if (user) onUserReady(user); });

    function renderContent(text) {
      var parts = String(text).split(/```/);
      var html = '';
      var blockCount = 0;
      for (var b = 1; b < parts.length; b += 2) {
        if (parts[b] && parts[b].trim()) blockCount++;
      }

      for (var i = 0; i < parts.length; i++) {
        if (i % 2 === 0) {
          var chunk = parts[i]; if (!chunk) continue;
          var escaped = escapeHtml(chunk).replace(/`([^`\n]+)`/g, '<code>$1</code>');
          html += '<div class="text-part">' + escaped.replace(/\n/g, '<br>') + '</div>';
        } else {
          var body = parts[i], lang = 'code', filename = null, nl = body.indexOf('\n');

          if (nl !== -1) {
            var firstLine = body.substring(0, nl).trim();
            var match = firstLine.match(/^([a-zA-Z0-9_-]+)(?:\s+(?:filename=["']?([^"'\s]+)["']?|([^"'\s]+)))?$/);
            if (match) {
              lang = match[1];
              if (match[2]) filename = match[2];
              else if (match[3]) filename = match[3];
              body = body.substring(nl + 1);
            }
          }
          body = body.replace(/\n$/, '');
          var publishLabel = blockCount > 1 ? '🚀 Publish All' : '🚀 Publish';
          var displayTitle = filename ? filename : lang;

          html +=
            '<div class="code-block" data-lang="' + escapeHtml(lang) + '" ' + (filename ? 'data-filename="' + escapeHtml(filename) + '"' : '') + '>' +
              '<div class="code-header">' +
                '<span class="code-lang">' + escapeHtml(displayTitle) + '</span>' +
                '<div class="code-actions">' +
                  '<button type="button" class="publish-ai-btn">' + publishLabel + '</button>' +
                  '<button type="button" class="send-to-editor-btn">⚡ Send to Editor</button>' +
                  '<button type="button" class="download-code-btn">⬇</button>' +
                  '<button type="button" class="copy-btn">Copy</button>' +
                '</div>' +
              '</div>' +
              '<pre><code>' + escapeHtml(body) + '</code></pre>' +
            '</div>';
        }
      }
      return html;
    }

    function appendMessage(role) {
      var div = document.createElement('div');
      div.className = 'chat-message ' + (role === 'user' ? 'user-message' : 'assistant-message');
      div.innerHTML = '<div class="message-role">' + (role === 'user' ? 'You' : 'Assistant') + '</div>' +
                      '<div class="message-content"></div>';
      chatContainer.appendChild(div);
      chatContainer.scrollTop = chatContainer.scrollHeight;
      return div;
    }

    function setUserMessage(div, content) {
      var container = div.querySelector('.message-content');
      var html = '';

      if (typeof content === 'string') {
        html = '<div class="text-part">' + escapeHtml(content).replace(/\n/g, '<br>') + '</div>';
      } else if (Array.isArray(content)) {
        content.forEach(function(part) {
          if (part.type === 'text') {
            if (part.text.indexOf('--- File:') === -1) {
               html += '<div class="text-part">' + escapeHtml(part.text).replace(/\n/g, '<br>') + '</div>';
            }
          } else if (part.type === 'image_url') {
            html += '<div style="margin-top:8px;"><img src="' + part.image_url.url + '" style="max-width:200px;border-radius:8px;border:1px solid #334155;"/></div>';
          }
        });
      }
      container.innerHTML = html;
    }

    function setAssistantMessage(div, content, reasoning) {
      var container = div.querySelector('.message-content');
      var html = '';
      if (reasoning) {
        html += '<details class="reasoning-section"><summary>Thinking process</summary><div class="reasoning-content">' + escapeHtml(reasoning) + '</div></details>';
      }
      html += renderContent(content);
      container.innerHTML = html;
    }

    function setStatus(msg) { if (chatStatus) chatStatus.textContent = msg; }
    function setLoading(l) {
      sendBtn.disabled = l;
      chatInput.disabled = l;
      attachBtn.disabled = l;
      sendBtn.textContent = l ? 'Thinking…' : 'Send';
    }

    async function publishAICode(clickedBtn) {
      if (!authUser) { showToast('Sign in first.', 'error'); return; }
      if (!authUser.emailVerified) { showToast('Verify your email first.', 'error'); return; }
      if (!db) { showToast('Database not ready.', 'error'); return; }

      var messageContent = clickedBtn.closest('.message-content');
      if (!messageContent) return;
      var blocks = messageContent.querySelectorAll('.code-block');
      if (!blocks.length) { showToast('No code found.', 'error'); return; }

      var filesObj = {};
      var usedNames = {};
      var defaultNames = { 'html': 'index.html', 'xml': 'index.html', 'css': 'style.css', 'javascript': 'script.js', 'js': 'script.js' };

      blocks.forEach(function (block) {
        var lang = (block.getAttribute('data-lang') || 'code').toLowerCase();
        var dataFilename = block.getAttribute('data-filename');
        var codeEl = block.querySelector('code');
        if (!codeEl) return;
        var code = codeEl.textContent;
        if (!code.trim()) return;

        var filename = dataFilename || defaultNames[lang];
        if (!filename) filename = 'snippet.' + extensionForLang(lang);

        if (usedNames[filename]) {
          var lastDot = filename.lastIndexOf('.');
          var base = filename.substring(0, lastDot);
          var ext = filename.substring(lastDot);
          var n = 2;
          while (usedNames[base + '-' + n + ext]) n++;
          filename = base + '-' + n + ext;
        }
        usedNames[filename] = true;
        filesObj[filename] = code;
      });

      if (!Object.keys(filesObj).length) { showToast('No code to publish.', 'error'); return; }

      var origText = clickedBtn.textContent;
      clickedBtn.disabled = true; clickedBtn.textContent = 'Saving…';

      var projectName = 'AI Project';
      var htmlContent = filesObj['index.html'] || '';
      var titleMatch = htmlContent.match(/<title[^>]*>([^<]+)<\/title>/i);
      var h1Match = htmlContent.match(/<h1[^>]*>([^<]+)<\/h1>/i);
      if (titleMatch && titleMatch[1].trim()) projectName = titleMatch[1].trim();
      else if (h1Match && h1Match[1].trim()) projectName = h1Match[1].trim();
      else projectName = 'AI Project — ' + new Date().toLocaleDateString();

      try {
        var activeFirst = Object.keys(filesObj)[0];
        var payload = {
          name: projectName, files: filesObj, activeFile: activeFirst,
          fromAI: true,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        var ref = await db.collection('users').doc(authUser.uid).collection('projects').add(payload);
        clickedBtn.textContent = '✓ Saved';
        showToast('Project saved. Opening publish page…', 'success');
        setTimeout(function () { location.href = 'publish.html?project=' + encodeURIComponent(ref.id); }, 600);
      } catch (err) {
        console.error('[CodeWix] publish AI code failed:', err);
        showToast('Save failed: ' + err.message, 'error');
        clickedBtn.disabled = false; clickedBtn.textContent = origText;
      }
    }

    chatContainer.addEventListener('click', function (e) {
      var pubBtn = e.target.closest('.publish-ai-btn');
      if (pubBtn) { publishAICode(pubBtn); return; }

      var sendBtn2 = e.target.closest('.send-to-editor-btn');
      if (sendBtn2) {
        var block = sendBtn2.closest('.code-block'); if (!block) return;
        var codeEl = block.querySelector('code'); if (!codeEl) return;
        var lang = block.getAttribute('data-lang') || 'code';
        try {
          localStorage.setItem('codewix_pending_snippet', JSON.stringify({ lang: lang, code: codeEl.textContent }));
          sendBtn2.textContent = '✓ Sent';
          showToast('Navigating to editor…', 'success');
          setTimeout(function () { location.href = 'dashboard.html'; }, 600);
        } catch (err) { showToast('Failed: ' + err.message, 'error'); }
        return;
      }

      var dlBtn = e.target.closest('.download-code-btn');
      if (dlBtn) {
        var blk = dlBtn.closest('.code-block'); if (!blk) return;
        var cEl = blk.querySelector('code'); if (!cEl) return;
        var l = blk.getAttribute('data-lang') || 'code';
        var ext = extensionForLang(l);
        downloadBlob(new Blob([cEl.textContent], { type: 'text/plain;charset=utf-8' }), 'codewix-snippet-' + Date.now() + '.' + ext);
        dlBtn.textContent = '✓'; setTimeout(function () { dlBtn.textContent = '⬇'; }, 1500);
        return;
      }

      var btn = e.target.closest('.copy-btn'); if (!btn) return;
      var blk2 = btn.closest('.code-block'); if (!blk2) return;
      var cEl2 = blk2.querySelector('code'); if (!cEl2) return;
      var txt = cEl2.textContent;
      function flash() { btn.textContent = 'Copied!'; btn.classList.add('copied'); setTimeout(function () { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 1500); }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(flash).catch(fb);
      else fb();
      function fb() { var ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); flash(); } catch (e) {} document.body.removeChild(ta); }
    });

    async function sendToGroq(userText) {
      var model = modelSelect ? modelSelect.value : 'openai/gpt-oss-120b';
      var showThinking = thinkingToggle ? thinkingToggle.checked : false;

      if (!authUser) {
        showToast('Sign in first.', 'error');
        return;
      }

      var hasImages = pendingAttachments.some(function(a) { return a.type === 'image'; });

      if (hasImages && !model.includes('vision')) {
        model = 'meta-llama/llama-4-scout-17b-16e-instruct';
        if (modelSelect) modelSelect.value = model;
        if (modelIndicator) modelIndicator.textContent = model;
        showToast('Switched to vision model for image analysis', 'success');
      }

      if (modelIndicator) modelIndicator.textContent = model;
      currentUserName = getUsername();

      var dynamicSystemPrompt = {
        role: 'system',
        content: SYSTEM_PROMPT.content + '\n\n[CRITICAL INSTRUCTION] The user you are speaking to is named "' + currentUserName + '". You MUST begin EVERY response with the exact phrase: "Dear ' + currentUserName + ', ". Do not say "Hello I am your CodeWix AI". Just say "Dear ' + currentUserName + ', " and then answer the question.'
      };

      if (conversation.length === 1 && chatContainer.querySelector('.assistant-message')) chatContainer.innerHTML = '';

      var userContentPayload = userText;
      if (pendingAttachments.length > 0) {
        userContentPayload = [{ type: 'text', text: userText }];
        pendingAttachments.forEach(function(att) {
          if (att.type === 'image') {
            userContentPayload.push({ type: 'image_url', image_url: { url: att.data } });
          } else {
            userContentPayload[0].text += '\n\n--- File: ' + att.name + ' ---\n' + att.data + '\n--- End File ---';
          }
        });
      }

      conversation.push({ role: 'user', content: userContentPayload });

      var userDiv = appendMessage('user');
      setUserMessage(userDiv, userContentPayload);
      scheduleSave();

      pendingAttachments = [];
      renderAttachPreview();

      var assistantDiv = appendMessage('assistant');
      
      // Create a streaming container
      var messageContent = assistantDiv.querySelector('.message-content');
      messageContent.innerHTML = '<div class="text-part streaming-text"></div>';
      var textEl = messageContent.querySelector('.streaming-text');

      setLoading(true); setStatus(showThinking ? 'Thinking…' : 'Generating…');

      try {
        var idToken = await authUser.getIdToken();

        var messagesToSend;
        if (hasImages) {
          var historyWithoutSystem = conversation.filter(function(m) { return m.role !== 'system'; });
          messagesToSend = historyWithoutSystem.map(function(m, index) {
            if (index === historyWithoutSystem.length - 1 && m.role === 'user') {
              if (typeof m.content === 'string') {
                return { role: 'user', content: dynamicSystemPrompt.content + '\n\n' + m.content };
              } else if (Array.isArray(m.content)) {
                var newContent = m.content.map(function(part) {
                  if (part.type === 'text') {
                    return { type: 'text', text: dynamicSystemPrompt.content + '\n\n' + part.text };
                  }
                  return part;
                });
                return { role: 'user', content: newContent };
              }
            }
            return m;
          });
        } else {
          messagesToSend = [dynamicSystemPrompt].concat(
            conversation.filter(function(m) { return m.role !== 'system'; })
          );
        }

        var payload = {
          model: model,
          messages: messagesToSend,
          temperature: 0.7,
          max_completion_tokens: 2048
        };
        if (showThinking && !model.includes('vision')) payload.reasoning_effort = 'medium';

        var response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + idToken },
          body: JSON.stringify(payload)
        });

        if (response.status === 429) {
          let errMsg = 'Daily limit reached.';
          try { const d = await response.json(); errMsg = d.error || errMsg; } catch(e) {}
          messageContent.innerHTML = '<div class="text-part" style="color:#fbbf24;">⚠️ ' + escapeHtml(errMsg) + '</div>';
          conversation.pop(); setStatus('Limit reached'); setLoading(false); return;
        }
        if (response.status === 401) {
          messageContent.innerHTML = '<div class="text-part" style="color:#f87171;">Session expired. Please refresh.</div>';
          conversation.pop(); setStatus('Session expired'); setLoading(false); return;
        }
        
        // 👇 NEW: Catch the real error message 👇
        if (!response.ok) {
          let errMsg = 'HTTP ' + response.status;
          try {
            const errData = await response.json();
            if (errData && errData.error) {
              errMsg = typeof errData.error === 'object' ? JSON.stringify(errData.error) : errData.error;
            }
          } catch (e) {}
          throw new Error(errMsg);
        }

        // STREAMING LOGIC
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let reply = '';
        let done = false;
        let buffer = '';

        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            buffer += decoder.decode(value, { stream: true });
            let lines = buffer.split('\n');
            buffer = lines.pop();

            for (let line of lines) {
              line = line.trim();
              if (line.startsWith('data: ')) {
                const dataStr = line.slice(6);
                if (dataStr === '[DONE]') continue;
                try {
                  const parsed = JSON.parse(dataStr);
                  const delta = parsed.choices[0].delta;
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

        // Re-render final markdown (code blocks, etc)
        setAssistantMessage(assistantDiv, reply, '');
        conversation.push({ role: 'assistant', content: reply }); scheduleSave();
        setStatus('Ready');

      } catch (err) {
        console.error('[CodeWix] chat error:', err);
        var displayErr = typeof err.message === 'object' ? JSON.stringify(err.message) : err.message;
        messageContent.innerHTML = '<div class="text-part" style="color:#f87171;">Error: ' + escapeHtml(displayErr) + '</div>';
        conversation.pop(); setStatus('Failed');
      } finally {
        setLoading(false); chatContainer.scrollTop = chatContainer.scrollHeight; chatInput.focus();
      }
    }

    function handleSend() {
      var text = chatInput.value.trim();
      if (!text && pendingAttachments.length === 0) return;
      chatInput.value = ''; chatInput.style.height = 'auto'; sendToGroq(text);
    }

    sendBtn.addEventListener('click', handleSend);
    chatInput.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } });
    chatInput.addEventListener('input', function () { chatInput.style.height = 'auto'; chatInput.style.height = Math.min(chatInput.scrollHeight, 140) + 'px'; });

    if (newChatBtn) newChatBtn.addEventListener('click', async function () {
      clearTimeout(saveTimer); await saveChatNow(); startNewChat();
      pendingAttachments = []; renderAttachPreview();
      setStatus('New chat'); showToast('New chat');
    });

    function openHistoryModal() {
      if (!historyModal) return;
      historyModal.style.display = 'flex';
      historyListBox.innerHTML = '<p class="modal-empty">Loading…</p>';
      var col = chatsCollection();
      if (!col) { historyListBox.innerHTML = '<p class="modal-empty">Sign in first.</p>'; return; }
      col.orderBy('updatedAt', 'desc').limit(50).get()
        .then(function (snap) {
          historyListBox.innerHTML = '';
          if (snap.empty) { historyListBox.innerHTML = '<p class="modal-empty">No history yet.</p>'; return; }
          snap.forEach(function (doc) {
            var data = doc.data() || {};
            var msgCount = (data.messages || []).length;
            var row = document.createElement('div');
            row.className = 'history-row' + (doc.id === currentChatId ? ' active' : '');
            row.setAttribute('data-id', doc.id);
            row.innerHTML = '<div class="history-info"><h3>' + escapeHtml(data.title || 'Untitled') + '</h3>' +
              '<p>' + formatDate(data.updatedAt) + ' · ' + msgCount + ' messages</p></div>' +
              '<div class="history-actions"><button data-action="delete" data-id="' + doc.id + '" class="danger">Delete</button></div>';
            historyListBox.appendChild(row);
          });
        })
        .catch(function (err) { historyListBox.innerHTML = '<p class="modal-empty">Failed: ' + escapeHtml(err.message) + '</p>'; });
    }
    function closeHistoryModal() { if (historyModal) historyModal.style.display = 'none'; }
    if (historyBtn) historyBtn.addEventListener('click', openHistoryModal);
    if (closeHistoryBtn) closeHistoryBtn.addEventListener('click', closeHistoryModal);
    if (historyModal) historyModal.addEventListener('click', function (e) { if (e.target === historyModal) closeHistoryModal(); });

    if (historyListBox) {
      historyListBox.addEventListener('click', async function (e) {
        var delBtn = e.target.closest('button[data-action="delete"]');
        if (delBtn) {
          e.stopPropagation();
          var id = delBtn.getAttribute('data-id');
          if (!confirm('Delete this chat?')) return;
          try { await chatsCollection().doc(id).delete(); if (id === currentChatId) startNewChat(); showToast('Deleted'); openHistoryModal(); }
          catch (err) { showToast('Failed: ' + err.message, 'error'); }
          return;
        }
        var row = e.target.closest('.history-row'); if (!row) return;
        var id2 = row.getAttribute('data-id');
        if (id2 === currentChatId) { closeHistoryModal(); return; }
        try {
          var doc = await chatsCollection().doc(id2).get();
          if (!doc.exists) { showToast('Not found.', 'error'); return; }
          loadChat(doc.id, doc.data()); closeHistoryModal(); setStatus('Loaded'); showToast('Chat loaded');
        } catch (err) { showToast('Failed: ' + err.message, 'error'); }
      });
    }

    if (modelSelect && modelIndicator) {
      modelSelect.addEventListener('change', function () { modelIndicator.textContent = modelSelect.value; });
    }
  }

  // ======================================================================
  // Learn page (DAILY SEQUENTIAL SYSTEM)
  // ======================================================================
  var lessonTitle   = $('lessonTitle');
  var lessonBody    = $('lessonBody');
  var lessonDayLbl  = $('lessonDayLabel');
  var progressFill  = $('progressFill');
  var progressLabel = $('progressLabel');
  var streakLabel   = $('streakLabel');

  if (lessonTitle && lessonBody) {
    console.log('[CodeWix] Learn page detected');

    var LESSONS = [
      { title: 'HTML: Page Structure', level: 'Beginner', lang: 'html',
        concept: 'Every HTML page starts with a <code>doctype</code>, followed by <code>&lt;html&gt;</code>, <code>&lt;head&gt;</code>, and <code>&lt;body&gt;</code>.',
        code: '<!DOCTYPE html>\n<html>\n  <head>\n    <title>My First Page</title>\n  </head>\n  <body>\n    <h1>Hello World!</h1>\n    <p>This is my first paragraph.</p>\n  </body>\n</html>',
        exercise: 'Create an HTML page with an <code>h1</code> that says "I am learning" and a <code>p</code> that says "HTML is fun".',
        hint: 'Use <code>&lt;h1&gt;I am learning&lt;/h1&gt;</code>' },
      { title: 'HTML: Links and Images', level: 'Beginner', lang: 'html',
        concept: 'Use the <code>&lt;a&gt;</code> tag for links and the <code>&lt;img&gt;</code> tag for images. Images use <code>src</code> and links use <code>href</code>.',
        code: '<h2>My Favorite Site</h2>\n<a href="https://google.com">Go to Google</a>\n<br><br>\n<img src="https://via.placeholder.com/150" alt="Placeholder Image">',
        exercise: 'Create a link to your favorite website and an image of a cat.',
        hint: 'Use <code>&lt;a href="url"&gt;Text&lt;/a&gt;</code>' },
      { title: 'HTML: Lists', level: 'Beginner', lang: 'html',
        concept: 'Use <code>&lt;ul&gt;</code> for unordered (bullet) lists and <code>&lt;ol&gt;</code> for ordered (numbered) lists. Inside them, use <code>&lt;li&gt;</code> for each item.',
        code: '<ul>\n  <li>Apples</li>\n  <li>Bananas</li>\n  <li>Cherries</li>\n</ul>',
        exercise: 'Make an ordered list of your top 3 favorite movies.',
        hint: 'Use <code>&lt;ol&gt;</code> and <code>&lt;li&gt;</code>' },
      { title: 'CSS: Basics and Selectors', level: 'Beginner', lang: 'css',
        concept: 'CSS changes how HTML looks. You target elements using selectors (like <code>body</code> or <code>.my-class</code>) and change properties like <code>color</code> and <code>background</code>.',
        code: 'body {\n  background-color: #0f172a;\n  color: white;\n  font-family: Arial, sans-serif;\n}\n\nh1 {\n  color: #38bdf8;\n}',
        exercise: 'Change the background of the body to black, and make all h1 tags red.',
        hint: 'Use <code>background-color: black;</code>' },
      { title: 'CSS: Classes and IDs', level: 'Beginner', lang: 'css',
        concept: 'Classes start with a dot (<code>.class</code>) and can be used multiple times. IDs start with a hash (<code>#id</code>) and must be unique.',
        code: '.text-red {\n  color: red;\n}\n\n#main-header {\n  font-size: 32px;\n}',
        exercise: 'Create a class called <code>.highlight</code> that gives an element a yellow background.',
        hint: 'Use <code>.highlight { background-color: yellow; }</code>' },
      { title: 'CSS: Flexbox Layout', level: 'Intermediate', lang: 'css',
        concept: 'Flexbox is for aligning items. Apply <code>display: flex;</code> to a container to align its children easily.',
        code: '.container {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  height: 100vh;\n}',
        exercise: 'Create a flex container that spaces items evenly using <code>justify-content: space-between;</code>.',
        hint: 'Use <code>display: flex;</code>' },
      { title: 'JS: Variables & Data Types', level: 'Beginner', lang: 'javascript',
        concept: 'Use <code>let</code> for variables that change and <code>const</code> for constants. JS has strings, numbers, and booleans.',
        code: 'let name = "Alice";\nconst age = 25;\nlet isStudent = true;\n\nconsole.log(name, age, isStudent);',
        exercise: 'Create a variable called <code>score</code> set to 100.',
        hint: '<code>let score = 100;</code>' },
      { title: 'JS: Functions', level: 'Beginner', lang: 'javascript',
        concept: 'Functions are reusable blocks of code. Define them with the <code>function</code> keyword and call them by their name.',
        code: 'function greet(name) {\n  return "Hello, " + name + "!";\n}\n\nconsole.log(greet("World"));',
        exercise: 'Write a function called <code>add</code> that takes two numbers and returns their sum.',
        hint: '<code>function add(a, b) { return a + b; }</code>' },
      { title: 'JS: DOM Manipulation', level: 'Intermediate', lang: 'javascript',
        concept: 'You can change HTML using JavaScript. <code>document.getElementById()</code> finds an element, and <code>.innerText</code> changes its text.',
        code: '// Assuming HTML has: <h1 id="title">Hello</h1>\nlet heading = document.getElementById("title");\nheading.innerText = "Changed by JS!";\nheading.style.color = "red";',
        exercise: 'Change the background color of the body using JS: <code>document.body.style.backgroundColor = "black";</code>',
        hint: 'Select body with <code>document.body</code>' },
      { title: 'PHP: Introduction & Echo', level: 'Beginner', lang: 'php',
        concept: 'PHP is a server-side language. Code goes inside <code>&lt;?php ... ?&gt;</code>. Use <code>echo</code> to print text.',
        code: '<?php\necho "Hello, PHP!";\n$name = "Alice";\necho "<br>Welcome, $name";\n?>',
        exercise: 'Create a PHP script that echoes "My first PHP script".',
        hint: '<code>&lt;?php echo "My first PHP script"; ?&gt;</code>' },
      { title: 'PHP: Variables & Math', level: 'Beginner', lang: 'php',
        concept: 'PHP variables start with a <code>$</code>. You can do math just like in JavaScript.',
        code: '<?php\n$price = 10;\n$tax = 2;\n$total = $price + $tax;\necho "Total is: $total";\n?>',
        exercise: 'Calculate the area of a rectangle (width = 5, height = 10) and echo the result.',
        hint: '<code>$area = 5 * 10; echo $area;</code>' },
      { title: 'PHP: Arrays', level: 'Intermediate', lang: 'php',
        concept: 'Arrays hold multiple values. You can access them by their index (starting at 0).',
        code: '<?php\n$colors = array("Red", "Green", "Blue");\necho $colors[0]; // Outputs: Red\n?>',
        exercise: 'Create an array of 3 animals and echo the second one.',
        hint: '<code>echo $animals[1];</code>' },
      { title: 'Python: Hello World', level: 'Beginner', lang: 'python',
        concept: 'Python is famous for being readable. No semicolons needed! Just use <code>print()</code> to output text.',
        code: 'print("Hello, World!")\nname = "Alice"\nprint(f"Welcome, {name}")',
        exercise: 'Print your name using the <code>print()</code> function.',
        hint: 'print("Your Name")' },
      { title: 'Python: Lists & Loops', level: 'Beginner', lang: 'python',
        concept: 'A list holds multiple items. A <code>for</code> loop goes through each item in the list.',
        code: 'fruits = ["apple", "banana", "cherry"]\nfor fruit in fruits:\n    print(fruit)',
        exercise: 'Create a list of numbers and loop through them to print each one.',
        hint: 'for num in my_list:' },
      { title: 'Python: Functions', level: 'Intermediate', lang: 'python',
        concept: 'Define a function using <code>def</code>. Indentation (spaces) is extremely important in Python.',
        code: 'def greet(name):\n    return "Hello, " + name\n\nresult = greet("Python")\nprint(result)',
        exercise: 'Create a function called <code>multiply(a, b)</code> that returns the product.',
        hint: 'def multiply(a, b): return a * b' }
    ];

    var progressData = { completed: {}, streak: 1, startDate: null };
    var authUserL = null;

    function progressDocRef() {
      if (!db || !authUserL) return null;
      return db.collection('users').doc(authUserL.uid).collection('progress').doc('state');
    }
    
    function todayISO() { return new Date().toISOString().slice(0, 10); }
    function yesterdayISO() { var d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); }
    
    function computeStreak(last, cur) {
      var t = todayISO(), y = yesterdayISO();
      if (last === t) return cur || 1;
      if (last === y) return (cur || 1) + 1;
      return 1;
    }

    function getUnlockedIndex() {
      if (!progressData.startDate) return 0;
      var start = new Date(progressData.startDate);
      var now = new Date(todayISO());
      var diffTime = Math.abs(now - start);
      var diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return Math.min(diffDays, LESSONS.length - 1); 
    }

    async function loadProgress() {
      var ref = progressDocRef(); if (!ref) return;
      try {
        var doc = await ref.get();
        if (doc.exists) {
          var d = doc.data() || {};
          var sd = d.startDate || todayISO();
          progressData = { 
              completed: d.completed || {}, 
              streak: computeStreak(d.lastVisit || '', d.streak || 1), 
              lastVisit: todayISO(),
              startDate: sd
          };
          if (!d.startDate) await ref.set({ startDate: sd }, { merge: true });
        } else {
          progressData = { completed: {}, streak: 1, lastVisit: todayISO(), startDate: todayISO() };
          await ref.set({ 
              completed: {}, 
              streak: 1, 
              lastVisit: progressData.lastVisit,
              startDate: progressData.startDate
          }, { merge: true });
        }
        renderProgressUI();
      } catch (err) { console.warn('[CodeWix] progress load failed:', err); }
    }

    async function markComplete(idx) {
      progressData.completed[idx] = true;
      renderProgressUI();
      var ref = progressDocRef(); if (!ref) return;
      try { await ref.set({ completed: progressData.completed }, { merge: true }); showToast('Completed ✔', 'success'); }
      catch (err) { showToast('Save failed', 'error'); }
    }
    
    async function markIncomplete(idx) {
      delete progressData.completed[idx];
      renderProgressUI();
      var ref = progressDocRef(); if (!ref) return;
      try { await ref.set({ completed: progressData.completed }, { merge: true }); showToast('Unmarked'); }
      catch (err) { showToast('Failed', 'error'); }
    }

    function renderProgressUI() {
      var count = Object.keys(progressData.completed).length;
      var total = LESSONS.length;
      var pct = Math.round((count / total) * 100);
      if (progressFill) progressFill.style.width = pct + '%';
      if (progressLabel) progressLabel.textContent = count + ' of ' + total + ' lessons complete';
      if (streakLabel) { streakLabel.textContent = '🔥 ' + progressData.streak + '-day streak'; streakLabel.style.display = 'inline-block'; }
    }

    function renderLesson(idx) {
      var unlockedIdx = getUnlockedIndex();
      
      if (idx > unlockedIdx) {
        lessonTitle.textContent = "🔒 Locked";
        if (lessonDayLbl) lessonDayLbl.textContent = 'Come back tomorrow!';
        lessonBody.innerHTML = '<p style="text-align:center; color:#94a3b8;">You have completed all available lessons for today. Come back tomorrow to unlock the next one!</p>';
        return;
      }

      var lesson = LESSONS[idx]; if (!lesson) return;
      lessonTitle.textContent = lesson.title;
      if (lessonDayLbl) lessonDayLbl.textContent = 'Day ' + (idx + 1) + ' of ' + LESSONS.length;
      
      var isDone = !!progressData.completed[idx];
      
      lessonBody.innerHTML =
        '<div class="lesson-meta">' +
          '<span class="lesson-level level-' + lesson.level.toLowerCase() + '">' + lesson.level + '</span>' +
          '<span class="lesson-lang">' + lesson.lang + '</span>' +
        '</div>' +
        '<div class="lesson-section"><h3>Concept</h3><p>' + lesson.concept + '</p></div>' +
        '<div class="lesson-section"><h3>Example</h3>' +
          '<div class="code-block" data-lang="' + escapeHtml(lesson.lang) + '">' +
            '<div class="code-header"><span class="code-lang">' + escapeHtml(lesson.lang) + '</span>' +
              '<button type="button" class="copy-btn" data-code="' + escapeHtml(lesson.code) + '">Copy</button></div>' +
            '<pre><code>' + escapeHtml(lesson.code) + '</code></pre>' +
          '</div>' +
        '</div>' +
        '<div class="lesson-section"><h3>Your Turn</h3><p>' + lesson.exercise + '</p>' +
          '<details class="hint-reveal"><summary>Show hint</summary><p>' + lesson.hint + '</p></details>' +
        '</div>' +
        '<div class="lesson-actions">' +
          '<a href="dashboard.html" class="button">Try in Workspace →</a>' +
          '<button type="button" class="complete-btn' + (isDone ? ' done' : '') + '" id="completeBtn" data-index="' + idx + '">' +
            (isDone ? '✓ Completed' : 'Mark Complete') + '</button>' +
        '</div>';
    }

    lessonBody.addEventListener('click', function (e) {
      var copyBtn = e.target.closest('.copy-btn');
      if (copyBtn) {
        var text = copyBtn.getAttribute('data-code') || '';
        function flash() { copyBtn.textContent = 'Copied!'; copyBtn.classList.add('copied'); setTimeout(function () { copyBtn.textContent = 'Copy'; copyBtn.classList.remove('copied'); }, 1500); }
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(flash).catch(function () {});
        else { var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); flash(); } catch (e) {} document.body.removeChild(ta); }
        return;
      }
      
      var compBtn = e.target.closest('#completeBtn');
      if (compBtn) {
        var idx = parseInt(compBtn.getAttribute('data-index'), 10);
        if (progressData.completed[idx]) markIncomplete(idx); else markComplete(idx);
        renderLesson(idx);
        document.querySelectorAll('.lesson-card').forEach(function (c, i) { c.classList.toggle('completed', !!progressData.completed[i]); });
      }
    });

    var todayIndex = getUnlockedIndex(); 
    renderLesson(todayIndex);

    var lessonListEl = $('lessonList');
    if (lessonListEl) {
      lessonListEl.innerHTML = ''; 
      var unlockedIdx = getUnlockedIndex();
      
      LESSONS.forEach(function (lesson, i) {
        if (i > unlockedIdx) return;

        var card = document.createElement('button');
        card.type = 'button';
        card.className = 'lesson-card' + (i === todayIndex ? ' today' : '') + (progressData.completed[i] ? ' completed' : '');
        card.innerHTML = '<div class="lesson-card-num">' + (progressData.completed[i] ? '✓' : (i + 1)) + '</div>' +
          '<div class="lesson-card-info"><h4>' + escapeHtml(lesson.title) + '</h4>' +
          '<p>' + lesson.level + ' · ' + lesson.lang + '</p></div>' +
          (i === todayIndex ? '<span class="today-badge">Today</span>' : '');
        card.addEventListener('click', function () { renderLesson(i); window.scrollTo({ top: 0, behavior: 'smooth' }); });
        lessonListEl.appendChild(card);
      });
    }

    if (auth) {
      auth.onAuthStateChanged(function (user) {
        if (!user) return;
        authUserL = user;
        loadProgress().then(function () {
          renderLesson(todayIndex);
          
          if (lessonListEl) {
            lessonListEl.innerHTML = '';
            var uIdx = getUnlockedIndex();
            LESSONS.forEach(function (lesson, i) {
              if (i > uIdx) return;
              var card = document.createElement('button');
              card.type = 'button';
              card.className = 'lesson-card' + (i === todayIndex ? ' today' : '') + (progressData.completed[i] ? ' completed' : '');
              card.innerHTML = '<div class="lesson-card-num">' + (progressData.completed[i] ? '✓' : (i + 1)) + '</div>' +
                '<div class="lesson-card-info"><h4>' + escapeHtml(lesson.title) + '</h4>' +
                '<p>' + lesson.level + ' · ' + lesson.lang + '</p></div>' +
                (i === todayIndex ? '<span class="today-badge">Today</span>' : '');
              card.addEventListener('click', function () { renderLesson(i); window.scrollTo({ top: 0, behavior: 'smooth' }); });
              lessonListEl.appendChild(card);
            });
          }
        });
      });
    }
  }

  // ======================================================================
  // Explore page
  // ======================================================================
  var exploreGrid = $('exploreGrid');
  if (exploreGrid) {
    console.log('[CodeWix] Explore page detected');
    var exploreCount = $('exploreCount');

    function buildSiteCard(site) {
      var card = document.createElement('a');
      card.href = '/s/' + encodeURIComponent(site.slug);
      card.target = '_blank';
      card.className = 'site-card';
      var previewUrl = '/s/' + encodeURIComponent(site.slug);
      
      card.innerHTML =
        '<div class="site-preview">' +
          '<iframe src="' + previewUrl + '" loading="lazy" sandbox="allow-scripts allow-modals" tabindex="-1"></iframe>' +
        '</div>' +
        '<div class="site-info">' +
          '<h3>' + escapeHtml(site.projectName || 'Untitled') + '</h3>' +
          '<p class="site-desc">' + escapeHtml(site.description || 'A project built on CodeWix.') + '</p>' +
          '<div class="site-meta">' +
            '<a href="/u/' + encodeURIComponent(site.username) + '" class="site-author" onclick="event.stopPropagation();">@' + escapeHtml(site.username) + '</a>' +
            '<span>👁 ' + (site.views || 0) + '</span>' +
            '<span>' + (site.updatedAt ? formatDate(site.updatedAt) : '') + '</span>' +
            '<button class="remix-btn" data-slug="' + escapeHtml(site.slug) + '">🍴 Remix</button>' +
          '</div>' +
        '</div>';
      return card;
    }

    fetch('/api/explore')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        exploreGrid.innerHTML = '';
        var sites = data.sites || [];
        if (exploreCount) exploreCount.textContent = sites.length + ' project' + (sites.length === 1 ? '' : 's');
        if (!sites.length) {
          exploreGrid.innerHTML = '<p class="explore-empty">No published sites yet. Be the first — build something in the workspace and hit Publish!</p>';
          return;
        }
        sites.forEach(function (s) { exploreGrid.appendChild(buildSiteCard(s)); });
      })
      .catch(function (err) {
        exploreGrid.innerHTML = '<p class="explore-empty">Could not load projects: ' + escapeHtml(err.message) + '</p>';
      });

    exploreGrid.addEventListener('click', async function(e) {
      var remixBtn = e.target.closest('.remix-btn');
      if (!remixBtn) return;
      
      e.preventDefault(); 
      e.stopPropagation(); 

      if (!auth || !auth.currentUser) {
        showToast('Please log in to remix this project.', 'error');
        setTimeout(function() { window.location.href = 'login.html'; }, 1000);
        return;
      }

      var slug = remixBtn.getAttribute('data-slug');
      var originalText = remixBtn.textContent;
      remixBtn.textContent = '⏳ Cloning...';
      remixBtn.classList.add('loading');

      try {
        var doc = await db.collection('published').doc(slug).get();
        if (!doc.exists) throw new Error('Project not found.');
        
        var projectData = doc.data();
        var files = projectData.files || {};

        var newProject = {
          name: 'Remix of ' + (projectData.projectName || 'Untitled'),
          files: files,
          activeFile: 'index.html',
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        var newRef = await db.collection('users').doc(auth.currentUser.uid).collection('projects').add(newProject);

        localStorage.setItem('codewix_remix_project_id', newRef.id);

        remixBtn.textContent = '✓ Opening...';
        showToast('Project cloned! Opening workspace...', 'success');
        
        setTimeout(function() {
          window.location.href = 'dashboard.html';
        }, 600);

      } catch (err) {
        console.error('[Remix Error]', err);
        showToast('Failed to remix: ' + err.message, 'error');
        remixBtn.textContent = originalText;
        remixBtn.classList.remove('loading');
      }
    });

    if (auth) {
      auth.onAuthStateChanged(function (user) {
        if (user && $('dashUser')) $('dashUser').textContent = user.email.split('@')[0];
      });
    }
  }

  // ======================================================================
  // Profile page
  // ======================================================================
  var profileGrid = $('profileGrid');
  if (profileGrid) {
    console.log('[CodeWix] Profile page detected');
    var profileUsername = $('profileUsername');
    var profileStats    = $('profileStats');
    var profileAvatar   = $('profileAvatar');

    var username = null;
    var pathMatch = location.pathname.match(/^\/u\/([^\/]+)$/);
    if (pathMatch) username = decodeURIComponent(pathMatch[1]);
    else username = new URLSearchParams(location.search).get('u');

    if (!username) {
      profileGrid.innerHTML = '<p class="explore-empty">No user specified.</p>';
      if (profileUsername) profileUsername.textContent = 'Profile not found';
    } else {
      document.title = '@' + username + ' | CodeWix';
      if (profileAvatar) profileAvatar.textContent = username.charAt(0).toUpperCase();

      fetch('/api/user/' + encodeURIComponent(username))
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (profileUsername) profileUsername.textContent = '@' + data.username;
          if (profileStats) {
            var totalViews = (data.sites || []).reduce(function (sum, s) { return sum + (s.views || 0); }, 0);
            profileStats.textContent = data.count + ' published project' + (data.count === 1 ? '' : 's') + ' · ' + totalViews + ' total views';
          }
          profileGrid.innerHTML = '';
          if (!data.sites || !data.sites.length) {
            profileGrid.innerHTML = '<p class="explore-empty">@' + escapeHtml(username) + ' hasn\u2019t published anything yet.</p>';
            return;
          }
          data.sites.forEach(function (site) {
            var card = document.createElement('a');
            card.href = '/s/' + encodeURIComponent(site.slug);
            card.target = '_blank';
            card.className = 'site-card';
            card.innerHTML =
              '<div class="site-preview">' +
                '<iframe src="/s/' + encodeURIComponent(site.slug) + '" loading="lazy" sandbox="allow-scripts allow-modals" tabindex="-1"></iframe>' +
              '</div>' +
              '<div class="site-info">' +
                '<h3>' + escapeHtml(site.projectName || 'Untitled') + '</h3>' +
                '<p class="site-desc">' + escapeHtml(site.description || 'A project built on CodeWix.') + '</p>' +
                '<div class="site-meta">' +
                  '<span>👁 ' + (site.views || 0) + '</span>' +
                  '<span>' + (site.updatedAt ? formatDate(site.updatedAt) : '') + '</span>' +
                '</div>' +
              '</div>';
            profileGrid.appendChild(card);
          });
        })
        .catch(function (err) {
          profileGrid.innerHTML = '<p class="explore-empty">Failed to load profile: ' + escapeHtml(err.message) + '</p>';
        });
    }

    if (auth) {
      auth.onAuthStateChanged(function (user) {
        if (user && $('dashUser')) $('dashUser').textContent = user.email.split('@')[0];
      });
    }
  }

  // ======================================================================
  // Publish Page
  // ======================================================================
  var publishForm = $('publishForm');
  if (publishForm) {
    console.log('[CodeWix] Publish page detected');

    var publishPageError   = $('publishError');
    var publishPageSuccess = $('publishSuccess');
    var projectSelect      = $('projectSelect');
    var publishSlugInput   = $('publishSlug');
    var publishNameInput   = $('publishName');
    var publishDescInput   = $('publishDesc');
    var publishSubmitBtn   = $('publishSubmitBtn');
    var mySitesGrid        = $('mySitesGrid');
    var mySitesCount       = $('mySitesCount');
    var authUserP          = null;
    var savedProjects      = [];

    function loadProjects() {
      if (!db || !auth || !auth.currentUser) return;
      db.collection('users').doc(auth.currentUser.uid).collection('projects')
        .orderBy('updatedAt', 'desc').get()
        .then(function (snap) {
          savedProjects = [];
          projectSelect.innerHTML = '';
          if (snap.empty) {
            var opt = document.createElement('option');
            opt.value = ''; opt.textContent = 'You have no saved projects yet — save one first';
            opt.disabled = true; opt.selected = true;
            projectSelect.appendChild(opt);
            publishSubmitBtn.disabled = true;
            return;
          }
          var placeholder = document.createElement('option');
          placeholder.value = ''; placeholder.textContent = 'Choose a project…';
          placeholder.disabled = true; placeholder.selected = true;
          projectSelect.appendChild(placeholder);

          snap.forEach(function (doc) {
            var data = doc.data() || {};
            savedProjects.push({ id: doc.id, name: data.name || 'Untitled', files: data.files || {} });
            var opt = document.createElement('option');
            opt.value = doc.id;
            opt.textContent = (data.name || 'Untitled') + ' · saved ' + formatDate(data.updatedAt);
            projectSelect.appendChild(opt);
          });

          var params = new URLSearchParams(location.search);
          var preselected = params.get('project');
          if (preselected) { projectSelect.value = preselected; handleProjectChange(); }
        })
        .catch(function (err) {
          projectSelect.innerHTML = '<option value="">Failed: ' + escapeHtml(err.message) + '</option>';
        });
    }

    function handleProjectChange() {
      var id = projectSelect.value;
      if (!id) return;
      var proj = savedProjects.find(function (p) { return p.id === id; });
      if (!proj) return;
      publishNameInput.value = proj.name;
      if (!publishSlugInput.value) {
        var suggested = proj.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').substring(0, 30);
        if (suggested.length < 3) suggested = 'my-project';
        publishSlugInput.value = suggested;
      }
    }

    projectSelect.addEventListener('change', handleProjectChange);

    function loadPublishedSites() {
      if (!auth || !auth.currentUser) return;
      auth.currentUser.getIdToken().then(function (token) {
        fetch('/api/my-published', { headers: { 'Authorization': 'Bearer ' + token } })
          .then(function (r) { return r.json(); })
          .then(function (data) { renderPublishedSites(data.sites || []); })
          .catch(function (err) { mySitesGrid.innerHTML = '<p class="my-sites-empty">Failed: ' + escapeHtml(err.message) + '</p>'; });
      });
    }

    function renderPublishedSites(sites) {
      mySitesGrid.innerHTML = '';
      if (mySitesCount) mySitesCount.textContent = sites.length + ' site' + (sites.length === 1 ? '' : 's');
      if (!sites.length) {
        mySitesGrid.innerHTML = '<p class="my-sites-empty">You haven\u2019t published anything yet.</p>';
        return;
      }
      sites.forEach(function (site) {
        var card = document.createElement('div');
        card.className = 'my-site-card';
        var url = '/s/' + encodeURIComponent(site.slug);
        var fullUrl = location.origin + url;
        card.innerHTML =
          '<div class="my-site-info">' +
            '<h3>' + escapeHtml(site.projectName || 'Untitled') + '</h3>' +
            '<a href="' + url + '" target="_blank" class="my-site-url">' + escapeHtml(fullUrl) + '</a>' +
            '<div class="my-site-meta">' +
              '<span>👁 ' + (site.views || 0) + ' views</span>' +
              '<span>·</span>' +
              '<span>' + (site.updatedAt ? formatDate(site.updatedAt) : '') + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="my-site-actions">' +
            '<a href="' + url + '" target="_blank" class="studio-btn ghost-btn">View</a>' +
            '<button type="button" class="studio-btn ghost-btn copy-link-btn" data-url="' + escapeHtml(fullUrl) + '">Copy Link</button>' +
            '<button type="button" class="studio-btn ghost-btn update-btn" data-slug="' + escapeHtml(site.slug) + '" data-name="' + escapeHtml(site.projectName || '') + '">Update</button>' +
            '<button type="button" class="studio-btn ghost-btn danger-btn unpublish-btn" data-slug="' + escapeHtml(site.slug) + '">Unpublish</button>' +
          '</div>';
        mySitesGrid.appendChild(card);
      });
    }

    mySitesGrid.addEventListener('click', function (e) {
      var copyBtn = e.target.closest('.copy-link-btn');
      if (copyBtn) {
        var url = copyBtn.getAttribute('data-url');
        function flash() { var old = copyBtn.textContent; copyBtn.textContent = 'Copied!'; setTimeout(function () { copyBtn.textContent = old; }, 1500); }
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(flash).catch(fallback);
        else fallback();
        function fallback() { var ta = document.createElement('textarea'); ta.value = url; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); flash(); } catch (e) {} document.body.removeChild(ta); }
        return;
      }

      var updateBtn = e.target.closest('.update-btn');
      if (updateBtn) {
        var slug = updateBtn.getAttribute('data-slug');
        var name = updateBtn.getAttribute('data-name');
        publishSlugInput.value = slug;
        publishNameInput.value = name;
        showToast('Form pre-filled. Pick the project and hit Publish to update.', 'success');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      var unBtn = e.target.closest('.unpublish-btn');
      if (unBtn) {
        var unSlug = unBtn.getAttribute('data-slug');
        if (!confirm('Unpublish /s/' + unSlug + '?')) return;
        unBtn.disabled = true; unBtn.textContent = 'Removing…';
        auth.currentUser.getIdToken().then(function (token) {
          return fetch('/api/unpublish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ slug: unSlug })
          }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); });
        })
        .then(function (res) {
          if (!res.ok) { showToast('Failed: ' + (res.data.error || 'unknown'), 'error'); unBtn.disabled = false; unBtn.textContent = 'Unpublish'; return; }
          showToast('Site unpublished', 'success');
          loadPublishedSites();
        })
        .catch(function (err) { showToast('Failed: ' + err.message, 'error'); unBtn.disabled = false; unBtn.textContent = 'Unpublish'; });
      }
    });

    publishForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      hideError(publishPageError);
      if (publishPageSuccess) publishPageSuccess.style.display = 'none';

      var projectId = projectSelect.value;
      var slug = (publishSlugInput.value || '').trim().toLowerCase();
      var name = (publishNameInput.value || '').trim();
      var desc = (publishDescInput.value || '').trim();

      if (!projectId) { showError(publishPageError, 'Please choose a project.'); return; }
      if (!/^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/.test(slug)) {
        showError(publishPageError, 'Slug must be 3-32 characters: lowercase, numbers, hyphens.');
        return;
      }
      if (!name) { showError(publishPageError, 'Please enter a project name.'); return; }
      if (!auth || !auth.currentUser) { showError(publishPageError, 'You must be signed in.'); return; }

      publishSubmitBtn.disabled = true;
      publishSubmitBtn.textContent = 'Publishing…';

      try {
        var projDoc = await db.collection('users').doc(auth.currentUser.uid).collection('projects').doc(projectId).get();
        if (!projDoc.exists) throw new Error('Project not found.');
        var projData = projDoc.data();

        var idToken = await auth.currentUser.getIdToken();
        var res = await fetch('/api/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + idToken },
          body: JSON.stringify({
            slug: slug, projectName: name, description: desc,
            files: projData.files || {}
          })
        });
        var data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Publish failed.');

        if (publishPageSuccess) {
          publishPageSuccess.innerHTML = '✅ Your site is live at <a href="' + data.url + '" target="_blank" style="color:#34d399;font-weight:bold;">' + escapeHtml(data.fullUrl) + '</a>';
          publishPageSuccess.style.display = 'block';
        }
        showToast('Site published ✔', 'success');
        loadPublishedSites();
      } catch (err) {
        showError(publishPageError, err.message);
      } finally {
        publishSubmitBtn.disabled = false;
        publishSubmitBtn.textContent = 'Publish Site →';
      }
    });

    if (auth) {
      auth.onAuthStateChanged(function (user) {
        if (!user) { location.replace('login.html'); return; }
        if (!user.emailVerified) {
          alert('Please verify your email first.');
          auth.signOut().then(function () { location.replace('login.html'); });
          return;
        }
        authUserP = user;
        if ($('dashUser'))  $('dashUser').textContent  = user.email.split('@')[0];
        if ($('userEmail')) $('userEmail').textContent = user.email;
        loadProjects();
        loadPublishedSites();
      });
    }
  }

  // ======================================================================
  // INJECT LIVE STATUS WIDGET INTO FOOTER
  // ======================================================================
  var isDesktopApp = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  if (!isDesktopApp) {
    var footer = document.querySelector('footer');
    if (footer) {
      var statusWidget = document.createElement('a');
      statusWidget.href = 'status.html';
      statusWidget.className = 'footer-status-widget';
      statusWidget.innerHTML = '<div class="footer-status-dot"></div><span class="footer-status-text">Checking status...</span>';
      
      footer.appendChild(statusWidget);
      
      var statusDot = statusWidget.querySelector('.footer-status-dot');
      var statusText = statusWidget.querySelector('.footer-status-text');

      fetch('/api/uptime-status')
        .then(function(res) { return res.json(); })
        .then(function(data) {
          if (data.status === 'up') {
            statusWidget.classList.add('up');
            statusText.textContent = 'All Systems Operational';
          } else if (data.status === 'down') {
            statusWidget.classList.add('down');
            statusText.textContent = 'System Outage';
          } else {
            statusText.textContent = 'Status Unknown';
          }
        })
        .catch(function() {
          statusWidget.classList.add('down');
          statusText.textContent = 'Unable to fetch status';
        });
    }
  }

}); // end DOMContentLoaded
