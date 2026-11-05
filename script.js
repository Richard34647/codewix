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
  // GLOBAL BAN CHECK & NAV & THEME & NOTIFICATIONS
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

    // NOTIFICATION BELL
    var notifBtn = document.createElement('button');
    notifBtn.id = 'notifBellBtn';
    notifBtn.className = 'theme-toggle-btn';
    notifBtn.innerHTML = '🔔';
    notifBtn.title = 'Notifications';
    notifBtn.style.position = 'relative';
    
    var badge = document.createElement('span');
    badge.id = 'notifBadge';
    badge.style.cssText = 'position:absolute;top:0;right:0;width:8px;height:8px;background:#ef4444;border-radius:50%;display:none;';
    notifBtn.appendChild(badge);
    
    navMenu.appendChild(notifBtn);
    
    // NOTIFICATION MODAL
    var notifModal = document.createElement('div');
    notifModal.id = 'notifModal';
    notifModal.style.cssText = 'display:none; position:fixed; top:70px; right:20px; width:320px; background:#1e293b; border:1px solid #334155; border-radius:12px; z-index:10000; box-shadow:0 10px 30px rgba(0,0,0,0.5); overflow:hidden;';
    notifModal.innerHTML = `
      <div style="padding:12px; border-bottom:1px solid #334155; display:flex; justify-content:space-between; align-items:center;">
        <h3 style="margin:0; color:#e2e8f0; font-size:14px;">Notifications</h3>
        <button id="closeNotifBtn" style="background:none;border:none;color:#f87171;cursor:pointer;font-size:16px;">✕</button>
      </div>
      <div id="notifList" style="max-height:300px; overflow-y:auto; padding:0;">
        <p style="padding:20px; text-align:center; color:#64748b;">Loading...</p>
      </div>
    `;
    document.body.appendChild(notifModal);
    
    notifBtn.addEventListener('click', function() {
      notifModal.style.display = notifModal.style.display === 'none' ? 'block' : 'none';
      badge.style.display = 'none';
    });
    
    document.getElementById('closeNotifBtn').addEventListener('click', function() {
      notifModal.style.display = 'none';
    });
  }

  if (auth) {
    auth.onAuthStateChanged(async function(user) {
      if (!user) return;
      
      // GLOBAL BAN CHECK
      if (db) {
        try {
          const userDoc = await db.collection('users').doc(user.uid).get();
          if (userDoc.exists && userDoc.data().banned === true) {
            window.location.href = 'ban.html';
            return;
          }
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
            if (snap.empty) {
              notifList.innerHTML = '<p style="padding:20px; text-align:center; color:#64748b;">No notifications yet.</p>';
            } else {
              let html = '';
              let latestTime = 0;
              snap.forEach(doc => {
                const n = doc.data();
                const time = n.createdAt ? n.createdAt.toMillis() : Date.now();
                if (time > latestTime) latestTime = time;
                
                html += `
                  <div style="padding:12px; border-bottom:1px solid #334155;">
                    <h4 style="margin:0 0 4px 0; color:#38bdf8; font-size:13px;">${escapeHtml(n.title)}</h4>
                    <p style="margin:0; color:#cbd5e1; font-size:12px; line-height:1.4;">${escapeHtml(n.message)}</p>
                  </div>
                `;
              });
              notifList.innerHTML = html;
              
              const lastRead = localStorage.getItem('lastReadNotif') || 0;
              if (latestTime > lastRead && badge) {
                badge.style.display = 'block';
                localStorage.setItem('lastReadNotif', latestTime);
              }
            }
          }
        } catch(e) { console.error("Error loading notifications", e); }
      }

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

  var path = location.pathname.toLowerCase();
  var protectedPages = ['dashboard.html', 'ai-assistant.html', 'learn.html', 'publish.html', 'admin.html'];
  if (auth && protectedPages.some(function (p) { return path.indexOf(p) !== -1; })) {
    auth.onAuthStateChanged(async function (user) {
      if (!user) { location.replace('login.html'); return; }
      if (!user.emailVerified) { alert('Please verify your email to access this page.'); auth.signOut().then(function () { location.replace('login.html'); }); return; }
      
      if (db) {
         const doc = await db.collection('users').doc(user.uid).get();
         if (doc.exists && doc.data().banned === true) { window.location.href = 'ban.html'; return; }
      }

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
        
        return fetch('/api/send-verification-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userEmail: user.email, userName: username || user.email.split('@')[0], redirectUrl: window.location.origin + '/verify.html' }) })
          .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); });
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
        if (!user.emailVerified) {
          pendingVerificationEmail = user.email;
          return auth.signOut().then(function () {
            if (errBox) { errBox.innerHTML = '<div style="margin-bottom:10px;">Please verify your email before logging in.</div><button type="button" class="resend-verify-btn">Resend verification email</button>'; errBox.style.display = 'block'; }
          });
        }
        alert('Login successful!'); window.location.href = 'dashboard.html';
      }).catch(function (err) {
        // CHECK FOR BANNED USER
        if (err.code === 'auth/user-disabled') {
          window.location.href = 'ban.html';
          return;
        }
        
        var msg = err.message; if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') msg = 'Incorrect email or password.'; else if (err.code === 'auth/user-not-found') msg = 'No account found.';
        showError(errBox, msg);
      }).finally(function () { if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = orig; } });
    });

    var errBoxEl = $('errorBox');
    if (errBoxEl) {
      errBoxEl.addEventListener('click', function (e) {
        var btn = e.target.closest('.resend-verify-btn'); if (!btn || !pendingVerificationEmail) return;
        btn.disabled = true; btn.textContent = 'Sending…';
        fetch('/api/send-verification-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userEmail: pendingVerificationEmail, redirectUrl: window.location.origin + '/verify.html' }) })
          .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
          .then(function (res) { if (!res.ok) { errBoxEl.className = 'error-box'; errBoxEl.textContent = 'Could not resend: ' + (res.data.error || 'unknown'); return; } errBoxEl.className = 'success-box'; errBoxEl.textContent = '✅ New verification email sent.'; })
          .catch(function () { errBoxEl.className = 'error-box'; errBoxEl.textContent = 'Could not reach server.'; });
      });
    }
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
          // CHECK FOR BANNED USER
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
        
        if (targetId === 'dashboard') loadStats(); 
        if (targetId === 'users') loadUsers(); 
        if (targetId === 'projects') loadProjects();
        if (targetId === 'analytics') loadAnalytics();
        if (targetId === 'notifications') loadAdminNotifications();
      });
    });
    
    var getToken = async function() { 
      if (!auth.currentUser) throw new Error("Not logged in");
      return await auth.currentUser.getIdToken(true);
    };

    var loadStats = async function() {
      try {
        const res = await fetch('/api/admin/stats', { headers: { 'Authorization': 'Bearer ' + await getToken() } }); 
        if (!res.ok) throw new Error('Failed to load stats from server');
        const data = await res.json(); 
        if ($('statUsers')) $('statUsers').textContent = data.totalUsers; 
        if ($('statPremium')) $('statPremium').textContent = data.premiumUsers; 
        if ($('statProjects')) $('statProjects').textContent = data.totalProjects; 
        if ($('statLessons')) $('statLessons').textContent = data.totalLessons;
      } catch (err) { showToast(err.message, 'error'); }
    };

    var loadUsers = async function() {
      try {
        const res = await fetch('/api/admin/users', { headers: { 'Authorization': 'Bearer ' + await getToken() } }); 
        const data = await res.json();
        
        const tbody = $('adminUsersTable') ? $('adminUsersTable').querySelector('tbody') : null; 
        if (!tbody) return;
        
        if (!data.users || data.users.length === 0) { tbody.innerHTML = '<tr><td colspan="5">No users found.</td></tr>'; return; }

        let html = '';
        data.users.forEach(u => {
           const isBanned = u.banned === true;
           const isPremium = u.premium === true;

           html += `<tr>
              <td>${escapeHtml(u.email)}</td>
              <td>${escapeHtml(u.displayName)}</td>
              <td>${isBanned ? '<span style="color:#ef4444;font-weight:bold;">BANNED</span>' : 'Active'}</td>
              <td><span class="badge ${isPremium ? 'premium' : 'free'}">${isPremium ? 'Premium' : 'Free'}</span></td>
              <td>
                <button class="btn btn-warning toggle-premium-btn" data-uid="${u.uid}">${isPremium ? 'Revoke Pro' : 'Make Pro'}</button>
                ${isBanned 
                  ? `<button class="btn btn-success unban-btn" data-uid="${u.uid}">Unban User</button>`
                  : `<button class="btn btn-danger ban-btn" data-uid="${u.uid}">Ban User</button>`
                }
              </td>
            </tr>`;
        });
        tbody.innerHTML = html;
      } catch (err) { showToast(err.message, 'error'); }
    };

    var loadProjects = async function() {
      try {
        if (!db) throw new Error("Firestore not initialized");
        const snap = await db.collection('published').orderBy('updatedAt', 'desc').get();
        const tbody = $('adminProjectsTable') ? $('adminProjectsTable').querySelector('tbody') : null; 
        if (!tbody) return;
        
        if (snap.empty) { tbody.innerHTML = '<tr><td colspan="5">No projects published yet.</td></tr>'; return; }

        let html = '';
        snap.forEach(doc => {
           const p = doc.data();
           const updateDate = p.updatedAt ? formatDate(p.updatedAt) : 'Unknown';
           html += `<tr>
              <td>${escapeHtml(p.projectName || 'Untitled')}</td>
              <td><a href="/s/${doc.id}" target="_blank" style="color:#38bdf8;">/s/${doc.id}</a></td>
              <td><small>${escapeHtml(p.username || 'Unknown')}</small></td>
              <td>${updateDate}</td>
              <td>
                <button class="btn btn-warning takedown-btn" data-slug="${doc.id}">Take Down</button>
              </td>
            </tr>`;
        });
        tbody.innerHTML = html;
      } catch (err) { showToast(err.message, 'error'); }
    };

    var loadAnalytics = async function() {
      try {
        const res = await fetch('/api/admin/analytics', { headers: { 'Authorization': 'Bearer ' + await getToken() } });
        const data = await res.json();
        if ($('statTokensToday')) $('statTokensToday').textContent = (data.totalTokensToday || 0).toLocaleString();
        const list = $('topConsumersList');
        if (!list) return;
        if (!data.topConsumers || data.topConsumers.length === 0) { list.innerHTML = '<p style="color:#64748b;">No AI usage today.</p>'; return; }
        list.innerHTML = data.topConsumers.map(c => `<div class="consumer-row"><span>${escapeHtml(c.email)}</span><span style="color:#fbbf24; font-weight:bold;">${c.tokens.toLocaleString()} tokens</span></div>`).join('');
      } catch (err) { showToast(err.message, 'error'); }
    };

    var loadAdminNotifications = async function() {
      try {
        if (!db) return;
        const snap = await db.collection('notifications').orderBy('createdAt', 'desc').get();
        const tbody = $('adminNotifTable') ? $('adminNotifTable').querySelector('tbody') : null;
        if (!tbody) return;
        
        if (snap.empty) { tbody.innerHTML = '<tr><td colspan="3">No notifications found.</td></tr>'; return; }
        
        let html = '';
        snap.forEach(doc => {
           const n = doc.data();
           html += `<tr>
              <td>${escapeHtml(n.title)}</td>
              <td>${escapeHtml(n.message)}</td>
              <td>
                <button class="btn btn-danger delete-notif-btn" data-id="${doc.id}">Delete</button>
              </td>
            </tr>`;
        });
        tbody.innerHTML = html;
      } catch (err) { showToast(err.message, 'error'); }
    };

    // Admin Add Notification Form Logic
    if ($('addNotifForm')) {
      $('addNotifForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const title = $('notifTitle').value.trim();
        const message = $('notifMessage').value.trim();
        if (!title || !message) return showToast('Fill both fields.', 'error');
        
        const btn = this.querySelector('button[type="submit"]');
        btn.disabled = true; btn.textContent = 'Adding...';
        try {
          await fetch('/api/admin/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + await getToken() },
            body: JSON.stringify({ title, message })
          });
          showToast('Notification added!', 'success');
          this.reset();
          loadAdminNotifications();
        } catch (err) { showToast(err.message, 'error'); }
        finally { btn.disabled = false; btn.textContent = 'Add Notification'; }
      });
    }

    document.addEventListener('click', async function(e) {
      // TOGGLE PREMIUM
      if (e.target.classList.contains('toggle-premium-btn')) {
        const uid = e.target.getAttribute('data-uid'); e.target.disabled = true;
        try {
          await fetch('/api/admin/update-user', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + await getToken() }, body: JSON.stringify({ uid, action: 'toggle-premium' }) });
          showToast('User premium status updated.', 'success'); loadUsers();
        } catch (err) { showToast(err.message, 'error'); e.target.disabled = false; }
      }
      // BAN USER
      if (e.target.classList.contains('ban-btn')) {
        if (!confirm('Are you sure you want to BAN this user? They will be logged out and unable to access the site.')) return;
        const uid = e.target.getAttribute('data-uid'); e.target.disabled = true;
        try {
          await fetch('/api/admin/ban-user', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + await getToken() }, body: JSON.stringify({ uid, action: 'ban' }) });
          showToast('User banned.', 'success'); loadUsers();
        } catch (err) { showToast(err.message, 'error'); e.target.disabled = false; }
      }
      // UNBAN USER
      if (e.target.classList.contains('unban-btn')) {
        const uid = e.target.getAttribute('data-uid'); e.target.disabled = true;
        try {
          await fetch('/api/admin/ban-user', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + await getToken() }, body: JSON.stringify({ uid, action: 'unban' }) });
          showToast('User unbanned.', 'success'); loadUsers();
        } catch (err) { showToast(err.message, 'error'); e.target.disabled = false; }
      }
      // TAKE DOWN PROJECT
      if (e.target.classList.contains('takedown-btn')) {
        if (!confirm('Are you sure? This will permanently delete this site.')) return;
        const slug = e.target.getAttribute('data-slug'); e.target.disabled = true;
        try {
          await db.collection('published').doc(slug).delete();
          showToast('Site taken down.', 'success'); loadProjects();
        } catch (err) { showToast(err.message, 'error'); e.target.disabled = false; }
      }
      // DELETE NOTIFICATION
      if (e.target.classList.contains('delete-notif-btn')) {
        if (!confirm('Delete this notification?')) return;
        const id = e.target.getAttribute('data-id'); e.target.disabled = true;
        try {
          await fetch('/api/admin/notifications/' + id, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + await getToken() } });
          showToast('Notification deleted.', 'success'); loadAdminNotifications();
        } catch (err) { showToast(err.message, 'error'); e.target.disabled = false; }
      }
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
        
        const tokenResult = await user.getIdTokenResult();
        const isPremiumUser = tokenResult.claims.premium === true;

        var name = user.displayName || user.email.split('@')[0];
        if($('profName')) $('profName').innerHTML = name + ' <span id="profBadge" class="badge ' + (isPremiumUser ? 'pro' : 'free') + '">' + (isPremiumUser ? '💎 PRO' : 'Free') + '</span>' + (isPremiumUser ? ' <span style="color:#38bdf8; font-size:16px;" title="Verified Pro User">☑️</span>' : '');
        if($('profEmail')) $('profEmail').textContent = user.email;
        if($('profAvatar')) $('profAvatar').textContent = name.charAt(0).toUpperCase();

        user.getIdToken().then(function(token) {
          fetch('/api/my-published', { headers: { 'Authorization': 'Bearer ' + token } })
          .then(res => res.json())
          .then(data => {
            var grid = $('profileSitesGrid');
            if(!grid) return;
            grid.innerHTML = '';
            
            if (!data.sites || data.sites.length === 0) {
              grid.innerHTML = '<p style="color: #64748b;">You haven\'t published any sites yet. <a href="dashboard.html" style="color: #38bdf8;">Go build one!</a></p>';
              if($('statProjects')) $('statProjects').textContent = '0';
              if($('statViews')) $('statViews').textContent = '0';
              return;
            }
            var totalViews = 0;
            data.sites.forEach(function(site) {
              totalViews += (site.views || 0);
              var card = document.createElement('div'); card.className = 'site-card';
              
              card.innerHTML = `
                <div class="site-preview"><iframe src="/s/${site.slug}" loading="lazy" sandbox="allow-scripts"></iframe></div>
                <div class="site-info">
                  <h3>${escapeHtml(site.projectName || 'Untitled')}</h3>
                  <p>👁 ${site.views || 0} views</p>
                  <a href="site-settings.html?slug=${site.slug}" class="domain-btn" style="text-decoration:none; display:block; text-align:center;">⚙️ Settings</a>
                </div>
              `;
              grid.appendChild(card);
            });
            if($('statProjects')) $('statProjects').textContent = data.sites.length;
            if($('statViews')) $('statViews').textContent = totalViews;
          })
          .catch(err => { 
            if($('profileSitesGrid')) $('profileSitesGrid').innerHTML = '<p style="color: #f87171;">Failed to load sites: ' + err.message + '</p>'; 
          });
        });
      });
    }
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

    // MY PROJECTS MODAL LOGIC
    if (myProjectsBtn) {
      myProjectsBtn.addEventListener('click', async function() {
        if (!db || !auth.currentUser) return showToast('Sign in first.', 'error');
        projectsModal.style.display = 'flex';
        projectsListBox.innerHTML = '<p style="color:#64748b;">Loading projects...</p>';
        
        try {
          const snap = await db.collection('users').doc(auth.currentUser.uid).collection('projects').get();
          if (snap.empty) {
            projectsListBox.innerHTML = '<p style="color:#64748b;">No saved projects found.</p>';
            return;
          }
          
          let html = '';
          snap.forEach(doc => {
            const p = doc.data();
            const date = p.updatedAt ? formatDate(p.updatedAt) : 'Unknown';
            html += `
              <div class="project-item" data-id="${doc.id}" data-name="${escapeHtml(p.name)}" style="padding:12px; border-bottom:1px solid #334155; cursor:pointer; display:flex; justify-content:space-between; align-items:center;">
                <div>
                  <h4 style="margin:0; color:#e2e8f0;">${escapeHtml(p.name || 'Untitled')}</h4>
                  <small style="color:#64748b;">Updated: ${date}</small>
                </div>
                <button class="btn btn-primary load-proj-btn" data-id="${doc.id}" style="padding:4px 8px; font-size:12px;">Load</button>
              </div>
            `;
          });
          projectsListBox.innerHTML = html;
        } catch (err) {
          projectsListBox.innerHTML = `<p style="color:#f87171;">Failed to load: ${err.message}</p>`;
        }
      });
    }

    if (closeModalBtn) {
      closeModalBtn.addEventListener('click', function() {
        projectsModal.style.display = 'none';
      });
    }

    // Load Project from Modal
    if (projectsListBox) {
      projectsListBox.addEventListener('click', async function(e) {
        const btn = e.target.closest('.load-proj-btn');
        if (!btn) return;
        const id = btn.getAttribute('data-id');
        btn.disabled = true;
        btn.textContent = 'Loading...';
        
        try {
          const doc = await db.collection('users').doc(auth.currentUser.uid).collection('projects').doc(id).get();
          if (doc.exists) {
            const data = doc.data();
            loadFilesIntoEditor(data.files || {}, doc.id, data.name || 'Untitled', null);
            projectsModal.style.display = 'none';
            showToast('Project loaded!', 'success');
          }
        } catch (err) {
          showToast('Failed to load: ' + err.message, 'error');
        } finally {
          btn.disabled = false;
          btn.textContent = 'Load';
        }
      });
    }

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
    
    function setAssistantMessage(div, content, reasoning) { 
      var c = div.querySelector('.message-content'), html = ''; 
      if (reasoning) html += '<details class="reasoning-section"><summary>Thinking</summary><div class="reasoning-content">' + escapeHtml(reasoning) + '</div></details>'; 
      html += renderContent(content); 
      c.innerHTML = html; 
    }

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

    chatContainer.addEventListener('click', async function (e) {
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
  // LEARN (PREMIUM LESSONS LOCK & PROGRESS)
  // ======================================================================
  if ($('lessonTitle') && $('lessonBody')) {
    var LESSONS = [
      { title: 'HTML: Page Structure', level: 'Beginner', lang: 'html', concept: 'Every HTML page starts with a <code>doctype</code>, followed by <code>&lt;html&gt;</code>, <code>&lt;head&gt;</code>, and <code>&lt;body&gt;</code>.', code: '<!DOCTYPE html>\n<html>\n  <head>\n    <title>My First Page</title>\n  </head>\n  <body>\n    <h1>Hello World!</h1>\n    <p>This is my first paragraph.</p>\n  </body>\n</html>', exercise: 'Create an HTML page with an <h1> that says "I am learning" and a <p> that says "HTML is fun".', hint: 'Use <code>&lt;h1&gt;I am learning&lt;/h1&gt;</code>' },
      { title: 'HTML: Links and Images', level: 'Beginner', lang: 'html', concept: 'Use the <code>&lt;a&gt;</code> tag for links and the <code>&lt;img&gt;</code> tag for images. Images use <code>src</code> and links use <code>href</code>.', code: '<h2>My Favorite Site</h2>\n<a href="https://google.com">Go to Google</a>\n<br><br>\n<img src="https://via.placeholder.com/150" alt="Placeholder Image">', exercise: 'Create a link to your favorite website and an image of a cat.', hint: 'Use <code>&lt;a href="url"&gt;Text&lt;/a&gt;</code>' },
      { title: 'HTML: Lists', level: 'Beginner', lang: 'html', concept: 'Use <code>&lt;ul&gt;</code> for unordered (bullet) lists and <code>&lt;ol&gt;</code> for ordered (numbered) lists. Inside them, use <code>&lt;li&gt;</code> for each item.', code: '<ul>\n  <li>Apples</li>\n  <li>Bananas</li>\n  <li>Cherries</li>\n</ul>', exercise: 'Make an ordered list of your top 3 favorite movies.', hint: 'Use <code>&lt;ol&gt;</code> and <code>&lt;li&gt;</code>' },
      { title: 'CSS: Basics and Selectors', level: 'Beginner', lang: 'css', concept: 'CSS changes how HTML looks. You target elements using selectors (like <code>body</code> or <code>.my-class</code>) and change properties like <code>color</code> and <code>background</code>.', code: 'body {\n  background-color: #0f172a;\n  color: white;\n  font-family: Arial, sans-serif;\n}\n\nh1 {\n  color: #38bdf8;\n}', exercise: 'Change the background of the body to black, and make all h1 tags red.', hint: 'Use <code>background-color: black;</code>' },
      { title: 'CSS: Classes and IDs', level: 'Beginner', lang: 'css', concept: 'Classes start with a dot (<code>.class</code>) and can be used multiple times. IDs start with a hash (<code>#id</code>) and must be unique.', code: '.text-red {\n  color: red;\n}\n\n#main-header {\n  font-size: 32px;\n}', exercise: 'Create a class called <code>.highlight</code> that gives an element a yellow background.', hint: 'Use <code>.highlight { background-color: yellow; }</code>' },
      { title: 'CSS: Flexbox Layout', level: 'Intermediate', lang: 'css', concept: 'Flexbox is for aligning items. Apply <code>display: flex;</code> to a container to align its children easily.', code: '.container {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  height: 100vh;\n}', exercise: 'Create a flex container that spaces items evenly using <code>justify-content: space-between;</code>.', hint: 'Use <code>display: flex;</code>' },
      { title: 'JS: Variables & Data Types', level: 'Beginner', lang: 'javascript', concept: 'Use <code>let</code> for variables that change and <code>const</code> for constants. JS has strings, numbers, and booleans.', code: 'let name = "Alice";\nconst age = 25;\nlet isStudent = true;\n\nconsole.log(name, age, isStudent);', exercise: 'Create a variable called <code>score</code> set to 100.', hint: '<code>let score = 100;</code>' },
      { title: 'JS: Functions', level: 'Beginner', lang: 'javascript', concept: 'Functions are reusable blocks of code. Define them with the <code>function</code> keyword and call them by their name.', code: 'function greet(name) {\n  return "Hello, " + name + "!";\n}\n\nconsole.log(greet("World"));', exercise: 'Write a function called <code>add</code> that takes two numbers and returns their sum.', hint: '<code>function add(a, b) { return a + b; }</code>' },
      { title: 'JS: DOM Manipulation', level: 'Intermediate', lang: 'javascript', concept: 'You can change HTML using JavaScript. <code>document.getElementById()</code> finds an element, and <code>.innerText</code> changes its text.', code: '// Assuming HTML has: <h1 id="title">Hello</h1>\nlet heading = document.getElementById("title");\nheading.innerText = "Changed by JS!";\nheading.style.color = "red";', exercise: 'Change the background color of the body using JS: <code>document.body.style.backgroundColor = "black";</code>', hint: 'Select body with <code>document.body</code>' },
      { title: 'PHP: Introduction & Echo', level: 'Beginner', lang: 'php', concept: 'PHP is a server-side language. Code goes inside <code>&lt;?php ... ?&gt;</code>. Use <code>echo</code> to print text.', code: '<?php\necho "Hello, PHP!";\n$name = "Alice";\necho "<br>Welcome, $name";\n?>', exercise: 'Create a PHP script that echoes "My first PHP script".', hint: '<code>&lt;?php echo "My first PHP script"; ?&gt;</code>' },
      { title: 'PHP: Variables & Math', level: 'Beginner', lang: 'php', concept: 'PHP variables start with a <code>$</code>. You can do math just like in JavaScript.', code: '<?php\n$price = 10;\n$tax = 2;\n$total = $price + $tax;\necho "Total is: $total";\n?>', exercise: 'Calculate the area of a rectangle (width = 5, height = 10) and echo the result.', hint: '<code>$area = 5 * 10; echo $area;</code>' },
      { title: 'PHP: Arrays', level: 'Intermediate', lang: 'php', concept: 'Arrays hold multiple values. You can access them by their index (starting at 0).', code: '<?php\n$colors = array("Red", "Green", "Blue");\necho $colors[0]; // Outputs: Red\n?>', exercise: 'Create an array of 3 animals and echo the second one.', hint: '<code>echo $animals[1];</code>' },
      { title: 'Python: Hello World', level: 'Beginner', lang: 'python', concept: 'Python is famous for being readable. No semicolons needed! Just use <code>print()</code> to output text.', code: 'print("Hello, World!")\nname = "Alice"\nprint(f"Welcome, {name}")', exercise: 'Print your name using the <code>print()</code> function.', hint: 'print("Your Name")' },
      { title: 'Python: Lists & Loops', level: 'Beginner', lang: 'python', concept: 'A list holds multiple items. A <code>for</code> loop goes through each item in the list.', code: 'fruits = ["apple", "banana", "cherry"]\nfor fruit in fruits:\n    print(fruit)', exercise: 'Create a list of numbers and loop through them to print each one.', hint: 'for num in my_list:' },
      { title: 'Python: Functions', level: 'Intermediate', lang: 'python', concept: 'Define a function using <code>def</code>. Indentation (spaces) is extremely important in Python.', code: 'def greet(name):\n    return "Hello, " + name\n\nresult = greet("Python")\nprint(result)', exercise: 'Create a function called <code>multiply(a, b)</code> that returns the product.', hint: 'def multiply(a, b): return a * b' }
    ];
    
    var progressData = { completed: {}, streak: 1, startDate: null }, authUserL = null;
    function progressDocRef() { if (!db || !authUserL) return null; return db.collection('users').doc(authUserL.uid).collection('progress').doc('state'); }
    function todayISO() { return new Date().toISOString().slice(0, 10); }
    
    function renderLesson(idx) {
      var lesson = LESSONS[idx]; if (!lesson) return;
      
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

      // ADDED EVENT LISTENER FOR MARK COMPLETE
      const completeBtn = document.getElementById('completeBtn');
      if (completeBtn) {
        completeBtn.addEventListener('click', async () => {
          if (!db || !authUserL) return showToast('Sign in first.', 'error');
          completeBtn.disabled = true;
          completeBtn.textContent = 'Saving...';
          
          const isNowDone = !progressData.completed[idx];
          progressData.completed[idx] = isNowDone;
          
          try {
            await progressDocRef().set({ completed: progressData.completed }, { merge: true });
            showToast(isNowDone ? 'Lesson completed! 🎉' : 'Marked as incomplete.', 'success');
            renderLesson(idx); // Re-render to update the button
          } catch (err) {
            showToast('Failed to save progress: ' + err.message, 'error');
            progressData.completed[idx] = !isNowDone; // Revert on failure
            completeBtn.disabled = false;
            completeBtn.textContent = isNowDone ? 'Mark Complete' : '✓ Completed';
          }
        });
      }
    }

    if (auth) {
      auth.onAuthStateChanged(async function(user) { 
        if (user) { 
          authUserL = user; 
          try {
            const doc = await progressDocRef().get();
            if (doc.exists) {
              progressData = doc.data();
              if (!progressData.completed) progressData.completed = {};
            }
          } catch (e) { console.error("Error loading progress", e); }
          renderLesson(0); 
        } 
      });
    }
  }

  // ======================================================================
  // SITE SETTINGS PAGE LOGIC
  // ======================================================================
  if (location.pathname.includes('site-settings.html')) {
    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get('slug');
    let siteFiles = {}; 
    let isPremiumUser = false;

    if (!slug) { alert("No site specified."); location.href = 'profile.html'; return; }

    if (auth) {
      auth.onAuthStateChanged(async function(user) {
        if (!user) { location.href = 'login.html'; return; }
        const token = await user.getIdToken();
        const tokenResult = await user.getIdTokenResult();
        isPremiumUser = tokenResult.claims.premium === true;

        try {
          const res = await fetch('/api/published/' + slug, { headers: { 'Authorization': 'Bearer ' + token } });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);

          const site = data.site;
          siteFiles = site.files || {};

          document.getElementById('viewLiveSiteBtn').href = '/s/' + slug;
          document.getElementById('edit-index-html').value = siteFiles['index.html'] || '';
          document.getElementById('edit-style-css').value = siteFiles['style.css'] || '';
          document.getElementById('edit-script-js').value = siteFiles['script.js'] || '';
          
          renderAssets();

        } catch (err) { alert("Error loading site: " + err.message); }

        function renderAssets() {
          const list = document.getElementById('assetFileList');
          if (!list) return;
          list.innerHTML = '';
          
          const coreFiles = ['index.html', 'style.css', 'script.js'];
          const assets = Object.keys(siteFiles).filter(name => !coreFiles.includes(name));

          if (assets.length === 0) {
            list.innerHTML = '<li style="color: #64748b; font-size: 14px;">No extra files uploaded yet.</li>';
            return;
          }

          assets.forEach(name => {
            const li = document.createElement('li');
            li.className = 'asset-item';
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'asset-name';
            nameSpan.textContent = name;
            li.appendChild(nameSpan);

            const delBtn = document.createElement('button');
            delBtn.className = 'delete-asset-btn';
            delBtn.textContent = '🗑️ Delete';
            delBtn.onclick = function() {
              if (!confirm(`Delete ${name}?`)) return;
              delete siteFiles[name];
              renderAssets();
              showToast('File removed. Click Save to apply.', 'success');
            };
            li.appendChild(delBtn);
            
            list.appendChild(li);
          });
        }

        document.getElementById('uploadAssetBtn').onclick = function() {
          document.getElementById('assetUploadInput').click();
        };

        document.getElementById('assetUploadInput').onchange = async function() {
          const files = Array.from(this.files);
          if (!files.length) return;

          const maxSize = isPremiumUser ? 5 * 1024 * 1024 : 300 * 1024;

          for (const file of files) {
            if (file.size > maxSize) {
              showToast(`File "${file.name}" is too large. Max ${isPremiumUser ? '5MB' : '300KB'}.`, 'error');
              continue;
            }

            try {
              const isImage = file.type.startsWith('image/');
              const data = isImage ? await resizeImage(file, 1024, 1024) : await readFileAsDataURL(file);
              
              siteFiles[file.name] = data;
              showToast(`Added ${file.name}`, 'success');
            } catch (err) {
              showToast(`Failed to read ${file.name}`, 'error');
            }
          }
          this.value = '';
          renderAssets();
        };

        document.getElementById('saveFilesBtn').onclick = async function() {
          this.disabled = true; this.textContent = 'Saving...';
          try {
            siteFiles['index.html'] = document.getElementById('edit-index-html').value;
            siteFiles['style.css'] = document.getElementById('edit-style-css').value;
            siteFiles['script.js'] = document.getElementById('edit-script-js').value;

            if (JSON.stringify(siteFiles).length > 900 * 1024) {
              throw new Error("Total project size exceeds 900KB. Please delete some files or compress your images.");
            }

            const res = await fetch('/api/published/' + slug, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
              body: JSON.stringify({ files: siteFiles })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            
            showToast('All changes saved successfully!', 'success');
          } catch (err) { 
            showToast(err.message, 'error'); 
          } finally { 
            this.disabled = false; 
            this.textContent = 'Save All Changes'; 
          }
        };
      });
    }
  }

  // ======================================================================
  // PUBLISH PAGE
  // ======================================================================
  if ($('publishForm')) {
    var projectSelect = $('projectSelect');
    var mySitesGrid = $('mySitesGrid');
    var mySitesCount = $('mySitesCount');

    function loadPublishedSites() {
      if (!auth || !auth.currentUser) return;
      auth.currentUser.getIdToken().then(function (token) {
        fetch('/api/my-published', { headers: { 'Authorization': 'Bearer ' + token } })
          .then(function (r) { 
            if (!r.ok) return r.json().then(function(e) { throw new Error(e.error || 'Failed to load sites.'); });
            return r.json(); 
          })
          .then(function (data) { renderPublishedSites(data.sites || []); })
          .catch(function (err) { 
            if(mySitesGrid) mySitesGrid.innerHTML = '<p class="my-sites-empty" style="color:#f87171;">Failed: ' + escapeHtml(err.message) + '</p>'; 
            if(mySitesCount) mySitesCount.textContent = 'Error';
          });
      });
    }

    function renderPublishedSites(sites) {
      if (!mySitesGrid) return;
      mySitesGrid.innerHTML = '';
      if (mySitesCount) mySitesCount.textContent = sites.length + ' site' + (sites.length === 1 ? '' : 's');
      if (!sites.length) {
        mySitesGrid.innerHTML = '<p class="my-sites-empty">You haven\'t published anything yet.</p>';
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
            '<a href="site-settings.html?slug=' + site.slug + '" class="studio-btn ghost-btn" style="text-decoration: none;">⚙️ Settings</a>' +
            '<button type="button" class="studio-btn ghost-btn danger-btn unpublish-btn" data-slug="' + escapeHtml(site.slug) + '">Unpublish</button>' +
          '</div>';
        mySitesGrid.appendChild(card);
      });
    }

    if (mySitesGrid) {
      mySitesGrid.addEventListener('click', function (e) {
        var copyBtn = e.target.closest('.copy-link-btn');
        if (copyBtn) {
          var url = copyBtn.getAttribute('data-url');
          navigator.clipboard.writeText(url).then(function() { showToast('Copied!', 'success'); });
          return;
        }
        var unBtn = e.target.closest('.unpublish-btn');
        if (unBtn) {
          if (!confirm('Unpublish this site?')) return;
          var slug = unBtn.getAttribute('data-slug');
          auth.currentUser.getIdToken().then(function(token) {
            fetch('/api/unpublish', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }, body: JSON.stringify({ slug: slug }) })
            .then(function() { showToast('Unpublished', 'success'); loadPublishedSites(); });
          });
        }
      });
    }

    if (auth && db) {
      auth.onAuthStateChanged(async function(user) {
        if (!user) return;
        try {
          var snap = await db.collection('users').doc(user.uid).collection('projects').get();
          var projects = [];
          snap.forEach(function(doc) { projects.push({ id: doc.id, data: doc.data() }); });
          
          projects.sort(function(a, b) {
            var timeA = a.data.updatedAt ? a.data.updatedAt.toMillis() : 0;
            var timeB = b.data.updatedAt ? b.data.updatedAt.toMillis() : 0;
            return timeB - timeA;
          });

          projectSelect.innerHTML = '<option value="">Choose a project…</option>';
          if (projects.length === 0) {
            projectSelect.innerHTML = '<option value="">No saved projects found</option>';
          } else {
            projects.forEach(function(p) {
              var opt = document.createElement('option');
              opt.value = p.id;
              opt.textContent = p.data.name || 'Untitled';
              projectSelect.appendChild(opt);
            });
          }
        } catch (err) {
          projectSelect.innerHTML = '<option value="">Error loading projects</option>';
          alert("Error loading projects: " + err.message);
        }
        loadPublishedSites();
      });
    }

    $('publishForm').addEventListener('submit', async function(e) {
      e.preventDefault();
      var slug = $('publishSlug').value.trim().toLowerCase();
      var name = $('publishName').value.trim();
      var desc = $('publishDesc') ? $('publishDesc').value.trim() : '';
      var id = projectSelect.value;
      
      if (!id || !slug || !name) return showToast('Fill all fields.', 'error');
      
      var btn = this.querySelector('button[type="submit"]'); btn.disabled = true; btn.textContent = 'Publishing...';
      try {
        var proj = await db.collection('users').doc(auth.currentUser.uid).collection('projects').doc(id).get();
        var token = await auth.currentUser.getIdToken();
        var res = await fetch('/api/publish', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }, 
          body: JSON.stringify({ slug: slug, projectName: name, description: desc, files: proj.data().files }) 
        });
        var data = await res.json(); if (!res.ok) throw new Error(data.error);
        showToast('Published successfully!', 'success'); this.reset();
        loadPublishedSites();
      } catch (err) { 
        alert("Publish Error: " + err.message);
        showToast(err.message, 'error'); 
      } finally { btn.disabled = false; btn.textContent = 'Publish'; }
    });
  }

  // ======================================================================
  // EXPLORE PAGE
  // ======================================================================
  if ($('exploreGrid')) {
    fetch('/api/explore').then(function(r) { return r.json(); }).then(function(data) {
      var grid = $('exploreGrid'); grid.innerHTML = '';
      if(!data.sites || !data.sites.length) { grid.innerHTML = '<p style="color:#64748b;text-align:center;">No sites published yet.</p>'; return; }
      data.sites.forEach(function(site) {
        var card = document.createElement('a'); card.href = '/s/' + site.slug; card.target = '_blank'; card.className = 'site-card';
        const verifiedBadge = site.isPremiumOwner ? '<span style="color:#38bdf8; font-size:14px; margin-left:4px;" title="Verified Pro Creator">☑️</span>' : '';
        card.innerHTML = `<div class="site-preview"><iframe src="/s/${site.slug}" loading="lazy" sandbox="allow-scripts"></iframe></div><div class="site-info"><h3>${escapeHtml(site.projectName || 'Untitled')}${verifiedBadge}</h3><p>@${escapeHtml(site.username)}</p></div>`;
        grid.appendChild(card);
      });
    }).catch(function(err) { console.error(err); });
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
