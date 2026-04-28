// ============================================================================
// POI-HANDLERS.JS — Event handlers per click su POI e shop
// ============================================================================

console.log('%c[POI Handlers] LOADING', 'background: #C85C3B; color: white; padding: 4px 8px; border-radius: 3px; font-weight: bold');

// Toast utility (se non definita)
if (!window.toast) {
  window.toast = function(msg) {
    console.log('[Toast]', msg);
    const container = document.getElementById('toast-container');
    if (!container) return;
    container.textContent = msg;
    container.classList.add('show');
    setTimeout(() => container.classList.remove('show'), 3000);
  };
}

// Funzione globale per aprire un POI dal click sulla mappa
window.__openPOI = function(poiId) {
  console.log('%c[POI] Opening POI: ' + poiId, 'background: #4A7C59; color: white; padding: 4px 8px; border-radius: 3px');
  console.log('[POI] POIS_DATASET keys:', Object.keys(window.POIS_DATASET || {}).length);
  console.log('[POI] POIS_DATASET:', window.POIS_DATASET);

  // Trova il POI nei dataset caricati
  let poi = null;

  // Cerca in window.POIS_DATASET (città → array di POI)
  if (window.POIS_DATASET && typeof window.POIS_DATASET === 'object') {
    console.log('[POI] Searching in POIS_DATASET...');
    for (const city in window.POIS_DATASET) {
      const cityPois = window.POIS_DATASET[city];
      console.log(`[POI] City: ${city}, count: ${Array.isArray(cityPois) ? cityPois.length : 'NOT ARRAY'}`);
      if (Array.isArray(cityPois)) {
        poi = cityPois.find(p => p.id === poiId);
        if (poi) {
          console.log('[POI] ✅ FOUND in', city);
          break;
        }
      }
    }
  } else {
    console.warn('[POI] POIS_DATASET NOT LOADED or NOT OBJECT');
  }

  // Se non trovato, cerca negli custom events
  if (!poi && window.state && window.state.customEvents) {
    console.log('[POI] Searching in customEvents...');
    poi = window.state.customEvents.find(e => e.id === poiId);
  }

  if (!poi) {
    console.error('[POI] ❌ POI NOT FOUND:', poiId);
    if (window.toast) window.toast('⚠️ Dettagli non disponibili');
    return;
  }

  console.log('[POI] POI object:', poi);

  // Usa poiDetailHTML se disponibile (da index.html)
  console.log('[POI] typeof poiDetailHTML:', typeof poiDetailHTML);
  console.log('[POI] typeof openSheet:', typeof openSheet);

  if (typeof poiDetailHTML === 'function') {
    console.log('[POI] Calling poiDetailHTML...');
    const html = poiDetailHTML(poi);
    console.log('[POI] HTML generated, length:', html?.length);

    if (typeof openSheet === 'function') {
      console.log('[POI] ✅ Calling openSheet with title:', poi.name);
      openSheet(poi.name || 'Punto di interesse', html);
    } else {
      console.error('[POI] ❌ openSheet function not available. Type:', typeof openSheet);
    }
  } else {
    console.error('[POI] ❌ poiDetailHTML function not available. Type:', typeof poiDetailHTML);
  }
};

// Funzione globale per aprire un negozio dal click sulla mappa
window.__openShop = function(shopId) {
  console.log('%c[Shop] Opening shop: ' + shopId, 'background: #D4A017; color: white; padding: 4px 8px; border-radius: 3px');

  // Trova il negozio nella lista SHOPPING_DB (definita in index.html)
  let shop = null;
  if (window.SHOPPING_DB && Array.isArray(window.SHOPPING_DB)) {
    shop = window.SHOPPING_DB.find(s => s.id === shopId);
  }

  if (!shop) {
    console.warn('[Shop] Shop not found:', shopId);
    if (window.toast) window.toast('⚠️ Dettagli negozio non disponibili');
    return;
  }

  console.log('[Shop] ✅ Found:', shop.name);

  // Crea HTML per il negozio
  const html = `
    <div class="shop-card" style="border:none;padding:0">
      <div class="sc-header">
        <div>
          <div class="sc-name">${shop.name}</div>
          <div class="sc-meta">${shop.city}</div>
        </div>
        <div class="sc-rating">⭐ ${shop.rating || '—'}</div>
      </div>
      <div class="sc-items" style="margin-top:10px">
        ${(shop.items || []).map(item => `<span class="item-tag">${item}</span>`).join('')}
      </div>
      <div class="sc-hours" style="margin-top:8px"><strong>🕐 ${shop.hours}</strong></div>
      ${shop.budget_jpy ? `<div class="sc-hours" style="margin-top:4px">💰 Budget: ¥${shop.budget_jpy}</div>` : ''}
      ${shop.notes ? `<div class="sc-notes" style="margin-top:8px">${shop.notes}</div>` : ''}
      <div style="margin-top:12px;display:flex;gap:8px">
        <a class="btn success" href="https://www.google.com/maps/search/${encodeURIComponent(shop.name)}/@${shop.coords[0]},${shop.coords[1]},15z" target="_blank" style="flex:1;text-align:center;margin:0">🗺️ Mappa</a>
        <button class="btn" onclick="state.savedPOIs = state.savedPOIs || []; state.savedPOIs.includes('${shop.id}') ? state.savedPOIs.splice(state.savedPOIs.indexOf('${shop.id}'), 1) : state.savedPOIs.push('${shop.id}'); saveState(); this.textContent = state.savedPOIs.includes('${shop.id}') ? '❤️ Salvato' : '🤍 Salva'" style="flex:1">🤍 Salva</button>
      </div>
    </div>
  `;

  if (typeof openSheet === 'function') {
    openSheet('🛍️ ' + shop.name, html);
  } else {
    console.warn('[Shop] openSheet function not available');
  }
};

console.log('%c[POI Handlers] ✅ LOADED', 'background: #4A7C59; color: white; padding: 4px 8px; border-radius: 3px; font-weight: bold');
