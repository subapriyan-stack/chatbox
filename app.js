/**
 * ChatGPT Modern UI Application
 * Integrates with n8n Webhook & OpenRouter LLM
 */

(function () {
  'use strict';

  // ==========================================
  // 1. CONFIGURATION & STATE
  // ==========================================
  const DEFAULT_WEBHOOK_URL = 'https://james1233387.app.n8n.cloud/webhook/chat';
  const STORAGE_KEYS = {
    CHATS: 'chatgpt_chats_v1',
    SETTINGS: 'chatgpt_settings_v1',
    CURRENT_CHAT_ID: 'chatgpt_active_chat_id'
  };

  let state = {
    chats: [],
    currentChatId: null,
    settings: {
      webhookUrl: DEFAULT_WEBHOOK_URL,
      assistantName: 'ICICI AI Assistant',
      theme: 'theme-dark',
      enableStream: true,
      enableAudio: true
    },
    isGenerating: false,
    abortController: null,
    currentAttachedFile: null,
    speechRecognition: null,
    isListening: false
  };

  // ==========================================
  // 2. DOM ELEMENTS
  // ==========================================
  const elements = {
    // Sidebar
    sidebar: document.getElementById('sidebar'),
    sidebarBackdrop: document.getElementById('sidebarBackdrop'),
    btnSidebarOpen: document.getElementById('btnSidebarOpen'),
    btnSidebarClose: document.getElementById('btnSidebarClose'),
    btnNewChat: document.getElementById('btnNewChat'),
    chatSearchInput: document.getElementById('chatSearchInput'),
    btnSearchClear: document.getElementById('btnSearchClear'),
    chatHistoryList: document.getElementById('chatHistoryList'),
    btnOpenSettings: document.getElementById('btnOpenSettings'),
    btnClearAllChats: document.getElementById('btnClearAllChats'),

    // Header
    modelBadge: document.getElementById('modelBadge'),
    modelDropdown: document.getElementById('modelDropdown'),
    displayModelName: document.getElementById('displayModelName'),
    dropdownWebhookUrl: document.getElementById('dropdownWebhookUrl'),
    btnTestWebhookInDropdown: document.getElementById('btnTestWebhookInDropdown'),
    btnSoundToggle: document.getElementById('btnSoundToggle'),
    iconSoundOn: document.getElementById('iconSoundOn'),
    iconSoundOff: document.getElementById('iconSoundOff'),
    btnExportChat: document.getElementById('btnExportChat'),
    btnThemeToggle: document.getElementById('btnThemeToggle'),
    iconThemeMoon: document.getElementById('iconThemeMoon'),
    iconThemeSun: document.getElementById('iconThemeSun'),

    // Chat Container
    chatContainer: document.getElementById('chatContainer'),
    welcomeHero: document.getElementById('welcomeHero'),
    messagesList: document.getElementById('messagesList'),
    typingIndicator: document.getElementById('typingIndicator'),
    scrollAnchor: document.getElementById('scrollAnchor'),
    btnScrollToBottom: document.getElementById('btnScrollToBottom'),

    // Input form
    chatForm: document.getElementById('chatForm'),
    messageInput: document.getElementById('messageInput'),
    btnAttach: document.getElementById('btnAttach'),
    fileInput: document.getElementById('fileInput'),
    attachmentPreview: document.getElementById('attachmentPreview'),
    attachmentFileName: document.getElementById('attachmentFileName'),
    btnRemoveAttachment: document.getElementById('btnRemoveAttachment'),
    btnVoiceInput: document.getElementById('btnVoiceInput'),
    btnSend: document.getElementById('btnSend'),
    iconSend: document.getElementById('iconSend'),
    iconStop: document.getElementById('iconStop'),

    // Settings Modal
    settingsModal: document.getElementById('settingsModal'),
    btnCloseSettings: document.getElementById('btnCloseSettings'),
    btnCancelSettings: document.getElementById('btnCancelSettings'),
    btnSaveSettings: document.getElementById('btnSaveSettings'),
    inputWebhookUrl: document.getElementById('inputWebhookUrl'),
    inputAssistantName: document.getElementById('inputAssistantName'),
    btnTestWebhookInSettings: document.getElementById('btnTestWebhookInSettings'),
    webhookTestResult: document.getElementById('webhookTestResult'),
    toggleStream: document.getElementById('toggleStream'),
    toggleAudio: document.getElementById('toggleAudio'),
    btnResetAll: document.getElementById('btnResetAll'),

    // Export Modal
    exportModal: document.getElementById('exportModal'),
    btnCloseExport: document.getElementById('btnCloseExport'),
    btnExportMarkdown: document.getElementById('btnExportMarkdown'),
    btnExportJSON: document.getElementById('btnExportJSON'),

    // Toast Container
    toastContainer: document.getElementById('toastContainer')
  };

  // ==========================================
  // 3. AUDIO SYNTHESIZER (Web Audio API)
  // ==========================================
  class SoundManager {
    constructor() {
      this.ctx = null;
    }

    init() {
      if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    playSend() {
      if (!state.settings.enableAudio) return;
      try {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(540, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
      } catch (e) {
        console.warn('Audio error:', e);
      }
    }

    playReceive() {
      if (!state.settings.enableAudio) return;
      try {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        
        // Two-tone gentle notification
        [587.33, 880].forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const start = now + idx * 0.08;

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, start);

          gain.gain.setValueAtTime(0.09, start);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.14);

          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(start);
          osc.stop(start + 0.15);
        });
      } catch (e) {
        console.warn('Audio error:', e);
      }
    }

    playTap() {
      if (!state.settings.enableAudio) return;
      try {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(420, now);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.05);
      } catch (e) {}
    }
  }

  const sound = new SoundManager();

  // ==========================================
  // 4. MARKDOWN & SYNTAX HIGHLIGHTING ENGINE
  // ==========================================
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function renderMarkdown(md) {
    if (!md) return '';

    // Array to store code blocks while processing other markdown
    const codeBlocks = [];

    // 1. Extract and preserve code blocks
    let text = md.replace(/```([a-zA-Z0-9_\-\+]*)\n([\s\S]*?)```/g, (match, lang, code) => {
      const id = codeBlocks.length;
      const cleanLang = lang.trim() || 'code';
      const cleanCode = code.replace(/\n$/, '');
      codeBlocks.push({ lang: cleanLang, code: cleanCode });
      return `@@CODE_BLOCK_${id}@@`;
    });

    // 2. Escape HTML for non-code text
    text = escapeHtml(text);

    // 3. Headers (# H1, ## H2, ### H3, #### H4)
    text = text.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
    text = text.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    text = text.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    text = text.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // 4. Horizontal Rules
    text = text.replace(/^---$/gim, '<hr class="md-divider">');

    // 5. Blockquotes (> quote)
    text = text.replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>');

    // 6. Tables (| Col 1 | Col 2 |)
    text = text.replace(/((?:\|[^\n]+\|\r?\n)+)/g, (tableMatch) => {
      const lines = tableMatch.trim().split(/\r?\n/).filter(line => line.includes('|'));
      if (lines.length < 2) return tableMatch;

      let html = '<table>';
      const isHeaderSep = (line) => /^\|(\s*:?-+:?\s*\|)+$/.test(line);

      let headerParsed = false;

      lines.forEach((line) => {
        if (isHeaderSep(line)) {
          headerParsed = true;
          return;
        }

        const cols = line.split('|').slice(1, -1).map(c => c.trim());
        if (!headerParsed) {
          html += '<thead><tr>';
          cols.forEach(c => html += `<th>${c}</th>`);
          html += '</tr></thead><tbody>';
        } else {
          html += '<tr>';
          cols.forEach(c => html += `<td>${c}</td>`);
          html += '</tr>';
        }
      });

      html += '</tbody></table>';
      return html;
    });

    // 7. Bold and Italic
    text = text.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    text = text.replace(/__(.*?)__/g, '<strong>$1</strong>');
    text = text.replace(/_(.*?)_/g, '<em>$1</em>');

    // 8. Inline code (`code`)
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');

    // 9. Links [text](url)
    text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // 10. Lists (Unordered & Ordered)
    // Bullet lists
    text = text.replace(/^\s*[\*\-]\s+(.*$)/gim, '<li class="bullet-item">$1</li>');
    // Numbered lists
    text = text.replace(/^\s*(\d+)\.\s+(.*$)/gim, '<li class="num-item" value="$1">$2</li>');

    // Wrap adjacent <li> in <ul> or <ol>
    text = text.replace(/((?:<li class="bullet-item">.*?<\/li>\s*)+)/g, '<ul>$1</ul>');
    text = text.replace(/((?:<li class="num-item"[^>]*>.*?<\/li>\s*)+)/g, '<ol>$1</ol>');

    // 11. Paragraphs (lines separated by double newlines)
    const paragraphs = text.split(/\n\s*\n/);
    text = paragraphs.map(p => {
      p = p.trim();
      if (!p) return '';
      // Don't wrap if already header, table, list, or blockquote
      if (p.startsWith('<h') || p.startsWith('<ul>') || p.startsWith('<ol>') || p.startsWith('<table>') || p.startsWith('<blockquote>') || p.startsWith('<hr') || p.startsWith('@@CODE_BLOCK_')) {
        return p;
      }
      return `<p>${p.replace(/\n/g, '<br>')}</p>`;
    }).join('\n');

    // 12. Restore and syntax highlight code blocks
    text = text.replace(/@@CODE_BLOCK_(\d+)@@/g, (match, idx) => {
      const block = codeBlocks[parseInt(idx, 10)];
      if (!block) return '';
      const safeCode = escapeHtml(block.code);
      return `
        <div class="code-block">
          <div class="code-block-header">
            <span>${escapeHtml(block.lang)}</span>
            <button class="btn-copy-code" data-code="${encodeURIComponent(block.code)}">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              <span>Copy code</span>
            </button>
          </div>
          <pre><code>${safeCode}</code></pre>
        </div>
      `;
    });

    return text;
  }

  // ==========================================
  // 5. TOAST NOTIFICATIONS
  // ==========================================
  function showToast(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'success' ? 'toast-success' : type === 'error' ? 'toast-error' : ''}`;
    
    const iconSvg = type === 'success'
      ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-green)" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`
      : type === 'error'
      ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--danger-color)" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`
      : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;

    toast.innerHTML = `${iconSvg}<span>${escapeHtml(message)}</span>`;
    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // ==========================================
  // 6. STORAGE & CHAT MANAGEMENT
  // ==========================================
  function loadFromStorage() {
    try {
      const savedChats = localStorage.getItem(STORAGE_KEYS.CHATS);
      if (savedChats) state.chats = JSON.parse(savedChats);

      const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (savedSettings) state.settings = { ...state.settings, ...JSON.parse(savedSettings) };

      const savedChatId = localStorage.getItem(STORAGE_KEYS.CURRENT_CHAT_ID);
      if (savedChatId && state.chats.some(c => c.id === savedChatId)) {
        state.currentChatId = savedChatId;
      } else if (state.chats.length > 0) {
        state.currentChatId = state.chats[0].id;
      }
    } catch (e) {
      console.error('Storage load failed:', e);
    }
  }

  function saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(state.chats));
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(state.settings));
      if (state.currentChatId) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_CHAT_ID, state.currentChatId);
      }
    } catch (e) {
      console.error('Storage save failed:', e);
    }
  }

  function createNewChat() {
    const newChat = {
      id: 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      title: 'New chat',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: []
    };

    state.chats.unshift(newChat);
    state.currentChatId = newChat.id;
    saveToStorage();
    renderChatHistory();
    renderActiveChat();

    // Close mobile sidebar if open
    closeMobileSidebar();
    elements.messageInput.focus();
    sound.playTap();
  }

  function getCurrentChat() {
    return state.chats.find(c => c.id === state.currentChatId) || null;
  }

  function switchChat(chatId) {
    if (state.isGenerating) {
      showToast('Please wait or stop the current generation', 'error');
      return;
    }
    state.currentChatId = chatId;
    saveToStorage();
    renderChatHistory();
    renderActiveChat();
    closeMobileSidebar();
    sound.playTap();
  }

  function deleteChat(chatId, e) {
    if (e) e.stopPropagation();
    if (!confirm('Are you sure you want to delete this conversation?')) return;

    state.chats = state.chats.filter(c => c.id !== chatId);
    if (state.currentChatId === chatId) {
      state.currentChatId = state.chats.length > 0 ? state.chats[0].id : null;
    }
    saveToStorage();
    renderChatHistory();
    renderActiveChat();
    showToast('Conversation deleted', 'info');
  }

  function renameChat(chatId, e) {
    if (e) e.stopPropagation();
    const chat = state.chats.find(c => c.id === chatId);
    if (!chat) return;

    const newTitle = prompt('Enter new conversation title:', chat.title);
    if (newTitle && newTitle.trim()) {
      chat.title = newTitle.trim();
      chat.updatedAt = new Date().toISOString();
      saveToStorage();
      renderChatHistory();
      showToast('Title updated', 'success');
    }
  }

  // ==========================================
  // 7. UI RENDERING
  // ==========================================
  function renderChatHistory(filterQuery = '') {
    const container = elements.chatHistoryList;
    container.innerHTML = '';

    const query = (filterQuery || '').toLowerCase().trim();
    const filtered = state.chats.filter(c => {
      if (!query) return true;
      if (c.title.toLowerCase().includes(query)) return true;
      return c.messages.some(m => m.content.toLowerCase().includes(query));
    });

    if (filtered.length === 0) {
      container.innerHTML = `<div class="history-empty-state">${query ? 'No matching chats found' : 'No conversations yet'}</div>`;
      return;
    }

    filtered.forEach(chat => {
      const item = document.createElement('div');
      item.className = `chat-history-item ${chat.id === state.currentChatId ? 'active' : ''}`;
      item.onclick = () => switchChat(chat.id);

      item.innerHTML = `
        <span class="chat-item-title" title="${escapeHtml(chat.title)}">${escapeHtml(chat.title)}</span>
        <div class="chat-item-actions">
          <button class="btn-item-action" title="Rename" onclick="window.chatApp.renameChat('${chat.id}', event)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
          </button>
          <button class="btn-item-action delete" title="Delete" onclick="window.chatApp.deleteChat('${chat.id}', event)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      `;

      container.appendChild(item);
    });
  }

  function renderActiveChat() {
    const chat = getCurrentChat();
    const hasMessages = chat && chat.messages && chat.messages.length > 0;

    if (!hasMessages) {
      elements.welcomeHero.style.display = 'flex';
      elements.messagesList.innerHTML = '';
      return;
    }

    elements.welcomeHero.style.display = 'none';
    elements.messagesList.innerHTML = '';

    chat.messages.forEach(msg => {
      appendMessageToDOM(msg, false);
    });

    scrollToBottom(false);
  }

  function formatTime(isoString) {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  }

  function appendMessageToDOM(msg, shouldScroll = true) {
    elements.welcomeHero.style.display = 'none';

    const row = document.createElement('div');
    row.className = `message-row ${msg.role}`;
    row.id = `msg-${msg.id}`;

    const isUser = msg.role === 'user';

    const avatarHtml = isUser
      ? `<div class="avatar-box user-avatar">
           <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
         </div>`
      : `<div class="avatar-box ai-avatar">
           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 0 1 10 10c0 4.4-2.8 8.2-6.8 9.5-.5.1-.7-.2-.7-.5v-1.7c0-.8-.3-1.4-.7-1.7 2.4-.3 4.9-1.2 4.9-5.4 0-1.2-.4-2.2-1.1-3 .1-.3.5-1.4-.1-2.9 0 0-.9-.3-3 1.1-.9-.2-1.8-.4-2.8-.4s-1.9.2-2.8.4c-2.1-1.4-3-1.1-3-1.1-.6 1.5-.2 2.6-.1 2.9-.7.8-1.1 1.8-1.1 3 0 4.2 2.5 5.1 4.9 5.4-.3.3-.6.8-.7 1.5-.6.3-2.1.7-3-.9-.6-1-1.7-1.1-1.7-1.1-1.1 0-.1.7-.1.7.7.4 1.2 1.8 1.2 1.8 1 3 4.2 2.1 4.2 2.1v2.1c0 .3-.2.6-.7.5C4.8 20.2 2 16.4 2 12A10 10 0 0 1 12 2z"/></svg>
         </div>`;

    let contentHtml = '';
    if (isUser) {
      // If user had an attachment
      const attachInfo = msg.attachmentName
        ? `<div class="attachment-chip" style="margin-bottom:6px;"><svg class="chip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg><span>${escapeHtml(msg.attachmentName)}</span></div>`
        : '';
      contentHtml = `${attachInfo}${escapeHtml(msg.content)}`;
    } else {
      contentHtml = renderMarkdown(msg.content);
    }

    // Assistant message action buttons
    const actionsHtml = !isUser
      ? `
        <div class="message-actions">
          <button class="btn-msg-action" title="Copy message" onclick="window.chatApp.copyMessageText('${msg.id}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          </button>
          <button class="btn-msg-action" title="Read aloud" onclick="window.chatApp.speakMessage('${msg.id}', this)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
          </button>
          <button class="btn-msg-action" title="Regenerate response" onclick="window.chatApp.regenerateLast()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
          </button>
          <span class="msg-timestamp">${formatTime(msg.timestamp)}</span>
        </div>
      `
      : `<span class="msg-timestamp" style="align-self:flex-end; margin-top:4px;">${formatTime(msg.timestamp)}</span>`;

    row.innerHTML = `
      ${avatarHtml}
      <div class="message-content-wrapper">
        <div class="message-bubble" id="bubble-${msg.id}">
          ${contentHtml}
        </div>
        ${actionsHtml}
      </div>
    `;

    elements.messagesList.appendChild(row);
    setupCopyCodeListeners(row);

    if (shouldScroll) {
      scrollToBottom();
    }
  }

  function setupCopyCodeListeners(container) {
    const copyButtons = container.querySelectorAll('.btn-copy-code');
    copyButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const rawCode = decodeURIComponent(btn.getAttribute('data-code') || '');
        navigator.clipboard.writeText(rawCode).then(() => {
          btn.innerHTML = `
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent-green)" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <span style="color:var(--accent-green)">Copied!</span>
          `;
          sound.playTap();
          setTimeout(() => {
            btn.innerHTML = `
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              <span>Copy code</span>
            `;
          }, 2000);
        });
      });
    });
  }

  // ==========================================
  // 8. SCROLL MANAGEMENT
  // ==========================================
  function scrollToBottom(smooth = true) {
    elements.chatContainer.scrollTo({
      top: elements.chatContainer.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto'
    });
  }

  function handleChatScroll() {
    const threshold = 120;
    const distanceToBottom = elements.chatContainer.scrollHeight - elements.chatContainer.scrollTop - elements.chatContainer.clientHeight;
    if (distanceToBottom > threshold) {
      elements.btnScrollToBottom.style.display = 'flex';
    } else {
      elements.btnScrollToBottom.style.display = 'none';
    }
  }

  // ==========================================
  // 9. N8N API CALL & STREAM SIMULATION
  // ==========================================
  async function callN8nWebhook(userText, attachedFile = null) {
    const url = state.settings.webhookUrl.trim() || DEFAULT_WEBHOOK_URL;
    state.abortController = new AbortController();

    const payload = {
      chatInput: userText,
      message: userText,
      prompt: userText,
      sessionId: state.currentChatId,
      timestamp: new Date().toISOString()
    };

    if (attachedFile) {
      payload.attachment = {
        name: attachedFile.name,
        type: attachedFile.type,
        size: attachedFile.size,
        content: attachedFile.dataUrl
      };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/plain, application/json, */*'
      },
      body: JSON.stringify(payload),
      signal: state.abortController.signal
    });

    if (!response.ok) {
      throw new Error(`n8n webhook responded with status ${response.status} (${response.statusText})`);
    }

    const contentType = response.headers.get('content-type') || '';
    let resultText = '';

    if (contentType.includes('application/json')) {
      const data = await response.json();
      if (typeof data === 'string') {
        resultText = data;
      } else if (data.output) {
        resultText = data.output;
      } else if (data.text) {
        resultText = data.text;
      } else if (data.message) {
        resultText = data.message;
      } else if (data.response) {
        resultText = data.response;
      } else if (data.data) {
        resultText = typeof data.data === 'string' ? data.data : JSON.stringify(data.data, null, 2);
      } else {
        resultText = JSON.stringify(data, null, 2);
      }
    } else {
      resultText = await response.text();
    }

    return resultText;
  }

  async function streamTypewriter(bubbleElem, fullText) {
    if (!state.settings.enableStream) {
      bubbleElem.innerHTML = renderMarkdown(fullText);
      setupCopyCodeListeners(bubbleElem);
      return;
    }

    // Split text into word chunks for smooth natural reading cadence
    const words = fullText.split(/(\s+)/);
    let accumulated = '';

    for (let i = 0; i < words.length; i++) {
      if (!state.isGenerating) break; // User stopped generation
      accumulated += words[i];

      // Update bubble with currently accumulated markdown and a glowing cursor
      bubbleElem.innerHTML = renderMarkdown(accumulated) + '<span class="typewriter-cursor"></span>';
      scrollToBottom(false);

      // Delay between tokens
      const delay = Math.min(25, Math.max(10, Math.floor(400 / words.length)));
      await new Promise(r => setTimeout(r, delay));
    }

    // Final clean render without cursor
    bubbleElem.innerHTML = renderMarkdown(fullText);
    setupCopyCodeListeners(bubbleElem);
  }

  // ==========================================
  // 10. SEND MESSAGE WORKFLOW
  // ==========================================
  async function handleSendMessage(customPrompt = null) {
    if (state.isGenerating) {
      // If currently generating, stop it
      stopGeneration();
      return;
    }

    const text = customPrompt !== null ? customPrompt : elements.messageInput.value.trim();
    if (!text && !state.currentAttachedFile) return;

    // Ensure active chat exists
    if (!state.currentChatId || !getCurrentChat()) {
      createNewChat();
    }

    const chat = getCurrentChat();

    // Sound effect
    sound.playSend();

    // 1. Create User Message
    const userMsg = {
      id: 'msg_' + Date.now(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
      attachmentName: state.currentAttachedFile ? state.currentAttachedFile.name : null
    };

    chat.messages.push(userMsg);
    chat.updatedAt = new Date().toISOString();

    // Auto-generate title if this is the first message
    if (chat.messages.length === 1 || chat.title === 'New chat') {
      const generatedTitle = text.slice(0, 32).trim() + (text.length > 32 ? '...' : '');
      chat.title = generatedTitle || 'Banking Query';
    }

    saveToStorage();
    renderChatHistory();
    appendMessageToDOM(userMsg, true);

    // Reset input form
    elements.messageInput.value = '';
    elements.messageInput.style.height = 'auto';
    updateSendButtonState();
    clearAttachment();

    // 2. Set Generating State
    setGeneratingState(true);

    // Create placeholder Assistant message
    const assistantMsg = {
      id: 'msg_' + (Date.now() + 1),
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString()
    };

    try {
      // Call n8n
      const responseText = await callN8nWebhook(text, userMsg.attachmentName ? state.currentAttachedFile : null);
      sound.playReceive();

      // Hide typing indicator, append assistant row to DOM
      elements.typingIndicator.style.display = 'none';
      appendMessageToDOM(assistantMsg, true);

      const bubbleElem = document.getElementById(`bubble-${assistantMsg.id}`);

      // Stream the typewriter text
      await streamTypewriter(bubbleElem, responseText);

      // Save message in state
      assistantMsg.content = responseText;
      chat.messages.push(assistantMsg);
      chat.updatedAt = new Date().toISOString();
      saveToStorage();

    } catch (err) {
      if (err.name === 'AbortError') {
        showToast('Generation cancelled', 'info');
      } else {
        console.error('Webhook error:', err);
        sound.playTap();

        elements.typingIndicator.style.display = 'none';
        assistantMsg.content = `> ⚠️ **Error connecting to n8n Webhook**\n\nCould not reach: \`${state.settings.webhookUrl}\`\n\n**Details:** ${err.message}\n\n*Suggestions:*\n- Check if your n8n workflow is set to Active (Production)\n- Verify your network connection\n- You can test or update the webhook endpoint in [Settings](#settings)`;
        chat.messages.push(assistantMsg);
        saveToStorage();
        appendMessageToDOM(assistantMsg, true);
        showToast('Failed to reach n8n assistant', 'error');
      }
    } finally {
      setGeneratingState(false);
      scrollToBottom();
    }
  }

  function setGeneratingState(isGen) {
    state.isGenerating = isGen;

    if (isGen) {
      elements.typingIndicator.style.display = 'flex';
      elements.iconSend.style.display = 'none';
      elements.iconStop.style.display = 'block';
      elements.btnSend.disabled = false;
      elements.btnSend.classList.add('generating');
      elements.btnSend.title = 'Stop generation';
      scrollToBottom();
    } else {
      elements.typingIndicator.style.display = 'none';
      elements.iconSend.style.display = 'block';
      elements.iconStop.style.display = 'none';
      elements.btnSend.classList.remove('generating');
      elements.btnSend.title = 'Send message (Enter)';
      updateSendButtonState();
      state.abortController = null;
    }
  }

  function stopGeneration() {
    if (state.abortController) {
      state.abortController.abort();
    }
    state.isGenerating = false;
    setGeneratingState(false);
  }

  function regenerateLast() {
    const chat = getCurrentChat();
    if (!chat || chat.messages.length === 0) return;

    // Find the last user message
    let lastUserPrompt = '';
    for (let i = chat.messages.length - 1; i >= 0; i--) {
      if (chat.messages[i].role === 'user') {
        lastUserPrompt = chat.messages[i].content;
        break;
      }
    }

    if (lastUserPrompt) {
      handleSendMessage(lastUserPrompt);
    }
  }

  // ==========================================
  // 11. VOICE DICTATION (Web Speech API)
  // ==========================================
  function initVoiceRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      elements.btnVoiceInput.title = 'Voice dictation not supported in this browser';
      elements.btnVoiceInput.style.opacity = '0.4';
      return;
    }

    state.speechRecognition = new SpeechRecognition();
    state.speechRecognition.continuous = false;
    state.speechRecognition.interimResults = false;
    state.speechRecognition.lang = 'en-US';

    state.speechRecognition.onstart = () => {
      state.isListening = true;
      elements.btnVoiceInput.classList.add('recording');
      elements.btnVoiceInput.title = 'Listening... Speak into microphone';
      showToast('Listening... Speak now', 'info');
    };

    state.speechRecognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (transcript) {
        elements.messageInput.value = (elements.messageInput.value + ' ' + transcript).trim();
        adjustTextareaHeight();
        updateSendButtonState();
        sound.playTap();
      }
    };

    state.speechRecognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      showToast('Voice error: ' + event.error, 'error');
    };

    state.speechRecognition.onend = () => {
      state.isListening = false;
      elements.btnVoiceInput.classList.remove('recording');
      elements.btnVoiceInput.title = 'Voice dictation (Click to speak)';
    };
  }

  function toggleVoiceInput() {
    if (!state.speechRecognition) {
      showToast('Voice dictation is not supported in this browser', 'error');
      return;
    }

    if (state.isListening) {
      state.speechRecognition.stop();
    } else {
      try {
        state.speechRecognition.start();
      } catch (e) {
        console.warn('Speech start error:', e);
      }
    }
  }

  // ==========================================
  // 12. TEXT TO SPEECH (TTS)
  // ==========================================
  function speakMessage(msgId, buttonElem) {
    if (!window.speechSynthesis) {
      showToast('Speech synthesis not supported in this browser', 'error');
      return;
    }

    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      document.querySelectorAll('.btn-msg-action').forEach(b => b.classList.remove('active'));
      return;
    }

    const chat = getCurrentChat();
    const msg = chat ? chat.messages.find(m => m.id === msgId) : null;
    if (!msg) return;

    // Strip markdown formatting for cleaner speech
    const cleanText = msg.content
      .replace(/[*#`_~\[\]]/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    buttonElem.classList.add('active');

    utterance.onend = () => {
      buttonElem.classList.remove('active');
    };

    utterance.onerror = () => {
      buttonElem.classList.remove('active');
    };

    window.speechSynthesis.speak(utterance);
  }

  // ==========================================
  // 13. FILE ATTACHMENTS
  // ==========================================
  function handleFileSelect(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      state.currentAttachedFile = {
        name: file.name,
        size: file.size,
        type: file.type,
        dataUrl: event.target.result
      };

      elements.attachmentFileName.textContent = file.name;
      elements.attachmentPreview.style.display = 'flex';
      updateSendButtonState();
      sound.playTap();
      showToast(`Attached: ${file.name}`, 'info');
    };
    reader.readAsDataURL(file);
    elements.fileInput.value = '';
  }

  function clearAttachment() {
    state.currentAttachedFile = null;
    elements.attachmentPreview.style.display = 'none';
    elements.attachmentFileName.textContent = '';
  }

  // ==========================================
  // 14. THEME & SETTINGS
  // ==========================================
  function applyTheme(themeName) {
    document.body.className = '';
    document.body.classList.add(themeName);
    state.settings.theme = themeName;
    saveToStorage();

    // Update Header theme icon
    if (themeName === 'theme-light') {
      elements.iconThemeMoon.style.display = 'none';
      elements.iconThemeSun.style.display = 'block';
    } else {
      elements.iconThemeMoon.style.display = 'block';
      elements.iconThemeSun.style.display = 'none';
    }
  }

  function toggleThemeQuick() {
    const themes = ['theme-dark', 'theme-midnight', 'theme-light'];
    const currentIdx = themes.indexOf(state.settings.theme);
    const nextTheme = themes[(currentIdx + 1) % themes.length];
    applyTheme(nextTheme);
    sound.playTap();
    showToast(`Switched to ${nextTheme.replace('theme-', '').toUpperCase()} theme`, 'info');
  }

  function openSettingsModal() {
    elements.inputWebhookUrl.value = state.settings.webhookUrl || DEFAULT_WEBHOOK_URL;
    elements.inputAssistantName.value = state.settings.assistantName || 'ICICI AI Assistant';
    elements.toggleStream.checked = state.settings.enableStream !== false;
    elements.toggleAudio.checked = state.settings.enableAudio !== false;

    // Set radio theme
    const themeRadio = document.querySelector(`input[name="radioTheme"][value="${state.settings.theme}"]`);
    if (themeRadio) themeRadio.checked = true;

    elements.webhookTestResult.textContent = 'Ready to test';
    elements.webhookTestResult.className = 'setting-hint';

    elements.settingsModal.style.display = 'flex';
    sound.playTap();
  }

  function closeSettingsModal() {
    elements.settingsModal.style.display = 'none';
  }

  function saveSettings() {
    const newUrl = elements.inputWebhookUrl.value.trim();
    const newName = elements.inputAssistantName.value.trim();
    const selectedTheme = document.querySelector('input[name="radioTheme"]:checked')?.value || 'theme-dark';

    state.settings.webhookUrl = newUrl || DEFAULT_WEBHOOK_URL;
    state.settings.assistantName = newName || 'ICICI AI Assistant';
    state.settings.enableStream = elements.toggleStream.checked;
    state.settings.enableAudio = elements.toggleAudio.checked;

    applyTheme(selectedTheme);
    saveToStorage();

    elements.displayModelName.textContent = state.settings.assistantName;
    elements.dropdownWebhookUrl.textContent = state.settings.webhookUrl;
    updateAudioIconState();

    closeSettingsModal();
    sound.playTap();
    showToast('Settings saved successfully', 'success');
  }

  async function testWebhookPing(targetElement) {
    const url = (elements.inputWebhookUrl.value || state.settings.webhookUrl).trim();
    if (!url) return;

    targetElement.textContent = 'Testing connection...';
    targetElement.className = 'setting-hint';

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatInput: 'ping', message: 'ping' })
      });

      if (res.ok) {
        targetElement.textContent = '✅ Connected successfully! n8n responded with 200 OK.';
        targetElement.className = 'setting-hint success';
        sound.playReceive();
      } else {
        targetElement.textContent = `⚠️ Connected, but n8n returned HTTP status ${res.status}`;
        targetElement.className = 'setting-hint error';
      }
    } catch (e) {
      targetElement.textContent = `❌ Failed to connect: ${e.message}`;
      targetElement.className = 'setting-hint error';
    }
  }

  function toggleAudioSetting() {
    state.settings.enableAudio = !state.settings.enableAudio;
    saveToStorage();
    updateAudioIconState();
    sound.playTap();
    showToast(`Sound effects: ${state.settings.enableAudio ? 'ON' : 'OFF'}`, 'info');
  }

  function updateAudioIconState() {
    if (state.settings.enableAudio) {
      elements.iconSoundOn.style.display = 'block';
      elements.iconSoundOff.style.display = 'none';
      elements.btnSoundToggle.title = 'Sound effects: On';
    } else {
      elements.iconSoundOn.style.display = 'none';
      elements.iconSoundOff.style.display = 'block';
      elements.btnSoundToggle.title = 'Sound effects: Off';
    }
  }

  // ==========================================
  // 15. EXPORT CONVERSATION
  // ==========================================
  function openExportModal() {
    const chat = getCurrentChat();
    if (!chat || chat.messages.length === 0) {
      showToast('No messages in this chat to export', 'error');
      return;
    }
    elements.exportModal.style.display = 'flex';
    sound.playTap();
  }

  function exportAsMarkdown() {
    const chat = getCurrentChat();
    if (!chat) return;

    let md = `# Conversation: ${chat.title}\n`;
    md += `*Exported on ${new Date().toLocaleString()}*\n\n---\n\n`;

    chat.messages.forEach(msg => {
      const sender = msg.role === 'user' ? '👤 User' : `🤖 ${state.settings.assistantName}`;
      md += `### ${sender} (${formatTime(msg.timestamp)})\n\n`;
      md += `${msg.content}\n\n---\n\n`;
    });

    downloadBlob(md, `${chat.title.replace(/[^a-z0-9]/gi, '_')}.md`, 'text/markdown');
    elements.exportModal.style.display = 'none';
    showToast('Exported Markdown file', 'success');
  }

  function exportAsJSON() {
    const chat = getCurrentChat();
    if (!chat) return;

    const data = JSON.stringify(chat, null, 2);
    downloadBlob(data, `${chat.title.replace(/[^a-z0-9]/gi, '_')}.json`, 'application/json');
    elements.exportModal.style.display = 'none';
    showToast('Exported JSON file', 'success');
  }

  function downloadBlob(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ==========================================
  // 16. MOBILE SIDEBAR
  // ==========================================
  function toggleMobileSidebar() {
    elements.sidebar.classList.toggle('collapsed');
    const isNowOpen = !elements.sidebar.classList.contains('collapsed');
    if (window.innerWidth <= 768) {
      elements.sidebarBackdrop.classList.toggle('active', isNowOpen);
    }
    sound.playTap();
  }

  function closeMobileSidebar() {
    if (window.innerWidth <= 768) {
      elements.sidebar.classList.add('collapsed');
      elements.sidebarBackdrop.classList.remove('active');
    }
  }

  // ==========================================
  // 17. INPUT SIZING & SEND BUTTON
  // ==========================================
  function adjustTextareaHeight() {
    const textarea = elements.messageInput;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
  }

  function updateSendButtonState() {
    if (state.isGenerating) return;
    const hasText = elements.messageInput.value.trim().length > 0 || state.currentAttachedFile !== null;
    elements.btnSend.disabled = !hasText;
    elements.btnSend.classList.toggle('active-send', hasText);
  }

  // ==========================================
  // 18. INITIALIZATION & EVENT LISTENERS
  // ==========================================
  function init() {
    loadFromStorage();
    applyTheme(state.settings.theme);
    updateAudioIconState();

    elements.displayModelName.textContent = state.settings.assistantName || 'ICICI AI Assistant';
    elements.dropdownWebhookUrl.textContent = state.settings.webhookUrl || DEFAULT_WEBHOOK_URL;

    // If no chats exist, start fresh
    if (state.chats.length === 0) {
      createNewChat();
    } else {
      renderChatHistory();
      renderActiveChat();
    }

    initVoiceRecognition();

    // Event Listeners: Sidebar
    elements.btnSidebarOpen.addEventListener('click', toggleMobileSidebar);
    elements.btnSidebarClose.addEventListener('click', toggleMobileSidebar);
    elements.sidebarBackdrop.addEventListener('click', closeMobileSidebar);
    elements.btnNewChat.addEventListener('click', createNewChat);

    // Search
    elements.chatSearchInput.addEventListener('input', (e) => {
      const val = e.target.value;
      elements.btnSearchClear.style.display = val ? 'block' : 'none';
      renderChatHistory(val);
    });

    elements.btnSearchClear.addEventListener('click', () => {
      elements.chatSearchInput.value = '';
      elements.btnSearchClear.style.display = 'none';
      renderChatHistory();
    });

    // Clear all chats
    elements.btnClearAllChats.addEventListener('click', () => {
      if (confirm('Clear all conversation history? This cannot be undone.')) {
        state.chats = [];
        state.currentChatId = null;
        createNewChat();
        showToast('All chat history cleared', 'info');
      }
    });

    // Model Dropdown
    elements.modelBadge.addEventListener('click', (e) => {
      e.stopPropagation();
      elements.modelDropdown.classList.toggle('show');
    });

    document.addEventListener('click', () => {
      elements.modelDropdown.classList.remove('show');
    });

    elements.btnTestWebhookInDropdown.addEventListener('click', (e) => {
      e.stopPropagation();
      testWebhookPing(elements.dropdownWebhookUrl);
    });

    // Header actions
    elements.btnSoundToggle.addEventListener('click', toggleAudioSetting);
    elements.btnThemeToggle.addEventListener('click', toggleThemeQuick);
    elements.btnExportChat.addEventListener('click', openExportModal);
    elements.btnOpenSettings.addEventListener('click', openSettingsModal);

    // Scroll bottom button
    elements.chatContainer.addEventListener('scroll', handleChatScroll);
    elements.btnScrollToBottom.addEventListener('click', () => scrollToBottom(true));

    // Form and Textarea
    elements.messageInput.addEventListener('input', () => {
      adjustTextareaHeight();
      updateSendButtonState();
    });

    elements.messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    });

    elements.chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleSendMessage();
    });

    // Suggestion Cards in Welcome Hero
    document.querySelectorAll('.suggestion-card').forEach(card => {
      card.addEventListener('click', () => {
        const prompt = card.getAttribute('data-prompt');
        if (prompt) {
          handleSendMessage(prompt);
        }
      });
    });

    // Attachment
    elements.btnAttach.addEventListener('click', () => elements.fileInput.click());
    elements.fileInput.addEventListener('change', handleFileSelect);
    elements.btnRemoveAttachment.addEventListener('click', clearAttachment);

    // Voice Dictation
    elements.btnVoiceInput.addEventListener('click', toggleVoiceInput);

    // Settings Modal
    elements.btnCloseSettings.addEventListener('click', closeSettingsModal);
    elements.btnCancelSettings.addEventListener('click', closeSettingsModal);
    elements.btnSaveSettings.addEventListener('click', saveSettings);
    elements.btnTestWebhookInSettings.addEventListener('click', () => {
      testWebhookPing(elements.webhookTestResult);
    });

    elements.btnResetAll.addEventListener('click', () => {
      if (confirm('This will wipe all conversations and reset settings to default. Proceed?')) {
        localStorage.clear();
        state.chats = [];
        state.settings = {
          webhookUrl: DEFAULT_WEBHOOK_URL,
          assistantName: 'ICICI AI Assistant',
          theme: 'theme-dark',
          enableStream: true,
          enableAudio: true
        };
        location.reload();
      }
    });

    // Export Modal
    elements.btnCloseExport.addEventListener('click', () => elements.exportModal.style.display = 'none');
    elements.btnExportMarkdown.addEventListener('click', exportAsMarkdown);
    elements.btnExportJSON.addEventListener('click', exportAsJSON);

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
      // Ctrl+Shift+O: New Chat
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        createNewChat();
      }
      // Escape: Close Modals
      if (e.key === 'Escape') {
        closeSettingsModal();
        elements.exportModal.style.display = 'none';
        elements.modelDropdown.classList.remove('show');
      }
    });
  }

  // Global methods for inline HTML events
  window.chatApp = {
    deleteChat,
    renameChat,
    speakMessage,
    regenerateLast,
    copyMessageText: (msgId) => {
      const chat = getCurrentChat();
      const msg = chat ? chat.messages.find(m => m.id === msgId) : null;
      if (msg) {
        navigator.clipboard.writeText(msg.content).then(() => {
          sound.playTap();
          showToast('Message copied to clipboard', 'success');
        });
      }
    }
  };

  // Start app on DOM load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
