/**
 * UNIFIED ITINERARY VIEW
 * Combines personal itinerary (accordion) + shared itinerary (group) + sharing controls
 * Single place for trip building and management
 */

function renderItineraryUnified() {
  console.log('[UnifiedItinerary] Rendering unified itinerary view...');

  if (!window.ITINERARY) {
    console.warn('[UnifiedItinerary] ITINERARY system not ready');
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
  for (let d = 0; d < days; d++) {
    const dayPOIs = window.state.itineraryByDay[d] || [];
    totalPOIs += dayPOIs.length;
  }

  // ===== SECTION 1: PERSONAL ITINERARY (ACCORDION) =====
  const accordionHTML = Array.from({ length: days }, (_, dayIndex) => {
    const dayPOIs = window.state.itineraryByDay[dayIndex] || [];
    const dayDate = new Date(2027, 3, 10 + dayIndex);
    const dayLabel = `Day ${dayIndex + 1} — ${dayDate.toLocaleDateString('it-IT', { weekday: 'short', month: 'short', day: 'numeric' })}`;
    const dayDuration = ITINERARY.getDayDuration(dayIndex);
    const poiListHTML = dayPOIs.length ? dayPOIs.map((entry, idx) => `
      <div class="itinerary-poi" draggable="true" data-poi-id="${entry.poi_id}" data-day="${dayIndex}" style="
        display:flex;
        align-items:center;
        gap:8px;
        padding:10px 12px;
        background:rgba(255,255,255,0.04);
        border:1px solid rgba(255,255,255,0.1);
        border-radius:6px;
        margin-bottom:6px;
        cursor:grab;
        transition:all 0.2s;
      " onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='rgba(255,255,255,0.04)'">
        <span style="flex-shrink:0;width:20px;height:20px;background:#FF6B35;color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600">${idx + 1}</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;color:#fff;font-weight:500">${entry.poi_name}</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.6)">⏰ ${entry.time}</div>
        </div>
        <button class="itinerary-menu-btn" data-poi-id="${entry.poi_id}" style="flex-shrink:0;width:28px;height:28px;background:transparent;border:1px solid rgba(255,255,255,0.2);border-radius:4px;color:#fff;cursor:pointer;font-size:12px">⋮</button>
      </div>
    `).join('') : '<p style="color:rgba(255,255,255,0.5);font-size:12px;padding:8px">Nessun POI. Tap [+] per aggiungere</p>';

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
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <span style="font-weight:600;color:#fff">💰 Budget</span>
          <span style="font-size:12px;color:rgba(255,255,255,0.7)">${tripProfile.days || 8} giorni</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px">
          <div style="flex:1">
            <div style="font-size:11px;color:rgba(255,255,255,0.6);margin-bottom:2px">Giornaliero</div>
            <div style="font-size:16px;color:#4ADE80;font-weight:700">€${budgetDaily}</div>
          </div>
          <div style="flex:1">
            <div style="font-size:11px;color:rgba(255,255,255,0.6);margin-bottom:2px">Totale</div>
            <div style="font-size:16px;color:#FF6B35;font-weight:700">€${budget}</div>
          </div>
        </div>
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
          <button id="btn-export-whatsapp-unified" style="
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
          <button id="btn-share-group-unified" style="
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
  window.openSheet('📅 Itinerario', html);

  // Setup event handlers - CRITICAL: deve essere chiamato DOPO openSheet
  // Usa requestAnimationFrame per assicurare che il DOM sia renderizzato
  console.log('[UnifiedItinerary] Scheduling setupUnifiedItineraryHandlers with requestAnimationFrame...');
  requestAnimationFrame(() => {
    console.log('[UnifiedItinerary] requestAnimationFrame: DOM should be ready, calling setupUnifiedItineraryHandlers...');
    setupUnifiedItineraryHandlers();
    console.log('[UnifiedItinerary] ✅ renderItineraryUnified COMPLETE');
  });
}

function setupUnifiedItineraryHandlers() {
  console.log('[UnifiedItinerary] ⚙️ Setting up event handlers...');
  console.log('[UnifiedItinerary] 🔍 Checking DOM ready state:', {
    documentReady: document.readyState,
    sheetBody: !!document.getElementById('sheet-body'),
    sheet: !!document.getElementById('sheet')
  });

  // Accordion toggle
  const headers = document.querySelectorAll('.itinerary-day-header');
  console.log(`[UnifiedItinerary] Found ${headers.length} day headers for accordion toggle`);
  if (headers.length === 0) {
    console.warn('[UnifiedItinerary] ⚠️ No day headers found! Checking sheet-body...');
    const sheetBody = document.getElementById('sheet-body');
    if (sheetBody) {
      const headersInSheet = sheetBody.querySelectorAll('.itinerary-day-header');
      console.log('[UnifiedItinerary] Found', headersInSheet.length, 'headers in sheet-body');
    }
  }
  headers.forEach((header, idx) => {
    header.addEventListener('click', (e) => {
      const dayIndex = header.dataset.day;
      const content = document.querySelector(`.itinerary-day-content[data-day="${dayIndex}"]`);
      if (content) {
        const isOpen = content.style.display === 'block';
        content.style.display = isOpen ? 'none' : 'block';
        header.style.borderBottomColor = isOpen ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)';
        console.log(`[UnifiedItinerary] ✅ Day ${dayIndex} toggled: ${isOpen ? 'closed' : 'opened'}`);
      }
    });
  });
  if (headers.length > 0) {
    console.log('[UnifiedItinerary] ✅ Accordion toggle handlers attached to', headers.length, 'headers');
  }

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
  console.log(`[UnifiedItinerary] Found ${addBtns.length} "Add POI" buttons`);
  addBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const dayIndex = parseInt(btn.dataset.day);
      console.log(`[UnifiedItinerary] "Add POI" clicked for day ${dayIndex}`);
      if (window.toast) {
        window.toast('📍 Tap un POI sulla mappa per aggiungerlo a Day ' + (dayIndex + 1));
      } else {
        alert('Tap un POI sulla mappa per aggiungerlo');
      }
    });
  });

  // Menu button
  const menuBtns = document.querySelectorAll('.itinerary-menu-btn');
  console.log(`[UnifiedItinerary] Found ${menuBtns.length} menu buttons`);
  menuBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const poiId = btn.dataset.poiId;
      console.log(`[UnifiedItinerary] Menu button clicked for POI ${poiId}`);
      if (typeof showItineraryPOIMenu === 'function') {
        showItineraryPOIMenu(poiId);
      } else {
        console.warn('[UnifiedItinerary] showItineraryPOIMenu not found');
      }
    });
  });

  // Sharing buttons - with fallback search
  let btnExportWhatsapp = document.getElementById('btn-export-whatsapp-unified');
  let btnShareGroup = document.getElementById('btn-share-group-unified');

  // Fallback: search in sheet-body if not found globally
  const sheetBody = document.getElementById('sheet-body');
  if (!btnExportWhatsapp && sheetBody) {
    console.warn('[UnifiedItinerary] btn-export-whatsapp-unified not found in global DOM, searching in sheet-body...');
    btnExportWhatsapp = sheetBody.querySelector('#btn-export-whatsapp-unified');
  }
  if (!btnShareGroup && sheetBody) {
    console.warn('[UnifiedItinerary] btn-share-group-unified not found in global DOM, searching in sheet-body...');
    btnShareGroup = sheetBody.querySelector('#btn-share-group-unified');
  }

  console.log(`[UnifiedItinerary] 🔍 Searching buttons...`);
  console.log(`  - WhatsApp button found: ${!!btnExportWhatsapp}`);
  console.log(`  - Share button found: ${!!btnShareGroup}`);
  console.log(`  - sheet-body element: ${!!sheetBody}`);
  console.log(`[UnifiedItinerary] 🔍 Checking global functions...`);
  console.log(`  - exportItineraryWhatsApp: ${typeof window.exportItineraryWhatsApp === 'function' ? '✓ exists' : '✗ MISSING'}`);
  console.log(`  - showShareItineraryModal: ${typeof window.showShareItineraryModal === 'function' ? '✓ exists' : '✗ MISSING'}`);

  if (btnExportWhatsapp) {
    btnExportWhatsapp.onclick = () => {
      console.log('[UnifiedItinerary] 📤 WhatsApp export clicked');

      // Check if itinerary is empty
      let totalPOIs = 0;
      const tripProfile = window.state?.tripProfile || {};
      const days = tripProfile.days || 8;

      console.log('[UnifiedItinerary] 🔍 Checking itinerary...');
      console.log('[UnifiedItinerary]   - tripProfile.days:', days);
      console.log('[UnifiedItinerary]   - window.state.itineraryByDay:', window.state?.itineraryByDay);

      for (let d = 0; d < days; d++) {
        const dayPOIs = window.state?.itineraryByDay?.[d] || [];
        totalPOIs += dayPOIs.length;
        console.log(`[UnifiedItinerary]   - Day ${d}: ${dayPOIs.length} POIs`);
      }

      console.log('[UnifiedItinerary] 📊 Total POIs:', totalPOIs);

      if (totalPOIs === 0) {
        console.warn('[UnifiedItinerary] ⚠️ Itinerary is EMPTY - cannot export');

        const message = '📍 Aggiungi almeno un POI all\'itinerario prima di condividere';
        console.log('[UnifiedItinerary] 🔊 Showing alert:', message);
        alert(message);
        return;
      }

      if (typeof window.exportItineraryWhatsApp === 'function') {
        console.log('[UnifiedItinerary] ✅ Calling exportItineraryWhatsApp()...');
        try {
          window.exportItineraryWhatsApp();
          console.log('[UnifiedItinerary] ✅ exportItineraryWhatsApp() executed successfully');
        } catch (err) {
          console.error('[UnifiedItinerary] ❌ Error in exportItineraryWhatsApp:', err);
          if (window.toast) {
            window.toast('❌ Errore nell\'export WhatsApp: ' + err.message);
          }
        }
      } else {
        console.error('[UnifiedItinerary] ❌ exportItineraryWhatsApp function not found on window');
        if (window.toast) {
          window.toast('⚠️ Funzione export non disponibile');
        }
      }
    };
    console.log('[UnifiedItinerary] ✅ WhatsApp button handler attached successfully');
  } else {
    console.error('[UnifiedItinerary] ❌ WhatsApp button (ID: btn-export-whatsapp-unified) NOT FOUND in DOM');
    if (sheetBody) {
      const allButtons = sheetBody.querySelectorAll('button');
      console.error('[UnifiedItinerary] ❌ Found', allButtons.length, 'buttons in sheet-body. IDs:',
        Array.from(allButtons).map(b => b.id || '(no id)').join(', '));
    }
  }

  if (btnShareGroup) {
    btnShareGroup.onclick = () => {
      console.log('[UnifiedItinerary] 👥 Share group clicked');

      // Check if itinerary is empty
      let totalPOIs = 0;
      const tripProfile = window.state?.tripProfile || {};
      const days = tripProfile.days || 8;

      console.log('[UnifiedItinerary] 🔍 Checking itinerary...');
      console.log('[UnifiedItinerary]   - tripProfile.days:', days);
      console.log('[UnifiedItinerary]   - window.state.itineraryByDay:', window.state?.itineraryByDay);

      for (let d = 0; d < days; d++) {
        const dayPOIs = window.state?.itineraryByDay?.[d] || [];
        totalPOIs += dayPOIs.length;
        console.log(`[UnifiedItinerary]   - Day ${d}: ${dayPOIs.length} POIs`);
      }

      console.log('[UnifiedItinerary] 📊 Total POIs:', totalPOIs);

      if (totalPOIs === 0) {
        console.warn('[UnifiedItinerary] ⚠️ Itinerary is EMPTY - cannot share');

        const message = '📍 Aggiungi almeno un POI all\'itinerario prima di condividere';
        console.log('[UnifiedItinerary] 🔊 Showing alert:', message);
        alert(message);
        return;
      }

      if (typeof window.showShareItineraryModal === 'function') {
        console.log('[UnifiedItinerary] ✅ Calling showShareItineraryModal()...');
        try {
          window.showShareItineraryModal();
          console.log('[UnifiedItinerary] ✅ showShareItineraryModal() executed successfully');
        } catch (err) {
          console.error('[UnifiedItinerary] ❌ Error in showShareItineraryModal:', err);
          if (window.toast) {
            window.toast('❌ Errore nella condivisione: ' + err.message);
          }
        }
      } else {
        console.error('[UnifiedItinerary] ❌ showShareItineraryModal function not found on window');
        if (window.toast) {
          window.toast('⚠️ Funzione condivisione non disponibile');
        }
      }
    };
    console.log('[UnifiedItinerary] ✅ Share button handler attached successfully');
  } else {
    console.error('[UnifiedItinerary] ❌ Share button (ID: btn-share-group-unified) NOT FOUND in DOM');
    if (sheetBody) {
      const allButtons = sheetBody.querySelectorAll('button');
      console.error('[UnifiedItinerary] ❌ Found', allButtons.length, 'buttons in sheet-body. IDs:',
        Array.from(allButtons).map(b => b.id || '(no id)').join(', '));
    }
  }

  // Remove from shared itinerary
  const removeBtns = document.querySelectorAll('[data-remove-itinerary]');
  console.log(`[UnifiedItinerary] Found ${removeBtns.length} "Remove from shared" buttons`);
  removeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const entryId = btn.dataset.removeItinerary;
      console.log(`[UnifiedItinerary] ✅ Remove button clicked for entry ${entryId}`);
      if (confirm('Rimuovere questa tappa dal gruppo?')) {
        if (!window.state.itinerary) {
          console.warn('[UnifiedItinerary] window.state.itinerary not found');
          return;
        }
        const idx = window.state.itinerary.findIndex(e => e.id === entryId);
        console.log(`[UnifiedItinerary] Found entry at index ${idx}`);
        if (idx !== -1) {
          window.state.itinerary.splice(idx, 1);
          window.saveState?.();
          renderItineraryUnified();
          if (window.toast) {
            window.toast('✓ Tappa rimossa dal gruppo');
          }
        }
      }
    });
  });
  if (removeBtns.length > 0) {
    console.log('[UnifiedItinerary] ✅ Remove handlers attached to', removeBtns.length, 'buttons');
  }

  console.log('[UnifiedItinerary] 📋 ═══════════════════════════════════════');
  console.log('[UnifiedItinerary] ✅ SETUP COMPLETE - Summary:');
  console.log('[UnifiedItinerary]   • Accordion headers:', headers.length);
  console.log('[UnifiedItinerary]   • Add POI buttons:', addBtns.length);
  console.log('[UnifiedItinerary]   • Menu buttons:', menuBtns.length);
  console.log('[UnifiedItinerary]   • Remove shared buttons:', removeBtns.length);
  console.log('[UnifiedItinerary]   • WhatsApp export: ' + (!!btnExportWhatsapp ? '✓' : '✗'));
  console.log('[UnifiedItinerary]   • Share group: ' + (!!btnShareGroup ? '✓' : '✗'));
  console.log('[UnifiedItinerary] ═══════════════════════════════════════');
}

// Expose to window
window.renderItineraryUnified = renderItineraryUnified;
