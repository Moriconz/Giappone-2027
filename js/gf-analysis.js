// ============================================================================
// gf-analysis.js — analyzeGlutenFreeStatus + gfAnalysisCache
// Extracted from app-core.js. Deps (all window.*): toast, openSheet
// ============================================================================
(function () {
  'use strict';
  const T = (k, f) => (typeof window.t === 'function') ? window.t(k, f) : f;


// GF Analysis cache (memoria + localStorage)
let gfAnalysisCache = {};
const GF_CACHE_PREFIX = 'gf_analysis_';
const GF_CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 giorni

async function analyzeGlutenFreeStatus(placeId, name, city) {
  const startTime = Date.now();
  const logPrefix = `%c[GF Analysis: ${name}]`;
  const logStyle = 'background: #4A7C59; color: white; padding: 4px 8px; border-radius: 3px; font-weight: bold';

  // Check in-memory cache first
  const memKey = `${placeId}_${name}_${city}`;
  if (gfAnalysisCache[memKey]) {
    console.log(logPrefix + ' ✅ Cache HIT (memoria)', logStyle);
    return gfAnalysisCache[memKey];
  }
  console.log(logPrefix + ' ⏳ Memory cache miss', logStyle);

  // Check localStorage cache
  const storageKey = `${GF_CACHE_PREFIX}${placeId}`;
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const cached = JSON.parse(stored);
      const age = Date.now() - cached.timestamp;
      if (age < GF_CACHE_TTL) {
        console.log(logPrefix + ` ✅ Cache HIT (localStorage) Age: ${Math.round(age/1000/60)}m`, logStyle);
        // Restore to memory cache
        gfAnalysisCache[memKey] = cached.result;
        return cached.result;
      } else {
        console.log(logPrefix + ' ⏳ Cache EXPIRED (localStorage)', logStyle);
        localStorage.removeItem(storageKey);
      }
    }
  } catch (e) {
    console.warn(logPrefix + ` localStorage read error: ${e.message}`, logStyle);
  }

  // FALLBACK: Use smart local detection instead of API
  // (Backend API doesn't exist in static deployment)
  console.log(logPrefix + ' 📊 Using smart local GF detection (no API available)', logStyle);

  // Try to find matching GF shop in local database
  const localGFMatch = (window.allGlutenFreeShops || []).find(shop => {
    const nameMatch = shop.name && shop.name.toLowerCase().includes(name.toLowerCase().substring(0, 8));
    const cityMatch = shop.city === city;
    return nameMatch && cityMatch;
  });

  if (localGFMatch && localGFMatch.gf) {
    const result = {
      lvl: localGFMatch.gf.lvl || 'unknown',
      confidence: 85,
      notes: localGFMatch.gf.notes || 'Trovato nel database locale',
      mentions: 1,
      total_reviews: 1
    };
    gfAnalysisCache[memKey] = result;
    const totalTime = Date.now() - startTime;
    console.log(logPrefix + ` ✅ DONE in ${totalTime}ms - LOCAL MATCH: ${result.lvl}`, logStyle);
    return result;
  }

  // If no local match, return "ask restaurant" placeholder
  const defaultResult = {
    lvl: 'unknown',
    confidence: 0,
    notes: '❓ Non disponibile nel nostro database',
    mentions: 0,
    total_reviews: 0
  };
  gfAnalysisCache[memKey] = defaultResult;
  const totalTime = Date.now() - startTime;
  console.log(logPrefix + ` ⏳ DONE in ${totalTime}ms - Using fallback message`, logStyle);
  return defaultResult;
}

// renderShoppingView extracted to js/views/shopping-view.js

// Exit group
window.exitGroup = async function() {
  const ok = await (window.modalConfirm || confirm)('Sei sicuro di voler uscire dalla stanza?', { danger: true, confirmText: 'Esci' });
  if (!ok) {
    return;
  }
  console.log('[exitGroup] Exiting group...');
  window.state.group = null;
  window.saveState?.();
  if (window.groupChat) {
    window.groupChat.getHistory().messages = [];
  }
  if (peerGPS) {
    window.peerGPS?.stop();
  }
  window.toast(T('toast.groupLeft', '❌ Uscito dal gruppo'));
  // Aggiorna il contenuto dello sheet in-place (non chiudere/riaprire)
  renderGroupView();
};

// Delete group (creator only). La conferma è già mostrata dall'unico
// chiamante (group-panel.js) — niente doppio dialogo qui.
window.deleteGroup = async function() {
  const room = state.group?.roomId;
  console.log('[deleteGroup] Deleting room:', room);
  // Il dialog di conferma promette "tutti i membri verranno disconnessi":
  // prima serviva solo a pulire lo stato locale, gli altri membri restavano
  // collegati alla stessa stanza MQTT senza saperlo. Ora si avvisa davvero
  // il gruppo prima di sparire in locale (fire-and-forget, stesso pattern
  // di ogni altro broadcast: se il messaggio non arriva a qualcuno, quel
  // client resterà con lo stato vecchio finché non prova a interagire e
  // scopre la stanza vuota — nessun modo di garantire la consegna su MQTT).
  await window.peerBroadcast?.({ type: 'group_deleted', roomId: room });
  window.state.group = null;
  window.saveState?.();
  if (window.groupChat) {
    window.groupChat.getHistory().messages = [];
  }
  if (peerGPS) {
    // ponytail: piccolo margine prima di chiudere — peerGPS.stop() forza la
    // chiusura del socket MQTT (mqttClient.end(true)) subito dopo il publish
    // sopra; il publish è QoS 0 fire-and-forget, senza questo margine il
    // messaggio group_deleted rischiava di non uscire mai sulla rete
    // (verificato: senza il delay il messaggio non arrivava agli altri
    // membri in un test reale a 2 browser).
    setTimeout(() => window.peerGPS?.stop(), 500);
  }
  window.toast('🗑️ Stanza eliminata: ' + room);
  // renderGroupView() chiuderà gli sheet aperti e aprirà il form di setup
  renderGroupView();
};

// NUOVO: Mostra opzioni per membro (Mostra su mappa / Raggiungi)
window.showMemberOptions = function(memberName) {
  const gpsData = state.gpsRemoteMarkers?.[memberName];
  if (!gpsData) {
    window.toast(T('toast.posUnavailable', '⚠️ Posizione non disponibile'));
    return;
  }

  const optionsHtml = `
    <div style="padding:20px;text-align:center">
      <div style="font-size:20px;margin-bottom:20px;font-weight:700;color:var(--l-accent)">📍 ${escapeHtml(memberName)}</div>
      <div style="font-size:15px;color:#666;margin-bottom:20px">Posizione: ${gpsData.lat.toFixed(4)}, ${gpsData.lng.toFixed(4)}</div>

      <div style="display:flex;flex-direction:column;gap:10px">
        <button class="btn" id="show-member-map" data-member="${memberName}" style="background:linear-gradient(135deg,#4A7C59,#3A6C49);color:white;border:none;border-radius:8px;padding:14px;font-weight:600;font-size:16px;cursor:pointer">
          🗺️ Mostra su mappa
        </button>
        <button class="btn" id="reach-member" data-member="${memberName}" style="background:linear-gradient(135deg,#7A8BA5,#5A6A95);color:white;border:none;border-radius:8px;padding:14px;font-weight:600;font-size:16px;cursor:pointer">
          🧭 Raggiungi con mappe
        </button>
      </div>
    </div>
  `;

  window.openSheet(`👤 ${memberName}`, optionsHtml);

  // Event listeners per i pulsanti
  const showMapBtn = document.getElementById('show-member-map');
  if (showMapBtn) {
    showMapBtn.addEventListener('click', () => {
      const name = showMapBtn.dataset.member;
      const coords = state.gpsRemoteMarkers?.[name];
      if (coords) {
        // Chiudi tutte le finestre y2k aperte
        if (window.y2kWindows?.closeAll) {
          window.y2kWindows.closeAll();
        }

        // Centra la mappa sulla posizione
        map.getView().animate({
          center: ol.proj.fromLonLat([coords.lng, coords.lat]),
          zoom: 16,
          duration: 800
        });

        window.toast(`📍 Mostrando ${name} sulla mappa`);
      }
    });
  }

  const reachBtn = document.getElementById('reach-member');
  if (reachBtn) {
    reachBtn.addEventListener('click', () => {
      const name = reachBtn.dataset.member;
      const coords = state.gpsRemoteMarkers?.[name];
      if (coords) {
        // Determina quale app di mappe usare
        const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}&travelmode=walking`;
        const appleMapsUrl = `https://maps.apple.com/?daddr=${coords.lat},${coords.lng}&dirflg=w`;

        // Prova ad aprire Apple Maps su iOS, Google Maps altrimenti
        const userAgent = navigator.userAgent.toLowerCase();
        const isIOS = /iphone|ipad|ipod/.test(userAgent);

        const mapsUrl = isIOS ? appleMapsUrl : googleMapsUrl;
        window.open(mapsUrl, '_blank', 'noopener,noreferrer');

        window.toast(`🧭 Aprendo ${isIOS ? 'Apple Maps' : 'Google Maps'}...`);
      }
    });
  }
};

// renderGroupView estratto in js/views/group-view.js

  window.analyzeGlutenFreeStatus = analyzeGlutenFreeStatus;
})();
