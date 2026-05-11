/**
 * CHAT — Group messaging + P2P coordination
 * Extracted from index.html
 */

import { state, showToast } from './core.js';

export let chatMessages = [];
export let groupMembers = [];
export let rtdbConnection = null;
export let idbDatabase = null;

// ============================================================================
// INDEXEDDB PERSISTENCE
// ============================================================================

export async function initChatIDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SafeEatsChat', 1);

    request.onerror = () => {
      console.error('[Chat] IDB init error:', request.error);
      reject(request.error);
    };

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('messages')) {
        db.createObjectStore('messages', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('members')) {
        db.createObjectStore('members', { keyPath: 'id' });
      }
      console.log('[Chat] IDB store created');
    };

    request.onsuccess = () => {
      idbDatabase = request.result;
      console.log('[Chat] ✓ IndexedDB initialized');
      resolve(idbDatabase);
    };
  });
}

function saveMessageToIDB(msg) {
  return new Promise((resolve, reject) => {
    if (!idbDatabase) {
      reject(new Error('IDB not initialized'));
      return;
    }

    const txn = idbDatabase.transaction('messages', 'readwrite');
    const store = txn.objectStore('messages');
    const request = store.put(msg);

    request.onsuccess = () => resolve(msg);
    request.onerror = () => reject(request.error);
  });
}

export async function loadMessagesFromIDB() {
  return new Promise((resolve, reject) => {
    if (!idbDatabase) {
      reject(new Error('IDB not initialized'));
      return;
    }

    const txn = idbDatabase.transaction('messages', 'readonly');
    const store = txn.objectStore('messages');
    const request = store.getAll();

    request.onsuccess = () => {
      chatMessages = request.result;
      console.log('[Chat] ✓ Loaded', chatMessages.length, 'messages from IDB');
      resolve(chatMessages);
    };

    request.onerror = () => {
      console.error('[Chat] IDB load error:', request.error);
      reject(request.error);
    };
  });
}

// ============================================================================
// CHAT STATE
// ============================================================================

export const chatState = {
  connected: false,
  myId: null,
  myName: '',
  groupId: state.group.name,
  isTyping: false
};

// ============================================================================
// GROUP MEMBERS
// ============================================================================

export function addGroupMember(name, avatar = null) {
  const member = {
    id: `member_${Date.now()}_${Math.random()}`,
    name: name,
    avatar: avatar,
    joinedAt: new Date().toISOString(),
    isOnline: true,
    lastSeen: new Date().toISOString()
  };

  groupMembers.push(member);
  state.group.members = groupMembers;
  console.log('[Chat] Member joined:', name);

  return member;
}

export function removeGroupMember(memberId) {
  const idx = groupMembers.findIndex(m => m.id === memberId);
  if (idx !== -1) {
    groupMembers.splice(idx, 1);
    state.group.members = groupMembers;
    console.log('[Chat] Member left:', memberId);
  }
}

export function getGroupMembers() {
  return groupMembers;
}

export function getMemberById(id) {
  return groupMembers.find(m => m.id === id);
}

// ============================================================================
// CHAT MESSAGES
// ============================================================================

export async function sendMessage(text, sender = 'me') {
  const message = {
    id: `msg_${Date.now()}_${Math.random()}`,
    text: text,
    sender: sender,
    timestamp: new Date().toISOString(),
    reactions: [],
    isEdited: false
  };

  chatMessages.push(message);

  // Limit to last 100 messages
  if (chatMessages.length > 100) {
    const removed = chatMessages.shift();
    // Delete from IndexedDB if present
    if (idbDatabase) {
      try {
        const txn = idbDatabase.transaction('messages', 'readwrite');
        const store = txn.objectStore('messages');
        store.delete(removed.id);
      } catch (err) {
        console.warn('[Chat] Could not delete old message from IDB');
      }
    }
  }

  // Save to IndexedDB
  if (idbDatabase) {
    await saveMessageToIDB(message);
  }

  console.log('[Chat] Message sent:', text.substring(0, 50));
  renderChatMessages();

  return message;
}

export function getChatMessages(limit = 50) {
  return chatMessages.slice(-limit);
}

export function renderChatMessages() {
  const chatPanel = document.getElementById('chat-panel');
  if (!chatPanel) return;

  chatPanel.innerHTML = chatMessages
    .slice(-30)
    .map(msg => `
      <div style="margin: 8px 0; padding: 8px; background: rgba(255,255,255,0.1); border-radius: 6px;">
        <strong>${msg.sender}:</strong> ${msg.text}
        <small style="display: block; opacity: 0.6; margin-top: 4px;">
          ${new Date(msg.timestamp).toLocaleTimeString('it-IT')}
        </small>
      </div>
    `)
    .join('');

  // Auto scroll to bottom
  chatPanel.scrollTop = chatPanel.scrollHeight;
}

// ============================================================================
// P2P COORDINATION (GPS SHARING)
// ============================================================================

export const gpsShare = {
  enabled: false,
  members: {}, // { memberId: { lat, lon, timestamp, accuracy } }
  updateInterval: null
};

export function enableGPSShare(updateIntervalMs = 5000) {
  if (gpsShare.enabled) return;

  gpsShare.enabled = true;

  gpsShare.updateInterval = setInterval(() => {
    if (navigator.geolocation && chatState.myId) {
      navigator.geolocation.getCurrentPosition(pos => {
        const { latitude, longitude, accuracy } = pos.coords;

        gpsShare.members[chatState.myId] = {
          lat: latitude,
          lon: longitude,
          accuracy: accuracy,
          timestamp: new Date().toISOString()
        };

        // Broadcast to group (would use WebRTC/RTDB here)
        console.log('[GPS] Position updated:', latitude.toFixed(2), longitude.toFixed(2));
      });
    }
  }, updateIntervalMs);

  console.log('[GPS] Sharing enabled');
}

export function disableGPSShare() {
  if (gpsShare.updateInterval) {
    clearInterval(gpsShare.updateInterval);
  }
  gpsShare.enabled = false;
  console.log('[GPS] Sharing disabled');
}

export function getGroupGPS() {
  return gpsShare.members;
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

export function notifyGroupMessage(sender, preview) {
  showToast(`${sender}: ${preview}`, 'info', 5000);
}

export function notifyMemberJoined(name) {
  showToast(`${name} joined group`, 'success', 3000);
}

export function notifyMemberLeft(name) {
  showToast(`${name} left group`, 'info', 3000);
}

// ============================================================================
// INIT
// ============================================================================

// Auto-initialize IndexedDB and load persisted data
(async () => {
  try {
    await initChatIDB();
    await loadMessagesFromIDB();
  } catch (err) {
    console.warn('[Chat] IDB init failed, running in-memory mode:', err);
  }
})();

console.log('[Chat] ✓ Chat module loaded');
