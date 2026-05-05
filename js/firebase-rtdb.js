// ============================================================================
// FIREBASE-RTDB.JS — P2P Sync via ntfy.sh (zero signup, zero config)
// Transport: ntfy.sh pub/sub over HTTPS — funziona su qualsiasi rete/firewall.
// API identica al vecchio PeerJS peerGPS — nessuna modifica al resto del codice.
// ============================================================================

console.log('[RTDB] Loading ntfy.sh transport...');

(function () {
  'use strict';

  const NTFY_BASE   = 'https://ntfy.sh';
  const TOPIC_PFX   = 'giap2027v2_';   // prefisso topic ntfy
  const GPS_INTERVAL = 5000;           // ms tra broadcast GPS
  const HB_INTERVAL  = 15000;          // ms tra heartbeat

  let myRoomId    = null;
  let myName      = null;
  let statusCb    = () => {};
  let evtSrc      = null;   // EventSource SSE
  let gpsTimer    = null;
  let hbTimer     = null;
  let presTimer   = null;
  let isStarted   = false;
  let onlineCount = 0;

  // Mappa presenze: name → lastSeen timestamp
  const presence = {};

  // ── topic names ──────────────────────────────────────────────────────────────
  function topic(room)    { return TOPIC_PFX + room; }
  function gpsTopic(room) { return TOPIC_PFX + room + '_gps'; }

  // ── Pubblica un messaggio su ntfy.sh ─────────────────────────────────────────
  async function pub(topicName, payload) {
    try {
      await fetch(`${NTFY_BASE}/${topicName}`, {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify(payload),
      });
    } catch (e) {
      console.warn('[RTDB] pub error:', e.message);
    }
  }

  // ── Broadcast generico (usato dall'esterno via window.rtdbBroadcast) ─────────
  function rtdbBroadcast(data) {
    if (!isStarted || !myRoomId) return;
    const msg = { ...data, from: myName, ts: Date.now() };
    if (data.type === 'gps') {
      pub(gpsTopic(myRoomId), msg);
    } else {
      pub(topic(myRoomId), msg);
    }
  }
  window.rtdbBroadcast = rtdbBroadcast;

  // ── Gestisce messaggi in arrivo ───────────────────────────────────────────────
  function handleIncoming(raw) {
    let data;
    try { data = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return; }
    if (!data || data.from === myName) return;

    // Aggiorna presenza
    if (data.from) {
      presence[data.from] = Date.now();
      const cnt = Object.keys(presence).filter(n => n !== myName).length;
      if (cnt !== onlineCount) {
        onlineCount = cnt;
        statusCb(onlineCount > 0 ? 'connected' : 'waiting', onlineCount);
      }
    }

    switch (data.type) {

      case 'gps':
        if (!window.state) return;
        window.state.gpsRemoteMarkers = window.state.gpsRemoteMarkers || {};
        window.state.gpsRemoteMarkers[data.from] = {
          lat: data.lat, lng: data.lng,
          name: data.name || data.from,
          avatar: data.avatar || null,
          lastUpdate: data.ts || Date.now(),
        };
        if (window.updateMapMarkers) window.updateMapMarkers();
        break;

      case 'presence':
        // Aggiornamento presenza già gestito sopra
        break;

      case 'group_sync':
      case 'groupsync':
        if (window.state?.group && data.members) {
          window.state.group.members = data.members;
          window.state.knownMembers = (data.members || [])
            .filter(m => m.name && m.name !== myName)
            .map(m => m.name);
          if (window.saveState) window.saveState();
        }
        break;

      case 'groupchat':
        if (window.groupChat?.receive && data.payload) {
          window.groupChat.receive(data.payload);
        }
        break;

      case 'itinerary_sync':
        if (window.mergeGroupItinerary && data.payload && data.itineraryId) {
          const local  = window.state?.groupItineraries?.[data.itineraryId];
          const merged = window.mergeGroupItinerary(local, data.payload);
          window.state.groupItineraries = window.state.groupItineraries || {};
          window.state.groupItineraries[data.itineraryId] = merged;
          if (window.saveState) window.saveState();
          window.dispatchEvent(new CustomEvent('itinerary_updated', {
            detail: { itineraryId: data.itineraryId, itinerary: merged },
          }));
        }
        break;

      case 'heartbeat':
        if (window.onPeerMessage) window.onPeerMessage(data);
        break;

      default:
        break;
    }
  }

  // ── Apre SSE su un topic e chiama handler sui messaggi ───────────────────────
  function openSSE(topicName, handler) {
    const url = `${NTFY_BASE}/${topicName}/sse`;
    const es  = new EventSource(url);
    es.onmessage = (e) => {
      try {
        const wrapper = JSON.parse(e.data);
        if (wrapper.event === 'message' && wrapper.message) {
          handler(wrapper.message);
        }
      } catch {}
    };
    es.onerror = () => {
      console.warn('[RTDB] SSE error su', topicName, '— riconnessione automatica');
    };
    return es;
  }

  // ── Fake connection object (compatibilità window.peer) ───────────────────────
  function makeFakeConn() {
    return { open: true, send: rtdbBroadcast, close() {} };
  }

  const fakeConns = new Proxy({}, {
    get(t, k) {
      if (typeof k === 'symbol' || k === 'then') return undefined;
      return isStarted ? [makeFakeConn()] : undefined;
    },
    has()    { return isStarted; },
    ownKeys(){ return isStarted ? ['__ntfy__'] : []; },
    getOwnPropertyDescriptor(t, k) {
      if (isStarted && k === '__ntfy__')
        return { configurable: true, enumerable: true, value: [makeFakeConn()] };
    },
  });

  window.peer = {
    connections: fakeConns,
    id: null,
    disconnected: true,
    destroyed: false,
    on() {},
    connect() { return makeFakeConn(); },
    reconnect() {},
  };

  // ── Pulizia presenze ghost (>60s senza heartbeat) ─────────────────────────────
  function prunePresence() {
    const cutoff = Date.now() - 60000;
    let changed  = false;
    Object.keys(presence).forEach(n => {
      if (presence[n] < cutoff) { delete presence[n]; changed = true; }
    });
    if (changed) {
      onlineCount = Object.keys(presence).filter(n => n !== myName).length;
      statusCb(onlineCount > 0 ? 'connected' : 'waiting', onlineCount);
    }
  }

  // ============================================================================
  // peerGPS — API pubblica (identica al vecchio blocco PeerJS)
  // ============================================================================
  const peerGPS = {

    start(room, name, onStatus /*, knownMembers */) {
      if (isStarted) return;

      myRoomId = room;
      myName   = name;
      statusCb = onStatus || (() => {});
      isStarted = true;

      window.peer.id           = `giap27_${room}_${name}`;
      window.peer.disconnected = false;

      console.log('[RTDB] ✅ Connesso alla stanza:', room, '| utente:', name);
      statusCb('waiting', 0);

      // ── SSE: ascolta messaggi generici (chat, sync, itinerari) ───────────────
      evtSrc = openSSE(topic(room), handleIncoming);

      // ── SSE: ascolta GPS (topic separato per non rallentare i messaggi) ──────
      const gpsEvt = openSSE(gpsTopic(room), handleIncoming);

      // ── Heartbeat presenza ogni 15s ──────────────────────────────────────────
      hbTimer = setInterval(() => {
        pub(topic(room), { type: 'presence', from: name, ts: Date.now() });
      }, HB_INTERVAL);

      // ── Pulizia ghost ogni 30s ────────────────────────────────────────────────
      presTimer = setInterval(prunePresence, 30000);

      // Annuncia subito la presenza
      pub(topic(room), { type: 'presence', from: name, ts: Date.now() });

      // Salva riferimenti per stop()
      this._gpsEvt = gpsEvt;
    },

    stop() {
      if (!isStarted) return;
      evtSrc?.close();
      this._gpsEvt?.close();
      clearInterval(hbTimer);
      clearInterval(presTimer);
      clearInterval(gpsTimer);
      isStarted = false;
      myRoomId  = null;
      myName    = null;
      onlineCount = 0;
      window.peer.disconnected = true;
      console.log('[RTDB] Disconnesso');
    },

    send(data)         { rtdbBroadcast(data); },
    getStatus()        { return isStarted ? 'connected' : 'disconnected'; },
    getMyPeerId()      { return window.peer.id; },
    getPeerCount()     { return onlineCount; },
    getPeerConnections(){ return {}; },
    connectTo()        {},

    getRole() {
      if (!window.state?.group) return '—';
      return window.state.group.myName === window.state.group.createdByName ? 'hub' : 'client';
    },

    broadcastGroupSync() {
      const g = window.state?.group;
      if (!g) return;
      rtdbBroadcast({
        type   : 'group_sync',
        name   : g.name,
        roomId : g.roomId,
        members: (g.members || []).map(m => ({ name: m.name, role: m.role || '' })),
      });
    },

    broadcastItinerary(itineraryId) {
      const itin = window.state?.groupItineraries?.[itineraryId];
      if (!itin) return;
      rtdbBroadcast({
        type        : 'itinerary_sync',
        itineraryId,
        payload     : itin,
        hash        : window.computeItineraryHash?.(itin) || '',
        timestamp   : Date.now(),
      });
    },

    reconnectIfNeeded(room, name, onStatus) {
      if (!isStarted) {
        this.start(room, name, onStatus, []);
      } else {
        pub(topic(myRoomId), { type: 'presence', from: myName, ts: Date.now() });
        onStatus?.('connected', onlineCount);
      }
    },

    makePeerId(room, name) {
      const safe = s => s.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 16);
      return 'giap27_' + safe(room) + '_' + safe(name);
    },
  };

  window.peerGPS = peerGPS;
  console.log('[RTDB] ✓ peerGPS pronto (ntfy.sh transport — zero config)');

})();
