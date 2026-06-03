/**
 * itinerary-suggest.js — Suggerimenti contestuali di completamento itinerario
 *
 * Risponde a §6.2: "ti restano N ore libere il Day X, ecco cosa proporrei nelle
 * vicinanze". Analisi 100% locale (offline, testabile) — non dipende da Groq:
 *
 *   1. Per ogni giorno calcola il TEMPO LIBERO = finestra giornaliera (12h)
 *      − (somma durate tappe + tempi di spostamento stimati).
 *   2. Per i giorni con tempo libero significativo, trova POI vicini al
 *      baricentro del giorno, NON già in itinerario, con coordinate.
 *   3. Ranking: bonus GF-friendly + rating + vicinanza al baricentro.
 *   4. UI: lista suggerimenti con "➕ aggiungi al Day N".
 *
 * (Arricchimento AI via Groq possibile in futuro: l'endpoint /api/groqAnalyze è
 *  hard-wired sui menu; servirebbe un endpoint generico. Predisposto ma non
 *  richiesto — l'euristica locale copre il caso d'uso senza chiavi server.)
 *
 * Esposto:
 *   - window.ItinerarySuggest = { analyze, suggestForDay, openPanel }
 *   - window.openItinerarySuggest()
 *
 * Dipendenze (window): state.itineraryByDay, tripProfile.days, ROUTING,
 *   allPOIs, getPoiDisplayName, ITINERARY.addPOIToDay, openSheet, toast, t,
 *   renderItineraryUnified.
 */
(function () {
  'use strict';

  const T = (k, f) => (typeof window.t === 'function') ? window.t(k, f) : f;
  const DAY_WINDOW_MIN = 12 * 60; // 9:00–21:00 = 12h disponibili
  const SUGGEST_RADIUS_KM = 6;
  const MIN_FREE_MIN = 120; // mostra suggerimenti se ≥ 2h libere

  function _pois() { return (typeof window.allPOIs === 'function') ? window.allPOIs() : []; }

  function _coordOf(entry, pois) {
    if (entry && typeof entry.lat === 'number' && typeof entry.lng === 'number') return [entry.lat, entry.lng];
    const p = pois.find(x => x.id === entry.poi_id || x.googlePlaceId === entry.poi_id);
    return (p && typeof p.lat === 'number' && typeof p.lng === 'number') ? [p.lat, p.lng] : null;
  }

  function _km(a, b) {
    const R = window.ROUTING;
    if (R?.estimateDistanceHaversine) return R.estimateDistanceHaversine(a[0], a[1], b[0], b[1]);
    const toRad = x => x * Math.PI / 180, Rk = 6371;
    const dLat = toRad(b[0] - a[0]), dLng = toRad(b[1] - a[1]);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
    return Rk * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  // Set di poi_id già presenti in qualsiasi giorno (per escludere duplicati)
  function _inItinerary() {
    const ids = new Set();
    const ibd = window.state?.itineraryByDay || {};
    Object.values(ibd).forEach(day => (day || []).forEach(e => { if (e.poi_id) ids.add(e.poi_id); }));
    return ids;
  }

  // Tempo libero + baricentro per ogni giorno
  function analyze() {
    const tripDays = Math.max(1, Number(window.state?.tripProfile?.days) || Object.keys(window.state?.itineraryByDay || {}).length || 8);
    const ibd = window.state?.itineraryByDay || {};
    const pois = _pois();
    const R = window.ROUTING;
    const days = [];

    for (let d = 0; d < tripDays; d++) {
      const entries = ibd[d] || [];
      let occupied = 0;
      let sumLat = 0, sumLng = 0, n = 0;
      for (let i = 0; i < entries.length; i++) {
        occupied += entries[i].duration || 60;
        const c = _coordOf(entries[i], pois);
        if (c) { sumLat += c[0]; sumLng += c[1]; n++; }
        // travel verso la prossima
        if (i < entries.length - 1) {
          const a = _coordOf(entries[i], pois), b = _coordOf(entries[i + 1], pois);
          if (a && b && R) {
            const dist = _km(a, b);
            occupied += R.estimateDuration ? R.estimateDuration(dist, R.suggestMode ? R.suggestMode(dist) : 'transit') / 60 : 0;
          }
        }
      }
      const free = Math.max(0, DAY_WINDOW_MIN - Math.round(occupied));
      days.push({
        dayIdx: d,
        count: entries.length,
        occupiedMin: Math.round(occupied),
        freeMin: free,
        centroid: n ? [sumLat / n, sumLng / n] : null
      });
    }
    return days;
  }

  // Suggerimenti per un giorno: POI vicini al baricentro, non in itinerario, rankati
  function suggestForDay(dayIdx, limit = 5) {
    const days = analyze();
    const day = days.find(d => d.dayIdx === dayIdx);
    if (!day || !day.centroid) return [];

    const inItin = _inItinerary();
    const pois = _pois();

    const candidates = pois
      .filter(p => typeof p.lat === 'number' && typeof p.lng === 'number')
      .filter(p => !inItin.has(p.id) && !inItin.has(p.googlePlaceId))
      .map(p => {
        const dist = _km(day.centroid, [p.lat, p.lng]);
        return { poi: p, dist };
      })
      .filter(c => c.dist <= SUGGEST_RADIUS_KM);

    // Score: vicinanza (peso forte) + rating + bonus GF
    candidates.forEach(c => {
      const proximity = 1 / (1 + c.dist); // 0..1
      const rating = (c.poi.rating || 0) / 5; // 0..1
      const gfBonus = _isGF(c.poi) ? 0.4 : 0;
      c.score = proximity * 0.5 + rating * 0.3 + gfBonus;
    });

    candidates.sort((a, b) => b.score - a.score);
    return candidates.slice(0, limit).map(c => ({
      poi: c.poi,
      dist: c.dist,
      isGF: _isGF(c.poi),
      name: (typeof window.getPoiDisplayName === 'function') ? window.getPoiDisplayName(c.poi) : (c.poi.name || c.poi.id)
    }));
  }

  function _isGF(p) {
    const cat = (p.cat || '').toLowerCase();
    const lvl = (p.safety_level || p.gfStatus || '').toString().toLowerCase();
    if (lvl.includes('green') || lvl.includes('full') || lvl.includes('gf')) return true;
    return cat.includes('restaurant') || cat.includes('cafe') || cat.includes('food');
  }

  // ─── UI ──────────────────────────────────────────────────────────────

  function _esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function _fmtFree(min) {
    const h = Math.floor(min / 60), m = min % 60;
    return h > 0 ? `${h}h${m ? ' ' + m + 'm' : ''}` : `${m}m`;
  }

  function openPanel() {
    if (typeof window.openSheet !== 'function') return;
    const days = analyze().filter(d => d.count > 0); // solo giorni con almeno una tappa (serve baricentro)

    if (days.length === 0) {
      window.openSheet(T('sugg.title', '✨ Suggerimenti'),
        `<div style="padding:24px 14px;text-align:center;color:rgba(255,255,255,0.6);font-size:13px;line-height:1.6;">
           <div style="font-size:34px;margin-bottom:8px;">🗺️</div>
           <p style="margin:0;">${T('sugg.empty', 'Aggiungi qualche tappa con posizione: poi ti suggerirò cosa fare nel tempo libero.')}</p>
         </div>`);
      return;
    }

    // Ordina i giorni per tempo libero decrescente
    const ranked = days.slice().sort((a, b) => b.freeMin - a.freeMin);

    const blocks = ranked.map(day => {
      const free = day.freeMin;
      const hasFree = free >= MIN_FREE_MIN;
      const suggestions = hasFree ? suggestForDay(day.dayIdx, 4) : [];
      const freeColor = free >= 240 ? '#7fe2a9' : free >= MIN_FREE_MIN ? '#ffc97a' : 'rgba(255,255,255,0.5)';

      const suggList = suggestions.length ? suggestions.map(s => `
        <div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-top:1px solid rgba(255,255,255,0.06);">
          <span style="font-size:15px;flex-shrink:0;">${s.isGF ? '🌾' : '📍'}</span>
          <div style="flex:1;min-width:0;">
            <div style="font-size:13px;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${_esc(s.name)}</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.5);">${s.dist.toFixed(1)} km${s.poi.rating ? ' · ⭐ ' + s.poi.rating : ''}${s.isGF ? ' · GF' : ''}</div>
          </div>
          <button data-sugg-add="${_esc(s.poi.id || s.poi.googlePlaceId)}" data-sugg-day="${day.dayIdx}" data-sugg-name="${_esc(s.name)}" data-sugg-lat="${s.poi.lat}" data-sugg-lng="${s.poi.lng}" style="
            flex-shrink:0;padding:6px 11px;background:rgba(76,175,80,0.22);border:1.5px solid rgba(76,175,80,0.5);
            border-radius:7px;color:#fff;font-size:12px;font-weight:600;cursor:pointer;">➕ Day ${day.dayIdx + 1}</button>
        </div>
      `).join('') : `<div style="font-size:12px;color:rgba(255,255,255,0.45);padding:6px 0;">${hasFree ? T('sugg.noNearby', 'Nessun POI vicino non ancora in itinerario.') : T('sugg.dayFull', 'Giornata piena, poco tempo libero.')}</div>`;

      return `
        <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:11px;padding:12px 14px;">
          <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px;">
            <span style="font-weight:700;color:#fff;font-size:13.5px;">📅 ${T('topt.day', 'Giorno')} ${day.dayIdx + 1}</span>
            <span style="font-size:12px;color:${freeColor};font-weight:600;">⏳ ${_fmtFree(free)} ${T('sugg.free', 'liberi')}</span>
          </div>
          ${suggList}
        </div>`;
    }).join('');

    const html = `
      <div style="display:flex;flex-direction:column;gap:12px;padding:4px 0;">
        <p style="margin:0;color:rgba(255,255,255,0.7);font-size:12.5px;line-height:1.5;">
          ${T('sugg.intro', 'In base al tempo libero di ogni giorno, ecco POI vicini (entro 6 km dal baricentro del giorno) non ancora nel tuo itinerario. 🌾 = opzione gluten-free.')}
        </p>
        <div style="display:flex;flex-direction:column;gap:10px;">${blocks}</div>
      </div>
    `;
    window.openSheet(T('sugg.title', '✨ Suggerimenti'), html);

    setTimeout(() => {
      document.querySelectorAll('[data-sugg-add]').forEach(btn => {
        btn.onclick = () => {
          const id = btn.getAttribute('data-sugg-add');
          const dayIdx = Number(btn.getAttribute('data-sugg-day'));
          const name = btn.getAttribute('data-sugg-name');
          const lat = parseFloat(btn.getAttribute('data-sugg-lat'));
          const lng = parseFloat(btn.getAttribute('data-sugg-lng'));
          if (typeof window.ITINERARY?.addPOIToDay === 'function') {
            const ok = window.ITINERARY.addPOIToDay(id, name, dayIdx, '10:00', 60, '', 0, 'altro',
              isNaN(lat) ? null : lat, isNaN(lng) ? null : lng);
            if (ok) {
              window.saveState?.();
              if (window.toast) window.toast('✅ ' + name + ' → Day ' + (dayIdx + 1));
              btn.textContent = '✓';
              btn.disabled = true;
              btn.style.opacity = '0.6';
              window.renderItineraryUnified?.();
            }
          }
        };
      });
    }, 40);
  }

  window.ItinerarySuggest = { analyze, suggestForDay, openPanel };
  window.openItinerarySuggest = openPanel;
})();
