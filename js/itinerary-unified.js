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

  // Check if personal itinerary is completely empty
  let totalPOIs = 0;
  let totalCostSpent = 0;
  let costByDay = {};

  for (let d = 0; d < days; d++) {
    const dayPOIs = window.state.itineraryByDay[d] || [];
    totalPOIs += dayPOIs.length;
    costByDay[d] = 0;
    dayPOIs.forEach(poi => {
      const poiCost = poi.cost || 0;
      totalCostSpent += poiCost;
      costByDay[d] += poiCost;
    });
  }

  // ===== SECTION 1: PERSONAL ITINERARY (ACCORDION) =====
  const accordionHTML = Array.from({ length: days }, (_, dayIndex) => {
    const dayPOIs = window.state.itineraryByDay[dayIndex] || [];
    const dayDate = new Date(2027, 3, 10 + dayIndex);
    const dayLabel = `Day ${dayIndex + 1} — ${dayDate.toLocaleDateString('it-IT', { weekday: 'short', month: 'short', day: 'numeric' })}`;
    const dayDuration = ITINERARY.getDayDuration(dayIndex);
    const poiListHTML = dayPOIs.length ? dayPOIs.map((entry, idx) => {
      const hasDetails = entry.notes || entry.cost > 0 || entry.duration !== 60;
      return `
        <div class="itinerary-poi" draggable="true" data-poi-id="${entry.poi_id}" data-day="${dayIndex}" style="
          display:flex;
          flex-direction:column;
          gap:0;
          padding:10px 12px;
          background:rgba(255,255,255,0.04);
          border:1px solid rgba(255,255,255,0.1);
          border-radius:6px;
          margin-bottom:6px;
          cursor:grab;
          transition:all 0.2s;
        " onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='rgba(255,255,255,0.04)'">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="flex-shrink:0;width:20px;height:20px;background:#FF6B35;color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600">${idx + 1}</span>
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;color:#fff;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${entry.poi_name}</div>
              <div style="font-size:11px;color:rgba(255,255,255,0.6)">⏰ ${entry.time} · ⏱️ ${entry.duration}m ${entry.cost > 0 ? '· 💰 ¥' + entry.cost : ''}</div>
            </div>
            <button class="itinerary-menu-btn" data-poi-id="${entry.poi_id}" style="flex-shrink:0;width:28px;height:28px;background:transparent;border:1px solid rgba(255,255,255,0.2);border-radius:4px;color:#fff;cursor:pointer;font-size:12px">⋮</button>
          </div>
          ${entry.notes ? `
            <div style="margin-top:6px;padding-top:6px;border-top:1px solid rgba(255,255,255,0.08);font-size:11px;color:rgba(255,255,255,0.6);line-height:1.3;max-height:40px;overflow:hidden">
              <strong>📝</strong> ${entry.notes}
            </div>
          ` : ''}
        </div>
      `;
    }).join('') : '<p style="color:rgba(255,255,255,0.5);font-size:12px;padding:8px">Nessun POI. Tap [+] per aggiungere</p>';

    return `
      <div class="itinerary-day-accordion" style="margin-bottom:12px;border-radius:8px;overflow:hidden;border:1px solid rgba(255,255,255,0.1)">
        <button class="itinerary-day-header" data-day="${dayIndex}" style="
          width:100%;
          padding:12px 14px;
          background:linear-gradient(90deg, rgba(74,124,89,0.15), rgba(255,107,53,0.05));
          border:none;
          border-bottom:1px solid rgba(255,255,255,0.1);
          color:#fff;
          text-align:left;
          cursor:pointer;
          display:flex;
          justify-content:space-between;
          align-items:center;
          transition:all 0.2s;
          font-weight:600;
        " onmouseover="this.style.background='linear-gradient(90deg, rgba(74,124,89,0.25), rgba(255,107,53,0.1))'" onmouseout="this.style.background='linear-gradient(90deg, rgba(74,124,89,0.15), rgba(255,107,53,0.05))'">
          <span>📅 ${dayLabel}</span>
          <span style="font-size:12px;color:rgba(255,255,255,0.6)">${dayPOIs.length} POI · ${Math.round(dayDuration / 60)}h</span>
        </button>
        <div class="itinerary-day-content" data-day="${dayIndex}" style="
          display:none;
          padding:12px 14px;
          background:rgba(255,255,255,0.01);
        ">
          <div class="itinerary-poi-list" style="margin-bottom:10px">${poiListHTML}</div>
          <button class="itinerary-add-btn" data-day="${dayIndex}" style="
            width:100%;
            padding:8px 12px;
            background:rgba(255,107,53,0.2);
            border:1px dashed rgba(255,107,53,0.4);
            border-radius:6px;
            color:#FF6B35;
            font-weight:600;
            font-size:12px;
            cursor:pointer;
            transition:all 0.2s;
          " onmouseover="this.style.background='rgba(255,107,53,0.3)'" onmouseout="this.style.background='rgba(255,107,53,0.2)'">
            [+] Aggiungi POI a questo giorno
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
          <div style="flex:1">
            <div style="font-size:11px;color:rgba(255,255,255,0.6);margin-bottom:2px">Pianificato (totale)</div>
            <div style="font-size:16px;color:#FF6B35;font-weight:700">¥${budget}</div>
          </div>
          <div style="flex:1">
            <div style="font-size:11px;color:rgba(255,255,255,0.6);margin-bottom:2px">Speso (POI)</div>
            <div style="font-size:16px;color:${totalCostSpent > budget ? '#ff6b6b' : '#4ade80'};font-weight:700">¥${totalCostSpent}</div>
          </div>
          <div style="flex:1">
            <div style="font-size:11px;color:rgba(255,255,255,0.6);margin-bottom:2px">Rimasto</div>
            <div style="font-size:16px;color:${budget - totalCostSpent < 0 ? '#ff6b6b' : '#4ade80'};font-weight:700">¥${Math.max(0, budget - totalCostSpent)}</div>
          </div>
        </div>
        ${totalCostSpent > 0 ? `
          <div style="height:4px;background:rgba(255,255,255,0.1);border-radius:2px;overflow:hidden;margin-bottom:6px">
            <div style="height:100%;background:linear-gradient(90deg, #4ade80, #FF6B35);width:${Math.min(100, (totalCostSpent/budget)*100)}%"></div>
          </div>
          <div style="font-size:10px;color:rgba(255,255,255,0.5);text-align:center">${Math.round((totalCostSpent/budget)*100)}% del budget allocato</div>
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
          window.saveState?.();
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

  // Accordion toggle
  const headers = document.querySelectorAll('.itinerary-day-header');
  console.log(`[UnifiedItinerary] Found ${headers.length} day headers`);

  headers.forEach((header) => {
    header.addEventListener('click', (e) => {
      const dayIndex = header.dataset.day;
      const content = document.querySelector(`.itinerary-day-content[data-day="${dayIndex}"]`);
      if (content) {
        const isOpen = content.style.display === 'block';
        content.style.display = isOpen ? 'none' : 'block';
        header.style.borderBottomColor = isOpen ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)';
      }
    });
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
        window.saveState?.();
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

// Expose to window
window.renderItineraryUnified = renderItineraryUnified;
window.showEmptyItineraryModal = showEmptyItineraryModal;
window.setupGlobalEventDelegation = setupGlobalEventDelegation;

// Initialize global event delegation when script loads
console.log('[ItineraryUnified] Script loaded, waiting for DOM ready...');
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupGlobalEventDelegation);
} else {
  // DOM already loaded
  setupGlobalEventDelegation();
}
