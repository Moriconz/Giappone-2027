// ============================================================================
// shopping-layer.js — renderShoppingMarkers, toggleShoppingLayer,
//   updateLayerToggle, flyToCity
// Extracted from app-core.js. Deps (all window.*):
//   shoppingSource, shoppingLayer, state, saveState, SHOPPING_DB,
//   CITY_COORDS, map
// ============================================================================
(function () {
  'use strict';

  function renderShoppingMarkers(){
    window.shoppingSource.clear();
    (window.SHOPPING_DB || []).forEach(s => {
      const feature = new ol.Feature({
        geometry: new ol.geom.Point(ol.proj.fromLonLat([s.coords[1], s.coords[0]])),
        name: s.name,
        id: s.id,
        type: 'shopping'
      });
      window.shoppingSource.addFeature(feature);
    });
  }

  function toggleShoppingLayer(){
    window.state.showShoppingLayer = !window.state.showShoppingLayer;
    window.saveState?.();
    const btn = document.querySelector('button[data-toggle-shopping]');
    if (btn) btn.classList.toggle('active', window.state.showShoppingLayer);
    window.shoppingLayer.setVisible(window.state.showShoppingLayer);
    if (window.state.showShoppingLayer) renderShoppingMarkers();
  }

  function updateLayerToggle(){
    const btn = document.querySelector('[data-toggle-shopping]');
    if (btn) btn.classList.toggle('active', !!window.state.showShoppingLayer);
  }

  function flyToCity(c){
    const [lat,lng] = window.CITY_COORDS[c];
    window.map.getView().animate({
      center: ol.proj.fromLonLat([lng, lat]),
      zoom: 10,
      duration: 500
    });
  }

  window.renderShoppingMarkers = renderShoppingMarkers;
  window.toggleShoppingLayer = toggleShoppingLayer;
  window.updateLayerToggle = updateLayerToggle;
  window.flyToCity = flyToCity;
})();
