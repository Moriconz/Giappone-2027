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

  // CATS + CITY_COORDS + CITIES → js/config.js (window.CATS, window.CITY_COORDS, window.CITIES)

  // State loaded + saved by js/state.js (window.state, window.saveState)
  const state = window.state;
  console.log('[State] Core init', { group: state.group });

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
    window.saveState?.();
    if (window.peerGPS?.broadcastItinerary) window.peerGPS.broadcastItinerary();
    return true;
  }
  function removeFromItinerary(id) {
    if (!state.itinerary) state.itinerary = [];
    const idx = state.itinerary.findIndex(e => e.id === id);
    if (idx === -1) return false;
    addTappaAuditEntry(state.itinerary[idx], 'removed', state.group?.myName || 'Unknown');
    state.itinerary.splice(idx, 1);
    window.saveState?.();
    if (window.peerGPS?.broadcastItinerary) window.peerGPS.broadcastItinerary();
    return true;
  }
  function updateItinerary(entries) { state.itinerary = entries || []; window.saveState?.(); }
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
