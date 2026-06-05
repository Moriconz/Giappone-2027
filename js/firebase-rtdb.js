// ============================================================================
// FIREBASE-RTDB.JS — P2P Sync via MQTT (broker.emqx.io, zero config)
// Transport: MQTT over WebSocket — nessun limite di messaggi, zero signup.
// ntfy.sh aveva un limite di 250 msg/giorno per IP — incompatibile col testing.
// API identica al vecchio PeerJS peerGPS — nessuna modifica al resto del codice.
// ============================================================================

console.log('[RTDB] Loading MQTT transport...');

(function () {
  'use strict';

  const T = (k, f) => (typeof window.t === 'function') ? window.t(k, f) : f;

  const MQTT_BROKER  = 'wss://broker.emqx.io:8084/mqtt';
  const TOPIC_PFX    = 'giap2027v2/';   // prefisso topic MQTT
  const HB_INTERVAL  = 20000;           // ms tra heartbeat (20s)

  let myRoomId    = null;
  let myName      = null;
  let statusCb    = () => {};
  let mqttClient  = null;
  let hbTimer     = null;
  let presTimer   = null;
  let isStarted   = false;
  let onlineCount = 0;

  // Mappa presenze: name → lastSeen timestamp
  const presence = {};

  // ── topic name ───────────────────────────────────────────────────────────────
  function roomTopic(room) { return TOPIC_PFX + room; }

  // ── Pubblica un messaggio MQTT ────────────────────────────────────────────────
  function pub(topicName, payload) {
    if (!mqttClient || !mqttClient.connected) {
      console.warn('[RTDB] pub skipped — not connected');
      return;
    }
    try {
      mqttClient.publish(topicName, JSON.stringify(payload));
      console.log('[RTDB] ✅ pub ok → type:', payload.type);
    } catch (e) {
      console.error('[RTDB] ❌ pub error:', e.message);
    }
  }

  // ── Broadcast generico (usato dall'esterno via window.rtdbBroadcast) ─────────
  function rtdbBroadcast(data) {
    if (!isStarted || !myRoomId) return;
    const msg = { ...data, from: myName, ts: Date.now() };
    pub(roomTopic(myRoomId), msg);
  }
  window.rtdbBroadcast = rtdbBroadcast;
  window.broadcastToPeers = rtdbBroadcast; // alias used by gf-places-panel.js

  // ── Gestisce messaggi in arrivo ───────────────────────────────────────────────
  function handleIncoming(raw) {
    let data;
    try { data = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch(e) {
      console.warn('[RTDB] handleIncoming parse fail:', e.message);
      return;
    }
    if (!data) return;
    if (data.from === myName) return; // echo proprio

    console.log('[RTDB] ← ricevuto da', data.from, '| tipo:', data.type);

    // Aggiorna presenza
    if (data.from) {
      presence[data.from] = Date.now();
      const cnt = Object.keys(presence).filter(n => n !== myName).length;
      if (cnt !== onlineCount) {
        onlineCount = cnt;
        statusCb(onlineCount > 0 ? 'connected' : 'waiting', onlineCount);
      }

      // ── Aggiunge/aggiorna il peer in state.group.members ────────────────────
      if (window.state?.group) {
        window.state.group.members = window.state.group.members || [];
        const existingIdx = window.state.group.members.findIndex(m => m.name === data.from);
        if (existingIdx === -1) {
          // Nuovo membro: assicura che myName sia nella lista prima
          if (!window.state.group.members.some(m => m.name === myName)) {
            window.state.group.members.unshift({ name: myName, role: window.state.group.createdByName === myName ? 'hub' : 'member', lastHeartbeat: Date.now() });
          }
          window.state.group.members.push({
            name: data.from,
            role: 'member',
            lastHeartbeat: Date.now(),
          });
          window.saveState?.();
          // Il creatore aggiorna tutti con la lista completa
          if (window.state.group.createdByName === myName) {
            setTimeout(() => window.peerGPS?.broadcastGroupSync?.(), 300);
          }
          // Emit event for UI update
          document.dispatchEvent(new CustomEvent('group_members_updated', {
            detail: { members: window.state.group.members }
          }));
        } else {
          // Membro già presente: aggiorna solo lastHeartbeat (senza re-render per ogni presence)
          window.state.group.members[existingIdx].lastHeartbeat = Date.now();
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
        console.log(`%c[RTDB] 📍 GPS ricevuto da ${data.from}: (${data.lat.toFixed(4)}, ${data.lng.toFixed(4)})`, 'background:#FF69B4;color:white;padding:4px 8px;border-radius:3px;font-size:11px');
        // Emit event for map update
        document.dispatchEvent(new CustomEvent('map_markers_updated', {
          detail: { markers: window.state.gpsRemoteMarkers }
        }));
        break;

      case 'presence':
        // già gestito sopra
        break;

      case 'group_sync':
      case 'groupsync':
        if (window.state?.group && data.members) {
          // Preserva lastHeartbeat dai membri già noti prima di sovrascrivere
          const prevMembers = window.state.group.members || [];
          const prevMemberNames = new Set(prevMembers.map(m => m.name));
          const newMemberNames = new Set(data.members.map(m => m.name));

          window.state.group.members = data.members.map(m => {
            const prev = prevMembers.find(p => p.name === m.name);
            return {
              ...m,
              lastHeartbeat: prev?.lastHeartbeat || Date.now(),
            };
          });
          // Assicura che myName sia nella lista
          if (myName && !window.state.group.members.some(m => m.name === myName)) {
            window.state.group.members.unshift({ name: myName, role: window.state.group.createdByName === myName ? 'hub' : 'member', lastHeartbeat: Date.now() });
          }
          window.state.knownMembers = (data.members || [])
            .filter(m => m.name && m.name !== myName)
            .map(m => m.name);
          if (data.createdByName) {
            window.state.group.createdByName = data.createdByName;
            window.state.group.createdBy     = data.createdByName;
          }
          window.saveState?.();

          // NUOVO MEMBRO RILEVATO? Forza broadcast GPS istantaneo
          let hasNewMembers = false;
          for (const newName of newMemberNames) {
            if (!prevMemberNames.has(newName) && newName !== myName) {
              hasNewMembers = true;
              break;
            }
          }
          if (hasNewMembers) {
            console.log(`%c[RTDB] 👥 Nuovi membri rilevati - Broadcasting GPS istantaneo`, 'background:#FF1493;color:white;padding:4px 8px;border-radius:3px');
            // Forza broadcast della posizione GPS attuale entro 100ms
            window.dispatchEvent(new CustomEvent('force-gps-broadcast', { detail: { delayMs: 100 } }));
          }

          // Emit event for UI update
          document.dispatchEvent(new CustomEvent('group_members_updated', {
            detail: { members: window.state.group.members }
          }));
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
          window.saveState?.();
          window.dispatchEvent(new CustomEvent('itinerary_updated', {
            detail: { itineraryId: data.itineraryId, itinerary: merged },
          }));
        }
        break;

      case 'itinerary_share':
        // Someone shared an itinerary with this group
        if (data.payload && myRoomId) {
          const { originItineraryId, groupId, itinerary } = data.payload;
          if (groupId !== myRoomId) return; // Not for our group

          console.log(`%c[RTDB] 📤 Itinerary shared with us by ${data.from}`, 'background:#FF1493;color:white;padding:4px 8px;border-radius:3px');

          // Create group itinerary entry
          const groupItinId = `group_${groupId}_shared`;
          if (!window.state?.groupItineraries) window.state.groupItineraries = {};

          window.state.groupItineraries[groupItinId] = {
            id: groupItinId,
            groupId: groupId,
            owner: data.from,
            originItineraryId: originItineraryId,
            pois: itinerary.pois || [],
            syncStatus: 'synced',
            lastSyncAt: data.ts || Date.now(),
            lastSyncedBy: data.from,
            vectorClock: itinerary.vectorClock || { [data.from]: 1 }
          };

          window.saveState?.();

          // Notify UI
          window.dispatchEvent(new CustomEvent('itinerary_shared_received', {
            detail: { groupId, from: data.from, itinerary: window.state.groupItineraries[groupItinId] }
          }));

          // Show toast
          window.toast?.(`📤 ${data.from} ` + T('group.toastShared', 'ha condiviso un itinerario con il gruppo'));
        }
        break;

      case 'itinerary_edit':
        // Someone edited a shared itinerary in the group
        if (data.payload && myRoomId) {
          const { groupId, itineraryId, originItineraryId, action, tappId, data: actionData, vectorClock } = data.payload;
          if (groupId !== myRoomId) return; // Not for our group

          console.log(`%c[RTDB] ✏️ Itinerary edit from ${data.from}: ${action}`, 'background:#FF1493;color:white;padding:4px 8px;border-radius:3px');

          // Get or create group itinerary
          const groupItinId = itineraryId || `group_${groupId}_shared`;
          if (!window.state?.groupItineraries) window.state.groupItineraries = {};
          if (!window.state.groupItineraries[groupItinId]) {
            console.warn('[RTDB] Received edit for unknown itinerary:', groupItinId);
            return;
          }

          const groupItin = window.state.groupItineraries[groupItinId];
          if (!Array.isArray(groupItin.pois)) groupItin.pois = [];
          let modified = false;

          // Apply the edit action
          switch (action) {
            case 'add':
              if (actionData?.poi) {
                groupItin.pois.push(actionData.poi);
                // Add audit entry
                if (window.addTappaAuditEntry) {
                  window.addTappaAuditEntry(actionData.poi, 'added', data.from);
                }
                modified = true;
              }
              break;

            case 'remove':
              if (tappId) {
                const idx = groupItin.pois.findIndex(p => p.id === tappId);
                if (idx !== -1) {
                  window.addTappaAuditEntry(groupItin.pois[idx], 'removed', data.from);
                  groupItin.pois.splice(idx, 1);
                  modified = true;
                }
              }
              break;

            case 'reorder':
              if (tappId && actionData?.newPosition !== undefined) {
                const idx = groupItin.pois.findIndex(p => p.id === tappId);
                if (idx !== -1) {
                  const [poi] = groupItin.pois.splice(idx, 1);
                  groupItin.pois.splice(actionData.newPosition, 0, poi);
                  window.addTappaAuditEntry(poi, 'reordered', data.from);
                  modified = true;
                }
              }
              break;

            case 'note_updated':
              if (tappId && actionData?.note !== undefined) {
                const poi = groupItin.pois.find(p => p.id === tappId);
                if (poi) {
                  poi.note = actionData.note;
                  window.addTappaAuditEntry(poi, 'note_updated', data.from, { note: actionData.note });
                  modified = true;
                }
              }
              break;
          }

          if (modified) {
            // Update vector clock
            groupItin.vectorClock = vectorClock || groupItin.vectorClock || {};
            groupItin.lastSyncAt = data.ts || Date.now();
            groupItin.lastSyncedBy = data.from;
            groupItin.syncStatus = 'synced';

            window.saveState?.();

            // Notify UI
            window.dispatchEvent(new CustomEvent('itinerary_edited', {
              detail: { groupId, itineraryId: groupItinId, action, from: data.from, itinerary: groupItin }
            }));

            // If this was originally owned by me, sync back to personal itinerary
            if (originItineraryId && window.state?.group?.myName === groupItin.owner) {
              window.dispatchEvent(new CustomEvent('sync_group_to_personal', {
                detail: { originItineraryId, groupItinId, groupId }
              }));
            }
          }
        }
        break;

      case 'itinerary_sync_personal':
        // Owner's personal itinerary is syncing back from group edits
        if (data.payload && window.state?.group?.myName) {
          const { originItineraryId, groupId, itinerary, fromMember } = data.payload;

          console.log(`%c[RTDB] 🔄 Personal itinerary synced from group by ${fromMember}`, 'background:#FF1493;color:white;padding:4px 8px;border-radius:3px');

          // Rebuild personal day-by-day itinerary from the synced group pois
          if (originItineraryId && itinerary?.pois && window.groupPoisToItineraryByDay) {
            window.ItinerarySnapshots?.saveAuto?.('group-sync-incoming');
            window.state.itineraryByDay = window.groupPoisToItineraryByDay(itinerary.pois);
            window.saveState?.();
            window.renderItineraryUnified?.();

            window.dispatchEvent(new CustomEvent('personal_itinerary_synced', {
              detail: { groupId, fromMember, itinerary: window.state.itineraryByDay }
            }));

            window.toast?.(`✅ ${fromMember} ` + T('group.toastUpdated', "ha aggiornato l'itinerario del gruppo"));
          }
        }
        break;

      case 'itinerary_unshare_request':
        // Non-owner requesting to unshare
        if (data.payload && window.state?.group?.myName === window.state?.groupItineraries?.[`group_${data.payload.groupId}_shared`]?.owner) {
          const { requestedBy, groupId } = data.payload;
          console.log(`%c[RTDB] 📨 Unshare request from ${requestedBy} for group ${groupId}`, 'background:#FF1493;color:white;padding:4px 8px;border-radius:3px');

          // Notify owner with toast
          window.toast?.(`📨 ${requestedBy} ` + T('group.toastUnshareReq', 'ha richiesto di smettere di condividere'));

          // Could trigger a modal asking owner to accept/deny
          // For now, log it
          document.dispatchEvent(new CustomEvent('unshare_requested', {
            detail: { groupId, requestedBy, ts: data.ts }
          }));
        }
        break;

      case 'itinerary_unshared':
        // Owner has unshared the itinerary
        if (data.payload && myRoomId === data.payload.groupId) {
          const { unsharedBy, groupId } = data.payload;
          console.log(`%c[RTDB] 🚫 Itinerary unshared by ${unsharedBy}`, 'background:#FF1493;color:white;padding:4px 8px;border-radius:3px');

          // Remove from our groupItineraries
          const groupItinId = `group_${groupId}_shared`;
          if (window.state?.groupItineraries?.[groupItinId]) {
            delete window.state.groupItineraries[groupItinId];
            window.saveState?.();
          }

          window.toast?.(`🚫 ${unsharedBy} ` + T('group.toastUnshared', "ha smesso di condividere l'itinerario"));

          document.dispatchEvent(new CustomEvent('itinerary_unshared', {
            detail: { groupId, unsharedBy }
          }));
        }
        break;

      case 'itinerary_deleted':
        // Itinerary was deleted
        if (data.payload && myRoomId === data.payload.groupId) {
          const { itineraryId, deletedBy } = data.payload;
          console.log(`%c[RTDB] 🗑️ Itinerary deleted by ${deletedBy}`, 'background:#FF1493;color:white;padding:4px 8px;border-radius:3px');

          if (window.state?.groupItineraries?.[itineraryId]) {
            delete window.state.groupItineraries[itineraryId];
            window.saveState?.();
          }

          window.toast?.(`🗑️ ${deletedBy} ` + T('group.toastDeleted', "ha eliminato l'itinerario condiviso"));

          document.dispatchEvent(new CustomEvent('itinerary_deleted', {
            detail: { itineraryId, groupId: data.payload.groupId, deletedBy }
          }));
        }
        break;

      case 'heartbeat':
        window.onPeerMessage?.(data);
        break;

      // GF group wishlist (propose/vote/remove) sync
      case 'gf_wishlist':
        if (data.payload) window.GFWishlist?.receive?.(data.payload);
        break;

      // GF crowdsource reports (safe/warning/note) sync
      case 'gf_report':
        if (data.payload) window.GFCrowd?.receiveReport?.(data.payload);
        break;

      // GF suggestion sync
      case 'gf_suggestion_add':
        if (data.suggestion && window.GFSuggestionsDB) {
          const sug = data.suggestion;
          const exists = window.GFSuggestionsDB.getAll().some(s => s.id === sug.id);
          if (!exists) {
            const list = window.GFSuggestionsDB.getAll();
            list.push(sug);
            window.GFSuggestionsDB._save(list);
          }
        }
        break;

      // GF custom places sync (from gf-places-panel.js via broadcastToPeers)
      case 'gf_place_add':
        if (data.place && window.GFPlacesDB) {
          const existing = window.GFPlacesDB.getAll().find(p => p.id === data.place.id);
          if (!existing) {
            const places = window.GFPlacesDB.getAll();
            places.push(data.place);
            window.GFPlacesDB._save(places);
            window.refreshGFPlacesLayer?.();
          }
        }
        break;
      case 'gf_place_edit':
        if (data.id && data.updates && window.GFPlacesDB) {
          const places = window.GFPlacesDB.getAll();
          const idx = places.findIndex(p => p.id === data.id);
          if (idx >= 0) {
            places[idx] = { ...places[idx], ...data.updates, updatedAt: new Date().toISOString() };
            window.GFPlacesDB._save(places);
            window.refreshGFPlacesLayer?.();
          }
        }
        break;
      case 'gf_place_delete':
        if (data.id && window.GFPlacesDB) {
          window.GFPlacesDB._save(window.GFPlacesDB.getAll().filter(p => p.id !== data.id));
          window.refreshGFPlacesLayer?.();
        }
        break;

      default:
        break;
    }
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
    ownKeys(){ return isStarted ? ['__mqtt__'] : []; },
    getOwnPropertyDescriptor(t, k) {
      if (isStarted && k === '__mqtt__')
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

  // ── Pulizia presenze ghost (>90s senza heartbeat) ─────────────────────────────
  function prunePresence() {
    const cutoff = Date.now() - 90000;
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

      statusCb('waiting', 0);
      console.log('[RTDB] Connessione MQTT a stanza:', room, '| utente:', name);

      // ── Connetti al broker MQTT ───────────────────────────────────────────────
      const clientId = 'giap27_' + Math.random().toString(16).substring(2, 10);
      mqttClient = mqtt.connect(MQTT_BROKER, {
        clientId,
        clean    : true,
        reconnectPeriod: 3000,
        connectTimeout : 10000,
      });

      mqttClient.on('connect', () => {
        console.log('[RTDB] ✅ MQTT connesso al broker | stanza:', room);
        mqttClient.subscribe(roomTopic(room), { qos: 0 }, (err) => {
          if (err) { console.error('[RTDB] subscribe error:', err.message); return; }
          console.log('[RTDB] ✅ Iscritto a topic:', roomTopic(room));
          // Annuncia subito la presenza
          pub(roomTopic(room), { type: 'presence', from: name, ts: Date.now() });
        });
      });

      mqttClient.on('message', (topic, msgBuf) => {
        const raw = msgBuf.toString();
        handleIncoming(raw);
      });

      mqttClient.on('error', (err) => {
        console.error('[RTDB] ❌ MQTT error:', err.message);
      });

      mqttClient.on('reconnect', () => {
        console.log('[RTDB] MQTT reconnecting...');
      });

      mqttClient.on('offline', () => {
        console.warn('[RTDB] MQTT offline');
        statusCb('waiting', onlineCount);
      });

      // ── Heartbeat presenza ogni 20s ──────────────────────────────────────────
      hbTimer = setInterval(() => {
        if (mqttClient?.connected) {
          pub(roomTopic(room), { type: 'presence', from: name, ts: Date.now() });
        }
      }, HB_INTERVAL);

      // ── Pulizia ghost ogni 60s ────────────────────────────────────────────────
      presTimer = setInterval(prunePresence, 60000);
    },

    stop() {
      if (!isStarted) return;
      clearInterval(hbTimer);
      clearInterval(presTimer);
      if (mqttClient) {
        mqttClient.end(true);
        mqttClient = null;
      }
      isStarted = false;
      myRoomId  = null;
      myName    = null;
      onlineCount = 0;
      window.peer.disconnected = true;
      console.log('[RTDB] Disconnesso');
    },

    send(data)         { rtdbBroadcast(data); },
    getStatus()        { return isStarted ? (mqttClient?.connected ? 'connected' : 'connecting') : 'disconnected'; },
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
      // Assicura che myName sia sempre nella lista
      const members = [...(g.members || [])];
      if (!members.some(m => m.name === myName)) {
        members.unshift({ name: myName, role: g.createdByName === myName ? 'hub' : 'member' });
      }
      rtdbBroadcast({
        type          : 'group_sync',
        name          : g.name,
        roomId        : g.roomId,
        createdByName : g.createdByName || g.createdBy || myName,
        members       : members.map(m => ({ name: m.name, role: m.role || '' })),
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

    broadcastItineraryShare(itineraryId, groupId) {
      // Share the personal itinerary with a group.
      // Source: itineraryByDay (flattened) — state.itinerary is the legacy
      // empty array and must NOT be used here.
      const personalItin = Object.values(window.state?.itineraryByDay || {}).flat();
      if (!personalItin.length || !groupId) return;

      rtdbBroadcast({
        type: 'itinerary_share',
        payload: {
          originItineraryId: itineraryId,
          groupId: groupId,
          itinerary: {
            pois: personalItin,
            vectorClock: { [myName]: 1 }
          }
        }
      });
      console.log('[RTDB] 📤 Broadcasting itinerary share:', itineraryId, groupId);
    },

    broadcastItineraryEdit(groupId, itineraryId, action, tappId, data) {
      // Broadcast an edit to a shared itinerary
      if (!groupId || !itineraryId) return;

      const groupItin = window.state?.groupItineraries?.[itineraryId];
      const vectorClock = groupItin?.vectorClock || {};
      vectorClock[myName] = (vectorClock[myName] || 0) + 1;

      rtdbBroadcast({
        type: 'itinerary_edit',
        payload: {
          groupId: groupId,
          itineraryId: itineraryId,
          originItineraryId: groupItin?.originItineraryId,
          action: action,  // 'add', 'remove', 'reorder', 'note_updated'
          tappId: tappId,
          data: data,
          vectorClock: vectorClock
        }
      });
      console.log('[RTDB] ✏️ Broadcasting itinerary edit:', action, tappId);
    },

    broadcastPersonalItinerarySyncBack(originItineraryId, groupId) {
      // Sync personal itinerary back to group after group member edits
      const personalItin = window.state?.itinerary;
      if (!personalItin) return;

      rtdbBroadcast({
        type: 'itinerary_sync_personal',
        payload: {
          originItineraryId: originItineraryId,
          groupId: groupId,
          itinerary: {
            pois: personalItin,
            vectorClock: { [myName]: 1 }
          },
          fromMember: myName
        }
      });
      console.log('[RTDB] 🔄 Broadcasting personal itinerary sync back:', originItineraryId);
    },

    reconnectIfNeeded(room, name, onStatus) {
      if (!isStarted) {
        this.start(room, name, onStatus, []);
      } else if (mqttClient?.connected) {
        pub(roomTopic(myRoomId), { type: 'presence', from: myName, ts: Date.now() });
        onStatus?.('connected', onlineCount);
      }
    },

    makePeerId(room, name) {
      const safe = s => s.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 16);
      return 'giap27_' + safe(room) + '_' + safe(name);
    },
  };

  window.peerGPS = peerGPS;
  console.log('[RTDB] ✓ peerGPS pronto (MQTT transport — zero config)');

})();
