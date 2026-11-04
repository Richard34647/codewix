// ==========================================================================
// CodeWix — script.js (Full Master File)
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
  // THEME TOGGLE (DARK / LIGHT MODE) & UPGRADE BUTTON
  // ======================================================================
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

    // 👇 INJECT UPGRADE BUTTON 👇
    if (auth) {
      auth.onAuthStateChanged(async function(user) {
        if (!user) return;
        const tokenResult = await user.getIdTokenResult();
        
        // If they are NOT premium, show the upgrade button
        if (tokenResult.claims.premium !== true && !document.getElementById('upgradeNavBtn')) {
          var upBtn = document.createElement('a');
          upBtn.href = 'upgrade.html';
          upBtn.id = 'upgradeNavBtn';
          upBtn.innerHTML = '⭐ Upgrade';
          upBtn.style.cssText = 'background:#fbbf24;color:#020617;padding:6px 12px;border-radius:6px;font-weight:bold;margin-left:10px;text-decoration:none;';
          navMenu.appendChild(upBtn);
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

  // ... (Keep your existing Register, Login, Forgot Password logic) ...
  // [I omitted the auth forms here to save space, but keep them in your actual file!]
  // ======================================================================
  // Sandbox IDE & AI Assistant
  // ======================================================================
  // ... (Keep your existing IDE logic) ...

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
        if (att.type === 'image') {
          var img = document.createElement('img');
          img.src = att.data; img.style.cssText = 'width:24px;height:24px;object-fit:cover;border-radius:4px;';
          chip.appendChild(img);
        }
        var nameSpan = document.createElement('span'); nameSpan.textContent = att.name; chip.appendChild(nameSpan);
        var removeBtn = document.createElement('button'); removeBtn.type = 'button'; removeBtn.innerHTML = '✕';
        removeBtn.style.cssText = 'background:none;border:none;color:#f87171;cursor:pointer;font-weight:bold;padding:0 4px;';
        removeBtn.onclick = function() { pendingAttachments.splice(idx, 1); renderAttachPreview(); };
        chip.appendChild(removeBtn);
        attachPreview.appendChild(chip);
      });
    }

    // 👇 INJECT MEDIA TOGGLES 👇
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

    var SYSTEM_PROMPT = {
      role: 'system',
      content: 'You are the CodeWix AI Assistant. Help users learn to code, debug errors, build projects. Keep answers concise. ALWAYS wrap code in triple-backticks. Tone: encouraging, never condescending.\n\nNOTE: You cannot generate images/videos directly. If asked, tell them to use the "🎨 Image Mode" or "🎬 Video Mode" toggle!'
    };

    var conversation = [SYSTEM_PROMPT];
    var currentChatId = null, currentChatTitle = '', saveTimer = null, authUser = null, currentUserName = 'User';

    function getUsername() {
      if (auth && auth.currentUser) {
        if (auth.currentUser.displayName) return auth.currentUser.displayName;
        if (auth.currentUser.email) return auth.currentUser.email.split('@')[0];
      }
      return 'User';
    }

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

    // 👇 GENERATE IMAGE FUNCTION 👇
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

    // 👇 GENERATE VIDEO FUNCTION 👇
    async function generateVideo(promptText) {
      if (!promptText) { showToast('Please type a prompt.', 'error'); return; }
      var userDiv = appendMessage('user'); setUserMessage(userDiv, promptText);
      var assistantDiv = appendMessage('assistant');
      var messageContent = assistantDiv.querySelector('.message-content');
      messageContent.innerHTML = '<div class="text-part"><span class="typing-dot">●</span><span class="typing-dot">●</span><span class="typing-dot">●</span> Generating video (may take a minute)...</div>';
      
      try {
        var idToken = await authUser.getIdToken();
        var res = await fetch('/api/generate-video', {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + idToken },
          body: JSON.stringify({ prompt: promptText })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Video failed');
        
        messageContent.innerHTML = `<div class="text-part">Here is your video: <strong>"${escapeHtml(promptText)}"</strong></div>
          ${data.duration === 5 && !data.isPremium ? '<p style="color: #fbbf24; font-size: 14px; margin-top: 5px;">💡 Free plan (5s limit). <a href="upgrade.html" style="color:#38bdf8;">Upgrade</a> for 10s!</p>' : ''}
          <div style="margin-top: 10px;"><video src="${data.videoUrl}" controls style="max-width:100%; border-radius:8px; border:2px solid #334155;"></video></div>`;
        conversation.push({ role: 'user', content: promptText }, { role: 'assistant', content: `[Video]` }); scheduleSave();
      } catch (err) { messageContent.innerHTML = `<div class="text-part" style="color: #f87171;">Error: ${escapeHtml(err.message)}</div>`; }
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

    // Copy button logic & Chat history omitted for brevity, but keep them in your file!
  }
});
