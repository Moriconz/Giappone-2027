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
  const HB_INTERVAL  = 45000;          // ms tra heartbeat (ridotto per rispettare rate limit ntfy.sh)

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
  // Un solo topic per stanza — GPS e messaggi sullo stesso canale.
  // Due topic separati richiedono 2 SSE per device = 4 connessioni dallo stesso
  // IP WiFi → ntfy.sh risponde 429 quasi subito.
  function topic(room)    { return TOPIC_PFX + room; }
  function gpsTopic(room) { return TOPIC_PFX + room; } // alias → stesso topic

  // ── Pubblica un messaggio su ntfy.sh ─────────────────────────────────────────
  async function pub(topicName, payload) {
    try {
      const resp = await fetch(`${NTFY_BASE}/${topicName}`, {
        method : 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body   : JSON.stringify(payload),
      });
      if (!resp.ok) {
        console.error(`[RTDB] ❌ PUB FAILED ${resp.status} → topic:${topicName} type:${payload.type}`);
      } else {
        console.log(`[RTDB] ✅ pub ok → topic:${topicName} type:${payload.type}`);
      }
    } catch (e) {
      console.error('[RTDB] ❌ pub fetch error:', e.message);
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
    try { data = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch(e) {
      console.warn('[RTDB] handleIncoming parse fail:', e.message, String(raw).substring(0,80));
      return;
    }
    if (!data) return;
    if (data.from === myName) {
      // echo del proprio messaggio — normale
      return;
    }
    console.log('[RTDB] ← ricevuto da', data.from, '| tipo:', data.type);

    // Aggiorna presenza
    if (data.from) {
      const isNew = !presence[data.from];
      presence[data.from] = Date.now();
      const cnt = Object.keys(presence).filter(n => n !== myName).length;
      if (cnt !== onlineCount) {
        onlineCount = cnt;
        statusCb(onlineCount > 0 ? 'connected' : 'waiting', onlineCount);
      }

      // ── Aggiunge il peer a state.group.members se non c'è già ──────────────
      if (window.state?.group) {
        window.state.group.members = window.state.group.members || [];
        const alreadyIn = window.state.group.members.some(m => m.name === data.from);
        if (!alreadyIn) {
          window.state.group.members.push({
            name: data.from,
            role: '',
            lastHeartbeat: Date.now(),
          });
          if (window.saveState) window.saveState();
          // Chi è il creatore aggiorna tutti con la lista aggiornata
          if (window.state.group.createdByName === myName) {
            setTimeout(() => window.peerGPS?.broadcastGroupSync?.(), 300);
          }
          // Ri-renderizza la group view se è aperta
          if (window.renderGroupView) window.renderGroupView();
        }
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
          // Aggiorna createdByName se arriva nel sync (chi si unisce lo riceve dal creatore)
          if (data.createdByName && !window.state.group.createdByName) {
            window.state.group.createdByName = data.createdByName;
            window.state.group.createdBy     = data.createdByName;
          }
          if (window.saveState) window.saveState();
          if (window.renderGroupView) window.renderGroupView();
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
    console.log('[RTDB] SSE aperta su', url);
    const es  = new EventSource(url);
    es.onopen = () => console.log('[RTDB] ✅ SSE connessa a', topicName);
    es.onmessage = (e) => {
      try {
        const wrapper = JSON.parse(e.data);
        console.log('[RTDB] SSE raw event:', wrapper.event, '| message:', String(wrapper.message).substring(0,80));
        if (wrapper.event === 'message' && wrapper.message) {
          handler(wrapper.message);
        }
      } catch(err) {
        console.warn('[RTDB] SSE parse error:', err.message, '| data:', String(e.data).substring(0,100));
      }
    };
    es.onerror = (e) => {
      console.error('[RTDB] ❌ SSE error su', topicName, '| readyState:', es.readyState);
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

  // ── Pulizia presenze ghost (>120s senza heartbeat) ────────────────────────────
  function prunePresence() {
    const cutoff = Date.now() - 120000;
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

      // ── SSE: un'unica connessione per tutti i tipi di messaggio ─────────────
      evtSrc = openSSE(topic(room), handleIncoming);

      // ── Heartbeat presenza ogni 15s ──────────────────────────────────────────
      hbTimer = setInterval(() => {
        pub(topic(room), { type: 'presence', from: name, ts: Date.now() });
      }, HB_INTERVAL);

      // ── Pulizia ghost ogni 60s ────────────────────────────────────────────────
      presTimer = setInterval(prunePresence, 60000);

      // Annuncia subito la presenza
      pub(topic(room), { type: 'presence', from: name, ts: Date.now() });

      // (nessuna seconda SSE da salvare)
    },

    stop() {
      if (!isStarted) return;
      evtSrc?.close();
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
        type          : 'group_sync',
        name          : g.name,
        roomId        : g.roomId,
        createdByName : g.createdByName || g.createdBy || myName,
        members       : (g.members || []).map(m => ({ name: m.name, role: m.role || '' })),
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
