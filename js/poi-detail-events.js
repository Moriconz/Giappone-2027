/**
 * POI DETAIL EVENTS — Vanilla JS event listeners
 *
 * Gestisce:
 * - Maps dropdown toggle + close-on-click-outside
 * - Copy address to clipboard
 * - GF detection asincrono con loader
 * - Star rating click + persistenza localStorage
 * - Note toggle e salvataggio
 */

console.log('[POI Detail Events] Loading...');

/**
 * MAPS DROPDOWN: Toggle + click-outside close
 */
document.addEventListener('click', (e) => {
  const isMapBtn = e.target.closest('.btn-maps-dropdown');

  // Chiudi tutti gli altri dropdown
  document.querySelectorAll('.maps-dropdown-menu').forEach(menu => {
    if (!isMapBtn || menu.dataset.poiId !== isMapBtn.dataset.poiId) {
      menu.style.display = 'none';
    }
  });

  // Toggle il dropdown cliccato
  if (isMapBtn) {
    const poiId = isMapBtn.dataset.poiId;
    const menu = document.querySelector(`.maps-dropdown-menu[data-poi-id="${poiId}"]`);
    if (menu) {
      menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    }
  }
});

// Chiudi dropdown quando clicchi su un link (aprisce Maps in nuova tab)
document.addEventListener('click', (e) => {
  if (e.target.tagName === 'A' && e.target.closest('.maps-dropdown-menu')) {
    e.target.closest('.maps-dropdown-menu').style.display = 'none';
  }
});

/**
 * COPY ADDRESS: Copia indirizzo negli appunti
 */
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('copy-address-btn')) {
    const address = e.target.dataset.address;
    navigator.clipboard.writeText(address).then(() => {
      const originalText = e.target.textContent;
      const originalColor = e.target.style.color;
      e.target.textContent = '✓';
      e.target.style.color = '#4ade80';
      setTimeout(() => {
        e.target.textContent = originalText;
        e.target.style.color = originalColor;
      }, 1500);
    }).catch(err => {
      console.error('[Copy] Errore:', err);
    });
  }
});

/**
 * GF DETECTION: Asincrono con cache localStorage + TIMEOUT 2.5s
 *
 * Mostra loader subito, poi aggiorna con il risultato o fallback
 */
async function detectAndRenderGF(poi, details = {}, reviews = []) {
  const containerId = `gf-status-container-${poi.id}`;
  const container = document.getElementById(containerId);
  if (!container) return; // POI non è ristorante

  const cacheKey = `gf_${poi.place_id || poi.id}`;
  const cached = localStorage.getItem(cacheKey);

  // Se cached e non scaduto, mostra subito
  if (cached) {
    try {
      const { status, fmgfUrl, timestamp } = JSON.parse(cached);
      const age = Date.now() - timestamp;
      const TTL = 30 * 24 * 60 * 60 * 1000; // 30 giorni

      if (age < TTL) {
        console.debug('[GF Cache] Hit for:', poi.name);
        renderGFStatus(container, status, fmgfUrl);
        return;
      }
    } catch (err) {
      console.debug('[GF Cache] Parse error:', err);
    }
  }

  // Lookup asincrono CON TIMEOUT FORZATO 2.5s (fallback garantito)
  try {
    const result = await Promise.race([
      GlutenFreeDetector.detectGlutenFree(
        poi,
        poi.place_id || poi.id,
        details,
        reviews
      ),
      new Promise(resolve => {
        setTimeout(() => {
          console.debug('[GF Detection] TIMEOUT 2.5s - fallback forzato a unknown');
          resolve({ status: 'unknown', source: 'timeout' });
        }, 2500);
      })
    ]);

    const fmgfUrl = `https://www.findmeglutenfree.com/search?q=${encodeURIComponent(poi.name || 'restaurant')}`;

    // Salva in cache (anche 'unknown' per evitare re-fetch)
    localStorage.setItem(cacheKey, JSON.stringify({
      status: result.status,
      fmgfUrl: fmgfUrl,
      timestamp: Date.now()
    }));

    console.debug('[GF Detection] Result:', result.status);
    renderGFStatus(container, result.status, fmgfUrl);
  } catch (err) {
    console.debug('[GF Detection] Exception:', err.message);
    // Fallback garantito: mostra stato "error"
    const fmgfUrl = `https://www.findmeglutenfree.com/search?q=${encodeURIComponent(poi.name || 'restaurant')}`;
    renderGFStatus(container, 'error', fmgfUrl);
  }
}

function renderGFStatus(container, status, fmgfUrl) {
  console.debug('[renderGFStatus] Called with:', { containerExists: !!container, status, containerHTML: container?.innerHTML?.substring(0, 100) });
  if (!container) return;

  if (status === 'confirmed') {
    // Confermato: link verde a Find Me GF
    container.innerHTML = `
      <a href="${fmgfUrl}" target="_blank" rel="noopener noreferrer" class="status-badge status-confirmed">
        <div class="status-content">
          <strong>🌾 Opzioni gluten-free disponibili</strong>
          <small>Confermato da Find Me Gluten Free</small>
        </div>
        <span class="status-arrow">→</span>
      </a>
    `;
  } else if (status === 'likely') {
    // Probabile: giallo, no link
    container.innerHTML = `
      <div class="status-badge status-likely">
        <div class="status-content">
          <strong>🌾 Probabilmente gluten-free</strong>
          <small>Menzionato nelle recensioni, verifica al locale</small>
        </div>
      </div>
    `;
  } else if (status === 'unknown' || status === 'timeout' || status === 'error') {
    // Softer styling: più neutro e informativo, non warning-like
    container.innerHTML = `
      <div class="status-badge status-unknown">
        <div class="status-content">
          <strong>Gluten-free non verificato</strong>
          <small>Nessuna conferma trovata al momento</small>
        </div>
      </div>
    `;
  } else {
    // Stato sconosciuto: rimuovi il container
    container.remove();
  }
}

/**
 * STAR RATING: Click per selezionare + persistenza localStorage
 */
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('star')) {
    const poiId = e.target.dataset.id;
    const rating = parseInt(e.target.dataset.star, 10);

    // Salva in localStorage (simula state.ratings)
    const ratings = JSON.parse(localStorage.getItem('ratings') || '{}');
    ratings[poiId] = rating;
    localStorage.setItem('ratings', JSON.stringify(ratings));

    // Update UI: aggiungi classe 'active' alle stelle fino al rating
    const allStars = document.querySelectorAll(`.star[data-id="${poiId}"]`);
    allStars.forEach((star) => {
      const starNum = parseInt(star.dataset.star, 10);
      star.classList.toggle('active', starNum <= rating);
    });

    console.debug('[Rating] Voto salvato:', rating);
  }
});

/**
 * INIT: Load rating salvato su init
 */
function loadRatingOnInit(poiId) {
  const ratings = JSON.parse(localStorage.getItem('ratings') || '{}');
  const rating = ratings[poiId] || 0;

  if (rating > 0) {
    const allStars = document.querySelectorAll(`.star[data-id="${poiId}"]`);
    allStars.forEach((star) => {
      const starNum = parseInt(star.dataset.star, 10);
      star.classList.toggle('active', starNum <= rating);
    });
  }
}

/**
 * NOTE SECTION: Toggle, Save, Close
 */
document.addEventListener('click', (e) => {
  // Toggle note section
  if (e.target.id && e.target.id.startsWith('add-note-btn-')) {
    const poiId = e.target.id.replace('add-note-btn-', '');
    const section = document.getElementById(`notes-section-${poiId}`);

    // Sostituisci il bottone con textarea
    e.target.style.display = 'none';

    const textarea = document.createElement('textarea');
    textarea.id = 'poi-note';
    textarea.placeholder = 'Es: Prenotare con 2 giorni di anticipo...';
    textarea.style.cssText = `
      width:100%;padding:12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);
      border-radius:10px;font-size:13px;color:#fff;resize:vertical;min-height:70px;font-family:inherit;
      box-sizing:border-box;transition:border-color 0.2s;margin-bottom:8px;
    `;
    textarea.onmouseover = function() { this.style.borderColor = 'rgba(255,255,255,0.2)'; };
    textarea.onmouseout = function() { this.style.borderColor = 'rgba(255,255,255,0.1)'; };

    section.appendChild(textarea);
    textarea.focus();

    // Bottoni Save/Close
    const btnContainer = document.createElement('div');
    btnContainer.style.cssText = 'display:flex;gap:8px;margin-top:8px';

    const saveBtn = document.createElement('button');
    saveBtn.textContent = '✓ Salva';
    saveBtn.style.cssText = `
      flex:1;padding:8px;background:rgba(217,119,6,0.8);border:none;border-radius:6px;
      color:#fff;font-size:12px;cursor:pointer;transition:background 0.2s;
    `;
    saveBtn.onmouseover = function() { this.style.background = 'rgba(217,119,6,1)'; };
    saveBtn.onmouseout = function() { this.style.background = 'rgba(217,119,6,0.8)'; };
    saveBtn.onclick = () => {
      const text = textarea.value.trim();
      if (text && window.state) {
        window.state.notes[poiId] = text;
        // Salva in localStorage
        localStorage.setItem(`notes_${poiId}`, text);
        console.debug('[Notes] Salvata:', text);
        // Ricarica la modale (dipende dalla tua implementazione)
      }
    };

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕ Chiudi';
    closeBtn.style.cssText = `
      flex:1;padding:8px;background:transparent;border:1px solid rgba(255,255,255,0.2);border-radius:6px;
      color:rgba(255,255,255,0.6);font-size:12px;cursor:pointer;transition:all 0.2s;
    `;
    closeBtn.onmouseover = function() { this.style.borderColor = 'rgba(255,255,255,0.4)'; };
    closeBtn.onmouseout = function() { this.style.borderColor = 'rgba(255,255,255,0.2)'; };
    closeBtn.onclick = () => {
      textarea.remove();
      btnContainer.remove();
      e.target.style.display = 'flex';
    };

    btnContainer.appendChild(saveBtn);
    btnContainer.appendChild(closeBtn);
    section.appendChild(btnContainer);
  }
});

/**
 * PRIMARY CTA + SECONDARY BUTTONS
 */
document.addEventListener('click', (e) => {
  // #add-to-itinerary-btn handled by .onclick set in poi-detail-view.js openPOI()

  // Secondary: Save POI
  if (e.target.id === 'save-poi') {
    console.debug('[Secondary] Salva POI');
    // La logica è già gestita dall'event click esistente
  }

  // Secondary: Add to Calendar
  if (e.target.id === 'add-cal') {
    console.debug('[Secondary] Calendario');
    // Implementa logica calendario
  }
});

/**
 * EXPORT: Funzione pubblica per init
 */
window.initPOIDetail = function(poi, details, reviews) {
  // Load rating salvato
  loadRatingOnInit(poi.id);

  // Lanchia GF detection se ristorante — Usa lo STESSO check di poiDetailHTML
  const FOOD_TYPES = ['restaurant','food','cafe','bar','meal_takeaway','bakery','izakaya'];
  const isRestaurant = FOOD_TYPES.includes(poi.primaryType || poi.cat);

  if (isRestaurant) {
    console.debug('[POI Detail] Lanciando GF detection per:', poi.name);
    detectAndRenderGF(poi, details, reviews);
  }

  console.debug('[POI Detail] Inizializzato:', poi.name);
};

// POI Detail Events loaded
