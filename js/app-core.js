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
  // Raggio GPS dinamico basato su zoom level
  function getGpsRadiusKm(zoom) {
    if (zoom < 5) return 25;   // Molto zoomato out → largo raggio
    if (zoom < 8) return 15;
    if (zoom < 10) return 8;
    if (zoom < 12) return 5;
    if (zoom < 14) return 3;
    return 2;                   // Molto zoomato in → raggio stretto
  }
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
  // ---- Filter logic ----
  function filtered(){
    return allPOIs().filter(p => {
      if (state.activeCat !== 'all' && p.cat !== state.activeCat) return false;
      const foodCats = ['food','market'];
      if (state.onlyGF && foodCats.includes(p.cat) && !(p.gf && (p.gf.lvl === 'full' || p.gf.lvl === 'partial'))) return false;
      if (state.onlyLocal && !p.local) return false;
      
      // Advanced filters
      const minRating = state.minRating || 0;
      const rating = state.ratings?.[p.id] || 0;
      if (rating < minRating) return false;
      
      const maxBudget = state.maxBudget || 999999;
      if (p.ticket) {
        const match = p.ticket.match(/(\d+)/);
        if (match && parseInt(match[1], 10) > maxBudget) return false;
      }
      // Group accommodation filter
      const accomFilter = state.groupAccomFilter;
      if (accomFilter && accomFilter !== 'all') {
        const desc = (p.desc || '').toLowerCase();
        const name = (p.name || '').toLowerCase();
        const filterMap = {
          ryokan: ['ryokan', 'minshuku', 'tatami', 'inn'],
          apartment: ['apartment', 'appartamento', 'villa', 'airbnb'],
          guesthouse: ['guesthouse', 'guest house', 'hostel', 'pension']
        };
        const keywords = filterMap[accomFilter] || [];
        const matchesAccom = keywords.some(kw => desc.includes(kw) || name.includes(kw));
        // Only filter if the POI is an accommodation type; other types always pass
        const accomCats = ['experience', 'onsen'];
        if (accomCats.includes(p.cat) && !matchesAccom) return false;
      }
      
      return true;
    });
  }
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
  const CAT_COLORS = {
    // Culture & Heritage (blue-purple tones)
    shrine:'#E07B39', temple:'#B5541E', church:'#6B4C8A', mosque:'#8B5A9E',
    synagogue:'#7B6A9E', culture:'#4A7AB5', museum:'#5A8BC5', gallery:'#5A7BC5',
    library:'#3A5A95', landmark:'#7A8BA5', monument:'#6A7AB5', historical_landmark:'#5A7AB5',
    castle:'#8A5A3A', place_of_worship:'#5A6AB5',

    // Food & Dining (warm tones - browns, oranges, reds, yellows)
    food:'#D4A017', restaurant:'#D4702A', cafe:'#C5703A', bar:'#B5502A',
    bakery:'#D4903A', meal_delivery:'#D4702A', meal_takeaway:'#C5703A',
    drinking_bar:'#A5402A', market:'#E0923A',

    // Shopping & Commerce (reds, oranges, pinks)
    shopping:'#C85C3B', shop:'#D4703A', supermarket:'#D4703A', shopping_mall:'#C85C3B',
    department_store:'#B85C3B', clothing_store:'#D4703A', shoe_store:'#C85C3B',
    book_store:'#8B7A5A', electronics_store:'#6A5A8B', jewelry_store:'#D47A5C',
    furniture_store:'#7A6A5A', home_goods_store:'#8B7A5A', pharmacy:'#E4698A',
    convenience_store:'#C85C3B', florist:'#E4698A', toy_store:'#E4698A', vintage:'#A54A6B',

    // Accommodation & Lodging (browns, beiges)
    accommodation:'#8B6F47', hotel:'#7A5A3A', hostel:'#9A7A5A', guest_house:'#8B7A5A',
    campground:'#6A7A5A', apartment_building:'#7A6A5A',

    // Wellness & Health (purples, pinks, light reds)
    wellness:'#D4698A', spa:'#C5598A', gym:'#D4798A', yoga_studio:'#C5698A',
    health:'#D4698A', hospital:'#D54A7A', clinic:'#D54A7A', doctor:'#C5698A',
    dentist:'#D4598A', massage:'#D4698A', physiotherapist:'#C5598A',
    beauty_salon:'#D4698A', hair_care:'#E4698A',

    // Services & Business (grays, teals, blues)
    services:'#5A7A9E', bank:'#4A6A9E', atm:'#4A7AAE', post_office:'#3A5A8E',
    real_estate_agency:'#5A6A9E', travel_agency:'#4A7AAE', insurance_agency:'#3A6A9E',
    accounting:'#5A7A9E', attorney:'#4A6A9E', car_rental:'#4A7AAE',
    car_repair:'#5A6A5A', car_wash:'#4A8A9E', locksmith:'#4A6A8E',
    plumber:'#5A6A5A', electrician:'#7A8A9E', business_center:'#4A6A9E',
    internet_cafe:'#5A7A9E', laundry:'#5A6A5A', dry_cleaner:'#5A6A5A',

    // Nature & Outdoor (greens, teals, blues)
    nature:'#4A7C59', park:'#5A8C69', natural_feature:'#4A8C59', garden:'#6A9C79',
    zoo:'#5A8C69', aquarium:'#3A7A9E', botanical_garden:'#4A8C59',
    amusement_park:'#7A9C79', hiking_area:'#4A7C59', scenic_spot:'#3A9AB0',
    water:'#1E90FF',

    // Entertainment & Experience (varied, vivid)
    experience:'#7A9E3A', onsen:'#D4698A', bath:'#5A9E9E', entertainment:'#8A7A5A',
    theatre:'#6A5A8B', movie_theater:'#5A5A8B', sports:'#8A5A3A',

    // Education (blue-ish)
    school:'#4A7AB5',

    // Transport & Infrastructure (teals, dark blues)
    transport:'#3A7EA0', station:'#3A7EA0', train_station:'#3A7EA0',
    bus_station:'#3A7EA0', airport:'#2A6E90', parking:'#4A8EB0',
    taxi_stand:'#3A8EB0', bike_rental:'#4A9EB0', gas_station:'#4A7AAE',

    // Neighborhoods (warm-ish)
    neighborhood:'#5A8AA5',

    // Viewpoint
    viewpoint:'#3AA5A0',

    // Generic & Fallback
    poi:'#C85C3B', all:'#C85C3B', unclassified:'#8A8A8A', establishment:'#7A7A7A'
  };

  // Generatore dinamico di colori per categorie non mappate
  function getCategoryColor(cat) {
    if (CAT_COLORS[cat]) return CAT_COLORS[cat];
    // Generazione deterministica di colore basato sul nome
    let hash = 0;
    for (let i = 0; i < cat.length; i++) {
      hash = ((hash << 5) - hash) + cat.charCodeAt(i);
      hash = hash & hash;
    }
    const hue = Math.abs(hash) % 360;
    const colors = [
      '#E07B39', '#B5541E', '#4A7C59', '#D4A017', '#C85C3B',
      '#D4698A', '#5A7A9E', '#3A7EA0', '#7A9E3A', '#8B6F47'
    ];
    return colors[Math.abs(hash) % colors.length];
  }
  window.getCategoryColor = getCategoryColor; // esposto per js/views/poi-detail-view.js
  const CAT_EMOJI = {
    // Culture & Heritage
    all:'📍', poi:'📍', unclassified:'❓',
    shrine:'⛩️', temple:'🏯', church:'⛪', mosque:'🕌', synagogue:'🕍',
    culture:'🎨', museum:'🏛️', gallery:'🖼️', library:'📚', landmark:'📍',
    monument:'🗿', historical_landmark:'🏛️', castle:'🏰', place_of_worship:'⛩️',

    // Food & Dining
    food:'🍽️', restaurant:'🍜', cafe:'☕', bar:'🍷', bakery:'🥐',
    meal_delivery:'🛵', meal_takeaway:'📦', drinking_bar:'🍺', market:'🥢',

    // Shopping & Commerce
    shopping:'🛍️', shop:'🛒', supermarket:'🏪', shopping_mall:'🏬',
    department_store:'🏬', clothing_store:'👕', shoe_store:'👞',
    book_store:'📖', electronics_store:'⚡', jewelry_store:'💎',
    furniture_store:'🛋️', home_goods_store:'🏠', pharmacy:'💊',
    convenience_store:'🏪', florist:'🌸', toy_store:'🧸', vintage:'🧥',

    // Accommodation & Lodging
    accommodation:'🏩', hotel:'🏨', hostel:'🏠', guest_house:'🏡',
    campground:'⛺', apartment_building:'🏢',

    // Wellness & Health
    wellness:'🧘', spa:'💆', gym:'💪', yoga_studio:'🧘', health:'⚕️',
    hospital:'🏥', clinic:'🏥', doctor:'⚕️', dentist:'🦷',
    massage:'💆', physiotherapist:'🤕', beauty_salon:'💄', hair_care:'💇',

    // Services & Business
    services:'⚙️', bank:'🏦', atm:'💰', post_office:'📮',
    real_estate_agency:'🏠', travel_agency:'✈️', insurance_agency:'🛡️',
    accounting:'📊', attorney:'⚖️', car_rental:'🚗', car_repair:'🔧',
    car_wash:'🚗', locksmith:'🔐', plumber:'🔨', electrician:'⚡',
    business_center:'💼', internet_cafe:'☕', laundry:'👔', dry_cleaner:'👔',

    // Nature & Outdoor
    nature:'🌿', park:'🌳', natural_feature:'🌲', garden:'🌸',
    zoo:'🦁', aquarium:'🐠', botanical_garden:'🌺', amusement_park:'🎡',
    hiking_area:'⛰️', scenic_spot:'🔭', water:'💧',

    // Entertainment & Experience
    experience:'✨', onsen:'♨️', bath:'🛁', entertainment:'🎭',
    theatre:'🎭', movie_theater:'🎬', sports:'⚽',

    // Education
    school:'🎓',

    // Transport & Infrastructure
    transport:'🚆', station:'🚉', train_station:'🚂', bus_station:'🚌',
    airport:'✈️', parking:'🅿️', taxi_stand:'🚕', bike_rental:'🚲',
    gas_station:'⛽',

    // Neighborhoods & Viewpoint
    neighborhood:'🏘️', viewpoint:'🔭',

    // Generic fallback
    establishment:'🏢'
  };

  // Generatore dinamico di emoji per categorie non mappate
  function getCategoryEmoji(cat) {
    if (CAT_EMOJI[cat]) return CAT_EMOJI[cat];
    const emojiPool = ['📍', '🏢', '🌟', '✨', '⭐', '🎯', '📌', '🏷️', '🎪', '🎭'];
    let hash = 0;
    for (let i = 0; i < cat.length; i++) {
      hash = ((hash << 5) - hash) + cat.charCodeAt(i);
      hash = hash & hash;
    }
    return emojiPool[Math.abs(hash) % emojiPool.length];
  }
  window.getCategoryEmoji = getCategoryEmoji; // esposto per js/views/poi-detail-view.js
  function makePoiStyle(cat, isGF) {
    try {
      const color = getCategoryColor(cat);
      const emoji = getCategoryEmoji(cat);
      const canvas = document.createElement('canvas');
      canvas.width = 40; canvas.height = 48;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        console.error('[makePoiStyle] Failed to get canvas context');
        return null;
      }

      // Pin shape (cerchio + coda)
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(20, 18, 14, 0, Math.PI * 2);
      ctx.fill();

      // Pin stroke
      ctx.strokeStyle = isGF ? '#4A7C59' : '#ffffff';
      ctx.lineWidth = isGF ? 3 : 2;
      ctx.stroke();

      // Pin tail
      ctx.beginPath();
      ctx.moveTo(15, 28);
      ctx.lineTo(20, 45);
      ctx.lineTo(25, 28);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = isGF ? '#4A7C59' : '#ffffff';
      ctx.stroke();

      // Emoji (con fallback per font issues)
      try {
        ctx.font = 'bold 20px "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(emoji, 20, 18);
      } catch(e) {
        console.warn('[makePoiStyle] Emoji render failed for:', cat, e);
      }

      const style = new ol.style.Style({
        image: new ol.style.Icon({
          img: canvas,
          imgSize: [40, 48],
          anchor: [0.5, 1],
          scale: 1
        })
      });

      return style;
    } catch (err) {
      console.error('[makePoiStyle] Error creating style for cat=' + cat, err);
      return null;
    }
  }
  // Cache styles per performance
  const _styleCache = {};
  // Cluster bubble style — cached by count bucket + zoom level bucket
  const _clusterStyleCache = new Map();
  function _makeClusterStyle(count) {
    const bucket = count >= 100 ? 'L' : count >= 20 ? 'M' : 'S';
    if (_clusterStyleCache.has(bucket)) return _clusterStyleCache.get(bucket);
    const radius = bucket === 'L' ? 20 : bucket === 'M' ? 16 : 13;
    const color  = bucket === 'L' ? 'rgba(239,68,68,0.9)' : bucket === 'M' ? 'rgba(251,146,60,0.9)' : 'rgba(99,102,241,0.9)';
    const style = new ol.style.Style({
      image: new ol.style.Circle({
        radius,
        fill: new ol.style.Fill({ color }),
        stroke: new ol.style.Stroke({ color: '#fff', width: 2 })
      }),
      text: new ol.style.Text({
        text: count > 999 ? '999+' : String(count),
        fill: new ol.style.Fill({ color: '#fff' }),
        font: `bold ${bucket === 'S' ? 11 : 13}px -apple-system,sans-serif`
      })
    });
    _clusterStyleCache.set(bucket, style);
    return style;
  }

  const vectorLayer = new ol.layer.Vector({
    source: clusterSource,
    style: (clusterFeature) => {
      const features = clusterFeature.get('features') || [];
      const count = features.length;

      // Cluster of multiple markers → show bubble
      if (count > 1) return _makeClusterStyle(count);

      // Single feature (or no features yet)
      const feature = count === 1 ? features[0] : clusterFeature;
      if (!feature) return null;
      if (feature.get('hidden') === true) return null;

      const cat = feature.get('cat') || 'all';
      const isGF = feature.get('isGF') || false;
      const key = cat + (isGF ? '_gf' : '');

      if (!_styleCache[key]) {
        const style = makePoiStyle(cat, isGF);
        _styleCache[key] = style || createFallbackStyle(cat);
      }

      return _styleCache[key];
    }
  });

  // Fallback style if canvas-based style fails
  function createFallbackStyle(cat) {
    const color = CAT_COLORS[cat] || '#C85C3B';
    return new ol.style.Style({
      image: new ol.style.Circle({
        radius: 8,
        fill: new ol.style.Fill({ color: color }),
        stroke: new ol.style.Stroke({ color: '#ffffff', width: 2 })
      })
    });
  }
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
  // ---- Layer marker GPS remoti (altri membri del gruppo) ----
  const remotePeersSource = new ol.source.Vector();
  const remotePeersLayer = new ol.layer.Vector({
    source: remotePeersSource,
    zIndex: 998
  });
  map.addLayer(remotePeersLayer);

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
  // buildGPSStyle: restituisce SOLO stile iniziali (sincrono, sempre visibile).
  // updateGPSMarker gestisce direttamente il caso avatar con img.onload.
  function buildGPSStyle(avatarDataUrl, initials) {
    const canvas = document.createElement('canvas');
    canvas.width = 36; canvas.height = 36;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#2196F3';
    ctx.beginPath();
    ctx.arc(18, 18, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials || '?', 18, 18);
    return new ol.style.Style({
      image: new ol.style.Icon({ img: canvas, imgSize: [36, 36] })
    });
  }
  function updateGPSMarker(lat, lng) {
    gpsSource.clear();
    if (lat == null || lng == null) return;
    const feature = new ol.Feature({
      geometry: new ol.geom.Point(ol.proj.fromLonLat([lng, lat]))
    });
    const avatar = state.group?.myAvatar || null;
    const initials = state.group?.myName ? state.group.myName.substring(0, 2).toUpperCase() : '?';
    // Mostra subito le iniziali (blu = marker locale), poi sovrascrive con avatar se presente
    feature.setStyle(buildGPSStyle(null, initials));
    gpsSource.addFeature(feature);
    if (avatar) {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 36; canvas.height = 36;
        const ctx = canvas.getContext('2d');
        ctx.beginPath();
        ctx.arc(18, 18, 16, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, 2, 2, 32, 32);
        ctx.beginPath();
        ctx.arc(18, 18, 16, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();
        feature.setStyle(new ol.style.Style({
          image: new ol.style.Icon({ img: canvas, imgSize: [36, 36] })
        }));
      };
      img.onerror = () => {}; // mantieni iniziali
      img.src = avatar;
    }
  }

  // ============================================================
  // UPDATE REMOTE GPS MARKERS — Mostra marker degli altri utenti
  // ============================================================
  function updateMapMarkers() {
    const t0 = performance.now();
    remotePeersSource.clear();

    const remoteMarkers = window.state?.gpsRemoteMarkers || {};
    const count = Object.keys(remoteMarkers).length;
    console.log(`%c[updateMapMarkers] 📍 Updating ${count} remote markers`, 'background:#FF69B4;color:white;padding:4px 8px;border-radius:3px');

    for (const [name, marker] of Object.entries(remoteMarkers)) {
      if (!marker.lat || !marker.lng) continue;

      const feature = new ol.Feature({
        geometry: new ol.geom.Point(ol.proj.fromLonLat([marker.lng, marker.lat]))
      });

      // Use same style as local marker for consistency (with peer's initials)
      const initials = name ? name.substring(0, 2).toUpperCase() : '?';
      feature.setStyle(buildGPSStyle(null, initials));
      remotePeersSource.addFeature(feature);

      console.log(`  ✓ ${name}: (${marker.lat.toFixed(4)}, ${marker.lng.toFixed(4)})`);
    }

    const t1 = performance.now();
    console.log(`%c[updateMapMarkers] ✅ DONE in ${(t1-t0).toFixed(1)}ms`, 'background:#FF69B4;color:white;padding:4px 8px;border-radius:3px');
  }
  window.updateMapMarkers = updateMapMarkers;

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

  // Track fake POIs (not found on Google Places)
  let FAKE_POI_IDS = new Set();

  async function updateFakePOIList() {
    const allPOIs = window.allPOIs?.() || [];
    let newFakesFound = 0;

    for (const poi of allPOIs) {
      const status = await window.POIVerifiedDB?.getVerificationStatus?.(poi.id);
      if (status === 'not_found') {
        if (!FAKE_POI_IDS.has(poi.id)) {
          newFakesFound++;
          console.log(`[renderMarkers] Marking as fake: ${poi.name} (${poi.id})`);
        }
        FAKE_POI_IDS.add(poi.id);
      }
    }

    if (newFakesFound > 0) {
      console.log(`[renderMarkers] Found ${newFakesFound} new fake POIs, re-rendering map...`);
      renderMarkers(); // Re-render to hide fake POIs
    }
  }

  // Periodically update fake POI list
  setInterval(updateFakePOIList, 3000);

  // Listen for sync progress events
  window.addEventListener('poi-sync-progress', (e) => {
    // Check for new fake POIs after each sync batch
    setTimeout(updateFakePOIList, 500);
  });

  function renderMarkers(){
    const t0 = performance.now();
    console.log(`%c[renderMarkers] START - Rendering markers on map`, 'background:#4A7C59;color:white;padding:4px 8px;border-radius:3px');
    // CRITICAL FIX: Invalidate cache to ensure openPOI() gets fresh POI list
    globalPOIsCache = null;
    console.log('[renderMarkers] 🔄 Cache invalidated for fresh POI lookup');
    vectorSource.clear();
    const zoom = map.getView().getZoom() || 5;

    // maxPOI dinamico: se filtro attivo, carica TUTTI; altrimenti limita per performance
    let maxPOI;
    if (state.activeCat !== 'all') {
      // Categoria filtrata → carica TUTTI i POI di quella categoria
      maxPOI = Infinity;
      console.log('[renderMarkers] Categoria filtrata:', state.activeCat, '→ carica tutti');
    } else {
      // Nessun filtro → limita dinamicamente per zoom
      maxPOI = zoom < 5 ? 150 : zoom < 8 ? 400 : zoom < 11 ? 2000 : zoom < 13 ? 8000 : Infinity;
    }
    console.log('[renderMarkers] zoom=' + zoom + ', maxPOI=' + maxPOI + ', vectorLayer exists=' + (vectorLayer ? 'YES' : 'NO'));

    let visibleFilter = () => true;
    if (state.gpsEnabled && state.gpsCurrentLat && state.gpsCurrentLng) {
      const radiusKm = getGpsRadiusKm(zoom);
      // Don't filter Google Places POIs by GPS radius (they're real locations to explore)
      // Only filter local POIs by proximity
      visibleFilter = p => p.fromGooglePlaces || haversineKm(state.gpsCurrentLat, state.gpsCurrentLng, p.lat, p.lng) <= radiusKm;
      console.log('[renderMarkers] GPS filter active (local POIs only, Google Places POIs shown always)');
    } else {
      const size = map.getSize();
      if (size) {
        const extent = map.getView().calculateExtent(size);
        const [minX, minY, maxX, maxY] = ol.proj.transformExtent(extent, 'EPSG:3857', 'EPSG:4326');
        const dLat = (maxY - minY) * 0.2;
        const dLng = (maxX - minX) * 0.2;
        visibleFilter = p =>
          p.lat >= minY - dLat && p.lat <= maxY + dLat &&
          p.lng >= minX - dLng && p.lng <= maxX + dLng;
        console.log('[renderMarkers] viewport bounds set');
      } else {
        console.log('[renderMarkers] WARNING: getSize()=null');
      }
    }

    const allFiltered = filtered();
    console.log('[renderMarkers] filtered():', allFiltered.length);
    const pois = allFiltered.filter(visibleFilter);
    console.log('[renderMarkers] after visibleFilter:', pois.length);

    // FILTER OUT FAKE POIs (not found on Google Places)
    const realPOIs = pois.filter(p => !FAKE_POI_IDS.has(p.id));
    console.log(`[renderMarkers] Filtered fake POIs: ${pois.length} → ${realPOIs.length}`);

    const toRender = maxPOI === Infinity ? realPOIs : realPOIs.slice(0, maxPOI);
    console.log('[renderMarkers] toRender:', toRender.length);

    let added = 0;
    toRender.forEach((p, idx) => {
      try {
        // Validate coordinates
        if (!p.lat || !p.lng || typeof p.lat !== 'number' || typeof p.lng !== 'number') {
          console.warn(`[renderMarkers] Invalid coords for ${p.name}: lat=${p.lat}, lng=${p.lng}`);
          return;
        }

        const feature = new ol.Feature({
          geometry: new ol.geom.Point(ol.proj.fromLonLat([p.lng, p.lat])),
          name: getPoiDisplayName(p),
          id: p.id,
          cat: p.cat || 'poi',
          lat: p.lat,
          lng: p.lng,
          isGF: p.gf?.lvl === 'full',
          gf: p.gf || {},
          paid: p.paid === true ? true : false, // paid=false means free/gratis
          indoor: p.indoor === true,
          family_friendly: p.family_friendly === true
        });
        vectorSource.addFeature(feature);
        added++;

        // Log first few POIs for debugging
        if (idx < 3) {
          console.log(`[renderMarkers] Sample POI #${idx+1}: ${p.name} at (${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}), cat=${p.cat}, fromGoogle=${p.fromGooglePlaces}`);
        }
      } catch(e) {
        console.error('[renderMarkers] Error adding feature:', p.id, e);
      }
    });
    const t1 = performance.now();
    console.log(`%c[renderMarkers] ✅ DONE: added ${added} markers in ${(t1-t0).toFixed(1)}ms | total on map: ${vectorSource.getFeatures().length}`, 'background:#4A7C59;color:white;padding:4px 8px;border-radius:3px');

    // Show/hide empty state overlay
    const emptyStateOverlay = document.getElementById('map-empty-state');
    if (added === 0) {
      if (emptyStateOverlay) {
        emptyStateOverlay.style.display = 'flex';
      } else {
        // Create overlay if doesn't exist
        const overlay = document.createElement('div');
        overlay.id = 'map-empty-state';
        overlay.style.cssText = `
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(180deg, rgba(10,8,5,0.85), rgba(15,12,8,0.85));
          backdrop-filter: blur(3px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 100;
          padding: 20px;
          border-radius: 12px;
          pointer-events: none;
        `;
        overlay.innerHTML = `
          <div style="text-align: center; pointer-events: auto;">
            <div style="font-size: 48px; margin-bottom: 16px;">🔍</div>
            <h2 style="
              font-size: 18px;
              font-weight: 700;
              color: rgba(255,255,255,0.95);
              margin: 0 0 8px 0;
            ">Nessun POI trovato</h2>
            <p style="
              font-size: 14px;
              color: rgba(255,255,255,0.6);
              margin: 0 0 16px 0;
              line-height: 1.5;
              max-width: 240px;
            ">Prova a cambiare i filtri o a zoomare fuori per vedere più posti.</p>
            <button id="map-empty-reset-filters" style="
              padding: 10px 20px;
              background: rgba(99,102,241,0.3);
              border: 1.5px solid rgba(99,102,241,0.6);
              border-radius: 20px;
              color: rgba(255,255,255,0.9);
              font-size: 13px;
              font-weight: 600;
              cursor: pointer;
              font-family: inherit;
            ">Resetta filtri</button>
          </div>
        `;
        const mapHost = document.getElementById('view-map') || document.getElementById('map');
        if (mapHost) {
          mapHost.appendChild(overlay);
          overlay.querySelector('#map-empty-reset-filters')?.addEventListener('click', () => {
            state.activeFilter = 'all';
            state.onlyLocal = false;
            state.showGFPlaces = false;
            renderFilters();
            renderMarkers();
          });
        }
      }
    } else if (emptyStateOverlay) {
      emptyStateOverlay.style.display = 'none';
    }
  }

  function getPoiDisplayName(p) { return window.getPoiDisplayName?.(p) ?? p?.name ?? 'Punto di interesse'; }

  // Aggiorna marker al cambio vista (debounced 250ms)
  const debouncedRender = debounce(renderMarkers, 250);
  // FEATURE 6 — SHOPPING DATASET
  // ===================================================================
  const SHOPPING_DB = [
    // FASHION
    {id:'shop-001', name:'Shibuya 109', city:'Tokyo', cat:'shopping', coords:[35.6595, 139.7004], rating:4.8, hours:'10:00–21:00', budget_jpy:50000, items:['clothing','accessories'], notes:'Fashion hub multi-brand'},
    {id:'shop-002', name:'Ginza Six', city:'Tokyo', cat:'shopping', coords:[35.6730, 139.7625], rating:4.9, hours:'10:30–20:30', budget_jpy:80000, items:['luxury','fashion','accessories'], notes:'Luxury shopping complex'},
    {id:'shop-003', name:'Takeshita Street', city:'Tokyo', cat:'shopping', coords:[35.6653, 139.7014], rating:4.7, hours:'10:00–19:00', budget_jpy:30000, items:'casual,trendy', notes:'Youth fashion street'},
    // FOOD / SOUVENIRS
    {id:'shop-004', name:'Kyoto Nishiki Market', city:'Kyoto', cat:'food', coords:[35.0051, 135.7703], rating:4.8, hours:'10:00–18:00', budget_jpy:15000, items:['food','souvenirs','gf-aware'], notes:'Food market, many GF snacks'},
    {id:'shop-005', name:'Arashiyama Bamboo Market', city:'Kyoto', cat:'food', coords:[35.0162, 135.7588], rating:4.6, hours:'8:00–17:00', budget_jpy:10000, items:['crafts','souvenirs'], notes:'Artisan bamboo & local goods'},
    {id:'shop-006', name:'Dotonbori Street Market', city:'Osaka', cat:'food', coords:[34.6694, 135.5015], rating:4.7, hours:'10:00–23:00', budget_jpy:20000, items:['food','snacks'], notes:'Street food & takoyaki'},
    // ELECTRONICS / CAMERAS
    {id:'shop-007', name:'Yodabashi Camera Tokyo', city:'Tokyo', cat:'electronics', coords:[35.7625, 139.7380], rating:4.6, hours:'09:30–21:00', budget_jpy:100000, items:['cameras','electronics'], notes:'Major camera & electronics'},
    {id:'shop-008', name:'Akihabara Electronics', city:'Tokyo', cat:'electronics', coords:[35.7011, 139.7723], rating:4.5, hours:'10:00–20:00', budget_jpy:150000, items:['gaming','electronics'], notes:'Tech & gaming hub'},
    // BOOKS / STATIONERY
    {id:'shop-009', name:'Bookoff Tokyo', city:'Tokyo', cat:'books', coords:[35.6895, 139.7011], rating:4.4, hours:'10:00–21:00', budget_jpy:5000, items:['books','manga'], notes:'Used books & manga'},
    {id:'shop-010', name:'Kyoto Kawachikaido Books', city:'Kyoto', cat:'books', coords:[35.0068, 135.7712], rating:4.3, hours:'10:00–19:00', budget_jpy:3000, items:['books','local-authors'], notes:'Local & traditional books'},
    // BEAUTY / SKINCARE
    {id:'shop-011', name:'Shibuya Hands', city:'Tokyo', cat:'beauty', coords:[35.6585, 139.7029], rating:4.7, hours:'10:00–21:00', budget_jpy:20000, items:['skincare','cosmetics'], notes:'Japanese beauty products'},
    {id:'shop-012', name:'Kyoto Ginza Tanaka', city:'Kyoto', cat:'beauty', coords:[35.0071, 135.7733], rating:4.5, hours:'10:00–19:00', budget_jpy:15000, items:['cosmetics','wellness'], notes:'Premium skincare'},
    // VINTAGE — Tokyo
    {id:'vint-001', name:'Shimokitazawa Flamingo', city:'Tokyo', cat:'vintage', coords:[35.6612, 139.6688], rating:4.8, hours:'12:00–21:00', budget_jpy:15000, items:['vintage','abbigliamento anni 70-90'], notes:'Icona vintage di Shimokita. 3 negozi in 100m. Prezzi onesti, merce giapponese.'},
    {id:'vint-002', name:'New York Joe Exchange', city:'Tokyo', cat:'vintage', coords:[35.6598, 139.6691], rating:4.7, hours:'12:00–21:00', budget_jpy:12000, items:['vintage','scambio','abbigliamento'], notes:'Compra e vende vintage. Ottimo per capi anni 80-90 a prezzi bassi.'},
    {id:'vint-003', name:'Chicago Shimokitazawa', city:'Tokyo', cat:'vintage', coords:[35.6601, 139.6695], rating:4.6, hours:'11:00–20:00', budget_jpy:20000, items:['vintage','cappotti','accessori'], notes:'Catena vintage storica di Tokyo. Selezione ampia.'},
    {id:'vint-004', name:'Koenji Don Don Down', city:'Tokyo', cat:'vintage', coords:[35.7054, 139.6498], rating:4.7, hours:'11:00–20:00', budget_jpy:8000, items:['vintage','scontato','abbigliamento'], notes:'Mercoledì sconti massivi. Prezzo cala ogni settimana se rimane invenduto.'},
    {id:'vint-005', name:'Haight & Ashbury', city:'Tokyo', cat:'vintage', coords:[35.6610, 139.6690], rating:4.5, hours:'12:00–21:00', budget_jpy:25000, items:['vintage','american casual','denim'], notes:'Specializzato vintage americano: Levi\'s, college jackets, western.'},
    {id:'vint-006', name:'Ragtag Tokyo', city:'Tokyo', cat:'vintage', coords:[35.6590, 139.6685], rating:4.6, hours:'11:00–20:00', budget_jpy:30000, items:['vintage','designer','luxury resell'], notes:'Vintage di lusso e designer di seconda mano. Qualità garantita.'},
    {id:'vint-007', name:'Kinji Harajuku', city:'Tokyo', cat:'vintage', coords:[35.6695, 139.7043], rating:4.5, hours:'11:00–20:00', budget_jpy:10000, items:['vintage','harajuku','moda giovane'], notes:'Vintage e usato economico a Harajuku. 3 piani stracolmi.'},
    {id:'vint-008', name:'Treasure Factory Koenji', city:'Tokyo', cat:'vintage', coords:[35.7058, 139.6501], rating:4.4, hours:'10:00–21:00', budget_jpy:6000, items:['vintage','usato','casa'], notes:'Catena acquisto/vendita. Anche oggetti casa, vinili, fumetti.'},
    // VINTAGE — Kyoto
    {id:'vint-009', name:'Furugi no Mise Shichifuku', city:'Kyoto', cat:'vintage', coords:[35.0045, 135.7618], rating:4.6, hours:'11:00–19:00', budget_jpy:18000, items:['vintage','kimono','furugi'], notes:'Furugi (usato) con selezione kimono e haori. Zona Nishiki.'},
    {id:'vint-010', name:'Hinaya Kimono Vintage', city:'Kyoto', cat:'vintage', coords:[35.0058, 135.7701], rating:4.7, hours:'10:00–18:00', budget_jpy:25000, items:['kimono','vintage','obi'], notes:'Kimono vintage di seconda mano. Prezzi da 3.000¥. Anche seta.'},
    {id:'vint-011', name:'Usagi Gion Vintage', city:'Kyoto', cat:'vintage', coords:[35.0038, 135.7742], rating:4.5, hours:'12:00–19:00', budget_jpy:20000, items:['vintage','moda','accessori'], notes:'Piccolo negozio vintage vicino a Gion. Capi giapponesi anni 80.'},
    // VINTAGE — Osaka
    {id:'vint-012', name:'Amerika Mura Vintage Row', city:'Osaka', cat:'vintage', coords:[34.6703, 135.5022], rating:4.7, hours:'11:00–21:00', budget_jpy:20000, items:['vintage','american','streetwear'], notes:'America-mura (Amemura) è il distretto vintage di Osaka. 20+ negozi in 3 isolati.'},
    {id:'vint-013', name:'Ragtag Osaka', city:'Osaka', cat:'vintage', coords:[34.6695, 135.5015], rating:4.5, hours:'11:00–20:00', budget_jpy:28000, items:['vintage','designer','resell'], notes:'Filiale Osaka di Ragtag. Designer e vintage pregiato.'},
    {id:'vint-014', name:'Namba Bears Vintage', city:'Osaka', cat:'vintage', coords:[34.6674, 135.5014], rating:4.4, hours:'12:00–21:00', budget_jpy:12000, items:['vintage','punk','rock'], notes:'Vintage con taglio punk/rock. Giacche, band tees, accessori.'},
    // VINTAGE — Kanazawa
    {id:'vint-015', name:'Furugi Higashi Chaya', city:'Kanazawa', cat:'vintage', coords:[36.5708, 136.6678], rating:4.5, hours:'10:00–18:00', budget_jpy:15000, items:['vintage','kimono','artigianato'], notes:'Negozio furugi nel quartiere geisha. Kimono e yukata vintage.'},
    // VINTAGE — Hiroshima
    {id:'vint-016', name:'Nagarekawa Vintage', city:'Hiroshima', cat:'vintage', coords:[34.3970, 132.4580], rating:4.3, hours:'11:00–20:00', budget_jpy:10000, items:['vintage','usato','abbigliamento'], notes:'Zona Nagarekawa. Piccolo ma ben selezionato.'},
    // VINTAGE — Fukuoka
    {id:'vint-017', name:'Daimyo Vintage Street', city:'Fukuoka', cat:'vintage', coords:[33.5892, 130.3983], rating:4.5, hours:'11:00–21:00', budget_jpy:15000, items:['vintage','streetwear','moda'], notes:'Daimyo è il quartiere hip di Fukuoka. 10+ negozi vintage in una via.'},
    {id:'vint-018', name:'2nd Street Tenjin', city:'Fukuoka', cat:'vintage', coords:[33.5896, 130.3984], rating:4.4, hours:'10:00–21:00', budget_jpy:8000, items:['vintage','usato catena','abbigliamento'], notes:'Catena 2nd Street — prezzi bassi, grande selezione.'},
    // VINTAGE — Takayama
    {id:'vint-019', name:'Sanmachi Antique Shops', city:'Takayama', cat:'vintage', coords:[36.1450, 137.2542], rating:4.6, hours:'9:00–17:00', budget_jpy:30000, items:['antichi','lacca','ceramica','folk art'], notes:'Diverse botteghe di antiquariato Hida nella via storica. Pezzi unici.'},
  ];
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
  function renderShoppingMarkers(){
    shoppingSource.clear();
    SHOPPING_DB.forEach(s => {
      const feature = new ol.Feature({
        geometry: new ol.geom.Point(ol.proj.fromLonLat([s.coords[1], s.coords[0]])),
        name: s.name,
        id: s.id,
        type: 'shopping'
      });
      shoppingSource.addFeature(feature);
    });
  }
  function toggleShoppingLayer(){
    state.showShoppingLayer = !state.showShoppingLayer;
    saveState();
    const btn = document.querySelector('button[data-toggle-shopping]');
    if (btn) btn.classList.toggle('active', state.showShoppingLayer);
    shoppingLayer.setVisible(state.showShoppingLayer);
    if (state.showShoppingLayer) renderShoppingMarkers();
  }
  function updateLayerToggle(){
    const btn = document.querySelector('[data-toggle-shopping]');
    if (btn) btn.classList.toggle('active', !!state.showShoppingLayer);
  }
  function flyToCity(c){
    const [lat,lng] = CITY_COORDS[c];
    map.getView().animate({
      center: ol.proj.fromLonLat([lng, lat]),
      zoom: 10,
      duration: 500
    });
  }
  // ---- GPS TRACKING (integrato con Agenda) ----
  let gpsWatchId = null;
  function haversineKm(lat1,lng1,lat2,lng2){
    const R=6371, dLat=(lat2-lat1)*Math.PI/180, dLng=(lng2-lng1)*Math.PI/180;
    const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
    return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
  }
  function fmtDist(km){ return km<1 ? Math.round(km*1000)+'m' : km.toFixed(1)+'km'; }
  window.haversineKm = haversineKm; // esposto per js/views/
  window.fmtDist = fmtDist;
  function startGPS(){
    // === FAKE GPS A TOKYO (per testing) ===
    const USE_FAKE_GPS = false;
    let geolocationToUse = navigator.geolocation;

    // Se in un gruppo, manda il GPS subito (non aspetta il primo update)
    if (state.group?.myName && state.gpsCurrentLat && state.gpsCurrentLng && peerGPS.getStatus() !== 'disconnected') {
      console.log(`%c[GPS] 📍 START: Broadcasting GPS istantaneo all'accensione`, 'background:#4A7C59;color:white;padding:4px 8px;border-radius:3px');
      const payload = {
        type: 'gps',
        lat: state.gpsCurrentLat,
        lng: state.gpsCurrentLng,
        name: state.group.myName,
        avatar: state.group?.myAvatar || null
      };
      window.rtdbBroadcast(payload);
    }

    if (USE_FAKE_GPS) {
      // Mock geolocation (non assegnare a navigator.geolocation che è readonly)
      geolocationToUse = {
        watchPosition: (successCallback, errorCallback, options) => {
          // Simula Tokyo coordinates con piccolo jitter per realismo
          const interval = setInterval(() => {
            successCallback({
              coords: {
                latitude: 35.6762 + (Math.random() - 0.5) * 0.001,
                longitude: 139.6503 + (Math.random() - 0.5) * 0.001,
                accuracy: 10
              }
            });
          }, 1000);
          return interval;
        },
        clearWatch: (id) => {
          clearInterval(id);
        }
      };
      console.log('[GPS] Using FAKE GPS at Tokyo');
    }
    // === FINE FAKE GPS ===
    
    if (!geolocationToUse) { toast(T('toast.gpsNA', 'GPS non disponibile')); return; }
    state.gpsEnabled=true; state.gpsPermissionAsked=true; saveState();
    if (gpsWatchId!==null) return;
    gpsWatchId=geolocationToUse.watchPosition(pos=>{
      const pt={lat:pos.coords.latitude,lng:pos.coords.longitude};
      if(!state.gpsTrack) state.gpsTrack=[];
      const last=state.gpsTrack[state.gpsTrack.length-1];
      if(!last||haversineKm(last.lat,last.lng,pt.lat,pt.lng)*1000>5){
        if(state.gpsTrack.length>=500) state.gpsTrack.shift();
        state.gpsTrack.push(pt);
      }
      state.gpsCurrentLat=pt.lat; state.gpsCurrentLng=pt.lng;
      updateGPSMarker(pt.lat, pt.lng);
      // Invia posizione ai peer connessi (se GPS live attivo)
      if (peerGPS.getStatus() !== 'disconnected') {
        try {
          const payload = { type:'gps', lat:pt.lat, lng:pt.lng,
            name: state.group?.myName||'?', avatar: state.group?.myAvatar||null };
          console.log(`%c[GPS] 📍 Trasmettendo posizione: (${pt.lat.toFixed(4)}, ${pt.lng.toFixed(4)}) - ${state.group?.myName}`, 'background:#4A7C59;color:white;padding:4px 8px;border-radius:3px;font-size:11px');
          window.rtdbBroadcast(payload);
        } catch(e) {}
      }
      saveState(); updateAgendaDistances(); updateGPSStatusPanel();
    },err=>{
      toast('GPS: '+err.message); state.gpsEnabled=false; saveState();
      if(gpsWatchId!==null){geolocationToUse.clearWatch(gpsWatchId);gpsWatchId=null;}
      updateGPSStatusPanel();
    },{enableHighAccuracy:true,maximumAge:5000,timeout:30000});
  }
  function stopGPS(){
    state.gpsEnabled=false; saveState();
    if(gpsWatchId!==null){navigator.geolocation.clearWatch(gpsWatchId);gpsWatchId=null;}
    updateGPSMarker(null, null);
    updateGPSStatusPanel(); toast(T('toast.gpsOff', 'GPS disattivato'));
  }
  function toggleGPS(){ if(state.gpsEnabled&&gpsWatchId!==null) stopGPS(); else startGPS(); }
  function updateAgendaDistances(){
    if(!state.gpsCurrentLat) return;
    document.querySelectorAll('[data-gps-dist]').forEach(el=>{
      const lat=parseFloat(el.dataset.lat), lng=parseFloat(el.dataset.lng);
      if(!isNaN(lat)&&!isNaN(lng)){
        const km=haversineKm(state.gpsCurrentLat,state.gpsCurrentLng,lat,lng);
        el.textContent='Posizione rilevata '+fmtDist(km);
        el.style.color=km<1?'var(--success)':km<5?'var(--warning)':'var(--muted)';
      }
    });
  }
  function buildGPSPanelHTML(active,pts,lat,lng){
    return `<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;font-size:13px;display:flex;align-items:center;gap:6px">
          <span style="width:8px;height:8px;border-radius:50%;background:${active?'var(--success)':'var(--muted)'};display:inline-block;${active?'box-shadow:0 0 0 3px rgba(74,124,89,.25)':''}"></span>
          GPS ${active?'attivo':'inattivo'}
        </div>
        <div style="font-size:11px;color:var(--muted);margin-top:3px">${active?lat+', '+lng:'Nessuna posizione'} · ${pts} punti</div>
      </div>
      <button id="gps-toggle-btn" class="btn ${active?'success':''}" style="font-size:12px;padding:6px 10px">
        ${active?'⏹ Stop':'▶ Start GPS'}
      </button>
      ${pts>0?`<button id="gps-clear-btn" class="btn" aria-label="Cancella traccia GPS" style="font-size:12px;padding:6px 10px">🗑️</button>`:''}
    </div>`;
  }
  function updateGPSStatusPanel(){
    const panel=document.getElementById('gps-status-panel'); if(!panel) return;
    const active=state.gpsEnabled&&gpsWatchId!==null;
    const pts=state.gpsTrack?.length||0;
    const lat=state.gpsCurrentLat?state.gpsCurrentLat.toFixed(5):'—';
    const lng=state.gpsCurrentLng?state.gpsCurrentLng.toFixed(5):'—';
    panel.innerHTML=buildGPSPanelHTML(active,pts,lat,lng);
    const btn=document.getElementById('gps-toggle-btn'); if(btn) btn.onclick=toggleGPS;
    const clrBtn=document.getElementById('gps-clear-btn');
    if(clrBtn) clrBtn.onclick=()=>{
      state.gpsTrack=[]; state.gpsCurrentLat=null; state.gpsCurrentLng=null;
      updateGPSMarker(null, null);
      saveState(); updateAgendaDistances(); updateGPSStatusPanel(); toast(T('toast.trackCleared', 'Traccia cancellata'));
    };
  }
  if(state.gpsEnabled&&!gpsWatchId) startGPS();
  // Restore last known GPS position on map immediately
  if(state.gpsCurrentLat && state.gpsCurrentLng) updateGPSMarker(state.gpsCurrentLat, state.gpsCurrentLng);

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
  // ---- Filter bar UI ----
  const filtersEl = document.getElementById('filters');
  function renderFilters(){
    // Remove orphaned panel before re-render
    const oldPanel = document.getElementById('adv-filters-panel');
    if (oldPanel) oldPanel.remove();
    const chips = [];
    chips.push(`<button class="chip local ${state.onlyLocal?'active':''}" data-local="1">🏮 Local</button>`);
    chips.push(`<button class="chip gf-places ${state.showGFPlaces?'active':''}" data-gf-places="1">🟢 GF Places</button>`);
    // Categorie effettivamente presenti tra i POI caricati (per nascondere chip vuote)
    const presentCats = new Set();
    try { (window.allPOIs ? window.allPOIs() : []).forEach(p => p && p.cat && presentCats.add(p.cat)); } catch (e) {}
    Object.keys(CATS).forEach(k => {
      // Mostra "Tutti" sempre + la categoria attiva + solo le categorie effettivamente
      // presenti tra i POI caricati (riduce la barra da ~80 chip a poche pertinenti).
      if (k !== 'all' && k !== state.activeCat && !presentCats.has(k)) return;
      chips.push(`<button class="chip ${state.activeCat===k?'active':''}" data-cat="${k}">${CATS[k].icon} ${CATS[k].label}</button>`);
    });
    chips.push(`<button class="chip ${state.showAdvFilters?'active':''}" id="adv-filter-toggle" data-adv="1">⚙️ Avanzati</button>`);
    filtersEl.innerHTML = chips.join('');
    
    // Advanced filters panel
    if (state.showAdvFilters) {
      const minRating = state.minRating || 0;
      const maxBudget = state.maxBudget || 100000;
      const advPanel = document.createElement('div');
      advPanel.id = 'adv-filters-panel';
      advPanel.style.cssText = 'position:absolute;top:50px;left:10px;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:12px;z-index:499;min-width:280px;box-shadow:0 4px 12px rgba(0,0,0,.3)';
      advPanel.innerHTML = `
        <div style="font-weight:700;margin-bottom:10px">🔧 Filtri avanzati</div>
        <div style="margin-bottom:10px">
          <label style="display:block;font-size:12px;color:var(--muted);margin-bottom:4px">⭐ Voto minimo: <strong id="rating-val">${minRating}</strong></label>
          <input type="range" id="adv-rating" min="0" max="5" step="1" value="${minRating}" style="width:100%;cursor:pointer" />
        </div>
        <div style="margin-bottom:10px">
          <label style="display:block;font-size:12px;color:var(--muted);margin-bottom:4px">💰 Budget massimo: <strong id="budget-val">¥${maxBudget}</strong></label>
          <input type="range" id="adv-budget" min="0" max="100000" step="5000" value="${maxBudget}" style="width:100%;cursor:pointer" />
        </div>
        <button id="adv-reset" class="btn" style="width:100%;font-size:12px;padding:6px">Reset filtri</button>
      `;
      filtersEl.parentElement.style.position = 'relative';
      filtersEl.parentElement.appendChild(advPanel);
      
      // Bind advanced filter controls (with throttle to prevent excessive rendering)
      document.getElementById('adv-rating').oninput = throttle((e) => {
        state.minRating = parseInt(e.target.value, 10);
        document.getElementById('rating-val').textContent = state.minRating;
        saveState(); renderMarkers();
      }, 200);
      document.getElementById('adv-budget').oninput = throttle((e) => {
        state.maxBudget = parseInt(e.target.value, 10);
        document.getElementById('budget-val').textContent = '¥'+state.maxBudget;
        saveState(); renderMarkers();
      }, 200);
      document.getElementById('adv-reset').onclick = () => {
        state.minRating = 0;
        state.maxBudget = 100000;
        saveState();
        renderFilters(); renderMarkers();
      };
    }
  }
  filtersEl.addEventListener('click', e => {
    const btn = e.target.closest('.chip'); if (!btn) return;
    if (btn.dataset.gf) state.onlyGF = !state.onlyGF;
    else if (btn.dataset.local) state.onlyLocal = !state.onlyLocal;
    else if (btn.dataset.gfPlaces) {
      state.showGFPlaces = !state.showGFPlaces;
      // Toggle GF Places layer visibility
      if (window.gfPlacesLayer) {
        window.gfPlacesLayer.setVisible(state.showGFPlaces);
        console.log('[Filter] GF Places layer visibility:', state.showGFPlaces);
      }
    }
    else if (btn.dataset.cat) state.activeCat = btn.dataset.cat;
    else if (btn.dataset.adv) state.showAdvFilters = !state.showAdvFilters;
    saveState(); renderFilters(); renderMarkers();
    const activeNav = document.querySelector('nav.bottom button.active');
    if (activeNav?.dataset.view === 'list') renderListView();
    if (activeNav?.dataset.view === 'shopping') renderShoppingView();
  });
  // ---- Sheet ----
  const sheet = document.getElementById('sheet');
  const sheetTitle = document.getElementById('sheet-title');
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

  const sheetBody = document.getElementById('sheet-body');
  window.sheetBody = sheetBody; // esposto per le views estratte (vedi js/views/)
  document.getElementById('sheet-close').onclick = closeSheet;
  sheet.addEventListener('click', e => { if (e.target === sheet) closeSheet(); });
  let _sheetPrevFocus = null;
  let _sheetTrapHandler = null;

  function openSheet(title, html){
    console.log('[openSheet] Starting, title:', title);
    console.log('[openSheet] sheetTitle:', sheetTitle, 'sheetBody:', sheetBody, 'sheet:', sheet);
    if (!sheetTitle || !sheetBody || !sheet) {
      console.error('[openSheet] ❌ Elements not found!', {sheetTitle: !!sheetTitle, sheetBody: !!sheetBody, sheet: !!sheet});
      return;
    }
    sheetTitle.textContent = title;
    sheetBody.innerHTML = html;
    sheet.classList.add('open');
    // Hide weather widget when sheet opens
    const weatherWidget = document.getElementById('weather-floating');
    if (weatherWidget) weatherWidget.classList.remove('show');
    console.log('[openSheet] ✅ Sheet opened, class added');

    // Focus trap: save previous focus, move focus into sheet
    _sheetPrevFocus = document.activeElement;
    const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
    if (_sheetTrapHandler) document.removeEventListener('keydown', _sheetTrapHandler);
    _sheetTrapHandler = (ev) => {
      if (ev.key !== 'Tab') return;
      const els = Array.from(sheet.querySelectorAll(FOCUSABLE)).filter(el => el.offsetParent !== null);
      if (!els.length) return;
      const first = els[0], last = els[els.length - 1];
      if (ev.shiftKey) { if (document.activeElement === first) { ev.preventDefault(); last.focus(); } }
      else            { if (document.activeElement === last)  { ev.preventDefault(); first.focus(); } }
    };
    document.addEventListener('keydown', _sheetTrapHandler);
    requestAnimationFrame(() => {
      const closeBtn = document.getElementById('sheet-close');
      const firstEl = sheet.querySelector(FOCUSABLE);
      (closeBtn || firstEl)?.focus();
    });
  }
  function closeSheet(){
    console.log('[closeSheet] 🔴 closeSheet called');
    sheet.classList.remove('open');
    // Release focus trap and restore prior focus
    if (_sheetTrapHandler) { document.removeEventListener('keydown', _sheetTrapHandler); _sheetTrapHandler = null; }
    if (_sheetPrevFocus && typeof _sheetPrevFocus.focus === 'function') { try { _sheetPrevFocus.focus(); } catch (_) {} }
    _sheetPrevFocus = null;

    // Remove wizard listeners when sheet closes
    if (window._wizardClickListener) {
      document.removeEventListener('click', window._wizardClickListener, { capture: true });
      window._wizardClickListener = null;
      window._wizardClickListenerAttached = false;
      console.log('[closeSheet] ✅ Removed wizard click listener');
    }

    if (window._wizardChangeListener) {
      document.removeEventListener('change', window._wizardChangeListener, { capture: true });
      window._wizardChangeListener = null;
      window._wizardChangeListenerAttached = false;
      console.log('[closeSheet] ✅ Removed wizard change listener');
    }

    // Show weather widget again when sheet closes
    const weatherWidget = document.getElementById('weather-floating');
    if (weatherWidget) {
      weatherWidget.classList.add('show');
      console.log('[closeSheet] ✅ Added .show to weather widget');
    } else {
      console.error('[closeSheet] ❌ Weather widget element not found!');
    }
    // Always reset tab buttons to "Mappa" when closing any sheet
    const bottomNav = document.querySelector('nav.bottom');
    if (bottomNav) {
      console.log('[closeSheet] Resetting all buttons to blue, activating map button');
      bottomNav.querySelectorAll('button').forEach(b => {
        const wasActive = b.classList.contains('active');
        b.classList.remove('active');
        // Force color reset by explicitly setting style if CSS isn't applying
        if (wasActive) {
          console.log('[closeSheet] Removed .active from button:', b.dataset.view);
        }
      });
      const mapBtn = bottomNav.querySelector('button[data-view="map"]');
      if (mapBtn) {
        mapBtn.classList.add('active');
        console.log('[closeSheet] ✅ Added .active to map button');
      }
    } else {
      console.warn('[closeSheet] bottomNav element not found');
    }
    // Double-check: wait a frame and verify state
    requestAnimationFrame(() => {
      const bottomNav = document.querySelector('nav.bottom');
      if (bottomNav) {
        const activeButtons = Array.from(bottomNav.querySelectorAll('button.active'));
        console.log('[closeSheet] Verification: active buttons count:', activeButtons.length,
          'Map button active?', activeButtons.some(b => b.dataset.view === 'map'));
      }
    });
  }
  // Rendi globali per poi-handlers.js
  window.openSheet = openSheet;
  window.closeSheet = closeSheet;

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
  window.renderMarkers = renderMarkers;
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
      renderMarkers();
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
  renderMarkers();

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

  // Also update when filters change
  const originalRenderFilters = renderFilters;
  window.renderFilters = function() {
    originalRenderFilters.call(this);
    setTimeout(updateMapPosition, 100);
  };

  // Export globali per group-panel e group-chat
  window.startGPS = startGPS;
  window.stopGPS = stopGPS;
  window.openSheet = openSheet;
  window.closeSheet = closeSheet;
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
  window.SHOPPING_DB = SHOPPING_DB;
  // fetchWeatherData/Hourly, getWeatherIcon/Color/Condition exposed by weather-view.js
  window.generateRoomCode = generateRoomCode;
  window.updateGPSMarker = updateGPSMarker;
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
