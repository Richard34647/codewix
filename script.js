// ==========================================================================
// CodeWix — script.js (Full Master File)
// ==========================================================================

console.log('[CodeWix] script.js evaluated');

document.addEventListener('contextmenu', event => event.preventDefault());
document.addEventListener('keydown', function (e) {
  if (e.keyCode === 123) { e.preventDefault(); return false; }
  if (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) { e.preventDefault(); return false; }
  if (e.ctrlKey && (e.keyCode === 85 || e.keyCode === 83)) { e.preventDefault(); return false; }
  if (e.metaKey && (e.keyCode === 83 || e.keyCode === 85)) { e.preventDefault(); return false; }
});

window.addEventListener('DOMContentLoaded', function () {
  var auth = null, db = null, isUserPremium = false, isUserAdmin = false;

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
    } catch (err) { console.error('[CodeWix] init failed:', err); }
  }

  function $(id) { return document.getElementById(id); }
  function showError(el, msg) { if (el) { el.textContent = msg; el.style.display = 'block'; } else alert(msg); }
  function hideError(el) { if (el) el.style.display = 'none'; }
  function escapeHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function showToast(msg, type) {
    var t = document.createElement('div'); t.className = 'toast ' + (type || ''); t.textContent = msg;
    document.body.appendChild(t); setTimeout(function () { t.classList.add('show'); }, 10);
    setTimeout(function () { t.classList.remove('show'); setTimeout(function () { document.body.removeChild(t); }, 300); }, 2400);
  }
  function formatDate(ts) { if (!ts) return ''; var d = ts.toDate ? ts.toDate() : new Date(ts); return d.toLocaleDateString(); }
  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }
  function extensionForLang(lang) {
    var map = { 'javascript':'js','js':'js','jsx':'jsx','typescript':'ts','ts':'ts','tsx':'tsx','python':'py','py':'py','html':'html','xml':'html','css':'css','scss':'scss','json':'json','yaml':'yml','yml':'yml','bash':'sh','sh':'sh','shell':'sh','sql':'sql','java':'java','c':'c','cpp':'cpp','csharp':'cs','cs':'cs','go':'go','rust':'rs','php':'php','ruby':'rb','swift':'swift','kotlin':'kt','markdown':'md','md':'md','text':'txt','plaintext':'txt' };
    return map[String(lang).toLowerCase()] || 'txt';
  }
  function readFileAsText(file) { return new Promise(function (resolve, reject) { var reader = new FileReader(); reader.onload = function () { resolve(reader.result); }; reader.onerror = function () { reject(reader.error); }; reader.readAsText(file); }); }
  function readFileAsDataURL(file) { return new Promise(function (resolve, reject) { var reader = new FileReader(); reader.onload = function () { resolve(reader.result); }; reader.onerror = function () { reject(reader.error); }; reader.readAsDataURL(file); }); }
  function resizeImage(file, maxWidth, maxHeight) {
    return new Promise(function(resolve, reject) {
      var reader = new FileReader();
      reader.onload = function(e) {
        var img = new Image();
        img.onload = function() {
          var width = img.width, height = img.height;
          if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; }
          if (height > maxHeight) { width = Math.round((width * maxHeight) / height); height = maxHeight; }
          var canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
          canvas.getContext('2d').drawImage(img, 0, 0, width, height); resolve(canvas.toDataURL('image/jpeg', 0.8));
        }; img.onerror = reject; img.src = e.target.result;
      }; reader.onerror = reject; reader.readAsDataURL(file);
    });
  }
  function dataUrlToBlob(dataUrl) {
    var parts = dataUrl.split(','), mimeMatch = parts[0].match(/:(.*?);/), mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    var binary = atob(parts[1]), array = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
    return new Blob([array], { type: mime });
  }

  // ======================================================================
  // NAV & THEME & POPUP
  // ======================================================================
  var ADMIN_EMAIL = 'wilcoxr889@gmail.com';
  var isAdminPage = location.pathname.toLowerCase().includes('admin.html');
  var savedTheme = localStorage.getItem('codewix_theme');
  if (savedTheme === 'light') document.body.classList.add('light-mode');

  var navMenu = document.querySelector('nav') || document.querySelector('.studio-nav');
  if (navMenu && !isAdminPage) {
    var themeBtn = document.createElement('button'); themeBtn.className = 'theme-toggle-btn'; themeBtn.id = 'themeToggleBtn';
    themeBtn.title = 'Toggle Dark/Light Mode'; themeBtn.innerHTML = document.body.classList.contains('light-mode') ? '🌙' : '☀️';
    themeBtn.addEventListener('click', function() {
      document.body.classList.toggle('light-mode');
      var isLight = document.body.classList.contains('light-mode');
      localStorage.setItem('codewix_theme', isLight ? 'light' : 'dark'); themeBtn.innerHTML = isLight ? '🌙' : '☀️';
    }); navMenu.appendChild(themeBtn);
  }

  if (auth) {
    auth.onAuthStateChanged(async function(user) {
      if (!user) return;
      const tokenResult = await user.getIdTokenResult();
      isUserPremium = tokenResult.claims.premium === true; 
      isUserAdmin = user.email === ADMIN_EMAIL;

      if (navMenu && !isAdminPage) {
        if (!document.getElementById('profileNavLink')) {
          var profLink = document.createElement('a'); profLink.href = 'profile.html'; profLink.id = 'profileNavLink'; profLink.textContent = 'Profile';
          navMenu.appendChild(profLink);
        }
        if (isUserAdmin && !document.getElementById('adminNavBtn')) {
          var adminBtn = document.createElement('a'); adminBtn.href = 'admin.html'; adminBtn.id = 'adminNavBtn'; adminBtn.innerHTML = '👑 Admin';
          adminBtn.style.cssText = 'background:#38bdf8;color:#020617;padding:6px 12px;border-radius:6px;font-weight:bold;margin-left:10px;text-decoration:none;';
          navMenu.appendChild(adminBtn);
        }
        if (isUserPremium && !document.getElementById('proNavBadge')) {
          var proBadge = document.createElement('span'); proBadge.id = 'proNavBadge'; proBadge.innerHTML = '💎 PRO';
          proBadge.style.cssText = 'background:#fbbf24;color:#020617;padding:4px 8px;border-radius:6px;font-weight:bold;font-size:12px;margin-left:10px;';
          navMenu.appendChild(proBadge);
        }
        var upgradeBtn = document.getElementById('upgradeNavBtn');
        if (!isUserPremium && !isUserAdmin && !upgradeBtn) {
          upgradeBtn = document.createElement('a'); upgradeBtn.href = 'upgrade.html'; upgradeBtn.id = 'upgradeNavBtn'; upgradeBtn.innerHTML = '⭐ Upgrade';
          upgradeBtn.style.cssText = 'background:#fbbf24;color:#020617;padding:6px 12px;border-radius:6px;font-weight:bold;margin-left:10px;text-decoration:none;';
          navMenu.appendChild(upgradeBtn);
        } else if (isUserPremium && upgradeBtn) { upgradeBtn.remove(); }
        if (!isUserPremium && !isUserAdmin) { showUpgradePopup(); }
      }
    });
  }

  function showUpgradePopup() {
    const validPages = ['dashboard.html', 'ai-assistant.html', 'publish.html', 'explore.html'];
    if (!validPages.some(p => location.pathname.includes(p))) return;
    const lastPrompt = localStorage.getItem('lastUpgradePrompt');
    const now = Date.now();
    if (lastPrompt && (now - lastPrompt) < 3 * 24 * 60 * 60 * 1000) return;

    var style = document.createElement('style');
    style.innerHTML = `
      .up-modal-overlay { position: fixed; inset: 0; background: rgba(2,6,23,0.8); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px; opacity: 0; transition: opacity 0.3s; pointer-events: none; }
      .up-modal-overlay.show { opacity: 1; pointer-events: auto; }
      .up-modal { background: #1e293b; border: 1px solid #38bdf8; border-radius: 16px; padding: 32px; max-width: 420px; width: 100%; text-align: center; position: relative; box-shadow: 0 20px 60px rgba(56,189,248,0.2); transform: translateY(20px); transition: transform 0.3s; }
      .up-modal-overlay.show .up-modal { transform: translateY(0); }
      .up-modal h2 { color: #e2e8f0; margin-bottom: 12px; font-size: 24px; }
      .up-modal p { color: #94a3b8; margin-bottom: 24px; line-height: 1.5; }
      .up-modal .up-btn { display: block; width: 100%; padding: 14px; background: #fbbf24; color: #020617; font-weight: bold; border-radius: 8px; text-decoration: none; margin-bottom: 12px; border: none; cursor: pointer; font-size: 16px; }
      .up-modal .up-btn:hover { background: #f59e0b; }
      .up-modal .close-btn { background: transparent; color: #64748b; border: none; cursor: pointer; font-size: 14px; text-decoration: underline; }
      .up-modal .close-btn:hover { color: #f87171; }
    `;
    document.head.appendChild(style);

    var overlay = document.createElement('div');
    overlay.className = 'up-modal-overlay';
    overlay.innerHTML = `
      <div class="up-modal">
        <h2>🚀 Unlock CodeWix Pro</h2>
        <p>You're using the Free plan. Upgrade to Pro to get <strong>Unlimited AI Tokens</strong>, <strong>Unlimited Live Projects</strong>, and <strong>Remove the CodeWix Watermark</strong>.</p>
        <a href="upgrade.html" class="up-btn">Upgrade Now for $5/mo</a>
        <button class="close-btn" id="closeUpModal">Maybe later</button>
      </div>
    `;
    document.body.appendChild(overlay);
    setTimeout(() => overlay.classList.add('show'), 100);
    document.getElementById('closeUpModal').onclick = function() {
      overlay.classList.remove('show');
      localStorage.setItem('lastUpgradePrompt', now);
      setTimeout(() => overlay.remove(), 300);
    };
  }

  // ======================================================================
  // PROFILE PAGE LOGIC
  // ======================================================================
  if (location.pathname.includes('profile.html')) {
    if (auth) {
      auth.onAuthStateChanged(function(user) {
        if (!user) { location.href = 'login.html'; return; }
        var name = user.displayName || user.email.split('@')[0];
        $('profName').innerHTML = name + ' <span id="profBadge" class="badge ' + (isUserPremium ? 'pro' : 'free') + '">' + (isUserPremium ? '💎 PRO' : 'Free') + '</span>';
        $('profEmail').textContent = user.email;
        $('profAvatar').textContent = name.charAt(0).toUpperCase();

        fetch('/api/my-published', { headers: { 'Authorization': 'Bearer ' + user.getIdToken() } })
        .then(res => res.json())
        .then(data => {
          var grid = $('profileSitesGrid');
          grid.innerHTML = '';
          if (!data.sites || data.sites.length === 0) {
            grid.innerHTML = '<p style="color: #64748b;">You haven\'t published any sites yet. <a href="dashboard.html" style="color: #38bdf8;">Go build one!</a></p>';
            return;
          }
          var totalViews = 0;
          data.sites.forEach(function(site) {
            totalViews += (site.views || 0);
            var card = document.createElement('a'); card.href = '/s/' + site.slug; card.target = '_blank'; card.className = 'site-card';
            card.innerHTML = `<div class="site-preview"><iframe src="/s/${site.slug}" loading="lazy" sandbox="allow-scripts"></iframe></div><div class="site-info"><h3>${escapeHtml(site.projectName || 'Untitled')}</h3><p>👁 ${site.views || 0} views</p></div>`;
            grid.appendChild(card);
          });
          $('statProjects').textContent = data.sites.length;
          $('statViews').textContent = totalViews;
        }).catch(err => { $('profileSitesGrid').innerHTML = '<p style="color: #f87171;">Failed to load sites: ' + err.message + '</p>'; });
      });
    }
  }

  // ======================================================================
  // IDE & CODE EDITOR (WITH PREMIUM ZIP LIMITS)
  // ======================================================================
  var cm = null, codeEditor = null;
  (function initCodeMirror() {
    var sourceEl = $('codeEditorSource');
    if (!sourceEl || typeof CodeMirror === 'undefined') {
      if (sourceEl) { sourceEl.style.cssText = 'display:block;width:100%;height:100%;background:#020617;color:#e2e8f0;border:none;padding:16px;font-family:monospace;'; codeEditor = { get value() { return sourceEl.value; }, set value(v) { sourceEl.value = v; }, addEventListener: function (t, fn) { if (t === 'input') sourceEl.addEventListener('input', fn); }, focus: function () { sourceEl.focus(); } }; }
      return;
    }
    cm = CodeMirror.fromTextArea(sourceEl, { theme: 'dracula', lineNumbers: true, lineWrapping: false, indentUnit: 2, tabSize: 2, smartIndent: true, autoCloseBrackets: true, autoCloseTags: true, matchBrackets: true, mode: 'htmlmixed', extraKeys: { 'Ctrl-Space': 'autocomplete', 'Tab': function (editor) { if (editor.somethingSelected()) editor.indentSelection('add'); else editor.replaceSelection('  '); } } });
    codeEditor = { get value() { return cm.getValue(); }, set value(v) { cm.setValue(v || ''); }, addEventListener: function (evt, fn) { if (evt === 'input') cm.on('change', fn); else if (evt === 'focus') cm.on('focus', fn); }, focus: function () { cm.focus(); }, _cm: cm };
    window.__codewixSetEditorMode = function (filename) { if (!cm) return; var mode = 'htmlmixed', lower = (filename || '').toLowerCase(); if (lower.endsWith('.css')) mode = 'css'; else if (lower.endsWith('.js')) mode = 'javascript'; else if (lower.endsWith('.py')) mode = 'python'; else if (lower.endsWith('.json')) mode = { name: 'javascript', json: true }; cm.setOption('mode', mode); };
  })();

  var runCodeBtn = $('runCodeBtn'), livePreviewFrame = $('livePreviewFrame'), currentFileLabel = $('currentFileLabel'), fileTreeList = $('fileTreeList'), newFileBtn = $('newFileBtn'), uploadFileBtn = $('uploadFileBtn'), hiddenFileInput = $('hiddenFileInput'), fileContextMenu = $('fileContextMenu'), unsavedIndicator = $('unsavedIndicator'), saveProjectBtn = $('saveProjectBtn'), myProjectsBtn = $('myProjectsBtn'), newProjectBtn = $('newProjectBtn'), downloadFileBtn = $('downloadFileBtn'), downloadZipBtn = $('downloadZipBtn'), shareProjectBtn = $('shareProjectBtn'), projectsModal = $('projectsModal'), projectsListBox = $('projectsListContainer'), closeModalBtn = $('closeProjectsModalBtn'), projectStatusLbl = $('projectStatusLabel');

  var renameFileBtn = $('renameFileBtn');
  if (!renameFileBtn && newFileBtn) { renameFileBtn = document.createElement('button'); renameFileBtn.id = 'renameFileBtn'; renameFileBtn.className = newFileBtn.className || 'studio-btn ghost-btn'; renameFileBtn.textContent = '✏️ Rename'; renameFileBtn.style.cssText = 'margin-left:6px;margin-right:6px;'; newFileBtn.parentNode.insertBefore(renameFileBtn, newFileBtn.nextSibling); }

  if (codeEditor || runCodeBtn || fileTreeList) {
    var DEFAULT_FILES = { 'index.html': '<h1>Hello World!</h1>\n<p>Edit me then click Build & Run.</p>\n<button onclick="hi()">Click Me</button>\n<script>\nfunction hi(){ alert("Sandbox JS works!"); }\n<\/script>', 'style.css': 'body{background:#0f172a;color:#38bdf8;text-align:center;padding-top:50px;font-family:sans-serif}h1{font-size:3rem}button{background:#34d399;border:none;padding:10px 20px;border-radius:4px;cursor:pointer;font-weight:bold}', 'script.js': 'console.log("Sandbox script running.");' };
    var files = Object.assign({}, DEFAULT_FILES), activeFile = 'index.html', currentProjectId = null, currentProjectName = null, currentShareId = null, lastSavedSnapshot = null, contextTargetFile = null;
    function snapshot() { return JSON.stringify(files); }
    function markUnsaved() { if (unsavedIndicator) unsavedIndicator.style.display = (lastSavedSnapshot !== snapshot()) ? 'inline' : 'none'; }
    function isAsset(name) { return name.indexOf('asset:') === 0; }
    function assetDisplayName(name) { return name.substring(6); }
    function iconForFile(name) { if (isAsset(name)) { var lower = name.toLowerCase(); if (lower.match(/\.(png|jpe?g|gif|webp|svg|bmp)$/)) return '🖼 '; if (lower.match(/\.(json|xml|yaml|yml)$/)) return '📋 '; return '📎 '; } if (name.endsWith('.html')) return '🌐 '; if (name.endsWith('.css')) return '🎨 '; if (name.endsWith('.js')) return '⚡ '; if (name.endsWith('.py')) return '🐍 '; return '📄 '; }
    function rebuildFileTree() { if (!fileTreeList) return; fileTreeList.innerHTML = ''; Object.keys(files).forEach(function (name) { var li = document.createElement('li'); li.className = 'file-item' + (name === activeFile ? ' active' : '') + (isAsset(name) ? ' asset-item' : ''); li.setAttribute('data-filename', name); li.textContent = iconForFile(name) + (isAsset(name) ? assetDisplayName(name) : name); fileTreeList.appendChild(li); }); if (currentFileLabel) currentFileLabel.textContent = isAsset(activeFile) ? assetDisplayName(activeFile) : activeFile; }
    function resolveAssets(html) { if (!html) return ''; return html.replace(/(src|href)=(["'])([^"'\n]+)\2/gi, function (match, attr, quote, url) { if (/^(https?:|\/\/|#|data:|mailto:|tel:)/i.test(url)) return match; var key = 'asset:' + url; if (files[key]) return attr + '=' + quote + files[key] + quote; return match; }); }
    function renderPreview() { if (!livePreviewFrame) return; if (codeEditor && !isAsset(activeFile)) files[activeFile] = codeEditor.value; var resolvedHtml = resolveAssets(files['index.html'] || ''); livePreviewFrame.srcdoc = '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>' + (files['style.css'] || '') + '</style></head><body>' + resolvedHtml + '<script>' + (files['script.js'] || '') + '<\/script></body></html>'; }
    function loadFilesIntoEditor(newFiles, projectId, projectName, shareId) { files = Object.assign({}, DEFAULT_FILES, newFiles || {}); activeFile = 'index.html'; currentProjectId = projectId || null; currentProjectName = projectName || null; currentShareId = shareId || null; lastSavedSnapshot = snapshot(); if (codeEditor) codeEditor.value = files[activeFile]; if (window.__codewixSetEditorMode) window.__codewixSetEditorMode(activeFile); rebuildFileTree(); renderPreview(); if (unsavedIndicator) unsavedIndicator.style.display = 'none'; if (projectStatusLbl) projectStatusLbl.textContent = currentProjectName ? 'Project: ' + currentProjectName : 'No project loaded'; }

    if (codeEditor) { codeEditor.value = files[activeFile]; if (window.__codewixSetEditorMode) window.__codewixSetEditorMode(activeFile); lastSavedSnapshot = snapshot(); codeEditor.addEventListener('input', function () { if (isAsset(activeFile)) return; files[activeFile] = codeEditor.value; markUnsaved(); }); }

    var remixId = localStorage.getItem('codewix_remix_project_id');
    if (remixId && db && auth && auth.currentUser) { localStorage.removeItem('codewix_remix_project_id'); db.collection('users').doc(auth.currentUser.uid).collection('projects').doc(remixId).get().then(function(doc) { if (doc.exists) { var data = doc.data(); loadFilesIntoEditor(data.files || {}, doc.id, data.name || 'Remix', null); showToast('Remix loaded!', 'success'); } }).catch(function(err) { console.error(err); }); }

    if (runCodeBtn) {
      runCodeBtn.addEventListener('click', async function () {
        var ext = activeFile.split('.').pop().toLowerCase();
        if (['html', 'css', 'js', 'htm'].includes(ext)) { renderPreview(); showToast('Preview refreshed'); var term = $('terminalOutput'); if (term) term.style.display = 'none'; return; }
        if (!auth || !auth.currentUser) { showToast('Sign in first.', 'error'); return; } if (!codeEditor) return; var code = codeEditor.value; if (!code.trim()) { showToast('No code to run.', 'error'); return; }
        var outputContainer = $('terminalOutput');
        if (!outputContainer) { outputContainer = document.createElement('div'); outputContainer.id = 'terminalOutput'; outputContainer.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;background:#020617;color:#34d399;font-family:monospace;padding:16px;overflow:auto;z-index:100;white-space:pre-wrap;'; var parent = livePreviewFrame ? livePreviewFrame.parentNode : null; if (parent) { parent.style.position = 'relative'; parent.appendChild(outputContainer); } }
        outputContainer.style.display = 'block'; outputContainer.textContent = 'Compiling and running ' + activeFile + '...\n\n';
        try {
          var idToken = await auth.currentUser.getIdToken(); var res = await fetch('/api/run', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + idToken }, body: JSON.stringify({ language: ext, code: code }) }); var data = await res.json(); if (!res.ok) throw new Error(data.error || 'Execution failed');
          var finalOutput = data.output || ''; if (!data.stderr && (finalOutput.toLowerCase().includes('<!doctype html') || finalOutput.toLowerCase().includes('<html'))) { if (livePreviewFrame) livePreviewFrame.srcdoc = finalOutput; outputContainer.style.display = 'none'; showToast('Rendered Output', 'success'); return; }
          if (data.stderr) finalOutput += '\n[Errors]:\n' + data.stderr; if (!finalOutput.trim()) finalOutput = '[Process finished with exit code ' + data.code + ']'; outputContainer.textContent = '> Running ' + activeFile + '...\n\n' + finalOutput;
          var closeBtn = document.createElement('button'); closeBtn.textContent = '✕ Close Terminal'; closeBtn.style.cssText = 'position:absolute;top:10px;right:10px;background:#ef4444;color:white;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;'; closeBtn.onclick = function() { outputContainer.style.display = 'none'; }; outputContainer.appendChild(closeBtn);
        } catch (err) { outputContainer.textContent = 'Error: ' + err.message; }
      });
    }
    renderPreview();

    if (fileTreeList) {
      fileTreeList.addEventListener('click', function (e) {
        var item = e.target.closest('.file-item'); if (!item || !codeEditor) return; if (!isAsset(activeFile)) files[activeFile] = codeEditor.value; document.querySelectorAll('.file-item').forEach(function (el) { el.classList.remove('active'); }); item.classList.add('active'); activeFile = item.getAttribute('data-filename');
        if (currentFileLabel) currentFileLabel.textContent = isAsset(activeFile) ? assetDisplayName(activeFile) : activeFile;
        if (isAsset(activeFile)) { codeEditor.value = files[activeFile]; if (cm) cm.setOption('readOnly', true); } else { if (cm) cm.setOption('readOnly', false); codeEditor.value = files[activeFile] || ''; if (window.__codewixSetEditorMode) window.__codewixSetEditorMode(activeFile); }
        if (cm) cm.focus(); var term = $('terminalOutput'); if (term) term.style.display = 'none';
      });
      fileTreeList.addEventListener('contextmenu', function (e) { var item = e.target.closest('.file-item'); if (!item) return; e.preventDefault(); contextTargetFile = item.getAttribute('data-filename'); if (fileContextMenu) { fileContextMenu.style.left = e.pageX + 'px'; fileContextMenu.style.top = e.pageY + 'px'; fileContextMenu.style.display = 'block'; } });
    }

    document.addEventListener('click', function (e) { if (fileContextMenu && !e.target.closest('#fileContextMenu')) fileContextMenu.style.display = 'none'; });

    if (fileContextMenu) { fileContextMenu.addEventListener('click', function (e) { var btn = e.target.closest('button[data-action]'); if (!btn || !contextTargetFile) return; var action = btn.getAttribute('data-action'), target = contextTargetFile; fileContextMenu.style.display = 'none'; if (action === 'delete') { if (!confirm('Delete file?')) return; delete files[target]; if (activeFile === target) { activeFile = Object.keys(files)[0] || 'index.html'; if (codeEditor) codeEditor.value = files[activeFile] || ''; if (window.__codewixSetEditorMode) window.__codewixSetEditorMode(activeFile); } rebuildFileTree(); markUnsaved(); renderPreview(); showToast('Deleted'); } }); }

    if (newFileBtn) { newFileBtn.addEventListener('click', function () { var name = prompt('New filename:'); if (!name) return; var clean = name.trim().toLowerCase(); if (files[clean] !== undefined || files['asset:' + clean] !== undefined) { alert('Exists.'); return; } files[clean] = ''; rebuildFileTree(); var li = fileTreeList.querySelector('[data-filename="' + clean + '"]'); if (li) li.click(); if (window.__codewixSetEditorMode) window.__codewixSetEditorMode(clean); markUnsaved(); }); }

    if (renameFileBtn) { renameFileBtn.addEventListener('click', function () { if (!activeFile) return; var currentName = isAsset(activeFile) ? assetDisplayName(activeFile) : activeFile; var newName = prompt('Rename to:', currentName); if (!newName) return; newName = newName.trim().toLowerCase(); if (!newName || newName === currentName) return; var key = isAsset(activeFile) ? 'asset:' + newName : newName; if (files[key] !== undefined) { alert('Exists.'); return; } files[key] = files[activeFile]; delete files[activeFile]; activeFile = key; rebuildFileTree(); markUnsaved(); renderPreview(); showToast('Renamed'); }); }

    if (uploadFileBtn && hiddenFileInput) { uploadFileBtn.addEventListener('click', function () { hiddenFileInput.click(); }); hiddenFileInput.addEventListener('change', async function () { var file = this.files && this.files[0]; if (!file) return; if (!auth || !auth.currentUser) { showToast('Sign in first.', 'error'); this.value = ''; return; } var maxSize = isUserPremium ? 5 * 1024 * 1024 : 300 * 1024; if (file.size > maxSize) { showToast('File too large.', 'error'); this.value = ''; return; } var safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]/g, '-'); try { files['asset:' + safeName] = await readFileAsDataURL(file); rebuildFileTree(); markUnsaved(); renderPreview(); showToast('Added', 'success'); } catch (err) { showToast('Failed', 'error'); } finally { hiddenFileInput.value = ''; } }); }

    if (saveProjectBtn) { saveProjectBtn.addEventListener('click', function () { if (!codeEditor || !db || !auth || !auth.currentUser) { showToast('Not ready.', 'error'); return; } if (!isAsset(activeFile)) files[activeFile] = codeEditor.value; var name = currentProjectName; if (!name) { name = prompt('Project Name:', 'My Project'); if (!name) return; name = name.trim(); if (!name) return; } saveProjectBtn.disabled = true; saveProjectBtn.textContent = 'Saving…'; var payload = { name: name, files: files, activeFile: activeFile, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }; var col = db.collection('users').doc(auth.currentUser.uid).collection('projects'); var promise; if (currentProjectId) promise = col.doc(currentProjectId).update(payload); else { payload.createdAt = firebase.firestore.FieldValue.serverTimestamp(); promise = col.add(payload).then(function (ref) { currentProjectId = ref.id; }); } promise.then(function () { currentProjectName = name; lastSavedSnapshot = snapshot(); if (unsavedIndicator) unsavedIndicator.style.display = 'none'; if (projectStatusLbl) projectStatusLbl.textContent = 'Project: ' + name; showToast('Saved ✔', 'success'); }).catch(function (err) { showToast('Failed: ' + err.message, 'error'); }).finally(function () { saveProjectBtn.disabled = false; saveProjectBtn.textContent = 'Save'; }); }); }

    // PREMIUM FEATURE: BLOCK ZIP DOWNLOAD FOR FREE USERS
    if (downloadZipBtn) { 
      downloadZipBtn.addEventListener('click', async function () { 
        if (!isUserPremium) {
          return showToast('💎 ZIP Export is a Pro feature. Upgrade to download your project files.', 'error');
        }
        if (typeof JSZip === 'undefined') { alert('ZIP missing.'); return; } 
        if (codeEditor && !isAsset(activeFile)) files[activeFile] = codeEditor.value; 
        downloadZipBtn.disabled = true; downloadZipBtn.textContent = 'Zipping…'; 
        try { var zip = new JSZip(), assetFolder = zip.folder('assets'); Object.keys(files).forEach(function (name) { if (isAsset(name)) { try { assetFolder.file(assetDisplayName(name), dataUrlToBlob(files[name]), { binary: true }); } catch (e) {} } else zip.file(name, files[name] || ''); }); downloadBlob(await zip.generateAsync({ type: 'blob' }), 'codewix-project.zip'); showToast('Downloaded', 'success'); } catch (err) { showToast('ZIP failed', 'error'); } finally { downloadZipBtn.disabled = false; downloadZipBtn.textContent = '📦 Download All'; } 
      }); 
    }
  }

  // ======================================================================
  // AI ASSISTANT (Sidebar + Streaming)
  // ======================================================================
  var chatContainer = $('chatContainer'), chatInput = $('chatInput'), sendBtn = $('sendBtn'), modelSelect = $('modelSelect'), chatStatus = $('chatStatus'), modelIndicator = $('modelIndicator'), API_URL = '/api/chat', chatTitleBar = $('chatTitleBar'), currentChatTitleEl = $('currentChatTitle'), thinkingToggle = $('thinkingToggle'), newChatBtn = $('newChatBtn'), historyBtn = $('historyBtn');

  if (chatContainer && chatInput && sendBtn) {
    var CSS = document.createElement('style');
    CSS.textContent = `.cw-chat-area{display:flex;flex-direction:row;height:100%;overflow:hidden;position:relative}#cwChatColumn{flex:1;display:flex;flex-direction:column;min-width:0}#cwHistorySidebar{width:260px;background:#0b1220;border-right:1px solid #1e293b;display:flex;flex-direction:column;transition:width .25s}.cw-chat-area.cw-sidebar-collapsed #cwHistorySidebar{width:0;border:none}#cwHistorySidebar .cw-sb-head{padding:12px;border-bottom:1px solid #1e293b;display:flex;justify-content:space-between;color:#fff;font-weight:bold}#cwHistorySidebar .cw-sb-list{flex:1;overflow-y:auto;padding:8px}#cwHistorySidebar .history-row{padding:8px;border-radius:6px;cursor:pointer;margin-bottom:4px;border:1px solid transparent}#cwHistorySidebar .history-row:hover{background:#111c33}#cwHistorySidebar .history-row.active{background:#13213c;border-color:#2563eb}#cwHistorySidebar .history-info h3{margin:0;font-size:13px;color:#e2e8f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#cwHistorySidebar .history-info p{margin:0;font-size:11px;color:#64748b}#cwHamburger{position:fixed;top:76px;left:8px;z-index:9998;background:#1e293b;color:#cbd5e1;border:1px solid #334155;border-radius:8px;padding:8px;cursor:pointer}@media(max-width:800px){#cwHistorySidebar{position:absolute;height:100%;z-index:30;transform:translateX(0);transition:transform .25s}.cw-chat-area.cw-sidebar-collapsed #cwHistorySidebar{width:260px;transform:translateX(-100%)}}`;
    document.head.appendChild(CSS);

    var chatArea = chatContainer.parentNode, sidebar = document.createElement('aside'), chatCol = document.createElement('div'), hamburger = document.createElement('button');
    if (chatArea && chatArea.tagName !== 'BODY') {
      var existing = Array.prototype.slice.call(chatArea.children); existing.forEach(function(el) { chatArea.removeChild(el); }); chatArea.className = 'cw-chat-area';
      sidebar.id = 'cwHistorySidebar'; chatCol.id = 'cwChatColumn'; chatArea.appendChild(sidebar); chatArea.appendChild(chatCol); existing.forEach(function(el) { chatCol.appendChild(el); });
      hamburger.id = 'cwHamburger'; hamburger.innerHTML = '☰'; document.body.appendChild(hamburger); if (window.innerWidth < 800) chatArea.classList.add('cw-sidebar-collapsed');
    }

    sidebar.innerHTML = `
      <div class="cw-sb-head">
        <span>Chats</span>
        <div>
          <button id="cwSbNew" style="background:none;border:none;color:#fff;cursor:pointer">+</button>
          <button id="cwSbClose" style="background:none;border:none;color:#fff;cursor:pointer">✕</button>
        </div>
      </div>
      <input type="text" id="cwSbSearch" placeholder="Search chats…" style="margin: 8px 12px; padding: 8px 10px; background: #0f172a; color: #f1f5f9; border: 1px solid #334155; border-radius: 8px; font-size: 13px; outline: none;" />
      <div class="cw-sb-list" id="cwHistoryList"></div>
    `;
    var historyListBox = $('cwHistoryList');
    var historySearchEl = $('cwSbSearch');
    if (historySearchEl) { historySearchEl.addEventListener('input', renderHistoryList); }

    function setSidebarOpen(open) { if (chatArea) { chatArea.classList.toggle('cw-sidebar-collapsed', !open); hamburger.style.display = open ? 'none' : 'block'; } }
    hamburger.onclick = function() { setSidebarOpen(true); refreshHistory(); }; $('cwSbClose').onclick = function() { setSidebarOpen(false); }; $('cwSbNew').onclick = function() { startNewChat(); setSidebarOpen(false); };

    var tokenBadge = document.createElement('div'); tokenBadge.style.cssText = 'font-size:12px;padding:4px 10px;background:#1e293b;color:#cbd5e1;border-radius:20px;font-weight:bold;margin-left:10px;display:none;'; if (modelSelect && modelSelect.parentNode) modelSelect.parentNode.appendChild(tokenBadge);

    async function updateTokenUsage() {
      if (!auth || !auth.currentUser) return;
      try {
        var idToken = await auth.currentUser.getIdToken(), res = await fetch('/api/user/usage', { headers: { 'Authorization': 'Bearer ' + idToken } }), data = await res.json();
        tokenBadge.style.display = 'inline-block';
        if (data.isPremium) tokenBadge.innerHTML = '💎 Unlimited';
        else { var rem = Math.max(0, data.limit - data.tokensUsed); tokenBadge.innerHTML = '🪙 ' + rem.toLocaleString() + ' / ' + data.limit.toLocaleString(); if (rem <= 0) { tokenBadge.innerHTML = '⚠️ Limit Reached'; tokenBadge.style.color = '#f87171'; } else if (rem < 5000) tokenBadge.style.color = '#fbbf24'; else tokenBadge.style.color = '#cbd5e1'; }
      } catch (e) {}
    }

    if (modelSelect) {
      if (!modelSelect.querySelector('option[value="llama-3.1-70b-versatile"]')) {
        var o1 = document.createElement('option'); o1.value = 'llama-3.1-70b-versatile'; o1.textContent = 'Llama 3.1 70B (Smart) - 💎 PRO'; modelSelect.appendChild(o1);
        var o2 = document.createElement('option'); o2.value = 'mixtral-8x7b-32768'; o2.textContent = 'Mixtral 8x7B - 💎 PRO'; modelSelect.appendChild(o2);
      }
      modelSelect.addEventListener('change', function () { var v = modelSelect.value; if (!isUserPremium && (v.indexOf('70b') !== -1 || v.indexOf('mixtral') !== -1)) { showToast('💎 Pro Model locked.', 'error'); modelSelect.value = 'openai/gpt-oss-120b'; } });
    }

    var attachInput = document.createElement('input'); attachInput.type = 'file'; attachInput.style.display = 'none'; attachInput.multiple = true; attachInput.accept = 'image/*,text/*,.txt,.md,.js,.ts,.py,.json,.html,.css,.csv,.log'; document.body.appendChild(attachInput);
    var attachBtn = document.createElement('button'); attachBtn.innerHTML = '📎'; attachBtn.type = 'button'; attachBtn.style.cssText = 'background:transparent;border:none;font-size:20px;cursor:pointer;padding:0 8px;color:#cbd5e1;'; if (sendBtn.parentNode) sendBtn.parentNode.insertBefore(attachBtn, sendBtn);
    var attachPreview = document.createElement('div'); attachPreview.style.cssText = 'display:none;padding:8px;background:#0f172a;border-bottom:1px solid #334155;border-radius:8px 8px 0 0;gap:8px;flex-wrap:wrap;'; if (chatInput.parentNode) chatInput.parentNode.insertBefore(attachPreview, chatInput);

    var pendingAttachments = [];
    attachBtn.onclick = function () { attachInput.click(); };
    attachInput.onchange = async function () {
      var files = Array.from(this.files); if (!files.length) return;
      for (var file of files) {
        if (file.type.startsWith('video/')) { showToast('Videos not supported.', 'error'); continue; } if (file.size > 4 * 1024 * 1024) { showToast('Max 4MB', 'error'); continue; }
        var isImage = file.type.startsWith('image/');
        try { pendingAttachments.push({ name: file.name, type: isImage ? 'image' : 'text', data: isImage ? await resizeImage(file, 1024, 1024) : await readFileAsText(file) }); renderAttachPreview(); } catch (err) { showToast('Failed to read', 'error'); }
      } this.value = '';
    };
    function renderAttachPreview() {
      attachPreview.innerHTML = ''; if (pendingAttachments.length === 0) { attachPreview.style.display = 'none'; return; } attachPreview.style.display = 'flex';
      pendingAttachments.forEach(function (att, idx) {
        var chip = document.createElement('div'); chip.style.cssText = 'display:flex;align-items:center;gap:4px;background:#1e293b;border:1px solid #334155;border-radius:16px;padding:4px 10px;font-size:12px;color:#f8fafc;';
        if (att.type === 'image') { var img = document.createElement('img'); img.src = att.data; img.style.cssText = 'width:24px;height:24px;object-fit:cover;border-radius:4px;'; chip.appendChild(img); }
        var nameSpan = document.createElement('span'); nameSpan.textContent = att.name; chip.appendChild(nameSpan);
        var rm = document.createElement('button'); rm.type = 'button'; rm.innerHTML = '✕'; rm.style.cssText = 'background:none;border:none;color:#f87171;cursor:pointer;font-weight:bold;padding:0 4px;'; rm.onclick = function () { pendingAttachments.splice(idx, 1); renderAttachPreview(); }; chip.appendChild(rm); attachPreview.appendChild(chip);
      });
    }

    var SYSTEM_PROMPT = { role: 'system', content: 'You are the CodeWix AI Assistant. Help users learn to code, debug, and build projects. Tone: encouraging, never condescending. ALWAYS wrap code in triple-backticks. You cannot generate images or videos directly.' };
    var conversation = [SYSTEM_PROMPT], currentChatId = null, currentChatTitle = '', saveTimer = null, authUser = null, currentUserName = 'User', historyCache = [];

    function getUsername() { if (auth && auth.currentUser) { if (auth.currentUser.displayName) return auth.currentUser.displayName.trim(); if (auth.currentUser.email) return auth.currentUser.email.split('@')[0]; } return 'User'; }
    function chatsCollection() { if (!db || !authUser) return null; return db.collection('users').doc(authUser.uid).collection('chats'); }
    function updateTitleBar() { if (chatTitleBar && currentChatTitleEl) { chatTitleBar.style.display = currentChatTitle ? 'flex' : 'none'; if (currentChatTitle) currentChatTitleEl.textContent = currentChatTitle; } }
    function scheduleSave() { clearTimeout(saveTimer); saveTimer = setTimeout(function () { saveChatNow(); }, 700); }
    function setStatus(msg) { if (chatStatus) chatStatus.textContent = msg; }
    function setLoading(l) { sendBtn.disabled = l; chatInput.disabled = l; attachBtn.disabled = l; sendBtn.textContent = l ? 'Thinking…' : 'Send'; }

    async function saveChatNow() {
      if (!authUser || !db) return; var msgs = conversation.filter(function (m) { return m.role !== 'system'; }); if (!msgs.length) return; var col = chatsCollection(); if (!col) return;
      var firstUser = msgs.find(function (m) { return m.role === 'user'; }), title = currentChatTitle;
      if (!title && firstUser) { var t = typeof firstUser.content === 'string' ? firstUser.content : ((firstUser.content.find(function (c) { return c.type === 'text'; }) || {}).text || '[Attachment]'); title = t.replace(/\s+/g, ' ').trim().substring(0, 48); if (t.length > 48) title += '…'; } if (!title) title = 'New Chat';
      var sanitized = msgs.map(function (m) { if (Array.isArray(m.content)) return { role: m.role, content: m.content.map(function (p) { return p.type === 'image_url' ? { type: 'text', text: '[Image]' } : p; }) }; return m; });
      var payload = { title: title, messages: sanitized, updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
      try { if (currentChatId) { await col.doc(currentChatId).update(payload); } else { payload.createdAt = firebase.firestore.FieldValue.serverTimestamp(); var ref = await col.add(payload); currentChatId = ref.id; refreshHistory(); } currentChatTitle = title; updateTitleBar(); } catch (err) { console.warn(err); }
    }

    function renderConversation() { chatContainer.innerHTML = ''; conversation.forEach(function (m) { if (m.role === 'user') { var d = appendMessage('user'); setUserMessage(d, m.content); } else if (m.role === 'assistant') { var d2 = appendMessage('assistant'); setAssistantMessage(d2, m.content, ''); } }); chatContainer.scrollTop = chatContainer.scrollHeight; }
    function loadChat(id, data) { currentChatId = id || null; currentChatTitle = (data && data.title) || ''; var saved = (data && data.messages) || []; conversation = [SYSTEM_PROMPT].concat(saved); updateTitleBar(); if (saved.length) renderConversation(); else showWelcome(); markActiveInSidebar(currentChatId); }
    function startNewChat() { currentChatId = null; currentChatTitle = ''; conversation = [SYSTEM_PROMPT]; updateTitleBar(); showWelcome(); chatInput.focus(); markActiveInSidebar(null); }
    function showWelcome() { chatContainer.innerHTML = '<div class="chat-message assistant-message"><div class="message-role">Assistant</div><div class="message-content"><div class="text-part">Dear ' + escapeHtml(currentUserName) + ', hello! Ask me anything.</div></div></div>'; }

    function renderContent(text) {
      var parts = String(text).split(/```/), html = '', blockCount = 0; for (var b = 1; b < parts.length; b += 2) if (parts[b] && parts[b].trim()) blockCount++;
      for (var i = 0; i < parts.length; i++) {
        if (i % 2 === 0) { var chunk = parts[i]; if (!chunk) continue; var escaped = escapeHtml(chunk).replace(/`([^`\n]+)`/g, '<code>$1</code>'); html += '<div class="text-part">' + escaped.replace(/\n/g, '<br>') + '</div>'; } 
        else {
          var body = parts[i], lang = 'code', filename = null, nl = body.indexOf('\n');
          if (nl !== -1) { var firstLine = body.substring(0, nl).trim(), m = firstLine.match(/^([a-zA-Z0-9_-]+)(?:\s+(?:filename=["']?([^"'\s]+)["']?|([^"'\s]+)))?$/); if (m) { lang = m[1]; if (m[2]) filename = m[2]; else if (m[3]) filename = m[3]; body = body.substring(nl + 1); } }
          body = body.replace(/\n$/, ''); var publishLabel = blockCount > 1 ? '🚀 Publish All' : '🚀 Publish', displayTitle = filename || lang;
          html += '<div class="code-block" data-lang="' + escapeHtml(lang) + '"' + (filename ? ' data-filename="' + escapeHtml(filename) + '"' : '') + '><div class="code-header"><span class="code-lang">' + escapeHtml(displayTitle) + '</span><div class="code-actions"><button type="button" class="publish-ai-btn">' + publishLabel + '</button><button type="button" class="send-to-editor-btn">⚡ Send to Editor</button><button type="button" class="download-code-btn">⬇</button><button type="button" class="copy-btn">Copy</button></div></div><pre><code>' + escapeHtml(body) + '</code></pre></div>';
        }
      } return html;
    }

    function appendMessage(role) { var div = document.createElement('div'); div.className = 'chat-message ' + (role === 'user' ? 'user-message' : 'assistant-message'); div.innerHTML = '<div class="message-role">' + (role === 'user' ? 'You' : 'Assistant') + '</div><div class="message-content"></div>'; chatContainer.appendChild(div); chatContainer.scrollTop = chatContainer.scrollHeight; return div; }
    function setUserMessage(div, content) {
      var c = div.querySelector('.message-content'), html = '';
      if (typeof content === 'string') html = '<div class="text-part">' + escapeHtml(content).replace(/\n/g, '<br>') + '</div>';
      else if (Array.isArray(content)) { content.forEach(function (part) { if (part.type === 'text') { if (part.text.indexOf('--- File:') === -1) html += '<div class="text-part">' + escapeHtml(part.text).replace(/\n/g, '<br>') + '</div>'; } else if (part.type === 'image_url') { html += '<div style="margin-top:8px;"><img src="' + part.image_url.url + '" style="max-width:200px;border-radius:8px;border:1px solid #334155;"/></div>'; } }); }
      c.innerHTML = html;
    }
    function setAssistantMessage(div, content, reasoning) { var c = div.querySelector('.message-content'), html = ''; if (reasoning) html += '<details class="reasoning-section"><summary>Thinking</summary><div class="reasoning-content">' + escapeHtml(reasoning) + '</div></details>'; html += renderContent(content); c.innerHTML = html; }

    function onUserReady(user) { authUser = user; currentUserName = getUsername(); updateTokenUsage(); var col = chatsCollection(); if (!col) { startNewChat(); return; } col.orderBy('updatedAt', 'desc').limit(1).get().then(function (snap) { if (snap.empty) startNewChat(); else { var doc = snap.docs[0]; loadChat(doc.id, doc.data()); if (!doc.data().messages || doc.data().messages.length === 0) showWelcome(); } refreshHistory(); }).catch(function () { startNewChat(); }); }
    if (auth) auth.onAuthStateChanged(function (user) { if (user) onUserReady(user); });

    async function refreshHistory() {
      if (!historyListBox) return; var col = chatsCollection(); if (!col) { historyListBox.innerHTML = '<p class="cw-sb-empty" style="padding:20px;text-align:center;color:#64748b;">Sign in first.</p>'; return; }
      try { var snap = await col.orderBy('updatedAt', 'desc').limit(100).get(); historyCache = snap.docs.map(function (d) { return { id: d.id, data: d.data() || {} }; }); renderHistoryList(); } 
      catch (err) { historyListBox.innerHTML = '<p class="cw-sb-empty" style="padding:20px;text-align:center;color:#64748b;">Failed: ' + escapeHtml(err.message) + '</p>'; }
    }
    
    function renderHistoryList() {
      if (!historyListBox) return; 
      var q = (historySearchEl && historySearchEl.value || '').toLowerCase().trim(), items = historyCache;
      if (q) items = items.filter(function (it) { return (it.data.title || 'Untitled').toLowerCase().indexOf(q) !== -1; });
      historyListBox.innerHTML = '';
      if (!items.length) { historyListBox.innerHTML = '<p class="cw-sb-empty" style="padding:20px;text-align:center;color:#64748b;">' + (q ? 'No matches.' : 'No history yet.') + '</p>'; return; }
      items.forEach(function (it) {
        var data = it.data, count = (data.messages || []).length, row = document.createElement('div');
        row.className = 'history-row' + (it.id === currentChatId ? ' active' : ''); row.setAttribute('data-id', it.id);
        row.innerHTML = '<div class="history-info"><h3>' + escapeHtml(data.title || 'Untitled') + '</h3><p>' + formatDate(data.updatedAt) + ' · ' + count + ' msg' + (count === 1 ? '' : 's') + '</p></div><div class="history-actions"><button type="button" data-action="delete" data-id="' + it.id + '" class="danger" title="Delete">🗑️</button></div>';
        historyListBox.appendChild(row);
      });
    }
    function markActiveInSidebar(id) { if (!historyListBox) return; Array.prototype.forEach.call(historyListBox.querySelectorAll('.history-row'), function (row) { row.classList.toggle('active', row.getAttribute('data-id') === id); }); }

    if (historyListBox) {
      historyListBox.addEventListener('click', async function (e) {
        var btn = e.target.closest('button[data-action]'), row = e.target.closest('.history-row');
        if (btn) {
          e.stopPropagation(); var id = btn.getAttribute('data-id');
          if (btn.getAttribute('data-action') === 'delete') {
            if (!confirm('Delete this chat?')) return;
            try { await chatsCollection().doc(id).delete(); if (id === currentChatId) startNewChat(); showToast('Deleted'); refreshHistory(); } catch (err) { showToast('Failed: ' + err.message, 'error'); }
          } return;
        }
        if (!row) return; var rid = row.getAttribute('data-id');
        if (rid === currentChatId) { if (window.innerWidth < 800) setSidebarOpen(false); return; }
        try { var doc = await chatsCollection().doc(rid).get(); if (!doc.exists) { showToast('Not found.', 'error'); return; } loadChat(doc.id, doc.data()); if (window.innerWidth < 800) setSidebarOpen(false); setStatus('Loaded'); } catch (err) { showToast('Failed: ' + err.message, 'error'); }
      });
    }

    chatContainer.addEventListener('click', function (e) {
      var btn = e.target.closest('button'); if (!btn) return; var block = btn.closest('.code-block'); if (!block) return;
      var codeEl = block.querySelector('pre code'), code = codeEl ? codeEl.textContent : '', lang = block.getAttribute('data-lang') || 'txt', filename = block.getAttribute('data-filename') || ('snippet.' + lang);
      if (btn.classList.contains('copy-btn')) { (navigator.clipboard ? navigator.clipboard.writeText(code) : Promise.reject()).then(function () { showToast('Code copied'); }).catch(function () { showToast('Copy failed', 'error'); }); }
      else if (btn.classList.contains('download-code-btn')) { var blob = new Blob([code], { type: 'text/plain' }), url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); setTimeout(function () { URL.revokeObjectURL(url); }, 1000); }
      else if (btn.classList.contains('send-to-editor-btn')) { try { localStorage.setItem('cw_pending_code', JSON.stringify({ code: code, lang: lang, filename: filename, ts: Date.now() })); window.dispatchEvent(new CustomEvent('codewix:send-to-editor', { detail: { code: code, lang: lang, filename: filename } })); showToast('Sent to editor'); } catch (_) { showToast('Failed to send', 'error'); } }
      else if (btn.classList.contains('publish-ai-btn')) { try { localStorage.setItem('cw_publish_code', JSON.stringify({ code: code, lang: lang, filename: filename, ts: Date.now() })); window.dispatchEvent(new CustomEvent('codewix:publish-code', { detail: { code: code, lang: lang, filename: filename } })); showToast('Publish requested'); } catch (_) { showToast('Failed to publish', 'error'); } }
    });

    async function sendToGroq(userText) {
      var model = modelSelect ? modelSelect.value : 'openai/gpt-oss-120b', showThinking = thinkingToggle ? thinkingToggle.checked : false;
      if (!authUser) { showToast('Sign in first.', 'error'); return; }
      var hasImages = pendingAttachments.some(function (a) { return a.type === 'image'; });
      if (hasImages && !/vision/.test(model)) { model = 'meta-llama/llama-4-scout-17b-16e-instruct'; if (modelSelect) modelSelect.value = model; showToast('Switched to vision model', 'success'); }
      if (modelIndicator) modelIndicator.textContent = model; currentUserName = getUsername();
      var dynamicSystemPrompt = { role: 'system', content: SYSTEM_PROMPT.content + '\n\nBegin EVERY response with: "Dear ' + currentUserName + ', "' };
      if (conversation.length === 1 && chatContainer.querySelector('.assistant-message')) chatContainer.innerHTML = '';
      var userContentPayload = userText;
      if (pendingAttachments.length > 0) { userContentPayload = [{ type: 'text', text: userText }]; pendingAttachments.forEach(function (att) { if (att.type === 'image') userContentPayload.push({ type: 'image_url', image_url: { url: att.data } }); else userContentPayload[0].text += '\n\n--- File: ' + att.name + ' ---\n' + att.data + '\n--- End File ---'; }); }
      conversation.push({ role: 'user', content: userContentPayload }); var userDiv = appendMessage('user'); setUserMessage(userDiv, userContentPayload); scheduleSave(); pendingAttachments = []; renderAttachPreview();
      
      var assistantDiv = appendMessage('assistant'), messageContent = assistantDiv.querySelector('.message-content');
      messageContent.innerHTML = '<div class="text-part"><span class="typing-dot">●</span><span class="typing-dot">●</span><span class="typing-dot">●</span></div>';
      setLoading(true); setStatus(showThinking ? 'Thinking…' : 'Generating…');
      
      try {
        var idToken = await authUser.getIdToken(), messagesToSend;
        if (hasImages) { var history = conversation.filter(function (m) { return m.role !== 'system'; }); messagesToSend = history.map(function (m, index) { if (index === history.length - 1 && m.role === 'user') { if (typeof m.content === 'string') return { role: 'user', content: dynamicSystemPrompt.content + '\n\n' + m.content }; if (Array.isArray(m.content)) return { role: 'user', content: m.content.map(function (part) { if (part.type === 'text') return { type: 'text', text: dynamicSystemPrompt.content + '\n\n' + part.text }; return part; }) }; } return m; }); }
        else { messagesToSend = [dynamicSystemPrompt].concat(conversation.filter(function (m) { return m.role !== 'system'; })); }
        
        var payload = { model: model, messages: messagesToSend, temperature: 0.7, max_completion_tokens: 2048 }; if (showThinking && !/vision/.test(model)) payload.reasoning_effort = 'medium';
        
        var response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + idToken }, body: JSON.stringify(payload) });
        
        if (!response.ok) {
          if (response.status === 429) { messageContent.innerHTML = '<div class="text-part" style="color:#fbbf24;padding:15px;background:#1e293b;border-radius:8px;border:1px solid #fbbf24;">👋 <strong>You\'re on a roll!</strong> You\'ve used up your free daily tokens.<br><br>Upgrade to <strong>CodeWix Pro</strong> for unlimited AI, the 70B smart model, and 5MB uploads. <a href="upgrade.html" style="color:#fbbf24;text-decoration:underline;font-weight:bold;">Upgrade now →</a></div>'; conversation.pop(); setStatus('Limit reached'); updateTokenUsage(); return; }
          if (response.status === 401) { messageContent.innerHTML = '<div class="text-part" style="color:#f87171;">Session expired. Please sign in again.</div>'; conversation.pop(); setStatus('Expired'); return; }
          var errText = ''; try { errText = await response.text(); } catch (_) {}
          messageContent.innerHTML = '<div class="text-part" style="color:#f87171;">Error ' + response.status + ': ' + escapeHtml((errText || response.statusText || 'Request failed').slice(0, 300)) + '</div>'; conversation.pop(); setStatus('Failed'); return;
        }

        if (!response.body) throw new Error('No response body');
        var reader = response.body.getReader(), decoder = new TextDecoder('utf-8'), reply = '', reasoning = '', buffer = '', streamDone = false, uiScheduled = false;
        function scheduleUI() { if (uiScheduled) return; uiScheduled = true; requestAnimationFrame(function () { uiScheduled = false; messageContent.innerHTML = '<div class="text-part">' + escapeHtml(reply).replace(/\n/g, '<br>') + '</div>'; chatContainer.scrollTop = chatContainer.scrollHeight; }); }

        while (!streamDone) {
          var chunk = await reader.read(); if (chunk.done) break; buffer += decoder.decode(chunk.value, { stream: true });
          var lines = buffer.split(/\r?\n/); buffer = lines.pop(); 
          for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim(); if (!line || line.indexOf('data:') !== 0) continue; var dataStr = line.slice(5).trim();
            if (dataStr === '[DONE]') { streamDone = true; break; }
            try { var parsed = JSON.parse(dataStr), delta = parsed && parsed.choices && parsed.choices[0] && parsed.choices[0].delta; if (delta) { if (delta.content) { reply += delta.content; scheduleUI(); } if (delta.reasoning_content) reasoning += delta.reasoning_content; else if (delta.reasoning) reasoning += delta.reasoning; } } catch (parseErr) {}
          }
        }
        if (buffer.trim().indexOf('data:') === 0) { var tail = buffer.trim().slice(5).trim(); if (tail && tail !== '[DONE]') { try { var p2 = JSON.parse(tail), d2 = p2 && p2.choices && p2.choices[0] && p2.choices[0].delta; if (d2 && d2.content) reply += d2.content; } catch (_) {} } }
        if (!reply) reply = '(No content returned)';
        setAssistantMessage(assistantDiv, reply, reasoning); conversation.push({ role: 'assistant', content: reply }); scheduleSave(); setStatus('Ready'); updateTokenUsage();
      } catch (err) {
        messageContent.innerHTML = '<div class="text-part" style="color:#f87171;">Error: ' + escapeHtml(err.message || String(err)) + '</div>'; conversation.pop(); setStatus('Failed');
      } finally { setLoading(false); chatContainer.scrollTop = chatContainer.scrollHeight; chatInput.focus(); }
    }

    function handleSend() { var text = chatInput.value.trim(); if (!text && pendingAttachments.length === 0) return; chatInput.value = ''; chatInput.style.height = 'auto'; sendToGroq(text); }
    sendBtn.addEventListener('click', handleSend); chatInput.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } });
    if (newChatBtn) newChatBtn.addEventListener('click', function () { clearTimeout(saveTimer); saveChatNow(); startNewChat(); pendingAttachments = []; renderAttachPreview(); setStatus('New chat'); showToast('New chat started'); });
  }

  // ======================================================================
  // LEARN (PREMIUM LESSONS LOCK)
  // ======================================================================
  if ($('lessonTitle') && $('lessonBody')) {
    var LESSONS = [
      { title: 'HTML: Page Structure', level: 'Beginner', lang: 'html', concept: 'Every HTML page starts with a doctype.', code: '<!DOCTYPE html>\n<html>\n  <head>\n    <title>My First Page</title>\n  </head>\n  <body>\n    <h1>Hello World!</h1>\n  </body>\n</html>', exercise: 'Create an HTML page with an h1.', hint: 'Use <h1>I am learning</h1>' },
      { title: 'HTML: Links and Images', level: 'Beginner', lang: 'html', concept: 'Use the <a> tag for links.', code: '<a href="https://google.com">Google</a>', exercise: 'Create a link.', hint: 'Use <a>' },
      { title: 'CSS: Basics', level: 'Beginner', lang: 'css', concept: 'CSS changes how HTML looks.', code: 'body { background: #0f172a; }', exercise: 'Change background.', hint: 'body { }' },
      { title: 'JS: Variables', level: 'Beginner', lang: 'javascript', concept: 'Use let for variables.', code: 'let name = "Alice";', exercise: 'Create a variable.', hint: 'let x = 1;' },
      { title: 'JS: Functions', level: 'Beginner', lang: 'javascript', concept: 'Functions are reusable.', code: 'function greet() {}', exercise: 'Write a function.', hint: 'function() {}' },
      { title: 'PRO: Advanced APIs', level: 'Intermediate', lang: 'javascript', concept: 'Fetch data from APIs.', code: 'fetch("url").then()', exercise: 'Fetch an API.', hint: 'fetch()' },
      { title: 'PRO: CSS Grid', level: 'Intermediate', lang: 'css', concept: 'CSS Grid layout.', code: 'display: grid;', exercise: 'Make a grid.', hint: 'grid' },
      { title: 'PRO: React Basics', level: 'Intermediate', lang: 'javascript', concept: 'Components.', code: 'function App() {}', exercise: 'Make a component.', hint: 'React' }
    ]; // Shortened array for brevity, keep your full one here
    
    var progressData = { completed: {}, streak: 1, startDate: null }, authUserL = null;
    function progressDocRef() { if (!db || !authUserL) return null; return db.collection('users').doc(authUserL.uid).collection('progress').doc('state'); }
    function todayISO() { return new Date().toISOString().slice(0, 10); }
    
    function renderLesson(idx) {
      var lesson = LESSONS[idx]; if (!lesson) return;
      
      // PREMIUM LOCK: Lessons past index 4 (the 5th lesson) are locked
      if (!isUserPremium && idx > 4) {
        $('lessonTitle').textContent = "🔒 Locked Lesson";
        $('lessonBody').innerHTML = `
          <div style="text-align:center; padding: 40px 20px; background: #1e293b; border-radius: 12px; border: 1px solid #334155; margin-top: 20px;">
            <h2 style="color: #fbbf24; margin-bottom: 12px;">💎 Upgrade to Pro</h2>
            <p style="color: #cbd5e1; margin-bottom: 24px;">This is an advanced lesson. Free users only have access to the first 5 foundational lessons.</p>
            <a href="upgrade.html" class="button" style="background: #fbbf24; color: #020617; text-decoration: none;">Upgrade to Unlock</a>
          </div>
        `;
        return;
      }

      $('lessonTitle').textContent = lesson.title;
      if ($('lessonDayLabel')) $('lessonDayLabel').textContent = 'Day ' + (idx + 1) + ' of ' + LESSONS.length;
      
      var isDone = !!progressData.completed[idx];
      $('lessonBody').innerHTML = `
        <div class="lesson-meta"><span class="lesson-level level-${lesson.level.toLowerCase()}">${lesson.level}</span><span class="lesson-lang">${lesson.lang}</span></div>
        <div class="lesson-section"><h3>Concept</h3><p>${lesson.concept}</p></div>
        <div class="lesson-section"><h3>Example</h3><div class="code-block" data-lang="${lesson.lang}"><div class="code-header"><span class="code-lang">${lesson.lang}</span><button type="button" class="copy-btn" data-code="${escapeHtml(lesson.code)}">Copy</button></div><pre><code>${escapeHtml(lesson.code)}</code></pre></div></div>
        <div class="lesson-section"><h3>Your Turn</h3><p>${lesson.exercise}</p><details class="hint-reveal"><summary>Show hint</summary><p>${lesson.hint}</p></details></div>
        <div class="lesson-actions"><a href="dashboard.html" class="button">Try in Workspace →</a><button type="button" class="complete-btn${isDone ? ' done' : ''}" id="completeBtn" data-index="${idx}">${isDone ? '✓ Completed' : 'Mark Complete'}</button></div>
      `;
    }

    if (auth) auth.onAuthStateChanged(function(user) { if (user) { authUserL = user; renderLesson(0); } });
  }

  // ======================================================================
  // EXPLORE & PROFILE & PUBLISH
  // ======================================================================
  if ($('exploreGrid')) {
    fetch('/api/explore').then(function(r) { return r.json(); }).then(function(data) {
      var grid = $('exploreGrid'); grid.innerHTML = '';
      if(!data.sites || !data.sites.length) { grid.innerHTML = '<p style="color:#64748b;text-align:center;">No sites published yet.</p>'; return; }
      data.sites.forEach(function(site) {
        var card = document.createElement('a'); card.href = '/s/' + site.slug; card.target = '_blank'; card.className = 'site-card';
        card.innerHTML = `<div class="site-preview"><iframe src="/s/${site.slug}" loading="lazy" sandbox="allow-scripts"></iframe></div><div class="site-info"><h3>${escapeHtml(site.projectName || 'Untitled')}</h3><p>@${escapeHtml(site.username)}</p></div>`;
        grid.appendChild(card);
      });
    }).catch(function(err) { console.error(err); });
  }

  if ($('publishForm')) {
    var projectSelect = $('projectSelect');
    if (auth && db) {
      auth.onAuthStateChanged(function(user) {
        if (!user) return;
        db.collection('users').doc(user.uid).collection('projects').orderBy('updatedAt', 'desc').get().then(function(snap) {
          projectSelect.innerHTML = '<option value="">Choose a project…</option>';
          snap.forEach(function(doc) { var opt = document.createElement('option'); opt.value = doc.id; opt.textContent = doc.data().name || 'Untitled'; projectSelect.appendChild(opt); });
        });
      });
    }
    $('publishForm').addEventListener('submit', async function(e) {
      e.preventDefault();
      var slug = $('publishSlug').value.trim().toLowerCase(), name = $('publishName').value.trim(), id = projectSelect.value;
      if (!id || !slug || !name) return showToast('Fill all fields.', 'error');
      var btn = this.querySelector('button[type="submit"]'); btn.disabled = true; btn.textContent = 'Publishing...';
      try {
        var proj = await db.collection('users').doc(auth.currentUser.uid).collection('projects').doc(id).get();
        var token = await auth.currentUser.getIdToken();
        var res = await fetch('/api/publish', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }, body: JSON.stringify({ slug: slug, projectName: name, files: proj.data().files }) });
        var data = await res.json(); if (!res.ok) throw new Error(data.error);
        showToast('Published successfully!', 'success'); this.reset();
      } catch (err) { showToast(err.message, 'error'); } finally { btn.disabled = false; btn.textContent = 'Publish'; }
    });
  }

  // UPGRADE PAGE TOKEN REFRESH
  if (window.location.search.includes('status=success') && auth && auth.currentUser) {
      showToast('Verifying payment... please wait.', 'success');
      auth.currentUser.getIdToken(true).then(function() {
          showToast('Upgrade successful! Welcome to Pro.', 'success');
          window.history.replaceState({}, document.title, window.location.pathname);
          setTimeout(function() { window.location.reload(); }, 2000);
      }).catch(function(error) { console.error("Error refreshing token:", error); });
  }

}); // end DOMContentLoaded
