/**
 * UNIFIED ITINERARY VIEW
 * Combines personal itinerary (accordion) + shared itinerary (group) + sharing controls
 * Single place for trip building and management
 */

function renderItineraryUnified() {
  console.log('═══════════════════════════════════════════════════');
  console.log('[UnifiedItinerary] 🚀 STARTING renderItineraryUnified()');
  console.log('═══════════════════════════════════════════════════');

  if (!window.ITINERARY) {
    console.warn('[UnifiedItinerary] ❌ ITINERARY system not ready');
    return;
  }

  ITINERARY.initState();
  const tripProfile = window.state?.tripProfile || {};
  const days = tripProfile.days || 8;
  const budget = tripProfile.budget_total || 0;
  const budgetDaily = tripProfile.budget_daily || 0;

  // Load shared itinerary from state
  const sharedItinerary = window.state?.itinerary || [];

  // Calculate budget using full breakdown (POI + ticket + transport)
  let totalPOIs = 0;
  let budgetBreakdown = ITINERARY.calculateTotalBudget();
  let totalCostSpent = budgetBreakdown.total;
  let costByDay = {};

  for (let d = 0; d < days; d++) {
    const dayPOIs = window.state.itineraryByDay[d] || [];
    totalPOIs += dayPOIs.length;
    costByDay[d] = budgetBreakdown.by_day[d]?.total || 0;
  }

  // ===== SECTION 1: PERSONAL ITINERARY (ACCORDION) =====
  const accordionHTML = Array.from({ length: days }, (_, dayIndex) => {
    const dayPOIs = window.state.itineraryByDay[dayIndex] || [];
    const dayDate = new Date(2027, 3, 10 + dayIndex);
    const dayLabel = `Day ${dayIndex + 1} — ${dayDate.toLocaleDateString('it-IT', { weekday: 'short', month: 'short', day: 'numeric' })}`;
    const dayDuration = ITINERARY.getDayDuration(dayIndex);
    const poiListHTML = dayPOIs.length ? dayPOIs.map((entry, idx) => {
      const poiNameDisplay = entry.poi_name || `POI #${entry.poi_id.substring(0, 8)}`;
      const costBadge = entry.cost > 0 ? `<span style="background:rgba(255,107,53,0.3);color:#FF9966;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600">¥${entry.cost}</span>` : '';
      const durationColor = entry.duration < 30 ? 'rgba(76,175,80,0.7)' : entry.duration < 120 ? 'rgba(255,193,7,0.7)' : 'rgba(255,107,53,0.7)';
      return `
        <div class="itinerary-poi" draggable="true" data-poi-id="${entry.poi_id}" data-day="${dayIndex}" style="
          display:flex;
          flex-direction:column;
          gap:10px;
          padding:12px 14px;
          background:linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02));
          border:1px solid rgba(255,255,255,0.12);
          border-radius:8px;
          margin-bottom:8px;
          cursor:grab;
          transition:background 0.2s ease,border-color 0.2s ease;
          box-shadow:0 2px 8px rgba(0,0,0,0.2);
        " onmouseover="this.style.background='linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))';this.style.borderColor='rgba(255,255,255,0.2)'" onmouseout="this.style.background='linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))';this.style.borderColor='rgba(255,255,255,0.12)'">

          <!-- ROW 1: Number + Name + Menu (hidden on hover) -->
          <div style="display:flex;align-items:center;gap:8px;width:100%;overflow:hidden" class="itinerary-poi-header">
            <span style="flex-shrink:0;width:24px;height:24px;background:linear-gradient(135deg, #FF6B35, #FF8A5B);color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700">${idx + 1}</span>
            <div style="flex:1;min-width:0;overflow:hidden">
              <div style="font-size:14px;color:#fff;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${poiNameDisplay}</div>
            </div>
            <button class="itinerary-menu-btn" data-poi-id="${entry.poi_id}" style="flex-shrink:0;min-width:44px;min-height:44px;background:transparent;border:none;border-radius:8px;color:rgba(255,255,255,0.5);cursor:pointer;font-size:18px;padding:0;transition:background 0.15s,color 0.15s;opacity:1;margin-left:auto" onmouseover="this.style.background='rgba(255,255,255,0.1)';this.style.color='rgba(255,255,255,0.9)'" onmouseout="this.style.background='transparent';this.style.color='rgba(255,255,255,0.5)'">⋮</button>
          </div>

          <!-- ROW 2: Time, Duration, Cost badges -->
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
            <span style="background:rgba(74,124,89,0.3);color:#4ade80;padding:4px 10px;border-radius:5px;font-size:12px;font-weight:600;display:flex;align-items:center;gap:4px">
              ⏰ ${entry.time}
            </span>
            <span style="background:${durationColor === 'rgba(76,175,80,0.7)' ? 'rgba(76,175,80,0.25)' : durationColor === 'rgba(255,193,7,0.7)' ? 'rgba(255,193,7,0.25)' : 'rgba(255,107,53,0.25)'};color:${durationColor};padding:4px 10px;border-radius:5px;font-size:12px;font-weight:600;display:flex;align-items:center;gap:4px">
              ⏱️ ${entry.duration}m
            </span>
            ${costBadge}
          </div>

          <!-- ROW 3: Route from previous POI (if calculated) -->
          ${entry.route_from_prev ? `
            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;padding:6px 10px;background:rgba(100,150,200,0.1);border-radius:6px">
              <span style="font-size:11px;color:rgba(100,200,255,0.8);font-weight:600">
                📍 ${entry.route_from_prev.distance_km}km
              </span>
              <span style="font-size:11px;color:rgba(100,200,255,0.8);font-weight:600">
                ⏱️ ${entry.route_from_prev.duration_min}min
              </span>
              <span style="font-size:10px;color:rgba(100,200,255,0.7);padding:2px 6px;background:rgba(100,200,255,0.15);border-radius:4px">
                ${entry.route_from_prev.mode === 'walking' ? '🚶' : entry.route_from_prev.mode === 'driving' ? '🚗' : '🚌'} ${entry.route_from_prev.mode}
              </span>
            </div>
          ` : ''}

          <!-- ROW 4: Opening hours + Price level (if enriched) -->
          ${(entry.opening_hours || entry.price_level) ? `
            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
              ${entry.opening_hours ? `
                <span style="background:rgba(100,200,255,0.2);color:#64c8ff;padding:4px 10px;border-radius:5px;font-size:11px;font-weight:600;display:flex;align-items:center;gap:4px;white-space:nowrap">
                  🕐 ${Array.isArray(entry.opening_hours) ? 'Orari disponibili' : (entry.opening_hours.substring(0, 30) + (entry.opening_hours.length > 30 ? '...' : ''))}
                </span>
              ` : ''}
              ${entry.price_level ? `
                <span style="background:rgba(255,193,7,0.2);color:#ffc107;padding:4px 10px;border-radius:5px;font-size:11px;font-weight:600;display:flex;align-items:center;gap:4px">
                  💰 ${entry.price_level}
                </span>
              ` : ''}
              ${entry.ticket_cost ? `
                <span style="background:rgba(255,87,87,0.2);color:#ff5757;padding:4px 10px;border-radius:5px;font-size:11px;font-weight:600;display:flex;align-items:center;gap:4px">
                  🎫 ¥${entry.ticket_cost}
                </span>
              ` : ''}
            </div>
          ` : ''}

          <!-- ROW 4: Notes (if present) -->
          ${entry.notes ? `
            <div style="padding:8px 10px;background:rgba(255,255,255,0.04);border-left:3px solid rgba(255,193,7,0.4);border-radius:4px;font-size:12px;color:rgba(255,255,255,0.75);line-height:1.4">
              <strong style="color:rgba(255,193,7,0.8)">📝 Nota:</strong> ${entry.notes}
            </div>
          ` : ''}
        </div>
      `;
    }).join('') : '<p style="color:rgba(255,255,255,0.5);font-size:12px;padding:12px;text-align:center">📍 Nessun POI aggiunto. Clicca [+] per aggiungerlo</p>';

    return `
      <div class="itinerary-day-accordion" style="margin-bottom:14px;border-radius:10px;overflow:hidden;border:1px solid rgba(255,255,255,0.12);box-shadow:0 2px 8px rgba(0,0,0,0.2)">
        <button class="itinerary-day-header" data-day="${dayIndex}" style="
          width:100%;
          padding:14px 16px;
          background:linear-gradient(90deg, rgba(74,124,89,0.2), rgba(255,107,53,0.08));
          border:none;
          border-bottom:1px solid rgba(255,255,255,0.1);
          color:#fff;
          text-align:left;
          cursor:pointer;
          display:flex;
          justify-content:space-between;
          align-items:center;
          transition:background 0.2s ease;
          font-weight:700;
          font-size:15px;
          min-height:44px;
        " onmouseover="this.style.background='linear-gradient(90deg, rgba(74,124,89,0.3), rgba(255,107,53,0.15))'" onmouseout="this.style.background='linear-gradient(90deg, rgba(74,124,89,0.2), rgba(255,107,53,0.08))'">
          <span style="display:flex;align-items:center;gap:8px">
            <span style="font-size:18px">📅</span>
            <span>${dayLabel}</span>
          </span>
          <span style="display:flex;align-items:center;gap:12px;font-size:13px;color:rgba(255,255,255,0.7)">
            <span style="background:rgba(74,124,89,0.3);color:#4ade80;padding:3px 10px;border-radius:4px;font-weight:600">${dayPOIs.length} POI</span>
            <span style="background:rgba(255,107,53,0.3);color:#FFB88C;padding:3px 10px;border-radius:4px;font-weight:600">${Math.round(dayDuration / 60)}h</span>
            ${costByDay[dayIndex] > 0 ? `<span style="background:rgba(100,200,255,0.25);color:#64c8ff;padding:3px 10px;border-radius:4px;font-weight:600">¥${costByDay[dayIndex]}</span>` : ''}
          </span>
        </button>
        <div class="itinerary-day-content" data-day="${dayIndex}" style="
          display:none;
          padding:14px 16px;
          background:rgba(255,255,255,0.02);
          border-top:1px solid rgba(255,255,255,0.08);
          contain:layout style paint;
        ">
          <div class="itinerary-poi-list" style="margin-bottom:12px">${poiListHTML}</div>
          <button class="itinerary-add-btn" data-day="${dayIndex}" style="
            width:100%;
            padding:10px 14px;
            min-height:44px;
            background:linear-gradient(135deg, rgba(76,175,80,0.15), rgba(74,124,89,0.1));
            border:2px dashed rgba(76,175,80,0.4);
            border-radius:8px;
            color:#4ade80;
            font-weight:700;
            font-size:13px;
            cursor:pointer;
            transition:background 0.2s ease,border-color 0.2s ease;
            display:flex;
            align-items:center;
            justify-content:center;
            gap:6px;
          " onmouseover="this.style.background='linear-gradient(135deg, rgba(76,175,80,0.25), rgba(74,124,89,0.15))';this.style.borderColor='rgba(76,175,80,0.6)'" onmouseout="this.style.background='linear-gradient(135deg, rgba(76,175,80,0.15), rgba(74,124,89,0.1))';this.style.borderColor='rgba(76,175,80,0.4)'">
            <span style="font-size:16px">➕</span> Aggiungi POI a questo giorno
          </button>
        </div>
      </div>
    `;
  }).join('');

  // ===== SECTION 2: SHARED ITINERARY (GROUP) =====
  const sharedItineraryHTML = sharedItinerary.length ? sharedItinerary.map((entry, idx) => {
    const poi = window.allPOIs?.() ? window.allPOIs().find(p => p.googlePlaceId === entry.id) : null;
    const dayStr = entry.day ? ` · 📅 G${entry.day}` : '';
    const timeStr = entry.time ? ` · ⏰ ${entry.time}` : '';
    return `
      <div style="
        padding: 12px;
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,165,100,0.2);
        border-radius: 8px;
        margin-bottom: 8px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      ">
        <div>
          <div style="font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.95);">${entry.name || (poi ? poi.name : '?')}</div>
          <div style="font-size: 11px; color: rgba(255,255,255,0.6);">${entry.city || (poi ? poi.city : '?')}${dayStr}${timeStr}</div>
        </div>
        <button data-remove-itinerary="${entry.id}" style="
          padding: 6px 10px;
          background: rgba(255,107,107,0.2);
          border: 1px solid rgba(255,107,107,0.4);
          border-radius: 6px;
          color: #FF6B6B;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        " onmouseover="this.style.background='rgba(255,107,107,0.3)'" onmouseout="this.style.background='rgba(255,107,107,0.2)'">✕ Rimuovi</button>
      </div>
    `;
  }).join('') : '<p style="color:rgba(255,255,255,0.5);font-size:12px;padding:8px">Nessuna tappa condivisa ancora.</p>';

  // ===== FINAL HTML =====
  const html = `
    <div style="padding:0;display:flex;flex-direction:column;gap:24px;">

      <!-- BUDGET SUMMARY -->
      <div class="budget-summary" style="
        background:linear-gradient(135deg, rgba(74,91,168,0.15), rgba(255,107,53,0.1));
        border:1px solid rgba(255,255,255,0.15);
        border-radius:8px;
        padding:12px 14px;
      ">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <span style="font-weight:600;color:#fff">💰 Budget</span>
          <span style="font-size:12px;color:rgba(255,255,255,0.7)">${days} giorni</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:8px">
          <div style="flex:1;min-width:0">
            <div style="font-size:11px;color:rgba(255,255,255,0.6);margin-bottom:2px">Pianificato</div>
            <div style="font-size:16px;color:#FF6B35;font-weight:700">¥${budget}</div>
          </div>
          <div style="flex:1;min-width:0">
            <div style="font-size:11px;color:rgba(255,255,255,0.6);margin-bottom:2px">Speso</div>
            <div style="font-size:16px;color:${totalCostSpent > budget ? '#ff6b6b' : '#4ade80'};font-weight:700">¥${totalCostSpent}</div>
          </div>
          <div style="flex:1;min-width:0">
            <div style="font-size:11px;color:rgba(255,255,255,0.6);margin-bottom:2px">Rimasto</div>
            <div style="font-size:16px;color:${budget - totalCostSpent < 0 ? '#ff6b6b' : '#4ade80'};font-weight:700">¥${Math.max(0, budget - totalCostSpent)}</div>
          </div>
        </div>
        ${totalCostSpent > 0 ? `
          <div style="height:4px;background:rgba(255,255,255,0.1);border-radius:2px;overflow:hidden;margin-bottom:8px">
            <div style="height:100%;background:linear-gradient(90deg, #4ade80, #FF6B35);width:${Math.min(100, (totalCostSpent/budget)*100)}%"></div>
          </div>
          <div style="font-size:10px;color:rgba(255,255,255,0.5);text-align:center;margin-bottom:8px">${Math.round((totalCostSpent/budget)*100)}% allocato</div>
        ` : ''}

        <!-- Budget breakdown: POI, tickets, transport -->
        ${budgetBreakdown.poi_cost > 0 || budgetBreakdown.ticket_cost > 0 || budgetBreakdown.transport_cost > 0 ? `
          <div style="font-size:11px;color:rgba(255,255,255,0.6);margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.1)">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px">
              <span>🏪 POI & Ticket</span>
              <span style="color:rgba(255,255,255,0.8)">¥${budgetBreakdown.poi_cost + budgetBreakdown.ticket_cost}</span>
            </div>
            <div style="display:flex;justify-content:space-between">
              <span>🚌 Trasporti</span>
              <span style="color:rgba(255,255,255,0.8)">¥${budgetBreakdown.transport_cost}</span>
            </div>
          </div>
        ` : ''}
      </div>

      <!-- SECTION 1: YOUR ITINERARY -->
      <div>
        <h3 style="
          font-size: 14px;
          font-weight: 700;
          color: rgba(255,255,255,0.95);
          margin: 0 0 12px 0;
        ">📅 Il Tuo Itinerario</h3>
        <div class="itinerary-accordion">${accordionHTML}</div>
      </div>

      <!-- DIVIDER -->
      <div style="height:1px;background:linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);margin:8px 0;"></div>

      <!-- SECTION 2: SHARING CONTROLS -->
      <div>
        <h3 style="
          font-size: 14px;
          font-weight: 700;
          color: rgba(255,255,255,0.95);
          margin: 0 0 12px 0;
        ">📤 Condividi con il Gruppo</h3>
        <div style="display:flex;flex-direction:column;gap:8px;">
          <button id="btn-export-whatsapp-unified" onclick="handleExportWhatsApp()" style="
            padding: 12px 16px;
            background: rgba(76,175,80,0.2);
            border: 1.5px solid rgba(76,175,80,0.5);
            border-radius: 8px;
            color: #fff;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          " onmouseover="this.style.background='rgba(76,175,80,0.3)'" onmouseout="this.style.background='rgba(76,175,80,0.2)'">
            📤 Esporta su WhatsApp
          </button>
          <button id="btn-share-group-unified" onclick="handleShareGroup()" style="
            padding: 12px 16px;
            background: rgba(255,107,107,0.2);
            border: 1.5px solid rgba(255,107,107,0.4);
            border-radius: 8px;
            color: #fff;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          " onmouseover="this.style.background='rgba(255,107,107,0.3)'" onmouseout="this.style.background='rgba(255,107,107,0.2)'">
            👥 Condividi con Gruppo
          </button>
        </div>
      </div>

      <!-- SECTION 3: SHARED ITINERARY -->
      <div>
        <h3 style="
          font-size: 14px;
          font-weight: 700;
          color: rgba(255,255,255,0.95);
          margin: 0 0 12px 0;
        ">👥 Itinerario Condiviso</h3>
        <p style="
          font-size: 12px;
          color: rgba(255,255,255,0.6);
          margin: 0 0 12px 0;
        ">Tappe condivise con i membri del gruppo (tempo reale)</p>
        <div style="display:flex;flex-direction:column;gap:6px;">
          ${sharedItineraryHTML}
        </div>
      </div>

    </div>
  `;

  console.log('[UnifiedItinerary] Calling window.openSheet...');
  console.log('[DEBUG] sheetBody before openSheet:', {
    exists: !!document.getElementById('sheet-body'),
    html: document.getElementById('sheet-body')?.innerHTML?.substring(0, 100)
  });
  window.openSheet('📅 Itinerario', html);
  setTimeout(() => {
    console.log('[DEBUG] sheetBody AFTER openSheet:', {
      exists: !!document.getElementById('sheet-body'),
      hasButtons: document.getElementById('sheet-body')?.innerHTML?.includes('btn-export-whatsapp-unified'),
      isVisible: document.getElementById('sheet-body')?.offsetParent !== null
    });
  }, 200);

  // Setup accordion + drag-drop only (sharing buttons use global event delegation)
  setTimeout(() => {
    setupAccordionAndDragDrop();

    // Background enrichment of POI data (opening hours, pricing, etc.)
    if (window.ITINERARY?.enrichAllEntries) {
      console.log('[UnifiedItinerary] Starting background POI enrichment...');
      window.ITINERARY.enrichAllEntries();
    }

    // Background routing calculation (distance, duration between consecutive POI)
    if (window.ITINERARY?.calculateAllRouting) {
      console.log('[UnifiedItinerary] Starting background routing calculation...');
      window.ITINERARY.calculateAllRouting();
    }

    console.log('[UnifiedItinerary] ✅ renderItineraryUnified COMPLETE');
  }, 500);
}

/**
 * DIRECT HANDLERS FOR SHARE BUTTONS
 * Called via onclick attribute in the HTML for maximum reliability
 */
window.handleExportWhatsApp = function() {
  console.log('[ItineraryUnified] 📤 WhatsApp export button clicked');

  let totalPOIs = 0;
  const tripProfile = window.state?.tripProfile || {};
  const days = tripProfile.days || 8;

  for (let d = 0; d < days; d++) {
    totalPOIs += (window.state?.itineraryByDay?.[d] || []).length;
  }

  if (totalPOIs === 0) {
    console.log('[ItineraryUnified] ⚠️ Itinerary empty, showing empty modal');
    showEmptyItineraryModal();
    return;
  }

  if (typeof window.exportItineraryWhatsApp === 'function') {
    console.log('[ItineraryUnified] ✅ Calling exportItineraryWhatsApp()');
    try {
      window.exportItineraryWhatsApp();
    } catch (err) {
      console.error('[ItineraryUnified] ❌ Error:', err);
      if (window.toast) window.toast('❌ Errore: ' + err.message);
    }
  }
};

window.handleShareGroup = function() {
  console.log('[ItineraryUnified] 👥 Share group button clicked');

  let totalPOIs = 0;
  const tripProfile = window.state?.tripProfile || {};
  const days = tripProfile.days || 8;

  for (let d = 0; d < days; d++) {
    totalPOIs += (window.state?.itineraryByDay?.[d] || []).length;
  }

  if (totalPOIs === 0) {
    console.log('[ItineraryUnified] ⚠️ Itinerary empty, showing empty modal');
    showEmptyItineraryModal();
    return;
  }

  if (typeof window.showShareItineraryModal === 'function') {
    console.log('[ItineraryUnified] ✅ Calling showShareItineraryModal()');
    try {
      window.showShareItineraryModal();
    } catch (err) {
      console.error('[ItineraryUnified] ❌ Error:', err);
      if (window.toast) window.toast('❌ Errore: ' + err.message);
    }
  }
};

/**
 * SETUP EVENT DELEGATION ONCE AT LOAD TIME
 * This is more robust than attaching in setupUnifiedItineraryHandlers
 * because it works regardless of when/how openSheet() is called
 */
function setupGlobalEventDelegation() {
  const sheetBody = document.getElementById('sheet-body');
  if (!sheetBody) {
    console.warn('[ItineraryUnified] ⚠️ sheet-body not found on page load - retrying...');
    setTimeout(setupGlobalEventDelegation, 500);
    return;
  }

  console.log('[ItineraryUnified] 🔧 Setting up GLOBAL EVENT DELEGATION on sheet-body (one-time setup)');

  console.log('[ItineraryUnified] ✅ Global event delegation attached for menu and remove buttons');

  // Menu button (modifica, sposta, cancella)
  sheetBody.addEventListener('click', (e) => {
    const btn = e.target.closest('.itinerary-menu-btn');
    if (!btn) return;

    e.stopPropagation();
    const poiId = btn.dataset.poiId;
    if (typeof showItineraryPOIMenu === 'function') {
      showItineraryPOIMenu(poiId);
    }
  }, false);

  // Remove from shared itinerary
  sheetBody.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-remove-itinerary]');
    if (!btn) return;

    const entryId = btn.dataset.removeItinerary;
    if (confirm('Rimuovere questa tappa dal gruppo?')) {
      if (window.state?.itinerary) {
        const idx = window.state.itinerary.findIndex(e => e.id === entryId);
        if (idx !== -1) {
          window.state.itinerary.splice(idx, 1);
          window.PERF_UTILS?.batchedSaveState ? window.PERF_UTILS.batchedSaveState() : window.saveState?.();
          renderItineraryUnified();
          if (window.toast) window.toast('✓ Tappa rimossa');
        }
      }
    }
  }, false);

  console.log('[ItineraryUnified] ✅ Global event delegation setup complete');
}

/**
 * CHECK if itinerary is shareable (has at least one POI)
 * Returns true only if there's at least one POI across all days
 */
function hasShareableItinerary() {
  const tripProfile = window.state?.tripProfile || {};
  const days = tripProfile.days || 8;
  let totalPOIs = 0;

  for (let d = 0; d < days; d++) {
    const dayPOIs = window.state?.itineraryByDay?.[d] || [];
    totalPOIs += dayPOIs.length;
  }

  const isShareable = totalPOIs > 0;
  console.log('[ItineraryUnified] 🔍 hasShareableItinerary():', {
    totalPOIs,
    isShareable,
    message: isShareable ? '✅ share allowed: itinerary has POIs' : '🚫 share blocked: empty itinerary'
  });

  return isShareable;
}

/**
 * ELEGANT EMPTY SHARE MODAL
 * UX: Explain why share is blocked, offer next useful step
 * Design: Dark warm, coherent with rest of app
 */
function showEmptyItineraryModal() {
  const html = `
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 24px;
      text-align: center;
      min-height: 400px;
    ">
      <!-- Icon -->
      <div style="
        font-size: 64px;
        margin-bottom: 24px;
        opacity: 0.9;
      ">📭</div>

      <!-- Heading -->
      <h2 style="
        font-size: 20px;
        font-weight: 700;
        color: rgba(255,255,255,0.95);
        margin: 0 0 16px 0;
        line-height: 1.3;
      ">Nessun itinerario da condividere</h2>

      <!-- Description -->
      <p style="
        font-size: 14px;
        color: rgba(255,255,255,0.7);
        margin: 0 0 32px 0;
        line-height: 1.6;
        max-width: 320px;
      ">Non hai ancora aggiunto nessuna tappa al tuo itinerario. Aggiungi almeno un luogo a uno dei giorni prima di esportarlo o condividerlo con il gruppo.</p>

      <!-- CTA Buttons -->
      <div style="
        display: flex;
        flex-direction: column;
        gap: 8px;
        width: 100%;
        max-width: 220px;
      ">
        <!-- Primary button: Ho capito -->
        <button class="empty-share-close-btn" style="
          padding: 6px 10px !important;
          background: rgba(255,107,53,0.15) !important;
          border: 1px solid rgba(255,107,53,0.4) !important;
          border-radius: 5px !important;
          color: #FF6B35 !important;
          font-size: 13px !important;
          font-weight: 600 !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
          line-height: 1.2 !important;
          height: auto !important;
          min-height: auto !important;
        " onmouseover="this.style.background='rgba(255,107,53,0.25)'; this.style.borderColor='rgba(255,107,53,0.6)';" onmouseout="this.style.background='rgba(255,107,53,0.15)'; this.style.borderColor='rgba(255,107,53,0.4)';">
          Ho capito
        </button>

        <!-- Secondary button: Aggiungi una tappa -->
        <button class="empty-share-add-btn" style="
          padding: 6px 10px !important;
          background: linear-gradient(135deg, rgba(76,175,80,0.2), rgba(76,175,80,0.1)) !important;
          border: 1px solid rgba(76,175,80,0.4) !important;
          border-radius: 5px !important;
          color: #4ADE80 !important;
          font-size: 13px !important;
          font-weight: 600 !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
          line-height: 1.2 !important;
          height: auto !important;
          min-height: auto !important;
        " onmouseover="this.style.background='linear-gradient(135deg, rgba(76,175,80,0.3), rgba(76,175,80,0.15))'; this.style.borderColor='rgba(76,175,80,0.6)';" onmouseout="this.style.background='linear-gradient(135deg, rgba(76,175,80,0.2), rgba(76,175,80,0.1))'; this.style.borderColor='rgba(76,175,80,0.4)';">
          ➕ Aggiungi una tappa
        </button>
      </div>
    </div>
  `;

  window.openSheet('📭 Itinerario vuoto', html);
  console.log('[ItineraryUnified] 📭 showEmptyShareModal() opened');

  // Setup button handlers via event delegation (will be caught by global handlers)
  // But also attach direct handlers for robustness
  setTimeout(() => {
    const closeBtn = document.querySelector('.empty-share-close-btn');
    const addBtn = document.querySelector('.empty-share-add-btn');

    if (closeBtn) {
      closeBtn.onclick = () => {
        console.log('[ItineraryUnified] ✓ User closed empty share modal');
        window.closeSheet();
      };
    }

    if (addBtn) {
      addBtn.onclick = () => {
        console.log('[ItineraryUnified] ✓ User clicked "Aggiungi una tappa"');
        window.closeSheet();
        // Go to map tab to start adding POIs
        const mapBtn = document.querySelector('nav.bottom button[data-view="map"]');
        if (mapBtn) {
          mapBtn.click();
          if (window.toast) window.toast('📍 Clicca un luogo sulla mappa per aggiungerlo');
        }
      };
    }
  }, 50);
}

/**
 * ACCORDION + DRAG-DROP only
 * Sharing buttons are handled by setupGlobalEventDelegation (one-time setup at load)
 */
function setupAccordionAndDragDrop() {
  console.log('[UnifiedItinerary] ⚙️ Setting up accordion + drag-drop...');

  // Accordion toggle with debounce to prevent rapid clicks
  const headers = document.querySelectorAll('.itinerary-day-header');
  console.log(`[UnifiedItinerary] Found ${headers.length} day headers`);

  headers.forEach((header) => {
    const debouncedToggle = (window.PERF_UTILS?.debounce || ((fn) => fn))(function(e) {
      const dayIndex = header.dataset.day;
      const content = document.querySelector(`.itinerary-day-content[data-day="${dayIndex}"]`);
      if (content) {
        const isOpen = content.style.display === 'block';
        content.style.display = isOpen ? 'none' : 'block';
        header.style.borderBottomColor = isOpen ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)';
      }
    }, 100);

    header.addEventListener('click', debouncedToggle);
  });

  // Drag-drop
  document.querySelectorAll('.itinerary-poi').forEach(poi => {
    poi.addEventListener('dragstart', (e) => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('poiId', poi.dataset.poiId);
      e.dataTransfer.setData('fromDay', poi.dataset.day);
      poi.style.opacity = '0.5';
    });
    poi.addEventListener('dragend', (e) => {
      poi.style.opacity = '1';
    });
  });

  document.querySelectorAll('.itinerary-day-content').forEach(content => {
    content.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      content.style.background = 'rgba(255,255,255,0.05)';
    });
    content.addEventListener('dragleave', (e) => {
      content.style.background = 'rgba(255,255,255,0.01)';
    });
    content.addEventListener('drop', (e) => {
      e.preventDefault();
      content.style.background = 'rgba(255,255,255,0.01)';
      const poiId = e.dataTransfer.getData('poiId');
      const fromDay = parseInt(e.dataTransfer.getData('fromDay'));
      const toDay = parseInt(content.dataset.day);
      if (fromDay !== toDay && poiId) {
        window.ITINERARY?.moveToDay(poiId, toDay);
        window.PERF_UTILS?.batchedSaveState ? window.PERF_UTILS.batchedSaveState() : window.saveState?.();
        renderItineraryUnified();
      }
    });
  });

  // Add POI button
  const addBtns = document.querySelectorAll('.itinerary-add-btn');
  addBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const dayIndex = parseInt(btn.dataset.day);
      if (window.toast) {
        window.toast('📍 Tap un POI sulla mappa per aggiungerlo a Day ' + (dayIndex + 1));
      }
    });
  });

  console.log('[UnifiedItinerary] ✅ Accordion + drag-drop setup complete');
}

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
        background:${isCurrentDay ? 'rgba(255,107,53,0.3)' : 'rgba(255,255,255,0.08)'};
        border:1px solid ${isCurrentDay ? 'rgba(255,107,53,0.5)' : 'rgba(255,255,255,0.15)'};
        border-radius:4px;
        color:#fff;
        cursor:pointer;
        font-size:12px;
        transition:all 0.2s;
        font-weight:${isCurrentDay ? '600' : '400'};
      " onmouseover="this.style.background='rgba(255,107,53,0.4)'" onmouseout="this.style.background='${isCurrentDay ? 'rgba(255,107,53,0.3)' : 'rgba(255,255,255,0.08)'}'">
        Day ${i + 1} ${isCurrentDay ? '✓' : ''}
      </button>
    `;
  }).join('');

  const html = `
    <div style="padding:20px;display:flex;flex-direction:column;gap:16px;">
      <div>
        <h3 style="margin:0 0 12px 0;color:#fff;font-size:15px;font-weight:700">📋 ${poiName}</h3>
        <p style="margin:0;color:rgba(255,255,255,0.6);font-size:12px">Opzioni disponibili</p>
      </div>

      <!-- Orario -->
      <div>
        <label style="display:block;color:rgba(255,255,255,0.7);font-size:12px;margin-bottom:6px;font-weight:600">⏰ Orario</label>
        <input type="text" class="itinerary-menu-time" placeholder="HH:MM" value="${poiData.time}" style="
          width:100%;
          padding:8px 10px;
          background:rgba(255,255,255,0.08);
          border:1px solid rgba(255,255,255,0.15);
          border-radius:4px;
          color:#fff;
          font-size:13px;
          box-sizing:border-box;
        " />
      </div>

      <!-- Durata -->
      <div>
        <label style="display:block;color:rgba(255,255,255,0.7);font-size:12px;margin-bottom:6px;font-weight:600">⏱️ Durata (minuti)</label>
        <input type="number" class="itinerary-menu-duration" placeholder="60" value="${poiData.duration}" style="
          width:100%;
          padding:8px 10px;
          background:rgba(255,255,255,0.08);
          border:1px solid rgba(255,255,255,0.15);
          border-radius:4px;
          color:#fff;
          font-size:13px;
          box-sizing:border-box;
        " />
      </div>

      <!-- Costo -->
      <div>
        <label style="display:block;color:rgba(255,255,255,0.7);font-size:12px;margin-bottom:6px;font-weight:600">💰 Costo (¥)</label>
        <input type="number" class="itinerary-menu-cost" placeholder="0" value="${poiData.cost || 0}" style="
          width:100%;
          padding:8px 10px;
          background:rgba(255,255,255,0.08);
          border:1px solid rgba(255,255,255,0.15);
          border-radius:4px;
          color:#fff;
          font-size:13px;
          box-sizing:border-box;
        " />
      </div>

      <!-- Note -->
      <div>
        <label style="display:block;color:rgba(255,255,255,0.7);font-size:12px;margin-bottom:6px;font-weight:600">📝 Note</label>
        <textarea class="itinerary-menu-notes" placeholder="Aggiungi una nota..." style="
          width:100%;
          padding:8px 10px;
          background:rgba(255,255,255,0.08);
          border:1px solid rgba(255,255,255,0.15);
          border-radius:4px;
          color:#fff;
          font-size:13px;
          box-sizing:border-box;
          resize:vertical;
          min-height:60px;
          font-family:inherit;
        ">${poiData.notes || ''}</textarea>
      </div>

      <!-- Sposta a un altro giorno -->
      <div>
        <label style="display:block;color:rgba(255,255,255,0.7);font-size:12px;margin-bottom:8px;font-weight:600">📅 Sposta a</label>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
          ${daysOptions}
        </div>
      </div>

      <!-- Buttons -->
      <div style="display:flex;gap:8px;margin-top:12px;">
        <button class="itinerary-menu-save" style="
          flex:1;
          padding:10px 14px;
          background:rgba(76,175,80,0.3);
          border:1px solid rgba(76,175,80,0.5);
          border-radius:6px;
          color:#4ade80;
          font-weight:600;
          font-size:13px;
          cursor:pointer;
          transition:all 0.2s;
        " onmouseover="this.style.background='rgba(76,175,80,0.4)'" onmouseout="this.style.background='rgba(76,175,80,0.3)'">
          ✓ Salva
        </button>
        <button class="itinerary-menu-delete" style="
          flex:1;
          padding:10px 14px;
          background:rgba(255,107,107,0.2);
          border:1px solid rgba(255,107,107,0.4);
          border-radius:6px;
          color:#FF6B6B;
          font-weight:600;
          font-size:13px;
          cursor:pointer;
          transition:all 0.2s;
        " onmouseover="this.style.background='rgba(255,107,107,0.3)'" onmouseout="this.style.background='rgba(255,107,107,0.2)'">
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
            if (window.toast) window.toast('⚠️ ' + timeVal.error);
            return;
          }

          const durationVal = window.ITINERARY_VALIDATION.validateDuration(newDuration);
          if (!durationVal.valid) {
            if (window.toast) window.toast('⚠️ ' + durationVal.error);
            return;
          }

          const costVal = window.ITINERARY_VALIDATION.validateCost(newCost);
          if (!costVal.valid) {
            if (window.toast) window.toast('⚠️ ' + costVal.error);
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
        if (window.toast) window.toast('✓ Modifiche salvate');
      };
    }

    if (deleteBtn) {
      deleteBtn.onclick = () => {
        if (confirm(`Rimuovere "${poiName}" dall'itinerario?`)) {
          window.ITINERARY?.removePOI(poiId);
          window.PERF_UTILS?.batchedSaveState ? window.PERF_UTILS.batchedSaveState() : window.saveState?.();
          window.renderItineraryUnified?.();
          window.closeSheet();
          if (window.toast) window.toast('✓ POI rimosso');
        }
      };
    }

    moveButtons.forEach(btn => {
      btn.onclick = (e) => {
        const targetDay = parseInt(btn.dataset.targetDay);
        window.ITINERARY?.moveToDay(poiId, targetDay);
        window.PERF_UTILS?.batchedSaveState ? window.PERF_UTILS.batchedSaveState() : window.saveState?.();
        window.renderItineraryUnified?.();
        window.closeSheet();
        if (window.toast) window.toast(`✓ Spostato al Day ${targetDay + 1}`);
      };
    });
  }, 50);
}

// Expose to window
window.renderItineraryUnified = renderItineraryUnified;
window.showEmptyItineraryModal = showEmptyItineraryModal;
window.setupGlobalEventDelegation = setupGlobalEventDelegation;
window.showItineraryPOIMenu = showItineraryPOIMenu;

// Initialize global event delegation when script loads
console.log('[ItineraryUnified] Script loaded, waiting for DOM ready...');
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupGlobalEventDelegation);
} else {
  // DOM already loaded
  setupGlobalEventDelegation();
}
