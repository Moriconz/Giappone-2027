/**
 * group-chat.js
 * Chat P2P tra membri del gruppo con notifiche push
 * Messaggi salvati in localStorage per storia locale
 */

window.groupChat = (() => {
  let chatHistory = {};
  let chatPanelOpen = false;
  
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
    
    console.log(`[GroupChat] Initialized for room ${roomId}`);
  }
  
  /**
   * Invia messaggio P2P a tutti i membri del gruppo
   */
  function sendGroupMessage(text) {
    const group = window.state?.group;
    if (!group) {
      console.warn('[GroupChat] Not in a group');
      return;
    }
    
    if (!text || text.trim() === '') return;
    
    const message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      from: group.myName || 'Anonimo',
      fromPeerId: group.myPeerId,
      avatar: group.myAvatar,
      text: text.trim(),
      timestamp: new Date().toISOString(),
      type: 'message'
    };
    
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
    
    chatHistory.messages = chatHistory.messages || [];
    chatHistory.messages.push(message);
    saveChat(group.roomId);
    
    // Notifica push (se pannello non aperto)
    if (!chatPanelOpen) {
      notifyNewMessage(message);
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
    
    const messagesHtml = messages.slice(-50).map(msg => {
      const isOwn = msg.fromPeerId === group?.myPeerId;
      const time = new Date(msg.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
      
      return `
        <div style="
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
          justify-content: ${isOwn ? 'flex-end' : 'flex-start'};
          align-items: flex-end;
        ">
          ${!isOwn ? `
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
            ">${msg.avatar || msg.from.charAt(0).toUpperCase()}</div>
          ` : ''}
          
          <div style="max-width: 70%;">
            ${!isOwn ? `<div style="font-size: 12px; font-weight: 600; margin-bottom: 3px; padding: 0 8px; color: var(--muted);">${escapeHtml(msg.from)}</div>` : ''}
            <div style="
              background: ${isOwn ? 'var(--accent)' : 'var(--surface-2)'};
              color: ${isOwn ? '#fff' : 'var(--text)'};
              padding: 8px 12px;
              border-radius: 8px;
              word-wrap: break-word;
              font-size: 13px;
            ">
              ${escapeHtml(msg.text)}
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
    getHistory: () => chatHistory
  };
})();
