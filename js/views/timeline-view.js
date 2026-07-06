// ============================================================================
// timeline-view.js — Vista timeline multi-giorno del viaggio (lazy-loaded)
// Panoramica verticale di tutti i giorni con le tappe in ordine orario.
// Deps (window.*): t, openSheet, state, allPOIs, openPOI
// API: window.renderTimelineView()
// ============================================================================
(function () {
  'use strict';

  const T = (k, f) => (typeof window.t === 'function') ? window.t(k, f) : f;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // Data del giorno N a partire da tripProfile.startDate (se presente)
  function dayDate(dayIdx) {
    const start = window.state?.tripProfile?.startDate;
    if (!start) return null;
    const d = new Date(start + 'T00:00:00');
    if (isNaN(d)) return null;
    d.setDate(d.getDate() + Number(dayIdx));
    const lang = window.I18N?.lang || document.documentElement.lang || 'it';
    try {
      return d.toLocaleDateString(lang === 'ja' ? 'ja-JP' : (lang === 'en' ? 'en-GB' : 'it-IT'),
        { weekday: 'short', day: 'numeric', month: 'short' });
    } catch (e) { return d.toISOString().slice(0, 10); }
  }

  function resolveName(entry) {
    if (entry.poi_name) return entry.poi_name;
    const poi = (window.allPOIs?.() || []).find(p => p.id === entry.poi_id);
    return poi ? (poi.name || poi.title) : (T('tl.unknown', 'Tappa'));
  }

  // Indice del giorno che corrisponde a OGGI, se tripProfile.startDate è nota
  function todayDayIndex() {
    const start = window.state?.tripProfile?.startDate;
    if (!start) return null;
    const s = new Date(start + 'T00:00:00');
    if (isNaN(s)) return null;
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const diffDays = Math.round((now - s) / 86400000);
    return diffDays >= 0 ? diffDays : null;
  }

  // Prossima tappa non ancora iniziata nel giorno di oggi, con countdown "tra Xh Ym"
  function nextStopCountdown(entries) {
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    for (const e of entries) {
      const m = /^(\d{1,2}):(\d{2})$/.exec(e.time || '');
      if (!m) continue;
      const stopMin = Number(m[1]) * 60 + Number(m[2]);
      if (stopMin >= nowMin) {
        const delta = stopMin - nowMin;
        const h = Math.floor(delta / 60), mm = delta % 60;
        return { poi_id: e.poi_id, label: h > 0 ? `tra ${h}h${mm ? ' ' + mm + 'm' : ''}` : `tra ${mm}m` };
      }
    }
    return null;
  }

  function renderTimelineView() {
    const byDay = window.state?.itineraryByDay || {};
    const days = Object.keys(byDay)
      .map(Number)
      .filter(d => Array.isArray(byDay[d]) && byDay[d].length > 0)
      .sort((a, b) => a - b);

    let html;
    if (days.length === 0) {
      html = `
        <div style="text-align:center; padding:40px 20px; color:var(--l-muted);">
          <div style="font-size:40px; margin-bottom:12px;">🗓️</div>
          <div style="font-size:16px;">${esc(T('tl.empty', 'Nessuna tappa in itinerario. Aggiungi tappe dai POI sulla mappa!'))}</div>
        </div>`;
    } else {
      const todayIdx = todayDayIndex();
      const blocks = days.map(d => {
        const isToday = d === todayIdx;
        const entries = [...byDay[d]].sort((a, b) => String(a.time || '99:99').localeCompare(String(b.time || '99:99')));
        const totMin = entries.reduce((s, e) => s + (Number(e.duration) || 0), 0);
        const dateStr = dayDate(d);
        const next = isToday ? nextStopCountdown(entries) : null;
        const stops = entries.map(e => {
          const status = e.status === 'done' ? '✅' : (e.status === 'approved' ? '👍' : '');
          const isNext = next && e.poi_id === next.poi_id;
          return `
            <button class="tl-stop" data-poi="${esc(e.poi_id || '')}" style="
              display:flex; align-items:center; gap:10px; width:100%; text-align:left;
              background:${isNext ? 'var(--l-accent-soft)' : 'rgba(20,30,60,0.04)'};
              border:1px solid ${isNext ? 'var(--l-accent-brd)' : 'var(--l-hair)'};
              border-radius:10px; padding:10px 12px; color:var(--l-ink);
              font-size:15px; cursor:pointer; margin-bottom:6px;">
              <span style="min-width:46px; font-weight:700; color:var(--l-accent); font-size:14px;">${esc(e.time || '—')}</span>
              <span style="flex:1;">${esc(resolveName(e))}</span>
              ${isNext ? `<span style="font-size:13px; font-weight:700; color:var(--l-accent);">⏱ ${esc(next.label)}</span>` : ''}
              ${e.duration ? `<span style="font-size:13px; color:var(--l-muted);">${esc(e.duration)} ${esc(T('tl.min', 'min'))}</span>` : ''}
              ${status ? `<span>${status}</span>` : ''}
            </button>`;
        }).join('');
        return `
          <div style="position:relative; padding-left:22px; margin-bottom:18px;">
            <div style="position:absolute; left:6px; top:8px; bottom:-10px; width:2px; background:var(--l-hair);"></div>
            <div style="position:absolute; left:0; top:4px; width:14px; height:14px; border-radius:50%;
                        background:var(--l-accent); border:3px solid #fff;"></div>
            <div style="display:flex; align-items:baseline; gap:8px; margin-bottom:8px;">
              <span style="font-weight:800; font-size:15px; color:var(--l-ink);">${esc(T('tl.day', 'Giorno'))} ${d + 1}</span>
              ${isToday ? `<span style="font-size:12px; font-weight:700; color:#fff; background:var(--l-accent); padding:2px 8px; border-radius:999px;">${esc(T('tl.today', 'OGGI'))}</span>` : ''}
              ${dateStr ? `<span style="font-size:14px; color:var(--l-muted);">${esc(dateStr)}</span>` : ''}
              <span style="margin-left:auto; font-size:13px; color:var(--l-faint);">
                ${entries.length} ${esc(T('tl.stops', 'tappe'))}${totMin ? ` · ~${Math.round(totMin / 60 * 10) / 10}h` : ''}
              </span>
            </div>
            ${stops}
          </div>`;
      }).join('');
      html = `<div style="padding:4px 2px;">${blocks}</div>`;
    }

    window.openSheet(T('tl.title', '🗓️ Timeline viaggio'), html);

    // Click su una tappa → apri il POI
    document.querySelectorAll('.tl-stop').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.poi;
        if (id) { window.closeSheet?.(); setTimeout(() => window.openPOI?.(id), 150); }
      });
    });
  }

  window.renderTimelineView = renderTimelineView;
})();
