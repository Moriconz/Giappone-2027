// ============================================================================
// FEATURES-GPS.JS — Feature 1,2,4: GPS, WakeLock, Heartbeat
// Dipende da: window.state, window.peer, window.saveState
// ============================================================================

console.log('[GPS] Loading features...');

// ============================================================================
// FEATURE 1: GPS Live P2P — Star Topology
// ============================================================================

function makeHubId(roomId) {
  return `${roomId}_hub`;
}

function makePeerId(roomId, name) {
  return `${roomId}_${name}`;
}

function ensureHubAndMembersConnected() {
  if (!window.state.group) return;

  const hubId = makeHubId(window.state.group.roomId);
  const isHub = (window.state.group.myName === window.state.group.createdByName);

  // Se non sei hub, connetti all'hub
  if (!isHub) {
    const existing = window.peer?.connections[hubId]?.length || 0;
    if (existing === 0 && window.connectToPeer) {
      console.log('[GPS] Connecting to hub:', hubId);
      window.connectToPeer(hubId);
    }
  }

  // Connetti a membri (mesh opzionale, safe rule)
  if (window.state.knownMembers && Array.isArray(window.state.knownMembers)) {
    window.state.knownMembers.forEach(memberName => {
      if (memberName && memberName !== window.state.group.myName) {
        const targetPeerId = makePeerId(window.state.group.roomId, memberName);
        connectToPeerSafe(targetPeerId);
      }
    });
  }
}

function connectToPeerSafe(targetPeerId) {
  const myPeerId = makePeerId(window.state.group.roomId, window.state.group.myName);

  // Solo il peer lessicograficamente maggiore inizia connessione
  if (myPeerId > targetPeerId) {
    const existing = window.peer?.connections[targetPeerId]?.length || 0;
    if (existing === 0 && window.connectToPeer) {
      window.connectToPeer(targetPeerId);
    }
  }
}

function setupPeerHandlersWithRelay(peer, amIHub) {
  peer.on('connection', conn => {
    console.log('[P2P] Connection from:', conn.peer);

    conn.on('data', data => {
      // ===== GPS MESSAGE =====
      if (data.type === "gps") {
        // Aggiorna marker locale
        if (!window.state.gpsRemoteMarkers) window.state.gpsRemoteMarkers = {};
        window.state.gpsRemoteMarkers[data.from] = {
          lat: data.lat,
          lng: data.lng,
          name: data.name,
          lastUpdate: Date.now()
        };

        // Update heartbeat
        onPeerMessage(data);

        // SE SEI HUB: rilancia a tutti gli altri
        if (amIHub && peer.connections) {
          for (const peerId in peer.connections) {
            if (peerId !== data.from) {
              const conns = peer.connections[peerId];
              if (conns && conns.length > 0) {
                conns[0].send(data);
              }
            }
          }
        }

        if (window.updateMapMarkers) window.updateMapMarkers();
      }

      // ===== GROUPSYNC MESSAGE =====
      else if (data.type === "groupsync") {
        if (window.state.group) {
          window.state.group.members = data.members || [];
          window.state.knownMembers = (data.members || [])
            .filter(m => m.name && m.name !== window.state.group.myName)
            .map(m => m.name);

          console.log('[GROUP] Synced members:', window.state.knownMembers);
          ensureHubAndMembersConnected();
          window.saveState();
        }

        // Se sei hub, riemetti (broadcast a tutti)
        if (amIHub && peer.connections) {
          for (const peerId in peer.connections) {
            if (peerId !== data.from) {
              const conns = peer.connections[peerId];
              if (conns && conns.length > 0) {
                conns[0].send(data);
              }
            }
          }
        }
      }

      // ===== HEARTBEAT MESSAGE =====
      else if (data.type === "heartbeat") {
        onPeerMessage(data);
      }
    });
  });
}

function startGPSBroadcast() {
  const broadcastInterval = setInterval(() => {
    if (!window.state.group || !window.state.gpsEnabled || window.state.gpsCurrentLat === undefined) {
      return;
    }

    const msg = {
      type: "gps",
      from: makePeerId(window.state.group.roomId, window.state.group.myName),
      name: window.state.group.myName,
      lat: window.state.gpsCurrentLat,
      lng: window.state.gpsCurrentLng,
      timestamp: Date.now()
    };

    const isHub = (window.state.group.myName === window.state.group.createdByName);

    // Se non sei hub, manda all'hub
    if (!isHub && window.peer) {
      const hubId = makeHubId(window.state.group.roomId);
      const hubConns = window.peer.connections[hubId];
      if (hubConns && hubConns.length > 0) {
        hubConns[0].send(msg);
      }
    }

    // Anche mesh (best-effort)
    if (window.peer?.connections) {
      Object.keys(window.peer.connections).forEach(peerId => {
        if (peerId !== makeHubId(window.state.group.roomId)) {
          const conns = window.peer.connections[peerId];
          if (conns && conns.length > 0) {
            conns[0].send(msg);
          }
        }
      });
    }

    if (window.updateMapMarkers) window.updateMapMarkers();

  }, 5000);

  return broadcastInterval;
}

// ============================================================================
// FEATURE 2: GPS Persistente — Wake Lock
// ============================================================================

let wakeLock = null;

async function toggleWakeLock(enabled) {
  const statusEl = document.getElementById('wake-lock-status');

  if (enabled) {
    if (!navigator.wakeLock) {
      if (statusEl) statusEl.innerHTML = '⚠️ Browser non supporta Wake Lock';
      return false;
    }

    try {
      wakeLock = await navigator.wakeLock.request("screen");
      if (statusEl) statusEl.innerHTML = '✅ Wake Lock attivo — schermo rimarrà acceso';

      wakeLock.addEventListener('release', () => {
        if (statusEl) statusEl.innerHTML = '⏸️ Wake Lock rilasciato';
      });

      if (window.DEBUG) console.log('[WakeLock] Enabled');
      return true;
    } catch (err) {
      if (statusEl) statusEl.innerHTML = `❌ Errore: ${err.message}`;
      return false;
    }
  } else {
    if (wakeLock) {
      wakeLock.release();
      wakeLock = null;
      if (statusEl) statusEl.innerHTML = '⏸️ Wake Lock disattivato';
      if (window.DEBUG) console.log('[WakeLock] Disabled');
    }
  }
}

function setupWakeLockToggle() {
  const toggleEl = document.getElementById('maintain-screen-on');
  if (!toggleEl) {
    if (window.DEBUG) console.warn('[WakeLock] Toggle element not found');
    return;
  }

  toggleEl.addEventListener('change', (e) => {
    toggleWakeLock(e.target.checked);
    window.state.wakeLockEnabled = e.target.checked;
    window.saveState();
  });

  if (window.state.wakeLockEnabled) {
    toggleEl.checked = true;
    toggleWakeLock(true);
  }
}

window.addEventListener('beforeunload', () => {
  if (wakeLock) wakeLock.release();
});

// ============================================================================
// FEATURE 4: Heartbeat Anti-Ghost
// ============================================================================

function onPeerMessage(data) {
  if (window.state.group && data.name) {
    const isHub = (window.state.group.myName === window.state.group.createdByName);
    if (isHub) {
      const member = window.state.group.members.find(m => m.name === data.name);
      if (member) {
        member.lastHeartbeat = Date.now();
      }
    }
  }
}

function startHeartbeatMonitoring() {
  const interval = setInterval(() => {
    if (!window.state.group || window.state.group.myName !== window.state.group.createdByName) {
      return; // Solo hub monitora
    }

    const now = Date.now();
    const timeout = 45 * 1000;

    if (window.state.group.members && Array.isArray(window.state.group.members)) {
      const aliveBefore = window.state.group.members.length;

      window.state.group.members = window.state.group.members.filter(m => {
        if (!m.lastHeartbeat) {
          m.lastHeartbeat = now;
          return true;
        }
        const isAlive = (now - m.lastHeartbeat) < timeout;
        if (!isAlive) {
          console.log('[HUB] Removing ghost:', m.name);
          if (window.state.gpsRemoteMarkers) {
            const peerId = makePeerId(window.state.group.roomId, m.name);
            delete window.state.gpsRemoteMarkers[peerId];
          }
        }
        return isAlive;
      });

      if (aliveBefore !== window.state.group.members.length) {
        if (window.broadcastGroupSync) window.broadcastGroupSync();
        if (window.updateMapMarkers) window.updateMapMarkers();
        window.saveState();
      }
    }
  }, 15 * 1000);

  return interval;
}

function startHeartbeatSender() {
  const interval = setInterval(() => {
    if (!window.state.group || !window.state.group.myName) return;

    const msg = {
      type: "heartbeat",
      name: window.state.group.myName,
      timestamp: Date.now()
    };

    if (window.state.group.myName !== window.state.group.createdByName) {
      const hubId = makeHubId(window.state.group.roomId);
      const hubConns = window.peer?.connections[hubId];
      if (hubConns?.length > 0) {
        hubConns[0].send(msg);
      }
    }
  }, 15 * 1000);

  return interval;
}

// ============================================================================
// FEATURE 9: Validation
// ============================================================================

function validateGroupSetup(group) {
  if (!group || !group.roomId || !group.myName || !group.members) {
    return { valid: false, error: "Dati gruppo incompleti" };
  }
  if (!Array.isArray(group.members) || group.members.length === 0) {
    return { valid: false, error: "Almeno 1 membro" };
  }
  if (group.members.length > 20) {
    return { valid: false, error: "Max 20 membri" };
  }
  const names = group.members.map(m => m.name);
  if (new Set(names).size !== names.length) {
    return { valid: false, error: "Nomi duplicati" };
  }
  return { valid: true };
}

// ============================================================================
// Auto-reconnect on visibility change (device wake) & online event
// ============================================================================

document.addEventListener('visibilitychange', () => {
  if (document.hidden === false) {
    // Device woke up, force reconnect to mesh
    console.log('[GPS] Device visible, reconnecting to mesh...');
    if (window.state?.group && window.state.gpsEnabled) {
      setTimeout(() => {
        ensureHubAndMembersConnected();
        if (window.startHeartbeatSender) window.startHeartbeatSender();
        console.log('[GPS] Reconnected ✓');
      }, 500);
    }
  }
});

window.addEventListener('online', () => {
  console.log('[GPS] Online detected, reconnecting...');
  if (window.state?.group && window.state.gpsEnabled) {
    setTimeout(() => {
      ensureHubAndMembersConnected();
      console.log('[GPS] Reconnected to mesh');
    }, 500);
  }
});

// ============================================================================
// Export functions to window
// ============================================================================
window.makeHubId = makeHubId;
window.makePeerId = makePeerId;
window.ensureHubAndMembersConnected = ensureHubAndMembersConnected;
window.connectToPeerSafe = connectToPeerSafe;
window.setupPeerHandlersWithRelay = setupPeerHandlersWithRelay;
window.startGPSBroadcast = startGPSBroadcast;
window.toggleWakeLock = toggleWakeLock;
window.setupWakeLockToggle = setupWakeLockToggle;
window.onPeerMessage = onPeerMessage;
window.startHeartbeatMonitoring = startHeartbeatMonitoring;
window.startHeartbeatSender = startHeartbeatSender;
window.validateGroupSetup = validateGroupSetup;

console.log('[GPS] Features loaded ✓');
