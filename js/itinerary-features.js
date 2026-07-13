// ============================================================================
// itinerary-features.js — deletePersonalItinerary, requestUnshare,
//   acceptUnshareRequest + TripOptimizer (computePlan, openPreview, apply)
//
// Fusione di itinerary-delete.js + itinerary-optimizer-trip.js: entrambi
// avevano ZERO accoppiamento incrociato con gli altri moduli itinerary-*.js
// (verificato: nessuno dei due importa o chiama funzioni dell'altro, o di
// itinerary-crdt/sync/unified), quindi fondibili senza toccare alcun chiamante.
//
// Deps (all window.*): state, saveState, toast, t, getSharedGroups,
//   unmarkItinerarySharedWithGroup, peerBroadcast, peerGPS, modalConfirm,
//   ROUTING, allPOIs, openSheet/closeSheet, ItinerarySnapshots,
//   renderItineraryUnified, ITINERARY.computeDayRouting, GROUP_SYNC
// ============================================================================
(function () {
  'use strict';

  const T = (k, f) => (typeof window.t === 'function') ? window.t(k, f) : f;

  /* ═════════════════════════════════════════════════════════════════
     DELETE & UNSHARE (ex itinerary-delete.js)
     ═════════════════════════════════════════════════════════════════ */

  /**
   * Delete personal itinerary with confirmation if it's shared (Option C)
   * If shared: asks "Itinerario condiviso con N gruppi. Eliminare ovunque?"
   */
  async function deletePersonalItinerary() {
    const sharedGroups = window.getSharedGroups?.('personal_itinerary') || [];

    if (sharedGroups.length > 0) {
      const message = sharedGroups.length === 1
        ? `⚠️ Itinerario condiviso con 1 gruppo (${sharedGroups[0].groupId}). Eliminare ovunque?`
        : `⚠️ Itinerario condiviso con ${sharedGroups.length} gruppi. Eliminare ovunque?`;

      const confirmed = await (window.modalConfirm || confirm)(message, { danger: true, confirmText: 'Elimina' });
      if (!confirmed) return false;

      sharedGroups.forEach(share => {
        const groupItinId = `group_${share.groupId}_shared`;
        if (window.state.groupItineraries?.[groupItinId]) {
          delete window.state.groupItineraries[groupItinId];
        }
        window.unmarkItinerarySharedWithGroup?.('personal_itinerary', share.groupId);

        if (window.peerGPS && window.peerBroadcast) {
          window.peerBroadcast({
            type: 'itinerary_deleted',
            payload: {
              itineraryId: groupItinId,
              groupId: share.groupId,
              deletedBy: window.state.group?.myName || 'Unknown'
            }
          });
        }
      });

      console.log('[Delete] Deleted shared itinerary from all groups');
    }

    window.state.itinerary = [];
    window.saveState?.();
    console.log('[Delete] Deleted personal itinerary');
    window.toast(T('toast.itinDeleted', '🗑️ Itinerario eliminato'));
    return true;
  }

  /**
   * Request unshare of itinerary from a specific group (for non-owners)
   * Owner receives: "Marco ha richiesto di smettere di condividere l'itinerario"
   */
  function requestUnshare(itineraryId, groupId) {
    const myName = window.state.group?.myName || 'Unknown';
    const owner = window.state.groupItineraries?.[`group_${groupId}_shared`]?.owner;

    if (!owner) {
      window.toast('⚠️ Impossibile trovare il proprietario dell\'itinerario');
      return;
    }

    if (window.peerBroadcast) {
      window.peerBroadcast({
        type: 'itinerary_unshare_request',
        payload: {
          itineraryId: itineraryId,
          groupId: groupId,
          requestedBy: myName,
          requestedAt: Date.now()
        }
      });
    }

    window.toast(`📨 Richiesta inviata a ${owner} per smettere di condividere`);
    console.log('[Unshare] Requested unshare from', owner);
  }

  /**
   * Accept unshare request (or self-initiated "stop sharing") and remove
   * itinerary from group. Usato anche dal bottone "Elimina" del pannello
   * gruppo, non solo dal flusso di richiesta-approvazione.
   */
  function acceptUnshareRequest(groupId, requestedBy) {
    window.unmarkItinerarySharedWithGroup?.('personal_itinerary', groupId);
    const groupItinId = `group_${groupId}_shared`;
    if (window.state.groupItineraries?.[groupItinId]) {
      delete window.state.groupItineraries[groupItinId];
    }

    window.saveState?.();

    if (window.peerBroadcast) {
      window.peerBroadcast({
        type: 'itinerary_unshared',
        payload: {
          groupId: groupId,
          unsharedBy: window.state.group?.myName || 'Unknown',
          unsharedAt: Date.now()
        }
      });
    }

    window.toast(`✅ Non più condiviso con ${groupId}`);
    console.log('[Unshare] Accepted unshare request from', requestedBy);
  }

  window.deletePersonalItinerary = deletePersonalItinerary;
  window.requestUnshare = requestUnshare;
  window.acceptUnshareRequest = acceptUnshareRequest;

  /* ═════════════════════════════════════════════════════════════════
     TRIP OPTIMIZER (ex itinerary-optimizer-trip.js)
     Ottimizzatore multi-giorno: ridistribuisce le tappe sui giorni
     minimizzando gli spostamenti (k-means geografico + nearest-neighbor).
     ═════════════════════════════════════════════════════════════════ */

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
    const toRad = x => x * Math.PI / 180, Rk = 6371;
    const dLat = toRad(b[0] - a[0]), dLng = toRad(b[1] - a[1]);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
    return Rk * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  function _kmeans(points, k) {
    if (points.length <= k) return points.map((p, i) => ({ centroid: p.coord, members: [p] }));
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
      points.forEach((p, i) => {
        let bi = 0, bd = Infinity;
        centroids.forEach((c, ci) => { const d = _haversine(p.coord, c); if (d < bd) { bd = d; bi = ci; } });
        if (assign[i] !== bi) { assign[i] = bi; changed = true; }
      });
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

  function _orderClusters(clusters) {
    if (clusters.length <= 1) return clusters;
    const remaining = clusters.slice();
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

  function computePlan() {
    const tripDays = Math.max(1, Number(window.state?.tripProfile?.days) || Object.keys(window.state?.itineraryByDay || {}).length || 8);
    const { withCoord, without } = _collect();
    if (withCoord.length < 2) return { ok: false, reason: 'too-few' };

    const pois = (typeof window.allPOIs === 'function') ? window.allPOIs() : [];

    const ibd = window.state.itineraryByDay || {};
    const beforeArrays = Object.keys(ibd).map(d => ibd[d] || []);
    const beforeKm = _totalKm(beforeArrays, pois);

    const k = Math.min(tripDays, withCoord.length);
    let clusters = _kmeans(withCoord, k);
    clusters = _orderClusters(clusters);

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
    if (result.without && result.without.length) {
      newByDay[0] = [...(newByDay[0] || []), ...result.without];
    }

    window.state.itineraryByDay = newByDay;
    Object.keys(newByDay).forEach(d => {
      try { window.ITINERARY?.computeDayRouting?.(Number(d)); } catch (_) {}
    });
    window.saveState?.();
    window.GROUP_SYNC?.broadcastItinerary?.();
    window.renderItineraryUnified?.();
    return true;
  }

  function _esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function openPreview() {
    if (typeof window.openSheet !== 'function') return;
    const result = computePlan();

    if (!result.ok) {
      window.openSheet(T('topt.title', '🧭 Ottimizza viaggio'),
        `<div style="padding:24px 14px;text-align:center;color:var(--l-muted);font-size:15px;line-height:1.6;">
           <div style="font-size:34px;margin-bottom:8px;">🗺️</div>
           <p style="margin:0;">${T('topt.tooFew', 'Servono almeno 2 tappe con posizione nota per ottimizzare il viaggio.')}</p>
         </div>`);
      return;
    }

    const { plan, stats } = result;
    const savedPct = stats.beforeKm > 0 ? Math.round((stats.saved / stats.beforeKm) * 100) : 0;
    const savedColor = stats.saved > 0 ? '#15803d' : 'var(--l-muted)';

    const dayBlocks = Object.keys(plan).map(d => {
      const entries = plan[d];
      if (!entries.length) return '';
      const names = entries.map(e => `<li style="margin:2px 0;">${_esc(e.poi_name || e.poi_id)}</li>`).join('');
      return `
        <div style="padding:10px 12px;background:rgba(20,30,60,0.03);border:1px solid var(--l-hair);border-radius:9px;">
          <div style="font-weight:700;color:var(--l-ink);font-size:15px;margin-bottom:4px;">📅 ${T('topt.day', 'Giorno')} ${Number(d) + 1} <span style="font-weight:500;color:var(--l-muted);font-size:13px;">· ${entries.length} ${T('topt.stops', 'tappe')}</span></div>
          <ul style="margin:0;padding-left:18px;font-size:14px;color:var(--l-ink);">${names}</ul>
        </div>`;
    }).join('');

    const html = `
      <div style="display:flex;flex-direction:column;gap:12px;padding:4px 0;">
        <p style="margin:0;color:var(--l-muted);font-size:14px;line-height:1.5;">
          ${T('topt.intro', 'Anteprima: le tappe vengono raggruppate per zona geografica per ridurre gli spostamenti. Niente viene applicato finché non confermi.')}
        </p>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;padding:12px;background:rgba(20,30,60,0.03);border:1px solid var(--l-hair);border-radius:10px;text-align:center;">
          <div><div style="font-size:18px;font-weight:800;color:var(--l-ink);">${stats.beforeKm}</div><div style="font-size:12px;color:var(--l-muted);">km ${T('topt.before', 'prima')}</div></div>
          <div><div style="font-size:18px;font-weight:800;color:var(--l-ink);">${stats.afterKm}</div><div style="font-size:12px;color:var(--l-muted);">km ${T('topt.after', 'dopo')}</div></div>
          <div><div style="font-size:18px;font-weight:800;color:${savedColor};">${stats.saved >= 0 ? '−' : '+'}${Math.abs(stats.saved)}</div><div style="font-size:12px;color:var(--l-muted);">km ${T('topt.saved', 'risparmiati')} ${savedPct > 0 ? '(' + savedPct + '%)' : ''}</div></div>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;">${dayBlocks}</div>
        ${result.without?.length ? `<p style="font-size:13px;color:#8a5a10;margin:0;">⚠️ ${result.without.length} ${T('topt.noCoord', 'tappe senza posizione resteranno nel Giorno 1.')}</p>` : ''}
        <div style="display:flex;gap:8px;margin-top:4px;">
          <button id="topt-apply" style="flex:2;padding:12px;background:var(--l-accent);border:none;border-radius:9px;color:#fff;font-weight:700;font-size:16px;cursor:pointer;">✅ ${T('topt.apply', 'Applica')}</button>
          <button id="topt-cancel" style="flex:1;padding:12px;background:rgba(20,30,60,0.04);border:1.5px solid var(--l-hair);border-radius:9px;color:var(--l-ink);font-weight:600;font-size:15px;cursor:pointer;">${T('common.cancel', 'Annulla')}</button>
        </div>
        <p style="font-size:12px;color:var(--l-faint);text-align:center;margin:2px 0 0;">${T('topt.undoHint', 'Puoi annullare con ⬅️ o ripristinare una versione salvata.')}</p>
      </div>
    `;

    window.openSheet(T('topt.title', '🧭 Ottimizza viaggio'), html);

    setTimeout(() => {
      const applyBtn = document.getElementById('topt-apply');
      if (applyBtn) applyBtn.onclick = () => {
        if (apply(result)) {
          window.closeSheet?.();
          window.toast?.('🧭 ' + T('topt.done', 'Viaggio ottimizzato') + (stats.saved > 0 ? ` (−${stats.saved}km)` : ''));
        }
      };
      const cancelBtn = document.getElementById('topt-cancel');
      if (cancelBtn) cancelBtn.onclick = () => window.closeSheet?.();
    }, 40);
  }

  window.TripOptimizer = { computePlan, openPreview, apply };
  window.openTripOptimizer = openPreview;

  /* ═════════════════════════════════════════════════════════════════
     DAY HOURS REORDER — Riordina le tappe di UN giorno per rispettare
     gli orari di apertura, minimizzando avvisi di chiusura e viaggio.
     Euristica greedy (non un solver esatto): ad ogni passo sceglie tra
     le tappe aperte all'orario di arrivo previsto quella più vicina;
     se nessuna è aperta, la più vicina in assoluto (l'avviso risultante
     resta solo indicativo — mai bloccante, stesso principio di
     getEntryClosingWarning). Stesso schema anteprima→conferma→snapshot
     di TripOptimizer sopra, riusa isPeriodsOpenAt da
     itinerary-closing-warning.js.
     ═════════════════════════════════════════════════════════════════ */

  function _hToMin(timeStr) {
    const [h, m] = (timeStr || '').split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }
  function _minToH(minutes) {
    const h = Math.floor(minutes / 60) % 24, m = Math.round(minutes % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  function _travelMinBetween(a, b) {
    if (!a || !b || !window.ROUTING?.estimateDistanceHaversine) return 0;
    const dist = window.ROUTING.estimateDistanceHaversine(a[0], a[1], b[0], b[1]);
    const mode = window.ROUTING.suggestMode(dist);
    return window.ROUTING.estimateDuration(dist, mode);
  }
  function _dateAtMinutes(dayIndex, minutes, tripStartDate) {
    const tripStart = tripStartDate ? new Date(tripStartDate) : new Date(2027, 3, 10);
    const d = new Date(tripStart);
    d.setDate(d.getDate() + dayIndex);
    d.setHours(0, minutes, 0, 0);
    return d;
  }
  function _countHourWarnings(dayIndex, entries, tripStartDate) {
    return entries.reduce((n, e) => n + (window.getEntryClosingWarning?.(dayIndex, e, tripStartDate) ? 1 : 0), 0);
  }
  // Prima finestra utile OGGI (stesso giorno di viaggio, no giorni successivi)
  // per iniziare la visita non prima di fromMinutes. null = nessuna apertura
  // utile oggi (fallback: si accetta l'arrivo "a naso", stesso principio di
  // getEntryClosingWarning — l'avviso resta solo indicativo).
  function _nextOpenToday(periods, dayOfWeek, fromMinutes) {
    if (!Array.isArray(periods) || !periods.length) return fromMinutes; // nessun dato -> permissivo
    let best = null;
    periods.forEach(p => {
      if (!p.open || p.open.day !== dayOfWeek) return;
      const openMin = p.open.hour * 60 + (p.open.minute || 0);
      const closeMin = (p.close && p.close.day === p.open.day) ? (p.close.hour * 60 + (p.close.minute || 0)) : Infinity;
      const candidateStart = Math.max(openMin, fromMinutes);
      if (candidateStart <= closeMin && (best === null || candidateStart < best)) best = candidateStart;
    });
    return best;
  }

  function computeDayHoursPlan(dayIndex) {
    const dayPOIs = window.state?.itineraryByDay?.[dayIndex] || [];
    if (dayPOIs.length < 2) return { ok: false, reason: 'too-few' };

    const pois = (typeof window.allPOIs === 'function') ? window.allPOIs() : [];
    const tripStartDate = window.state?.tripProfile?.startDate;
    const warningsBefore = _countHourWarnings(dayIndex, dayPOIs, tripStartDate);
    const travelBeforeMin = dayPOIs.reduce((s, e) => s + (e.route_from_prev?.duration_min || 0), 0);

    // Ancora: l'orario più presto tra le tappe attuali (non un'identità fissa)
    const startMin = Math.min(...dayPOIs.map(e => _hToMin(e.time)));
    const dayOfWeek = _dateAtMinutes(dayIndex, 0, tripStartDate).getDay();
    const remaining = dayPOIs.map(e => ({ entry: e, coord: _coordOf(e, pois) }));
    const ordered = [];
    let cursor = startMin, pos = null;

    while (remaining.length) {
      // Per ogni candidata: se non è ancora aperta all'arrivo "a naso", si
      // aspetta fino alla prossima finestra utile OGGI invece di segnarla
      // comunque all'orario sbagliato — altrimenti il riordino sposta la
      // tappa per ultima ma le lascia comunque l'orario originale scorretto.
      const scored = remaining.map((cand, i) => {
        const travelMin = pos && cand.coord ? _travelMinBetween(pos, cand.coord) : 0;
        const naiveArrival = cursor + travelMin;
        const nextOpen = _nextOpenToday(cand.entry.opening_periods, dayOfWeek, naiveArrival);
        const arrival = nextOpen !== null ? Math.max(naiveArrival, nextOpen) : naiveArrival;
        return { i, travelMin, arrival, wait: arrival - naiveArrival, available: nextOpen !== null };
      });
      const availableOnes = scored.filter(s => s.available);
      const pool = (availableOnes.length ? availableOnes : scored).slice().sort((a, b) => (a.wait - b.wait) || (a.travelMin - b.travelMin));
      const pick = pool[0];
      const cand = remaining[pick.i];

      cursor = pick.arrival;
      ordered.push({ ...cand.entry, time: _minToH(cursor) });
      cursor += (cand.entry.duration || 0);
      pos = cand.coord || pos;
      remaining.splice(pick.i, 1);
    }

    const travelAfterMin = ordered.reduce((s, e, i) => {
      if (i === 0) return s;
      const a = _coordOf(ordered[i - 1], pois), b = _coordOf(e, pois);
      return s + (a && b ? _travelMinBetween(a, b) : 0);
    }, 0);
    const warningsAfter = _countHourWarnings(dayIndex, ordered, tripStartDate);

    return {
      ok: true, dayIndex, newOrder: ordered,
      stats: {
        warningsBefore, warningsAfter,
        travelBeforeMin: Math.round(travelBeforeMin), travelAfterMin: Math.round(travelAfterMin)
      }
    };
  }

  function applyDayHours(dayIndex, result) {
    if (!result?.ok || !result.newOrder) return false;
    try { window.ItinerarySnapshots?.saveAuto?.('optimize-day'); } catch (_) {}

    // Passa da window.ITINERARY.reorderDay (non da state diretto) così il
    // wrapper undo/redo copre anche questa azione con Annulla/Ctrl+Z.
    const applied = window.ITINERARY?.reorderDay?.(dayIndex, result.newOrder);
    if (!applied) return false;
    window.renderItineraryUnified?.();
    return true;
  }

  function openDayHoursPreview(dayIndex) {
    if (typeof window.openSheet !== 'function') return;
    const result = computeDayHoursPlan(dayIndex);

    if (!result.ok) {
      window.openSheet(T('hreorder.title', '🕐 Riordina per orari'),
        `<div style="padding:24px 14px;text-align:center;color:var(--l-muted);font-size:15px;line-height:1.6;">
           <div style="font-size:34px;margin-bottom:8px;">🕐</div>
           <p style="margin:0;">${T('hreorder.tooFew', 'Servono almeno 2 tappe in questo giorno per riordinare.')}</p>
         </div>`);
      return;
    }

    const { newOrder, stats } = result;
    const warnDelta = stats.warningsBefore - stats.warningsAfter;
    const warnColor = warnDelta > 0 ? '#15803d' : 'var(--l-muted)';
    const stopsHTML = newOrder.map(e => `
      <div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:rgba(20,30,60,0.03);border:1px solid var(--l-hair);border-radius:9px;">
        <span style="font-weight:800;color:var(--l-accent);font-size:14px;min-width:44px;">${e.time}</span>
        <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--l-ink);font-size:14px;">${_esc(e.poi_name || e.poi_id)}</span>
      </div>`).join('');

    const html = `
      <div style="display:flex;flex-direction:column;gap:12px;padding:4px 0;">
        <p style="margin:0;color:var(--l-muted);font-size:14px;line-height:1.5;">
          ${T('hreorder.intro', 'Anteprima: le tappe di questo giorno vengono riordinate per rispettare gli orari di apertura. Niente viene applicato finché non confermi.')}
        </p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:12px;background:rgba(20,30,60,0.03);border:1px solid var(--l-hair);border-radius:10px;text-align:center;">
          <div><div style="font-size:18px;font-weight:800;color:${warnColor};">${stats.warningsBefore} → ${stats.warningsAfter}</div><div style="font-size:12px;color:var(--l-muted);">${T('hreorder.warnings', 'avvisi orari')}</div></div>
          <div><div style="font-size:18px;font-weight:800;color:var(--l-ink);">${stats.travelBeforeMin} → ${stats.travelAfterMin}</div><div style="font-size:12px;color:var(--l-muted);">${T('hreorder.travel', 'min spostamento')}</div></div>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;">${stopsHTML}</div>
        <div style="display:flex;gap:8px;margin-top:4px;">
          <button id="hreorder-apply" style="flex:2;padding:12px;background:var(--l-accent);border:none;border-radius:9px;color:#fff;font-weight:700;font-size:16px;cursor:pointer;">✅ ${T('hreorder.apply', 'Applica')}</button>
          <button id="hreorder-cancel" style="flex:1;padding:12px;background:rgba(20,30,60,0.04);border:1.5px solid var(--l-hair);border-radius:9px;color:var(--l-ink);font-weight:600;font-size:15px;cursor:pointer;">${T('common.cancel', 'Annulla')}</button>
        </div>
        <p style="font-size:12px;color:var(--l-faint);text-align:center;margin:2px 0 0;">${T('topt.undoHint', 'Puoi annullare con ⬅️ o ripristinare una versione salvata.')}</p>
      </div>
    `;

    window.openSheet(T('hreorder.title', '🕐 Riordina per orari'), html);

    setTimeout(() => {
      const applyBtn = document.getElementById('hreorder-apply');
      if (applyBtn) applyBtn.onclick = () => {
        if (applyDayHours(dayIndex, result)) {
          window.closeSheet?.();
          window.toast?.('🕐 ' + T('hreorder.done', 'Giorno riordinato'));
        }
      };
      const cancelBtn = document.getElementById('hreorder-cancel');
      if (cancelBtn) cancelBtn.onclick = () => window.closeSheet?.();
    }, 40);
  }

  window.DayHoursReorder = { computePlan: computeDayHoursPlan, openPreview: openDayHoursPreview, apply: applyDayHours };
  window.openDayHoursReorder = openDayHoursPreview;
})();
