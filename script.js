// ==========================================================================
// CodeWix — script.js
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

  // ---- Helpers ---------------------------------------------------------
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

  // Auto-inject Learn link into non-studio navs
  document.querySelectorAll('nav').forEach(function (nav) {
    if (!nav.querySelector('a[href="learn.html"]') && !nav.classList.contains('studio-nav')) {
      var a = document.createElement('a');
      a.href = 'learn.html'; a.textContent = 'Learn';
      var home = nav.querySelector('a[href="index.html"]');
      if (home && home.nextSibling) nav.insertBefore(a, home.nextSibling);
      else nav.appendChild(a);
    }
  });

  // ---- Auth guard ------------------------------------------------------
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

  // ---- Logout ----------------------------------------------------------
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
  // Sandbox IDE (dashboard.html) — with CodeMirror
  // ======================================================================
  // ---- CodeMirror setup -----------------------------------------------
  var cm = null;
  var codeEditor = null;

  (function initCodeMirror() {
    var sourceEl = $('codeEditorSource');
    if (!sourceEl || typeof CodeMirror === 'undefined') {
      console.warn('[CodeWix] CodeMirror not loaded — falling back to basic editor.');
      if (sourceEl) {
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
      matchTags: { bothTags: true },
      mode: 'htmlmixed',
      extraKeys: {
        'Ctrl-Space': 'autocomplete',
        'Cmd-Space': 'autocomplete',
        'Tab': function (editor) {
          if (editor.somethingSelected()) editor.indentSelection('add');
          else editor.replaceSelection('  ');
        }
      },
      hintOptions: {
        completeSingle: false,
        alignWithWord: true
      }
    });

    // Auto-trigger autocomplete on chars that usually start a completion
    cm.on('inputRead', function (editor, change) {
      if (!change.text || !change.text[0]) return;
      var ch = change.text[0];
      if (/[<>\/=.:"\-]/.test(ch)) {
        if (!editor.state.completionActive) {
          editor.showHint({ completeSingle: false });
        }
        return;
      }
      var cursor = editor.getCursor();
      var line = editor.getLine(cursor.line);
      if (cursor.ch > 1 && /[a-zA-Z0-9_-]/.test(ch) && /\s/.test(line.charAt(cursor.ch - 2))) {
        if (!editor.state.completionActive) {
          editor.showHint({ completeSingle: false });
        }
      }
    });

    // Compatibility shim — makes CodeMirror look like the old textarea
    codeEditor = {
      get value() { return cm.getValue(); },
      set value(v) { cm.setValue(v == null ? '' : String(v)); },
      addEventListener: function (evt, fn) {
        if (evt === 'input' || evt === 'change') {
          cm.on('change', function () { fn(); });
        } else if (evt === 'focus') {
          cm.on('focus', function () { fn(); });
        } else if (evt === 'keydown') {
          cm.getWrapperElement().addEventListener('keydown', fn);
        } else if (evt === 'keyup') {
          cm.getWrapperElement().addEventListener('keyup', fn);
        }
      },
      focus: function () { cm.focus(); },
      _cm: cm
    };

    // Mode switcher based on file extension
    window.__codewixSetEditorMode = function (filename) {
      if (!cm) return;
      var mode = 'htmlmixed';
      var lower = (filename || '').toLowerCase();
      if (lower.endsWith('.css')) mode = 'css';
      else if (lower.endsWith('.js')) mode = 'javascript';
      cm.setOption('mode', mode);
      cm.setOption('hintOptions', { completeSingle: false, alignWithWord: true });
    };

    console.log('[CodeWix] CodeMirror initialized ✔');
  })();

  // ---- IDE variables ---------------------------------------------------
  var runCodeBtn       = $('runCodeBtn');
  var livePreviewFrame = $('livePreviewFrame');
  var currentFileLabel = $('currentFileLabel');
  var fileTreeList     = $('fileTreeList');
  var newFileBtn       = $('newFileBtn');
  var editorLineGutter = $('editorLineGutter');
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

    function snapshot() { return JSON.stringify(files); }
    function markUnsaved() {
      if (!unsavedIndicator) return;
      unsavedIndicator.style.display = (lastSavedSnapshot !== snapshot()) ? 'inline' : 'none';
    }

    function rebuildFileTree() {
      if (!fileTreeList) return;
      fileTreeList.innerHTML = '';
      Object.keys(files).forEach(function (name) {
        var li = document.createElement('li');
        li.className = 'file-item' + (name === activeFile ? ' active' : '');
        li.setAttribute('data-filename', name);
        var icon = '📄 ';
        if (name.endsWith('.html')) icon = '🌐 ';
        if (name.endsWith('.css'))  icon = '🎨 ';
        if (name.endsWith('.js'))   icon = '⚡ ';
        li.textContent = icon + name;
        fileTreeList.appendChild(li);
      });
      if (currentFileLabel) currentFileLabel.textContent = activeFile;
    }

    function updateGutter() {
      // Legacy function — CodeMirror handles its own line numbers now.
      // Kept as a no-op so existing calls don't break.
    }

    function renderPreview() {
      if (!livePreviewFrame) return;
      if (codeEditor) files[activeFile] = codeEditor.value;
      livePreviewFrame.srcdoc =
        '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>' +
        (files['style.css'] || '') + '</style></head><body>' +
        (files['index.html'] || '') + '<script>' +
        (files['script.js'] || '') + '<\/script></body></html>';
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
        files[activeFile] = codeEditor.value;
        markUnsaved();
      });
    }

    if (runCodeBtn) runCodeBtn.addEventListener('click', function () { renderPreview(); showToast('Preview refreshed'); });
    renderPreview();

    if (fileTreeList) {
      fileTreeList.addEventListener('click', function (e) {
        var item = e.target.closest('.file-item');
        if (!item || !codeEditor) return;
        files[activeFile] = codeEditor.value;
        document.querySelectorAll('.file-item').forEach(function (el) { el.classList.remove('active'); });
        item.classList.add('active');
        activeFile = item.getAttribute('data-filename');
        if (currentFileLabel) currentFileLabel.textContent = activeFile;
        codeEditor.value = files[activeFile] || '';
        if (window.__codewixSetEditorMode) window.__codewixSetEditorMode(activeFile);
        if (cm) cm.focus();
      });
    }

    if (newFileBtn) {
      newFileBtn.addEventListener('click', function () {
        var name = prompt('New filename (e.g. app.js):');
        if (!name) return;
        var clean = name.trim().toLowerCase();
        if (files[clean] !== undefined) { alert('File already exists.'); return; }
        files[clean] = '';
        rebuildFileTree();
        var li = fileTreeList.querySelector('[data-filename="' + clean + '"]');
        if (li) li.click();
        if (window.__codewixSetEditorMode) window.__codewixSetEditorMode(clean);
        markUnsaved();
      });
    }

    if (downloadFileBtn) {
      downloadFileBtn.addEventListener('click', function () {
        if (!codeEditor) return;
        files[activeFile] = codeEditor.value;
        downloadBlob(new Blob([files[activeFile] || ''], { type: 'text/plain;charset=utf-8' }), activeFile);
        showToast('Downloaded ' + activeFile, 'success');
      });
    }

    if (downloadZipBtn) {
      downloadZipBtn.addEventListener('click', async function () {
        if (typeof JSZip === 'undefined') { alert('ZIP not loaded.'); return; }
        if (codeEditor) files[activeFile] = codeEditor.value;
        downloadZipBtn.disabled = true; downloadZipBtn.textContent = 'Zipping…';
        try {
          var zip = new JSZip();
          Object.keys(files).forEach(function (name) { zip.file(name, files[name] || ''); });
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
      files[activeFile] = codeEditor.value;
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
      files[activeFile] = codeEditor.value;
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
            Object.keys(dd.files || {}).forEach(function (name) { zip.file(name, dd.files[name] || ''); });
            var blob = await zip.generateAsync({ type: 'blob' });
            var safe = (dd.name || 'project').replace(/[^a-z0-9-_]/gi, '_');
            downloadBlob(blob, safe + '.zip');
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

    // Receive AI snippet
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
  // AI Assistant (ai-assistant.html)
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

    var API_URL = '/api/chat';
    var SYSTEM_PROMPT = {
      role: 'system',
      content: 'You are the CodeWix AI Assistant. Help users learn to code, debug, and build projects. Keep answers concise and practical. ALWAYS wrap code in triple-backtick fenced blocks with the language name.'
    };

    var conversation = [SYSTEM_PROMPT];
    var currentChatId = null;
    var currentChatTitle = '';
    var saveTimer = null;
    var authUser = null;

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
        title = firstUser.content.replace(/\s+/g, ' ').trim().substring(0, 48);
        if (firstUser.content.length > 48) title += '…';
      }
      if (!title) title = 'New Chat';
      var payload = { title: title, messages: msgs, updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
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
          '<div class="message-content"><div class="text-part">Hello! I\'m your CodeWix AI Assistant. Ask me to explain code, debug an error, or help you build a project.</div></div>' +
        '</div>';
    }

    function onUserReady(user) {
      authUser = user;
      var col = chatsCollection(); if (!col) { showWelcome(); return; }
      col.orderBy('updatedAt', 'desc').limit(1).get()
        .then(function (snap) {
          if (snap.empty) startNewChat();
          else { var doc = snap.docs[0]; loadChat(doc.id, doc.data()); setStatus('Loaded previous conversation'); }
        })
        .catch(function () { startNewChat(); });
    }

    if (auth) auth.onAuthStateChanged(function (user) { if (user) onUserReady(user); });

    function renderContent(text) {
      var parts = String(text).split(/```/);
      var html = '';
      for (var i = 0; i < parts.length; i++) {
        if (i % 2 === 0) {
          var chunk = parts[i]; if (!chunk) continue;
          var escaped = escapeHtml(chunk).replace(/`([^`\n]+)`/g, '<code>$1</code>');
          html += '<div class="text-part">' + escaped.replace(/\n/g, '<br>') + '</div>';
        } else {
          var body = parts[i], lang = 'code', nl = body.indexOf('\n');
          if (nl !== -1) {
            var firstLine = body.substring(0, nl).trim();
            if (firstLine && !firstLine.match(/\s/) && firstLine.length < 20) { lang = firstLine; body = body.substring(nl + 1); }
          }
          body = body.replace(/\n$/, '');
          html +=
            '<div class="code-block" data-lang="' + escapeHtml(lang) + '">' +
              '<div class="code-header">' +
                '<span class="code-lang">' + escapeHtml(lang) + '</span>' +
                '<div class="code-actions">' +
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

    function setUserMessage(div, text) {
      div.querySelector('.message-content').innerHTML = '<div class="text-part">' + escapeHtml(text).replace(/\n/g, '<br>') + '</div>';
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
    function setLoading(l) { sendBtn.disabled = l; chatInput.disabled = l; sendBtn.textContent = l ? 'Thinking…' : 'Send'; }

    chatContainer.addEventListener('click', function (e) {
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
      if (modelIndicator) modelIndicator.textContent = model;
      var showThinking = thinkingToggle ? thinkingToggle.checked : false;
      if (!authUser) { showToast('Sign in first.', 'error'); return; }

      if (conversation.length === 1 && chatContainer.querySelector('.assistant-message')) chatContainer.innerHTML = '';
      conversation.push({ role: 'user', content: userText });
      var userDiv = appendMessage('user'); setUserMessage(userDiv, userText); scheduleSave();

      var assistantDiv = appendMessage('assistant');
      assistantDiv.querySelector('.message-content').innerHTML =
        '<div class="text-part"><span class="typing-dot">●</span><span class="typing-dot">●</span><span class="typing-dot">●</span></div>';

      setLoading(true); setStatus(showThinking ? 'Thinking…' : 'Generating…');

      try {
        var idToken = await authUser.getIdToken();
        var payload = { model: model, messages: conversation, temperature: 0.7, max_completion_tokens: 2048 };
        if (showThinking) payload.reasoning_effort = 'medium';

        var response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + idToken },
          body: JSON.stringify(payload)
        });
        var data = await response.json();

        if (response.status === 429) {
          assistantDiv.querySelector('.message-content').innerHTML = '<div class="text-part" style="color:#fbbf24;">⚠️ ' + escapeHtml(data.error || 'Daily limit reached.') + '</div>';
          conversation.pop(); setStatus('Limit reached'); return;
        }
        if (response.status === 401) {
          assistantDiv.querySelector('.message-content').innerHTML = '<div class="text-part" style="color:#f87171;">Session expired. Please refresh.</div>';
          conversation.pop(); setStatus('Session expired'); return;
        }
        if (!response.ok) throw new Error((data && data.error) || 'HTTP ' + response.status);

        var message = data.choices && data.choices[0] && data.choices[0].message;
        if (!message) throw new Error('Empty response.');
        var reply = message.content || '', reasoning = message.reasoning || '';
        setAssistantMessage(assistantDiv, reply, showThinking ? reasoning : '');
        conversation.push({ role: 'assistant', content: reply }); scheduleSave();
        setStatus('Ready' + (data.usage ? ' — ' + data.usage.total_tokens + ' tokens' : ''));
      } catch (err) {
        assistantDiv.querySelector('.message-content').innerHTML = '<div class="text-part">Error: ' + escapeHtml(err.message) + '</div>';
        conversation.pop(); setStatus('Failed');
      } finally {
        setLoading(false); chatContainer.scrollTop = chatContainer.scrollHeight; chatInput.focus();
      }
    }

    function handleSend() {
      var text = chatInput.value.trim(); if (!text) return;
      chatInput.value = ''; chatInput.style.height = 'auto'; sendToGroq(text);
    }

    sendBtn.addEventListener('click', handleSend);
    chatInput.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } });
    chatInput.addEventListener('input', function () { chatInput.style.height = 'auto'; chatInput.style.height = Math.min(chatInput.scrollHeight, 140) + 'px'; });

    if (newChatBtn) newChatBtn.addEventListener('click', async function () {
      clearTimeout(saveTimer); await saveChatNow(); startNewChat();
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
  // Learn page (learn.html)
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
      { title: 'Your First Variable', level: 'Beginner', lang: 'javascript',
        concept: 'A variable is a labeled box where you store a value. Use <code>let</code> for values that change, <code>const</code> for values that don\'t.',
        code: 'let name = "Alice";\nconst age = 25;\n\nconsole.log("Hi, " + name);\nconsole.log("You are " + age + " years old");',
        exercise: 'Create a variable called <code>favoriteColor</code> set to your favorite color, then log it.',
        hint: 'Use <code>let favoriteColor = "blue"; console.log(favoriteColor);</code>' },
      { title: 'Understanding Data Types', level: 'Beginner', lang: 'javascript',
        concept: 'JavaScript has: <code>string</code> (text), <code>number</code>, <code>boolean</code>, <code>null</code>, and <code>undefined</code>.',
        code: 'let greeting = "hello";\nlet score = 42;\nlet isReady = true;\n\nconsole.log(typeof greeting);\nconsole.log(typeof score);',
        exercise: 'Create one variable of each type and log its <code>typeof</code>.',
        hint: 'Use <code>console.log(typeof myVar);</code>' },
      { title: 'Making Decisions with if/else', level: 'Beginner', lang: 'javascript',
        concept: '<code>if</code> runs code when a condition is true. Use <code>else</code> and <code>else if</code> for other cases.',
        code: 'let temp = 18;\n\nif (temp > 25) {\n  console.log("Hot!");\n} else if (temp > 15) {\n  console.log("Mild");\n} else {\n  console.log("Jacket");\n}',
        exercise: 'Write an if/else that logs "pass" if a score is 60+, "fail" otherwise.',
        hint: '<code>let score = 75; if (score >= 60) { console.log("pass"); } else { console.log("fail"); }</code>' },
      { title: 'Repeating Things with Loops', level: 'Beginner', lang: 'javascript',
        concept: 'A <code>for</code> loop repeats code. Syntax: <code>for (let i = 0; i &lt; limit; i++)</code>.',
        code: 'for (let i = 1; i <= 5; i++) {\n  console.log("Number " + i);\n}',
        exercise: 'Print even numbers from 2 to 20.',
        hint: '<code>for (let i = 2; i &lt;= 20; i += 2)</code>' },
      { title: 'Writing Functions', level: 'Beginner', lang: 'javascript',
        concept: 'A function is reusable code. Define with <code>function name(params) { ... }</code>.',
        code: 'function add(a, b) {\n  return a + b;\n}\n\nconsole.log(add(2, 3));',
        exercise: 'Write <code>square(n)</code> that returns n*n.',
        hint: '<code>function square(n) { return n * n; }</code>' },
      { title: 'Working with Arrays', level: 'Beginner', lang: 'javascript',
        concept: 'An array holds a list. Access by index (0-based). Use <code>push</code>, <code>pop</code>, <code>length</code>.',
        code: 'let fruits = ["apple", "banana", "cherry"];\n\nconsole.log(fruits[0]);\nconsole.log(fruits.length);\nfruits.push("date");',
        exercise: 'Create an array of 5 numbers, log the sum of first + last.',
        hint: '<code>let nums = [10, 20, 30, 40, 50]; console.log(nums[0] + nums[nums.length - 1]);</code>' },
      { title: 'Objects: Grouping Data', level: 'Beginner', lang: 'javascript',
        concept: 'Objects store data by name. Access with dot notation: <code>obj.key</code>.',
        code: 'let user = {\n  name: "Alice",\n  age: 25\n};\n\nconsole.log(user.name);\nuser.age = 26;',
        exercise: 'Create a <code>book</code> with title, author, year. Log the title.',
        hint: '<code>let book = { title: "1984", author: "Orwell", year: 1949 }; console.log(book.title);</code>' },
      { title: 'HTML Structure', level: 'Beginner', lang: 'html',
        concept: 'Every page has <code>doctype</code>, <code>html</code>, <code>head</code>, <code>body</code>.',
        code: '<!DOCTYPE html>\n<html>\n  <head>\n    <title>My Page</title>\n  </head>\n  <body>\n    <h1>Hello!</h1>\n    <p>Text here.</p>\n  </body>\n</html>',
        exercise: 'Make a page with an h1 and two paragraphs.',
        hint: 'Add <code>&lt;p&gt;First&lt;/p&gt;&lt;p&gt;Second&lt;/p&gt;</code> in body.' },
      { title: 'CSS Selectors', level: 'Beginner', lang: 'css',
        concept: 'CSS targets elements with selectors: <code>tag</code>, <code>.class</code>, <code>#id</code>.',
        code: 'body {\n  background: #0f172a;\n  color: white;\n}\n\n.title {\n  font-size: 32px;\n}',
        exercise: 'Write CSS to make all buttons green.',
        hint: '<code>button { color: green; }</code>' },
      { title: 'Layout with Flexbox', level: 'Intermediate', lang: 'css',
        concept: 'Apply <code>display: flex</code> to a parent, then control with <code>justify-content</code> and <code>align-items</code>.',
        code: '.container {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  gap: 20px;\n}',
        exercise: 'Center a div both ways in a full-page container.',
        hint: 'Use <code>display: flex; justify-content: center; align-items: center; height: 100vh;</code>' },
      { title: 'CSS Grid Basics', level: 'Intermediate', lang: 'css',
        concept: 'Grid for 2D layouts. Define columns with <code>grid-template-columns</code>.',
        code: '.grid {\n  display: grid;\n  grid-template-columns: 1fr 1fr 1fr;\n  gap: 16px;\n}',
        exercise: 'Make a 2-column grid with 1fr each and 12px gap.',
        hint: '<code>display: grid; grid-template-columns: 1fr 1fr; gap: 12px;</code>' },
      { title: 'Changing the Page with JavaScript', level: 'Intermediate', lang: 'javascript',
        concept: 'The DOM is your page from JS. Use <code>document.getElementById</code> to find elements.',
        code: 'let h = document.getElementById("title");\nh.textContent = "Updated!";\nh.style.color = "#38bdf8";',
        exercise: 'Change element with id "demo" to say "Hello, DOM!".',
        hint: '<code>document.getElementById("demo").textContent = "Hello, DOM!";</code>' },
      { title: 'Listening for Events', level: 'Intermediate', lang: 'javascript',
        concept: 'Attach listeners with <code>addEventListener</code>.',
        code: 'let btn = document.getElementById("myButton");\nbtn.addEventListener("click", function () {\n  alert("Clicked!");\n});',
        exercise: 'Make a button change its own text to "Clicked".',
        hint: '<code>btn.addEventListener("click", () => btn.textContent = "Clicked");</code>' },
      { title: 'Async and Await', level: 'Advanced', lang: 'javascript',
        concept: '<code>async</code> lets you use <code>await</code> to wait for promises.',
        code: 'async function load() {\n  try {\n    let res = await fetch("https://api.example.com/data");\n    let json = await res.json();\n    console.log(json);\n  } catch (err) {\n    console.error(err);\n  }\n}',
        exercise: 'Write an async function that fetches a URL and returns JSON.',
        hint: '<code>async function get(url) { let r = await fetch(url); return r.json(); }</code>' },
      { title: 'The Fetch API', level: 'Advanced', lang: 'javascript',
        concept: 'Fetch makes HTTP requests. Always check <code>response.ok</code>.',
        code: 'async function getTodo() {\n  let res = await fetch("https://jsonplaceholder.typicode.com/todos/1");\n  if (!res.ok) throw new Error("HTTP " + res.status);\n  return await res.json();\n}',
        exercise: 'Fetch users from jsonplaceholder and log the first one.',
        hint: 'Use fetch + res.json() then log result[0].' },
      { title: 'Try/Catch for Errors', level: 'Intermediate', lang: 'javascript',
        concept: 'Wrap risky code in <code>try</code> and handle with <code>catch</code>.',
        code: 'try {\n  JSON.parse("{ invalid }");\n} catch (err) {\n  console.error("Failed:", err.message);\n}',
        exercise: 'Try/catch dividing 10 by 0, log "cannot divide by zero" if Infinity.',
        hint: 'Check <code>if (!isFinite(result)) throw new Error("cannot divide by zero");</code>' },
      { title: 'Classes and Objects', level: 'Advanced', lang: 'javascript',
        concept: 'A class is a blueprint for objects with methods.',
        code: 'class Dog {\n  constructor(name) {\n    this.name = name;\n  }\n  bark() {\n    return this.name + " says Woof!";\n  }\n}\n\nlet rex = new Dog("Rex");\nconsole.log(rex.bark());',
        exercise: 'Write a <code>Rectangle</code> class with width, height, and <code>area()</code>.',
        hint: '<code>area() { return this.width * this.height; }</code>' },
      { title: 'Local Storage', level: 'Intermediate', lang: 'javascript',
        concept: 'localStorage persists data on the user\'s browser. Values must be strings.',
        code: 'localStorage.setItem("theme", "dark");\nlet theme = localStorage.getItem("theme");\nconsole.log(theme);',
        exercise: 'Save a counter that increments each page load.',
        hint: '<code>let n = +localStorage.getItem("n") || 0; localStorage.setItem("n", n + 1);</code>' },
      { title: 'Working with JSON', level: 'Intermediate', lang: 'javascript',
        concept: 'Convert between objects and JSON with <code>JSON.stringify</code> and <code>JSON.parse</code>.',
        code: 'let obj = { name: "Alice", age: 25 };\nlet text = JSON.stringify(obj);\nconsole.log(text);\nlet parsed = JSON.parse(text);\nconsole.log(parsed.name);',
        exercise: 'Convert an array of movies to JSON and back.',
        hint: '<code>let json = JSON.stringify(movies); let back = JSON.parse(json);</code>' }
    ];

    var progressData = { completed: {}, streak: 1 };
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

    async function loadProgress() {
      var ref = progressDocRef(); if (!ref) return;
      try {
        var doc = await ref.get();
        if (doc.exists) {
          var d = doc.data() || {};
          progressData = { completed: d.completed || {}, streak: computeStreak(d.lastVisit || '', d.streak || 1), lastVisit: todayISO() };
        } else {
          progressData = { completed: {}, streak: 1, lastVisit: todayISO() };
        }
        await ref.set({ completed: progressData.completed, streak: progressData.streak, lastVisit: progressData.lastVisit }, { merge: true });
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

    function getTodayLessonIndex() {
      var now = new Date();
      var start = new Date(now.getFullYear(), 0, 0);
      return Math.floor((now - start) / 86400000) % LESSONS.length;
    }

    function renderLesson(idx) {
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

    var todayIndex = getTodayLessonIndex();
    renderLesson(todayIndex);

    var lessonListEl = $('lessonList');
    if (lessonListEl) {
      LESSONS.forEach(function (lesson, i) {
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
          document.querySelectorAll('.lesson-card').forEach(function (c, i) {
            c.classList.toggle('completed', !!progressData.completed[i]);
            var n = c.querySelector('.lesson-card-num');
            if (n) n.textContent = progressData.completed[i] ? '✓' : (i + 1);
          });
        });
      });
    }
  }

  // ======================================================================
  // Explore page (explore.html)
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

    if (auth) {
      auth.onAuthStateChanged(function (user) {
        if (user && $('dashUser')) $('dashUser').textContent = user.email.split('@')[0];
      });
    }
  }

  // ======================================================================
  // Profile page (profile.html)
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
  // Publish Page (publish.html)
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
        .orderBy('updatedAt', 'desc')
        .get()
        .then(function (snap) {
          savedProjects = [];
          projectSelect.innerHTML = '';
          if (snap.empty) {
            var opt = document.createElement('option');
            opt.value = '';
            opt.textContent = 'You have no saved projects yet — save one first';
            opt.disabled = true;
            opt.selected = true;
            projectSelect.appendChild(opt);
            publishSubmitBtn.disabled = true;
            return;
          }
          var placeholder = document.createElement('option');
          placeholder.value = '';
          placeholder.textContent = 'Choose a project…';
          placeholder.disabled = true;
          placeholder.selected = true;
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
          if (preselected) {
            projectSelect.value = preselected;
            handleProjectChange();
          }
        })
        .catch(function (err) {
          projectSelect.innerHTML = '<option value="">Failed to load projects: ' + escapeHtml(err.message) + '</option>';
        });
    }

    function handleProjectChange() {
      var id = projectSelect.value;
      if (!id) return;
      var proj = savedProjects.find(function (p) { return p.id === id; });
      if (!proj) return;

      publishNameInput.value = proj.name;

      if (!publishSlugInput.value) {
        var suggested = proj.name.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .substring(0, 30);
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
          .then(function (data) {
            renderPublishedSites(data.sites || []);
          })
          .catch(function (err) {
            mySitesGrid.innerHTML = '<p class="my-sites-empty">Failed to load: ' + escapeHtml(err.message) + '</p>';
          });
      });
    }

    function renderPublishedSites(sites) {
      mySitesGrid.innerHTML = '';
      if (mySitesCount) mySitesCount.textContent = sites.length + ' site' + (sites.length === 1 ? '' : 's');
      if (!sites.length) {
        mySitesGrid.innerHTML = '<p class="my-sites-empty">You haven\u2019t published anything yet. Fill in the form above to publish your first site.</p>';
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
        if (!confirm('Unpublish /s/' + unSlug + '? The site will no longer be accessible.')) return;
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
        return;
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
        showError(publishPageError, 'Slug must be 3-32 characters: lowercase letters, numbers, and hyphens.');
        return;
      }
      if (!name) { showError(publishPageError, 'Please enter a project name.'); return; }
      if (!auth || !auth.currentUser) { showError(publishPageError, 'You must be signed in.'); return; }

      publishSubmitBtn.disabled = true;
      publishSubmitBtn.textContent = 'Publishing…';

      try {
        var projDoc = await db.collection('users').doc(auth.currentUser.uid).collection('projects').doc(projectId).get();
        if (!projDoc.exists) { throw new Error('Project not found.'); }
        var projData = projDoc.data();

        var idToken = await auth.currentUser.getIdToken();
        var res = await fetch('/api/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + idToken },
          body: JSON.stringify({
            slug: slug,
            projectName: name,
            description: desc,
            files: projData.files || {}
          })
        });
        var data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Publish failed.');

        if (publishPageSuccess) {
          publishPageSuccess.innerHTML =
            '✅ Your site is live at <a href="' + data.url + '" target="_blank" style="color:#34d399;font-weight:bold;">' +
            escapeHtml(data.fullUrl) + '</a>';
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
});