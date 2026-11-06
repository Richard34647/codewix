// ==========================================================================
// CodeWix — script.js (Full Master File)
// ==========================================================================

console.log('[CodeWix] script.js evaluated');

// ==========================================================================
// PWA (PROGRESSIVE WEB APP) REGISTRATION
// ==========================================================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => console.log('[CodeWix] Service Worker registered!'))
      .catch(error => console.log('[CodeWix] Service Worker registration failed:', error));
  });
}

document.addEventListener('contextmenu', event => event.preventDefault());
document.addEventListener('keydown', function (e) {
  if (e.keyCode === 123) { e.preventDefault(); return false; }
  if (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) { e.preventDefault(); return false; }
  if (e.ctrlKey && (e.keyCode === 85 || e.keyCode === 83)) { e.preventDefault(); return false; }
  if (e.metaKey && (e.keyCode === 83 || e.keyCode === 85)) { e.preventDefault(); return false; }
});

window.addEventListener('DOMContentLoaded', function () {
  var auth = null, db = null, storage = null, isUserPremium = false, isUserAdmin = false;

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
      if (firebase.storage) storage = firebase.storage();
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
  function formatDate(ts) { if (!ts) return ''; var d = ts.toDate ? ts.toDate() : new Date(ts); return d.toLocaleDateString() + ' ' + d.toLocaleTimeString(); }
  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
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
  // GLOBAL BAN CHECK & NAV & THEME & NOTIFICATIONS
  // ======================================================================
  var ADMIN_EMAIL = 'wilcoxr889@gmail.com';
  var isAdminPage = location.pathname.toLowerCase().includes('admin.html');
  var isDashboardPage = location.pathname.toLowerCase().includes('dashboard.html');
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

    // NOTIFICATION BELL
    var notifBtn = document.createElement('button'); notifBtn.id = 'notifBellBtn'; notifBtn.className = 'theme-toggle-btn'; notifBtn.innerHTML = '🔔'; notifBtn.title = 'Notifications'; notifBtn.style.position = 'relative';
    var badge = document.createElement('span'); badge.id = 'notifBadge'; badge.style.cssText = 'position:absolute;top:0;right:0;width:8px;height:8px;background:#ef4444;border-radius:50%;display:none;'; notifBtn.appendChild(badge);
    navMenu.appendChild(notifBtn);
    
    var notifModal = document.createElement('div'); notifModal.id = 'notifModal'; notifModal.style.cssText = 'display:none; position:fixed; top:70px; right:20px; width:320px; background:#1e293b; border:1px solid #334155; border-radius:12px; z-index:10000; box-shadow:0 10px 30px rgba(0,0,0,0.5); overflow:hidden;';
    notifModal.innerHTML = `<div style="padding:12px; border-bottom:1px solid #334155; display:flex; justify-content:space-between; align-items:center;"><h3 style="margin:0; color:#e2e8f0; font-size:14px;">Notifications</h3><button id="closeNotifBtn" style="background:none;border:none;color:#f87171;cursor:pointer;font-size:16px;">✕</button></div><div id="notifList" style="max-height:300px; overflow-y:auto; padding:0;"><p style="padding:20px; text-align:center; color:#64748b;">Loading...</p></div>`;
    document.body.appendChild(notifModal);
    
    notifBtn.addEventListener('click', function() { notifModal.style.display = notifModal.style.display === 'none' ? 'block' : 'none'; badge.style.display = 'none'; });
    document.getElementById('closeNotifBtn').addEventListener('click', function() { notifModal.style.display = 'none'; });
  }

  if (auth) {
    auth.onAuthStateChanged(async function(user) {
      if (!user) return;
      
      // GLOBAL BAN CHECK
      if (db) {
        try {
          const userDoc = await db.collection('users').doc(user.uid).get();
          if (userDoc.exists && userDoc.data().banned === true) { window.location.href = 'ban.html'; return; }
        } catch (e) {}
      }

      const tokenResult = await user.getIdTokenResult();
      isUserPremium = tokenResult.claims.premium === true; 
      isUserAdmin = user.email === ADMIN_EMAIL;

      // FETCH NOTIFICATIONS
      if (db) {
        try {
          const snap = await db.collection('notifications').orderBy('createdAt', 'desc').limit(10).get();
          const notifList = document.getElementById('notifList');
          const badge = document.getElementById('notifBadge');
          if (notifList) {
            if (snap.empty) { notifList.innerHTML = '<p style="padding:20px; text-align:center; color:#64748b;">No notifications yet.</p>'; } 
            else {
              let html = ''; let latestTime = 0;
              snap.forEach(doc => {
                const n = doc.data(); const time = n.createdAt ? n.createdAt.toMillis() : Date.now();
                if (time > latestTime) latestTime = time;
                html += `<div style="padding:12px; border-bottom:1px solid #334155;"><h4 style="margin:0 0 4px 0; color:#38bdf8; font-size:13px;">${escapeHtml(n.title)}</h4><p style="margin:0; color:#cbd5e1; font-size:12px; line-height:1.4;">${escapeHtml(n.message)}</p></div>`;
              });
              notifList.innerHTML = html;
              const lastRead = localStorage.getItem('lastReadNotif') || 0;
              if (latestTime > lastRead && badge) { badge.style.display = 'block'; localStorage.setItem('lastReadNotif', latestTime); }
            }
          }
        } catch(e) {}
      }

      if (navMenu && !isAdminPage) {
        if (!document.getElementById('profileNavLink')) {
          var profLink = document.createElement('a'); profLink.href = 'profile.html'; profLink.id = 'profileNavLink'; profLink.textContent = 'Profile'; navMenu.appendChild(profLink);
        }
        if (isUserAdmin && !document.getElementById('adminNavBtn')) {
          var adminBtn = document.createElement('a'); adminBtn.href = 'admin.html'; adminBtn.id = 'adminNavBtn'; adminBtn.innerHTML = '👑 Admin';
          adminBtn.style.cssText = 'background:#38bdf8;color:#020617;padding:6px 12px;border-radius:6px;font-weight:bold;margin-left:10px;text-decoration:none;'; navMenu.appendChild(adminBtn);
        }
        if (isUserPremium && !document.getElementById('proNavBadge')) {
          var proBadge = document.createElement('span'); proBadge.id = 'proNavBadge'; proBadge.innerHTML = '💎 PRO';
          proBadge.style.cssText = 'background:#fbbf24;color:#020617;padding:4px 8px;border-radius:6px;font-weight:bold;font-size:12px;margin-left:10px;'; navMenu.appendChild(proBadge);
        }
        var upgradeBtn = document.getElementById('upgradeNavBtn');
        if (!isUserPremium && !isUserAdmin && !upgradeBtn) {
          upgradeBtn = document.createElement('a'); upgradeBtn.href = 'upgrade.html'; upgradeBtn.id = 'upgradeNavBtn'; upgradeBtn.innerHTML = '⭐ Upgrade';
          upgradeBtn.style.cssText = 'background:#fbbf24;color:#020617;padding:6px 12px;border-radius:6px;font-weight:bold;margin-left:10px;text-decoration:none;'; navMenu.appendChild(upgradeBtn);
        } else if (isUserPremium && upgradeBtn) { upgradeBtn.remove(); }
        if (!isUserPremium && !isUserAdmin) { showUpgradePopup(); }
      }
    });
  }

  var path = location.pathname.toLowerCase();
  var protectedPages = ['dashboard.html', 'ai-assistance.html', 'learn.html', 'publish.html', 'admin.html'];
  if (auth && protectedPages.some(function (p) { return path.indexOf(p) !== -1; })) {
    auth.onAuthStateChanged(async function (user) {
      if (!user) { location.replace('login.html'); return; }
      if (!user.emailVerified) { alert('Please verify your email to access this page.'); auth.signOut().then(function () { location.replace('login.html'); }); return; }
      if (db) { const doc = await db.collection('users').doc(user.uid).get(); if (doc.exists && doc.data().banned === true) { window.location.href = 'ban.html'; return; } }
      if (isAdminPage && user.email !== ADMIN_EMAIL) { location.replace('dashboard.html'); return; }
      if ($('dashUser')) $('dashUser').textContent = user.email.split('@')[0];
      if ($('userEmail')) $('userEmail').textContent = user.email;
    });
  }

  function logout(e) { if (e) e.preventDefault(); if (!auth) { location.href = 'login.html'; return; } auth.signOut().then(function () { location.replace('login.html'); }); }
  if ($('logoutBtn')) $('logoutBtn').addEventListener('click', logout);
  if ($('logoutLink')) $('logoutLink').addEventListener('click', logout);

  // ======================================================================
  // REGISTER, LOGIN, AUTH
  // ======================================================================
  if ($('registerForm')) {
    $('registerForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var email = $('email').value.trim(), password = $('password').value, username = $('username') ? $('username').value.trim() : '';
      var errBox = $('errorBox'); hideError(errBox); if (!auth) { showError(errBox, 'Firebase not loaded.'); return; }
      var submitBtn = $('registerForm').querySelector('button[type="submit"]'), orig = submitBtn ? submitBtn.textContent : 'Sign Up';
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Creating…'; }

      auth.createUserWithEmailAndPassword(email, password).then(function (uc) {
        var user = uc.user; if (username && user.updateProfile) return user.updateProfile({ displayName: username }).then(function () { return user; }); return user;
      }).then(function (user) {
        if (db) db.collection('users').doc(user.uid).set({ email: user.email, displayName: username || '', createdAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
        return fetch('/api/send-verification-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userEmail: user.email, userName: username || user.email.split('@')[0], redirectUrl: window.location.origin + '/verify.html' }) }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); });
      }).then(function (result) {
        if (!result.ok) { showError(errBox, 'Verification email failed: ' + (result.data.error || 'unknown')); if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = orig; } return; }
        alert('Registration successful! Check your inbox.'); window.location.href = 'login.html';
      }).catch(function (err) {
        var msg = err.message; if (err.code === 'auth/email-already-in-use') msg = 'That email is already registered.'; else if (err.code === 'auth/weak-password') msg = 'Password must be at least 6 characters.';
        showError(errBox, msg); if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = orig; }
      });
    });
  }

  if ($('loginForm')) {
    var pendingVerificationEmail = null;
    $('loginForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var email = $('email').value.trim(), password = $('password').value, errBox = $('errorBox');
      if (errBox) { errBox.className = 'error-box'; errBox.innerHTML = ''; errBox.style.display = 'none'; }
      if (!auth) { showError(errBox, 'Firebase not loaded.'); return; }
      var submitBtn = $('loginForm').querySelector('button[type="submit"]'), orig = submitBtn ? submitBtn.textContent : 'Log In';
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Logging in…'; }

      auth.signInWithEmailAndPassword(email, password).then(function (uc) {
        var user = uc.user;
        if (!user.emailVerified) { pendingVerificationEmail = user.email; return auth.signOut().then(function () { if (errBox) { errBox.innerHTML = '<div style="margin-bottom:10px;">Please verify your email before logging in.</div><button type="button" class="resend-verify-btn">Resend verification email</button>'; errBox.style.display = 'block'; } }); }
        alert('Login successful!'); window.location.href = 'dashboard.html';
      }).catch(function (err) {
        if (err.code === 'auth/user-disabled') { window.location.href = 'ban.html'; return; }
        var msg = err.message; if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') msg = 'Incorrect email or password.'; else if (err.code === 'auth/user-not-found') msg = 'No account found.';
        showError(errBox, msg);
      }).finally(function () { if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = orig; } });
    });
  }

  function handleGoogleAuth(buttonId, errBoxId) {
    if ($(buttonId)) {
      $(buttonId).addEventListener('click', function () {
        var errBox = $(errBoxId); hideError(errBox); if (!auth) { showError(errBox, 'Firebase not loaded.'); return; }
        auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()).then(function (result) {
          if (!result.user.emailVerified) { return auth.signOut().then(function () { showError(errBox, 'Please verify your Google email.'); }); }
          if (db) db.collection('users').doc(result.user.uid).set({ email: result.user.email, displayName: result.user.displayName || '', createdAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
          window.location.href = 'dashboard.html';
        }).catch(function (error) { 
          if (error.code === 'auth/popup-closed-by-user') return; 
          if (error.code === 'auth/user-disabled') { window.location.href = 'ban.html'; return; }
          showError(errBox, error.message); 
        });
      });
    }
  }
  handleGoogleAuth('googleLoginBtn', 'errorBox'); handleGoogleAuth('googleRegisterBtn', 'errorBox');

  if ($('forgotForm')) {
    $('forgotForm').addEventListener('submit', function (e) {
      e.preventDefault(); var email = $('email').value.trim(); var errBox = $('errorBox'), okBox = $('successBox'); hideError(errBox); if (okBox) okBox.style.display = 'none';
      if (!auth) { showError(errBox, 'Firebase not loaded.'); return; }
      var submitBtn = $('forgotForm').querySelector('button[type="submit"]'), orig = submitBtn ? submitBtn.textContent : 'Send Link';
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Sending…'; }
      auth.sendPasswordResetEmail(email, { url: window.location.origin + '/login.html?reset=success', handleCodeInApp: false }).then(function () {
        if (okBox) { okBox.textContent = 'If an account exists, we sent a link.'; okBox.style.display = 'block'; }
      }).catch(function (err) {
        if (err.code === 'auth/user-not-found') { if (okBox) { okBox.textContent = 'If an account exists, we sent a link.'; okBox.style.display = 'block'; } return; }
        showError(errBox, err.message);
      }).finally(function () { if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = orig; } });
    });
  }

  // ======================================================================
  // UPGRADE POPUP
  // ======================================================================
  function showUpgradePopup() {
    const validPages = ['dashboard.html', 'ai-assistance.html', 'publish.html', 'explore.html'];
    if (!validPages.some(p => location.pathname.includes(p))) return;
    const lastPrompt = localStorage.getItem('lastUpgradePrompt');
    const now = Date.now();
    if (lastPrompt && (now - lastPrompt) < 3 * 24 * 60 * 60 * 1000) return;

    var style = document.createElement('style');
    style.innerHTML = `.up-modal-overlay { position: fixed; inset: 0; background: rgba(2,6,23,0.8); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px; opacity: 0; transition: opacity 0.3s; pointer-events: none; } .up-modal-overlay.show { opacity: 1; pointer-events: auto; } .up-modal { background: #1e293b; border: 1px solid #38bdf8; border-radius: 16px; padding: 32px; max-width: 420px; width: 100%; text-align: center; position: relative; box-shadow: 0 20px 60px rgba(56,189,248,0.2); transform: translateY(20px); transition: transform 0.3s; } .up-modal-overlay.show .up-modal { transform: translateY(0); } .up-modal h2 { color: #e2e8f0; margin-bottom: 12px; font-size: 24px; } .up-modal p { color: #94a3b8; margin-bottom: 24px; line-height: 1.5; } .up-modal .up-btn { display: block; width: 100%; padding: 14px; background: #fbbf24; color: #020617; font-weight: bold; border-radius: 8px; text-decoration: none; margin-bottom: 12px; border: none; cursor: pointer; font-size: 16px; } .up-modal .up-btn:hover { background: #f59e0b; } .up-modal .close-btn { background: transparent; color: #64748b; border: none; cursor: pointer; font-size: 14px; text-decoration: underline; } .up-modal .close-btn:hover { color: #f87171; }`;
    document.head.appendChild(style);

    var overlay = document.createElement('div'); overlay.className = 'up-modal-overlay';
    overlay.innerHTML = `<div class="up-modal"><h2>🚀 Unlock CodeWix Pro</h2><p>You're using the Free plan. Upgrade to Pro to get <strong>Unlimited AI Tokens</strong>, <strong>Unlimited Live Projects</strong>, and <strong>Remove the CodeWix Watermark</strong>.</p><a href="upgrade.html" class="up-btn">Upgrade Now for $5/mo</a><button class="close-btn" id="closeUpModal">Maybe later</button></div>`;
    document.body.appendChild(overlay);
    setTimeout(() => overlay.classList.add('show'), 100);
    document.getElementById('closeUpModal').onclick = function() { overlay.classList.remove('show'); localStorage.setItem('lastUpgradePrompt', now); setTimeout(() => overlay.remove(), 300); };
  }

  // ======================================================================
  // ADMIN DASHBOARD LOGIC
  // ======================================================================
  if (isAdminPage) {
    document.querySelectorAll('.nav-btn[data-target]').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        document.querySelectorAll('.nav-btn').forEach(function(b) { b.classList.remove('active'); });
        document.querySelectorAll('.tab-section').forEach(function(s) { s.classList.remove('active'); });
        e.target.classList.add('active'); 
        var targetId = e.target.getAttribute('data-target'), targetEl = $(targetId); 
        if (targetEl) targetEl.classList.add('active');
        if (targetId === 'dashboard') loadStats(); if (targetId === 'users') loadUsers(); if (targetId === 'projects') loadProjects(); if (targetId === 'analytics') loadAnalytics(); if (targetId === 'notifications') loadAdminNotifications(); if (targetId === 'support') loadAdminSupport();
      });
    });
    
    var getToken = async function() { if (!auth.currentUser) throw new Error("Not logged in"); return await auth.currentUser.getIdToken(true); };

    var loadStats = async function() {
      try {
        const res = await fetch('/api/admin/stats', { headers: { 'Authorization': 'Bearer ' + await getToken() } }); 
        if (!res.ok) throw new Error('Failed to load stats');
        const data = await res.json(); 
        if ($('statUsers')) $('statUsers').textContent = data.totalUsers; if ($('statPremium')) $('statPremium').textContent = data.premiumUsers; if ($('statProjects')) $('statProjects').textContent = data.totalProjects; if ($('statLessons')) $('statLessons').textContent = data.totalLessons;
      } catch (err) { showToast(err.message, 'error'); }
    };

    var loadUsers = async function() {
      try {
        const res = await fetch('/api/admin/users', { headers: { 'Authorization': 'Bearer ' + await getToken() } }); const data = await res.json();
        const tbody = $('adminUsersTable') ? $('adminUsersTable').querySelector('tbody') : null; if (!tbody) return;
        if (!data.users || data.users.length === 0) { tbody.innerHTML = '<tr><td colspan="5">No users found.</td></tr>'; return; }
        tbody.innerHTML = data.users.map(u => `<tr><td>${escapeHtml(u.email)}</td><td>${escapeHtml(u.displayName)}</td><td>${u.banned ? '<span style="color:#ef4444;font-weight:bold;">BANNED</span>' : 'Active'}</td><td><span class="badge ${u.premium ? 'premium' : 'free'}">${u.premium ? 'Premium' : 'Free'}</span></td><td><button class="btn btn-warning toggle-premium-btn" data-uid="${u.uid}">${u.premium ? 'Revoke Pro' : 'Make Pro'}</button>${u.banned ? `<button class="btn btn-success unban-btn" data-uid="${u.uid}">Unban</button>` : `<button class="btn btn-danger ban-btn" data-uid="${u.uid}">Ban</button>`}</td></tr>`).join('');
      } catch (err) { showToast(err.message, 'error'); }
    };

    var loadProjects = async function() {
      try {
        if (!db) throw new Error("Firestore not initialized");
        const snap = await db.collection('published').orderBy('updatedAt', 'desc').get(); const tbody = $('adminProjectsTable') ? $('adminProjectsTable').querySelector('tbody') : null; if (!tbody) return;
        if (snap.empty) { tbody.innerHTML = '<tr><td colspan="5">No projects published yet.</td></tr>'; return; }
        tbody.innerHTML = snap.docs.map(doc => { const p = doc.data(); const updateDate = p.updatedAt ? formatDate(p.updatedAt) : 'Unknown'; return `<tr><td>${escapeHtml(p.projectName || 'Untitled')}</td><td><a href="/s/${doc.id}" target="_blank" style="color:#38bdf8;">/s/${doc.id}</a></td><td><small>${escapeHtml(p.username || 'Unknown')}</small></td><td>${updateDate}</td><td><button class="btn btn-warning takedown-btn" data-slug="${doc.id}">Take Down</button></td></tr>`; }).join('');
      } catch (err) { showToast(err.message, 'error'); }
    };

    var loadAnalytics = async function() {
      try {
        const res = await fetch('/api/admin/analytics', { headers: { 'Authorization': 'Bearer ' + await getToken() } }); const data = await res.json();
        if ($('statTokensToday')) $('statTokensToday').textContent = (data.totalTokensToday || 0).toLocaleString(); const list = $('topConsumersList'); if (!list) return;
        if (!data.topConsumers || data.topConsumers.length === 0) { list.innerHTML = '<p style="color:#64748b;">No AI usage today.</p>'; return; }
        list.innerHTML = data.topConsumers.map(c => `<div class="consumer-row"><span>${escapeHtml(c.email)}</span><span style="color:#fbbf24; font-weight:bold;">${c.tokens.toLocaleString()} tokens</span></div>`).join('');
      } catch (err) { showToast(err.message, 'error'); }
    };

    var loadAdminNotifications = async function() {
      try {
        if (!db) return; const snap = await db.collection('notifications').orderBy('createdAt', 'desc').get(); const tbody = $('adminNotifTable') ? $('adminNotifTable').querySelector('tbody') : null; if (!tbody) return;
        if (snap.empty) { tbody.innerHTML = '<tr><td colspan="3">No notifications found.</td></tr>'; return; }
        tbody.innerHTML = snap.docs.map(doc => { const n = doc.data(); return `<tr><td>${escapeHtml(n.title)}</td><td>${escapeHtml(n.message)}</td><td><button class="btn btn-danger delete-notif-btn" data-id="${doc.id}">Delete</button></td></tr>`; }).join('');
      } catch (err) { showToast(err.message, 'error'); }
    };

    if ($('addNotifForm')) {
      $('addNotifForm').addEventListener('submit', async function(e) {
        e.preventDefault(); const title = $('notifTitle').value.trim(); const message = $('notifMessage').value.trim(); if (!title || !message) return showToast('Fill both fields.', 'error');
        const btn = this.querySelector('button[type="submit"]'); btn.disabled = true; btn.textContent = 'Adding...';
        try { await fetch('/api/admin/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + await getToken() }, body: JSON.stringify({ title, message }) }); showToast('Notification added!', 'success'); this.reset(); loadAdminNotifications(); } catch (err) { showToast(err.message, 'error'); } finally { btn.disabled = false; btn.textContent = 'Add Notification'; }
      });
    }

    // Support Chat Admin Logic
    var activeTicketId = null;
    var unsubscribeAdminChat = null;

    var loadAdminSupport = async function() {
      if (!db) return;
      const list = $('adminTicketList');
      try {
        const snap = await db.collection('support_tickets').orderBy('updatedAt', 'desc').get();
        if (snap.empty) { list.innerHTML = '<p style="padding: 20px; color: #64748b;">No open tickets.</p>'; return; }
        list.innerHTML = snap.docs.map(doc => { const t = doc.data(); return `<div class="ticket-item" data-id="${doc.id}" style="padding: 15px; border-bottom: 1px solid var(--border); cursor: pointer; transition: 0.2s;" onmouseover="this.style.background='#1e293b'" onmouseout="this.style.background='transparent'"><h4 style="margin: 0 0 5px 0; color: #e2e8f0;">${escapeHtml(t.userEmail)}</h4><p style="margin: 0; font-size: 12px; color: #64748b;">${t.status === 'open' ? '🔴 Open' : '🟢 Closed'} · ${t.messages.length} msgs</p></div>`; }).join('');
        
        document.querySelectorAll('.ticket-item').forEach(el => {
          el.onclick = () => openAdminChat(el.getAttribute('data-id'));
        });
      } catch (err) { list.innerHTML = `<p style="padding: 20px; color: #f87171;">Error: ${err.message}</p>`; }
    };

    var openAdminChat = async function(id) {
      activeTicketId = id;
      if (unsubscribeAdminChat) unsubscribeAdminChat();
      
      const doc = await db.collection('support_tickets').doc(id).get();
      if (!doc.exists) return;
      
      $('adminChatHeader').textContent = 'Chatting with: ' + doc.data().userEmail;
      $('adminChatInput').disabled = false;
      $('adminChatSend').disabled = false;
      
      unsubscribeAdminChat = db.collection('support_tickets').doc(id).onSnapshot(snap => {
        if (!snap.exists) return;
        const msgs = snap.data().messages || [];
        const box = $('adminChatMessages');
        box.innerHTML = msgs.map(m => `<div style="max-width: 80%; padding: 10px; border-radius: 8px; font-size: 14px; ${m.sender === 'admin' ? 'align-self: flex-end; background: #38bdf8; color: #020617;' : 'align-self: flex-start; background: #1e293b; color: #e2e8f0;'}">${escapeHtml(m.text)}</div>`).join('');
        box.scrollTop = box.scrollHeight;
      });
    };

    if ($('adminChatSend')) {
      $('adminChatSend').onclick = async () => {
        const text = $('adminChatInput').value.trim();
        if (!text || !activeTicketId) return;
        $('adminChatInput').value = '';
        try {
          await db.collection('support_tickets').doc(activeTicketId).update({
            messages: firebase.firestore.FieldValue.arrayUnion({ sender: 'admin', text: text, timestamp: Date.now() }),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        } catch (e) { showToast('Failed to send', 'error'); }
      };
      $('adminChatInput').addEventListener('keypress', (e) => { if (e.key === 'Enter') $('adminChatSend').click(); });
    }

    document.addEventListener('click', async function(e) {
      if (e.target.classList.contains('toggle-premium-btn')) { const uid = e.target.getAttribute('data-uid'); e.target.disabled = true; try { await fetch('/api/admin/update-user', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + await getToken() }, body: JSON.stringify({ uid, action: 'toggle-premium' }) }); showToast('User premium status updated.', 'success'); loadUsers(); } catch (err) { showToast(err.message, 'error'); e.target.disabled = false; } }
      if (e.target.classList.contains('ban-btn')) { if (!confirm('Are you sure you want to BAN this user?')) return; const uid = e.target.getAttribute('data-uid'); e.target.disabled = true; try { await fetch('/api/admin/ban-user', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + await getToken() }, body: JSON.stringify({ uid, action: 'ban' }) }); showToast('User banned.', 'success'); loadUsers(); } catch (err) { showToast(err.message, 'error'); e.target.disabled = false; } }
      if (e.target.classList.contains('unban-btn')) { const uid = e.target.getAttribute('data-uid'); e.target.disabled = true; try { await fetch('/api/admin/ban-user', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + await getToken() }, body: JSON.stringify({ uid, action: 'unban' }) }); showToast('User unbanned.', 'success'); loadUsers(); } catch (err) { showToast(err.message, 'error'); e.target.disabled = false; } }
      if (e.target.classList.contains('takedown-btn')) { if (!confirm('Are you sure? This will permanently delete this site.')) return; const slug = e.target.getAttribute('data-slug'); e.target.disabled = true; try { await db.collection('published').doc(slug).delete(); showToast('Site taken down.', 'success'); loadProjects(); } catch (err) { showToast(err.message, 'error'); e.target.disabled = false; } }
      if (e.target.classList.contains('delete-notif-btn')) { if (!confirm('Delete this notification?')) return; const id = e.target.getAttribute('data-id'); e.target.disabled = true; try { await fetch('/api/admin/notifications/' + id, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + await getToken() } }); showToast('Notification deleted.', 'success'); loadAdminNotifications(); } catch (err) { showToast(err.message, 'error'); e.target.disabled = false; } }
    });

    if (auth) auth.onAuthStateChanged(function(user) { if (user) loadStats(); });
  }

  // ======================================================================
  // PROFILE PAGE LOGIC
  // ======================================================================
  if (location.pathname.includes('profile.html')) {
    if (auth) {
      auth.onAuthStateChanged(async function(user) {
        if (!user) { location.href = 'login.html'; return; }
        const tokenResult = await user.getIdTokenResult(); const isPremiumUser = tokenResult.claims.premium === true;
        var name = user.displayName || user.email.split('@')[0];
        if($('profName')) $('profName').innerHTML = name + ' <span id="profBadge" class="badge ' + (isPremiumUser ? 'pro' : 'free') + '">' + (isPremiumUser ? '💎 PRO' : 'Free') + '</span>' + (isPremiumUser ? ' <span style="color:#38bdf8; font-size:16px;" title="Verified Pro User">☑️</span>' : '');
        if($('profEmail')) $('profEmail').textContent = user.email; if($('profAvatar')) $('profAvatar').textContent = name.charAt(0).toUpperCase();
        user.getIdToken().then(function(token) {
          fetch('/api/my-published', { headers: { 'Authorization': 'Bearer ' + token } }).then(res => res.json()).then(data => {
            var grid = $('profileSitesGrid'); if(!grid) return; grid.innerHTML = '';
            if (!data.sites || data.sites.length === 0) { grid.innerHTML = '<p style="color: #64748b;">You haven\'t published any sites yet. <a href="dashboard.html" style="color: #38bdf8;">Go build one!</a></p>'; if($('statProjects')) $('statProjects').textContent = '0'; if($('statViews')) $('statViews').textContent = '0'; return; }
            var totalViews = 0;
            data.sites.forEach(function(site) { totalViews += (site.views || 0); var card = document.createElement('div'); card.className = 'site-card'; card.innerHTML = `<div class="site-preview"><iframe src="/s/${site.slug}" loading="lazy" sandbox="allow-scripts"></iframe></div><div class="site-info"><h3>${escapeHtml(site.projectName || 'Untitled')}</h3><p>👁 ${site.views || 0} views</p><a href="site-settings.html?slug=${site.slug}" class="domain-btn" style="text-decoration:none; display:block; text-align:center;">⚙️ Settings</a></div>`; grid.appendChild(card); });
            if($('statProjects')) $('statProjects').textContent = data.sites.length; if($('statViews')) $('statViews').textContent = totalViews;
          }).catch(err => { if($('profileSitesGrid')) $('profileSitesGrid').innerHTML = '<p style="color: #f87171;">Failed to load sites: ' + err.message + '</p>'; });
        });
      });
    }
  }

  // ======================================================================
  // SUPPORT WIDGET (USERS)
  // ======================================================================
  if (isDashboardPage && auth) {
    var supportBtn = document.createElement('button');
    supportBtn.innerHTML = '🎧';
    supportBtn.style.cssText = 'position:fixed; bottom:30px; right:30px; width:60px; height:60px; border-radius:50%; background:#38bdf8; color:#020617; font-size:30px; border:none; cursor:pointer; box-shadow:0 4px 15px rgba(56,189,248,0.4); z-index:9999; display:flex; align-items:center; justify-content:center;';
    document.body.appendChild(supportBtn);

    var supportModal = document.createElement('div');
    supportModal.style.cssText = 'display:none; position:fixed; bottom:100px; right:30px; width:350px; height:450px; background:#1e293b; border:1px solid #334155; border-radius:12px; z-index:9999; flex-direction:column; box-shadow:0 10px 40px rgba(0,0,0,0.5); overflow:hidden;';
    supportModal.innerHTML = `
      <div style="padding:15px; background:#0f172a; border-bottom:1px solid #334155; display:flex; justify-content:space-between; align-items:center;">
        <h3 style="margin:0; color:#e2e8f0; font-size:16px;">🎧 Need Help?</h3>
        <button id="closeSupport" style="background:none;border:none;color:#f87171;cursor:pointer;font-size:20px;">✕</button>
      </div>
      <div id="supportMessages" style="flex:1; padding:15px; overflow-y:auto; display:flex; flex-direction:column; gap:10px;">
        <div style="background:#1e293b; color:#cbd5e1; padding:10px; border-radius:8px; font-size:14px; align-self:flex-start;">Hi there! How can we help you today?</div>
      </div>
      <div style="padding:15px; border-top:1px solid #334155; display:flex; gap:10px;">
        <input type="text" id="supportInput" placeholder="Type a message..." style="flex:1; padding:10px; border-radius:6px; border:1px solid #334155; background:#0f172a; color:white;">
        <button id="supportSend" class="button" style="padding:10px 15px; font-size:14px;">Send</button>
      </div>
    `;
    document.body.appendChild(supportModal);

    var currentTicketId = null;

    supportBtn.onclick = () => { supportModal.style.display = 'flex'; };
    document.getElementById('closeSupport').onclick = () => { supportModal.style.display = 'none'; };

    auth.onAuthStateChanged(async (user) => {
      if (!user) return;
      const snap = await db.collection('support_tickets').where('userId', '==', user.uid).where('status', '==', 'open').get();
      if (!snap.empty) {
        currentTicketId = snap.docs[0].id;
        db.collection('support_tickets').doc(currentTicketId).onSnapshot(doc => {
          if (!doc.exists) return;
          const msgs = doc.data().messages || [];
          const box = document.getElementById('supportMessages');
          box.innerHTML = msgs.map(m => `<div style="max-width: 80%; padding: 10px; border-radius: 8px; font-size: 14px; ${m.sender === 'user' ? 'align-self: flex-end; background: #38bdf8; color: #020617;' : 'align-self: flex-start; background: #1e293b; color: #e2e8f0;'}">${escapeHtml(m.text)}</div>`).join('');
          box.scrollTop = box.scrollHeight;
        });
      }
    });

    document.getElementById('supportSend').onclick = async () => {
      const text = document.getElementById('supportInput').value.trim();
      if (!text) return;
      const user = auth.currentUser;
      if (!user) return;
      
      document.getElementById('supportInput').value = '';
      
      try {
        if (!currentTicketId) {
          const ref = await db.collection('support_tickets').add({
            userId: user.uid,
            userEmail: user.email,
            status: 'open',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            messages: [{ sender: 'user', text: text, timestamp: Date.now() }]
          });
          currentTicketId = ref.id;
        } else {
          await db.collection('support_tickets').doc(currentTicketId).update({
            messages: firebase.firestore.FieldValue.arrayUnion({ sender: 'user', text: text, timestamp: Date.now() }),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        }
      } catch (e) { showToast('Failed to send message.', 'error'); }
    };
    document.getElementById('supportInput').addEventListener('keypress', (e) => { if (e.key === 'Enter') document.getElementById('supportSend').click(); });
  }

  // ======================================================================
  // IDE & CODE EDITOR
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
    var files = Object.assign({}, DEFAULT_FILES), activeFile = 'index.html', currentProjectId = null, currentProjectName = null, currentShareId = null, lastSavedSnapshot = null, contextTargetFile = null, autoSaveTimer = null;
    
    function snapshot() { return JSON.stringify(files); }
    function markUnsaved() { if (unsavedIndicator) unsavedIndicator.style.display = (lastSavedSnapshot !== snapshot()) ? 'inline' : 'none'; }
    function isAsset(name) { return name.indexOf('asset:') === 0; }
    function assetDisplayName(name) { return name.substring(6); }
    function iconForFile(name) { if (isAsset(name)) { var lower = name.toLowerCase(); if (lower.match(/\.(png|jpe?g|gif|webp|svg|bmp)$/)) return '🖼 '; if (lower.match(/\.(json|xml|yaml|yml)$/)) return '📋 '; return '📎 '; } if (name.endsWith('.html')) return '🌐 '; if (name.endsWith('.css')) return '🎨 '; if (name.endsWith('.js')) return '⚡ '; if (name.endsWith('.py')) return '🐍 '; return '📄 '; }
    function rebuildFileTree() { if (!fileTreeList) return; fileTreeList.innerHTML = ''; Object.keys(files).forEach(function (name) { var li = document.createElement('li'); li.className = 'file-item' + (name === activeFile ? ' active' : '') + (isAsset(name) ? ' asset-item' : ''); li.setAttribute('data-filename', name); li.textContent = iconForFile(name) + (isAsset(name) ? assetDisplayName(name) : name); fileTreeList.appendChild(li); }); if (currentFileLabel) currentFileLabel.textContent = isAsset(activeFile) ? assetDisplayName(activeFile) : activeFile; }
    function resolveAssets(html) { if (!html) return ''; return html.replace(/(src|href)=(["'])([^"'\n]+)\2/gi, function (match, attr, quote, url) { if (/^(https?:|\/\/|#|data:|mailto:|tel:)/i.test(url)) return match; var key = 'asset:' + url; if (files[key]) return attr + '=' + quote + files[key] + quote; return match; }); }
    function renderPreview() { if (!livePreviewFrame) return; if (codeEditor && !isAsset(activeFile)) files[activeFile] = codeEditor.value; var resolvedHtml = resolveAssets(files['index.html'] || ''); livePreviewFrame.srcdoc = '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>' + (files['style.css'] || '') + '</style></head><body>' + resolvedHtml + '<script>' + (files['script.js'] || '') + '<\/script></body></html>'; }
    
    // AUTO-SAVE LOGIC
    function triggerAutoSave() {
      clearTimeout(autoSaveTimer);
      autoSaveTimer = setTimeout(async () => {
        if (!currentProjectId || !db || !auth.currentUser) return;
        if (lastSavedSnapshot === snapshot()) return;
        
        if (!isAsset(activeFile)) files[activeFile] = codeEditor.value;
        var payload = { files: files, updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
        
        try {
          await db.collection('users').doc(auth.currentUser.uid).collection('projects').doc(currentProjectId).update(payload);
          lastSavedSnapshot = snapshot();
          if (unsavedIndicator) unsavedIndicator.style.display = 'none';
          if (projectStatusLbl) projectStatusLbl.textContent = 'Project: ' + currentProjectName + ' (Auto-saved)';
        } catch(e) { console.warn("Auto-save failed", e); }
      }, 3000);
    }

    function loadFilesIntoEditor(newFiles, projectId, projectName, shareId) { files = Object.assign({}, DEFAULT_FILES, newFiles || {}); activeFile = 'index.html'; currentProjectId = projectId || null; currentProjectName = projectName || null; currentShareId = shareId || null; lastSavedSnapshot = snapshot(); if (codeEditor) codeEditor.value = files[activeFile]; if (window.__codewixSetEditorMode) window.__codewixSetEditorMode(activeFile); rebuildFileTree(); renderPreview(); if (unsavedIndicator) unsavedIndicator.style.display = 'none'; if (projectStatusLbl) projectStatusLbl.textContent = currentProjectName ? 'Project: ' + currentProjectName : 'No project loaded'; }

    if (codeEditor) { codeEditor.value = files[activeFile]; if (window.__codewixSetEditorMode) window.__codewixSetEditorMode(activeFile); lastSavedSnapshot = snapshot(); codeEditor.addEventListener('input', function () { if (isAsset(activeFile)) return; files[activeFile] = codeEditor.value; markUnsaved(); triggerAutoSave(); }); }

    // PROJECT TEMPLATES
    var TEMPLATES = {
      blank: { name: 'Blank Project', files: { 'index.html': '<h1>New Project</h1>', 'style.css': 'body { font-family: sans-serif; text-align: center; }', 'script.js': '' } },
      portfolio: { name: 'Personal Portfolio', files: { 'index.html': '<header><h1>My Name</h1><p>Web Developer</p></header><section id="about"><h2>About Me</h2><p>I build things for the web.</p></section><section id="projects"><h2>Projects</h2><div class="grid"><div class="card">Project 1</div><div class="card">Project 2</div></div></section>', 'style.css': 'body { font-family: Arial; margin: 0; background: #f4f4f4; color: #333; } header { text-align: center; padding: 50px; background: #222; color: white; } .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; padding: 20px; } .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }', 'script.js': 'console.log("Portfolio loaded");' } },
      landing: { name: 'Startup Landing Page', files: { 'index.html': '<nav><h2>StartupX</h2><a href="#" class="cta">Sign Up</a></nav><div class="hero"><h1>Build Faster.</h1><p>The ultimate tool for developers.</p><button>Get Started</button></div>', 'style.css': 'body { margin: 0; font-family: sans-serif; background: #0f172a; color: white; } nav { display: flex; justify-content: space-between; padding: 20px 50px; align-items: center; } .hero { text-align: center; padding: 100px 20px; } .hero h1 { font-size: 4rem; margin: 0; } .cta, button { background: #38bdf8; color: #020617; padding: 10px 20px; border-radius: 5px; text-decoration: none; font-weight: bold; border: none; cursor: pointer; font-size: 1.2rem; }', 'script.js': '' } }
    };

    if (newProjectBtn) {
      newProjectBtn.addEventListener('click', function() {
        let html = `<div id="tplModal" class="modal-backdrop" style="display:flex; z-index:99999;"><div class="modal" style="max-width:500px;"><div class="modal-header"><h2>Choose a Template</h2><button class="modal-close" id="closeTpl">×</button></div><div class="modal-body" style="display:flex; flex-direction:column; gap:10px;">`;
        Object.keys(TEMPLATES).forEach(key => {
          html += `<button class="btn btn-primary tpl-btn" data-tpl="${key}" style="padding: 15px; font-size: 16px; text-align: left;">${TEMPLATES[key].name}</button>`;
        });
        html += `</div></div></div>`;
        document.body.insertAdjacentHTML('beforeend', html);
        document.getElementById('closeTpl').onclick = () => document.getElementById('tplModal').remove();
        document.querySelectorAll('.tpl-btn').forEach(btn => {
          btn.onclick = () => {
            const tpl = TEMPLATES[btn.getAttribute('data-tpl')];
            loadFilesIntoEditor(tpl.files, null, tpl.name, null);
            document.getElementById('tplModal').remove();
            showToast('Template loaded! Save it to keep it.');
          };
        });
      });
    }

    // FIREBASE STORAGE UPLOAD
    if (uploadFileBtn && hiddenFileInput) {
      uploadFileBtn.addEventListener('click', function () { hiddenFileInput.click(); });
      hiddenFileInput.addEventListener('change', async function () {
        var file = this.files && this.files[0]; if (!file) return;
        if (!auth || !auth.currentUser) { showToast('Sign in first.', 'error'); this.value = ''; return; }
        if (!storage) { showToast('Storage not initialized.', 'error'); this.value = ''; return; }
        
        var maxSize = isUserPremium ? 5 * 1024 * 1024 : 300 * 1024;
        if (file.size > maxSize) { 
            if (!isUserPremium) {
                showToast('💎 Upgrade to Pro to upload files larger than 300KB!', 'error'); 
            } else {
                showToast('File too large. Max 5MB.', 'error'); 
            }
            this.value = ''; 
            return; 
        }
        
        var safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]/g, '-');
        uploadFileBtn.textContent = 'Uploading...';
        
        try {
          var storageRef = storage.ref('users/' + auth.currentUser.uid + '/assets/' + Date.now() + '_' + safeName);
          var snapshot = await storageRef.put(file);
          var downloadURL = await snapshot.ref.getDownloadURL();
          
          files['asset:' + safeName] = downloadURL;
          rebuildFileTree(); markUnsaved(); renderPreview(); triggerAutoSave();
          showToast('Uploaded to Storage!', 'success');
        } catch (err) { 
          console.error(err);
          showToast('Upload failed: ' + err.message, 'error'); 
        } finally { 
          hiddenFileInput.value = ''; 
          uploadFileBtn.textContent = '📤 Upload';
        }
      });
    }

    // GITHUB EXPORT (PRO)
    var exportGithubBtn = document.createElement('button');
    exportGithubBtn.className = 'studio-btn';
    exportGithubBtn.innerHTML = '🐙 Export to GitHub';
    exportGithubBtn.style.marginLeft = '10px';
    if (downloadZipBtn && downloadZipBtn.parentNode) { downloadZipBtn.parentNode.insertBefore(exportGithubBtn, downloadZipBtn.nextSibling); }

    exportGithubBtn.addEventListener('click', async function() {
        if (!isUserPremium) return showToast('💎 GitHub Export is a Pro feature.', 'error');
        if (!codeEditor) return;
        if (!isAsset(activeFile)) files[activeFile] = codeEditor.value;

        const repoUrl = prompt('Enter your GitHub Repository Link:\n(e.g., https://github.com/your-username/your-repo)');
        if (!repoUrl) return;

        const match = repoUrl.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([^\/]+)\/([^\/]+)/);
        if (!match) { return showToast('Invalid GitHub URL. Use format: https://github.com/username/repo', 'error'); }
        const owner = match[1];
        const repo = match[2].replace('.git', '').replace(/\//g, '');

        const tokenPrompt = `To push files to GitHub, you need a Personal Access Token (PAT).\n\nHere is exactly how to get it:\n1. Log into GitHub and click your profile picture (top right) -> Settings.\n2. Scroll down the left sidebar and click Developer settings.\n3. Expand Personal access tokens -> Tokens (classic).\n4. Click Generate new token (classic).\n5. Give it a name, set an expiration.\n6. IMPORTANT: Check the 'repo' checkbox (this allows code upload).\n7. Click Generate token at the bottom.\n8. Copy the token (starts with ghp_...) and paste it here:`;
        const token = prompt(tokenPrompt);
        if (!token) return;

        exportGithubBtn.disabled = true; exportGithubBtn.textContent = 'Exporting...'; showToast('Connecting to GitHub...', 'success');

        try {
            const userRes = await fetch('https://api.github.com/user', { headers: { 'Authorization': `token ${token}` } });
            if (!userRes.ok) throw new Error('Invalid Token. Please make sure you copied it correctly.');
            
            for (const [filename, content] of Object.entries(files)) {
                if (filename.startsWith('asset:')) continue; 
                let sha = null;
                const getFileRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filename}`, { headers: { 'Authorization': `token ${token}` } });
                if (getFileRes.ok) { const fileData = await getFileRes.json(); sha = fileData.sha; }

                const contentBytes = new TextEncoder().encode(content);
                const base64Content = btoa(String.fromCharCode.apply(null, contentBytes));
                const body = { message: `Update ${filename} via CodeWix`, content: base64Content };
                if (sha) body.sha = sha;

                const putRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filename}`, {
                    method: 'PUT', headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body)
                });

                if (!putRes.ok) { const errData = await putRes.json(); throw new Error(errData.message || `Failed to upload ${filename}`); }
            }

            showToast('Successfully deployed to GitHub!', 'success');
            window.open(`https://github.com/${owner}/${repo}`, '_blank');
        } catch (err) {
            console.error(err); showToast(err.message, 'error');
        } finally {
            exportGithubBtn.disabled = false; exportGithubBtn.textContent = '🐙 Export to GitHub';
        }
    });

    // APPLY TO IDE: LOAD FROM AI
    async function loadProjectFromAI() {
        const urlParams = new URLSearchParams(window.location.search);
        const projectId = urlParams.get('project');
        const pending = localStorage.getItem('cw_pending_code');
        if (!pending || !projectId || !db || !auth.currentUser) return;

        try {
            var data = JSON.parse(pending);
            if (Date.now() - data.ts < 60000) { 
                let projectName = 'AI Generated Project';
                let existingFiles = {};
                if (projectId !== 'new') {
                    const doc = await db.collection('users').doc(auth.currentUser.uid).collection('projects').doc(projectId).get();
                    if (doc.exists) { const projData = doc.data(); existingFiles = projData.files || {}; projectName = projData.name || 'Untitled Project'; }
                }
                if (data.filename) { existingFiles[data.filename] = data.code; }
                loadFilesIntoEditor(existingFiles, projectId === 'new' ? null : projectId, projectName, null);
                
                const payload = { name: projectName, files: existingFiles, activeFile: data.filename, updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
                if (projectId === 'new') {
                    payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                    const ref = await db.collection('users').doc(auth.currentUser.uid).collection('projects').add(payload);
                    currentProjectId = ref.id; window.history.replaceState({}, '', '?project=' + ref.id);
                } else {
                    await db.collection('users').doc(auth.currentUser.uid).collection('projects').doc(projectId).update(payload);
                }
                showToast('🤖 AI Code applied and saved!', 'success');
                lastSavedSnapshot = snapshot(); if (unsavedIndicator) unsavedIndicator.style.display = 'none'; if (projectStatusLbl) projectStatusLbl.textContent = 'Project: ' + projectName;
            }
        } catch(e) { console.error("Error applying AI code:", e); }
        localStorage.removeItem('cw_pending_code'); window.history.replaceState({}, document.title, window.location.pathname + (currentProjectId ? '?project=' + currentProjectId : ''));
    }
    if (auth) { auth.onAuthStateChanged(user => { if (user) loadProjectFromAI(); }); }

    // MY PROJECTS MODAL
    if (myProjectsBtn) { myProjectsBtn.addEventListener('click', async function() { if (!db || !auth.currentUser) return showToast('Sign in first.', 'error'); projectsModal.style.display = 'flex'; projectsListBox.innerHTML = '<p style="color:#64748b;">Loading projects...</p>'; try { const snap = await db.collection('users').doc(auth.currentUser.uid).collection('projects').get(); if (snap.empty) { projectsListBox.innerHTML = '<p style="color:#64748b;">No saved projects found.</p>'; return; } let html = ''; snap.forEach(doc => { const p = doc.data(); const date = p.updatedAt ? formatDate(p.updatedAt) : 'Unknown'; html += `<div class="project-item" data-id="${doc.id}" data-name="${escapeHtml(p.name)}" style="padding:12px; border-bottom:1px solid #334155; cursor:pointer; display:flex; justify-content:space-between; align-items:center;"><div><h4 style="margin:0; color:#e2e8f0;">${escapeHtml(p.name || 'Untitled')}</h4><small style="color:#64748b;">Updated: ${date}</small></div><button class="btn btn-primary load-proj-btn" data-id="${doc.id}" style="padding:4px 8px; font-size:12px;">Load</button></div>`; }); projectsListBox.innerHTML = html; } catch (err) { projectsListBox.innerHTML = `<p style="color:#f87171;">Failed to load: ${err.message}</p>`; } }); }
    if (closeModalBtn) { closeModalBtn.addEventListener('click', function() { projectsModal.style.display = 'none'; }); }
    if (projectsListBox) { projectsListBox.addEventListener('click', async function(e) { const btn = e.target.closest('.load-proj-btn'); if (!btn) return; const id = btn.getAttribute('data-id'); btn.disabled = true; btn.textContent = 'Loading...'; try { const doc = await db.collection('users').doc(auth.currentUser.uid).collection('projects').doc(id).get(); if (doc.exists) { const data = doc.data(); loadFilesIntoEditor(data.files || {}, doc.id, data.name || 'Untitled', null); projectsModal.style.display = 'none'; showToast('Project loaded!', 'success'); } } catch (err) { showToast('Failed to load: ' + err.message, 'error'); } finally { btn.disabled = false; btn.textContent = 'Load'; } }); }

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

    if (uploadFileBtn && hiddenFileInput) { uploadFileBtn.addEventListener('click', function () { hiddenFileInput.click(); }); hiddenFileInput.addEventListener('change', async function () { var file = this.files && this.files[0]; if (!file) return; if (!auth || !auth.currentUser) { showToast('Sign in first.', 'error'); this.value = ''; return; } var maxSize = isUserPremium ? 5 * 1024 * 1024 : 300 * 1024; if (file.size > maxSize) { if (!isUserPremium) { showToast('💎 Upgrade to Pro to upload files larger than 300KB!', 'error'); } else { showToast('File too large. Max 5MB.', 'error'); } this.value = ''; return; } var safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]/g, '-'); try { files['asset:' + safeName] = await readFileAsDataURL(file); rebuildFileTree(); markUnsaved(); renderPreview(); showToast('Added', 'success'); } catch (err) { showToast('Failed', 'error'); } finally { hiddenFileInput.value = ''; } }); }

    if (saveProjectBtn) { saveProjectBtn.addEventListener('click', function () { if (!codeEditor || !db || !auth || !auth.currentUser) { showToast('Not ready.', 'error'); return; } if (!isAsset(activeFile)) files[activeFile] = codeEditor.value; var name = currentProjectName; if (!name) { name = prompt('Project Name:', 'My Project'); if (!name) return; name = name.trim(); if (!name) return; } saveProjectBtn.disabled = true; saveProjectBtn.textContent = 'Saving…'; var payload = { name: name, files: files, activeFile: activeFile, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }; var col = db.collection('users').doc(auth.currentUser.uid).collection('projects'); var promise; if (currentProjectId) promise = col.doc(currentProjectId).update(payload); else { payload.createdAt = firebase.firestore.FieldValue.serverTimestamp(); promise = col.add(payload).then(function (ref) { currentProjectId = ref.id; }); } promise.then(function () { currentProjectName = name; lastSavedSnapshot = snapshot(); if (unsavedIndicator) unsavedIndicator.style.display = 'none'; if (projectStatusLbl) projectStatusLbl.textContent = 'Project: ' + name; showToast('Saved ✔', 'success'); }).catch(function (err) { showToast('Failed: ' + err.message, 'error'); }).finally(function () { saveProjectBtn.disabled = false; saveProjectBtn.textContent = 'Save'; }); }); }

    if (downloadZipBtn) { 
      downloadZipBtn.addEventListener('click', async function () { 
        if (!isUserPremium) return showToast('💎 ZIP Export is a Pro feature.', 'error');
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

    // ==========================================
    // THE ULTIMATE STRICT SYSTEM PROMPT
    // ==========================================
    var SYSTEM_PROMPT = { 
        role: 'system', 
        content: `You are the CodeWix AI Assistant, an expert programming helper. 
        
CRITICAL INSTRUCTION: You MUST ALWAYS wrap any code you write inside Markdown code blocks using EXACTLY THREE backticks (\`\`\`). Never use two backticks.

If you are providing a complete file (like HTML, CSS, or JS), you MUST put the filename on the first line of the code block using this EXACT format:
\`\`\`html filename="index.html"
<!DOCTYPE html>
<html>
  <body>Hello</body>
</html>
\`\`\`

If you are providing a small snippet, use the standard format:
\`\`\`javascript
console.log("Hello World");
\`\`\`

NEVER output raw, unformatted code. If you do not use triple backticks, the user's system will break. Always use triple backticks.` 
    };
    
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
    function loadChat(id, data) { currentChatId = id || null; currentChatTitle = (data && data.title) || ''; 
      var msgs = (data && data.messages) || [];
      conversation = [SYSTEM_PROMPT].concat(msgs);
      renderConversation();
      updateTitleBar();
      if (historyListBox) { document.querySelectorAll('.history-row').forEach(el => el.classList.remove('active')); var row = historyListBox.querySelector(`[data-id="${id}"]`); if (row) row.classList.add('active'); }
    }

    function startNewChat() { currentChatId = null; currentChatTitle = ''; conversation = [SYSTEM_PROMPT]; renderConversation(); updateTitleBar(); if (historyListBox) document.querySelectorAll('.history-row').forEach(el => el.classList.remove('active')); chatInput.value = ''; setStatus(''); }

    async function refreshHistory() {
      if (!db || !authUser) return;
      try {
        const snap = await chatsCollection().orderBy('updatedAt', 'desc').limit(50).get();
        historyCache = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderHistoryList();
      } catch(e) { console.warn(e); }
    }

    function renderHistoryList() {
      if (!historyListBox) return;
      const search = (historySearchEl ? historySearchEl.value : '').toLowerCase().trim();
      const filtered = historyCache.filter(c => (c.title || '').toLowerCase().includes(search));
      if (filtered.length === 0) { historyListBox.innerHTML = '<p style="padding:12px;color:#64748b;font-size:12px;">No chats found.</p>'; return; }
      historyListBox.innerHTML = filtered.map(c => `
        <div class="history-row" data-id="${c.id}">
          <div class="history-info">
            <h3>${escapeHtml(c.title || 'Untitled Chat')}</h3>
            <p>${c.updatedAt ? formatDate(c.updatedAt) : 'New'}</p>
          </div>
        </div>
      `).join('');
      historyListBox.querySelectorAll('.history-row').forEach(row => {
        row.addEventListener('click', async () => {
          const id = row.getAttribute('data-id');
          const data = historyCache.find(x => x.id === id);
          if (data) { loadChat(id, data); setSidebarOpen(false); }
        });
      });
      if (currentChatId) { const active = historyListBox.querySelector(`[data-id="${currentChatId}"]`); if (active) active.classList.add('active'); }
    }

    function appendMessage(role) { var d = document.createElement('div'); d.className = 'message ' + role; var bubble = document.createElement('div'); bubble.className = 'bubble'; d.appendChild(bubble); chatContainer.appendChild(d); chatContainer.scrollTop = chatContainer.scrollHeight; return bubble; }
    function setUserMessage(el, content) { if (Array.isArray(content)) { el.innerHTML = content.map(function (c) { if (c.type === 'text') return escapeHtml(c.text).replace(/\n/g, '<br>'); if (c.type === 'image_url') return '<img src="' + c.image_url.url + '" style="max-width:180px;border-radius:8px;display:block;margin:4px 0;">'; return ''; }).join(''); } else { el.innerHTML = escapeHtml(String(content)).replace(/\n/g, '<br>'); } }
    function setAssistantMessage(el, text, extra) { el.innerHTML = renderContent(text); }

    // ==========================================
    // SMART RENDER CONTENT (THE SAFETY NET)
    // ==========================================
    function renderContent(text) {
      var parts;
      if (text.indexOf('```') !== -1) {
          parts = String(text).split(/```/);
      } else if (text.indexOf('``') !== -1) {
          parts = String(text).split(/``/);
      } else {
          parts = [text];
      }

      var html = '', blockCount = 0;
      
      // FALLBACK: If no backticks at all, but it looks like code, wrap it automatically
      if (parts.length === 1) {
          var lower = text.toLowerCase();
          if (lower.includes('<!doctype') || lower.includes('<html>')) {
              parts = ['Here is your code:', '\nhtml filename="index.html"\n' + text.trim()];
          } else if (lower.includes('function ') || lower.includes('const ') || lower.includes('console.log') || lower.includes('let ')) {
               parts = ['Here is your code:', '\njavascript filename="script.js"\n' + text.trim()];
          } else if (lower.includes('{') && lower.includes('}') && (lower.includes('color:') || lower.includes('background:') || lower.includes('display:'))) {
               parts = ['Here is your code:', '\ncss filename="style.css"\n' + text.trim()];
          }
      }

      for (var b = 1; b < parts.length; b += 2) if (parts[b] && parts[b].trim()) blockCount++;
      
      for (var i = 0; i < parts.length; i++) {
        if (i % 2 === 0) { 
            var chunk = parts[i]; 
            if (!chunk) continue; 
            var escaped = escapeHtml(chunk).replace(/`([^`\n]+)`/g, '<code>$1</code>'); 
            html += '<div class="text-part">' + escaped.replace(/\n/g, '<br>') + '</div>'; 
        } 
        else {
          var body = parts[i], lang = 'code', filename = null;
          
          // Trim leading spaces and newlines
          body = body.replace(/^\s+/, '');
          var nl = body.indexOf('\n');
          
          if (nl !== -1) { 
              var firstLine = body.substring(0, nl).trim();
              var m = firstLine.match(/^([a-zA-Z0-9_-]+)(?:\s+(?:filename=["']?([^"'\s]+)["']?|([^"'\s]+)))?$/); 
              if (m) { 
                  lang = m[1]; 
                  if (m[2]) filename = m[2]; 
                  else if (m[3] && m[3].includes('.')) filename = m[3]; 
                  body = body.substring(nl + 1); 
              } 
          }
          
          body = body.replace(/\n$/, ''); 
          var displayTitle = filename || lang;
          
          var applyBtnHtml = filename ? `<button type="button" class="apply-ide-btn">🔥 Apply to IDE</button>` : '';

          html += '<div class="code-block" data-lang="' + escapeHtml(lang) + '"' + (filename ? ' data-filename="' + escapeHtml(filename) + '"' : '') + '><div class="code-header"><span class="code-lang">' + escapeHtml(displayTitle) + '</span><div class="code-actions">' + applyBtnHtml + '<button type="button" class="download-code-btn">⬇</button><button type="button" class="copy-btn">Copy</button></div></div><pre><code>' + escapeHtml(body) + '</code></pre></div>';
        }
      } 
      return html;
    }

    // ==========================================
    // SEND MESSAGE & STREAMING
    // ==========================================
    async function sendMessage() {
      var text = chatInput.value.trim();
      if (!text && pendingAttachments.length === 0) return;
      if (!authUser) { showToast('Please sign in.', 'error'); return; }

      var contentParts = [];
      if (text) contentParts.push({ type: 'text', text: text });
      pendingAttachments.forEach(function (att) {
        if (att.type === 'image') contentParts.push({ type: 'image_url', image_url: { url: att.data } });
        else contentParts.push({ type: 'text', text: '\n\n[File: ' + att.name + ']\n' + att.data });
      });

      conversation.push({ role: 'user', content: contentParts.length === 1 && contentParts[0].type === 'text' ? contentParts[0].text : contentParts });
      chatInput.value = ''; pendingAttachments = []; renderAttachPreview(); setLoading(true); setStatus('Sending...');

      var userBubble = appendMessage('user');
      setUserMessage(userBubble, contentParts.length === 1 && contentParts[0].type === 'text' ? contentParts[0].text : contentParts);

      var assistantBubble = appendMessage('assistant');
      assistantBubble.innerHTML = '<span class="typing-dots">●●●</span>';
      chatContainer.scrollTop = chatContainer.scrollHeight;

      var model = modelSelect ? modelSelect.value : 'openai/gpt-oss-120b';
      var requestBody = { messages: conversation, model: model };

      try {
        var idToken = await authUser.getIdToken();
        var response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + idToken },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          var errData = await response.json().catch(function () { return {}; });
          throw new Error(errData.error || 'API error ' + response.status);
        }

        var reader = response.body.getReader();
        var decoder = new TextDecoder();
        var fullText = '';

        while (true) {
          var { done, value } = await reader.read();
          if (done) break;
          var chunk = decoder.decode(value, { stream: true });
          fullText += chunk;
          assistantBubble.innerHTML = renderContent(fullText);
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }

        // Final cleanup
        if (!fullText.trim()) { fullText = '[No response]'; }
        assistantBubble.innerHTML = renderContent(fullText);
        conversation.push({ role: 'assistant', content: fullText });

        // Auto-apply code if applicable
        var codeMatch = fullText.match(/```[\s\S]*?```/);
        if (codeMatch) {
          try {
            var codeText = codeMatch[0].replace(/```/g, '').trim();
            var lines = codeText.split('\n');
            var firstLine = lines[0].trim();
            var filenameMatch = firstLine.match(/filename=["']?([^"'\s]+)/);
            var filename = filenameMatch ? filenameMatch[1] : null;
            var language = firstLine.split(/\s+/)[0] || 'html';
            var code = lines.slice(1).join('\n').trim();

            if (!filename && (language === 'html' || code.toLowerCase().includes('<!doctype'))) filename = 'index.html';
            else if (!filename && language === 'css') filename = 'style.css';
            else if (!filename && language === 'javascript') filename = 'script.js';

            if (filename && code) {
              var applyPayload = { code: code, filename: filename, ts: Date.now() };
              localStorage.setItem('cw_pending_code', JSON.stringify(applyPayload));
              var applyBtn = document.createElement('button');
              applyBtn.className = 'apply-ide-btn-inline';
              applyBtn.textContent = '🔥 Apply to IDE';
              applyBtn.style.cssText = 'display:block;margin-top:8px;padding:6px 12px;background:#38bdf8;color:#020617;border:none;border-radius:6px;cursor:pointer;font-weight:bold;';
              applyBtn.onclick = function () {
                window.open('ide.html?project=new', '_blank');
              };
              var parent = assistantBubble.querySelector('.code-block');
              if (parent && !parent.querySelector('.apply-ide-btn-inline')) parent.appendChild(applyBtn);
            }
          } catch (e) {}
        }

        setStatus('');
        updateTokenUsage();
        scheduleSave();

      } catch (err) {
        assistantBubble.innerHTML = '<span style="color:#f87171;">Error: ' + escapeHtml(err.message) + '</span>';
        setStatus('Error');
      } finally {
        setLoading(false);
        chatInput.focus();
      }
    }

    sendBtn.onclick = sendMessage;
    chatInput.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });

    if (newChatBtn) newChatBtn.onclick = startNewChat;
    if (historyBtn) historyBtn.onclick = function() { refreshHistory(); setSidebarOpen(true); };

    if (auth) {
      auth.onAuthStateChanged(function(user) {
        authUser = user;
        if (user) { currentUserName = getUsername(); refreshHistory(); updateTokenUsage(); } else { historyCache = []; renderHistoryList(); }
      });
    }

    // Show welcome
    if (conversation.length === 1) {
      var welcome = appendMessage('assistant');
      welcome.innerHTML = '<div style="padding:16px;background:#1e293b;border-radius:12px;border:1px solid #334155;"><p style="margin:0 0 8px 0;font-size:15px;">👋 Welcome to CodeWix AI!</p><p style="margin:0;font-size:13px;color:#94a3b8;">Ask me to build a website, write code, or debug. I always wrap code in properly formatted code blocks.</p></div>';
    }
  }
});
