// ============================================================================
// global-search.js — Ricerca globale (lazy-loaded dal 🔍 in header o dal menu)
// Cerca tra: POI caricati (Google Places + custom), tappe itinerario.
// Deps (window.*): t, openSheet, closeSheet, state, allPOIs, openPOI,
//                  renderItineraryUnified
// API: window.openGlobalSearch()
// ============================================================================
(function () {
  'use strict';

  const T = (k, f) => (typeof window.t === 'function') ? window.t(k, f) : f;
  const MAX_RESULTS = 25;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function norm(s) { return String(s || '').toLowerCase(); }

  function search(q) {
    q = norm(q).trim();
    if (q.length < 2) return null;

    const pois = [];
    const seen = new Set();
    for (const p of (window.allPOIs?.() || [])) {
      if (!p || !p.id || seen.has(p.id)) continue;
      const hay = norm((p.name || p.title || '') + ' ' + (p.cat || '') + ' ' + (p.city || '') + ' ' + (p.address || ''));
      if (hay.includes(q)) { seen.add(p.id); pois.push(p); if (pois.length >= MAX_RESULTS) break; }
    }

    const stops = [];
    const byDay = window.state?.itineraryByDay || {};
    for (const d of Object.keys(byDay)) {
      for (const e of (byDay[d] || [])) {
        if (norm(e.poi_name).includes(q)) stops.push({ day: Number(d), entry: e });
        if (stops.length >= MAX_RESULTS) break;
      }
    }

    return { pois, stops };
  }

  function renderResults(res) {
    if (!res) {
      return `<div style="text-align:center; padding:24px; color:var(--l-faint); font-size:13px;">
        ${esc(T('gs.typeMore', 'Digita almeno 2 caratteri…'))}</div>`;
    }
    if (res.pois.length === 0 && res.stops.length === 0) {
      return `<div style="text-align:center; padding:24px; color:var(--l-muted); font-size:13px;">
        🤷 ${esc(T('gs.noResults', 'Nessun risultato'))}</div>`;
    }
    const section = (title, inner) => inner ? `
      <div style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;
                  color:var(--l-faint); margin:14px 4px 6px;">${esc(title)}</div>${inner}` : '';

    const poiBtns = res.pois.map(p => `
      <button class="gs-item" data-kind="poi" data-id="${esc(p.id)}" style="
        display:flex; align-items:center; gap:10px; width:100%; text-align:left;
        background:rgba(20,30,60,0.04); border:1px solid var(--l-hair);
        border-radius:10px; padding:10px 12px; color:var(--l-ink);
        font-size:13px; cursor:pointer; margin-bottom:6px;">
        <span>${p.gf || p.gluten_free ? '🌾' : '📍'}</span>
        <span style="flex:1;">${esc(p.name || p.title)}</span>
        ${p.cat ? `<span style="font-size:11px; color:var(--l-muted);">${esc(p.cat)}</span>` : ''}
      </button>`).join('');

    const stopBtns = res.stops.map(s => `
      <button class="gs-item" data-kind="stop" data-id="${esc(s.entry.poi_id || '')}" style="
        display:flex; align-items:center; gap:10px; width:100%; text-align:left;
        background:rgba(20,30,60,0.04); border:1px solid var(--l-hair);
        border-radius:10px; padding:10px 12px; color:var(--l-ink);
        font-size:13px; cursor:pointer; margin-bottom:6px;">
        <span>🗓️</span>
        <span style="flex:1;">${esc(s.entry.poi_name)}</span>
        <span style="font-size:11px; color:var(--l-accent);">${esc(T('tl.day', 'Giorno'))} ${s.day + 1}${s.entry.time ? ' · ' + esc(s.entry.time) : ''}</span>
      </button>`).join('');

    return section(T('gs.pois', 'Luoghi'), poiBtns) + section(T('gs.itinerary', 'Itinerario'), stopBtns);
  }

  function openGlobalSearch() {
    const html = `
      <div style="padding:2px;">
        <input id="gs-input" type="search" autocomplete="off"
          placeholder="${esc(T('gs.placeholder', 'Cerca luoghi, ristoranti GF, tappe…'))}"
          aria-label="${esc(T('gs.placeholder', 'Cerca luoghi, ristoranti GF, tappe…'))}"
          style="width:100%; box-sizing:border-box; padding:12px 14px; font-size:15px;
                 background:rgba(20,30,60,0.04); border:1px solid var(--l-hair);
                 border-radius:12px; color:var(--l-ink); outline:none;" />
        <div id="gs-results">${renderResults(null)}</div>
      </div>`;

    window.openSheet('🔍 ' + T('common.search', 'Cerca'), html);

    const input = document.getElementById('gs-input');
    const results = document.getElementById('gs-results');
    if (!input || !results) return;

    let timer = null;
    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => { results.innerHTML = renderResults(search(input.value)); }, 150);
    });

    results.addEventListener('click', (ev) => {
      const btn = ev.target.closest('.gs-item');
      if (!btn) return;
      const { kind, id } = btn.dataset;
      window.closeSheet?.();
      setTimeout(() => {
        if (kind === 'poi' && id) { window.openPOI?.(id); }
        else if (kind === 'stop') {
          const navBtn = document.querySelector('nav.bottom button[data-view="itinerary"]');
          if (navBtn) navBtn.click(); else window.renderItineraryUnified?.();
        }
      }, 150);
    });

    setTimeout(() => input.focus(), 250);
  }

  window.openGlobalSearch = openGlobalSearch;
})();
