/**
 * group-chat.js
 * Chat P2P tra membri del gruppo con notifiche push
 * Messaggi salvati in localStorage per storia locale
 */

window.groupChat = (() => {
  let chatHistory = {};
  let chatPanelOpen = false;

  function isValidAvatarString(value) {
    return typeof value === 'string' && (
      value.startsWith('data:image/') ||
      value.startsWith('http://') ||
      value.startsWith('https://')
    );
  }

  function normalizeChatMessage(message) {
    if (!message || typeof message !== 'object') return null;

    const from = typeof message.from === 'string' && message.from.trim() ? message.from.trim() : 'Anonimo';
    const text = typeof message.text === 'string' ? message.text.trim() : '';
    if (!text) return null;

    return {
      id: typeof message.id === 'string' ? message.id : `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      from,
      fromPeerId: typeof message.fromPeerId === 'string' ? message.fromPeerId : null,
      avatar: isValidAvatarString(message.avatar) ? message.avatar : null,
      text,
      timestamp: typeof message.timestamp === 'string' && !Number.isNaN(Date.parse(message.timestamp))
        ? message.timestamp
        : new Date().toISOString(),
      type: 'message'
    };
  }

  /**
   * Inizializza chat per una stanza
   */
  function initChat(roomId) {
    const cacheKey = `groupchat_${roomId}`;
    
    try {
      const cached = localStorage.getItem(cacheKey);
      chatHistory = cached ? JSON.parse(cached) : { messages: [], members: [] };
    } catch (e) {
      chatHistory = { messages: [], members: [] };
    }

    if (!chatHistory || typeof chatHistory !== 'object') {
      chatHistory = { messages: [], members: [] };
    }
    if (!Array.isArray(chatHistory.messages)) {
      chatHistory.messages = [];
    }
    chatHistory.messages = chatHistory.messages.filter(msg => msg && typeof msg === 'object' && typeof msg.text === 'string');
    
    console.log(`[GroupChat] Initialized for room ${roomId}`, { chatHistory });
  }
  
  /**
   * Invia messaggio P2P a tutti i membri del gruppo
   */
  function sendGroupMessage(text) {
    const group = window.state?.group;
    console.log('[GroupChat] sendGroupMessage start', { text, group });
    if (!group) {
      console.warn('[GroupChat] Not in a group');
      return;
    }
    
    if (!text || text.trim() === '') return;
    
    const rawMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      from: group.myName || 'Anonimo',
      fromPeerId: window.peerGPS?.getMyPeerId?.() || null,
      avatar: group.myAvatar || window.createAvatarDataUrl?.(group.myName || 'User'),
      text: text.trim(),
      timestamp: new Date().toISOString(),
      type: 'message'
    };
    const message = normalizeChatMessage(rawMessage);
    if (!message) {
      console.warn('[GroupChat] Message normalization failed', { rawMessage });
      return;
    }

    // Salva localmente
    chatHistory.messages = chatHistory.messages || [];
    chatHistory.messages.push(message);
    saveChat(group.roomId);
    
    // Invia P2P a tutti i peer connessi
    const peerConnections = window.peerGPS?.getPeerConnections?.() || {};
    for (const [peerId, conn] of Object.entries(peerConnections)) {
      if (conn && conn.open) {
        try {
          conn.send({
            type: 'groupchat',
            payload: message
          });
        } catch (e) {
          console.warn(`[GroupChat] Send to ${peerId} failed:`, e);
        }
      }
    }
    
    // Rirenderizza
    renderChatPanel();
    
    console.log(`[GroupChat] Message sent by ${message.from}`);
  }
  
  /**
   * Ricevi messaggio P2P (chiamata da features-gps.js)
   */
  function receiveGroupMessage(message) {
    const group = window.state?.group;
    if (!group) return;

    const normalizedMessage = normalizeChatMessage(message);
    if (!normalizedMessage) {
      console.warn('[GroupChat] Ignored invalid incoming payload', message);
      return;
    }

    chatHistory.messages = chatHistory.messages || [];
    chatHistory.messages.push(normalizedMessage);
    saveChat(group.roomId);
    
    // Notifica push (se pannello non aperto)
    if (!chatPanelOpen) {
      notifyNewMessage(normalizedMessage);
    }
    
    // Rirenderizza se pannello aperto
    if (chatPanelOpen) {
      renderChatPanel();
    }
  }
  
  /**
   * Notifica push per nuovo messaggio
   */
  function notifyNewMessage(message) {
    if (!('Notification' in window)) return;
    
    if (Notification.permission === 'granted') {
      new Notification(`${message.from} (Gruppo)`, {
        body: message.text,
        icon: message.avatar || '💬',
        tag: 'groupchat'
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(`${message.from} (Gruppo)`, {
            body: message.text,
            icon: message.avatar || '💬',
            tag: 'groupchat'
          });
        }
      });
    }
  }
  
  /**
   * Renderizza pannello chat
   */
  function renderChatPanel() {
    const container = document.getElementById('group-chat-panel');
    if (!container) return;
    
    const messages = chatHistory.messages || [];
    const group = window.state?.group;
    const myPeerId = group?.myPeerId || window.peerGPS?.getMyPeerId?.();
    
    const messagesHtml = messages.slice(-50).map(msg => {
      const messageFrom = msg?.from || 'Anonimo';
      const messageText = msg?.text || '';
      const messageTime = msg?.timestamp ? new Date(msg.timestamp) : new Date();
      const avatar = isValidAvatarString(msg?.avatar) ? msg.avatar : null;
      const isOwn = myPeerId ? msg.fromPeerId === myPeerId : messageFrom === group?.myName;
      const time = messageTime.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
      
      const avatarHtml = avatar ? `
            <img src="${avatar}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; background: var(--primary);" />
          ` : `
            <div style="
              width: 32px;
              height: 32px;
              border-radius: 50%;
              background: var(--primary);
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
              font-size: 16px;
              font-weight: 600;
              color: white;
            ">${escapeHtml(messageFrom.charAt(0).toUpperCase())}</div>
          `;

      return `
        <div style="
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
          justify-content: ${isOwn ? 'flex-end' : 'flex-start'};
          align-items: flex-end;
        ">
          ${!isOwn ? avatarHtml : ''}
          
          <div style="max-width: 70%;">
            ${!isOwn ? `<div style="font-size: 12px; font-weight: 600; margin-bottom: 3px; padding: 0 8px; color: var(--muted);">${escapeHtml(messageFrom)}</div>` : ''}
            <div style="
              background: ${isOwn ? 'var(--accent)' : 'var(--surface-2)'};
              color: ${isOwn ? '#fff' : 'var(--text)'};
              padding: 8px 12px;
              border-radius: 8px;
              word-wrap: break-word;
              font-size: 13px;
            ">
              ${escapeHtml(messageText)}
            </div>
            <div style="
              font-size: 11px;
              opacity: 0.6;
              margin-top: 3px;
              padding: 0 8px;
              text-align: ${isOwn ? 'right' : 'left'};
            ">${time}</div>
          </div>
        </div>
      `;
    }).join('');
    
    const html = `
      <div style="display: flex; flex-direction: column; height: 100%; gap: 10px;">
        <div style="
          flex: 1;
          overflow-y: auto;
          background: var(--surface);
          border-radius: 8px;
          padding: 12px;
          -webkit-overflow-scrolling: touch;
        ">
          ${messagesHtml || '<p style="color: var(--muted); text-align: center; margin-top: 20px;">Nessun messaggio ancora.</p>'}
        </div>
        
        <div style="display: flex; gap: 8px; align-items: flex-end;">
          <input 
            type="text"
            id="group-chat-input"
            placeholder="Scrivi un messaggio..."
            style="
              flex: 1;
              padding: 10px;
              background: var(--surface-2);
              color: var(--text);
              border: 1px solid var(--border);
              border-radius: 8px;
              font: inherit;
              resize: none;
            "
          />
          <button 
            id="group-chat-send"
            style="
              padding: 10px 16px;
              background: var(--accent);
              color: white;
              border: none;
              border-radius: 8px;
              cursor: pointer;
              font-weight: 600;
              flex-shrink: 0;
            "
          >
            ✓
          </button>
        </div>
      </div>
    `;
    
    container.innerHTML = html;
    
    // Event listeners
    const input = document.getElementById('group-chat-input');
    const sendBtn = document.getElementById('group-chat-send');
    
    if (sendBtn) {
      sendBtn.addEventListener('click', () => {
        if (input) {
          sendGroupMessage(input.value);
          input.value = '';
          input.focus();
        }
      });
    }
    
    if (input) {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendGroupMessage(input.value);
          input.value = '';
        }
      });
      // Auto-focus e scroll a fine
      setTimeout(() => {
        input.focus();
        container.querySelector('[style*="overflow-y"]').scrollTop = container.querySelector('[style*="overflow-y"]').scrollHeight;
      }, 0);
    }
  }
  
  /**
   * Apri/chiudi pannello chat
   */
  function openChatPanel() {
    const group = window.state?.group;
    if (!group) {
      console.warn('[GroupChat] Not in a group');
      return;
    }
    
    chatPanelOpen = true;
    
    // Apri sheet con chat
    const html = `<div id="group-chat-panel" style="height: 100%; display: flex; flex-direction: column;"></div>`;
    window.openSheet?.('💬 Chat Gruppo: ' + group.roomId, html);
    
    // Renderizza dopo che il sheet è aperto
    setTimeout(() => renderChatPanel(), 100);
  }
  
  /**
   * Salva chat in localStorage
   */
  function saveChat(roomId) {
    const cacheKey = `groupchat_${roomId}`;
    try {
      localStorage.setItem(cacheKey, JSON.stringify(chatHistory));
    } catch (e) {
      console.warn('[GroupChat] localStorage save failed:', e);
    }
  }

  /**
   * Cancella la cronologia chat locale per una stanza
   */
  function clearChatHistory(roomId) {
    if (!roomId) return;
    const cacheKey = `groupchat_${roomId}`;
    try {
      localStorage.removeItem(cacheKey);
      if (window.state?.group?.roomId === roomId) {
        chatHistory = { messages: [], members: [] };
      }
      console.log('[GroupChat] Cleared local chat history for', roomId);
    } catch (e) {
      console.warn('[GroupChat] Clear chat history failed:', e);
    }
  }
  
  /**
   * Escapa HTML
   */
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  
  return {
    init: initChat,
    send: sendGroupMessage,
    receive: receiveGroupMessage,
    openChatPanel,
    clearHistory: clearChatHistory,
    getHistory: () => chatHistory
  };
})();
