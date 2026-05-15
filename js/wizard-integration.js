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
    if (!sheet || !sheet.classList.contains('open')) {
      return;
    }

    // Look for the EXISTING add-to-itinerary button
    const existingBtn = sheetBody.querySelector('#add-to-itinerary-btn');
    if (!existingBtn) {
      return; // Button not yet in DOM
    }

    // Check if we already attached the listener
    if (existingBtn.dataset.wizardAttached) {
      return; // Already attached
    }

    // Get POI data from sheet
    const poiData = extractPOIDataFromSheet();
    if (!poiData) {
      return;
    }

    console.log('[WizardIntegration] ✅ POI detail detected:', poiData.name);
    console.log('[WizardIntegration] 🔗 Attaching wizard to existing button...');

    // Attach wizard to EXISTING button
    attachWizardToExistingButton(existingBtn, poiData);
  }, 300); // Increased check frequency
}

/**
 * Extract POI data from the currently displayed sheet
 */
function extractPOIDataFromSheet() {
  const sheetBody = document.getElementById('sheet-body');
  if (!sheetBody) return null;

  console.log('[WizardIntegration] 🔍 Extracting POI data from sheet...');

  // Try to extract from data attributes or text content
  const nameEl = sheetBody.querySelector('h2, h3, [data-poi-name]');
  const cityEl = sheetBody.querySelector('[data-poi-city]');

  console.log('[WizardIntegration]   - Found nameEl:', !!nameEl, 'text:', nameEl?.textContent?.trim());
  console.log('[WizardIntegration]   - window.currentGooglePlaceId:', window.currentGooglePlaceId);
  console.log('[WizardIntegration]   - window.selectedPOIId:', window.selectedPOIId);

  if (!nameEl) {
    console.log('[WizardIntegration] ⚠️ No name element found in sheet');
    return null;
  }

  const poiName = nameEl.textContent?.trim() || 'POI';

  // Look for googlePlaceId in window.currentGooglePlaceId (set by the app)
  const poiId = window.currentGooglePlaceId || window.selectedPOIId || null;

  if (!poiId) {
    console.log('[WizardIntegration] ⚠️ No POI ID found');
    return null;
  }

  // Get full POI data from window.allPOIs
  if (typeof window.allPOIs === 'function') {
    const allPOIs = window.allPOIs();
    const poiData = allPOIs.find(p => p.googlePlaceId === poiId);
    if (poiData) {
      console.log('[WizardIntegration] ✅ Found POI in allPOIs:', poiData.name);
      return poiData;
    }
  }

  console.log('[WizardIntegration] ℹ️ Using minimal POI data');

  // Fallback to minimal data
  return {
    googlePlaceId: poiId,
    name: poiName,
    city: cityEl?.textContent?.trim() || 'Città sconosciuta',
    type: 'restaurant'
  };
}

/**
 * ATTACH WIZARD TO EXISTING BUTTON
 * The button already exists in the DOM, just add the handler
 */
function attachWizardToExistingButton(btn, poiData) {
  console.log('[WizardIntegration] 🔨 Attaching wizard handler to existing button...');

  // Mark as attached
  btn.dataset.wizardAttached = 'true';

  // Store POI data globally
  window.currentWizardPOI = poiData;

  // Add direct onclick handler
  btn.onclick = function() {
    console.log('[WizardIntegration] 🖱️ Add-to-itinerary button clicked!');
    handleOpenWizardFromDetail();
  };

  console.log('[WizardIntegration] ✅ Wizard attached to button');
}

/**
 * Add wizard button to the POI detail sheet
 */
function addWizardButtonToSheet(poiData) {
  console.log('[WizardIntegration] 🔨 Adding wizard button to sheet...');

  const sheetBody = document.getElementById('sheet-body');
  if (!sheetBody) {
    console.error('[WizardIntegration] ❌ Sheet body not found!');
    return;
  }

  // Store POI data globally so onclick handler can access it
  window.currentWizardPOI = poiData;

  // Find the bottom of the sheet body to append button
  const buttonHTML = `
    <button
      data-wizard-btn
      id="btn-open-wizard-from-detail"
      onclick="handleOpenWizardFromDetail()"
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
  console.log('[WizardIntegration] ✅ Button HTML inserted with onclick handler');
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
 * DIRECT HANDLER FOR WIZARD BUTTON
 * Called via onclick attribute in the HTML for maximum reliability
 */
window.handleOpenWizardFromDetail = function() {
  console.log('[WizardIntegration] 🖱️ Wizard button clicked!');

  const poiData = window.currentWizardPOI;
  if (!poiData) {
    console.error('[WizardIntegration] ❌ No POI data found!');
    return;
  }

  console.log('[WizardIntegration] 📌 Opening wizard for:', poiData.name);
  console.log('[WizardIntegration] 📋 POI Data:', poiData);

  // Close sheet first
  console.log('[WizardIntegration] Closing sheet...');
  window.closeSheet?.();

  // Then open wizard
  setTimeout(() => {
    console.log('[WizardIntegration] Opening wizard now...');
    if (typeof window.openAddToItineraryWizard === 'function') {
      console.log('[WizardIntegration] ✅ Calling openAddToItineraryWizard');
      window.openAddToItineraryWizard(poiData);
    } else {
      console.error('[WizardIntegration] ❌ openAddToItineraryWizard function not found!');
    }
  }, 200);
};

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
