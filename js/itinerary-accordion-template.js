// ============================================================================
// itinerary-accordion-template.js — buildDayAccordionHTML (card di un giorno
//   dell'accordion itinerario: lista POI, KPI visite/spostamenti, warning
//   orari/densità/pasto, bottone base giorno, azioni giorno).
// Estratto da itinerary-unified.js (1363 righe, il file JS più grosso del
// progetto), nessun cambio di comportamento — stesso trattamento di
// poi-detail-view.js/gf-places-panel.js in v3.34.
// Deps (window.*): t, state, ITINERARY, allPOIs, getEntryClosingWarning,
//   openDayHoursReorder
// ============================================================================
(function () {
  'use strict';

  const T = (k, f) => (typeof window.t === 'function') ? window.t(k, f) : f;
  // poiNameDisplay arriva da entry.poi_name (itinerary-crdt.js mergeGroupItinerary
  // via MQTT, editabile da altri peer) e finisce in innerHTML: va HTML-escapato.
  // Riusa window.escapeHtml (js/ui-helpers.js), pattern già in poi-detail-template.js.
  const _esc = window.escapeHtml || (s => String(s ?? ''));

  // Card HTML per un singolo giorno dell'accordion itinerario.
  function buildDayAccordionHTML(dayIndex, tripStart, tripProfile, costByDay, distanceByDay, transferMinByDay) {
    const dayPOIs = window.state.itineraryByDay[dayIndex] || [];
    const dayDate = new Date(tripStart); dayDate.setDate(dayDate.getDate() + dayIndex);
    const dayLabel = `Day ${dayIndex + 1} — ${dayDate.toLocaleDateString('it-IT', { weekday: 'short', month: 'short', day: 'numeric' })}`;
    const dayDuration = ITINERARY.getDayDuration(dayIndex);
    // ponytail: KPI visite vs spostamenti + densità giornata (riusa dati già su ogni entry)
    const _visitMin = dayDuration;
    const _transitMin = transferMinByDay[dayIndex] || 0;
    const _loadMin = _visitMin + _transitMin;
    const _dense = _loadMin > 12 * 60; // finestra attiva 12h (allineata a itinerary-suggest)
    const _transitPct = _loadMin > 0 ? Math.round(_transitMin / _loadMin * 100) : 0;
    // Conflitti orari del giorno: overlap tra tappe consecutive (riusa
    // route_from_prev già calcolato sopra, zero costo aggiuntivo) + pasto
    // mancante su una giornata piena di visite. Punto 3 roadmap planner.
    const toMin = s => { const [h, m] = (s || '').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
    const _overlapCount = dayPOIs.reduce((n, e, i) => {
      if (i === 0 || !e.route_from_prev) return n;
      const prev = dayPOIs[i - 1];
      const prevEnd = toMin(prev.time) + (prev.duration || 0) + (e.route_from_prev.duration_min || 0);
      return n + (toMin(e.time) < prevEnd ? 1 : 0);
    }, 0);
    const _hasMeal = dayPOIs.some(e => e.tag === 'cibo' || e.tag === 'food');
    const _needsMeal = _visitMin > 4 * 60 && !_hasMeal;
    const poiListHTML = dayPOIs.length ? dayPOIs.map((entry, idx) => {
      // Get POI name: first try entry.poi_name, then search allPOIs, fallback to ID
      let poiNameDisplay = entry.poi_name;
      if (!poiNameDisplay && typeof window.allPOIs === 'function') {
        const poi = window.allPOIs().find(p => p.id === entry.poi_id);
        poiNameDisplay = poi ? (poi.name || poi.title || 'Luogo sconosciuto') : `POI #${entry.poi_id.substring(0, 8)}`;
      }
      if (!poiNameDisplay) {
        poiNameDisplay = entry.city ? `Luogo in ${entry.city}` : `POI #${entry.poi_id.substring(0, 8)}`;
      }
      const costBadge = entry.cost > 0 ? `<span style="background:rgba(255,107,53,0.3);color:#FF9966;padding:2px 8px;border-radius:4px;font-size:13px;font-weight:600">¥${entry.cost}</span>` : '';
      const durationColor = entry.duration < 30 ? 'rgba(76,175,80,0.7)' : entry.duration < 120 ? 'rgba(255,193,7,0.7)' : 'rgba(255,107,53,0.7)';
      return `
        <div class="itinerary-poi" draggable="true" data-poi-id="${entry.poi_id}" data-day="${dayIndex}" style="
          display:flex;
          flex-direction:column;
          gap:10px;
          padding:12px 14px;
          background:linear-gradient(135deg, rgba(20,30,60,0.05), rgba(20,30,60,0.02));
          border:1px solid var(--l-hair);
          border-radius:8px;
          margin-bottom:8px;
          cursor:grab;
          transition:background 0.2s ease,border-color 0.2s ease;
          box-shadow:0 2px 8px rgba(0,0,0,0.06);
        " onmouseover="this.style.background='linear-gradient(135deg, rgba(20,30,60,0.1), rgba(20,30,60,0.05))';this.style.borderColor='rgba(20,30,60,0.2)'" onmouseout="this.style.background='linear-gradient(135deg, rgba(20,30,60,0.05), rgba(20,30,60,0.02))';this.style.borderColor='var(--l-hair)'">

          <!-- ROW 1: Number + Name + Menu/VisitedStatus -->
          <div style="display:flex;align-items:center;gap:8px;width:100%;overflow:hidden;opacity:${entry.status === 'visited' ? '0.7' : '1'}" class="itinerary-poi-header">
            <span style="flex-shrink:0;width:24px;height:24px;background:linear-gradient(135deg, var(--m-accent), var(--m-accent));color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700">${idx + 1}</span>
            <div style="flex:1;min-width:0;overflow:hidden">
              <div style="font-size:16px;color:var(--l-ink);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-decoration:${entry.status === 'visited' ? 'line-through' : 'none'}">${_esc(poiNameDisplay)}</div>
              ${entry.addedBy ? `<div style="font-size:12px;color:var(--l-muted);white-space:nowrap">da ${entry.addedBy}</div>` : ''}
            </div>
            ${entry.status === 'visited'
              ? `<span style="flex-shrink:0;background:rgba(22,163,74,0.15);color:#16a34a;padding:4px 10px;border-radius:5px;font-size:13px;font-weight:600;display:flex;align-items:center;gap:4px">✅ Visitato</span>`
              : `<button class="mark-visited-btn" data-poi-id="${entry.poi_id}" style="flex-shrink:0;min-width:auto;height:32px;background:rgba(22,163,74,0.1);border:1px solid rgba(22,163,74,0.3);border-radius:5px;color:#16a34a;cursor:pointer;font-size:14px;padding:0 10px;transition:background 0.15s,border-color 0.15s;margin-left:auto;margin-right:6px" onmouseover="this.style.background='rgba(22,163,74,0.18)';this.style.borderColor='rgba(22,163,74,0.5)'" onmouseout="this.style.background='rgba(22,163,74,0.1)';this.style.borderColor='rgba(22,163,74,0.3)'">✅ Segna visitato</button>`
            }
            <button class="itinerary-menu-btn" data-poi-id="${entry.poi_id}" aria-label="Opzioni tappa" style="flex-shrink:0;min-width:44px;min-height:44px;background:transparent;border:none;border-radius:8px;color:var(--l-muted);cursor:pointer;font-size:18px;padding:0;transition:background 0.15s,color 0.15s;opacity:1" onmouseover="this.style.background='rgba(20,30,60,0.08)';this.style.color='var(--l-ink)'" onmouseout="this.style.background='transparent';this.style.color='var(--l-muted)'">⋮</button>
          </div>

          <!-- ROW 2: Time, Duration, Cost badges -->
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
            <span style="background:rgba(22,163,74,0.15);color:#16a34a;padding:4px 10px;border-radius:5px;font-size:14px;font-weight:600;display:flex;align-items:center;gap:4px">
              ⏰ ${entry.time}
            </span>
            <span style="background:${durationColor === 'rgba(76,175,80,0.7)' ? 'rgba(76,175,80,0.25)' : durationColor === 'rgba(255,193,7,0.7)' ? 'rgba(255,193,7,0.25)' : 'rgba(255,107,53,0.25)'};color:${durationColor};padding:4px 10px;border-radius:5px;font-size:14px;font-weight:600;display:flex;align-items:center;gap:4px">
              ⏱️ ${entry.duration}m
            </span>
            ${costBadge}
          </div>

          <!-- ROW 3: Spostamento dalla tappa precedente (tempo + mezzo + costo) -->
          ${entry.route_from_prev ? (() => {
            const r = entry.route_from_prev;
            const em = r.mode === 'walking' ? '🚶' : r.mode === 'driving' ? '🚆' : '🚇';
            const lbl = r.mode === 'walking' ? 'a piedi' : r.mode === 'driving' ? 'treno' : 'mezzi';
            const fare = (r.cost > 0) ? `💴 ¥${r.cost}` : 'gratis';
            const fareColor = (r.cost > 0) ? '#c2410c' : '#16a34a';
            // Deep-link Google Maps Indicazioni: nessuna API transit (costa
            // quota), ma tra due coordinate reali il link apre le indicazioni
            // vere — zero chiamate, funziona sempre.
            const prev = dayPOIs[idx - 1];
            const travelMode = r.mode === 'walking' ? 'walking' : r.mode === 'driving' ? 'transit' : 'transit';
            const dirLink = (prev && typeof prev.lat === 'number' && typeof entry.lat === 'number')
              ? `<a href="https://www.google.com/maps/dir/?api=1&origin=${prev.lat},${prev.lng}&destination=${entry.lat},${entry.lng}&travelmode=${travelMode}" target="_blank" rel="noopener noreferrer" style="font-size:13px;font-weight:700;color:#0284c7;text-decoration:underline;margin-left:auto;">🧭 Indicazioni</a>`
              : '';
            return `
            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;padding:6px 10px;background:rgba(100,150,200,0.1);border-radius:6px;margin-top:4px">
              <span style="font-size:12px;color:var(--l-muted);font-weight:700;text-transform:uppercase">↳ spostamento</span>
              <span style="font-size:13px;color:#0284c7;font-weight:600">${em} ${lbl}</span>
              <span style="font-size:13px;color:#0284c7;font-weight:600">⏱️ ${r.duration_min} min</span>
              <span style="font-size:13px;color:#0284c7">📍 ${r.distance_km} km</span>
              <span style="font-size:13px;font-weight:700;color:${fareColor}">${fare}</span>
              ${dirLink}
            </div>`;
          })() : ''}

          <!-- ROW 4bis: Warning "arrivo/uscita a chiuso" (solo se abbiamo opening_periods strutturati) -->
          ${(() => {
            const w = window.getEntryClosingWarning?.(dayIndex, entry, tripProfile.startDate);
            if (!w) return '';
            const color = w.severity === 'closed' ? 'var(--m-danger)' : 'var(--m-warning)';
            const severityClass = w.severity === 'closed' ? 'is-closed' : 'is-closing-soon';
            return `
            <div class="itin-closing-warning ${severityClass}" style="display:flex;align-items:center;gap:6px;padding:6px 10px;background:color-mix(in srgb, ${color} 14%, transparent);border:1px solid color-mix(in srgb, ${color} 40%, transparent);border-radius:6px;font-size:14px;font-weight:600">
              ⚠️ ${w.message}
            </div>`;
          })()}

          <!-- ROW 4: Opening hours + Price level (if enriched) -->
          ${(entry.opening_hours || entry.price_level) ? `
            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
              ${entry.opening_hours ? `
                <span style="background:rgba(2,132,199,0.15);color:#0284c7;padding:4px 10px;border-radius:5px;font-size:13px;font-weight:600;display:flex;align-items:center;gap:4px;white-space:nowrap">
                  🕐 ${Array.isArray(entry.opening_hours) ? 'Orari disponibili' : (entry.opening_hours.substring(0, 30) + (entry.opening_hours.length > 30 ? '...' : ''))}
                </span>
              ` : ''}
              ${entry.price_level ? `
                <span style="background:rgba(255,193,7,0.2);color:#ffc107;padding:4px 10px;border-radius:5px;font-size:13px;font-weight:600;display:flex;align-items:center;gap:4px">
                  💰 ${entry.price_level}
                </span>
              ` : ''}
              ${entry.ticket_cost ? `
                <span style="background:rgba(220,38,38,0.14);color:#dc2626;padding:4px 10px;border-radius:5px;font-size:13px;font-weight:600;display:flex;align-items:center;gap:4px">
                  🎫 ¥${entry.ticket_cost}
                </span>
              ` : ''}
            </div>
          ` : ''}

          <!-- ROW 4: Notes (if present) -->
          ${entry.notes ? `
            <div style="padding:8px 10px;background:rgba(20,30,60,0.04);border-left:3px solid rgba(180,83,9,0.4);border-radius:4px;font-size:14px;color:var(--l-ink);line-height:1.4">
              <strong style="color:#b45309">📝 Nota:</strong> ${entry.notes}
            </div>
          ` : ''}
        </div>
      `;
    }).join('') : '<p style="color:var(--l-muted);font-size:14px;padding:12px;text-align:center">📍 Nessun POI aggiunto. Clicca [+] per aggiungerlo</p>';

    return `
      <div class="itinerary-day-accordion" style="margin-bottom:14px;border-radius:10px;overflow:hidden;border:1px solid var(--l-hair);box-shadow:0 2px 8px rgba(0,0,0,0.06)">
        <button class="itinerary-day-header btn-plain" data-day="${dayIndex}" style="
          width:100%;
          padding:16px 18px;
          line-height:1.5;
          background:transparent;
          border:none;
          border-bottom:1px solid var(--l-hair);
          color:var(--l-ink);
          text-align:left;
          cursor:pointer;
          display:flex;
          justify-content:space-between;
          align-items:center;
          transition:background 0.2s ease;
          font-weight:700;
          font-size:15px;
          min-height:44px;
        " onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'">
          <span style="display:flex;align-items:center;gap:8px">
            <span style="font-size:18px">📅</span>
            <span>${dayLabel}</span>
          </span>
          <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
            <span style="display:flex;align-items:center;gap:12px;font-size:15px;color:var(--l-muted)">
              <span style="background:rgba(22,163,74,0.15);color:#16a34a;padding:3px 10px;border-radius:4px;font-weight:600">${dayPOIs.length} POI</span>
              <span style="background:rgba(255,107,53,0.18);color:#c2410c;padding:3px 10px;border-radius:4px;font-weight:600">⏱ ${(dayDuration / 60).toFixed(1)}h</span>
              ${costByDay[dayIndex] > 0 ? `<span style="background:rgba(2,132,199,0.15);color:#0284c7;padding:3px 10px;border-radius:4px;font-weight:600">¥${costByDay[dayIndex]}</span>` : ''}
              ${distanceByDay[dayIndex] > 0 ? `<span style="background:rgba(2,132,199,0.15);color:#0e7490;padding:3px 10px;border-radius:4px;font-weight:600">🚶 ${distanceByDay[dayIndex].toFixed(1)}km</span>` : ''}
            </span>
            ${dayPOIs.length >= 2 ? `<span style="display:flex;align-items:center;gap:6px;font-size:13px;color:var(--l-muted);font-weight:600">
              <span title="visite vs spostamenti" style="display:inline-flex;height:6px;width:84px;border-radius:3px;overflow:hidden;background:rgba(255,107,53,0.3)"><span style="height:100%;width:${100 - _transitPct}%;background:#16a34a"></span></span>
              <span>${(_visitMin / 60).toFixed(1)}h visite · ${(_transitMin / 60).toFixed(1)}h spost. (${_transitPct}%)</span>
            </span>` : ''}
            ${_dense ? `<span style="font-size:13px;color:#b45309;font-weight:700;background:rgba(180,83,9,0.12);border:1px solid rgba(180,83,9,0.35);padding:2px 8px;border-radius:5px">⚠️ Giornata molto densa (${(_loadMin / 60).toFixed(1)}h)</span>` : ''}
            ${_overlapCount > 0 ? `<span style="font-size:13px;color:#dc2626;font-weight:700;background:rgba(220,38,38,0.12);border:1px solid rgba(220,38,38,0.35);padding:2px 8px;border-radius:5px">⛔ ${_overlapCount} tappa/e sovrapposte</span>` : ''}
            ${_needsMeal ? `<span style="font-size:13px;color:#0e7490;font-weight:700;background:rgba(14,116,144,0.12);border:1px solid rgba(14,116,144,0.35);padding:2px 8px;border-radius:5px">🍽️ Nessun pasto in giornata</span>` : ''}
          </div>
        </button>
        <div class="itinerary-day-content" data-day="${dayIndex}" style="
          display:none;
          padding:14px 16px;
          background:rgba(20,30,60,0.02);
          border-top:1px solid var(--l-hair);
          contain:layout style paint;
        ">
          <div class="itinerary-poi-list" style="margin-bottom:12px">${poiListHTML}</div>
          ${(() => {
            const base = window.ITINERARY?.getDayBase?.(dayIndex);
            return base
              ? `<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;margin-bottom:8px;background:rgba(96,125,199,0.10);border:1px solid rgba(96,125,199,0.3);border-radius:8px;font-size:14px;color:var(--l-ink);">
                   <span>🏨</span><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${base.name}</span>
                   <button class="itinerary-base-btn" data-day="${dayIndex}" style="padding:4px 10px;background:transparent;border:1px solid var(--l-hair);border-radius:6px;color:var(--l-muted);font-size:13px;cursor:pointer;min-height:0;">Cambia</button>
                 </div>`
              : `<button class="itinerary-base-btn" data-day="${dayIndex}" style="width:100%;margin-bottom:8px;padding:8px 12px;background:transparent;border:1px dashed var(--l-hair);border-radius:8px;color:var(--l-muted);font-size:14px;cursor:pointer;">🏨 Imposta base/hotel del giorno</button>`;
          })()}
          ${dayPOIs.length >= 2 ? `<button onclick="window.openDayHoursReorder?.(${dayIndex})" style="width:100%;margin-bottom:8px;padding:8px 12px;background:transparent;border:1px solid var(--l-hair);border-radius:8px;color:var(--l-muted);font-size:14px;cursor:pointer;">🕐 ${T('hreorder.buttonLabel', 'Riordina per orari')}</button>` : ''}
          <button class="itinerary-add-btn" data-day="${dayIndex}" style="
            width:100%;
            padding:10px 14px;
            min-height:44px;
            background:linear-gradient(135deg, rgba(22,163,74,0.12), rgba(74,124,89,0.08));
            border:2px dashed rgba(22,163,74,0.4);
            border-radius:8px;
            color:#16a34a;
            font-weight:700;
            font-size:15px;
            cursor:pointer;
            transition:background 0.2s ease,border-color 0.2s ease;
            display:flex;
            align-items:center;
            justify-content:center;
            gap:6px;
          " onmouseover="this.style.background='linear-gradient(135deg, rgba(22,163,74,0.2), rgba(74,124,89,0.12))';this.style.borderColor='rgba(22,163,74,0.6)'" onmouseout="this.style.background='linear-gradient(135deg, rgba(22,163,74,0.12), rgba(74,124,89,0.08))';this.style.borderColor='rgba(22,163,74,0.4)'">
            <span style="font-size:16px">➕</span> Aggiungi POI a questo giorno
          </button>
          ${dayPOIs.length >= 3 ? `<button class="itinerary-optimize-btn" data-day="${dayIndex}" style="
            width:100%;margin-top:8px;padding:9px 14px;min-height:40px;
            background:rgba(255,107,53,0.14);border:1px solid rgba(255,107,53,0.4);
            border-radius:8px;color:#c2410c;font-weight:700;font-size:15px;cursor:pointer;
            display:flex;align-items:center;justify-content:center;gap:6px">
            <span style="font-size:15px">🧭</span> Ottimizza il giro (meno spostamenti)
          </button>` : ''}
          ${dayPOIs.some(p => typeof p.lat === 'number' && typeof p.lng === 'number') ? `<button class="itinerary-gf-btn" data-day="${dayIndex}" style="
            width:100%;margin-top:8px;padding:9px 14px;min-height:40px;
            background:rgba(74,222,128,0.10);border:1px solid rgba(74,222,128,0.35);
            border-radius:8px;color:#16a34a;font-weight:700;font-size:15px;cursor:pointer;
            display:flex;align-items:center;justify-content:center;gap:6px">
            <span style="font-size:15px">🌾</span> Dove mangio GF vicino alle tappe?
          </button>` : ''}
        </div>
      </div>
    `;
  }

  window.ItineraryAccordionTemplate = { dayHTML: buildDayAccordionHTML };
})();
