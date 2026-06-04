/**
 * GROUP SYNC — Real-time sync between browser tabs using BroadcastChannel
 *
 * Strategy:
 * - Each tab broadcasts changes to itinerary and chat
 * - Merge uses last-write-wins based on entry.lastModified timestamp
 * - Graceful fallback if BroadcastChannel unavailable
 * - No backend, no server — local browser sync only
 */

const T = (k, f) => (typeof window.t === 'function') ? window.t(k, f) : f;

const GROUP_SYNC = {
  CHANNEL_NAME: 'safeeats-sync',
  channel: null,

  /**
   * Initialize sync channel
   */
  init() {
    if (!window.BroadcastChannel) {
      console.warn('[GroupSync] BroadcastChannel not available, sync disabled');
      return;
    }

    this.channel = new BroadcastChannel(this.CHANNEL_NAME);
    this.channel.onmessage = (event) => {
      const { type, payload, sender } = event.data;
      if (sender === window.state?.group?.myName) return; // Ignore own messages

      console.log('[GroupSync] Received:', type, 'from', sender);

      if (type === 'ITINERARY_UPDATE') {
        this.mergeItinerary(payload.itineraryByDay);
      }
      if (type === 'CHAT_MESSAGE') {
        this.addChatMessage(payload);
      }
    };

    console.log('[GroupSync] ✅ Channel initialized');
  },

  /**
   * Broadcast itinerary change to other tabs
   */
  broadcastItinerary() {
    if (!this.channel) return;
    this.channel.postMessage({
      type: 'ITINERARY_UPDATE',
      payload: { itineraryByDay: window.state?.itineraryByDay || {} },
      sender: window.state?.group?.myName || 'Unknown',
      roomId: window.state?.group?.roomId,
      ts: Date.now()
    });
  },

  /**
   * Broadcast chat message to other tabs
   */
  broadcastChatMessage(message) {
    if (!this.channel) return;
    this.channel.postMessage({
      type: 'CHAT_MESSAGE',
      payload: message,
      sender: window.state?.group?.myName || 'Unknown',
      roomId: window.state?.group?.roomId,
      ts: Date.now()
    });
  },

  /**
   * Merge remote itinerary using last-write-wins strategy
   */
  mergeItinerary(remoteItinerary) {
    if (!window.state?.itineraryByDay) return;

    let changed = false;
    Object.entries(remoteItinerary).forEach(([dayIdx, remotePOIs]) => {
      const localDay = window.state.itineraryByDay[dayIdx] || [];

      remotePOIs.forEach(remotePOI => {
        const localIdx = localDay.findIndex(p => p.poi_id === remotePOI.poi_id);

        if (localIdx === -1) {
          // New POI from remote
          localDay.push(remotePOI);
          changed = true;
        } else {
          // Existing POI: compare timestamps
          const localPOI = localDay[localIdx];
          const remoteNewer = (remotePOI.lastModified || 0) > (localPOI.lastModified || 0);

          if (remoteNewer) {
            localDay[localIdx] = remotePOI;
            changed = true;
          }
        }
      });

      window.state.itineraryByDay[dayIdx] = localDay;
    });

    if (changed) {
      window.saveState?.();
      window.renderItineraryUnified?.();
      window.toast?.(T('sync.itinUpdated', '📡 Itinerario aggiornato'));
    }
  },

  /**
   * Add chat message only if not already present
   */
  addChatMessage(message) {
    if (!window.state?.group?.messages) return;

    const exists = window.state.group.messages.some(
      m => m.timestamp === message.timestamp && m.sender === message.sender
    );

    if (!exists) {
      window.state.group.messages.push(message);
      window.saveState?.();
      window.groupChat?.renderChatPanel?.();
    }
  }
};

// Export/Import handlers (usa il const locale: window.GROUP_SYNC è assegnato sotto)
GROUP_SYNC.exportItinerary = function() {
  const data = {
    version: 1,
    roomId: window.state?.group?.roomId,
    exportedBy: window.state?.group?.myName,
    exportedAt: Date.now(),
    itineraryByDay: window.state?.itineraryByDay || {},
    tripProfile: window.state?.tripProfile || {}
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'itinerario-' + Date.now() + '.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 100);
  window.toast?.(T('sync.itinExported', '✅ Itinerario esportato'));
};

GROUP_SYNC.importItinerary = function() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target.result);
        if (!data.itineraryByDay) throw new Error('File non valido');
        GROUP_SYNC.mergeItinerary(data.itineraryByDay);
        window.toast?.(T('sync.itinImported', '✅ Itinerario importato'));
      } catch (err) {
        window.toast?.('❌ Errore import: ' + err.message);
      }
    };
    reader.readAsText(file);
  };
  input.click();
};

window.GROUP_SYNC = GROUP_SYNC;
