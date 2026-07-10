// ============================================================================
// offline-region.js — Scarica una zona del viaggio per uso offline: tile
// mappa (nessuna copertura offline esisteva prima), posti GF e POI generali
// (cache già esistenti, qui solo pre-popolate su richiesta invece che
// visitando la zona in-app).
//
// Le zone sono quelle già calcolate da gf-view.js (window.GFView.zonesFromItinerary,
// stesso clustering ~25km della GF Guide) — MA le tile si scaricano sul
// bounding box reale delle tappe della zona + un margine, non sull'intero
// raggio di clustering: 25km a zoom street-level sarebbero ~15.000 tile per
// zona. Zoom z13-z15 (dettaglio "zona pedonale"), non oltre.
//
// API: window.OfflineRegion = { estimateZoneSize, downloadZone, getDownloadedZones }
//   window.openOfflineRegionPanel()
// ============================================================================
(function () {
  'use strict';

  const T = (k, f) => (typeof window.t === 'function') ? window.t(k, f) : f;
  const TILE_CACHE = 'giappone-2027-tiles-v1';
  const ZOOM_LEVELS = [13, 14, 15];
  const PADDING_KM = 1.5;
  const AVG_TILE_KB = 20;
  const STORAGE_KEY = 'offlineRegions_v1';

  function _esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function _lonToTileX(lon, z) { return Math.floor((lon + 180) / 360 * Math.pow(2, z)); }
  function _latToTileY(lat, z) {
    const rad = lat * Math.PI / 180;
    return Math.floor((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2 * Math.pow(2, z));
  }

  // Bounding box reale delle tappe della zona (non il raggio di clustering),
  // + un margine così le tile coprono anche i dintorni immediati di ogni tappa.
  function _bboxFromStops(stops, paddingKm) {
    const lats = stops.map(s => s.lat), lngs = stops.map(s => s.lng);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const avgLatRad = ((minLat + maxLat) / 2) * Math.PI / 180;
    const padLat = paddingKm / 111;
    const padLng = paddingKm / (111 * Math.max(0.1, Math.cos(avgLatRad)));
    return { minLat: minLat - padLat, maxLat: maxLat + padLat, minLng: minLng - padLng, maxLng: maxLng + padLng };
  }

  function _tileRange(bbox, zoom) {
    const minX = _lonToTileX(bbox.minLng, zoom), maxX = _lonToTileX(bbox.maxLng, zoom);
    // lat alta -> Y basso: maxLat determina minY
    const minY = _latToTileY(bbox.maxLat, zoom), maxY = _latToTileY(bbox.minLat, zoom);
    return { minX, maxX, minY, maxY };
  }

  function _tileUrls(zone) {
    const bbox = _bboxFromStops(zone.stops && zone.stops.length ? zone.stops : [{ lat: zone.lat, lng: zone.lng }], PADDING_KM);
    const urls = [];
    ZOOM_LEVELS.forEach(z => {
      const { minX, maxX, minY, maxY } = _tileRange(bbox, z);
      for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
          urls.push(`https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${z}/${y}/${x}`);
        }
      }
    });
    return urls;
  }

  function estimateZoneSize(zone) {
    const tileCount = _tileUrls(zone).length;
    return { tileCount, estimatedMB: Math.round((tileCount * AVG_TILE_KB / 1024) * 10) / 10 };
  }

  function _readRegions() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
  }
  function _saveRegions(regions) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(regions)); } catch { /* storage pieno, ignora */ }
  }
  function getDownloadedZones() { return _readRegions(); }

  async function downloadZone(zone, onProgress) {
    const { tileCount, estimatedMB } = estimateZoneSize(zone);

    // Quota storage: nessun precedente nel codebase (l'unico controllo
    // esistente è la soglia 4.5MB di state.js, solo sul blob localStorage,
    // non copre Cache Storage). Avviso non bloccante, non un veto.
    try {
      if (navigator.storage?.estimate) {
        const { quota, usage } = await navigator.storage.estimate();
        const freeMB = (quota - usage) / (1024 * 1024);
        if (freeMB < estimatedMB * 1.5) {
          window.toast?.(T('offline.lowStorage', `⚠️ Poco spazio libero (~${Math.round(freeMB)}MB): il download potrebbe non completarsi`));
        }
      }
    } catch (_) { /* storage API non disponibile, si prosegue comunque */ }

    // Quota API: scaricare una zona già in cache costa ~0 chiamate (le due
    // funzioni sotto fanno il loro check-prima-di-fetch), ma se è nuova
    // conviene avvisare prima di partire piuttosto che fermarsi a metà.
    const aq = window.ApiQuota;
    if (aq && aq.getCount('googlePlacesNearby') >= aq.getLimit('googlePlacesNearby')) {
      window.toast?.(T('offline.apiQuotaLow', '⚠️ Quota API POI esaurita per oggi: solo le tile mappa verranno scaricate'));
    }

    let done = 0;
    onProgress?.(0, tileCount);
    const cache = await caches.open(TILE_CACHE);
    const urls = _tileUrls(zone);
    for (const url of urls) {
      try { await cache.add(url); } catch (_) { /* singola tile fallita, si prosegue con le altre */ }
      done++;
      onProgress?.(done, tileCount);
    }

    // Posti GF e POI generali: funzioni già esistenti, stesso identico
    // meccanismo già usato navigando in-app (cache-check incluso). Un
    // fallimento qui (es. API non configurata) non deve bloccare il resto:
    // le tile sono già scaricate a prescindere.
    try { await window.loadGlutenFreeShopsForCity?.(zone.label, zone.lat, zone.lng); } catch (_) {}
    try { await window.loadNearbyPOIs?.(zone.lat, zone.lng); } catch (_) {}

    const regions = _readRegions();
    regions[zone.label] = { downloadedAt: Date.now(), estimatedMB, tileCount };
    _saveRegions(regions);

    return { ok: true, tileCount, estimatedMB };
  }

  function _renderZoneRow(zone) {
    const { estimatedMB } = estimateZoneSize(zone);
    const downloaded = _readRegions()[zone.label];
    const statusHTML = downloaded
      ? `<span style="font-size:13px;color:#15803d;font-weight:700;">✅ ${T('offline.downloaded', 'Scaricata')}</span>`
      : `<button class="offline-dl-btn" data-zone="${_esc(zone.label)}" style="padding:7px 14px;background:var(--l-accent);border:none;border-radius:8px;color:#fff;font-weight:700;font-size:13px;cursor:pointer;">📥 ${T('offline.download', 'Scarica')}</button>`;
    return `
      <div class="offline-zone-row" data-zone="${_esc(zone.label)}" style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:rgba(20,30,60,0.03);border:1px solid var(--l-hair);border-radius:9px;">
        <div style="flex:1;min-width:0;">
          <div style="font-weight:700;color:var(--l-ink);font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${_esc(zone.label)}</div>
          <div style="font-size:12px;color:var(--l-muted);">${zone.count} ${T('topt.stops', 'tappe')} · ~${estimatedMB}MB</div>
        </div>
        <div class="offline-zone-status">${statusHTML}</div>
      </div>`;
  }

  function openOfflineRegionPanel() {
    if (typeof window.openSheet !== 'function') return;
    const zones = window.GFView?.zonesFromItinerary?.() || [];

    if (!zones.length) {
      window.openSheet(T('offline.title', '📥 Scarica per offline'),
        `<div style="padding:24px 14px;text-align:center;color:var(--l-muted);font-size:15px;line-height:1.6;">
           <div style="font-size:34px;margin-bottom:8px;">🗺️</div>
           <p style="margin:0;">${T('offline.empty', 'Aggiungi tappe al tuo itinerario prima di scaricare regioni offline.')}</p>
         </div>`);
      return;
    }

    const html = `
      <div style="display:flex;flex-direction:column;gap:12px;padding:4px 0;">
        <p style="margin:0;color:var(--l-muted);font-size:14px;line-height:1.5;">
          ${T('offline.intro', 'Scarica mappa e posti GF di una zona per usarli senza connessione. Le zone sono le stesse della GF Guide.')}
        </p>
        <div style="display:flex;flex-direction:column;gap:8px;" id="offline-zone-list">
          ${zones.map(_renderZoneRow).join('')}
        </div>
      </div>
    `;
    window.openSheet(T('offline.title', '📥 Scarica per offline'), html);

    setTimeout(() => {
      document.querySelectorAll('.offline-dl-btn').forEach(btn => {
        btn.onclick = async () => {
          const label = btn.dataset.zone;
          const zone = zones.find(z => z.label === label);
          if (!zone) return;
          const statusEl = btn.closest('.offline-zone-row')?.querySelector('.offline-zone-status');
          await downloadZone(zone, (done, total) => {
            if (statusEl) statusEl.innerHTML = `<span style="font-size:13px;color:var(--l-muted);">⏳ ${done}/${total}</span>`;
          });
          if (statusEl) statusEl.innerHTML = `<span style="font-size:13px;color:#15803d;font-weight:700;">✅ ${T('offline.downloaded', 'Scaricata')}</span>`;
          window.toast?.('📥 ' + T('offline.done', 'Zona scaricata'));
        };
      });
    }, 40);
  }

  window.OfflineRegion = { estimateZoneSize, downloadZone, getDownloadedZones };
  window.openOfflineRegionPanel = openOfflineRegionPanel;
})();
