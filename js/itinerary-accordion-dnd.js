// ============================================================================
// itinerary-accordion-dnd.js — setupAccordionAndDragDrop: toggle accordion
//   giorni + drag&drop POI tra giorni. Chiamato via setTimeout dopo ogni
//   renderItineraryUnified() (il DOM deve esistere prima di attaccare i
//   listener). Sharing buttons NON qui: usano event delegation globale in
//   itinerary-unified.js (setupGlobalEventDelegation), setup una sola volta.
// Estratto da itinerary-unified.js (1363 righe), nessun cambio di
// comportamento — stesso trattamento di poi-detail-view.js/gf-places-panel.js
// in v3.34.
// Deps (window.*): t, ITINERARY, PERF_UTILS, saveState, toast
// ============================================================================
(function () {
  'use strict';

  const T = (k, f) => (typeof window.t === 'function') ? window.t(k, f) : f;

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
          header.style.borderBottomColor = isOpen ? 'rgba(20,30,60,0.08)' : 'rgba(20,30,60,0.2)';
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
        content.style.background = 'rgba(20,30,60,0.05)';
      });
      content.addEventListener('dragleave', (e) => {
        content.style.background = 'rgba(20,30,60,0.02)';
      });
      content.addEventListener('drop', (e) => {
        e.preventDefault();
        content.style.background = 'rgba(20,30,60,0.02)';
        const poiId = e.dataTransfer.getData('poiId');
        const fromDay = parseInt(e.dataTransfer.getData('fromDay'));
        const toDay = parseInt(content.dataset.day);
        if (fromDay !== toDay && poiId) {
          window.ITINERARY?.moveToDay(poiId, toDay);
          window.PERF_UTILS?.batchedSaveState ? window.PERF_UTILS.batchedSaveState() : window.saveState?.();
          window.renderItineraryUnified();
        }
      });
    });

    // Add POI button
    const addBtns = document.querySelectorAll('.itinerary-add-btn');
    addBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const dayIndex = parseInt(btn.dataset.day);
        window.toast?.(T('itin.tapMapHint', '📍 Tap un POI sulla mappa per aggiungerlo a Day ') + (dayIndex + 1));
      });
    });

    console.log('[UnifiedItinerary] ✅ Accordion + drag-drop setup complete');
  }

  window.setupAccordionAndDragDrop = setupAccordionAndDragDrop;
})();
