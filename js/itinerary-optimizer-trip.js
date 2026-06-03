/**
 * itinerary-optimizer-trip.js — Ottimizzatore multi-giorno dell'itinerario
 *
 * `optimizeDay` (itinerary.js) riordina le tappe DENTRO un giorno. Questo modulo
 * fa il passo superiore: ridistribuisce TUTTE le tappe sui giorni disponibili
 * minimizzando gli spostamenti, raggruppando per prossimità geografica (le città
 * giapponesi sono ben separate → il clustering cattura "3 giorni a Tokyo, 2 a Kyoto").
 *
 * Algoritmo:
 *   1. Raccoglie tutte le entry con coordinate da `state.itineraryByDay`.
 *   2. k-means geografico (k = giorni con almeno 1 POI atteso, max = giorni trip).
 *   3. Ordina i cluster con nearest-neighbor tra centroidi (minimizza inter-day).
 *   4. Assegna cluster → giorni in sequenza; riordina intra-day (nearest-neighbor).
 *   5. PREVIEW obbligatoria con confronto km prima/dopo; applica solo su conferma.
 *
 * Sicurezza: `apply()` fa un auto-snapshot (ItinerarySnapshots) → l'utente può
 * sempre tornare indietro (anche via Undo).
 *
 * Esposto:
 *   - window.TripOptimizer = { computePlan, openPreview, apply }
 *   - window.openTripOptimizer() → preview
 *
 * Dipendenze (window): state.itineraryByDay, tripProfile.days, ROUTING, allPOIs,
 *   openSheet/closeSheet, toast, t, ItinerarySnapshots, saveState,
 *   renderItineraryUnified, ITINERARY.computeDayRouting.
 */
(function () {
  'use strict';

  const T = (k, f) => (typeof window.t === 'function') ? window.t(k, f) : f;

  function _coordOf(entry, pois) {
    if (entry && typeof entry.lat === 'number' && typeof entry.lng === 'number') return [entry.lat, entry.lng];
    const p = pois.find(x => x.id === entry.poi_id || x.googlePlaceId === entry.poi_id);
    return (p && typeof p.lat === 'number' && typeof p.lng === 'number') ? [p.lat, p.lng] : null;
  }

  function _collect() {
    const ibd = window.state?.itineraryByDay || {};
    const pois = (typeof window.allPOIs === 'function') ? window.allPOIs() : [];
    const withCoord = [], without = [];
    Object.keys(ibd).forEach(d => (ibd[d] || []).forEach(e => {
      const c = _coordOf(e, pois);
      if (c) withCoord.push({ entry: e, coord: c });
      else without.push(e);
    }));
    return { withCoord, without };
  }

  function _haversine(a, b) {
    const R = window.ROUTING;
    if (R?.estimateDistanceHaversine) return R.estimateDistanceHaversine(a[0], a[1], b[0], b[1]);
    // fallback
    const toRad = x => x * Math.PI / 180, Rk = 6371;
    const dLat = toRad(b[0] - a[0]), dLng = toRad(b[1] - a[1]);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
    return Rk * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  // k-means++ init + Lloyd iterations
  function _kmeans(points, k) {
    if (points.length <= k) return points.map((p, i) => ({ centroid: p.coord, members: [p] }));
    // init: k-means++ (primo random, poi i più lontani)
    const centroids = [points[0].coord];
    while (centroids.length < k) {
      let best = null, bestD = -1;
      points.forEach(p => {
        const dmin = Math.min(...centroids.map(c => _haversine(p.coord, c)));
        if (dmin > bestD) { bestD = dmin; best = p.coord; }
      });
      centroids.push(best ? best.slice() : points[centroids.length % points.length].coord.slice());
    }

    let assign = new Array(points.length).fill(-1);
    for (let iter = 0; iter < 25; iter++) {
      let changed = false;
      // assign
      points.forEach((p, i) => {
        let bi = 0, bd = Infinity;
        centroids.forEach((c, ci) => { const d = _haversine(p.coord, c); if (d < bd) { bd = d; bi = ci; } });
        if (assign[i] !== bi) { assign[i] = bi; changed = true; }
      });
      // update
      for (let ci = 0; ci < k; ci++) {
        const mem = points.filter((_, i) => assign[i] === ci);
        if (mem.length) {
          centroids[ci] = [
            mem.reduce((s, p) => s + p.coord[0], 0) / mem.length,
            mem.reduce((s, p) => s + p.coord[1], 0) / mem.length
          ];
        }
      }
      if (!changed) break;
    }

    const clusters = [];
    for (let ci = 0; ci < k; ci++) {
      const members = points.filter((_, i) => assign[i] === ci);
      if (members.length) clusters.push({ centroid: centroids[ci], members });
    }
    return clusters;
  }

  // Ordina i cluster con nearest-neighbor tra centroidi (minimizza inter-day)
  function _orderClusters(clusters) {
    if (clusters.length <= 1) return clusters;
    const remaining = clusters.slice();
    // parti dal cluster più a nord-est (arbitrario ma stabile)
    remaining.sort((a, b) => (b.centroid[0] - a.centroid[0]) || (a.centroid[1] - b.centroid[1]));
    const ordered = [remaining.shift()];
    while (remaining.length) {
      const last = ordered[ordered.length - 1].centroid;
      let bi = 0, bd = Infinity;
      remaining.forEach((c, i) => { const d = _haversine(last, c.centroid); if (d < bd) { bd = d; bi = i; } });
      ordered.push(remaining.splice(bi, 1)[0]);
    }
    return ordered;
  }

  // Nearest-neighbor intra-cluster (ordine di visita nel giorno)
  function _orderIntra(members) {
    if (members.length <= 2) return members.slice();
    const rem = members.slice(1);
    const out = [members[0]];
    while (rem.length) {
      const last = out[out.length - 1].coord;
      let bi = 0, bd = Infinity;
      rem.forEach((m, i) => { const d = _haversine(last, m.coord); if (d < bd) { bd = d; bi = i; } });
      out.push(rem.splice(bi, 1)[0]);
    }
    return out;
  }

  function _totalKm(dayArrays, pois) {
    let km = 0;
    dayArrays.forEach(arr => {
      for (let i = 0; i < arr.length - 1; i++) {
        const a = _coordOf(arr[i], pois), b = _coordOf(arr[i + 1], pois);
        if (a && b) km += _haversine(a, b);
      }
    });
    return Math.round(km);
  }

  /**
   * Calcola il piano ottimizzato. Non applica nulla.
   * Ritorna { ok, plan: {0:[entries],1:[...]}, stats:{beforeKm, afterKm, days, pois}, without }
   */
  function computePlan() {
    const tripDays = Math.max(1, Number(window.state?.tripProfile?.days) || Object.keys(window.state?.itineraryByDay || {}).length || 8);
    const { withCoord, without } = _collect();
    if (withCoord.length < 2) return { ok: false, reason: 'too-few' };

    const pois = (typeof window.allPOIs === 'function') ? window.allPOIs() : [];

    // km attuale (per confronto)
    const ibd = window.state.itineraryByDay || {};
    const beforeArrays = Object.keys(ibd).map(d => ibd[d] || []);
    const beforeKm = _totalKm(beforeArrays, pois);

    // k = min(giorni, cluster naturali). Usa giorni come k ma non più dei POI.
    const k = Math.min(tripDays, withCoord.length);
    let clusters = _kmeans(withCoord, k);
    clusters = _orderClusters(clusters);

    // Assegna cluster → giorni 0..k-1, ordina intra-day
    const plan = {};
    clusters.forEach((cl, dayIdx) => {
      const ordered = _orderIntra(cl.members);
      plan[dayIdx] = ordered.map(m => m.entry);
    });

    const afterArrays = Object.keys(plan).map(d => plan[d]);
    const afterKm = _totalKm(afterArrays, pois);

    return {
      ok: true,
      plan,
      without,
      stats: {
        beforeKm, afterKm,
        saved: beforeKm - afterKm,
        days: clusters.length,
        pois: withCoord.length
      }
    };
  }

  /**
   * Applica il piano: riscrive state.itineraryByDay. Auto-snapshot prima.
   * Le entry senza coordinate restano nel loro giorno originale (append al Day 0).
   */
  function apply(result) {
    if (!result?.ok || !result.plan) return false;
    try { window.ItinerarySnapshots?.saveAuto?.('optimize-trip'); } catch (_) {}

    const newByDay = {};
    const tripDays = Math.max(1, Number(window.state?.tripProfile?.days) || 8);
    for (let d = 0; d < tripDays; d++) newByDay[d] = [];

    Object.keys(result.plan).forEach(d => {
      const di = Number(d);
      newByDay[di] = result.plan[d].slice();
    });
    // entry senza coordinate → in coda al primo giorno
    if (result.without && result.without.length) {
      newByDay[0] = [...(newByDay[0] || []), ...result.without];
    }

    window.state.itineraryByDay = newByDay;
    // Ricalcola orari/tratte per ogni giorno
    Object.keys(newByDay).forEach(d => {
      try { window.ITINERARY?.computeDayRouting?.(Number(d)); } catch (_) {}
    });
    window.saveState?.();
    window.GROUP_SYNC?.broadcastItinerary?.();
    window.renderItineraryUnified?.();
    return true;
  }

  // ─── UI preview ──────────────────────────────────────────────────────

  function _esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function openPreview() {
    if (typeof window.openSheet !== 'function') return;
    const result = computePlan();

    if (!result.ok) {
      window.openSheet(T('topt.title', '🧭 Ottimizza viaggio'),
        `<div style="padding:24px 14px;text-align:center;color:rgba(255,255,255,0.6);font-size:13px;line-height:1.6;">
           <div style="font-size:34px;margin-bottom:8px;">🗺️</div>
           <p style="margin:0;">${T('topt.tooFew', 'Servono almeno 2 tappe con posizione nota per ottimizzare il viaggio.')}</p>
         </div>`);
      return;
    }

    const { plan, stats } = result;
    const savedPct = stats.beforeKm > 0 ? Math.round((stats.saved / stats.beforeKm) * 100) : 0;
    const savedColor = stats.saved > 0 ? '#7fe2a9' : 'rgba(255,255,255,0.7)';

    const dayBlocks = Object.keys(plan).map(d => {
      const entries = plan[d];
      if (!entries.length) return '';
      const names = entries.map(e => `<li style="margin:2px 0;">${_esc(e.poi_name || e.poi_id)}</li>`).join('');
      return `
        <div style="padding:10px 12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:9px;">
          <div style="font-weight:700;color:#fff;font-size:13px;margin-bottom:4px;">📅 ${T('topt.day', 'Giorno')} ${Number(d) + 1} <span style="font-weight:500;color:rgba(255,255,255,0.5);font-size:11px;">· ${entries.length} ${T('topt.stops', 'tappe')}</span></div>
          <ul style="margin:0;padding-left:18px;font-size:12px;color:rgba(255,255,255,0.8);">${names}</ul>
        </div>`;
    }).join('');

    const html = `
      <div style="display:flex;flex-direction:column;gap:12px;padding:4px 0;">
        <p style="margin:0;color:rgba(255,255,255,0.7);font-size:12.5px;line-height:1.5;">
          ${T('topt.intro', 'Anteprima: le tappe vengono raggruppate per zona geografica per ridurre gli spostamenti. Niente viene applicato finché non confermi.')}
        </p>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;padding:12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;text-align:center;">
          <div><div style="font-size:18px;font-weight:800;color:#fff;">${stats.beforeKm}</div><div style="font-size:10px;color:rgba(255,255,255,0.5);">km ${T('topt.before', 'prima')}</div></div>
          <div><div style="font-size:18px;font-weight:800;color:#fff;">${stats.afterKm}</div><div style="font-size:10px;color:rgba(255,255,255,0.5);">km ${T('topt.after', 'dopo')}</div></div>
          <div><div style="font-size:18px;font-weight:800;color:${savedColor};">${stats.saved >= 0 ? '−' : '+'}${Math.abs(stats.saved)}</div><div style="font-size:10px;color:rgba(255,255,255,0.5);">km ${T('topt.saved', 'risparmiati')} ${savedPct > 0 ? '(' + savedPct + '%)' : ''}</div></div>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;">${dayBlocks}</div>
        ${result.without?.length ? `<p style="font-size:11px;color:rgba(255,200,100,0.8);margin:0;">⚠️ ${result.without.length} ${T('topt.noCoord', 'tappe senza posizione resteranno nel Giorno 1.')}</p>` : ''}
        <div style="display:flex;gap:8px;margin-top:4px;">
          <button id="topt-apply" style="flex:2;padding:12px;background:linear-gradient(135deg,#FF6B35,#FF5E1F);border:none;border-radius:9px;color:#fff;font-weight:700;font-size:14px;cursor:pointer;">✅ ${T('topt.apply', 'Applica')}</button>
          <button id="topt-cancel" style="flex:1;padding:12px;background:rgba(255,255,255,0.06);border:1.5px solid rgba(255,255,255,0.16);border-radius:9px;color:#fff;font-weight:600;font-size:13px;cursor:pointer;">${T('common.cancel', 'Annulla')}</button>
        </div>
        <p style="font-size:10.5px;color:rgba(255,255,255,0.55);text-align:center;margin:2px 0 0;">${T('topt.undoHint', 'Puoi annullare con ⬅️ o ripristinare una versione salvata.')}</p>
      </div>
    `;

    window.openSheet(T('topt.title', '🧭 Ottimizza viaggio'), html);

    setTimeout(() => {
      const applyBtn = document.getElementById('topt-apply');
      if (applyBtn) applyBtn.onclick = () => {
        if (apply(result)) {
          window.closeSheet?.();
          if (window.toast) window.toast('🧭 ' + T('topt.done', 'Viaggio ottimizzato') + (stats.saved > 0 ? ` (−${stats.saved}km)` : ''));
        }
      };
      const cancelBtn = document.getElementById('topt-cancel');
      if (cancelBtn) cancelBtn.onclick = () => window.closeSheet?.();
    }, 40);
  }

  window.TripOptimizer = { computePlan, openPreview, apply };
  window.openTripOptimizer = openPreview;
})();
