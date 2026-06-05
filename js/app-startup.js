// ============================================================================
// app-startup.js — Group panel polling, chat polling, push notifications,
//   weather widget init, deep link call, group sync init
// Extracted from app-core.js. Deps (all window.*): state, groupPanel, groupChat,
//   initGpsWeatherWidget, handleDeepLink, GROUP_SYNC, renderGroupView
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
// ── Refresh pannello gruppo — usato da firebase-rtdb.js ──────────────────────
// NON chiama renderGroupView() per evitare ReferenceError su Safari.
// y2k-windows.js sostituisce openSheet() con finestre floating (.y2k-win).
// La finestra gruppo ha id "y2kwin-gruppo" (generato da "👥 Gruppo" → solo a-z0-9).
window._refreshGroupView = function() {
  try {
    if (!window.state?.group?.roomId || !window.groupPanel) return;
    // Il pannello gruppo è una finestra y2k con id "y2kwin-gruppo"
    const groupWin = document.getElementById('y2kwin-gruppo');
    if (!groupWin) {
      // Pannello chiuso: lo stato è già aggiornato, verrà mostrato alla riapertura
      console.log('[Group] _refreshGroupView: panel not open, skipping render');
      return;
    }
    const html = window.groupPanel.render();
    if (!html) return;
    const body = groupWin.querySelector('.y2k-win-body');
    if (body) {
      body.innerHTML = html;
      window.groupPanel.attachEvents();
      console.log('[Group] _refreshGroupView: ✅ y2k panel updated');
    }
  } catch(e) {
    console.warn('[Group] _refreshGroupView err:', e.message);
  }
};

// ── Polling fallback: se il pannello è aperto, mantienilo sincronizzato ───────
// Scatta ogni 5s — rete di sicurezza per il pannello gruppo in caso event-bus fallisca
let _lastMemberCount = 0;
let _groupPanelInterval = setInterval(function() {
  try {
    if (!window.state?.group?.roomId || !window.groupPanel) return;
    const groupWin = document.getElementById('y2kwin-gruppo');
    if (!groupWin) return;
    const currentCount = (window.state.group.members || []).length;
    if (currentCount !== _lastMemberCount) {
      _lastMemberCount = currentCount;
      const html = window.groupPanel.render();
      if (!html) return;
      const body = groupWin.querySelector('.y2k-win-body');
      if (body) {
        body.innerHTML = html;
        window.groupPanel.attachEvents();
      }
    }
  } catch(e) {}
}, 5000);
// Cancel polling when group panel closes
document.addEventListener('y2kwin_closed', (e) => {
  if (e.detail?.id === 'y2kwin-gruppo' && _groupPanelInterval) {
    clearInterval(_groupPanelInterval);
    _groupPanelInterval = null;
  }
});

// ── Polling fallback per chat: se il pannello è aperto, mantienilo sincronizzato ───────
// Scatta ogni 5s — rete di sicurezza per la chat in caso event-bus fallisca
let _lastChatMessageCount = 0;
let _chatPanelInterval = setInterval(function() {
  try {
    if (!window.groupChat || !window.state?.group?.roomId) return;
    const chatHist = window.groupChat.getHistory?.();
    if (!chatHist) return;
    const chatWin = document.getElementById('y2kwin-groupchat');
    if (!chatWin) return;
    const currentCount = (chatHist.messages || []).length;
    if (currentCount !== _lastChatMessageCount) {
      _lastChatMessageCount = currentCount;
      window.groupChat.renderChatPanel?.();
    }
  } catch(e) {}
}, 5000);
// Cancel polling when chat panel closes
document.addEventListener('y2kwin_closed', (e) => {
  if (e.detail?.id === 'y2kwin-groupchat' && _chatPanelInterval) {
    clearInterval(_chatPanelInterval);
    _chatPanelInterval = null;
  }
});

/* ═══════════════════════════════════════════════════════════════
   PUSH NOTIFICATIONS — Initialize
═══════════════════════════════════════════════════════════════ */

// Request notification permission on startup
(async () => {
  if (!('serviceWorker' in navigator)) {
    console.log('[Push] Service Workers not supported');
    return;
  }

  try {
    // Check if notifications already permitted
    if (Notification.permission === 'default') {
      console.log('[Push] Requesting notification permission...');
      const perm = await Notification.requestPermission();
      console.log('[Push] Permission result:', perm);
    } else if (Notification.permission === 'granted') {
      console.log('[Push] Notifications already granted');
    } else {
      console.log('[Push] Notifications denied by user');
    }
  } catch (err) {
    console.warn('[Push] Notification permission request failed:', err);
  }
})();

// Initialize GPS Weather Widget — updates every 10 minutes
console.log('[Weather] Initializing GPS weather widget...');
try {
  if (typeof window.initGpsWeatherWidget === 'function') {
    console.log('[Weather] initGpsWeatherWidget found, calling...');
    window.initGpsWeatherWidget();
  } else {
    console.warn('[Weather] initGpsWeatherWidget not found!');
  }
} catch (err) {
  console.error('[Weather] Error initializing:', err);
}

// Track message count for notifications (3s: le notifiche non richiedono
// precisione al secondo; alleggerisce il main thread vs il vecchio 1s)
let lastMessageCount = 0;
setInterval(() => {
  try {
    if (!window.groupChat) return;
    const history = window.groupChat.getHistory?.();
    if (!history || !history.messages) return;

    const currentCount = history.messages.length;
    if (currentCount > lastMessageCount) {
      const newMessages = history.messages.slice(lastMessageCount);
      const lastMsg = newMessages[newMessages.length - 1];

      if (lastMsg && Notification.permission === 'granted') {
        const title = `💬 ${lastMsg.author || 'Qualcuno'}`;
        const body = lastMsg.text?.substring(0, 100) || 'Nuovo messaggio';

        // Only send if app is not focused
        if (document.hidden) {
          if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            console.log('[Push] Sending push notification:', { title, body });
            navigator.serviceWorker.controller.postMessage({
              type: 'SEND_NOTIFICATION',
              title: title,
              body: body,
              data: { author: lastMsg.author, timestamp: lastMsg.timestamp }
            });
          }

          // Also show browser notification directly
          try {
            new Notification(title, {
              body: body,
              icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect fill="%23FF1493" width="192" height="192"/><text x="96" y="130" font-size="100" font-weight="bold" text-anchor="middle" fill="white">💬</text></svg>',
              badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="%23FF1493"/></svg>',
              tag: 'group-chat-msg',
              vibrate: [200, 100, 200],
            });
          } catch (notifErr) {
            console.warn('[Push] Direct notification failed:', notifErr);
          }
        }
      }

      lastMessageCount = currentCount;
    }
  } catch (err) {
    console.warn('[Push] Message tracking error:', err);
  }
}, 3000);

// Listen for messages from SW
navigator.serviceWorker?.addEventListener('message', (event) => {
  console.log('[App] Message from SW:', event.data);
  if (event.data.type === 'OPEN_CHAT') {
    console.log('[App] Opening chat from notification');
    window.renderGroupView?.();
  }
  if (event.data.type === 'REPLAY_QUEUE') {
    console.log('[App] Background sync: replaying offline queue');
    window.replayOfflineQueue?.();
  }
});

// ===== DEEP LINKING HANDLER =====
// Check for deep link parameters from Find Me Gluten Free
console.log('[DeepLink] Checking for deep link parameters...');
window.handleDeepLink();

// ===== GROUP SYNC INIT =====
if (window.GROUP_SYNC) {
  console.log('[App] Initializing group sync...');
  window.GROUP_SYNC.init();
}

});
