/**
 * group-chat.js
 * Chat P2P tra membri del gruppo con notifiche push
 * Messaggi salvati in localStorage per storia locale
 */

window.groupChat = (() => {
  let chatHistory = {};
  let chatPanelOpen = false;
  let chatNeedsRender = false;
  let unreadCount = 0;

  // Badge "messaggi non letti" sul tasto Menu (percorso verso Gruppo → Chat)
  function updateChatBadge() {
    const btn = document.querySelector('nav.bottom button[data-view="menu"]');
    if (!btn) return;
    let badge = btn.querySelector('.chat-unread-badge');
    if (unreadCount > 0) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'chat-unread-badge';
        btn.style.position = 'relative';
        btn.appendChild(badge);
      }
      badge.textContent = unreadCount > 9 ? '9+' : String(unreadCount);
    } else if (badge) {
      badge.remove();
    }
  }

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

    console.log('[GroupChat] initChat called for roomId:', roomId, '| cacheKey:', cacheKey);

    try {
      const cached = localStorage.getItem(cacheKey);
      console.log('[GroupChat] localStorage data for', cacheKey, ':', cached ? cached.substring(0, 100) + '...' : 'null');

      chatHistory = cached ? JSON.parse(cached) : { messages: [], members: [] };
      console.log('[GroupChat] ✓ Parsed chat history:', chatHistory.messages?.length, 'messages');
    } catch (e) {
      console.error('[GroupChat] ❌ Error parsing chat history:', e);
      chatHistory = { messages: [], members: [] };
    }

    if (!chatHistory || typeof chatHistory !== 'object') {
      console.warn('[GroupChat] chatHistory is not an object, resetting');
      chatHistory = { messages: [], members: [] };
    }
    if (!Array.isArray(chatHistory.messages)) {
      console.warn('[GroupChat] messages is not an array, resetting');
      chatHistory.messages = [];
    }
    chatHistory.messages = chatHistory.messages.filter(msg => msg && typeof msg === 'object' && typeof msg.text === 'string');

    console.log(`[GroupChat] ✓ Initialized for room ${roomId}`, { totalMessages: chatHistory.messages.length });
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

    if (!text || text.trim() === '') {
      console.warn('[GroupChat] Empty message ignored');
      return;
    }

    const rawMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      from: group.myName || 'Anonimo',
      fromPeerId: window.peerGPS?.getMyPeerId?.() || null,
      avatar: group.myAvatar || window.createAvatarDataUrl?.(group.myName || 'User'),
      text: text.trim(),
      timestamp: new Date().toISOString(),
      type: 'message'
    };

    console.log('[GroupChat] Raw message created:', rawMessage);

    const message = normalizeChatMessage(rawMessage);
    if (!message) {
      console.warn('[GroupChat] ❌ Message normalization failed', { rawMessage });
      return;
    }

    console.log('[GroupChat] ✓ Message normalized:', message);

    // Salva localmente
    chatHistory.messages = chatHistory.messages || [];
    chatHistory.messages.push(message);
    console.log('[GroupChat] ✓ Message added to history. Total messages:', chatHistory.messages.length);
    saveChat(group.roomId);

    // Invia via MQTT (affidabile, funziona attraverso firewall)
    if (window.rtdbBroadcast) {
      window.rtdbBroadcast({
        type: 'groupchat',
        payload: message
      });
      console.log('[GroupChat] ✓ Sent via MQTT to room:', group.roomId);
    }

    // Also try P2P for backward compatibility (if peers are connected)
    const peerConnections = window.peerGPS?.getPeerConnections?.() || {};
    const peerIds = Object.keys(peerConnections);
    if (peerIds.length > 0) {
      console.log('[GroupChat] Also sending P2P to', peerIds.length, 'peers');
      for (const [peerId, conn] of Object.entries(peerConnections)) {
        if (conn && conn.open) {
          try {
            conn.send({
              type: 'groupchat',
              payload: message
            });
            console.log('[GroupChat] ✓ Sent P2P to peer:', peerId);
          } catch (e) {
            console.warn(`[GroupChat] ❌ Send P2P to ${peerId} failed:`, e);
          }
        }
      }
    }

    // Rirenderizza
    console.log('[GroupChat] Calling renderChatPanel to update UI...');
    renderChatPanel();

    console.log(`[GroupChat] ✓ Message sent by ${message.from} | Total in history: ${chatHistory.messages.length}`);
  }
  
  /**
   * Ricevi messaggio P2P (chiamata da features-gps.js)
   */
  function receiveGroupMessage(message) {
    const group = window.state?.group;
    if (!group) {
      console.warn('[GroupChat] Received message but not in a group');
      return;
    }

    console.log('[GroupChat] Receiving message from peer:', message);

    const normalizedMessage = normalizeChatMessage(message);
    if (!normalizedMessage) {
      console.warn('[GroupChat] ❌ Ignored invalid incoming payload', message);
      return;
    }

    console.log('[GroupChat] ✓ Message normalized:', normalizedMessage);

    chatHistory.messages = chatHistory.messages || [];
    chatHistory.messages.push(normalizedMessage);
    console.log('[GroupChat] ✓ Message added to history. Total:', chatHistory.messages.length);
    saveChat(group.roomId);

    // Notifica push (se pannello non aperto)
    if (!chatPanelOpen) {
      console.log('[GroupChat] Panel closed - sending push notification');
      notifyNewMessage(normalizedMessage);
      chatNeedsRender = true; // Mark that panel needs refresh when opened
      unreadCount++;
      updateChatBadge();
    }

    // Rirenderizza se pannello aperto
    if (chatPanelOpen) {
      console.log('[GroupChat] Panel open - re-rendering');
      renderChatPanel();
      chatNeedsRender = false;
    }

    // Emit event for subscribers
    document.dispatchEvent(new CustomEvent('chat_message_received', {
      detail: { message: normalizedMessage }
    }));
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
    if (!container) {
      console.warn('[GroupChat] renderChatPanel: container NOT found - sheet might be closed');
      return;
    }
    console.log('[GroupChat] renderChatPanel: container found, rendering messages...');

    const messages = chatHistory.messages || [];
    console.log('[GroupChat] renderChatPanel: messages array:', messages.length, 'items -', messages);

    const group = window.state?.group;
    const myPeerId = group?.myPeerId || window.peerGPS?.getMyPeerId?.();

    const messagesHtml = messages.slice(-50).map((msg, idx) => {
      const messageFrom = msg?.from || 'Anonimo';
      const messageText = msg?.text || '';
      const messageTime = msg?.timestamp ? new Date(msg.timestamp) : new Date();
      const avatar = isValidAvatarString(msg?.avatar) ? msg.avatar : null;
      const isOwn = myPeerId ? msg.fromPeerId === myPeerId : messageFrom === group?.myName;
      const time = messageTime.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
      const senderColor = getColorForName(messageFrom);

      console.log(`[GroupChat] Message ${idx}:`, { from: messageFrom, text: messageText, isOwn, color: senderColor });

      const avatarHtml = avatar ? `
            <img src="${avatar}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; background: ${senderColor};" />
          ` : `
            <div style="
              width: 32px;
              height: 32px;
              border-radius: 50%;
              background: ${senderColor};
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
            ${!isOwn ? `<div style="font-size: 12px; font-weight: 600; margin-bottom: 3px; padding: 0 8px; color: ${senderColor};">${escapeHtml(messageFrom)}</div>` : ''}
            <div style="
              background: ${isOwn ? '#ff1493' : '#e0e0e0'};
              color: ${isOwn ? '#fff' : '#333'};
              padding: 8px 12px;
              border-radius: 8px;
              word-wrap: break-word;
              font-size: 13px;
              font-weight: ${isOwn ? '500' : '400'};
            ">
              ${escapeHtml(messageText)}
            </div>
            <div style="
              font-size: 11px;
              opacity: 0.6;
              margin-top: 3px;
              padding: 0 8px;
              text-align: ${isOwn ? 'right' : 'left'};
              color: #999;
            ">${time}</div>
          </div>
        </div>
      `;
    }).join('');

    console.log('[GroupChat] messagesHtml generated:', messagesHtml.length, 'characters');
    
    const html = `
      <div style="display: flex; flex-direction: column; height: 100%; gap: 10px;">
        <div style="
          flex: 1;
          overflow-y: auto;
          background: #fafafa;
          border-radius: 8px;
          padding: 12px;
          -webkit-overflow-scrolling: touch;
          min-height: 0;
        ">
          ${messagesHtml || '<p style="color: #999; text-align: center; margin-top: 20px;">Nessun messaggio ancora.</p>'}
        </div>

        <div style="display: flex; gap: 8px; align-items: flex-end;">
          <input
            type="text"
            id="group-chat-input"
            placeholder="Scrivi un messaggio..."
            style="
              flex: 1;
              padding: 10px;
              background: #fff;
              color: #333;
              border: 1px solid #ddd;
              border-radius: 8px;
              font: inherit;
              resize: none;
            "
          />
          <button
            id="group-chat-send"
            style="
              padding: 10px 16px;
              background: #00bcd4;
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

    console.log('[GroupChat] renderChatPanel: rendered', messages.length, 'messages');

    // Event listeners (con proper cleanup)
    const input = document.getElementById('group-chat-input');
    const sendBtn = document.getElementById('group-chat-send');

    if (sendBtn) {
      // Rimuovi event listener vecchi
      const newSendBtn = sendBtn.cloneNode(true);
      sendBtn.parentNode.replaceChild(newSendBtn, sendBtn);

      document.getElementById('group-chat-send').addEventListener('click', () => {
        const inputVal = document.getElementById('group-chat-input').value;
        if (inputVal && inputVal.trim()) {
          sendGroupMessage(inputVal);
          document.getElementById('group-chat-input').value = '';
          document.getElementById('group-chat-input').focus();
        }
      });
    }

    const newInput = document.getElementById('group-chat-input');
    if (newInput) {
      newInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          const inputVal = e.target.value;
          if (inputVal && inputVal.trim()) {
            sendGroupMessage(inputVal);
            e.target.value = '';
          }
        }
      });

      // Auto-focus e scroll a fine
      setTimeout(() => {
        newInput.focus();
        const scrollContainer = container.querySelector('[style*="overflow-y"]');
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
      }, 50);
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

    // ✅ IMPORTANTE: Inizializza chat prima di accedere ai messaggi
    initChat(group.roomId);

    chatPanelOpen = true;
    unreadCount = 0;
    updateChatBadge();

    console.log('[GroupChat] openChatPanel: opening sheet for room', group.roomId);
    console.log('[GroupChat] Current chat history:', chatHistory.messages.length, 'messages');

    // Apri sheet con chat
    const html = `<div id="group-chat-panel" style="height: 100%; display: flex; flex-direction: column;"></div>`;
    window.openSheet?.('💬 Chat Gruppo: ' + group.roomId, html);

    // Renderizza dopo che il sheet è aperto
    const renderWithRetry = () => {
      const container = document.getElementById('group-chat-panel');
      if (!container) {
        console.warn('[GroupChat] Container not found yet, retrying...');
        setTimeout(renderWithRetry, 100);
        return;
      }

      console.log('[GroupChat] Container found! Rendering with', chatHistory.messages.length, 'messages');

      // Force render if dirty flag is set (messages arrived while closed)
      if (chatNeedsRender) {
        console.log('[GroupChat] Dirty flag set - forcing full render');
        chatNeedsRender = false;
      }

      renderChatPanel();

      // Verifica che il rendering sia effettivamente avvenuto
      setTimeout(() => {
        const messagesArea = container.querySelector('[style*="overflow-y"]');
        if (messagesArea) {
          console.log('[GroupChat] Rendered messages area with content:', messagesArea.innerHTML.length, 'characters');
        } else {
          console.warn('[GroupChat] Messages area not found after rendering');
        }
      }, 100);
    };

    setTimeout(renderWithRetry, 200);
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
   * Genera colore unico basato sul nome (come WhatsApp)
   */
  function getColorForName(name) {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
      '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B88B', '#ABEBC6',
      '#F5B7B1', '#85C1E9', '#F9E79F', '#D7BDE2', '#A9DFBF'
    ];

    // Hash semplice del nome
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = ((hash << 5) - hash) + name.charCodeAt(i);
      hash = hash & hash; // Converti a 32-bit integer
    }

    const index = Math.abs(hash) % colors.length;
    return colors[index];
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

  // Listen for window close event
  // Y2K window ID is generated from title: "💬 Chat Gruppo: ROOMID" → "chatgruppo..." (emoji stripped, lowercase, first 20 chars)
  document.addEventListener('y2kwin_closed', (e) => {
    const closedId = e.detail.id || '';
    // Check if this is the chat window (starts with "chat" and contains "gruppo")
    if (closedId.includes('chatgruppo') || closedId.startsWith('chat')) {
      chatPanelOpen = false;
      console.log('[GroupChat] Chat panel closed:', closedId, '| chatPanelOpen = false');
    }
  });
  
  return {
    init: initChat,
    send: sendGroupMessage,
    receive: receiveGroupMessage,
    openChatPanel,
    clearHistory: clearChatHistory,
    getHistory: () => chatHistory
  };
})();
