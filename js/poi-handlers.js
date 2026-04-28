// ============================================================================
// POI-HANDLERS.JS — Event handlers per click su POI e shop
// ============================================================================

console.log('[POI Handlers] Loading...');

// Funzione globale per aprire un POI dal click sulla mappa
window.__openPOI = function(poiId) {
  console.log('[POI] Opening POI:', poiId);

  // Trova il POI nei dataset caricati
  let poi = null;

  // Cerca in window.POIS_DATASET (città → array di POI)
  if (window.POIS_DATASET && typeof window.POIS_DATASET === 'object') {
    for (const city in window.POIS_DATASET) {
      const cityPois = window.POIS_DATASET[city];
      if (Array.isArray(cityPois)) {
        poi = cityPois.find(p => p.id === poiId);
        if (poi) break;
      }
    }
  }

  // Se non trovato, cerca negli custom events
  if (!poi && window.state && window.state.customEvents) {
    poi = window.state.customEvents.find(e => e.id === poiId);
  }

  if (!poi) {
    console.warn('[POI] POI not found:', poiId);
    if (window.toast) window.toast('⚠️ Dettagli non disponibili');
    return;
  }

  // Usa poiDetailHTML se disponibile (da index.html)
  if (typeof poiDetailHTML === 'function') {
    const html = poiDetailHTML(poi);
    if (typeof openSheet === 'function') {
      openSheet(poi.name || 'Punto di interesse', html);
    } else {
      console.warn('[POI] openSheet function not available');
    }
  } else {
    console.warn('[POI] poiDetailHTML function not available');
  }
};

// Funzione globale per aprire un negozio dal click sulla mappa
window.__openShop = function(shopId) {
  console.log('[Shop] Opening shop:', shopId);

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

console.log('[POI Handlers] Loaded ✓');
