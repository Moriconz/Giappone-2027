// ============================================================================
// poi-detail/poi-detail-helpers.js — helper puri per la card POI
// Estratto da poi-detail-view.js (nessun cambio di comportamento).
// Espone: window.gfTag, window.PoiDetailHelpers
// ============================================================================
(function () {
  'use strict';

// ---- POI detail ----
function gfTag(gf){
  if (!gf || !gf.lvl || gf.lvl === 'unknown') return ''; // Non mostrare il tag se non disponibile
  const map = {full:['🌾 100% Gluten-Free','gf-full'], partial:['🌾 GF parziale','gf-partial'], none:['⚠️ Non GF','gf-none']};
  const [t,c] = map[gf.lvl] || map.none;
  return `<span class="tag ${c}">${t}</span>`;
}

// FOOD_TYPES — Unica fonte di verità per classificazione ristorante
const FOOD_TYPES = ['restaurant','food','cafe','bar','meal_takeaway','bakery','izakaya'];

function isRestaurantPOI(poi) {
  return FOOD_TYPES.includes(poi.primaryType || poi.cat);
}

function getCleanAddress(poi) {
  const addr = (poi._details?.address || poi.address || '').trim();
  return addr && addr.length > 0 ? addr : null;
}

function getReadableSubtypeLabel(poi) {
  const subtypeMap = {
    // Food & Drink
    'restaurant': 'Ristorante',
    'cafe': 'Caffetteria',
    'bar': 'Bar',
    'food': 'Ristorante',
    'izakaya': 'Izakaya',
    'bakery': 'Panetteria',
    'meal_takeaway': 'Asporto',
    // Culture & History
    'museum': 'Museo',
    'shrine': 'Santuario',
    'temple': 'Tempio',
    'church': 'Chiesa',
    'landmark': 'Landmark',
    'tourist_attraction': 'Attrazione turistica',
    // Services & Admin
    'post_office': 'Ufficio postale',
    'services': 'Servizi'
  };
  return subtypeMap[poi.cat] || (poi.cat ? poi.cat.charAt(0).toUpperCase() + poi.cat.slice(1) : 'Luogo');
}

  window.gfTag = gfTag;
  window.PoiDetailHelpers = { FOOD_TYPES, isRestaurantPOI, getCleanAddress, getReadableSubtypeLabel };
})();
