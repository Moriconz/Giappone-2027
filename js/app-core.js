// app-core.js — Application controller (dispatcher + map init + state)
console.log('[Giappone2027] App loading...');

document.addEventListener('DOMContentLoaded', () => {
  console.log('[Giappone2027] DOM ready');
  if (typeof ol === 'undefined') {
    console.error('[Giappone2027] OpenLayers not loaded!');
    document.getElementById('ol-error').style.display = 'flex';
    return;
  }
  console.log('[Giappone2027] OpenLayers loaded, initializing...');

(function () {
  'use strict';

  // ---- Device tier detection for progressive enhancement ----
  const tier = (function () {
    const mem = navigator.deviceMemory || 4;
    const cores = navigator.hardwareConcurrency || 4;
    if (mem <= 2 || cores <= 2) { document.body.classList.add('low-tier'); return 'low'; }
    if (mem <= 4 || cores <= 4) return 'mid';
    return 'high';
  })();
  console.log('[giappone2027] Device tier:', tier);

  // ---- Categories + filters — COMPREHENSIVE from Google Places ----
  // CATS + CITY_COORDS also written to js/config.js (window.CATS / window.CITY_COORDS)
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
  window.CATS = CATS;

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
  window.CITY_COORDS = CITY_COORDS;

  // ---- State (persisted) ----
  // Overrides the simpler state.js init with quota-guard + GPS trace cleanup.
  const STATE_KEY = 'giappone2027_state_v1';

  function _loadPersistedState() {
    try {
      const raw = JSON.parse(localStorage.getItem(STATE_KEY) || '{}');
      const arrays = ['savedPOIs','itinerary','customEvents','customPOIs','gpsTraces'];
      const objects = ['notes','gfReports','userCategoryOverrides','itinerarySharing','groupItineraries','itineraryByDay'];
      arrays.forEach(k => { if (raw[k] !== undefined && !Array.isArray(raw[k])) { console.warn('[State] Corrupt field reset:', k); delete raw[k]; } });
      objects.forEach(k => { if (raw[k] !== undefined && (typeof raw[k] !== 'object' || Array.isArray(raw[k]) || raw[k] === null)) { console.warn('[State] Corrupt field reset:', k); delete raw[k]; } });
      if (raw.group !== undefined && (typeof raw.group !== 'object' || Array.isArray(raw.group) || raw.group === null)) { console.warn('[State] Corrupt group reset'); delete raw.group; }
      return raw;
    } catch (e) {
      console.error('[State] Parse error — starting fresh:', e);
      return {};
    }
  }

  const state = Object.assign({
    activeCat: 'all', onlyGF: false, onlyLocal: false, showGFPlaces: false,
    savedPOIs: [], notes: {}, customEvents: [], customPOIs: [], gfReports: {}, dismissInstall: false,
    itinerary: [],
    userCategoryOverrides: {},
    group: { name: 'Giappone 2027', members: [], myAvatar: null, myName: '', createdBy: null, createdByName: null, isCreator: false },
    itinerarySharing: {},
    groupItineraries: {},
    gpsCurrentLat: 35.6762,
    gpsCurrentLng: 139.6503
  }, _loadPersistedState());
  window.state = state;
  console.log('[State] Init', { group: state.group });

  function cleanupGPSTraces() {
    if (state.gpsTraces && Array.isArray(state.gpsTraces) && state.gpsTraces.length > 500) {
      const removed = state.gpsTraces.length - 500;
      state.gpsTraces = state.gpsTraces.slice(-500);
      console.log('[GPS] Cleaned up', removed, 'old GPS points.');
    }
  }

  function _trimStateForQuota(s) {
    if (s.group?.members) {
      s.group.members = s.group.members.map(m => m.avatar?.startsWith('data:') ? { ...m, avatar: null } : m);
    }
    if (s.group?.myAvatar?.startsWith('data:')) s.group.myAvatar = null;
    if (s.gpsTraces?.length > 100) s.gpsTraces = s.gpsTraces.slice(-100);
  }

  function saveState() {
    try {
      cleanupGPSTraces();
      let serialized = JSON.stringify(state);
      if (serialized.length > 4_500_000) {
        console.warn('[State] localStorage quota warning: ' + Math.round(serialized.length / 1024) + 'KB — trimming');
        const trimmed = JSON.parse(serialized);
        _trimStateForQuota(trimmed);
        serialized = JSON.stringify(trimmed);
        _trimStateForQuota(state);
        window.toast?.(window.t?.('toast.storageWarning', '⚠️ Dati quasi al limite (4.3MB).'));
      }
      localStorage.setItem(STATE_KEY, serialized);
    } catch (e) {
      console.error('[State] Save error:', e);
      window.toast?.(window.t?.('toast.storageFull', '⚠️ Impossibile salvare: storage pieno.'));
    }
  }
  window.saveState = saveState;

  // ---- Audit trail (called locally by addToItinerary/removeFromItinerary) ----
  function addTappaAuditEntry(tappa, action, memberName, extra = {}) {
    window.addTappaAuditEntry?.(tappa, action, memberName, extra);
  }

  // ── Room code generator ────────────────────────────────────────────────────
  function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  }

  // ---- Merge custom events with Google Places POIs ----
  function allPOIs() {
    const googlePOIs = window.GOOGLE_PLACES_POIS || [];
    const custom = (state.customEvents || []).map(e => Object.assign({}, e, { custom: true }));
    const allItems = googlePOIs.concat(custom);
    if (state.userCategoryOverrides) {
      return allItems.map(p => state.userCategoryOverrides[p.id]
        ? Object.assign({}, p, { cat: state.userCategoryOverrides[p.id] })
        : p);
    }
    return allItems;
  }
  window.allPOIs = allPOIs;

  // ---- Collaborative itinerary helpers ----
  function addToItinerary(entry) {
    if (!state.itinerary) state.itinerary = [];
    if (state.itinerary.find(e => e.id === entry.id)) return false;
    state.itinerary.push(entry);
    addTappaAuditEntry(state.itinerary[state.itinerary.length - 1], 'added', state.group?.myName || 'Unknown');
    saveState();
    if (window.peerGPS?.broadcastItinerary) window.peerGPS.broadcastItinerary();
    return true;
  }
  function removeFromItinerary(id) {
    if (!state.itinerary) state.itinerary = [];
    const idx = state.itinerary.findIndex(e => e.id === id);
    if (idx === -1) return false;
    addTappaAuditEntry(state.itinerary[idx], 'removed', state.group?.myName || 'Unknown');
    state.itinerary.splice(idx, 1);
    saveState();
    if (window.peerGPS?.broadcastItinerary) window.peerGPS.broadcastItinerary();
    return true;
  }
  function updateItinerary(entries) { state.itinerary = entries || []; saveState(); }
  function isInItinerary(id) { return !!(state.itinerary?.some(e => e.id === id)); }

  function cloneItinerary(itinerary) {
    if (!itinerary) return itinerary;
    return JSON.parse(JSON.stringify(itinerary, (k, v) => v === undefined ? null : v));
  }
  window.cloneItinerary = cloneItinerary;

  // ═══════════════════════════════════════════════════════════════════════════
  // MAP (OpenLayers)
  // ═══════════════════════════════════════════════════════════════════════════
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
    view: new ol.View({ center: ol.proj.fromLonLat([138.5, 36.2]), zoom: 10, minZoom: 2, maxZoom: 19 })
  });

  const vectorSource = new ol.source.Vector();
  const clusterSource = new ol.source.Cluster({ source: vectorSource, distance: 50, minDistance: 20 });

  // Style helpers delegated to poi-styles.js
  function getCategoryColor(cat) { return window.getCategoryColor?.(cat) ?? '#C85C3B'; }
  function getCategoryEmoji(cat) { return window.getCategoryEmoji?.(cat) ?? '📍'; }
  function makePoiStyle(cat, isGF) { return window.makePoiStyle?.(cat, isGF) ?? null; }
  function _makeClusterStyle(count) { return window._makeClusterStyle?.(count) ?? null; }
  window.getCategoryColor = getCategoryColor;
  window.getCategoryEmoji = getCategoryEmoji;

  const vectorLayer = new ol.layer.Vector({
    source: clusterSource,
    style: (clusterFeature) => {
      const features = clusterFeature.get('features') || [];
      const count = features.length;
      if (count > 1) return window._makeClusterStyle(count);
      const feature = count === 1 ? features[0] : clusterFeature;
      if (!feature || feature.get('hidden') === true) return null;
      return window.makePoiStyle(feature.get('cat') || 'all', feature.get('isGF') || false);
    }
  });
  map.addLayer(vectorLayer);
  window.vectorSource = vectorSource;
  window.vectorLayer = vectorLayer;

  // GPS marker layer
  const gpsSource = new ol.source.Vector();
  map.addLayer(new ol.layer.Vector({ source: gpsSource, zIndex: 999 }));
  window.gpsSource = gpsSource;

  // Remote peers layer
  const remotePeersSource = new ol.source.Vector();
  map.addLayer(new ol.layer.Vector({ source: remotePeersSource, zIndex: 998 }));
  window.remotePeersSource = remotePeersSource;

  // GF places layer
  const gfPlacesSource = new ol.source.Vector();
  const gfPlacesLayer = new ol.layer.Vector({
    source: gfPlacesSource,
    style: (feature) => {
      const lvl = feature.get('safety_level') || 'YELLOW';
      const color = lvl === 'GREEN' ? '#7FFF7F' : lvl === 'RED' ? '#FF6B6B' : '#FFD700';
      const icon = lvl === 'GREEN' ? '🟢' : lvl === 'RED' ? '🔴' : '🟡';
      return new ol.style.Style({
        image: new ol.style.Circle({ radius: 10, fill: new ol.style.Fill({ color }), stroke: new ol.style.Stroke({ color: '#ffffff', width: 2.5 }) }),
        text: new ol.style.Text({ text: icon, font: '14px Arial', offsetY: -12 })
      });
    },
    zIndex: 500
  });
  map.addLayer(gfPlacesLayer);
  window.gfPlacesLayer = gfPlacesLayer;
  window.gfPlacesSource = gfPlacesSource;

  // Route layer (day route visualization)
  const routeSource = new ol.source.Vector();
  const routeLayer = new ol.layer.Vector({
    source: routeSource,
    zIndex: 400,
    style: (feature) => {
      const mode = feature.get('mode') || 'transit';
      const color = mode === 'walking' ? '#7FFF7F' : mode === 'driving' ? '#64c8ff' : 'rgba(255,122,69,0.6)';
      return new ol.style.Style({ stroke: new ol.style.Stroke({ color, width: 5, lineDash: mode === 'walking' ? [6, 6] : undefined }) });
    }
  });
  map.addLayer(routeLayer);
  window.routeSource = routeSource;
  window.routeLayer = routeLayer;

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
      const feat = new ol.Feature({ geometry: new ol.geom.LineString([ol.proj.fromLonLat(a), ol.proj.fromLonLat(b)]) });
      feat.set('mode', day[i].route_from_prev?.mode || 'transit');
      routeSource.addFeature(feat);
    }
    if (routeSource.getFeatures().length > 0) {
      try { map.getView().fit(routeSource.getExtent(), { padding: [120, 40, 120, 40], duration: 500, maxZoom: 14 }); } catch (e) {}
      return true;
    }
    return false;
  };
  window.clearDayRoute = () => routeSource.clear();

  // GF places map layer refresh
  window.refreshGFPlacesLayer = function () {
    if (!window.GFPlacesDB) return;
    const features = window.GFPlacesDB.getAll().map(place => {
      const lng = parseFloat(place.lng) || 139.6917;
      const lat = parseFloat(place.lat) || 35.6895;
      return new ol.Feature({ geometry: new ol.geom.Point(ol.proj.fromLonLat([lng, lat])), name: place.name, city: place.city, safety_level: place.safety_level || 'YELLOW', rating: place.rating, note: place.note, lat, lng });
    });
    gfPlacesSource.clear();
    gfPlacesSource.addFeatures(features);
    console.log('[GFPlaces] Layer refreshed with', features.length, 'places');
  };

  // Shopping layer (data lives in shopping-layer.js)
  const shoppingSource = new ol.source.Vector();
  const shoppingLayer = new ol.layer.Vector({
    source: shoppingSource,
    style: () => new ol.style.Style({ image: new ol.style.RegularShape({ points: 4, radius: 9, angle: Math.PI / 4, fill: new ol.style.Fill({ color: '#7A4E8A' }), stroke: new ol.style.Stroke({ color: '#fff', width: 2 }) }) }),
    zIndex: 10,
    visible: !!state.showShoppingLayer
  });
  map.addLayer(shoppingLayer);
  window.shoppingSource = shoppingSource;
  window.shoppingLayer = shoppingLayer;

  window.map = map;
  console.log('[App] Map exposed to window.map');

  // ═══════════════════════════════════════════════════════════════════════════
  // PEER GPS
  // ═══════════════════════════════════════════════════════════════════════════
  const peerGPS = window.peerGPS;

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && peerGPS.getStatus() !== 'disconnected') {
      const g = state.group;
      if (!g?.myName) return;
      peerGPS.reconnectIfNeeded(g.roomId || g.name, g.myName, (status, count) => {
        const box = document.getElementById('peer-status-box');
        if (box) {
          if (status === 'waiting') box.innerHTML = '🟡 In attesa di altri...';
          else if (status === 'connected') box.innerHTML = `🟢 Connesso (${count} peer attivi)`;
          else if (status === 'disconnected') box.innerHTML = '⚫ Non connesso';
          else if (status === 'error') box.innerHTML = `🔴 Errore: ${count}`;
        }
      });
    }
  });

  document.addEventListener('map_markers_updated', () => { window.updateMapMarkers?.(); });

  setTimeout(() => { map.updateSize(); }, 100);

  // ---- Distance helpers ----
  function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  function fmtDist(km) { return km < 1 ? Math.round(km * 1000) + 'm' : km.toFixed(1) + 'km'; }
  window.haversineKm = haversineKm;
  window.fmtDist = fmtDist;

  // ---- GPS: force-broadcast when new member joins ----
  window.gpsWatchId = null;
  window.addEventListener('force-gps-broadcast', (e) => {
    const delayMs = e.detail?.delayMs || 100;
    setTimeout(() => {
      if (state.gpsCurrentLat && state.gpsCurrentLng && peerGPS.getStatus() !== 'disconnected') {
        window.rtdbBroadcast({ type: 'gps', lat: state.gpsCurrentLat, lng: state.gpsCurrentLng, name: state.group?.myName || '?', avatar: state.group?.myAvatar || null });
      }
    }, delayMs);
  });

  // ---- Marker re-render on pan/zoom (debounced) ----
  const debouncedRender = window.debounce(() => window.renderMarkers?.(), 250);
  map.on('moveend', () => { debouncedRender(); });

  // ---- Filter bar (set by filter-bar.js) ----
  function renderFilters() { window.renderFilters?.(); }

  // ---- Google Places: test fallback POIs + event listener ----
  window.GOOGLE_PLACES_POIS = [
    { id: 'test-tsukiji', name: 'Tsukiji Outer Market', city: 'Tokyo', lat: 35.6645, lng: 139.7713, cat: 'food', gf: { lvl: 'full' }, desc: 'Fresh seafood market' },
    { id: 'test-senso', name: 'Senso-ji Temple', city: 'Tokyo', lat: 35.7148, lng: 139.7967, cat: 'experience', desc: 'Historic Buddhist temple' },
    { id: 'test-shibuya', name: 'Shibuya Crossing', city: 'Tokyo', lat: 35.6595, lng: 139.7004, cat: 'experience', desc: 'Iconic pedestrian crossing' },
    { id: 'test-tokyo-tower', name: 'Tokyo Tower', city: 'Tokyo', lat: 35.6586, lng: 139.7454, cat: 'experience', desc: 'Historic observation tower' },
    { id: 'test-meiji', name: 'Meiji Shrine', city: 'Tokyo', lat: 35.6763, lng: 139.7003, cat: 'experience', desc: 'Shinto shrine in Shibuya' }
  ];

  window.addEventListener('google-places-pois-loaded', (e) => {
    const newPois = e.detail.pois || [];
    const existingIds = new Set(window.GOOGLE_PLACES_POIS.map(p => p.googlePlaceId));
    const unique = newPois.filter(p => !existingIds.has(p.googlePlaceId));
    window.GOOGLE_PLACES_POIS.push(...unique);
    console.log(`[App] Google Places: +${unique.length} POIs | total ${window.GOOGLE_PLACES_POIS.length}`);
    if (unique.length > 0) {
      window.renderMarkers?.();
      try { renderFilters(); } catch (e) {}
    }
  });

  // Override allPOIs() to use Google Places as primary source
  const _origAllPOIs = window.allPOIs;
  window.allPOIs = function () {
    const gp = window.GOOGLE_PLACES_POIS || [];
    const custom = (state.customEvents || []).map(e => Object.assign({}, e, { custom: true }));
    return gp.length > 0 ? gp.concat(custom) : _origAllPOIs();
  };

  renderFilters();
  window.renderMarkers?.();

  // ---- Layout: dynamic header/filters/map heights ----
  function updateMapPosition() {
    const header = document.querySelector('header');
    const filters = document.getElementById('filters');
    const mapEl = document.getElementById('map');
    const navBottom = document.querySelector('nav.bottom');
    if (header && filters && mapEl && navBottom) {
      const headerH = header.offsetHeight;
      const filtersH = filters.offsetHeight;
      const navH = navBottom.offsetHeight;
      filters.style.setProperty('top', headerH + 'px', 'important');
      document.documentElement.style.setProperty('--map-top', (headerH + filtersH) + 'px');
      document.documentElement.style.setProperty('--map-height', (window.innerHeight - headerH - filtersH - navH) + 'px');
    }
  }
  updateMapPosition();
  window.addEventListener('resize', updateMapPosition);
  window.addEventListener('orientationchange', updateMapPosition);

  // window.renderGroupView set by js/views/group-view.js
  // window.renderGFList set by js/views/gf-restaurants.js
  // window.allGlutenFreeShops written by gf-view.js
  window.allGlutenFreeShops = window.allGlutenFreeShops || [];

  // ---- Avatar generator ----
  window.createAvatarDataUrl = function (name) {
    const initials = (name || '').trim().substring(0, 2).toUpperCase() || '?';
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1f51ff'; ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(initials, 32, 34);
    return canvas.toDataURL('image/png');
  };

  // ---- Event delegation: inline notes textarea ----
  document.addEventListener('click', (e) => {
    if (e.target.id?.startsWith('add-note-btn-')) {
      const poiId = e.target.id.replace('add-note-btn-', '');
      const sec = document.getElementById(`notes-section-${poiId}`);
      if (sec) {
        sec.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <label style="font-size:12px;color:rgba(255,255,255,0.6);font-weight:600;letter-spacing:0.3px">📝 Note</label>
          </div>
          <textarea id="poi-note" placeholder="Es: Prenotare con 2 giorni di anticipo..." style="
            width:100%;padding:12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);
            border-radius:10px;font-size:13px;color:#fff;resize:vertical;min-height:70px;font-family:inherit;
            box-sizing:border-box;" onmouseover="this.style.borderColor='rgba(255,255,255,0.2)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.1)'"></textarea>`;
        setTimeout(() => sec.querySelector('textarea')?.focus(), 0);
      }
    }
  });

  // ---- Init sequence ----
  if (state.gpsCurrentLat && state.gpsCurrentLng) window.updateGPSMarker?.(state.gpsCurrentLat, state.gpsCurrentLng);
  if (state.gpsEnabled && !window.gpsWatchId) window.startGPS?.();
  setTimeout(() => { window.refreshGFPlacesLayer?.(); }, 1000);

  // ---- Expose to global scope ----
  window.addToItinerary = addToItinerary;
  window.removeFromItinerary = removeFromItinerary;
  window.updateItinerary = updateItinerary;
  window.isInItinerary = isInItinerary;
  window.generateRoomCode = generateRoomCode;
  window.peerGPS = peerGPS;
  console.log('[Giappone2027] Core initialized');

})();

/* ============================================================
   SERVICE WORKER REGISTRATION
   ============================================================ */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js')
    .then(reg => {
      console.log('[SW] ✅ Registered, scope:', reg.scope);
      reg.addEventListener('updatefound', () => {
        const sw = reg.installing;
        if (!sw) return;
        sw.addEventListener('statechange', () => {
          if (sw.state === 'installed' && navigator.serviceWorker.controller) {
            window.toast?.('🔄 Nuova versione disponibile — ricarica la pagina per aggiornare');
          }
        });
      });
    })
    .catch(err => console.error('[SW] ❌ Registration failed:', err.message));
} else {
  console.warn('[SW] ⚠️ Service Worker non supportato');
}

}); // close DOMContentLoaded

// Re-render active view on language change
document.addEventListener('langchange', () => {
  try {
    const active = document.querySelector('nav.bottom button.active');
    if (active?.dataset.view && active.dataset.view !== 'map') active.click();
  } catch (e) {}
});
