/**
 * UNIFIED ITINERARY VIEW
 * Combines personal itinerary (accordion) + shared itinerary (group) + sharing controls
 * Single place for trip building and management
 *
 * Diviso in moduli satellite (v3.42, stesso trattamento di poi-detail-view.js/
 * gf-places-panel.js in v3.34, nessun cambio di comportamento):
 *   - itinerary-accordion-template.js — HTML della card di un giorno (POI list, KPI, warning)
 *   - itinerary-export-share.js — export HTML/WhatsApp, link condivisibile, condividi con gruppo
 *   - itinerary-accordion-dnd.js — toggle accordion + drag&drop POI tra giorni
 *   - itinerary-poi-actions.js — menu modifica/sposta/cancella tappa, GF vicino al giorno, base/hotel
 * Restano qui: il render principale (assembla budget/meteo/festività/accordion/
 * sharing in un'unica sheet) e l'event delegation globale (setup una sola volta).
 */

const _T = (k, f) => (typeof window.t === 'function') ? window.t(k, f) : f;
// entry.name/entry.city (itinerario condiviso di gruppo, itinerary-crdt.js
// mergeGroupItinerary via MQTT) finiscono in innerHTML: vanno HTML-escapati.
// Riusa window.escapeHtml (js/ui-helpers.js), pattern già in poi-detail-template.js.
const _escItinUnified = window.escapeHtml || (s => String(s ?? ''));

function renderItineraryUnified() {
  console.log('═══════════════════════════════════════════════════');
  console.log('[UnifiedItinerary] 🚀 STARTING renderItineraryUnified()');
  console.log('═══════════════════════════════════════════════════');

  if (!window.ITINERARY) {
    console.warn('[UnifiedItinerary] ❌ ITINERARY system not ready');
    return;
  }

  ITINERARY.initState();

  // Meteo del giorno (punto 4 roadmap planner): fetch async, il primo render
  // parte senza forecast (banner assente), poi si ridisegna da solo quando
  // arriva — un solo giro per apertura pannello, non ad ogni render.
  if (!window._weatherSyncedOnce && typeof window.syncItineraryWeather === 'function') {
    window._weatherSyncedOnce = true;
    window.syncItineraryWeather().then(() => renderItineraryUnified());
  }
  // Festività globali live (punto 6 roadmap planner): stesso pattern.
  if (!window._holidaysSyncedOnce && typeof window.JapanCalendarHints?.syncGlobalHolidays === 'function') {
    window._holidaysSyncedOnce = true;
    window.JapanCalendarHints.syncGlobalHolidays().then(() => renderItineraryUnified());
  }

  const tripProfile = window.state?.tripProfile || {};
  const days = tripProfile.days || 8;
  const _tripStart = tripProfile.startDate ? new Date(tripProfile.startDate) : new Date(2027, 3, 10);

  // Load shared itinerary from state
  const sharedItinerary = window.state?.itinerary || [];

  // Get budget widget model (Level 1: manual costs only)
  const budgetModel = BUDGET_WIDGET_HELPER.getBudgetHeaderModel();
  let totalPOIs = budgetModel.totalPOICount;
  let costByDay = {};

  let distanceByDay = {};
  let transferMinByDay = {};
  for (let d = 0; d < days; d++) {
    // Calcola tratte (distanza/durata/modo/costo) tra tappe consecutive prima di leggerle
    window.ITINERARY?.computeDayRouting?.(d);
    const dayPOIs = window.state.itineraryByDay[d] || [];
    costByDay[d] = (dayPOIs || []).reduce((sum, entry) => sum + (entry.cost || 0), 0);
    distanceByDay[d] = (dayPOIs || []).reduce((sum, entry) => {
      return sum + (entry.route_from_prev?.distance_km || 0);
    }, 0);
    // ponytail: somma minuti di spostamento del giorno (per KPI visite/spostamenti + warning densità)
    transferMinByDay[d] = (dayPOIs || []).reduce((sum, entry) => sum + (entry.route_from_prev?.duration_min || 0), 0);
  }

  // ===== SECTION 1: PERSONAL ITINERARY (ACCORDION) =====
  const accordionHTML = Array.from({ length: days }, (_, dayIndex) =>
    window.ItineraryAccordionTemplate.dayHTML(dayIndex, _tripStart, tripProfile, costByDay, distanceByDay, transferMinByDay)
  ).join('');

  // ===== SECTION 2: SHARED ITINERARY (GROUP) =====
  const sharedItineraryHTML = sharedItinerary.length ? sharedItinerary.map((entry, idx) => {
    const poi = window.allPOIs?.()?.find(p => p.googlePlaceId === entry.id) ?? null;
    const dayStr = entry.day ? ` · 📅 G${entry.day}` : '';
    const timeStr = entry.time ? ` · ⏰ ${entry.time}` : '';
    return `
      <div style="
        padding: 12px;
        background: rgba(20,30,60,0.04);
        border: 1px solid rgba(255,165,100,0.3);
        border-radius: 8px;
        margin-bottom: 8px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      ">
        <div>
          <div style="font-size:15px; font-weight: 600; color: var(--l-ink);">${_escItinUnified(entry.name || (poi ? poi.name : '?'))}</div>
          <div style="font-size:13px; color: var(--l-muted);">${_escItinUnified(entry.city || (poi ? poi.city : '?'))}${dayStr}${timeStr}</div>
        </div>
        <button data-remove-itinerary="${entry.id}" style="
          padding: 6px 10px;
          background: rgba(220,38,38,0.12);
          border: 1px solid rgba(220,38,38,0.35);
          border-radius: 6px;
          color: #dc2626;
          font-size:13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        " onmouseover="this.style.background='rgba(220,38,38,0.2)'" onmouseout="this.style.background='rgba(220,38,38,0.12)'">✕ Rimuovi</button>
      </div>
    `;
  }).join('') : `<div style="text-align:center;padding:20px 16px;display:flex;flex-direction:column;align-items:center;gap:12px">
    <span style="font-size:36px">👥</span>
    <p style="color:var(--l-muted);font-size:15px;margin:0;line-height:1.5">Nessuna tappa condivisa ancora.<br>Unisciti o crea un gruppo per sincronizzare l'itinerario.</p>
    <button onclick="window.renderGroupView?.()" style="padding:8px 18px;background:rgba(99,102,241,0.14);border:1.5px solid rgba(99,102,241,0.4);border-radius:16px;color:var(--l-ink);font-size:14px;font-weight:600;cursor:pointer;font-family:inherit">👥 Vai al Gruppo</button>
  </div>`;

  // Render weather alerts
  const weatherAlertsHTML = window.WEATHER_FEATURES?.renderWeatherAlerts?.() || '';

  // ===== FINAL HTML =====
  const html = `
    <div style="padding:0;display:flex;flex-direction:column;gap:24px;">

      <div data-live-presence="itinerary">${(function(){ try { return window.LivePresence?.badgeHTML?.('itinerary') || ''; } catch(_){ return ''; } })()}</div>

      ${weatherAlertsHTML}

      ${(function(){ try { return window.JapanCalendarHints?.renderHintsHTML?.() || ''; } catch(_){ return ''; } })()}

      <!-- BUDGET SUMMARY — Level 1: Manual costs only (current state) -->
      <div class="budget-summary" style="
        background:linear-gradient(135deg, rgba(2,132,199,0.08), rgba(255,107,53,0.05));
        border:1px solid var(--l-hair);
        border-radius:8px;
        padding:12px 14px;
      ">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <span style="font-weight:600;color:var(--l-ink);font-size:15px">${budgetModel.title}</span>
          <span style="font-size:13px;color:var(--l-muted)">${days} giorni</span>
        </div>

        <!-- Primary metric: Total manual costs -->
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px">
          <div style="font-size:13px;color:var(--l-muted)">${budgetModel.primaryLabel}</div>
          <div style="font-size:18px;color:#16a34a;font-weight:700">${budgetModel.primaryValue}</div>
        </div>

        <!-- Secondary metric: POI with costs -->
        <div style="font-size:13px;color:var(--l-muted);margin-bottom:8px">
          ${budgetModel.secondaryLabel}
        </div>

        <!-- Info note: what's NOT yet included. Prima era in un box arancio
             stile-warning — troppo peso visivo per un'informazione neutra,
             non urgente. Ora testo semplice, coerente col resto della card. -->
        <div style="font-size:13px;color:var(--l-faint);">ⓘ ${budgetModel.infoText}</div>
      </div>

      <!-- SECTION 1: YOUR ITINERARY -->
      <!-- Prima: 4 bottoni a colori diversi (arancio/blu/viola/giallo) in riga
           che wrappava su schermi stretti — la causa principale della
           "confusione" segnalata. Ora: stile unico neutro, scroll orizzontale
           invece di wrap, titolo su riga propria (mai in competizione con i
           bottoni per lo spazio). -->
      <div>
        <h3 style="font-size:16px;font-weight:700;color:var(--l-ink);margin:0 0 8px 0;line-height:1.5;">📅 Il Tuo Itinerario</h3>
        ${window.ItineraryUndoRedo ? `<div style="margin:0 0 10px 0;">${window.ItineraryUndoRedo.renderButtonsHTML()}</div>` : ''}
        <div style="display:flex;gap:6px;margin:0 0 12px 0;overflow-x:auto;padding-bottom:2px;-webkit-overflow-scrolling:touch;">
            ${totalPOIs >= 2 ? `<button onclick="window.openTripOptimizer?.()" style="flex-shrink:0;padding:6px 12px;background:var(--l-glass);border:1px solid var(--l-border);border-radius:20px;color:var(--l-muted);font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap;" title="Riorganizza per zone geografiche">🧭 Ottimizza</button>` : ''}
            <button onclick="window.loadScript('./js/itinerary-suggest.js').then(()=>window.openItinerarySuggest?.())" style="flex-shrink:0;padding:6px 12px;background:var(--l-glass);border:1px solid var(--l-border);border-radius:20px;color:var(--l-muted);font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap;" title="Suggerimenti POI da aggiungere">✨ Suggerimenti</button>
            <button onclick="window.loadScript('./js/views/itinerary-version-history.js').then(()=>window.openItineraryVersionHistory?.())" style="flex-shrink:0;padding:6px 12px;background:var(--l-glass);border:1px solid var(--l-border);border-radius:20px;color:var(--l-muted);font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap;" title="Storico versioni itinerario">⏮ Storico</button>
            <button onclick="window.loadScript('./js/itinerary-reminders.js').then(()=>window.openItineraryReminders?.())" style="flex-shrink:0;padding:6px 12px;background:var(--l-glass);border:1px solid var(--l-border);border-radius:20px;color:var(--l-muted);font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap;" title="Promemoria tappe">🔔 Promemoria</button>
          </div>
        </div>
        <div class="itinerary-accordion">${accordionHTML}</div>
      </div>

      <!-- DIVIDER -->
      <div style="height:1px;background:linear-gradient(90deg, transparent, var(--l-hair), transparent);margin:8px 0;"></div>

      <!-- SECTION 2: SHARING CONTROLS -->
      <div>
        <h3 style="
          font-size:16px;
          font-weight: 700;
          color: var(--l-ink);
          margin: 0 0 12px 0;
        ">📤 Condividi con il Gruppo</h3>
        <!-- Prima: 4 bottoni pieni, 4 colori diversi, tutti stesso peso
             visivo — stessa confusione della riga azioni sopra. Un solo
             stile neutro, l'azione "Condividi con Gruppo" (la principale)
             resta l'unica accentata. -->
        <div style="display:flex;flex-direction:column;gap:8px;">
          <button id="btn-export-html-unified" onclick="handleExportHTML()" style="padding:12px 16px;background:var(--l-glass);border:1px solid var(--l-border);border-radius:8px;color:var(--l-ink);font-size:15px;font-weight:600;cursor:pointer;text-align:left;">📄 Esporta (stampabile)</button>
          <button id="btn-export-ics-unified" onclick="window.exportItineraryICS?.()" style="padding:12px 16px;background:var(--l-glass);border:1px solid var(--l-border);border-radius:8px;color:var(--l-ink);font-size:15px;font-weight:600;cursor:pointer;text-align:left;">📅 Esporta calendario (.ics)</button>
          <button id="btn-export-whatsapp-unified" onclick="handleExportWhatsApp()" style="padding:12px 16px;background:var(--l-glass);border:1px solid var(--l-border);border-radius:8px;color:var(--l-ink);font-size:15px;font-weight:600;cursor:pointer;text-align:left;">📤 Esporta su WhatsApp</button>
          <button id="btn-share-link-unified" onclick="handleShareLink()" style="padding:12px 16px;background:var(--l-glass);border:1px solid var(--l-border);border-radius:8px;color:var(--l-ink);font-size:15px;font-weight:600;cursor:pointer;text-align:left;">🔗 Copia link condivisibile</button>
          <button id="btn-share-group-unified" onclick="handleShareGroup()" style="
            padding: 12px 16px;
            background: var(--l-accent-soft);
            border: 1.5px solid var(--l-accent-brd);
            border-radius: 8px;
            color: var(--l-ink);
            font-size:15px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          " onmouseover="this.style.background='rgba(224,65,78,0.2)'" onmouseout="this.style.background='var(--l-accent-soft)'">
            👥 Condividi con Gruppo
          </button>
        </div>
      </div>

      <!-- SECTION 3: SHARED ITINERARY -->
      <div>
        <h3 style="
          font-size:16px;
          font-weight: 700;
          color: var(--l-ink);
          margin: 0 0 12px 0;
        ">👥 Itinerario Condiviso</h3>
        <p style="
          font-size:14px;
          color: var(--l-muted);
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
  // I bottoni Annulla/Rifai sono ricreati ad ogni render: risincronizza
  // subito lo stato disabled/title in base allo stack undo/redo attuale.
  window.ItineraryUndoRedo?.refreshButtons?.();
  // Segnala la mia presenza sull'itinerario (chi sta guardando ora)
  try { window.LivePresence?.enter?.('itinerary'); } catch (_) {}
  setTimeout(() => {
    console.log('[DEBUG] sheetBody AFTER openSheet:', {
      exists: !!document.getElementById('sheet-body'),
      hasButtons: document.getElementById('sheet-body')?.innerHTML?.includes('btn-export-whatsapp-unified'),
      isVisible: document.getElementById('sheet-body')?.offsetParent !== null
    });
  }, 200);

  // Setup accordion + drag-drop only (sharing buttons use global event delegation)
  setTimeout(() => {
    window.setupAccordionAndDragDrop();

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

  // Mark visited button
  sheetBody.addEventListener('click', (e) => {
    const btn = e.target.closest('.mark-visited-btn');
    if (!btn) return;

    e.stopPropagation();
    const poiId = btn.dataset.poiId;
    if (window.ITINERARY?.markVisited) {
      window.ITINERARY.markVisited(poiId);
    }
  }, false);

  // Ottimizza il giro del giorno (meno spostamenti)
  sheetBody.addEventListener('click', (e) => {
    const btn = e.target.closest('.itinerary-optimize-btn');
    if (!btn) return;
    e.stopPropagation();
    const dayIdx = parseInt(btn.dataset.day, 10);
    const ok = window.ITINERARY?.optimizeDay?.(dayIdx);
    if (ok) {
      renderItineraryUnified();
      window.toast?.(_T('itin.optimized', '🧭 Giro ottimizzato'));
    } else {
      window.toast?.(_T('itin.need3', '⚠️ Servono almeno 3 tappe con posizione nota'));
    }
  }, false);

  // GF vicino alle tappe del giorno (posti da fonti live: Google Places +
  // review-scan, vedi gf-places-loader.js — nessun elenco scritto a mano)
  sheetBody.addEventListener('click', (e) => {
    const btn = e.target.closest('.itinerary-gf-btn');
    if (!btn) return;
    e.stopPropagation();
    window.showGFNearDay?.(parseInt(btn.dataset.day, 10));
  }, false);

  // Base/hotel del giorno: prompt → geocode Nominatim (gratis, CORS ok) → salva
  sheetBody.addEventListener('click', (e) => {
    const btn = e.target.closest('.itinerary-base-btn');
    if (!btn) return;
    e.stopPropagation();
    window.setDayBaseFlow?.(parseInt(btn.dataset.day, 10));
  }, false);

  // Menu button (modifica, sposta, cancella)
  sheetBody.addEventListener('click', (e) => {
    const btn = e.target.closest('.itinerary-menu-btn');
    if (!btn) return;

    e.stopPropagation();
    const poiId = btn.dataset.poiId;
    window.showItineraryPOIMenu?.(poiId);
  }, false);

  // Remove from shared itinerary
  sheetBody.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-remove-itinerary]');
    if (!btn) return;

    const entryId = btn.dataset.removeItinerary;
    (window.modalConfirm || ((m) => Promise.resolve(confirm(m))))('Rimuovere questa tappa dal gruppo?', { danger: true, confirmText: 'Rimuovi' })
      .then(ok => {
        if (!ok) return;
        if (window.state?.itinerary) {
          const idx = window.state.itinerary.findIndex(e => e.id === entryId);
          if (idx !== -1) {
            window.state.itinerary.splice(idx, 1);
            window.PERF_UTILS?.batchedSaveState ? window.PERF_UTILS.batchedSaveState() : window.saveState?.();
            renderItineraryUnified();
            window.toast?.(_T('itin.poiRemoved', '✓ Tappa rimossa'));
          }
        }
      });
  }, false);

  console.log('[ItineraryUnified] ✅ Global event delegation setup complete');
}

// Expose to window
window.renderItineraryUnified = renderItineraryUnified;
window.setupGlobalEventDelegation = setupGlobalEventDelegation;

// Initialize global event delegation when script loads
console.log('[ItineraryUnified] Script loaded, waiting for DOM ready...');
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupGlobalEventDelegation);
} else {
  // DOM already loaded
  setupGlobalEventDelegation();
}
