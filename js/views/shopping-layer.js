// ============================================================================
// shopping-layer.js — SHOPPING_DB + renderShoppingMarkers, toggleShoppingLayer,
//   updateLayerToggle, flyToCity
// Extracted from app-core.js. Deps (all window.*):
//   shoppingSource, shoppingLayer, state, saveState, CITY_COORDS, map
// ============================================================================
(function () {
  'use strict';

  const SHOPPING_DB = [
    // FASHION
    {id:'shop-001', name:'Shibuya 109', city:'Tokyo', cat:'shopping', coords:[35.6595, 139.7004], rating:4.8, hours:'10:00–21:00', budget_jpy:50000, items:['clothing','accessories'], notes:'Fashion hub multi-brand'},
    {id:'shop-002', name:'Ginza Six', city:'Tokyo', cat:'shopping', coords:[35.6730, 139.7625], rating:4.9, hours:'10:30–20:30', budget_jpy:80000, items:['luxury','fashion','accessories'], notes:'Luxury shopping complex'},
    {id:'shop-003', name:'Takeshita Street', city:'Tokyo', cat:'shopping', coords:[35.6653, 139.7014], rating:4.7, hours:'10:00–19:00', budget_jpy:30000, items:'casual,trendy', notes:'Youth fashion street'},
    // FOOD / SOUVENIRS
    {id:'shop-004', name:'Kyoto Nishiki Market', city:'Kyoto', cat:'food', coords:[35.0051, 135.7703], rating:4.8, hours:'10:00–18:00', budget_jpy:15000, items:['food','souvenirs','gf-aware'], notes:'Food market, many GF snacks'},
    {id:'shop-005', name:'Arashiyama Bamboo Market', city:'Kyoto', cat:'food', coords:[35.0162, 135.7588], rating:4.6, hours:'8:00–17:00', budget_jpy:10000, items:['crafts','souvenirs'], notes:'Artisan bamboo & local goods'},
    {id:'shop-006', name:'Dotonbori Street Market', city:'Osaka', cat:'food', coords:[34.6694, 135.5015], rating:4.7, hours:'10:00–23:00', budget_jpy:20000, items:['food','snacks'], notes:'Street food & takoyaki'},
    // ELECTRONICS / CAMERAS
    {id:'shop-007', name:'Yodabashi Camera Tokyo', city:'Tokyo', cat:'electronics', coords:[35.7625, 139.7380], rating:4.6, hours:'09:30–21:00', budget_jpy:100000, items:['cameras','electronics'], notes:'Major camera & electronics'},
    {id:'shop-008', name:'Akihabara Electronics', city:'Tokyo', cat:'electronics', coords:[35.7011, 139.7723], rating:4.5, hours:'10:00–20:00', budget_jpy:150000, items:['gaming','electronics'], notes:'Tech & gaming hub'},
    // BOOKS / STATIONERY
    {id:'shop-009', name:'Bookoff Tokyo', city:'Tokyo', cat:'books', coords:[35.6895, 139.7011], rating:4.4, hours:'10:00–21:00', budget_jpy:5000, items:['books','manga'], notes:'Used books & manga'},
    {id:'shop-010', name:'Kyoto Kawachikaido Books', city:'Kyoto', cat:'books', coords:[35.0068, 135.7712], rating:4.3, hours:'10:00–19:00', budget_jpy:3000, items:['books','local-authors'], notes:'Local & traditional books'},
    // BEAUTY / SKINCARE
    {id:'shop-011', name:'Shibuya Hands', city:'Tokyo', cat:'beauty', coords:[35.6585, 139.7029], rating:4.7, hours:'10:00–21:00', budget_jpy:20000, items:['skincare','cosmetics'], notes:'Japanese beauty products'},
    {id:'shop-012', name:'Kyoto Ginza Tanaka', city:'Kyoto', cat:'beauty', coords:[35.0071, 135.7733], rating:4.5, hours:'10:00–19:00', budget_jpy:15000, items:['cosmetics','wellness'], notes:'Premium skincare'},
    // VINTAGE — Tokyo
    {id:'vint-001', name:'Shimokitazawa Flamingo', city:'Tokyo', cat:'vintage', coords:[35.6612, 139.6688], rating:4.8, hours:'12:00–21:00', budget_jpy:15000, items:['vintage','abbigliamento anni 70-90'], notes:'Icona vintage di Shimokita. 3 negozi in 100m. Prezzi onesti, merce giapponese.'},
    {id:'vint-002', name:'New York Joe Exchange', city:'Tokyo', cat:'vintage', coords:[35.6598, 139.6691], rating:4.7, hours:'12:00–21:00', budget_jpy:12000, items:['vintage','scambio','abbigliamento'], notes:'Compra e vende vintage. Ottimo per capi anni 80-90 a prezzi bassi.'},
    {id:'vint-003', name:'Chicago Shimokitazawa', city:'Tokyo', cat:'vintage', coords:[35.6601, 139.6695], rating:4.6, hours:'11:00–20:00', budget_jpy:20000, items:['vintage','cappotti','accessori'], notes:'Catena vintage storica di Tokyo. Selezione ampia.'},
    {id:'vint-004', name:'Koenji Don Don Down', city:'Tokyo', cat:'vintage', coords:[35.7054, 139.6498], rating:4.7, hours:'11:00–20:00', budget_jpy:8000, items:['vintage','scontato','abbigliamento'], notes:'Mercoledì sconti massivi. Prezzo cala ogni settimana se rimane invenduto.'},
    {id:'vint-005', name:'Haight & Ashbury', city:'Tokyo', cat:'vintage', coords:[35.6610, 139.6690], rating:4.5, hours:'12:00–21:00', budget_jpy:25000, items:['vintage','american casual','denim'], notes:'Specializzato vintage americano: Levi\'s, college jackets, western.'},
    {id:'vint-006', name:'Ragtag Tokyo', city:'Tokyo', cat:'vintage', coords:[35.6590, 139.6685], rating:4.6, hours:'11:00–20:00', budget_jpy:30000, items:['vintage','designer','luxury resell'], notes:'Vintage di lusso e designer di seconda mano. Qualità garantita.'},
    {id:'vint-007', name:'Kinji Harajuku', city:'Tokyo', cat:'vintage', coords:[35.6695, 139.7043], rating:4.5, hours:'11:00–20:00', budget_jpy:10000, items:['vintage','harajuku','moda giovane'], notes:'Vintage e usato economico a Harajuku. 3 piani stracolmi.'},
    {id:'vint-008', name:'Treasure Factory Koenji', city:'Tokyo', cat:'vintage', coords:[35.7058, 139.6501], rating:4.4, hours:'10:00–21:00', budget_jpy:6000, items:['vintage','usato','casa'], notes:'Catena acquisto/vendita. Anche oggetti casa, vinili, fumetti.'},
    // VINTAGE — Kyoto
    {id:'vint-009', name:'Furugi no Mise Shichifuku', city:'Kyoto', cat:'vintage', coords:[35.0045, 135.7618], rating:4.6, hours:'11:00–19:00', budget_jpy:18000, items:['vintage','kimono','furugi'], notes:'Furugi (usato) con selezione kimono e haori. Zona Nishiki.'},
    {id:'vint-010', name:'Hinaya Kimono Vintage', city:'Kyoto', cat:'vintage', coords:[35.0058, 135.7701], rating:4.7, hours:'10:00–18:00', budget_jpy:25000, items:['kimono','vintage','obi'], notes:'Kimono vintage di seconda mano. Prezzi da 3.000¥. Anche seta.'},
    {id:'vint-011', name:'Usagi Gion Vintage', city:'Kyoto', cat:'vintage', coords:[35.0038, 135.7742], rating:4.5, hours:'12:00–19:00', budget_jpy:20000, items:['vintage','moda','accessori'], notes:'Piccolo negozio vintage vicino a Gion. Capi giapponesi anni 80.'},
    // VINTAGE — Osaka
    {id:'vint-012', name:'Amerika Mura Vintage Row', city:'Osaka', cat:'vintage', coords:[34.6703, 135.5022], rating:4.7, hours:'11:00–21:00', budget_jpy:20000, items:['vintage','american','streetwear'], notes:'America-mura (Amemura) è il distretto vintage di Osaka. 20+ negozi in 3 isolati.'},
    {id:'vint-013', name:'Ragtag Osaka', city:'Osaka', cat:'vintage', coords:[34.6695, 135.5015], rating:4.5, hours:'11:00–20:00', budget_jpy:28000, items:['vintage','designer','resell'], notes:'Filiale Osaka di Ragtag. Designer e vintage pregiato.'},
    {id:'vint-014', name:'Namba Bears Vintage', city:'Osaka', cat:'vintage', coords:[34.6674, 135.5014], rating:4.4, hours:'12:00–21:00', budget_jpy:12000, items:['vintage','punk','rock'], notes:'Vintage con taglio punk/rock. Giacche, band tees, accessori.'},
    // VINTAGE — Kanazawa
    {id:'vint-015', name:'Furugi Higashi Chaya', city:'Kanazawa', cat:'vintage', coords:[36.5708, 136.6678], rating:4.5, hours:'10:00–18:00', budget_jpy:15000, items:['vintage','kimono','artigianato'], notes:'Negozio furugi nel quartiere geisha. Kimono e yukata vintage.'},
    // VINTAGE — Hiroshima
    {id:'vint-016', name:'Nagarekawa Vintage', city:'Hiroshima', cat:'vintage', coords:[34.3970, 132.4580], rating:4.3, hours:'11:00–20:00', budget_jpy:10000, items:['vintage','usato','abbigliamento'], notes:'Zona Nagarekawa. Piccolo ma ben selezionato.'},
    // VINTAGE — Fukuoka
    {id:'vint-017', name:'Daimyo Vintage Street', city:'Fukuoka', cat:'vintage', coords:[33.5892, 130.3983], rating:4.5, hours:'11:00–21:00', budget_jpy:15000, items:['vintage','streetwear','moda'], notes:'Daimyo è il quartiere hip di Fukuoka. 10+ negozi vintage in una via.'},
    {id:'vint-018', name:'2nd Street Tenjin', city:'Fukuoka', cat:'vintage', coords:[33.5896, 130.3984], rating:4.4, hours:'10:00–21:00', budget_jpy:8000, items:['vintage','usato catena','abbigliamento'], notes:'Catena 2nd Street — prezzi bassi, grande selezione.'},
    // VINTAGE — Takayama
    {id:'vint-019', name:'Sanmachi Antique Shops', city:'Takayama', cat:'vintage', coords:[36.1450, 137.2542], rating:4.6, hours:'9:00–17:00', budget_jpy:30000, items:['antichi','lacca','ceramica','folk art'], notes:'Diverse botteghe di antiquariato Hida nella via storica. Pezzi unici.'},
  ];
  window.SHOPPING_DB = SHOPPING_DB;

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
