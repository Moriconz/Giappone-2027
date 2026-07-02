/**
 * jr-pass-calculator.js — Conviene comprare il Japan Rail Pass?
 *
 * Calcola la spesa stimata in trasporti del viaggio personale e la confronta
 * con i prezzi del Japan Rail Pass (Ordinary, post-aumento ottobre 2023).
 *
 * Logica:
 *   1. Itera tutte le tratte consecutive (POI_n → POI_n+1) di ogni giorno,
 *      usando `entry.lat`/`entry.lng` se disponibili (fallback su allPOIs).
 *   2. Per ogni tratta classifica:
 *      - >= 50 km   → "shinkansen" (intercity, ~25¥/km).
 *        Coperto al 100% dal JR Pass.
 *      - 2-50 km    → "transit" urbano. Coperto al ~50% dal JR Pass
 *        (JR Yamanote/Chuo/Saikyo sì, Tokyo Metro/Toei no).
 *      - < 2 km     → "walking", 0¥.
 *   3. Per ciascun pass (7/14/21 gg) calcola:
 *      - se la durata del viaggio è coperta o richiede integrazione
 *      - risparmio netto = costo JR-coverable − prezzo pass
 *   4. Restituisce raccomandazione (pass che massimizza il risparmio).
 *
 * Esposto come:
 *   - window.JRPassCalculator.compute()      → struct con il risultato
 *   - window.openJRPassPanel()              → apre il panel UI
 *
 * Disclaimer: stime euristiche, non sostituiscono il calcolatore ufficiale
 * (jrpass.com, smartex.jp). Mostra "Stime approssimative ±20%" nel panel.
 *
 * Dipendenze esterne (tutte su window):
 *   - window.state.itineraryByDay, window.state.tripProfile?.days
 *   - window.ROUTING.estimateDistanceHaversine, .estimateFare, .suggestMode
 *   - window.allPOIs? (fallback per lat/lng se non in entry)
 *   - window.openSheet, window.toast, window.t
 */
(function () {
  'use strict';

  // Prezzi Ordinary JR Pass, ottobre 2023 (post-aumento +70%)
  const PASSES = [
    { days: 7,  price: 50000, name: '7 giorni' },
    { days: 14, price: 80000, name: '14 giorni' },
    { days: 21, price: 100000, name: '21 giorni' }
  ];

  // Quanto del transit urbano è in pratica JR-coverable. Stima media
  // (Tokyo: ~50% JR Yamanote/Chuo/Saikyo, Kyoto/Osaka: ~30%, altre: variabile).
  const URBAN_JR_COVERAGE = 0.5;

  function _resolveCoord(entry) {
    if (entry && typeof entry.lat === 'number' && typeof entry.lng === 'number') {
      return [entry.lat, entry.lng];
    }
    if (typeof window.allPOIs === 'function' && entry?.poi_id) {
      const pois = window.allPOIs();
      const found = pois.find(p => p.id === entry.poi_id || p.googlePlaceId === entry.poi_id);
      if (found && typeof found.lat === 'number' && typeof found.lng === 'number') {
        return [found.lat, found.lng];
      }
    }
    return null;
  }

  function compute() {
    const ibd = window.state?.itineraryByDay || {};
    const tripDays = Math.max(1, Number(window.state?.tripProfile?.days) || Object.keys(ibd).length || 8);
    const R = window.ROUTING;

    if (!R || typeof R.estimateDistanceHaversine !== 'function') {
      return { ok: false, error: 'routing-missing' };
    }

    let totalKm = 0;
    let totalFareYen = 0;
    let jrCoverableYen = 0;
    let shinkansenKm = 0;
    let urbanKm = 0;
    let segmentsCount = 0;
    let segmentsCovered = 0;
    const days = Object.keys(ibd).map(Number).sort((a, b) => a - b);

    days.forEach(dayIdx => {
      const entries = (ibd[dayIdx] || []).filter(e => e && (e.lat != null || e.poi_id));
      for (let i = 0; i < entries.length - 1; i++) {
        const a = _resolveCoord(entries[i]);
        const b = _resolveCoord(entries[i + 1]);
        if (!a || !b) continue;
        const km = R.estimateDistanceHaversine(a[0], a[1], b[0], b[1]);
        if (km < 0.3) continue; // tratta trascurabile
        const mode = R.suggestMode ? R.suggestMode(km) : (km >= 50 ? 'driving' : km < 2 ? 'walking' : 'transit');
        const fare = typeof R.estimateFare === 'function' ? R.estimateFare(km, mode) : 0;

        totalKm += km;
        totalFareYen += fare;
        segmentsCount++;

        if (mode === 'walking' || km < 0.3) continue;

        if (km >= 50) {
          shinkansenKm += km;
          jrCoverableYen += fare; // 100% coperto
          segmentsCovered++;
        } else {
          urbanKm += km;
          jrCoverableYen += fare * URBAN_JR_COVERAGE;
          if (URBAN_JR_COVERAGE >= 0.5) segmentsCovered++;
        }
      }
    });

    // Round per leggibilità
    const round10 = v => Math.round(v / 10) * 10;

    const recommendations = PASSES.map(p => {
      // Se il viaggio dura più del pass: il pass copre solo `p.days/tripDays` del costo
      const coverageRatio = Math.min(1, p.days / tripDays);
      const effectiveCoveredYen = jrCoverableYen * coverageRatio;
      const savings = effectiveCoveredYen - p.price;
      return {
        days: p.days,
        name: p.name,
        price: p.price,
        coverageRatio,
        effectiveCoveredYen: round10(effectiveCoveredYen),
        savings: Math.round(savings),
        worthIt: savings > 0
      };
    });

    // Best = pass con savings massimo (ma deve essere >0 per "worthIt")
    const best = recommendations.reduce(
      (acc, r) => (r.savings > acc.savings ? r : acc),
      { savings: -Infinity, worthIt: false }
    );

    return {
      ok: true,
      tripDays,
      segmentsCount,
      segmentsCovered,
      totalKm: Math.round(totalKm),
      shinkansenKm: Math.round(shinkansenKm),
      urbanKm: Math.round(urbanKm),
      totalFareYen: round10(totalFareYen),
      jrCoverableYen: round10(jrCoverableYen),
      nonJRYen: round10(totalFareYen - jrCoverableYen),
      recommendations,
      best: best.savings > -Infinity ? best : null
    };
  }

  // ─── UI ───────────────────────────────────────────────────────────────

  function _esc(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function _fmtYen(v) {
    if (typeof v !== 'number' || isNaN(v)) return '—';
    return '¥' + v.toLocaleString('it-IT');
  }

  function openPanel() {
    if (typeof window.openSheet !== 'function') {
      console.warn('[jr-pass] window.openSheet non disponibile');
      return;
    }
    const T = (k, f) => (typeof window.t === 'function' ? window.t(k, f) : f);
    const r = compute();

    if (!r.ok) {
      window.openSheet(T('jrpass.title', '🚄 Conviene il JR Pass?'),
        `<p style="color:var(--l-ink);padding:18px;">${T('jrpass.error', 'Sistema di routing non disponibile.')}</p>`);
      return;
    }

    if (r.segmentsCount === 0) {
      window.openSheet(T('jrpass.title', '🚄 Conviene il JR Pass?'),
        `<div style="padding:18px;color:var(--l-ink);font-size:13px;line-height:1.6;">
           <p>${T('jrpass.empty', 'L\'itinerario non ha ancora tratte tra POI consecutivi.')}</p>
           <p style="margin-top:8px;color:var(--l-muted);font-size:12px;">${T('jrpass.emptyHint', 'Aggiungi almeno 2 POI in un giorno per vedere il calcolo.')}</p>
         </div>`);
      return;
    }

    const recsHtml = r.recommendations.map(rec => {
      const tone = rec.savings > 5000 ? 'rgba(22,163,74,0.14)'
        : rec.savings > 0 ? 'rgba(180,83,9,0.14)'
        : 'rgba(224,65,78,0.10)';
      const tonebr = rec.savings > 5000 ? 'rgba(22,163,74,0.45)'
        : rec.savings > 0 ? 'rgba(180,83,9,0.45)'
        : 'rgba(224,65,78,0.35)';
      const verdict = rec.savings > 0
        ? `<span style="color:#16a34a;font-weight:700;">${T('jrpass.worthIt', 'Conviene')}</span> · ${T('jrpass.savings', 'Risparmio')} ~${_fmtYen(rec.savings)}`
        : `<span style="color:var(--l-accent-600);font-weight:700;">${T('jrpass.notWorth', 'Non conviene')}</span> · ${T('jrpass.extra', 'Costo extra')} ~${_fmtYen(-rec.savings)}`;
      const coverageNote = rec.coverageRatio < 1
        ? `<div style="font-size:10.5px;color:var(--l-muted);margin-top:4px;">⚠️ ${T('jrpass.partialCoverage', 'Copre solo')} ${rec.days}/${r.tripDays} ${T('jrpass.dayUnit', 'giorni')} (${Math.round(rec.coverageRatio * 100)}%)</div>`
        : '';
      return `
        <div style="
          padding:12px 14px;background:${tone};border:1.5px solid ${tonebr};
          border-radius:10px;display:flex;flex-direction:column;gap:6px;">
          <div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:8px;">
            <div style="font-weight:700;color:var(--l-ink);font-size:14px;">🎫 ${T('jrpass.pass', 'JR Pass')} ${_esc(rec.name)}</div>
            <div style="font-size:13px;color:var(--l-ink);">${_fmtYen(rec.price)}</div>
          </div>
          <div style="font-size:12px;color:var(--l-muted);">${verdict}</div>
          ${coverageNote}
        </div>
      `;
    }).join('');

    const bestBanner = r.best && r.best.worthIt
      ? `<div style="
          padding:14px 16px;background:linear-gradient(135deg,rgba(22,163,74,0.18),rgba(22,163,74,0.12));
          border:1.5px solid rgba(22,163,74,0.45);border-radius:12px;
          color:var(--l-ink);font-weight:600;font-size:13px;line-height:1.5;">
          ✅ ${T('jrpass.bestPrefix', 'Conviene il')} <strong>JR Pass ${_esc(r.best.name)}</strong>
          — ${T('jrpass.savings', 'Risparmio')} ~${_fmtYen(r.best.savings)}
         </div>`
      : `<div style="
          padding:14px 16px;background:rgba(180,83,9,0.12);
          border:1.5px solid rgba(180,83,9,0.35);border-radius:12px;
          color:var(--l-ink);font-weight:600;font-size:13px;line-height:1.5;">
          💡 ${T('jrpass.bestSingleTicket', 'Conviene comprare biglietti singoli.')}
          ${T('jrpass.bestSingleNote', 'Il JR Pass è troppo caro per le tratte di questo viaggio.')}
         </div>`;

    const html = `
      <div style="display:flex;flex-direction:column;gap:14px;padding:4px 0;">

        ${bestBanner}

        <div style="
          display:grid;grid-template-columns:1fr 1fr;gap:8px;
          padding:12px;background:rgba(20,30,60,0.04);
          border:1px solid var(--l-hair);border-radius:10px;
          font-size:12px;color:var(--l-ink);">
          <div><strong>${r.tripDays}</strong> ${T('jrpass.dayUnit', 'giorni')}</div>
          <div><strong>${r.segmentsCount}</strong> ${T('jrpass.segments', 'tratte')}</div>
          <div><strong>${r.totalKm}</strong> km ${T('jrpass.total', 'totali')}</div>
          <div><strong>${r.shinkansenKm}</strong> km ${T('jrpass.intercity', 'intercity')}</div>
          <div style="grid-column:1/-1;border-top:1px solid var(--l-hair);padding-top:8px;margin-top:4px;display:flex;justify-content:space-between;">
            <span>${T('jrpass.totalFare', 'Spesa stimata trasporti')}:</span>
            <strong>${_fmtYen(r.totalFareYen)}</strong>
          </div>
          <div style="grid-column:1/-1;display:flex;justify-content:space-between;">
            <span style="color:var(--l-muted);">${T('jrpass.jrShare', 'Di cui copribile da JR Pass')}:</span>
            <strong style="color:#16a34a;">${_fmtYen(r.jrCoverableYen)}</strong>
          </div>
          <div style="grid-column:1/-1;display:flex;justify-content:space-between;">
            <span style="color:var(--l-muted);">${T('jrpass.nonJR', 'Trasporti urbani non-JR')}:</span>
            <strong style="color:#b45309;">${_fmtYen(r.nonJRYen)}</strong>
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:10px;">
          ${recsHtml}
        </div>

        <p style="font-size:10.5px;color:var(--l-faint);text-align:center;line-height:1.5;margin:6px 0 0;">
          ⚠️ ${T('jrpass.disclaimer', 'Stime approssimative ±20%. Per il calcolo ufficiale consulta jrpass.com / smartex.jp.')}<br>
          ${T('jrpass.priceNote', 'Prezzi JR Pass Ordinary, post-aumento ottobre 2023.')}
        </p>
      </div>
    `;

    window.openSheet(T('jrpass.title', '🚄 Conviene il JR Pass?'), html);
  }

  window.JRPassCalculator = { compute, openPanel, PASSES, URBAN_JR_COVERAGE };
  window.openJRPassPanel = openPanel;
})();
