// ============================================================================
// gf-restaurants.js — renderGFList, openGFDetail
// Extracted from app-core.js. Deps (all window.*):
//   state, haversineKm, fmtDist, openSheet
//
// Nessun elenco locali scritto a mano: ogni voce arriva da fonti live.
//   - window.allGlutenFreeShops: Google Places Text Search live, popolato da
//     gf-view.js via /api/searchGlutenFreeShops (quota-gated, vedi
//     js/api-quota.js — 2 chiamate/giorno, 5 TextSearch l'una).
//   - window.GFPlaces.getAll(): derivato dal review-scan live per-POI
//     (js/services/gfDetector.js) + eventuali aggiunte manuali utente/gruppo.
//     Zero chiamate API aggiuntive (riusa solo cache già scritta altrove).
// ============================================================================
(function () {
  'use strict';

  // r.name (window.allGlutenFreeShops, Google Places textSearch) finisce in
  // innerHTML: va HTML-escapato. Riusa window.escapeHtml (js/ui-helpers.js),
  // pattern già in poi-detail-template.js.
  const _esc = window.escapeHtml || (s => String(s ?? ''));

  // Badge sicurezza GF — stesso pattern/dicitura di gf-places-panel.js (safety_level
  // GREEN/YELLOW/RED). Se il dato manca (es. locali da Google Places, che non hanno
  // safety_level), mostra un badge esplicito "non verificato" invece di ometterlo:
  // un celiaco non deve pensare che l'assenza di badge significhi "sicuro".
  function _safetyBadge(level) {
    const style = level === 'GREEN' ? 'background:rgba(127,255,127,0.2);color:#7FFF7F'
      : level === 'YELLOW' ? 'background:rgba(255,215,0,0.2);color:#FFD700'
      : level === 'RED' ? 'background:rgba(255,107,107,0.2);color:#FF6B6B'
      : 'background:rgba(148,163,184,0.2);color:#94a3b8';
    const label = level === 'GREEN' ? '🟢 SAFE' : level === 'YELLOW' ? '🟡 CAUTION' : level === 'RED' ? '🔴 DANGER' : '⚪ Sicurezza non verificata';
    return `<div style="display:inline-block;padding:4px 8px;border-radius:4px;font-size:13px;font-weight:700;${style};">${label}</div>`;
  }

  function _liveItems() {
    const google = (window.allGlutenFreeShops || []).map(r => ({ ...r, id: r.place_id || r.id, source: 'google' }));
    const detected = (typeof window.GFPlaces?.getAll === 'function') ? window.GFPlaces.getAll() : [];
    // Dedup per id: preferisci la voce Google (più dati) se un posto compare in entrambe
    const seen = new Set(google.map(g => g.id));
    return [...google, ...detected.filter(d => !seen.has(d.id))];
  }

  function renderGFList(city, searchText, chipLat, chipLng) {
    const container = document.getElementById("gf-list-sheet") || document.getElementById("gf-list");
    if (!container) return;

    const gps = window.state?.gpsCurrentLat && window.state?.gpsCurrentLng
      ? { lat: window.state.gpsCurrentLat, lng: window.state.gpsCurrentLng } : null;

    let items = _liveItems().map(r => ({
      ...r,
      distance: (gps && typeof r.lat === 'number' && typeof r.lng === 'number')
        ? window.haversineKm(gps.lat, gps.lng, r.lat, r.lng) : null
    }));

    // Le chip sono zone geo-derivate dall'itinerario (label = nome di una
    // tappa qualsiasi entro 25km, non un nome di città reale) — filtra per
    // prossimità (stesso raggio 25km del location bias server-side in
    // api/searchGlutenFreeShops.js), non per uguaglianza stringa su r.city,
    // altrimenti i locali trovati (r.city reale, es. "Tokyo") non
    // corrisponderebbero mai alla label della zona.
    let filtered = items;
    if (city && city !== "all") {
      const hasCoords = typeof chipLat === 'number' && typeof chipLng === 'number' && !Number.isNaN(chipLat) && !Number.isNaN(chipLng);
      filtered = hasCoords
        ? items.filter(r => typeof r.lat === 'number' && typeof r.lng === 'number' && window.haversineKm(chipLat, chipLng, r.lat, r.lng) <= 25)
        : items.filter(r => r.city === city); // fallback: nessuna coordinata nota per la chip
    }
    if (searchText) {
      const q = searchText.toLowerCase();
      filtered = filtered.filter(r => (r.name || '').toLowerCase().includes(q));
    }

    filtered.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));

    const discoverUrl = `https://www.findmeglutenfree.com/map#loc=${encodeURIComponent((city && city !== 'all') ? city + ', Japan' : 'Japan')}`;

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 24px;text-align:center;min-height:200px;">
          <div style="font-size:44px;margin-bottom:14px;">🌾</div>
          <div style="font-size:15px;font-weight:700;color:var(--l-ink);margin:0 0 6px;">Nessun locale gluten-free trovato qui</div>
          <p style="font-size:14px;color:var(--l-muted);margin:0 0 16px;max-width:280px;">I dati sono live (Google Places + rilevamento recensioni) — se la zona non è ancora stata cercata, prova un'altra città o cerca manualmente.</p>
          <a href="${discoverUrl}" target="_blank" rel="noopener noreferrer" style="
            display:inline-block;padding:10px 18px;background:rgba(74,222,128,0.14);
            border:1.5px solid rgba(74,222,128,0.4);border-radius:10px;color:#16a34a;
            font-size:15px;font-weight:700;text-decoration:none;">🔍 Cerca su Find Me Gluten Free</a>
        </div>`;
      return;
    }

    const html = filtered.map(r => {
      const metaParts = [r.city, r.rating ? `⭐ ${r.rating}${r.review_count ? ` (${r.review_count})` : ''}` : null].filter(Boolean);
      const distChip = (r.distance != null) ? `<span style="flex-shrink:0;padding:3px 9px;border-radius:999px;background:rgba(74,222,128,0.14);border:1px solid rgba(74,222,128,0.35);color:#16a34a;font-size:13px;font-weight:700;">${window.fmtDist(r.distance)}</span>` : '';
      const address = r.desc || r.address || '';
      const mapsUrl = r.google_maps_url || r.maps_url || `https://maps.google.com/?q=${encodeURIComponent(r.name)}`;

      const sourceLabel = r.source === 'google'
        ? '📍 Google Places'
        : '💬 Rilevato da recensioni — verifica sul posto';

      return `
        <div data-gf-id="${r.id}" style="
          padding:14px;background:var(--l-glass);border:1px solid var(--l-border);
          border-radius:14px;display:flex;flex-direction:column;gap:8px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
            <div style="min-width:0;">
              <div style="font-size:16px;font-weight:700;color:var(--l-ink);">${_esc(r.name)}</div>
              ${metaParts.length ? `<div style="font-size:14px;color:var(--l-muted);margin-top:2px;">${metaParts.join(' · ')}</div>` : ''}
            </div>
            ${distChip}
          </div>
          ${_safetyBadge(r.safety_level)}
          ${address ? `<div style="font-size:13px;color:var(--l-faint);">${address}</div>` : ''}
          <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" style="
            display:block;text-align:center;padding:9px 12px;background:rgba(74,222,128,0.12);
            border:1px solid rgba(74,222,128,0.35);border-radius:9px;color:#16a34a;
            font-size:14px;font-weight:700;text-decoration:none;">🗺️ Apri in Maps</a>
          <div style="font-size:12px;color:var(--l-faint);text-align:center;">${sourceLabel}</div>
        </div>`;
    }).join('');

    container.innerHTML = `<div style="display:flex;flex-direction:column;gap:10px;">${html}</div>`;
    container.querySelectorAll('[data-gf-id]').forEach(el => {
      el.style.cursor = 'pointer';
      el.addEventListener('click', (e) => {
        if (e.target.closest('a')) return; // non intercettare i link
        openGFDetail(el.dataset.gfId);
      });
    });
  }

  function openGFDetail(id) {
    const r = _liveItems().find(x => x.id === id);
    if (!r) return;
    const address = r.desc || r.address || '';
    const mapsUrl = r.google_maps_url || r.maps_url || `https://maps.google.com/?q=${encodeURIComponent(r.name)}`;
    const meta = [r.city, r.rating ? `⭐ ${r.rating}` : null].filter(Boolean).join(' · ');
    const sourceLabel = r.source === 'google'
      ? 'Dati live da Google Places.'
      : 'Rilevato da uno scan live delle recensioni — verifica sempre sul posto, non è una conferma certificata.';
    const html = `
      <div class="section">
        <h2 style="margin:0 0 6px;font-size:18px;">${_esc(r.name)}</h2>
        <div style="font-size:15px;color:var(--muted);">${meta}</div>
        <div style="margin-top:8px;">${_safetyBadge(r.safety_level)}</div>
      </div>
      <div class="section">
        ${address ? `<p style="margin:0 0 8px;font-size:15px;color:var(--muted);">${address}</p>` : ''}
        <p style="margin:0;font-size:14px;color:var(--muted);">${sourceLabel}</p>
      </div>
      <div class="section" style="display:flex;gap:10px;flex-wrap:wrap;">
        <a class="btn primary" href="${mapsUrl}" target="_blank" rel="noopener">🗺️ Apri in Maps</a>
      </div>
    `;
    window.openSheet(r.name, html);
  }

  window.renderGFList = renderGFList;
  window.openGFDetail = openGFDetail;
})();
