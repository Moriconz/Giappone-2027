// app-core.js — applicazione principale, estratta dal blocco <script> inline di index.html
console.log('[Giappone2027] App loading...');

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('[Giappone2027] DOM ready');
  if (typeof ol === 'undefined') {
    console.error('[Giappone2027] OpenLayers not loaded!');
    document.getElementById('ol-error').style.display = 'flex';
    return;
  }
  console.log('[Giappone2027] OpenLayers loaded, initializing...');
/* =========================================================
   POI DATABASE — Giappone 2027
   Fonti: Japan National Tourism Org, Tabelog, TableCheck,
   community gluten-free Japan (Shoku Facebook group).
   Coordinate verificate via OpenStreetMap.
   ========================================================= */
  
// POI base (fallback)
// ============================================================================
// POI LOADING — Now using Google Places API directly (no local dataset)
// ============================================================================
/* =========================================================
   APP CONTROLLER
   ========================================================= */
(function(){
  'use strict';
  let POIS;
  let POIS_LOADED = false;
  // REMOVED: CHUNK_LOAD_LIMIT
  // REMOVED: loadedChunkRegions
  // getGpsRadiusKm moved to js/map-markers.js
  // REMOVED: CHUNK_FILES
  // REMOVED: CHUNK_REGION_MAP
  // REMOVED: CHUNK_REGION_BOUNDS
  // REMOVED: CHUNK_CATEGORY_MAP

  // REMOVED: inferChunkCat function

  // REMOVED: getChunkRegionForCoords function

  // REMOVED: getCurrentChunkRegions function

  // REMOVED: deprecated parseChunkFeaturesFromStream

  // REMOVED: getChunkFilesForRegion and loadChunkData functions



  // ---- Device tier detection for progressive enhancement ----
  const tier = (function(){
    const mem = navigator.deviceMemory || 4;
    const cores = navigator.hardwareConcurrency || 4;
    if (mem <= 2 || cores <= 2) { document.body.classList.add('low-tier'); return 'low'; }
    if (mem <= 4 || cores <= 4) return 'mid';
    return 'high';
  })();
  console.log('[giappone2027] Device tier:', tier);
  // ---- Categories + filters ---- COMPREHENSIVE from Google Places
  const CATS = {
    all:{label:'Tutti',icon:'📍'},
    poi:{label:'Luoghi',icon:'📍'},
    unclassified:{label:'Da categorizzare',icon:'❓'},
    shrine:{label:'Santuari',icon:'⛩️'},
    temple:{label:'Templi',icon:'🏯'},
    church:{label:'Chiese',icon:'⛪'},
    mosque:{label:'Moschee',icon:'🕌'},
    synagogue:{label:'Sinagoghe',icon:'🕍'},
    culture:{label:'Cultura',icon:'🎨'},
    museum:{label:'Musei',icon:'🏛️'},
    gallery:{label:'Gallerie',icon:'🖼️'},
    library:{label:'Librerie',icon:'📚'},
    landmark:{label:'Landmark',icon:'📍'},
    monument:{label:'Monumenti',icon:'🗿'},
    historical_landmark:{label:'Siti storici',icon:'🏛️'},
    castle:{label:'Castelli',icon:'🏰'},
    food:{label:'Cibo',icon:'🍽️'},
    restaurant:{label:'Ristoranti',icon:'🍜'},
    cafe:{label:'Caffè',icon:'☕'},
    bar:{label:'Bar',icon:'🍷'},
    bakery:{label:'Panetterie',icon:'🥐'},
    meal_delivery:{label:'Consegna cibo',icon:'🛵'},
    meal_takeaway:{label:'Asporto',icon:'📦'},
    drinking_bar:{label:'Locali',icon:'🍺'},
    market:{label:'Mercati',icon:'🥢'},
    hotel:{label:'Hotel',icon:'🏨'},
    accommodation:{label:'Alloggi',icon:'🏩'},
    hostel:{label:'Ostelli',icon:'🏠'},
    guest_house:{label:'Guest house',icon:'🏡'},
    campground:{label:'Campeggi',icon:'⛺'},
    apartment_building:{label:'Appartamenti',icon:'🏢'},
    shopping:{label:'Shopping',icon:'🛍️'},
    shop:{label:'Negozi',icon:'🛒'},
    supermarket:{label:'Supermercati',icon:'🏪'},
    shopping_mall:{label:'Center',icon:'🏬'},
    department_store:{label:'Grandi magazzini',icon:'🏬'},
    clothing_store:{label:'Abbigliamento',icon:'👕'},
    shoe_store:{label:'Scarpe',icon:'👞'},
    book_store:{label:'Librerie',icon:'📖'},
    electronics_store:{label:'Elettronica',icon:'⚡'},
    jewelry_store:{label:'Gioiellerie',icon:'💎'},
    furniture_store:{label:'Arredamento',icon:'🛋️'},
    home_goods_store:{label:'Casa',icon:'🏠'},
    pharmacy:{label:'Farmacie',icon:'💊'},
    convenience_store:{label:'Convenience',icon:'🏪'},
    florist:{label:'Fioristi',icon:'🌸'},
    toy_store:{label:'Giocattoli',icon:'🧸'},
    vintage:{label:'Vintage',icon:'🧥'},
    nature:{label:'Natura',icon:'🌿'},
    park:{label:'Parchi',icon:'🌳'},
    natural_feature:{label:'Natura selvaggia',icon:'🌲'},
    garden:{label:'Giardini',icon:'🌸'},
    zoo:{label:'Zoo',icon:'🦁'},
    aquarium:{label:'Acquari',icon:'🐠'},
    botanical_garden:{label:'Orti botanici',icon:'🌺'},
    amusement_park:{label:'Parchi divertimento',icon:'🎡'},
    hiking_area:{label:'Sentieri',icon:'⛰️'},
    scenic_spot:{label:'Belvedere',icon:'🔭'},
    water:{label:'Acqua gratis',icon:'💧'},
    wellness:{label:'Benessere',icon:'🧘'},
    spa:{label:'Spa',icon:'💆'},
    gym:{label:'Palestre',icon:'💪'},
    yoga_studio:{label:'Yoga',icon:'🧘'},
    health:{label:'Salute',icon:'⚕️'},
    hospital:{label:'Ospedali',icon:'🏥'},
    clinic:{label:'Cliniche',icon:'🏥'},
    doctor:{label:'Medici',icon:'⚕️'},
    dentist:{label:'Dentisti',icon:'🦷'},
    massage:{label:'Massaggio',icon:'💆'},
    physiotherapist:{label:'Fisioterapia',icon:'🤕'},
    beauty_salon:{label:'Saloni bellezza',icon:'💄'},
    hair_care:{label:'Parrucchieri',icon:'💇'},
    services:{label:'Servizi',icon:'🔧'},
    bank:{label:'Banche',icon:'🏦'},
    atm:{label:'Bancomat',icon:'💰'},
    post_office:{label:'Poste',icon:'📮'},
    real_estate_agency:{label:'Immobiliare',icon:'🏠'},
    travel_agency:{label:'Agenzie viaggio',icon:'✈️'},
    insurance_agency:{label:'Assicurazioni',icon:'🛡️'},
    accounting:{label:'Contabilità',icon:'📊'},
    attorney:{label:'Avvocati',icon:'⚖️'},
    car_rental:{label:'Noleggio auto',icon:'🚗'},
    car_repair:{label:'Meccanica',icon:'🔧'},
    car_wash:{label:'Lavaggio auto',icon:'🚗'},
    locksmith:{label:'Serrature',icon:'🔐'},
    plumber:{label:'Idraulica',icon:'🔨'},
    electrician:{label:'Elettricità',icon:'⚡'},
    business_center:{label:'Business center',icon:'💼'},
    internet_cafe:{label:'Internet cafe',icon:'☕'},
    laundry:{label:'Lavanderie',icon:'👔'},
    dry_cleaner:{label:'Tintorie',icon:'👔'},
    experience:{label:'Esperienze',icon:'✨'},
    onsen:{label:'Onsen',icon:'♨️'},
    bath:{label:'Bagni',icon:'🛁'},
    entertainment:{label:'Intrattenimento',icon:'🎭'},
    theatre:{label:'Teatri',icon:'🎭'},
    movie_theater:{label:'Cinema',icon:'🎬'},
    sports:{label:'Sport',icon:'⚽'},
    school:{label:'Scuole',icon:'🎓'},
    transport:{label:'Trasporti',icon:'🚆'},
    station:{label:'Stazioni',icon:'🚉'},
    train_station:{label:'Stazioni treni',icon:'🚂'},
    bus_station:{label:'Stazioni bus',icon:'🚌'},
    airport:{label:'Aeroporti',icon:'✈️'},
    parking:{label:'Parcheggi',icon:'🅿️'},
    taxi_stand:{label:'Taxi',icon:'🚕'},
    bike_rental:{label:'Bike sharing',icon:'🚲'},
    gas_station:{label:'Stazioni benzina',icon:'⛽'},
    neighborhood:{label:'Quartieri',icon:'🏘️'},
    viewpoint:{label:'Viste',icon:'🔭'},
    establishment:{label:'Strutture',icon:'🏢'},
    place_of_worship:{label:'Luoghi di culto',icon:'⛩️'}
  };
  window.CATS = CATS; // esposto per le views estratte (vedi js/views/)
  const CITIES = ['Sapporo','Nikko','Tokyo','Kamakura','Shirakawa-go','Kyoto','Osaka','Tottori','Beppu','Okinawa','Hiroshima','Nara','Hakone','Kanazawa','Nagasaki','Fukuoka','Matsuyama','Naoshima','Yakushima','Takayama','Kumamoto','Kagoshima','Sendai','Aomori','Toyama','Tokushima','Yamaguchi','Shimane','Ise','Gifu','Nagano','Fuji','Izu','Nagoya','Takamatsu','Kobe','Yokohama'];
  const CITY_COORDS = {
    Sapporo:[43.06,141.35],Nikko:[36.75,139.60],Tokyo:[35.68,139.76],
    Kamakura:[35.32,139.55],'Shirakawa-go':[36.26,136.91],Kyoto:[35.01,135.77],
    Osaka:[34.68,135.50],Tottori:[35.50,134.23],Beppu:[33.30,131.50],Okinawa:[26.20,127.69],
    Hiroshima:[34.39,132.45],Nara:[34.68,135.83],Hakone:[35.23,139.03],
    Kanazawa:[36.56,136.66],Nagasaki:[32.74,129.87],Fukuoka:[33.59,130.40],
    Matsuyama:[33.84,132.77],Naoshima:[34.46,133.99],Yakushima:[30.33,130.55],Takayama:[36.14,137.25],
    Kumamoto:[32.80,130.71],Kagoshima:[31.59,130.56],Sendai:[38.27,140.87],Aomori:[40.82,140.75],
    Toyama:[36.70,137.21],Tokushima:[34.07,134.55],Yamaguchi:[34.18,131.47],Shimane:[35.47,133.05],
    Ise:[34.49,136.71],Gifu:[35.42,136.76],Nagano:[36.65,138.19],Fuji:[35.36,138.73],
    Izu:[34.97,138.95],Nagoya:[35.18,136.91],Takamatsu:[34.34,134.04],
    Kobe:[34.69,135.19],Yokohama:[35.45,139.64],Akita:[39.72,140.10]
  };
  window.CITY_COORDS = CITY_COORDS; // esposto per js/views/
  // ---- State (persisted) ----
  const STATE_KEY = 'giappone2027_state_v1';

  function _loadPersistedState() {
    try {
      const raw = JSON.parse(localStorage.getItem(STATE_KEY) || '{}');
      // Guard every field that must be a specific type — corrupt values revert to defaults.
      const arrays = ['savedPOIs','itinerary','customEvents','customPOIs','gpsTraces'];
      const objects = ['notes','gfReports','userCategoryOverrides','itinerarySharing','groupItineraries','itineraryByDay'];
      arrays.forEach(k => { if (raw[k] !== undefined && !Array.isArray(raw[k])) { console.warn('[State] Corrupt field reset:', k); delete raw[k]; } });
      objects.forEach(k => { if (raw[k] !== undefined && (typeof raw[k] !== 'object' || Array.isArray(raw[k]) || raw[k] === null)) { console.warn('[State] Corrupt field reset:', k); delete raw[k]; } });
      if (raw.group !== undefined && (typeof raw.group !== 'object' || Array.isArray(raw.group) || raw.group === null)) { console.warn('[State] Corrupt group reset'); delete raw.group; }
      return raw;
    } catch(e) {
      console.error('[State] Parse error — starting fresh:', e);
      return {};
    }
  }

  const state = Object.assign({
    activeCat:'all', onlyGF:false, onlyLocal:false, showGFPlaces:false, savedPOIs:[], notes:{}, customEvents:[], customPOIs:[], gfReports:{}, dismissInstall:false,
    itinerary:[], // Collaborative itinerary shared across group members
    userCategoryOverrides:{}, // {poiId: 'newCategory'}
    group:{ name:'Giappone 2027', members:[], myAvatar:null, myName:'', createdBy:null, createdByName:null, isCreator:false },
    // NEW: Itinerary sharing & sync metadata
    itinerarySharing:{}, // {itineraryId: {owner, sharedWith: [{groupId, sharedAt, sharedBy}]}}
    groupItineraries:{}, // {groupId: {id, owner, originItineraryId, pois[], syncStatus, vectorClock}}
    // TEMPORARY: Default GPS for testing (Tokyo center)
    gpsCurrentLat: 35.6762,
    gpsCurrentLng: 139.6503
  }, _loadPersistedState());
  window.state = state;
  window.saveState = saveState;
  console.log('[State] Init', { group: state.group });

  // ========== DEBUG PANEL: Mostra log visibili sul telefono ==========
  const debugLogs = [];
  const origLog = console.log;
  const origError = console.error;
  const origWarn = console.warn;
  let _debugUpdatePending = false;

  function addDebugLog(msg, type = 'log') {
    if (debugLogs.length > 20) debugLogs.shift();
    debugLogs.push({ msg, type, time: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) });
    // Debounce updateDebugPanel to prevent excessive DOM updates
    if (!_debugUpdatePending) {
      _debugUpdatePending = true;
      requestAnimationFrame(() => {
        updateDebugPanel();
        _debugUpdatePending = false;
      });
    }
  }

  function updateDebugPanel() {
    const panel = document.getElementById('debug-panel');
    const contentEl = document.getElementById('debug-content');
    if (!panel || !contentEl) return;

    // Mostra se: errori, log Firebase/RTDB/Group, o GPS attivo
    const hasErrors = debugLogs.some(l => l.type === 'error');
    const hasRelevant = debugLogs.some(l =>
      l.msg.includes('[RTDB]') || l.msg.includes('[Group]') ||
      l.msg.includes('[FirebaseRTDB]') || l.msg.includes('[GPS]')
    );
    const gpsActive = window.state?.gpsEnabled || window.state?.group;
    panel.style.display = (hasErrors || hasRelevant || gpsActive) ? 'block' : 'none';

    contentEl.innerHTML = debugLogs
      .filter(l =>
        l.msg.includes('[RTDB]') || l.msg.includes('[Group]') ||
        l.msg.includes('[FirebaseRTDB]') || l.msg.includes('[GPS]') ||
        l.type === 'error'
      )
      .map(l => `<div style="color:${l.type==='error'?'#FF6B6B':'#00FF88'};margin:2px 0;word-break:break-all">[${l.time}] ${l.msg.substring(0, 150)}</div>`)
      .join('');
  }

  console.log = function(...args) { origLog(...args); addDebugLog(args.join(' ')); };
  console.error = function(...args) { origError(...args); addDebugLog(args.join(' '), 'error'); };
  console.warn = function(...args) { origWarn(...args); addDebugLog(args.join(' '), 'warn'); };

  function cleanupGPSTraces() {
    // Mantieni solo gli ultimi 500 punti GPS per evitare overflow localStorage
    if (state.gpsTraces && Array.isArray(state.gpsTraces)) {
      if (state.gpsTraces.length > 500) {
        const removed = state.gpsTraces.length - 500;
        state.gpsTraces = state.gpsTraces.slice(-500);
        console.log('[GPS] Cleaned up', removed, 'old GPS points. Remaining:', state.gpsTraces.length);
      }
    }
  }

  function _trimStateForQuota(s) {
    // Strip large base64 avatar blobs from group members — regenerated from initials on next load
    if (s.group?.members) {
      s.group.members = s.group.members.map(m => {
        if (m.avatar?.startsWith('data:')) return { ...m, avatar: null };
        return m;
      });
    }
    if (s.group?.myAvatar?.startsWith('data:')) s.group.myAvatar = null;
    // Reduce GPS trace further
    if (s.gpsTraces?.length > 100) s.gpsTraces = s.gpsTraces.slice(-100);
  }

  function saveState(){
    try{
      cleanupGPSTraces();

      let serialized = JSON.stringify(state);
      if (serialized.length > 4_500_000) {
        console.warn('[Giappone2027] localStorage quota warning: ' + Math.round(serialized.length/1024) + 'KB — trimming large fields');
        const trimmed = JSON.parse(serialized);
        _trimStateForQuota(trimmed);
        serialized = JSON.stringify(trimmed);
        // Apply trim back to live state too
        _trimStateForQuota(state);
        toast(T('toast.storageWarning', '⚠️ Dati quasi al limite (4.3MB). Cancella la traccia GPS se necessario.'));
      }
      localStorage.setItem(STATE_KEY, serialized);
    }catch(e){
      console.error('[State] Save error:', e);
      toast(T('toast.storageFull', '⚠️ Impossibile salvare: storage pieno.'));
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // ITINERARY SHARING & AUDIT TRAIL HELPERS — Phase 1
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Add audit entry to a tappa in the itinerary
   * @param {object} tappa - The tappa object to modify
   * @param {string} action - 'added', 'removed', 'reordered', 'note_updated', etc.
   * @param {string} memberName - Who performed the action
   * @param {object} extra - Optional extra data (e.g., note content, new position)
   */
  function addTappaAuditEntry(tappa, action, memberName, extra = {}) { window.addTappaAuditEntry?.(tappa, action, memberName, extra); }
  function getSharedGroups(itineraryId) { return window.getSharedGroups?.(itineraryId) ?? []; }
  function isItinerarySharedWithGroup(itineraryId, groupId) { return window.isItinerarySharedWithGroup?.(itineraryId, groupId) ?? false; }
  function markItinerarySharedWithGroup(itineraryId, groupId) { window.markItinerarySharedWithGroup?.(itineraryId, groupId); }
  function unmarkItinerarySharedWithGroup(itineraryId, groupId) { window.unmarkItinerarySharedWithGroup?.(itineraryId, groupId); }
  function formatAuditLog(tappa) { return window.formatAuditLog?.(tappa) ?? []; }
  function getTimeAgo(timestamp) { return window.getTimeAgo?.(timestamp) ?? ''; }
  function getLastModifiedInfo(tappa) { return window.getLastModifiedInfo?.(tappa) ?? null; }
  function syncPersonalToSharedGroups() { window.syncPersonalToSharedGroups?.(); }
  function syncGroupToPersonal(originItineraryId, groupId) { window.syncGroupToPersonal?.(originItineraryId, groupId); }

  // ── Genera un codice stanza univoco (6 char, nessun carattere ambiguo) ────
  function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  }
  // ---- Merge custom events with Google Places POIs ----
  function allPOIs(){
    // Source: Google Places (loaded via API)
    const googlePOIs = window.GOOGLE_PLACES_POIS || [];
    // Add user custom events
    const custom = (state.customEvents || []).map(e => Object.assign({}, e, {custom:true}));
    const allItems = googlePOIs.concat(custom);

    // Apply user category overrides if any
    if (state.userCategoryOverrides) {
      return allItems.map(p => {
        if (state.userCategoryOverrides[p.id]) {
          return Object.assign({}, p, {cat: state.userCategoryOverrides[p.id]});
        }
        return p;
      });
    }
    return allItems;
  }
  // Rendi globale per accesso da altri script
  window.allPOIs = allPOIs;
  // filtered() moved to js/map-markers.js (window.filtered)
  // ---- Collaborative Itinerary Helpers ----
  function addToItinerary(entry) {
    // entry: { id, name, city, type?, lat?, lng?, date? }
    console.log('[addToItinerary] CALLED with entry:', entry);
    if (!state.itinerary) state.itinerary = [];
    const exists = state.itinerary.find(e => e.id === entry.id);
    console.log('[addToItinerary] Entry exists?', exists, '| Current itinerary length:', state.itinerary.length);
    if (exists) {
      console.log('[addToItinerary] Already in itinerary, returning false');
      return false; // Already in itinerary
    }
    state.itinerary.push(entry);
    // NEW: Add audit trail entry
    const newEntry = state.itinerary[state.itinerary.length - 1];
    addTappaAuditEntry(newEntry, 'added', state.group?.myName || 'Unknown');
    console.log('[addToItinerary] ✓ ADDED to state.itinerary. New length:', state.itinerary.length);
    saveState();
    // ✅ Sincronizza con il gruppo via WebRTC
    if (peerGPS && peerGPS.broadcastItinerary) {
      peerGPS.broadcastItinerary();
    }
    return true;
  }
  function removeFromItinerary(id) {
    if (!state.itinerary) state.itinerary = [];
    const idx = state.itinerary.findIndex(e => e.id === id);
    if (idx === -1) return false;
    // NEW: Log removal in audit before removing
    const removedEntry = state.itinerary[idx];
    addTappaAuditEntry(removedEntry, 'removed', state.group?.myName || 'Unknown');
    state.itinerary.splice(idx, 1);
    saveState();
    // ✅ Sincronizza con il gruppo via WebRTC
    if (peerGPS && peerGPS.broadcastItinerary) {
      peerGPS.broadcastItinerary();
    }
    return true;
  }
  function updateItinerary(entries) {
    // Replace entire itinerary (used when receiving sync from peer)
    state.itinerary = entries || [];
    saveState();
  }
  function isInItinerary(id) {
    if (!state.itinerary) return false;
    return state.itinerary.some(e => e.id === id);
  }

  async function deletePersonalItinerary() { return window.deletePersonalItinerary?.() ?? false; }
  function requestUnshare(itineraryId, groupId) { window.requestUnshare?.(itineraryId, groupId); }
  function acceptUnshareRequest(groupId, requestedBy) { window.acceptUnshareRequest?.(groupId, requestedBy); }

  // ═════════════════════════════════════════════════════════════════
  function mergePOIFields(localField, remoteField) { return window.mergePOIFields?.(localField, remoteField) ?? remoteField ?? localField; }
  function mergeGroupItinerary(localItinerary, remoteItinerary) { return window.mergeGroupItinerary?.(localItinerary, remoteItinerary) ?? remoteItinerary ?? localItinerary; }
  function pushUndoState(action, itineraryId, poiId, changeSet) { window.pushUndoState?.(action, itineraryId, poiId, changeSet); }
  function undo() { return window.undo?.() ?? false; }
  function redo() { return window.redo?.() ?? false; }


  // ═════════════════════════════════════════════════════════════════
  // ===== PHASE 3: UI COMPONENTS =====
  // ═════════════════════════════════════════════════════════════════

  /**
   * Deep clone itinerary, removing undefined values for serialization safety
   */
  function cloneItinerary(itinerary) {
    if (!itinerary) return itinerary;
    return JSON.parse(JSON.stringify(itinerary, (key, value) => {
      return value === undefined ? null : value;
    }));
  }
  window.cloneItinerary = cloneItinerary;

  /**
   * Show modal to select which group to add POI to
   * Called when user clicks "Aggiungi" from a POI card
   */
  function showGroupSelectionModal(poi) { window.showGroupSelectionModal?.(poi); }
  function addPOIToGroupItinerary(poi, roomId, itineraryId) { window.addPOIToGroupItinerary?.(poi, roomId, itineraryId); }
  function removePOIFromGroupItinerary(itineraryId, googlePlaceId) { window.removePOIFromGroupItinerary?.(itineraryId, googlePlaceId); }
  function updatePOIFieldInGroupItinerary(itineraryId, googlePlaceId, fieldName, newValue) { window.updatePOIFieldInGroupItinerary?.(itineraryId, googlePlaceId, fieldName, newValue); }
  function computeItineraryDelta(itineraryId) { return window.computeItineraryDelta?.(itineraryId) ?? null; }
  function queueSyncMessage(message) { window.queueSyncMessage?.(message); }
  function replayOfflineQueue() { window.replayOfflineQueue?.(); }
  function batchItinerarySync(itineraryId) { window.batchItinerarySync?.(itineraryId); }
  function flushBatchSync(itineraryId) { window.flushBatchSync?.(itineraryId); }
  function notifyItineraryChange(itineraryId, action, poiId, actor) { window.notifyItineraryChange?.(itineraryId, action, poiId, actor); }
  function getAverageSyncLatency() { return window.getAverageSyncLatency?.() ?? 0; }
  function getSyncMetrics() { return window.getSyncMetrics?.() ?? {}; }

  // ═════════════════════════════════════════════════════════════════
  function softDeletePOI(itineraryId, googlePlaceId) { window.softDeletePOI?.(itineraryId, googlePlaceId); }
  function cleanupSoftDeletedPOIs(itineraryId) { return window.cleanupSoftDeletedPOIs?.(itineraryId) ?? 0; }
  function getItineraryVersionHistory(itineraryId) { return window.getItineraryVersionHistory?.(itineraryId) ?? []; }
  function getPOIFieldHistory(itineraryId, googlePlaceId) { return window.getPOIFieldHistory?.(itineraryId, googlePlaceId) ?? {}; }
  function describeAction(action, poiId) { return window.describeAction?.(action, poiId) ?? '❓'; }
  function getMergeConflictInfo(itineraryId) { return window.getMergeConflictInfo?.(itineraryId) ?? null; }
  function recordMergeConflict(itineraryId, conflicts) { window.recordMergeConflict?.(itineraryId, conflicts); }





  function computeItineraryHash(itinerary) { return window.computeItineraryHash?.(itinerary) ?? ''; }
  function simpleHash(str) { return window.simpleHash?.(str) ?? ''; }
  function broadcastItinerary(itineraryId) { window.broadcastItinerary?.(itineraryId); }


  // ─────────────────────────────────────────────────────────────────

  // ---- MAP (OpenLayers) ----
  const map = new ol.Map({
    target: 'map',
    layers: [
      new ol.layer.Tile({
        source: new ol.source.XYZ({
          url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
          attributions: '© Esri, HERE, Garmin, © OpenStreetMap contributors',
          maxZoom: 19
        })
      })
    ],
    view: new ol.View({
      center: ol.proj.fromLonLat([138.5, 36.2]),
      zoom: 10,
      minZoom: 2,
      maxZoom: 19
    })
  });
  const vectorSource = new ol.source.Vector();
  // Clustering: groups nearby markers at low zoom; distance in pixels
  const clusterSource = new ol.source.Cluster({ source: vectorSource, distance: 50, minDistance: 20 });
  // CAT_COLORS, CAT_EMOJI moved to js/poi-styles.js
  // Generatore dinamico di colori per categorie non mappate
  function getCategoryColor(cat) { return window.getCategoryColor?.(cat) ?? '#C85C3B'; }
  window.getCategoryColor = getCategoryColor; // esposto per js/views/poi-detail-view.js
  function getCategoryEmoji(cat) { return window.getCategoryEmoji?.(cat) ?? '📍'; }
  window.getCategoryEmoji = getCategoryEmoji; // esposto per js/views/poi-detail-view.js
  function makePoiStyle(cat, isGF) { return window.makePoiStyle?.(cat, isGF) ?? null; }
  // Cache styles per performance
  function _makeClusterStyle(count) { return window._makeClusterStyle?.(count) ?? null; }

  const vectorLayer = new ol.layer.Vector({
    source: clusterSource,
    style: (clusterFeature) => {
      const features = clusterFeature.get('features') || [];
      const count = features.length;

      // Cluster of multiple markers → show bubble
      if (count > 1) return window._makeClusterStyle(count);

      // Single feature (or no features yet)
      const feature = count === 1 ? features[0] : clusterFeature;
      if (!feature) return null;
      if (feature.get('hidden') === true) return null;

      const cat = feature.get('cat') || 'all';
      const isGF = feature.get('isGF') || false;
      return window.makePoiStyle(cat, isGF);
    }
  });
  function createFallbackStyle(cat) { return window.createFallbackStyle?.(cat) ?? null; }
  map.addLayer(vectorLayer);

  // Expose vectorSource and vectorLayer to window for filter-system.js
  window.vectorSource = vectorSource;
  window.vectorLayer = vectorLayer;

  // GPS marker layer — nessuno style di default: ogni feature porta il proprio (iniziali o avatar)
  const gpsSource = new ol.source.Vector();
  const gpsLayer = new ol.layer.Vector({
    source: gpsSource,
    zIndex: 999
  });
  map.addLayer(gpsLayer);
  window.gpsSource = gpsSource;
  // ---- Layer marker GPS remoti (altri membri del gruppo) ----
  const remotePeersSource = new ol.source.Vector();
  const remotePeersLayer = new ol.layer.Vector({
    source: remotePeersSource,
    zIndex: 998
  });
  map.addLayer(remotePeersLayer);
  window.remotePeersSource = remotePeersSource;

  // ===== GLUTEN-FREE PLACES LAYER =====
  const gfPlacesSource = new ol.source.Vector();
  const gfPlacesLayer = new ol.layer.Vector({
    source: gfPlacesSource,
    style: function(feature) {
      const safetyLevel = feature.get('safety_level') || 'YELLOW';
      let color = '#FFD700'; // Default yellow
      let icon = '🟡';

      if (safetyLevel === 'GREEN') {
        color = '#7FFF7F';
        icon = '🟢';
      } else if (safetyLevel === 'RED') {
        color = '#FF6B6B';
        icon = '🔴';
      }

      return new ol.style.Style({
        image: new ol.style.Circle({
          radius: 10,
          fill: new ol.style.Fill({ color: color }),
          stroke: new ol.style.Stroke({ color: '#ffffff', width: 2.5 })
        }),
        text: new ol.style.Text({
          text: icon,
          font: '14px Arial',
          offsetY: -12
        })
      });
    },
    zIndex: 500
  });
  map.addLayer(gfPlacesLayer);

  // Expose GF Places layer to window
  window.gfPlacesLayer = gfPlacesLayer;
  window.gfPlacesSource = gfPlacesSource;

  // ===== ROUTE LAYER: visualizza il giro di un giorno sulla mappa =====
  const routeSource = new ol.source.Vector();
  const routeLayer = new ol.layer.Vector({
    source: routeSource,
    zIndex: 400,
    style: (feature) => {
      const mode = feature.get('mode') || 'transit';
      const color = mode === 'walking' ? '#7FFF7F' : mode === 'driving' ? '#64c8ff' : 'rgba(255,122,69,0.6)';
      return new ol.style.Style({
        stroke: new ol.style.Stroke({
          color, width: 5,
          lineDash: mode === 'walking' ? [6, 6] : undefined
        })
      });
    }
  });
  map.addLayer(routeLayer);
  window.routeSource = routeSource;
  window.routeLayer = routeLayer;

  // Mostra il giro del giorno (polyline colorate per mezzo) e centra la mappa
  window.showDayRoute = function (dayIdx) {
    routeSource.clear();
    const day = window.state?.itineraryByDay?.[dayIdx] || [];
    if (day.length < 2) return false;
    window.ITINERARY?.computeDayRouting?.(dayIdx);
    const pois = (typeof window.allPOIs === 'function') ? window.allPOIs() : [];
    const coordOf = (e) => {
      if (typeof e.lat === 'number' && typeof e.lng === 'number') return [e.lng, e.lat];
      const p = pois.find(x => x.id === e.poi_id);
      return (p && typeof p.lat === 'number' && typeof p.lng === 'number') ? [p.lng, p.lat] : null;
    };
    for (let i = 1; i < day.length; i++) {
      const a = coordOf(day[i - 1]); const b = coordOf(day[i]);
      if (!a || !b) continue;
      const line = new ol.geom.LineString([ol.proj.fromLonLat(a), ol.proj.fromLonLat(b)]);
      const feat = new ol.Feature({ geometry: line });
      feat.set('mode', day[i].route_from_prev?.mode || 'transit');
      routeSource.addFeature(feat);
    }
    if (routeSource.getFeatures().length > 0) {
      try {
        map.getView().fit(routeSource.getExtent(), { padding: [120, 40, 120, 40], duration: 500, maxZoom: 14 });
      } catch (e) {}
      return true;
    }
    return false;
  };
  window.clearDayRoute = function () { routeSource.clear(); };

  // Function to refresh GF places on map
  window.refreshGFPlacesLayer = function() {
    if (!window.GFPlacesDB) return;

    const places = window.GFPlacesDB.getAll();
    const features = [];

    for (const place of places) {
      // Use saved coordinates or default to Tokyo if not geo-located
      let lng = 139.6917; // Tokyo default
      let lat = 35.6895;

      if (place.lng && place.lat) {
        lng = parseFloat(place.lng);
        lat = parseFloat(place.lat);
      }

      const feature = new ol.Feature({
        geometry: new ol.geom.Point(ol.proj.fromLonLat([lng, lat])),
        name: place.name,
        city: place.city,
        safety_level: place.safety_level || 'YELLOW',
        rating: place.rating,
        note: place.note,
        lat: lat,
        lng: lng
      });

      features.push(feature);
    }

    gfPlacesSource.clear();
    gfPlacesSource.addFeatures(features);

    console.log('[GFPlaces] Layer refreshed with', features.length, 'places');
  };

  // Expose map to window so other modules can access it
  window.map = map;
  console.log('[App] Map exposed to window.map');

  // ============================================================
  // PEER GPS — ora gestito da js/firebase-rtdb.js
  // PeerJS è stato sostituito con Firebase Realtime Database per
  // garantire connettività attraverso tutti i firewall.
  // peerGPS è definito in window.peerGPS da firebase-rtdb.js
  // ============================================================
  const peerGPS = window.peerGPS;
  // ---- Riconnessione automatica peerGPS al ritorno in primo piano ----
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && peerGPS.getStatus() !== 'disconnected') {
      const g = state.group;
      if (!g || !g.myName) return;
      peerGPS.reconnectIfNeeded(g.roomId || g.name, g.myName, (status, count) => {
        const box = document.getElementById('peer-status-box');
        if (box) {
          if (status === 'waiting')    box.innerHTML = '🟡 In attesa di altri...';
          else if (status === 'connected') box.innerHTML = `🟢 Connesso (${count} peer attivi)`;
          else if (status === 'disconnected') box.innerHTML = '⚫ Non connesso';
          else if (status === 'error')  box.innerHTML = `🔴 Errore: ${count}`;
        }
      });
    }
  });
  // buildGPSStyle, updateGPSMarker, updateMapMarkers extracted to js/gps-tracker.js
  // (window.gpsSource + window.remotePeersSource exposed above for gps-tracker.js)

  // Listen for map marker updates
  document.addEventListener('map_markers_updated', () => {
    console.log('[App] map_markers_updated event received');
    window.updateMapMarkers?.();
  });

  setTimeout(() => { map.updateSize(); }, 100);
  // Debounce utility
  function debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }

  // FAKE_POI_IDS, updateFakePOIList, filtered, renderMarkers extracted to js/map-markers.js

  // Aggiorna marker al cambio vista (debounced 250ms)
  const debouncedRender = debounce(() => window.renderMarkers?.(), 250);
  // SHOPPING_DB moved to js/views/shopping-layer.js (window.SHOPPING_DB)
  // Dedicated source/layer for shopping markers (not cleared by renderMarkers)
  const shoppingSource = new ol.source.Vector();
  const shoppingLayer = new ol.layer.Vector({
    source: shoppingSource,
    style: (feature) => new ol.style.Style({
      image: new ol.style.RegularShape({
        points: 4,
        radius: 9,
        angle: Math.PI / 4,
        fill: new ol.style.Fill({ color: '#7A4E8A' }),
        stroke: new ol.style.Stroke({ color: '#fff', width: 2 })
      })
    }),
    zIndex: 10,
    visible: !!state.showShoppingLayer
  });
  map.addLayer(shoppingLayer);
  window.shoppingSource = shoppingSource;
  window.shoppingLayer = shoppingLayer;
  // renderShoppingMarkers, toggleShoppingLayer, updateLayerToggle, flyToCity → js/views/shopping-layer.js
  function renderShoppingMarkers() { window.renderShoppingMarkers?.(); }
  function toggleShoppingLayer() { window.toggleShoppingLayer?.(); }
  function updateLayerToggle() { window.updateLayerToggle?.(); }
  function flyToCity(c) { window.flyToCity?.(c); }
  // ---- GPS TRACKING (integrato con Agenda) — estratto in js/gps-tracker.js ----
  window.gpsWatchId = null;
  function haversineKm(lat1,lng1,lat2,lng2){
    const R=6371, dLat=(lat2-lat1)*Math.PI/180, dLng=(lng2-lng1)*Math.PI/180;
    const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
    return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
  }
  function fmtDist(km){ return km<1 ? Math.round(km*1000)+'m' : km.toFixed(1)+'km'; }
  window.haversineKm = haversineKm;
  window.fmtDist = fmtDist;
  function startGPS(...args) { window.startGPS?.(...args); }
  function stopGPS() { window.stopGPS?.(); }
  function toggleGPS() { window.toggleGPS?.(); }
  function updateAgendaDistances() { window.updateAgendaDistances?.(); }
  function buildGPSPanelHTML(...args) { return window.buildGPSPanelHTML?.(...args) ?? ''; }
  function updateGPSStatusPanel() { window.updateGPSStatusPanel?.(); }
  if(state.gpsEnabled&&!window.gpsWatchId) window.startGPS?.();
  // Restore last known GPS position on map immediately
  if(state.gpsCurrentLat && state.gpsCurrentLng) window.updateGPSMarker?.(state.gpsCurrentLat, state.gpsCurrentLng);

  // Listener: Quando nuovi membri entrano nel gruppo, manda subito la posizione GPS attuale
  window.addEventListener('force-gps-broadcast', (e) => {
    console.log(`%c[GPS] 📍 force-gps-broadcast event RECEIVED`, 'background:#FF1493;color:white;padding:4px 8px;border-radius:3px;font-weight:bold');
    const delayMs = e.detail?.delayMs || 100;
    setTimeout(() => {
      console.log(`%c[GPS] 📍 force-gps-broadcast firing after ${delayMs}ms - checking conditions: gpsLat=${!!state.gpsCurrentLat}, gpsLng=${!!state.gpsCurrentLng}, peerStatus=${peerGPS.getStatus()}`, 'background:#FF1493;color:white;padding:4px 8px;border-radius:3px;font-size:11px');
      if (state.gpsCurrentLat && state.gpsCurrentLng && peerGPS.getStatus() !== 'disconnected') {
        const payload = {
          type: 'gps',
          lat: state.gpsCurrentLat,
          lng: state.gpsCurrentLng,
          name: state.group?.myName || '?',
          avatar: state.group?.myAvatar || null
        };
        console.log(`%c[GPS] 📍 BROADCAST FORZATO (nuovi membri): (${state.gpsCurrentLat.toFixed(4)}, ${state.gpsCurrentLng.toFixed(4)})`, 'background:#FF1493;color:white;padding:4px 8px;border-radius:3px');
        window.rtdbBroadcast(payload);
      } else {
        console.log(`%c[GPS] ⚠️ force-gps-broadcast SKIPPED - conditions not met`, 'background:#FF6B6B;color:white;padding:4px 8px;border-radius:3px;font-size:11px');
      }
    }, delayMs);
  });
  console.log('[App] force-gps-broadcast listener registered');
  // Click handler
  // Aggiorna marker su pan/zoom (debounced)
  map.on('moveend', () => {
    debouncedRender();
    // REMOVED: loadChunkData() call
  });

  map.on('click', (e) => {
    console.log('%c[MAP CLICK]', 'background: #1A3C5E; color: white; padding: 4px 8px; border-radius: 3px; font-weight: bold');
    let handled = false;
    let featuresFound = 0;
    map.forEachFeatureAtPixel(e.pixel, (clusterFeature, layer) => {
      featuresFound++;
      if (handled) return;

      // Unwrap cluster features
      const clusterMembers = clusterFeature.get('features');
      let feature;
      if (clusterMembers && clusterMembers.length > 1) {
        // Zoom into cluster
        const extent = ol.extent.createEmpty();
        clusterMembers.forEach(f => ol.extent.extend(extent, f.getGeometry().getExtent()));
        map.getView().fit(extent, { padding: [80, 80, 80, 80], duration: 400, maxZoom: 16 });
        handled = true;
        return;
      } else if (clusterMembers && clusterMembers.length === 1) {
        feature = clusterMembers[0];
      } else {
        feature = clusterFeature;
      }

      const id = feature.get('id');
      const type = feature.get('type');
      const peerName = feature.get('peerName');
      const name = feature.get('name');
      const safetyLevel = feature.get('safety_level');

      console.log(`%c[MAP CLICK] Feature ${featuresFound}:`, 'background:#FF9800;color:white;padding:4px 8px;border-radius:3px', { id, type, name, peerName });

      if (peerName) {
        console.log('[MAP CLICK] → Peer location');
        toast('Posizione rilevata ' + peerName);
        handled = true;
      } else if (safetyLevel) {
        console.log('[MAP CLICK] → Opening GF Place:', name, safetyLevel);
        const safetyIcon = safetyLevel === 'GREEN' ? '🟢' : safetyLevel === 'RED' ? '🔴' : '🟡';
        toast(`${safetyIcon} ${name} (${feature.get('city')})`);
        handled = true;
      } else if (type === 'shopping') {
        console.log('[MAP CLICK] → Opening shop:', id);
        window.__openShop(id);
        handled = true;
      } else if (id) {
        console.log('%c[MAP CLICK] → Opening POI:', 'background:#FF6B6B;color:white;padding:4px 8px;border-radius:3px', id, 'Type:', type);
        openPOI(id);
        handled = true;
      }
    });
    console.log('[MAP CLICK] Features found:', featuresFound, 'Handled:', handled);
  });
  // ---- Filter bar UI — renderFilters + listener → js/views/filter-bar.js ----
  function renderFilters() { window.renderFilters?.(); }
  // ---- Sheet — openSheet/closeSheet → js/sheet-manager.js ----
  // ============================================================================
  // PERFORMANCE UTILITIES - Debounce, Throttle, Lazy Loading
  // ============================================================================
  function debounce(fn, delay) {
    let timeoutId;
    return function(...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), delay);
    };
  }
  window.debounce = debounce; // esposto per js/views/

  function throttle(fn, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        fn(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
  window.throttle = throttle; // esposto per js/views/

  // Lazy load images with IntersectionObserver
  function setupLazyLoadImages() {
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
              observer.unobserve(img);
            }
          }
        });
      }, { rootMargin: '50px' });

      document.querySelectorAll('img[data-src]').forEach(img => imageObserver.observe(img));
    }
  }

  // Call lazy load setup periodically
  setInterval(setupLazyLoadImages, 2000);

  // openSheet/closeSheet are set by sheet-manager.js (loaded before DOMContentLoaded)
  function openSheet(title, html) { window.openSheet?.(title, html); }
  function closeSheet() { window.closeSheet?.(); }

  // Initialize weather widget as visible on page load
  const initWeatherWidget = document.getElementById('weather-floating');
  if (initWeatherWidget) {
    initWeatherWidget.classList.add('show');
    console.log('[Init] ✅ Weather widget initialized as visible');
  }

  // Track active tab to avoid resetting it when opening POI details (GLOBAL per y2k-windows.js)
  window.activeTabView = 'map';

  const bottomNav = document.querySelector('nav.bottom');
  if (bottomNav) {
    bottomNav.addEventListener('click', e => {
      const btn = e.target.closest('button[data-view]');
      if (!btn) return;
      bottomNav.querySelectorAll('button').forEach(b => b.classList.toggle('active', b === btn));
      const view = btn.dataset.view;
      window.activeTabView = view; // Traccia quale tab è attivo (GLOBAL per y2k-windows.js)
      console.log('[BottomNav] Clicked view:', view);

      // Hide weather widget when opening any tab
      const weatherWidget = document.getElementById('weather-floating');
      if (weatherWidget && view !== 'map') {
        weatherWidget.classList.remove('show');
        console.log('[BottomNav] Removed .show from weather widget (non-map tab)');
      }

      if (view === 'map') {
        console.log('[BottomNav] Map tab clicked, showing weather widget');
        // Show weather widget when returning to map
        if (weatherWidget) {
          weatherWidget.classList.add('show');
          console.log('[BottomNav] ✅ Added .show to weather widget');
        } else {
          console.error('[BottomNav] ❌ Weather widget element not found!');
        }
        closeSheet();
        // Center map on user's GPS location if active, otherwise on last known position
        setTimeout(() => {
          if (state.gpsCurrentLat && state.gpsCurrentLng) {
            map.getView().animate({
              center: ol.proj.fromLonLat([state.gpsCurrentLng, state.gpsCurrentLat]),
              zoom: 14,
              duration: 500
            });
            console.log('[Map] Centered on current GPS:', state.gpsCurrentLat, state.gpsCurrentLng);
          } else if (state.group?.lastKnownLat && state.group?.lastKnownLng) {
            map.getView().animate({
              center: ol.proj.fromLonLat([state.group.lastKnownLng, state.group.lastKnownLat]),
              zoom: 12,
              duration: 500
            });
            console.log('[Map] Centered on last known position:', state.group.lastKnownLat, state.group.lastKnownLng);
          }
          map.updateSize();
        }, 100);
        return;
      }
      if (view === 'itinerary') { renderItineraryUnified(); return; }
      if (view === 'gf') { renderGFView(); return; }
      if (view === 'menu') { showMenuDrawer(); return; }

      // Fallback for views accessed from menu drawer
      if (view === 'list') { renderItineraryUnified(); return; }
      if (view === 'weather') { renderWeatherView(); return; }
      if (view === 'bookings') { window.loadScript('./js/views/bookings-view.js').then(() => window.renderBookingsView?.()); return; }
      if (view === 'shopping') { renderShoppingView(); return; }
      if (view === 'group') { renderGroupView(); return; }
      if (view === 'budget') { renderBudgetView(); return; }
      if (view === 'gallery') { window.renderGalleryView?.(); return; }
      if (view === 'sos') { window.loadScript('./js/views/sos-view.js').then(() => window.renderSOSPanel?.()); return; }
      if (view === 'tips') { window.loadScript('./js/views/tips-view.js').then(() => window.renderTipsView?.()); return; }
      if (view === 'groq-menu') { window.openGroqPanel(); return; }
      if (view === 'gf-places') { window.openGFPlacesPanel(); return; }
      if (view === 'gf-suggest') { window.openGFSuggestionPanel(); return; }
      if (view === 'reminders') { window.loadScript('./js/itinerary-reminders.js').then(() => window.openItineraryReminders?.()); return; }
      if (view === 'jr-pass') { window.loadScript('./js/jr-pass-calculator.js').then(() => window.openJRPassPanel?.()); return; }
      if (view === 'japan-cal') { window.JapanCalendarHints?.openPanel?.(); return; }
    });
  }

  // Refresh POIs button handler
  const refreshBtn = document.getElementById('refresh-pois-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      refreshBtn.style.opacity = '0.5';
      refreshBtn.style.cursor = 'wait';

      try {
        const view = map.getView();
        const center = ol.proj.transform(view.getCenter(), 'EPSG:3857', 'EPSG:4326');
        const lat = center[1];
        const lng = center[0];

        console.log(`[App] Manual refresh clicked - reloading POIs from ${lat.toFixed(4)}, ${lng.toFixed(4)}`);

        // Force reload by clearing cache and reloading
        if (window.GooglePlacesLoader?.reloadArea) {
          await window.GooglePlacesLoader.reloadArea(lat, lng);
          console.log('[App] POI reload complete');
        } else {
          console.warn('[App] GooglePlacesLoader not available');
        }
      } catch (err) {
        console.error('[App] Refresh error:', err);
      } finally {
        refreshBtn.style.opacity = '1';
        refreshBtn.style.cursor = 'pointer';
      }
    });
  }

  // POI detail cluster extracted to js/views/poi-detail-view.js (2026-06-03)
  // gfTag, renderEnhancedPoiSections, poiDetailHTML, loadPOIPhotos, openPOI
  function gfTag(gf) { return window.gfTag?.(gf) ?? ''; }
  function renderEnhancedPoiSections(p) { return window.renderEnhancedPoiSections?.(p) ?? ''; }
  function poiDetailHTML(p) { return window.poiDetailHTML?.(p) ?? ''; }
  function loadPOIPhotos(p) { window.loadPOIPhotos?.(p); }
  function openPOI(id) { window.openPOI?.(id); }
  // window.renderMarkers set by js/map-markers.js
  // analyzeGlutenFreeStatus exposed by gf-analysis.js
  // ---- Calendar (.ics) ----
  // Calendar/export cluster extracted to js/itinerary-export.js (2026-06-03)
  function buildICS(events) { return window.buildICS?.(events) ?? ''; }
  function downloadICS(f,c) { window.downloadICS?.(f,c); }
  function exportItineraryJSON() { window.exportItineraryJSON?.(); }
  function exportItineraryPDF() { window.exportItineraryPDF?.(); }
  function exportItineraryWhatsApp() { window.exportItineraryWhatsApp?.(); }
  function promptAddToCalendar(p) { window.promptAddToCalendar?.(p); }
  function shareItineraryInGroup() { window.shareItineraryInGroup?.(); }

  // Extracted to js/views/list-view.js (2026-06-03).
  // searchGooglePlaces, addGooglePlaceToItinerary, showGooglePlacesResults,
  // showAddItineraryDialog, renderListView are exposed via window.* from that module.
  function renderListView() { window.renderListView?.(); }
  function searchGooglePlaces(q, cb) { window.searchGooglePlaces?.(q, cb); }
  function addGooglePlaceToItinerary(p) { window.addGooglePlaceToItinerary?.(p); }
  function showGooglePlacesResults(r) { window.showGooglePlacesResults?.(r); }
  function showAddItineraryDialog(p, cb) { window.showAddItineraryDialog?.(p, cb); }
  // ---- Itinerary / Agenda view ----
  // renderItineraryView rimossa il 2026-06-02: dispatcher usa renderItineraryUnified (riga 5058).
  // Salvate in git: state.itinerary / savedPOIs / customEvents — vedi STATO_APP.md §8.4.
  function renderItineraryView() { renderItineraryUnified(); }
  // ---- Tips view ----
  // Estratta il 2026-05-26 in js/views/tips-view.js (vedi STATO_APP.md §8.5).
  // Esposta come window.renderTipsView (scaffolding-ready, non collegata al menu).

  /* ═══════════════════════════════════════════════════════════════
     EVENT DELEGATION — Handle dynamic notes button
  ═══════════════════════════════════════════════════════════════ */
  document.addEventListener('click', (e) => {
    if (e.target.id && e.target.id.startsWith('add-note-btn-')) {
      const poiId = e.target.id.replace('add-note-btn-', '');
      const notesSection = document.getElementById(`notes-section-${poiId}`);
      if (notesSection) {
        // Replace button with textarea
        notesSection.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <label style="font-size:12px;color:rgba(255,255,255,0.6);font-weight:600;letter-spacing:0.3px">📝 Note</label>
          </div>
          <textarea id="poi-note" placeholder="Es: Prenotare con 2 giorni di anticipo..." style="
            width:100%;padding:12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);
            border-radius:10px;font-size:13px;color:#fff;resize:vertical;min-height:70px;font-family:inherit;
            box-sizing:border-box;transition:border-color 0.2s;
          " onmouseover="this.style.borderColor='rgba(255,255,255,0.2)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.1)'"></textarea>
        `;
        // Focus textarea
        setTimeout(() => {
          const textarea = notesSection.querySelector('textarea');
          if (textarea) textarea.focus();
        }, 0);
      }
    }
  });

  /* ═══════════════════════════════════════════════════════════════
     WEATHER VIEW — estratto in js/views/weather-view.js (2026-06-03).
     fetchWeatherData/Hourly, getWeatherIcon/Color/Condition,
     updateGpsWeatherWidget, renderWeatherModal, initGpsWeatherWidget
     sono tutti esposti da weather-view.js.
  ═══════════════════════════════════════════════════════════════ */

  // buildAndShowWeatherModal + openWeatherModal extracted to js/views/weather-view.js (2026-06-03).
  // window.openWeatherModal is set by weather-view.js.

  // renderWeatherView estratto in js/views/weather-view.js
  // Esposto come window.renderWeatherView (vedi riga ~11015 e weather-view.js).

  /* ═══════════════════════════════════════════════════════════════
     BUDGET & CURRENCY — estratto il 2026-06-02 in js/views/budget-view.js
     Stub locale: delega a window.renderBudgetView (esposto da budget-view.js).
  ═══════════════════════════════════════════════════════════════ */

  // Shim locale per i chiamanti interni che usano renderBudgetView() diretto.
  function renderBudgetView() { window.renderBudgetView?.(); }

  // Gallery view estratta il 2026-05-29 in js/views/gallery-view.js (refactor §6.9).
  // Esposta come window.renderGalleryView / getGalleryDB / saveGalleryDB.

  // showMenuDrawer extracted to js/views/menu-drawer.js (2026-06-03).
  function showMenuDrawer() { window.showMenuDrawer?.(); }

  // renderGFView extracted to js/views/gf-view.js (2026-06-03).
  function renderGFView() { window.renderGFView?.(); }

  // renderBookingsView estratto il 2026-05-26 in js/views/bookings-view.js
  // (vedi STATO_APP.md §8.5). Esposto come window.renderBookingsView.

  function createAvatarDataUrl(name) {
    const initials = (name || '').trim().substring(0, 2).toUpperCase() || '?';
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1f51ff';
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials, 32, 34);
    return canvas.toDataURL('image/png');
  }
  window.createAvatarDataUrl = createAvatarDataUrl;
  // gfCache + loadGlutenFreeShopsForCity extracted to js/views/gf-view.js (2026-06-03).
  // window.loadGlutenFreeShopsForCity set by gf-view.js.
  // GF analysis extracted to js/gf-analysis.js (2026-06-03)
  async function analyzeGlutenFreeStatus(placeId, name, city) { return window.analyzeGlutenFreeStatus?.(placeId, name, city); }
  // Esposto come window.renderGroupView (overridden by group-view.js after load).
  function renderGroupView() { window.renderGroupView?.(); }
  window.renderGroupView = renderGroupView; // esposto per js/group-invite.js (deep link join)

  // GF Shops discovered from Google Places (shared via window.allGlutenFreeShops; written by gf-view.js)
  window.allGlutenFreeShops = window.allGlutenFreeShops || [];

  // GF_RESTAURANTS and FMGF_CITY_URLS moved to js/views/gf-restaurants.js

  // ═══════════════════════════════════════════════════════════════════
  // SOS EMERGENCY PANEL — Celiac Emergency Support
  // Estratto il 2026-05-26 in js/views/sos-view.js (vedi STATO_APP.md §8.5).
  // Le helper copyToClipboard / showMedicalCard / downloadMedicalCard /
  // openGoogleMaps sono ora esposte su window dal modulo estratto (bug
  // pre-esistente risolto: prima erano dichiarate ma non globali, gli
  // onclick HTML del pannello SOS non funzionavano).
  // ═══════════════════════════════════════════════════════════════════

  function renderGFList(...args) { return window.renderGFList?.(...args); }
  window.renderGFList = renderGFList; // esposto per js/views/gf-view.js

  function openGFDetail(...args) { return window.openGFDetail?.(...args); }

  // ========== GOOGLE PLACES INTEGRATION ==========
  // Store all POIs loaded from Google Places
  // FALLBACK TEST POIs for development (when Google Places API isn't working)
  window.GOOGLE_PLACES_POIS = [
    { id: 'test-tsukiji', name: 'Tsukiji Outer Market', city: 'Tokyo', lat: 35.6645, lng: 139.7713, cat: 'food', gf: { lvl: 'full' }, desc: 'Fresh seafood market' },
    { id: 'test-senso', name: 'Senso-ji Temple', city: 'Tokyo', lat: 35.7148, lng: 139.7967, cat: 'experience', desc: 'Historic Buddhist temple' },
    { id: 'test-shibuya', name: 'Shibuya Crossing', city: 'Tokyo', lat: 35.6595, lng: 139.7004, cat: 'experience', desc: 'Iconic pedestrian crossing' },
    { id: 'test-tokyo-tower', name: 'Tokyo Tower', city: 'Tokyo', lat: 35.6586, lng: 139.7454, cat: 'experience', desc: 'Historic observation tower' },
    { id: 'test-meiji', name: 'Meiji Shrine', city: 'Tokyo', lat: 35.6763, lng: 139.7003, cat: 'experience', desc: 'Shinto shrine in Shibuya' }
  ];

  // Listen for Google Places POI data loaded
  window.addEventListener('google-places-pois-loaded', (e) => {
    const newPois = e.detail.pois || [];
    console.log(`[App] Google Places loaded: ${newPois.length} POIs`);

    // Add new POIs (avoid duplicates by googlePlaceId)
    const existingIds = new Set(window.GOOGLE_PLACES_POIS.map(p => p.googlePlaceId));
    const uniqueNewPois = newPois.filter(p => {
      // Only add if we don't already have this googlePlaceId
      if (existingIds.has(p.googlePlaceId)) {
        console.log(`[App] Skipping duplicate: ${p.name} (${p.googlePlaceId})`);
        return false;
      }
      return true;
    });

    window.GOOGLE_PLACES_POIS.push(...uniqueNewPois);
    console.log(`[App] Added ${uniqueNewPois.length} new POIs | Total Google Places POIs: ${window.GOOGLE_PLACES_POIS.length}`);

    // Re-render map with updated POIs
    if (uniqueNewPois.length > 0) {
      console.log('[App] Rendering markers with new POIs');
      window.renderMarkers?.();
      try { renderFilters(); } catch (e) {} // aggiorna i chip alle categorie ora presenti
    } else {
      console.log('[App] No new POIs to add, skipping render');
    }
  });

  // Override allPOIs() to use Google Places as source
  const originalAllPOIs = window.allPOIs;
  window.allPOIs = function() {
    // Combine Google Places POIs with local/custom POIs
    const googlePOIs = window.GOOGLE_PLACES_POIS || [];
    // Add user custom events
    const custom = (state.customEvents || []).map(e => Object.assign({}, e, {custom:true}));

    // If we have Google Places data, combine with custom; otherwise use original dataset
    if (googlePOIs.length > 0) {
      return googlePOIs.concat(custom);
    }
    // Fallback to original dataset if Google Places not loaded
    return originalAllPOIs();
  };

  renderFilters();
  window.renderMarkers?.();

  // ═══════════════════════════════════════════════════════════════════
  // FLEXIBLE LAYOUT — Calculate header + filters height dynamically
  // ═══════════════════════════════════════════════════════════════════
  function updateMapPosition() {
    const header = document.querySelector('header');
    const filters = document.getElementById('filters');
    const map = document.getElementById('map');
    const navBottom = document.querySelector('nav.bottom');
    const weatherWidget = document.getElementById('weather-floating');

    if (header && filters && map && navBottom) {
      const headerHeight = header.offsetHeight;
      const filtersHeight = filters.offsetHeight;
      const navHeight = navBottom.offsetHeight;

      // Position filters right after header
      filters.style.setProperty('top', headerHeight + 'px', 'important');

      // Weather widget positioning is now handled by CSS (bottom-left fixed)
      // No JavaScript positioning needed

      const mapTop = headerHeight + filtersHeight;
      const mapHeight = window.innerHeight - mapTop - navHeight;

      document.documentElement.style.setProperty('--map-top', mapTop + 'px');
      document.documentElement.style.setProperty('--map-height', mapHeight + 'px');
    }
  }

  // Call on load and on window resize
  updateMapPosition();
  window.addEventListener('resize', updateMapPosition);
  window.addEventListener('orientationchange', updateMapPosition);

  // filter-bar.js calls updateMapPosition internally after each renderFilters

  // Export globali per group-panel e group-chat
  // startGPS/stopGPS → gps-tracker.js sets them; openSheet/closeSheet already set above
  window.toast = toast;

  // GF Groq panel, GFPlacesDB, GFSuggestionsDB, GroqMenuAnalyzer → js/gf-places-panel.js
  // ===== INITIAL GF PLACES LAYER LOAD =====
  // Load GF places on map when app initializes
  setTimeout(() => {
    if (window.refreshGFPlacesLayer) {
      window.refreshGFPlacesLayer();
      console.log('[App] GF Places layer initialized');
    }
  }, 1000);

  // Deep link, geocoding, GF suggestion panel, P2P hook → js/gf-places-panel.js

  // ===================== PHASE 2: POI Loading (Google Places via GooglePlacesLoader) =====================
  // POI loading now handled by google-places-loader.js
  // Listens to 'google-places-pois-loaded' event and populates GOOGLE_PLACES_POIS
  console.log('[Giappone2027] Google Places Loader initialized');

  // ===================== PHASE 6: Auto-enable GPS on load =====================
  console.log('[Giappone2027] Auto-enabling GPS on startup...');
  startGPS();

  // ===================== PHASE 7: Service Worker Registration =====================
  // Service Worker è RICHIESTO per beforeinstallprompt su molti browser
  console.log('[SW] 🔍 Registering Service Worker...');
  console.log('[SW] Protocol:', window.location.protocol);
  console.log('[SW] Host:', window.location.host);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => {
        console.log('[SW] ✅ Service Worker Registered successfully');
        console.log('[SW] Scope:', reg.scope);
        console.log('[SW] State:', reg.installing ? 'installing' : reg.waiting ? 'waiting' : reg.active ? 'active' : 'unknown');
        // Rileva nuova versione pronta → avvisa l'utente (niente reload a sorpresa)
        reg.addEventListener('updatefound', () => {
          const sw = reg.installing;
          if (!sw) return;
          sw.addEventListener('statechange', () => {
            if (sw.state === 'installed' && navigator.serviceWorker.controller) {
              if (window.toast) window.toast('🔄 Nuova versione disponibile — ricarica la pagina per aggiornare');
            }
          });
        });
      })
      .catch(err => {
        console.error('[SW] ❌ Service Worker Registration FAILED');
        console.error('[SW] Error:', err.message);
        console.warn('[SW] Installation prompt NON funzionerà senza SW');
      });
  } else {
    console.warn('[SW] ⚠️ Service Worker API non supportata');
  }

  // ===================== EXPOSE HELPERS TO GLOBAL SCOPE =====================
  window.addToItinerary = addToItinerary;
  window.removeFromItinerary = removeFromItinerary;
  window.updateItinerary = updateItinerary;
  window.isInItinerary = isInItinerary;
  window.renderItineraryView = renderItineraryView;
  window.renderWeatherView = renderWeatherView;
  window.renderGFView = renderGFView;
  window.peerGPS = peerGPS;
  // window.SHOPPING_DB set by js/views/shopping-layer.js
  // fetchWeatherData/Hourly, getWeatherIcon/Color/Condition exposed by weather-view.js
  window.generateRoomCode = generateRoomCode;
  // window.updateGPSMarker set by js/gps-tracker.js
  // Phase 2: P2P Sync exports (already added above)
  // window.computeItineraryHash, window.simpleHash, window.broadcastItinerary
  console.log('[Giappone2027] Itinerary helpers and peerGPS exposed to window');

})();

/* ============================================================
   INSTALL BUTTON HANDLERS — Works for all browsers
   ============================================================ */
console.log('[Install] Setting up button handlers...');

// ✅ OLD INSTALL BUTTON HANDLERS REMOVED
// UniversalInstaller class handles all install logic and creates the button in header
console.log('[Install] ✓ UniversalInstaller is the only install system');

}); // close DOMContentLoaded

// Re-render della vista attiva quando cambia la lingua (i18n)
document.addEventListener('langchange', () => {
  try {
    const active = document.querySelector('nav.bottom button.active');
    if (active && active.dataset.view && active.dataset.view !== 'map') active.click();
  } catch (e) {}
});
