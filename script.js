// ==========================================================================
// CodeWix — app logic (classic script, no ES modules)
// Sections:
//   1. Firebase boot
//   2. Helpers
//   3. Auth guard
//   4. Logout
//   5. Register
//   6. Login
//   7. Sandbox IDE (dashboard.html)
//   8. AI Assistant (ai-assistant.html) — multi-chat history
//   9. Daily Lessons (learn.html)
// ==========================================================================

console.log('[CodeWix] script.js file evaluated');

window.addEventListener('DOMContentLoaded', function () {
  console.log('[CodeWix] DOMContentLoaded fired');

  // ======================================================================
  // 1. Firebase boot
  // ======================================================================
  var auth = null;
  var db = null;

  if (typeof firebase === 'undefined') {
    console.error('[CodeWix] firebase global is undefined.');
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

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
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
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function extensionForLang(lang) {
    var map = {
      'javascript':'js','js':'js','jsx':'jsx','typescript':'ts','ts':'ts','tsx':'tsx',
      'python':'py','py':'py','html':'html','xml':'html','css':'css','scss':'scss','sass':'sass',
      'json':'json','yaml':'yml','yml':'yml','bash':'sh','sh':'sh','shell':'sh','zsh':'sh',
      'sql':'sql','java':'java','c':'c','cpp':'cpp','csharp':'cs','cs':'cs','go':'go',
      'rust':'rs','php':'php','ruby':'rb','swift':'swift','kotlin':'kt',
      'markdown':'md','md':'md','text':'txt','plaintext':'txt'
    };
    return map[String(lang).toLowerCase()] || 'txt';
  }

  // Auto-inject "Learn" link into any nav that lacks it
  document.querySelectorAll('nav').forEach(function (nav) {
    if (!nav.querySelector('a[href="learn.html"]')) {
      var a = document.createElement('a');
      a.href = 'learn.html';
      a.textContent = 'Learn';
      var home = nav.querySelector('a[href="index.html"]');
      if (home && home.nextSibling) nav.insertBefore(a, home.nextSibling);
      else nav.appendChild(a);
    }
  });

  // ======================================================================
  // 3. Auth guard
  // ======================================================================
  var path = location.pathname.toLowerCase();
  var protectedPages = ['dashboard.html', 'ai-assistant.html', 'learn.html'];
  var onProtectedPage = protectedPages.some(function (p) { return path.indexOf(p) !== -1; });

  if (auth && onProtectedPage) {
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
    $('registerForm').addEventListener('submit', function (e) {
      e.preventDefault();
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
        .catch(function (err) { showError(errBox, err.message); });
    });
  }

  // ======================================================================
  // 6. Login
  // ======================================================================
  if ($('loginForm')) {
    $('loginForm').addEventListener('submit', function (e) {
      e.preventDefault();
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
        .catch(function (err) { showError(errBox, 'Authentication failed: ' + err.message); });
    });
  }

  // ======================================================================
  // 7. Sandbox IDE (dashboard.html)
  // ======================================================================
  var codeEditor       = $('codeEditor');
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
      if (!editorLineGutter || !codeEditor) return;
      var n = codeEditor.value.split('\n').length;
      var out = '';
      for (var i = 1; i <= n; i++) out += i + (i < n ? '\n' : '');
      editorLineGutter.textContent = out;
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

    function loadFilesIntoEditor(newFiles, projectId, projectName) {
      files = Object.assign({}, DEFAULT_FILES, newFiles || {});
      activeFile = 'index.html';
      currentProjectId = projectId || null;
      currentProjectName = projectName || null;
      lastSavedSnapshot = snapshot();
      if (codeEditor) codeEditor.value = files[activeFile];
      rebuildFileTree();
      updateGutter();
      renderPreview();
      if (unsavedIndicator) unsavedIndicator.style.display = 'none';
      if (projectStatusLbl) projectStatusLbl.textContent = currentProjectName ? 'Project: ' + currentProjectName : 'No project loaded';
    }

    if (codeEditor) {
      codeEditor.value = files[activeFile];
      lastSavedSnapshot = snapshot();
      codeEditor.addEventListener('input', function () {
        files[activeFile] = codeEditor.value;
        updateGutter();
        markUnsaved();
      });
      updateGutter();
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
        updateGutter();
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
        if (typeof JSZip === 'undefined') { alert('ZIP library not loaded.'); return; }
        if (codeEditor) files[activeFile] = codeEditor.value;
        downloadZipBtn.disabled = true;
        downloadZipBtn.textContent = 'Zipping…';
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
      if (!codeEditor || !db || !auth || !auth.currentUser) { showToast('Not ready to save.', 'error'); return; }
      files[activeFile] = codeEditor.value;
      var name = currentProjectName;
      if (!name) {
        name = prompt('Name this project:', 'My Project');
        if (!name) return;
        name = name.trim();
        if (!name) return;
      }
      saveProjectBtn.disabled = true;
      saveProjectBtn.textContent = 'Saving…';
      var payload = {
        name: name, files: files, activeFile: activeFile,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      var col = projectsCollection();
      var promise;
      if (currentProjectId) {
        promise = col.doc(currentProjectId).update(payload);
      } else {
        payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        promise = col.add(payload).then(function (ref) { currentProjectId = ref.id; });
      }
      promise.then(function () {
        currentProjectName = name;
        lastSavedSnapshot = snapshot();
        if (unsavedIndicator) unsavedIndicator.style.display = 'none';
        if (projectStatusLbl) projectStatusLbl.textContent = 'Project: ' + name;
        showToast('Project saved ✔', 'success');
      }).catch(function (err) { showToast('Save failed: ' + err.message, 'error'); })
        .finally(function () { saveProjectBtn.disabled = false; saveProjectBtn.textContent = 'Save'; });
    }

    function openProjectsModal() {
      if (!projectsModal) return;
      projectsModal.style.display = 'flex';
      projectsListBox.innerHTML = '<p class="modal-empty">Loading…</p>';
      if (!db || !auth || !auth.currentUser) {
        projectsListBox.innerHTML = '<p class="modal-empty">Sign in to view your projects.</p>';
        return;
      }
      projectsCollection().orderBy('updatedAt', 'desc').get()
        .then(function (snapshot) {
          projectsListBox.innerHTML = '';
          if (snapshot.empty) {
            projectsListBox.innerHTML = '<p class="modal-empty">You haven\u2019t saved any projects yet.</p>';
            return;
          }
          snapshot.forEach(function (doc) {
            var data = doc.data() || {};
            var row = document.createElement('div');
            row.className = 'project-row';
            row.innerHTML =
              '<div class="project-info"><h3>' + escapeHtml(data.name || 'Untitled') + '</h3>' +
              '<p>Last saved: ' + formatDate(data.updatedAt) + '</p></div>' +
              '<div class="project-actions">' +
                '<button data-action="open" data-id="' + doc.id + '">Open</button>' +
                '<button data-action="download" data-id="' + doc.id + '">⬇ ZIP</button>' +
                '<button data-action="delete" data-id="' + doc.id + '" class="danger">Delete</button>' +
              '</div>';
            projectsListBox.appendChild(row);
          });
        })
        .catch(function (err) {
          projectsListBox.innerHTML = '<p class="modal-empty">Failed to load: ' + escapeHtml(err.message) + '</p>';
        });
    }

    function closeProjectsModal() { if (projectsModal) projectsModal.style.display = 'none'; }

    if (saveProjectBtn) saveProjectBtn.addEventListener('click', saveProject);
    if (myProjectsBtn)  myProjectsBtn.addEventListener('click', openProjectsModal);
    if (closeModalBtn)  closeModalBtn.addEventListener('click', closeProjectsModal);
    if (projectsModal)  projectsModal.addEventListener('click', function (e) { if (e.target === projectsModal) closeProjectsModal(); });

    if (projectsListBox) {
      projectsListBox.addEventListener('click', async function (e) {
        var btn = e.target.closest('button[data-action]');
        if (!btn) return;
        var action = btn.getAttribute('data-action');
        var id = btn.getAttribute('data-id');

        if (action === 'open') {
          btn.disabled = true; btn.textContent = 'Opening…';
          try {
            var doc = await projectsCollection().doc(id).get();
            if (!doc.exists) { showToast('Not found.', 'error'); return; }
            var data = doc.data();
            loadFilesIntoEditor(data.files || {}, doc.id, data.name || 'Untitled');
            closeProjectsModal();
            showToast('Project loaded ✔', 'success');
          } catch (err) { showToast('Open failed: ' + err.message, 'error'); }
          finally { btn.disabled = false; btn.textContent = 'Open'; }

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
            var safe = (dd.name || 'codewix-project').replace(/[^a-z0-9-_]/gi, '_');
            downloadBlob(blob, safe + '.zip');
            showToast('Downloaded ' + safe + '.zip', 'success');
          } catch (err) { showToast('ZIP failed: ' + err.message, 'error'); }
          finally { btn.disabled = false; btn.textContent = '⬇ ZIP'; }

        } else if (action === 'delete') {
          if (!confirm('Delete this project permanently?')) return;
          projectsCollection().doc(id).delete()
            .then(function () { showToast('Deleted', 'success'); openProjectsModal(); })
            .catch(function (err) { showToast('Delete failed: ' + err.message, 'error'); });
        }
      });
    }

    if (newProjectBtn) {
      newProjectBtn.addEventListener('click', function () {
        if (lastSavedSnapshot !== snapshot()) {
          if (!confirm('You have unsaved changes. Start a new project anyway?')) return;
        }
        loadFilesIntoEditor(DEFAULT_FILES, null, null);
        showToast('Started a new project');
      });
    }

    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveProject();
      }
    });

    window.addEventListener('beforeunload', function (e) {
      if (lastSavedSnapshot !== null && lastSavedSnapshot !== snapshot()) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  }

  // ======================================================================
  // 8. AI Assistant — multi-chat history
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
      content: 'You are the CodeWix AI Assistant. You help users learn to code, debug errors, and build projects. Keep answers concise and practical. ALWAYS wrap code in triple-backtick fenced blocks with the language name, like ```javascript ... ```. Never paste code inline without a fence.'
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
      if (currentChatTitle) {
        chatTitleBar.style.display = 'flex';
        currentChatTitleEl.textContent = currentChatTitle;
      } else {
        chatTitleBar.style.display = 'none';
      }
    }

    function scheduleSave() {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(function () { saveChatNow(); }, 700);
    }

    async function saveChatNow() {
      if (!authUser || !db) return;
      var messagesToSave = conversation.filter(function (m) { return m.role !== 'system'; });
      if (!messagesToSave.length) return;

      var col = chatsCollection();
      if (!col) return;

      var firstUser = messagesToSave.find(function (m) { return m.role === 'user'; });
      var title = currentChatTitle;
      if (!title && firstUser) {
        title = firstUser.content.replace(/\s+/g, ' ').trim().substring(0, 48);
        if (firstUser.content.length > 48) title += '…';
      }
      if (!title) title = 'New Chat';

      var payload = {
        title: title,
        messages: messagesToSave,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      try {
        if (currentChatId) {
          await col.doc(currentChatId).update(payload);
        } else {
          payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
          var ref = await col.add(payload);
          currentChatId = ref.id;
        }
        currentChatTitle = title;
        updateTitleBar();
      } catch (err) {
        console.warn('[CodeWix] chat save failed:', err);
      }
    }

    function renderConversation() {
      chatContainer.innerHTML = '';
      conversation.forEach(function (m) {
        if (m.role === 'user') {
          var d = appendMessage('user');
          setUserMessage(d, m.content);
        } else if (m.role === 'assistant') {
          var d2 = appendMessage('assistant');
          setAssistantMessage(d2, m.content, '');
        }
      });
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    function loadChat(id, data) {
      currentChatId = id || null;
      currentChatTitle = (data && data.title) || '';
      var saved = (data && data.messages) || [];
      conversation = [SYSTEM_PROMPT].concat(saved);
      updateTitleBar();
      if (saved.length) renderConversation();
      else showWelcome();
    }

    function startNewChat() {
      currentChatId = null;
      currentChatTitle = '';
      conversation = [SYSTEM_PROMPT];
      updateTitleBar();
      showWelcome();
      chatInput.focus();
    }

    function showWelcome() {
      chatContainer.innerHTML =
        '<div class="chat-message assistant-message">' +
          '<div class="message-role">Assistant</div>' +
          '<div class="message-content">' +
            '<div class="text-part">Hello! I\'m your CodeWix AI Assistant. Ask me to explain code, debug an error, or help you build a project.</div>' +
          '</div>' +
        '</div>';
    }

    function onUserReady(user) {
      authUser = user;
      var col = chatsCollection();
      if (!col) { showWelcome(); return; }

      col.orderBy('updatedAt', 'desc').limit(1).get()
        .then(function (snap) {
          if (snap.empty) {
            startNewChat();
          } else {
            var doc = snap.docs[0];
            loadChat(doc.id, doc.data());
            setStatus('Loaded previous conversation');
          }
        })
        .catch(function (err) {
          console.warn('[CodeWix] chat load failed:', err);
          startNewChat();
        });
    }

    if (auth) {
      auth.onAuthStateChanged(function (user) {
        if (!user) return;
        onUserReady(user);
      });
    }

    function renderContent(text) {
      var parts = String(text).split(/```/);
      var html = '';
      for (var i = 0; i < parts.length; i++) {
        if (i % 2 === 0) {
          var chunk = parts[i];
          if (!chunk) continue;
          var escaped = escapeHtml(chunk).replace(/`([^`\n]+)`/g, '<code>$1</code>');
          html += '<div class="text-part">' + escaped.replace(/\n/g, '<br>') + '</div>';
        } else {
          var body = parts[i];
          var lang = 'code';
          var nl = body.indexOf('\n');
          if (nl !== -1) {
            var firstLine = body.substring(0, nl).trim();
            if (firstLine && !firstLine.match(/\s/) && firstLine.length < 20) {
              lang = firstLine;
              body = body.substring(nl + 1);
            }
          }
          body = body.replace(/\n$/, '');
          html +=
            '<div class="code-block" data-lang="' + escapeHtml(lang) + '">' +
              '<div class="code-header">' +
                '<span class="code-lang">' + escapeHtml(lang) + '</span>' +
                '<div class="code-actions">' +
                  '<button type="button" class="download-code-btn">⬇ Download</button>' +
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
      div.innerHTML =
        '<div class="message-role">' + (role === 'user' ? 'You' : 'Assistant') + '</div>' +
        '<div class="message-content"></div>';
      chatContainer.appendChild(div);
      chatContainer.scrollTop = chatContainer.scrollHeight;
      return div;
    }

    function setUserMessage(div, text) {
      div.querySelector('.message-content').innerHTML =
        '<div class="text-part">' + escapeHtml(text).replace(/\n/g, '<br>') + '</div>';
    }

    function setAssistantMessage(div, content, reasoning) {
      var container = div.querySelector('.message-content');
      var html = '';
      if (reasoning) {
        html +=
          '<details class="reasoning-section">' +
            '<summary>Thinking process</summary>' +
            '<div class="reasoning-content">' + escapeHtml(reasoning) + '</div>' +
          '</details>';
      }
      html += renderContent(content);
      container.innerHTML = html;
    }

    function setStatus(msg) { if (chatStatus) chatStatus.textContent = msg; }

    function setLoading(loading) {
      sendBtn.disabled = loading;
      chatInput.disabled = loading;
      sendBtn.textContent = loading ? 'Thinking…' : 'Send';
    }

    chatContainer.addEventListener('click', function (e) {
      var dlBtn = e.target.closest('.download-code-btn');
      if (dlBtn) {
        var block = dlBtn.closest('.code-block');
        if (!block) return;
        var codeEl = block.querySelector('code');
        if (!codeEl) return;
        var lang = block.getAttribute('data-lang') || 'code';
        var ext = extensionForLang(lang);
        downloadBlob(new Blob([codeEl.textContent], { type: 'text/plain;charset=utf-8' }),
                     'codewix-snippet-' + Date.now() + '.' + ext);
        dlBtn.textContent = '✓ Saved';
        setTimeout(function () { dlBtn.textContent = '⬇ Download'; }, 1500);
        return;
      }

      var btn = e.target.closest('.copy-btn');
      if (!btn) return;
      var block2 = btn.closest('.code-block');
      if (!block2) return;
      var codeEl2 = block2.querySelector('code');
      if (!codeEl2) return;
      var text2 = codeEl2.textContent;

      function flash() {
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(function () {
          btn.textContent = 'Copy';
          btn.classList.remove('copied');
        }, 1500);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text2).then(flash).catch(fallback);
      } else fallback();

      function fallback() {
        var ta = document.createElement('textarea');
        ta.value = text2;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); flash(); } catch (err) { alert('Copy failed.'); }
        document.body.removeChild(ta);
      }
    });

    async function sendToGroq(userText) {
      var model = modelSelect ? modelSelect.value : 'openai/gpt-oss-120b';
      if (modelIndicator) modelIndicator.textContent = model;
      var showThinking = thinkingToggle ? thinkingToggle.checked : false;

      if (conversation.length === 1 && chatContainer.querySelector('.assistant-message')) {
        chatContainer.innerHTML = '';
      }

      conversation.push({ role: 'user', content: userText });
      var userDiv = appendMessage('user');
      setUserMessage(userDiv, userText);
      scheduleSave();

      var assistantDiv = appendMessage('assistant');
      assistantDiv.querySelector('.message-content').innerHTML =
        '<div class="text-part"><span class="typing-dot">●</span><span class="typing-dot">●</span><span class="typing-dot">●</span></div>';

      setLoading(true);
      setStatus(showThinking ? 'Thinking…' : 'Generating…');

      try {
        var payload = {
          model: model,
          messages: conversation,
          temperature: 0.7,
          max_completion_tokens: 2048
        };
        if (showThinking) payload.reasoning_effort = 'medium';

        var response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        var data = await response.json();

        if (!response.ok) {
          var msg = (data && data.error && (data.error.message || data.error)) || ('HTTP ' + response.status);
          throw new Error(msg);
        }

        var message = data.choices && data.choices[0] && data.choices[0].message;
        if (!message) throw new Error('Empty response from server.');

        var reply = message.content || '';
        var reasoning = message.reasoning || '';

        setAssistantMessage(assistantDiv, reply, showThinking ? reasoning : '');
        conversation.push({ role: 'assistant', content: reply });
        scheduleSave();
        setStatus('Ready' + (data.usage ? ' — ' + data.usage.total_tokens + ' tokens' : ''));

      } catch (err) {
        console.error('[CodeWix] chat error:', err);
        assistantDiv.querySelector('.message-content').innerHTML =
          '<div class="text-part">Error: ' + escapeHtml(err.message) +
          '<br><br>Make sure server.js is running and the page is loaded from the same origin.</div>';
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
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    });
    chatInput.addEventListener('input', function () {
      chatInput.style.height = 'auto';
      chatInput.style.height = Math.min(chatInput.scrollHeight, 140) + 'px';
    });

    if (newChatBtn) {
      newChatBtn.addEventListener('click', async function () {
        clearTimeout(saveTimer);
        await saveChatNow();
        startNewChat();
        setStatus('New chat started');
        showToast('New chat', 'success');
      });
    }

    function openHistoryModal() {
      if (!historyModal) return;
      historyModal.style.display = 'flex';
      historyListBox.innerHTML = '<p class="modal-empty">Loading…</p>';

      var col = chatsCollection();
      if (!col) {
        historyListBox.innerHTML = '<p class="modal-empty">Sign in to view history.</p>';
        return;
      }

      col.orderBy('updatedAt', 'desc').limit(50).get()
        .then(function (snap) {
          historyListBox.innerHTML = '';
          if (snap.empty) {
            historyListBox.innerHTML = '<p class="modal-empty">No chat history yet.</p>';
            return;
          }
          snap.forEach(function (doc) {
            var data = doc.data() || {};
            var msgCount = (data.messages || []).length;
            var row = document.createElement('div');
            row.className = 'history-row' + (doc.id === currentChatId ? ' active' : '');
            row.setAttribute('data-id', doc.id);
            row.innerHTML =
              '<div class="history-info">' +
                '<h3>' + escapeHtml(data.title || 'Untitled') + '</h3>' +
                '<p>' + formatDate(data.updatedAt) + ' · ' + msgCount + ' message' + (msgCount === 1 ? '' : 's') + '</p>' +
              '</div>' +
              '<div class="history-actions">' +
                '<button data-action="delete" data-id="' + doc.id + '" class="danger">Delete</button>' +
              '</div>';
            historyListBox.appendChild(row);
          });
        })
        .catch(function (err) {
          console.error('[CodeWix] history list error:', err);
          historyListBox.innerHTML = '<p class="modal-empty">Failed to load: ' + escapeHtml(err.message) + '</p>';
        });
    }

    function closeHistoryModal() { if (historyModal) historyModal.style.display = 'none'; }

    if (historyBtn) historyBtn.addEventListener('click', openHistoryModal);
    if (closeHistoryBtn) closeHistoryBtn.addEventListener('click', closeHistoryModal);
    if (historyModal) {
      historyModal.addEventListener('click', function (e) {
        if (e.target === historyModal) closeHistoryModal();
      });
    }

    if (historyListBox) {
      historyListBox.addEventListener('click', async function (e) {
        var delBtn = e.target.closest('button[data-action="delete"]');
        if (delBtn) {
          e.stopPropagation();
          var idToDelete = delBtn.getAttribute('data-id');
          if (!confirm('Delete this chat permanently?')) return;
          try {
            await chatsCollection().doc(idToDelete).delete();
            if (idToDelete === currentChatId) startNewChat();
            showToast('Chat deleted', 'success');
            openHistoryModal();
          } catch (err) { showToast('Delete failed: ' + err.message, 'error'); }
          return;
        }

        var row = e.target.closest('.history-row');
        if (!row) return;
        var id = row.getAttribute('data-id');
        if (id === currentChatId) { closeHistoryModal(); return; }
        try {
          var doc = await chatsCollection().doc(id).get();
          if (!doc.exists) { showToast('Chat not found.', 'error'); return; }
          loadChat(doc.id, doc.data());
          closeHistoryModal();
          setStatus('Loaded previous conversation');
          showToast('Chat loaded', 'success');
        } catch (err) { showToast('Load failed: ' + err.message, 'error'); }
      });
    }

    if (modelSelect && modelIndicator) {
      modelSelect.addEventListener('change', function () {
        modelIndicator.textContent = modelSelect.value;
      });
    }
  }

  // ======================================================================
  // 9. Daily Lessons (learn.html)
  // ======================================================================
  var lessonTitle   = $('lessonTitle');
  var lessonBody    = $('lessonBody');
  var lessonDayLbl  = $('lessonDayLabel');

  if (lessonTitle && lessonBody) {
    console.log('[CodeWix] Learn page detected');

    var LESSONS = [
      { title: 'Your First Variable', level: 'Beginner', lang: 'javascript',
        concept: 'A variable is a labeled box where you store a value. In JavaScript, you use <code>let</code> when the value can change, and <code>const</code> when it cannot.',
        code: 'let name = "Alice";\nconst age = 25;\n\nconsole.log("Hi, " + name);\nconsole.log("You are " + age + " years old");',
        exercise: 'Create a variable called <code>favoriteColor</code> set to your favorite color, then log it to the console.',
        hint: 'Use <code>let favoriteColor = "blue";</code> then <code>console.log(favoriteColor);</code>' },

      { title: 'Understanding Data Types', level: 'Beginner', lang: 'javascript',
        concept: 'JavaScript has several primitive types: <code>string</code> (text), <code>number</code>, <code>boolean</code> (true/false), <code>null</code>, and <code>undefined</code>.',
        code: 'let greeting = "hello";    // string\nlet score = 42;           // number\nlet isReady = true;       // boolean\n\nconsole.log(typeof greeting);\nconsole.log(typeof score);',
        exercise: 'Create one variable of each type and log its <code>typeof</code> result.',
        hint: 'Use <code>console.log(typeof myVar);</code> for each one.' },

      { title: 'Making Decisions with if/else', level: 'Beginner', lang: 'javascript',
        concept: '<code>if</code> statements run code only when a condition is true. Use <code>else</code> for the other case, and <code>else if</code> for extra branches.',
        code: 'let temperature = 18;\n\nif (temperature > 25) {\n  console.log("It\'s hot!");\n} else if (temperature > 15) {\n  console.log("Nice and mild");\n} else {\n  console.log("Bring a jacket");\n}',
        exercise: 'Write an if/else chain that logs "pass" if a score is 60 or above and "fail" otherwise.',
        hint: 'Start with <code>let score = 75;</code> then <code>if (score >= 60) { console.log("pass"); } else { console.log("fail"); }</code>' },

      { title: 'Repeating Things with Loops', level: 'Beginner', lang: 'javascript',
        concept: 'A <code>for</code> loop repeats code a set number of times. The syntax is <code>for (let i = 0; i &lt; limit; i++)</code>.',
        code: 'for (let i = 1; i <= 5; i++) {\n  console.log("Number " + i);\n}\n\n// Countdown\nfor (let i = 3; i >= 1; i--) {\n  console.log(i);\n}\nconsole.log("Go!");',
        exercise: 'Print the even numbers from 2 to 20 using a for loop.',
        hint: 'Start at 2 and add 2 each time: <code>for (let i = 2; i &lt;= 20; i += 2)</code>' },

      { title: 'Writing Functions', level: 'Beginner', lang: 'javascript',
        concept: 'A function is reusable code that takes inputs and returns an output. Define it with <code>function name(params) { ... }</code>.',
        code: 'function add(a, b) {\n  return a + b;\n}\n\nfunction greet(name) {\n  return "Hello, " + name + "!";\n}\n\nconsole.log(add(2, 3));         // 5\nconsole.log(greet("World"));    // Hello, World!',
        exercise: 'Write a function <code>square(n)</code> that returns n multiplied by itself.',
        hint: '<code>function square(n) { return n * n; }</code>' },

      { title: 'Working with Arrays', level: 'Beginner', lang: 'javascript',
        concept: 'An array holds a list of values. Access items by index (starting at 0), and use methods like <code>push</code>, <code>pop</code>, and <code>length</code>.',
        code: 'let fruits = ["apple", "banana", "cherry"];\n\nconsole.log(fruits[0]);        // apple\nconsole.log(fruits.length);    // 3\n\nfruits.push("date");\nconsole.log(fruits);           // 4 items now',
        exercise: 'Create an array of 5 numbers and log the sum of the first and last.',
        hint: '<code>let nums = [10, 20, 30, 40, 50]; console.log(nums[0] + nums[nums.length - 1]);</code>' },

      { title: 'Objects: Grouping Data', level: 'Beginner', lang: 'javascript',
        concept: 'An object stores related data under named keys. You read values with dot notation: <code>obj.key</code>.',
        code: 'let user = {\n  name: "Alice",\n  age: 25,\n  isAdmin: false\n};\n\nconsole.log(user.name);       // Alice\nuser.age = 26;                 // update\nuser.email = "a@example.com";  // add new key',
        exercise: 'Create an object <code>book</code> with title, author, and year. Log the title.',
        hint: '<code>let book = { title: "1984", author: "Orwell", year: 1949 }; console.log(book.title);</code>' },

      { title: 'HTML Structure', level: 'Beginner', lang: 'html',
        concept: 'Every web page is built from HTML tags. The essential skeleton is <code>doctype</code>, <code>html</code>, <code>head</code>, and <code>body</code>.',
        code: '<!DOCTYPE html>\n<html>\n  <head>\n    <title>My Page</title>\n  </head>\n  <body>\n    <h1>Hello!</h1>\n    <p>This is a paragraph.</p>\n  </body>\n</html>',
        exercise: 'Create an HTML page with an <code>h1</code> heading and two paragraphs.',
        hint: 'Copy the skeleton and add <code>&lt;p&gt;First&lt;/p&gt;&lt;p&gt;Second&lt;/p&gt;</code> inside the body.' },

      { title: 'CSS Selectors', level: 'Beginner', lang: 'css',
        concept: 'CSS styles HTML. You target elements with selectors: <code>tag</code>, <code>.class</code>, and <code>#id</code>.',
        code: 'body {\n  background: #0f172a;\n  color: white;\n}\n\n.title {\n  font-size: 32px;\n}\n\n#main-heading {\n  color: #38bdf8;\n}',
        exercise: 'Write a CSS rule that makes all <code>button</code> elements have green text.',
        hint: '<code>button { color: green; }</code>' },

      { title: 'Layout with Flexbox', level: 'Intermediate', lang: 'css',
        concept: 'Flexbox aligns items in a row or column. Apply <code>display: flex</code> to a parent and control children with <code>justify-content</code> and <code>align-items</code>.',
        code: '.container {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  gap: 20px;\n}',
        exercise: 'Center a single div both horizontally and vertically inside a full-page container.',
        hint: 'Use <code>display: flex; justify-content: center; align-items: center; height: 100vh;</code> on the parent.' },

      { title: 'CSS Grid Basics', level: 'Intermediate', lang: 'css',
        concept: 'Grid is for two-dimensional layouts. Define columns with <code>grid-template-columns</code>.',
        code: '.grid {\n  display: grid;\n  grid-template-columns: 1fr 1fr 1fr;\n  gap: 16px;\n}\n\n/* Responsive: as many columns as fit, each at least 200px */\n.grid-auto {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));\n  gap: 16px;\n}',
        exercise: 'Create a 2-column grid where each column is 1fr wide and there is a 12px gap.',
        hint: '<code>display: grid; grid-template-columns: 1fr 1fr; gap: 12px;</code>' },

      { title: 'Changing the Page with JavaScript', level: 'Intermediate', lang: 'javascript',
        concept: 'The DOM is your page as JavaScript sees it. Use <code>document.getElementById</code> to find elements and change them.',
        code: 'let heading = document.getElementById("title");\nheading.textContent = "Updated!";\nheading.style.color = "#38bdf8";\n\n// Or create new elements\nlet p = document.createElement("p");\np.textContent = "A new paragraph";\ndocument.body.appendChild(p);',
        exercise: 'Change the text of an element with id <code>demo</code> to say "Hello, DOM!".',
        hint: '<code>document.getElementById("demo").textContent = "Hello, DOM!";</code>' },

      { title: 'Listening for Events', level: 'Intermediate', lang: 'javascript',
        concept: 'Events let you react to what users do. Attach a listener with <code>addEventListener</code>.',
        code: 'let btn = document.getElementById("myButton");\n\nbtn.addEventListener("click", function () {\n  alert("Clicked!");\n});\n\n// Or with arrow syntax\nbtn.addEventListener("click", () => console.log("Clicked again"));',
        exercise: 'Add a click listener to a button that changes its own text to "Clicked".',
        hint: '<code>btn.addEventListener("click", () => btn.textContent = "Clicked");</code>' },

      { title: 'Async and Await', level: 'Advanced', lang: 'javascript',
        concept: '<code>async</code> functions let you use <code>await</code> to pause until a promise resolves. Perfect for fetching data.',
        code: 'async function loadData() {\n  try {\n    let res = await fetch("https://api.example.com/data");\n    let json = await res.json();\n    console.log(json);\n  } catch (err) {\n    console.error("Failed:", err);\n  }\n}',
        exercise: 'Write an async function that fetches a URL and returns the parsed JSON.',
        hint: '<code>async function get(url) { let r = await fetch(url); return r.json(); }</code>' },

      { title: 'The Fetch API', level: 'Advanced', lang: 'javascript',
        concept: 'Fetch makes HTTP requests. Always check <code>response.ok</code> before parsing.',
        code: 'async function getTodo() {\n  let res = await fetch("https://jsonplaceholder.typicode.com/todos/1");\n  if (!res.ok) throw new Error("HTTP " + res.status);\n  let todo = await res.json();\n  return todo;\n}',
        exercise: 'Fetch a list of users from <code>https://jsonplaceholder.typicode.com/users</code> and log the first one.',
        hint: 'Use fetch, then res.json(), then log result[0].' },

      { title: 'Try/Catch for Errors', level: 'Intermediate', lang: 'javascript',
        concept: 'Wrap risky code in <code>try</code> and handle failures in <code>catch</code>. Use <code>finally</code> for cleanup.',
        code: 'try {\n  JSON.parse("{ invalid json }");\n} catch (err) {\n  console.error("Something went wrong:", err.message);\n} finally {\n  console.log("This always runs");\n}',
        exercise: 'Write a try/catch that divides 10 by 0 and logs "cannot divide by zero" if the result is Infinity.',
        hint: 'Check <code>if (!isFinite(result)) throw new Error("cannot divide by zero");</code>' },

      { title: 'Classes and Objects', level: 'Advanced', lang: 'javascript',
        concept: 'A class is a blueprint for creating objects with shared methods and properties.',
        code: 'class Dog {\n  constructor(name, breed) {\n    this.name = name;\n    this.breed = breed;\n  }\n\n  bark() {\n    return this.name + " says Woof!";\n  }\n}\n\nlet rex = new Dog("Rex", "Labrador");\nconsole.log(rex.bark());',
        exercise: 'Write a <code>Rectangle</code> class with width and height and a method <code>area()</code>.',
        hint: 'Inside the class: <code>area() { return this.width * this.height; }</code>' },

      { title: 'Local Storage', level: 'Intermediate', lang: 'javascript',
        concept: 'localStorage keeps data on the user\'s browser even after closing the tab. Values must be strings — use JSON for objects.',
        code: 'localStorage.setItem("theme", "dark");\nlet theme = localStorage.getItem("theme");\nconsole.log(theme);   // "dark"\n\n// Objects\nlocalStorage.setItem("user", JSON.stringify({ name: "Alice" }));\nlet user = JSON.parse(localStorage.getItem("user"));',
        exercise: 'Save a counter to localStorage and increment it each time the page loads.',
        hint: 'Read, parse, increment, save: <code>let n = +localStorage.getItem("n") || 0; localStorage.setItem("n", n + 1);</code>' },

      { title: 'Working with JSON', level: 'Intermediate', lang: 'javascript',
        concept: 'JSON is a text format for structured data. Convert between objects and JSON strings with <code>JSON.stringify</code> and <code>JSON.parse</code>.',
        code: 'let obj = { name: "Alice", age: 25 };\nlet text = JSON.stringify(obj);\nconsole.log(text);           // \'{"name":"Alice","age":25}\'\n\nlet parsed = JSON.parse(text);\nconsole.log(parsed.name);    // "Alice"',
        exercise: 'Convert an array of your favorite movies to JSON and back.',
        hint: '<code>let json = JSON.stringify(movies); let back = JSON.parse(json);</code>' }
    ];

    function getTodayLessonIndex() {
      var now = new Date();
      var start = new Date(now.getFullYear(), 0, 0);
      var dayOfYear = Math.floor((now - start) / 86400000);
      return dayOfYear % LESSONS.length;
    }

    function renderLesson(index) {
      var lesson = LESSONS[index];
      if (!lesson) return;

      lessonTitle.textContent = lesson.title;
      if (lessonDayLbl) lessonDayLbl.textContent = 'Day ' + (index + 1) + ' of ' + LESSONS.length;

      var codeEscaped = escapeHtml(lesson.code);

      lessonBody.innerHTML =
        '<div class="lesson-meta">' +
          '<span class="lesson-level level-' + lesson.level.toLowerCase() + '">' + lesson.level + '</span>' +
          '<span class="lesson-lang">' + lesson.lang + '</span>' +
        '</div>' +
        '<div class="lesson-section">' +
          '<h3>Concept</h3>' +
          '<p>' + lesson.concept + '</p>' +
        '</div>' +
        '<div class="lesson-section">' +
          '<h3>Example</h3>' +
          '<div class="code-block" data-lang="' + escapeHtml(lesson.lang) + '">' +
            '<div class="code-header">' +
              '<span class="code-lang">' + escapeHtml(lesson.lang) + '</span>' +
              '<button type="button" class="copy-btn" data-code="' + escapeHtml(lesson.code) + '">Copy</button>' +
            '</div>' +
            '<pre><code>' + codeEscaped + '</code></pre>' +
          '</div>' +
        '</div>' +
        '<div class="lesson-section">' +
          '<h3>Your Turn</h3>' +
          '<p>' + lesson.exercise + '</p>' +
          '<details class="hint-reveal"><summary>Show hint</summary><p>' + lesson.hint + '</p></details>' +
        '</div>' +
        '<div class="lesson-actions">' +
          '<a href="dashboard.html" class="button">Try in Workspace →</a>' +
        '</div>';
    }

    lessonBody.addEventListener('click', function (e) {
      var btn = e.target.closest('.copy-btn');
      if (!btn) return;
      var text = btn.getAttribute('data-code') || '';
      function flash() {
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(function () { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 1500);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(flash).catch(function () {});
      } else {
        var ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); flash(); } catch (err) {}
        document.body.removeChild(ta);
      }
    });

    // Render today's lesson
    var todayIndex = getTodayLessonIndex();
    renderLesson(todayIndex);

    // Build the "browse all" list
    var lessonListEl = $('lessonList');
    if (lessonListEl) {
      LESSONS.forEach(function (lesson, i) {
        var card = document.createElement('button');
        card.type = 'button';
        card.className = 'lesson-card' + (i === todayIndex ? ' today' : '');
        card.innerHTML =
          '<div class="lesson-card-num">' + (i + 1) + '</div>' +
          '<div class="lesson-card-info">' +
            '<h4>' + escapeHtml(lesson.title) + '</h4>' +
            '<p>' + lesson.level + ' · ' + lesson.lang + '</p>' +
          '</div>' +
          (i === todayIndex ? '<span class="today-badge">Today</span>' : '');
        card.addEventListener('click', function () {
          renderLesson(i);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        lessonListEl.appendChild(card);
      });
    }
  }
});