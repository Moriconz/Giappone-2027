// ============================================================================
// itinerary-poi-actions.js — showItineraryPOIMenu (modifica/sposta/cancella
//   tappa), showGFNearDay (posti GF vicino alle tappe del giorno, fonti
//   live), setDayBaseFlow (imposta base/hotel del giorno via geocoding
//   Nominatim). Chiamati da setupGlobalEventDelegation in
//   itinerary-unified.js via window.*, zero riferimenti diretti.
// Estratto da itinerary-unified.js (1363 righe), nessun cambio di
// comportamento — stesso trattamento di poi-detail-view.js/gf-places-panel.js
// in v3.34.
// Deps (window.*): t, state, toast, openSheet, closeSheet, modalConfirm,
//   modalPrompt, ITINERARY, ITINERARY_VALIDATION, PERF_UTILS, saveState,
//   renderItineraryUnified, allGlutenFreeShops, GFPlaces, haversineKm, fmtDist
// ============================================================================
(function () {
  'use strict';

  /**
   * MENU FOR POI ACTIONS (Edit, Move, Delete)
   */
  function showItineraryPOIMenu(poiId) {
    console.log('[ItineraryMenu] Opening menu for POI:', poiId);

    // Find the POI in itineraryByDay
    let poiData = null;
    let dayIndex = null;

    for (const [idx, dayPOIs] of Object.entries(window.state?.itineraryByDay || {})) {
      const found = dayPOIs.find(p => p.poi_id === poiId);
      if (found) {
        poiData = found;
        dayIndex = parseInt(idx);
        break;
      }
    }

    if (!poiData) {
      console.error('[ItineraryMenu] POI not found:', poiId);
      return;
    }

    const tripProfile = window.state?.tripProfile || {};
    const totalDays = tripProfile.days || 8;
    const poiName = poiData.poi_name || `POI #${poiId.substring(0, 8)}`;

    // Build menu HTML
    const daysOptions = Array.from({ length: totalDays }, (_, i) => {
      const isCurrentDay = i === dayIndex;
      return `
        <button class="itinerary-menu-move-btn" data-target-day="${i}" style="
          padding:6px 12px;
          background:${isCurrentDay ? 'rgba(255,107,53,0.3)' : 'rgba(20,30,60,0.06)'};
          border:1px solid ${isCurrentDay ? 'rgba(255,107,53,0.5)' : 'var(--l-hair)'};
          border-radius:4px;
          color:var(--l-ink);
          cursor:pointer;
          font-size:14px;
          transition:all 0.2s;
          font-weight:${isCurrentDay ? '600' : '400'};
        " onmouseover="this.style.background='rgba(255,107,53,0.4)'" onmouseout="this.style.background='${isCurrentDay ? 'rgba(255,107,53,0.3)' : 'rgba(20,30,60,0.06)'}'">
          Day ${i + 1} ${isCurrentDay ? '✓' : ''}
        </button>
      `;
    }).join('');

    const html = `
      <div style="padding:20px;display:flex;flex-direction:column;gap:16px;">
        <div>
          <h3 style="margin:0 0 12px 0;color:var(--l-ink);font-size:15px;font-weight:700">📋 ${poiName}</h3>
          <p style="margin:0;color:var(--l-muted);font-size:14px">Opzioni disponibili</p>
        </div>

        <!-- Orario -->
        <div>
          <label style="display:block;color:var(--l-muted);font-size:14px;margin-bottom:6px;font-weight:600">⏰ Orario</label>
          <input type="text" class="itinerary-menu-time" placeholder="HH:MM" value="${poiData.time}" style="
            width:100%;
            padding:8px 10px;
            background:rgba(20,30,60,0.05);
            border:1px solid var(--l-hair);
            border-radius:4px;
            color:var(--l-ink);
            font-size:15px;
            box-sizing:border-box;
          " />
        </div>

        <!-- Durata -->
        <div>
          <label style="display:block;color:var(--l-muted);font-size:14px;margin-bottom:6px;font-weight:600">⏱️ Durata (minuti)</label>
          <input type="number" class="itinerary-menu-duration" placeholder="60" value="${poiData.duration}" style="
            width:100%;
            padding:8px 10px;
            background:rgba(20,30,60,0.05);
            border:1px solid var(--l-hair);
            border-radius:4px;
            color:var(--l-ink);
            font-size:15px;
            box-sizing:border-box;
          " />
        </div>

        <!-- Costo -->
        <div>
          <label style="display:block;color:var(--l-muted);font-size:14px;margin-bottom:6px;font-weight:600">💰 Costo (¥)</label>
          <input type="number" class="itinerary-menu-cost" placeholder="0" value="${poiData.cost || 0}" style="
            width:100%;
            padding:8px 10px;
            background:rgba(20,30,60,0.05);
            border:1px solid var(--l-hair);
            border-radius:4px;
            color:var(--l-ink);
            font-size:15px;
            box-sizing:border-box;
          " />
        </div>

        <!-- Note -->
        <div>
          <label style="display:block;color:var(--l-muted);font-size:14px;margin-bottom:6px;font-weight:600">📝 Note</label>
          <textarea class="itinerary-menu-notes" placeholder="Aggiungi una nota..." style="
            width:100%;
            padding:8px 10px;
            background:rgba(20,30,60,0.05);
            border:1px solid var(--l-hair);
            border-radius:4px;
            color:var(--l-ink);
            font-size:15px;
            box-sizing:border-box;
            resize:vertical;
            min-height:60px;
            font-family:inherit;
          ">${poiData.notes || ''}</textarea>
        </div>

        <!-- Sposta a un altro giorno -->
        <div>
          <label style="display:block;color:var(--l-muted);font-size:14px;margin-bottom:8px;font-weight:600">📅 Sposta a</label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
            ${daysOptions}
          </div>
        </div>

        <!-- Buttons -->
        <div style="display:flex;gap:8px;margin-top:12px;">
          <button class="itinerary-menu-save" style="
            flex:1;
            padding:10px 14px;
            background:rgba(22,163,74,0.15);
            border:1px solid rgba(22,163,74,0.4);
            border-radius:6px;
            color:#16a34a;
            font-weight:600;
            font-size:15px;
            cursor:pointer;
            transition:all 0.2s;
          " onmouseover="this.style.background='rgba(22,163,74,0.25)'" onmouseout="this.style.background='rgba(22,163,74,0.15)'">
            ✓ Salva
          </button>
          <button class="itinerary-menu-delete" style="
            flex:1;
            padding:10px 14px;
            background:rgba(220,38,38,0.12);
            border:1px solid rgba(220,38,38,0.35);
            border-radius:6px;
            color:#dc2626;
            font-weight:600;
            font-size:15px;
            cursor:pointer;
            transition:all 0.2s;
          " onmouseover="this.style.background='rgba(220,38,38,0.2)'" onmouseout="this.style.background='rgba(220,38,38,0.12)'">
            🗑️ Cancella
          </button>
        </div>
      </div>
    `;

    window.openSheet(`✏️ Modifica: ${poiName}`, html);
    console.log('[ItineraryMenu] Menu opened for POI:', poiName);

    // Setup button handlers
    setTimeout(() => {
      const saveBtn = document.querySelector('.itinerary-menu-save');
      const deleteBtn = document.querySelector('.itinerary-menu-delete');
      const moveButtons = document.querySelectorAll('.itinerary-menu-move-btn');

      if (saveBtn) {
        saveBtn.onclick = () => {
          const newTime = document.querySelector('.itinerary-menu-time')?.value || poiData.time;
          const newDuration = parseInt(document.querySelector('.itinerary-menu-duration')?.value || poiData.duration);
          const newCost = parseInt(document.querySelector('.itinerary-menu-cost')?.value || 0);
          const newNotes = document.querySelector('.itinerary-menu-notes')?.value || '';

          // Validate changes
          if (window.ITINERARY_VALIDATION) {
            const timeVal = window.ITINERARY_VALIDATION.validateTime(newTime);
            if (!timeVal.valid) {
              window.toast?.('⚠️ ' + timeVal.error);
              return;
            }

            const durationVal = window.ITINERARY_VALIDATION.validateDuration(newDuration);
            if (!durationVal.valid) {
              window.toast?.('⚠️ ' + durationVal.error);
              return;
            }

            const costVal = window.ITINERARY_VALIDATION.validateCost(newCost);
            if (!costVal.valid) {
              window.toast?.('⚠️ ' + costVal.error);
              return;
            }
          }

          window.ITINERARY?.updateTime(poiId, newTime);
          window.ITINERARY?.updateDuration(poiId, newDuration);
          window.ITINERARY?.updateCost(poiId, newCost);
          window.ITINERARY?.updateNotes(poiId, newNotes);

          window.PERF_UTILS?.batchedSaveState ? window.PERF_UTILS.batchedSaveState() : window.saveState?.();
          window.renderItineraryUnified?.();
          window.closeSheet();
          window.toast?.('✓ Modifiche salvate');
        };
      }

      if (deleteBtn) {
        deleteBtn.onclick = () => {
          (window.modalConfirm || ((m) => Promise.resolve(confirm(m))))(`Rimuovere "${poiName}" dall'itinerario?`, { danger: true, confirmText: 'Rimuovi' })
            .then(ok => {
              if (!ok) return;
              window.ITINERARY?.removePOI(poiId);
              window.PERF_UTILS?.batchedSaveState ? window.PERF_UTILS.batchedSaveState() : window.saveState?.();
              window.renderItineraryUnified?.();
              window.closeSheet();
              window.toast?.('✓ POI rimosso');
            });
        };
      }

      moveButtons.forEach(btn => {
        btn.onclick = (e) => {
          const targetDay = parseInt(btn.dataset.targetDay);
          window.ITINERARY?.moveToDay(poiId, targetDay);
          window.PERF_UTILS?.batchedSaveState ? window.PERF_UTILS.batchedSaveState() : window.saveState?.();
          window.renderItineraryUnified?.();
          window.closeSheet();
          window.toast?.(`✓ Spostato al Day ${targetDay + 1}`);
        };
      });
    }, 50);
  }
  window.showItineraryPOIMenu = showItineraryPOIMenu;

  // ── GF vicino alle tappe di un giorno ────────────────────────────────────
  // Incrocia le tappe del giorno (lat/lng) con i posti GF da fonti LIVE
  // (Google Places già caricati + review-scan, via GFPlaces/allGlutenFreeShops)
  // e li propone con distanza dalla tappa più vicina + aggiunta one-tap come
  // pasto. Nessuna chiamata API nuova: solo dati già in memoria/cache.
  function showGFNearDay(dayIndex) {
    const RADIUS_KM = 1.5;
    const stops = (window.state?.itineraryByDay?.[dayIndex] || [])
      .filter(p => typeof p.lat === 'number' && typeof p.lng === 'number');
    if (!stops.length) { window.toast?.('⚠️ Nessuna tappa con posizione in questo giorno'); return; }

    const seen = new Set();
    const candidates = [
      ...(window.allGlutenFreeShops || []).map(r => ({ ...r, id: r.place_id || r.id })),
      ...((window.GFPlaces?.getAll?.() || []))
    ].filter(p => {
      if (!p || typeof p.lat !== 'number' || typeof p.lng !== 'number') return false;
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });

    const near = candidates.map(p => {
      let best = Infinity, bestStop = null;
      for (const s of stops) {
        const d = window.haversineKm(s.lat, s.lng, p.lat, p.lng);
        if (d < best) { best = d; bestStop = s; }
      }
      return { ...p, _distKm: best, _nearStop: bestStop?.poi_name || bestStop?.name || '' };
    }).filter(p => p._distKm <= RADIUS_KM).sort((a, b) => a._distKm - b._distKm).slice(0, 12);

    const dayN = dayIndex + 1;
    if (!near.length) {
      window.openSheet(`🌾 GF vicino — Giorno ${dayN}`, `
        <div style="padding:24px 16px;text-align:center;">
          <div style="font-size:40px;margin-bottom:12px;">🌾</div>
          <div style="font-weight:700;color:var(--l-ink);margin-bottom:6px;">Nessun posto GF noto entro ${RADIUS_KM} km dalle tappe</div>
          <p style="font-size:14px;color:var(--l-muted);margin:0 0 14px;">I dati sono live: apri la <strong>GF Guide</strong> per caricare i locali della zona, poi riprova.</p>
          <button onclick="window.closeSheet();setTimeout(()=>window.renderGFView?.(),250)" style="padding:10px 18px;background:rgba(74,222,128,0.14);border:1.5px solid rgba(74,222,128,0.4);border-radius:10px;color:#16a34a;font-weight:700;cursor:pointer;">💚 Apri GF Guide</button>
        </div>`);
      return;
    }

    const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    const rows = near.map(p => `
      <div style="padding:12px;background:var(--l-glass);border:1px solid var(--l-border);border-radius:12px;display:flex;flex-direction:column;gap:6px;">
        <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;">
          <div style="min-width:0;">
            <div style="font-weight:700;color:var(--l-ink);">${esc(p.name)}</div>
            <div style="font-size:13px;color:var(--l-muted);">${window.fmtDist(p._distKm)} da ${esc(p._nearStop)}${p.rating ? ` · ⭐ ${p.rating}` : ''}</div>
          </div>
          <button data-gf-add='${esc(JSON.stringify({ id: p.id, name: p.name, lat: p.lat, lng: p.lng }))}' data-day="${dayIndex}" style="flex-shrink:0;padding:8px 12px;background:rgba(74,222,128,0.14);border:1px solid rgba(74,222,128,0.4);border-radius:8px;color:#16a34a;font-weight:700;font-size:14px;cursor:pointer;white-space:nowrap;">➕ Pasto</button>
        </div>
      </div>`).join('');

    window.openSheet(`🌾 GF vicino — Giorno ${dayN}`, `
      <div style="display:flex;flex-direction:column;gap:10px;padding:4px 0;">
        <p style="font-size:13px;color:var(--l-faint);margin:0;">Posti gluten-free entro ${RADIUS_KM} km dalle tappe del giorno (fonti live — verifica sempre sul posto).</p>
        ${rows}
      </div>`);

    const body = document.querySelector('.y2k-win-body');
    body?.addEventListener('click', (e) => {
      const b = e.target.closest('[data-gf-add]');
      if (!b) return;
      let info; try { info = JSON.parse(b.dataset.gfAdd); } catch (_) { return; }
      const ok = window.ITINERARY?.addPOIToDay?.(info.id, info.name, parseInt(b.dataset.day, 10), '12:30', 60, '', 0, 'cibo', info.lat, info.lng);
      if (ok !== false) {
        window.toast?.(`🌾 ${info.name} aggiunto al giorno ${parseInt(b.dataset.day, 10) + 1}`);
        b.disabled = true; b.textContent = '✓ Aggiunto'; b.style.opacity = '0.6';
      }
    });
  }
  window.showGFNearDay = showGFNearDay;

  // ── Flow "imposta base/hotel del giorno" ─────────────────────────────────
  // Prompt nome/indirizzo → geocoding Nominatim live (nessun dato scritto a
  // mano) → conferma col nome risolto → salva; opzione "applica a tutti i
  // giorni" perché nella maggior parte dei viaggi la base cambia poco.
  async function setDayBaseFlow(dayIndex) {
    const ask = window.modalPrompt || ((m, o) => Promise.resolve(prompt(m, o?.defaultValue || '')));
    const confirmFn = window.modalConfirm || ((m) => Promise.resolve(confirm(m)));
    const current = window.ITINERARY?.getDayBase?.(dayIndex);

    const q = await ask('Hotel/indirizzo della base (es. "APA Hotel Shinjuku"):', { defaultValue: current?.name || '' });
    if (!q || !q.trim()) return;

    window.toast?.('🔎 Cerco la posizione…');
    let results;
    try {
      const url = 'https://nominatim.openstreetmap.org/search?' + new URLSearchParams({ q: q.trim(), format: 'json', limit: 1 });
      results = await (await fetch(url)).json();
    } catch (_) { window.toast?.('❌ Geocoding non raggiungibile, riprova'); return; }
    if (!Array.isArray(results) || !results.length) {
      window.toast?.('❌ Posizione non trovata — prova con un indirizzo più specifico');
      return;
    }
    const hit = results[0];
    const shortName = q.trim().slice(0, 60);
    const ok = await confirmFn(`Trovato: ${hit.display_name}\n\nUsare come base del giorno ${dayIndex + 1}?`);
    if (!ok) return;

    const base = { name: shortName, lat: parseFloat(hit.lat), lng: parseFloat(hit.lon) };
    window.ITINERARY.setDayBase(dayIndex, base);

    const allDays = await confirmFn('Applicare la stessa base a TUTTI i giorni del viaggio?');
    if (allDays) {
      const n = Object.keys(window.state?.itineraryByDay || {}).length;
      for (let i = 0; i < n; i++) window.ITINERARY.setDayBase(i, base);
    }
    window.toast?.(`🏨 Base impostata: ${shortName}`);
    window.renderItineraryUnified();
  }
  window.setDayBaseFlow = setDayBaseFlow;
})();
