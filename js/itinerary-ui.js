/**
 * ITINERARY UI — Accordion + Drag-Drop Rendering
 * Renders the accordion-based itinerary view for day-by-day POI management
 */

function renderItineraryViewNew() {
  console.log('[ItineraryUI] Rendering new accordion-based itinerary...');

  if (!window.ITINERARY) {
    console.warn('[ItineraryUI] ITINERARY system not ready');
    return;
  }

  ITINERARY.initState();
  const tripProfile = window.state?.tripProfile || {};
  const days = tripProfile.days || 8;
  const budget = tripProfile.budget_total || 0;
  const budgetDaily = tripProfile.budget_daily || 0;

  // Calculate total duration and cost
  let totalDuration = 0;
  let totalCost = 0;
  for (let d = 0; d < days; d++) {
    const dayPOIs = window.state.itineraryByDay[d] || [];
    totalDuration += ITINERARY.getDayDuration(d);
  }

  // Build accordion for each day
  const accordionHTML = Array.from({ length: days }, (_, dayIndex) => {
    const dayPOIs = window.state.itineraryByDay[dayIndex] || [];
    const dayDate = new Date(2027, 3, 10 + dayIndex); // Default start date
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

  const html = `
    <div style="padding:0">
      <!-- BUDGET SUMMARY -->
      <div class="budget-summary" style="
        background:linear-gradient(135deg, rgba(74,91,168,0.15), rgba(255,107,53,0.1));
        border:1px solid rgba(255,255,255,0.15);
        border-radius:8px;
        padding:12px 14px;
        margin-bottom:14px;
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

      <!-- ACCORDION GIORNI -->
      <div class="itinerary-accordion">${accordionHTML}</div>
    </div>
  `;

  window.openSheet('📅 Itinerario', html);

  // Setup event handlers
  setupItineraryEventHandlers();
}

function setupItineraryEventHandlers() {
  console.log('[ItineraryUI] Setting up event handlers...');

  // Accordion toggle
  document.querySelectorAll('.itinerary-day-header').forEach(header => {
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

  // Drag-drop handlers
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
        renderItineraryViewNew(); // Refresh
      }
    });
  });

  // Add POI button
  document.querySelectorAll('.itinerary-add-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const dayIndex = parseInt(btn.dataset.day);
      console.log('[ItineraryUI] Open POI picker for day', dayIndex);
      // TODO: Open a POI picker modal/sheet to add POI to this day
      window.toast('Tap un POI sulla mappa o seleziona dalle tappe salvate');
    });
  });

  // Menu button (modifica, sposta, cancella)
  document.querySelectorAll('.itinerary-menu-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const poiId = btn.dataset.poiId;
      showItineraryPOIMenu(poiId);
    });
  });
}

function showItineraryPOIMenu(poiId) {
  console.log('[ItineraryUI] Showing menu for POI:', poiId);
  // TODO: Implement POI menu (edit time, edit notes, move day, delete, rate)
  const options = [
    { label: '⏰ Modifica orario', action: 'edit_time' },
    { label: '📝 Modifica note', action: 'edit_notes' },
    { label: '📅 Sposta a giorno', action: 'move_day' },
    { label: '⭐ Valuta', action: 'rate' },
    { label: '❌ Rimuovi', action: 'remove' }
  ];

  const menuHTML = options.map(opt => `
    <button data-action="${opt.action}" style="
      display:block;
      width:100%;
      text-align:left;
      padding:10px 12px;
      background:transparent;
      border:none;
      color:#fff;
      border-bottom:1px solid rgba(255,255,255,0.1);
      cursor:pointer;
      font-size:12px;
    " onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='transparent'">
      ${opt.label}
    </button>
  `).join('');

  const sheetBody = document.getElementById('sheet-body');
  if (!sheetBody) return;

  sheetBody.innerHTML = `<div class="poi-menu">${menuHTML}</div>`;
  window.openSheet('📌 Opzioni', sheetBody.innerHTML);

  // Attach handlers
  document.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      handlePOIMenuAction(poiId, action);
    });
  });
}

function handlePOIMenuAction(poiId, action) {
  console.log('[ItineraryUI] Action:', action, 'for POI:', poiId);
  switch (action) {
    case 'remove':
      if (confirm('Rimuovere questo POI dall\'itinerario?')) {
        window.ITINERARY?.removePOI(poiId);
        window.saveState?.();
        renderItineraryViewNew();
        window.toast('✓ Rimosso');
      }
      break;
    case 'edit_time':
      const newTime = prompt('Nuova ora (HH:MM):', '10:00');
      if (newTime) {
        window.ITINERARY?.updateTime(poiId, newTime);
        window.saveState?.();
        renderItineraryViewNew();
        window.toast('✓ Orario aggiornato');
      }
      break;
    case 'edit_notes':
      const newNotes = prompt('Note:', '');
      if (newNotes !== null) {
        window.ITINERARY?.updateNotes(poiId, newNotes);
        window.saveState?.();
        renderItineraryViewNew();
        window.toast('✓ Note aggiornate');
      }
      break;
    // TODO: implement other actions
    default:
      window.toast('⚠️ Non ancora implementato');
  }
}

// Expose to window
window.renderItineraryViewNew = renderItineraryViewNew;
window.setupItineraryEventHandlers = setupItineraryEventHandlers;
