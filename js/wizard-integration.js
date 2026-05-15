/**
 * WIZARD INTEGRATION — Hook into POI interactions to open Add to Itinerary wizard
 *
 * This module listens for POI selections and provides an "Add to Itinerary" option
 */

function initWizardIntegration() {
  console.log('[WizardIntegration] Initializing...');

  // Store current selected POI
  window.currentSelectedPOI = null;

  // Listen for POI detail modal opening
  monitorPOIDetailModal();

  // Listen for map feature clicks
  monitorMapClicks();

  console.log('[WizardIntegration] ✅ Initialized');
}

/**
 * Monitor POI detail modal for add buttons
 */
function monitorPOIDetailModal() {
  // Check every 500ms if a new POI detail modal has opened
  setInterval(() => {
    const sheetBody = document.getElementById('sheet-body');
    if (!sheetBody) return;

    // Check if sheet is open and contains POI details
    const sheet = document.getElementById('sheet');
    if (!sheet || !sheet.classList.contains('open')) return;

    // Look for existing add button
    const existingBtn = sheetBody.querySelector('[data-wizard-btn]');
    if (existingBtn) return; // Already added

    // Look for POI info sections (name, city, etc.)
    const poiNameEl = sheetBody.querySelector('[data-poi-name]');
    if (!poiNameEl) return;

    // Get POI data from sheet
    const poiData = extractPOIDataFromSheet();
    if (!poiData) return;

    console.log('[WizardIntegration] 📍 POI detail detected:', poiData.name);

    // Add wizard button to sheet
    addWizardButtonToSheet(poiData);
  }, 500);
}

/**
 * Extract POI data from the currently displayed sheet
 */
function extractPOIDataFromSheet() {
  const sheetBody = document.getElementById('sheet-body');
  if (!sheetBody) return null;

  // Try to extract from data attributes or text content
  const nameEl = sheetBody.querySelector('h2, h3, [data-poi-name]');
  const cityEl = sheetBody.querySelector('[data-poi-city]');

  if (!nameEl) return null;

  const poiName = nameEl.textContent?.trim() || 'POI';

  // Look for googlePlaceId in window.currentGooglePlaceId (set by the app)
  const poiId = window.currentGooglePlaceId || window.selectedPOIId || null;

  if (!poiId) return null;

  // Get full POI data from window.allPOIs
  if (typeof window.allPOIs === 'function') {
    const allPOIs = window.allPOIs();
    const poiData = allPOIs.find(p => p.googlePlaceId === poiId);
    if (poiData) return poiData;
  }

  // Fallback to minimal data
  return {
    googlePlaceId: poiId,
    name: poiName,
    city: cityEl?.textContent?.trim() || 'Città sconosciuta',
    type: 'restaurant'
  };
}

/**
 * Add wizard button to the POI detail sheet
 */
function addWizardButtonToSheet(poiData) {
  const sheetBody = document.getElementById('sheet-body');
  if (!sheetBody) return;

  // Find the bottom of the sheet body to append button
  const buttonHTML = `
    <button
      data-wizard-btn
      id="btn-open-wizard-from-detail"
      style="
        display:block;
        width:100%;
        margin-top:24px;
        padding:14px 16px;
        background:linear-gradient(135deg, #FF6B35, #FF5E1F);
        border:none;
        border-radius:10px;
        color:#fff;
        font-size:14px;
        font-weight:700;
        cursor:pointer;
        transition:all 0.2s;
      "
      onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 24px rgba(255,107,53,0.3)'"
      onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='none'"
    >
      ➕ Aggiungi all'Itinerario
    </button>
  `;

  // Append to sheet body
  sheetBody.insertAdjacentHTML('beforeend', buttonHTML);

  // Attach event listener
  const btn = document.getElementById('btn-open-wizard-from-detail');
  if (btn) {
    btn.addEventListener('click', () => {
      console.log('[WizardIntegration] 📌 Opening wizard for:', poiData.name);
      window.closeSheet?.();
      setTimeout(() => {
        window.openAddToItineraryWizard?.(poiData);
      }, 200);
    });
    console.log('[WizardIntegration] ✅ Added wizard button to sheet');
  }
}

/**
 * Monitor map clicks to capture POI selections
 */
function monitorMapClicks() {
  // This can be extended to listen for map click events
  // For now, we rely on the POI detail modal detection above
  console.log('[WizardIntegration] Map click monitoring ready');
}

/**
 * Expose helper to track current selected POI
 */
window.setSelectedPOIForWizard = function(poiData) {
  console.log('[WizardIntegration] Selected POI set:', poiData.name);
  window.currentSelectedPOI = poiData;
  window.currentGooglePlaceId = poiData.googlePlaceId;
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initWizardIntegration);
} else {
  initWizardIntegration();
}
