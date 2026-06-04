// ============================================================================
// map-markers.js — filtered, renderMarkers, updateFakePOIList, FAKE_POI_IDS
// Extracted from app-core.js. Deps (all window.*):
//   vectorSource, vectorLayer, map, state, allPOIs, haversineKm,
//   invalidatePOIsCache, renderFilters, getPoiDisplayName, POIVerifiedDB, ol.*
// ============================================================================
(function () {
  'use strict';

  function getGpsRadiusKm(zoom) {
    if (zoom < 5) return 25;
    if (zoom < 8) return 15;
    if (zoom < 10) return 8;
    if (zoom < 12) return 5;
    if (zoom < 14) return 3;
    return 2;
  }

  function filtered() {
    const allItems = window.allPOIs?.() || [];
    const state = window.state;
    return allItems.filter(p => {
      if (state.activeCat !== 'all' && p.cat !== state.activeCat) return false;
      const foodCats = ['food', 'market'];
      if (state.onlyGF && foodCats.includes(p.cat) && !(p.gf && (p.gf.lvl === 'full' || p.gf.lvl === 'partial'))) return false;
      if (state.onlyLocal && !p.local) return false;

      const minRating = state.minRating || 0;
      const rating = state.ratings?.[p.id] || 0;
      if (rating < minRating) return false;

      const maxBudget = state.maxBudget || 999999;
      if (p.ticket) {
        const match = p.ticket.match(/(\d+)/);
        if (match && parseInt(match[1], 10) > maxBudget) return false;
      }

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
        const accomCats = ['experience', 'onsen'];
        if (accomCats.includes(p.cat) && !matchesAccom) return false;
      }

      return true;
    });
  }

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
      renderMarkers();
    }
  }

  setInterval(updateFakePOIList, 3000);
  window.addEventListener('poi-sync-progress', () => { setTimeout(updateFakePOIList, 500); });

  function renderMarkers() {
    const t0 = performance.now();
    console.log(`%c[renderMarkers] START - Rendering markers on map`, 'background:#4A7C59;color:white;padding:4px 8px;border-radius:3px');
    window.invalidatePOIsCache?.();
    console.log('[renderMarkers] 🔄 Cache invalidated for fresh POI lookup');
    window.vectorSource.clear();
    const zoom = window.map.getView().getZoom() || 5;
    const state = window.state;

    let maxPOI;
    if (state.activeCat !== 'all') {
      maxPOI = Infinity;
      console.log('[renderMarkers] Categoria filtrata:', state.activeCat, '→ carica tutti');
    } else {
      maxPOI = zoom < 5 ? 150 : zoom < 8 ? 400 : zoom < 11 ? 2000 : zoom < 13 ? 8000 : Infinity;
    }
    console.log('[renderMarkers] zoom=' + zoom + ', maxPOI=' + maxPOI + ', vectorLayer exists=' + (window.vectorLayer ? 'YES' : 'NO'));

    let visibleFilter = () => true;
    if (state.gpsEnabled && state.gpsCurrentLat && state.gpsCurrentLng) {
      const radiusKm = getGpsRadiusKm(zoom);
      visibleFilter = p => p.fromGooglePlaces || window.haversineKm(state.gpsCurrentLat, state.gpsCurrentLng, p.lat, p.lng) <= radiusKm;
      console.log('[renderMarkers] GPS filter active (local POIs only, Google Places POIs shown always)');
    } else {
      const size = window.map.getSize();
      if (size) {
        const extent = window.map.getView().calculateExtent(size);
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

    const realPOIs = pois.filter(p => !FAKE_POI_IDS.has(p.id));
    console.log(`[renderMarkers] Filtered fake POIs: ${pois.length} → ${realPOIs.length}`);

    const toRender = maxPOI === Infinity ? realPOIs : realPOIs.slice(0, maxPOI);
    console.log('[renderMarkers] toRender:', toRender.length);

    let added = 0;
    toRender.forEach((p, idx) => {
      try {
        if (!p.lat || !p.lng || typeof p.lat !== 'number' || typeof p.lng !== 'number') {
          console.warn(`[renderMarkers] Invalid coords for ${p.name}: lat=${p.lat}, lng=${p.lng}`);
          return;
        }
        const feature = new ol.Feature({
          geometry: new ol.geom.Point(ol.proj.fromLonLat([p.lng, p.lat])),
          name: window.getPoiDisplayName?.(p) ?? p?.name ?? 'Punto di interesse',
          id: p.id,
          cat: p.cat || 'poi',
          lat: p.lat,
          lng: p.lng,
          isGF: p.gf?.lvl === 'full',
          gf: p.gf || {},
          paid: p.paid === true,
          indoor: p.indoor === true,
          family_friendly: p.family_friendly === true
        });
        window.vectorSource.addFeature(feature);
        added++;
        if (idx < 3) {
          console.log(`[renderMarkers] Sample POI #${idx + 1}: ${p.name} at (${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}), cat=${p.cat}, fromGoogle=${p.fromGooglePlaces}`);
        }
      } catch (e) {
        console.error('[renderMarkers] Error adding feature:', p.id, e);
      }
    });
    const t1 = performance.now();
    console.log(`%c[renderMarkers] ✅ DONE: added ${added} markers in ${(t1 - t0).toFixed(1)}ms | total on map: ${window.vectorSource.getFeatures().length}`, 'background:#4A7C59;color:white;padding:4px 8px;border-radius:3px');

    const emptyStateOverlay = document.getElementById('map-empty-state');
    if (added === 0) {
      if (emptyStateOverlay) {
        emptyStateOverlay.style.display = 'flex';
      } else {
        const overlay = document.createElement('div');
        overlay.id = 'map-empty-state';
        overlay.style.cssText = `
          position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(180deg, rgba(10,8,5,0.85), rgba(15,12,8,0.85));
          backdrop-filter: blur(3px); display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          z-index: 100; padding: 20px; border-radius: 12px; pointer-events: none;
        `;
        overlay.innerHTML = `
          <div style="text-align: center; pointer-events: auto;">
            <div style="font-size: 48px; margin-bottom: 16px;">🔍</div>
            <h2 style="font-size: 18px; font-weight: 700; color: rgba(255,255,255,0.95); margin: 0 0 8px 0;">Nessun POI trovato</h2>
            <p style="font-size: 14px; color: rgba(255,255,255,0.6); margin: 0 0 16px 0; line-height: 1.5; max-width: 240px;">Prova a cambiare i filtri o a zoomare fuori per vedere più posti.</p>
            <button id="map-empty-reset-filters" style="
              padding: 10px 20px; background: rgba(99,102,241,0.3);
              border: 1.5px solid rgba(99,102,241,0.6); border-radius: 20px;
              color: rgba(255,255,255,0.9); font-size: 13px; font-weight: 600;
              cursor: pointer; font-family: inherit;
            ">Resetta filtri</button>
          </div>
        `;
        const mapHost = document.getElementById('view-map') || document.getElementById('map');
        if (mapHost) {
          mapHost.appendChild(overlay);
          overlay.querySelector('#map-empty-reset-filters')?.addEventListener('click', () => {
            window.state.activeFilter = 'all';
            window.state.onlyLocal = false;
            window.state.showGFPlaces = false;
            window.renderFilters?.();
            renderMarkers();
          });
        }
      }
    } else if (emptyStateOverlay) {
      emptyStateOverlay.style.display = 'none';
    }
  }

  window.filtered = filtered;
  window.renderMarkers = renderMarkers;
})();
