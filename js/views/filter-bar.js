// ============================================================================
// filter-bar.js — renderFilters + filter-chip event listener
// Extracted from app-core.js. Deps (all window.*):
//   state, saveState, CATS, throttle, allPOIs, renderMarkers,
//   gfPlacesLayer, renderListView, renderShoppingView, updateMapPosition
// ============================================================================
(function () {
  'use strict';

  function renderFilters(){
    const filtersEl = document.getElementById('filters');
    if (!filtersEl) return;
    // Remove orphaned panel before re-render
    const oldPanel = document.getElementById('adv-filters-panel');
    if (oldPanel) oldPanel.remove();
    const chips = [];
    chips.push(`<button class="chip local ${window.state.onlyLocal?'active':''}" data-local="1">🏮 Local</button>`);
    chips.push(`<button class="chip gf-places ${window.state.showGFPlaces?'active':''}" data-gf-places="1">🟢 GF Places</button>`);
    // Categorie effettivamente presenti tra i POI caricati (per nascondere chip vuote)
    const presentCats = new Set();
    try { (window.allPOIs ? window.allPOIs() : []).forEach(p => p && p.cat && presentCats.add(p.cat)); } catch (e) {}
    Object.keys(window.CATS).forEach(k => {
      // Mostra "Tutti" sempre + la categoria attiva + solo le categorie effettivamente
      // presenti tra i POI caricati (riduce la barra da ~80 chip a poche pertinenti).
      if (k !== 'all' && k !== window.state.activeCat && !presentCats.has(k)) return;
      chips.push(`<button class="chip ${window.state.activeCat===k?'active':''}" data-cat="${k}">${window.CATS[k].icon} ${window.CATS[k].label}</button>`);
    });
    chips.push(`<button class="chip ${window.state.showAdvFilters?'active':''}" id="adv-filter-toggle" data-adv="1">⚙️ Avanzati</button>`);
    filtersEl.innerHTML = chips.join('');

    // Advanced filters panel
    if (window.state.showAdvFilters) {
      const minRating = window.state.minRating || 0;
      const maxBudget = window.state.maxBudget || 100000;
      const advPanel = document.createElement('div');
      advPanel.id = 'adv-filters-panel';
      advPanel.style.cssText = 'position:absolute;top:50px;left:10px;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:12px;z-index:499;min-width:280px;box-shadow:0 4px 12px rgba(0,0,0,.3)';
      advPanel.innerHTML = `
        <div style="font-weight:700;margin-bottom:10px">🔧 Filtri avanzati</div>
        <div style="margin-bottom:10px">
          <label style="display:block;font-size:12px;color:var(--muted);margin-bottom:4px">⭐ Voto minimo: <strong id="rating-val">${minRating}</strong></label>
          <input type="range" id="adv-rating" min="0" max="5" step="1" value="${minRating}" style="width:100%;cursor:pointer" />
        </div>
        <div style="margin-bottom:10px">
          <label style="display:block;font-size:12px;color:var(--muted);margin-bottom:4px">💰 Budget massimo: <strong id="budget-val">¥${maxBudget}</strong></label>
          <input type="range" id="adv-budget" min="0" max="100000" step="5000" value="${maxBudget}" style="width:100%;cursor:pointer" />
        </div>
        <button id="adv-reset" class="btn" style="width:100%;font-size:12px;padding:6px">Reset filtri</button>
      `;
      filtersEl.parentElement.style.position = 'relative';
      filtersEl.parentElement.appendChild(advPanel);

      // Bind advanced filter controls (with throttle to prevent excessive rendering)
      document.getElementById('adv-rating').oninput = window.throttle((e) => {
        window.state.minRating = parseInt(e.target.value, 10);
        document.getElementById('rating-val').textContent = window.state.minRating;
        window.saveState?.(); window.renderMarkers?.();
      }, 200);
      document.getElementById('adv-budget').oninput = window.throttle((e) => {
        window.state.maxBudget = parseInt(e.target.value, 10);
        document.getElementById('budget-val').textContent = '¥'+window.state.maxBudget;
        window.saveState?.(); window.renderMarkers?.();
      }, 200);
      document.getElementById('adv-reset').onclick = () => {
        window.state.minRating = 0;
        window.state.maxBudget = 100000;
        window.saveState?.();
        window.renderFilters?.(); window.renderMarkers?.();
      };
    }

    // Trigger layout recalculation after filters re-render
    setTimeout(function(){ window.updateMapPosition?.(); }, 100);
  }

  function _setupFilterListener() {
    const filtersEl = document.getElementById('filters');
    if (!filtersEl) return;
    filtersEl.addEventListener('click', e => {
      const btn = e.target.closest('.chip'); if (!btn) return;
      if (btn.dataset.gf) window.state.onlyGF = !window.state.onlyGF;
      else if (btn.dataset.local) window.state.onlyLocal = !window.state.onlyLocal;
      else if (btn.dataset.gfPlaces) {
        window.state.showGFPlaces = !window.state.showGFPlaces;
        if (window.gfPlacesLayer) {
          window.gfPlacesLayer.setVisible(window.state.showGFPlaces);
          console.log('[Filter] GF Places layer visibility:', window.state.showGFPlaces);
        }
      }
      else if (btn.dataset.cat) window.state.activeCat = btn.dataset.cat;
      else if (btn.dataset.adv) window.state.showAdvFilters = !window.state.showAdvFilters;
      window.saveState?.(); window.renderFilters?.(); window.renderMarkers?.();
      const activeNav = document.querySelector('nav.bottom button.active');
      if (activeNav?.dataset.view === 'list') window.renderListView?.();
      if (activeNav?.dataset.view === 'shopping') window.renderShoppingView?.();
    });
  }

  window.renderFilters = renderFilters;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _setupFilterListener);
  } else {
    _setupFilterListener();
  }
})();
