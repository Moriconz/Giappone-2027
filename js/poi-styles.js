// ============================================================================
// poi-styles.js — CAT_COLORS, CAT_EMOJI, getCategoryColor, getCategoryEmoji,
//   makePoiStyle, _makeClusterStyle, createFallbackStyle
// Extracted from app-core.js. Uses ol.style.* global (loaded before this file).
// ============================================================================
(function () {
  'use strict';

const CAT_COLORS = {
  // Culture & Heritage (blue-purple tones)
  shrine:'#E07B39', temple:'#B5541E', church:'#6B4C8A', mosque:'#8B5A9E',
  synagogue:'#7B6A9E', culture:'#4A7AB5', museum:'#5A8BC5', gallery:'#5A7BC5',
  library:'#3A5A95', landmark:'#7A8BA5', monument:'#6A7AB5', historical_landmark:'#5A7AB5',
  castle:'#8A5A3A', place_of_worship:'#5A6AB5',

  // Food & Dining (warm tones - browns, oranges, reds, yellows)
  food:'#D4A017', restaurant:'#D4702A', cafe:'#C5703A', bar:'#B5502A',
  bakery:'#D4903A', meal_delivery:'#D4702A', meal_takeaway:'#C5703A',
  drinking_bar:'#A5402A', market:'#E0923A',

  // Shopping & Commerce (reds, oranges, pinks)
  shopping:'#C85C3B', shop:'#D4703A', supermarket:'#D4703A', shopping_mall:'#C85C3B',
  department_store:'#B85C3B', clothing_store:'#D4703A', shoe_store:'#C85C3B',
  book_store:'#8B7A5A', electronics_store:'#6A5A8B', jewelry_store:'#D47A5C',
  furniture_store:'#7A6A5A', home_goods_store:'#8B7A5A', pharmacy:'#E4698A',
  convenience_store:'#C85C3B', florist:'#E4698A', toy_store:'#E4698A', vintage:'#A54A6B',

  // Accommodation & Lodging (browns, beiges)
  accommodation:'#8B6F47', hotel:'#7A5A3A', hostel:'#9A7A5A', guest_house:'#8B7A5A',
  campground:'#6A7A5A', apartment_building:'#7A6A5A',

  // Wellness & Health (purples, pinks, light reds)
  wellness:'#D4698A', spa:'#C5598A', gym:'#D4798A', yoga_studio:'#C5698A',
  health:'#D4698A', hospital:'#D54A7A', clinic:'#D54A7A', doctor:'#C5698A',
  dentist:'#D4598A', massage:'#D4698A', physiotherapist:'#C5598A',
  beauty_salon:'#D4698A', hair_care:'#E4698A',

  // Services & Business (grays, teals, blues)
  services:'#5A7A9E', bank:'#4A6A9E', atm:'#4A7AAE', post_office:'#3A5A8E',
  real_estate_agency:'#5A6A9E', travel_agency:'#4A7AAE', insurance_agency:'#3A6A9E',
  accounting:'#5A7A9E', attorney:'#4A6A9E', car_rental:'#4A7AAE',
  car_repair:'#5A6A5A', car_wash:'#4A8A9E', locksmith:'#4A6A8E',
  plumber:'#5A6A5A', electrician:'#7A8A9E', business_center:'#4A6A9E',
  internet_cafe:'#5A7A9E', laundry:'#5A6A5A', dry_cleaner:'#5A6A5A',

  // Nature & Outdoor (greens, teals, blues)
  nature:'#4A7C59', park:'#5A8C69', natural_feature:'#4A8C59', garden:'#6A9C79',
  zoo:'#5A8C69', aquarium:'#3A7A9E', botanical_garden:'#4A8C59',
  amusement_park:'#7A9C79', hiking_area:'#4A7C59', scenic_spot:'#3A9AB0',
  water:'#1E90FF',

  // Entertainment & Experience (varied, vivid)
  experience:'#7A9E3A', onsen:'#D4698A', bath:'#5A9E9E', entertainment:'#8A7A5A',
  theatre:'#6A5A8B', movie_theater:'#5A5A8B', sports:'#8A5A3A',

  // Education (blue-ish)
  school:'#4A7AB5',

  // Transport & Infrastructure (teals, dark blues)
  transport:'#3A7EA0', station:'#3A7EA0', train_station:'#3A7EA0',
  bus_station:'#3A7EA0', airport:'#2A6E90', parking:'#4A8EB0',
  taxi_stand:'#3A8EB0', bike_rental:'#4A9EB0', gas_station:'#4A7AAE',

  // Neighborhoods (warm-ish)
  neighborhood:'#5A8AA5',

  // Viewpoint
  viewpoint:'#3AA5A0',

  // Generic & Fallback
  poi:'#C85C3B', all:'#C85C3B', unclassified:'#8A8A8A', establishment:'#7A7A7A'
};

// Generatore dinamico di colori per categorie non mappate
function getCategoryColor(cat) {
  if (CAT_COLORS[cat]) return CAT_COLORS[cat];
  // Generazione deterministica di colore basato sul nome
  let hash = 0;
  for (let i = 0; i < cat.length; i++) {
    hash = ((hash << 5) - hash) + cat.charCodeAt(i);
    hash = hash & hash;
  }
  const hue = Math.abs(hash) % 360;
  const colors = [
    '#E07B39', '#B5541E', '#4A7C59', '#D4A017', '#C85C3B',
    '#D4698A', '#5A7A9E', '#3A7EA0', '#7A9E3A', '#8B6F47'
  ];
  return colors[Math.abs(hash) % colors.length];
}
window.getCategoryColor = getCategoryColor; // esposto per js/views/poi-detail-view.js

const CAT_EMOJI = {
  // Culture & Heritage
  all:'📍', poi:'📍', unclassified:'❓',
  shrine:'⛩️', temple:'🏯', church:'⛪', mosque:'🕌', synagogue:'🕍',
  culture:'🎨', museum:'🏛️', gallery:'🖼️', library:'📚', landmark:'📍',
  monument:'🗿', historical_landmark:'🏛️', castle:'🏰', place_of_worship:'⛩️',

  // Food & Dining
  food:'🍽️', restaurant:'🍜', cafe:'☕', bar:'🍷', bakery:'🥐',
  meal_delivery:'🛵', meal_takeaway:'📦', drinking_bar:'🍺', market:'🥢',

  // Shopping & Commerce
  shopping:'🛍️', shop:'🛒', supermarket:'🏪', shopping_mall:'🏬',
  department_store:'🏬', clothing_store:'👕', shoe_store:'👞',
  book_store:'📖', electronics_store:'⚡', jewelry_store:'💎',
  furniture_store:'🛋️', home_goods_store:'🏠', pharmacy:'💊',
  convenience_store:'🏪', florist:'🌸', toy_store:'🧸', vintage:'🧥',

  // Accommodation & Lodging
  accommodation:'🏩', hotel:'🏨', hostel:'🏠', guest_house:'🏡',
  campground:'⛺', apartment_building:'🏢',

  // Wellness & Health
  wellness:'🧘', spa:'💆', gym:'💪', yoga_studio:'🧘', health:'⚕️',
  hospital:'🏥', clinic:'🏥', doctor:'⚕️', dentist:'🦷',
  massage:'💆', physiotherapist:'🤕', beauty_salon:'💄', hair_care:'💇',

  // Services & Business
  services:'⚙️', bank:'🏦', atm:'💰', post_office:'📮',
  real_estate_agency:'🏠', travel_agency:'✈️', insurance_agency:'🛡️',
  accounting:'📊', attorney:'⚖️', car_rental:'🚗', car_repair:'🔧',
  car_wash:'🚗', locksmith:'🔐', plumber:'🔨', electrician:'⚡',
  business_center:'💼', internet_cafe:'☕', laundry:'👔', dry_cleaner:'👔',

  // Nature & Outdoor
  nature:'🌿', park:'🌳', natural_feature:'🌲', garden:'🌸',
  zoo:'🦁', aquarium:'🐠', botanical_garden:'🌺', amusement_park:'🎡',
  hiking_area:'⛰️', scenic_spot:'🔭', water:'💧',

  // Entertainment & Experience
  experience:'✨', onsen:'♨️', bath:'🛁', entertainment:'🎭',
  theatre:'🎭', movie_theater:'🎬', sports:'⚽',

  // Education
  school:'🎓',

  // Transport & Infrastructure
  transport:'🚆', station:'🚉', train_station:'🚂', bus_station:'🚌',
  airport:'✈️', parking:'🅿️', taxi_stand:'🚕', bike_rental:'🚲',
  gas_station:'⛽',

  // Neighborhoods & Viewpoint
  neighborhood:'🏘️', viewpoint:'🔭',

  // Generic fallback
  establishment:'🏢'
};

// Generatore dinamico di emoji per categorie non mappate
function getCategoryEmoji(cat) {
  if (CAT_EMOJI[cat]) return CAT_EMOJI[cat];
  const emojiPool = ['📍', '🏢', '🌟', '✨', '⭐', '🎯', '📌', '🏷️', '🎪', '🎭'];
  let hash = 0;
  for (let i = 0; i < cat.length; i++) {
    hash = ((hash << 5) - hash) + cat.charCodeAt(i);
    hash = hash & hash;
  }
  return emojiPool[Math.abs(hash) % emojiPool.length];
}
window.getCategoryEmoji = getCategoryEmoji; // esposto per js/views/poi-detail-view.js

// Fallback style if canvas-based style fails
function createFallbackStyle(cat) {
  const color = CAT_COLORS[cat] || '#C85C3B';
  return new ol.style.Style({
    image: new ol.style.Circle({
      radius: 8,
      fill: new ol.style.Fill({ color: color }),
      stroke: new ol.style.Stroke({ color: '#ffffff', width: 2 })
    })
  });
}

const _styleCache = {};
// Cluster bubble style — cached by count bucket + zoom level bucket
const _clusterStyleCache = new Map();
function _makeClusterStyle(count) {
  const bucket = count >= 100 ? 'L' : count >= 20 ? 'M' : 'S';
  if (_clusterStyleCache.has(bucket)) return _clusterStyleCache.get(bucket);
  const radius = bucket === 'L' ? 20 : bucket === 'M' ? 16 : 13;
  const color  = bucket === 'L' ? 'rgba(239,68,68,0.9)' : bucket === 'M' ? 'rgba(251,146,60,0.9)' : 'rgba(99,102,241,0.9)';
  const style = new ol.style.Style({
    image: new ol.style.Circle({
      radius,
      fill: new ol.style.Fill({ color }),
      stroke: new ol.style.Stroke({ color: '#fff', width: 2 })
    }),
    text: new ol.style.Text({
      text: count > 999 ? '999+' : String(count),
      fill: new ol.style.Fill({ color: '#fff' }),
      font: `bold ${bucket === 'S' ? 11 : 13}px -apple-system,sans-serif`
    })
  });
  _clusterStyleCache.set(bucket, style);
  return style;
}

function makePoiStyle(cat, isGF) {
  const key = cat + (isGF ? '_gf' : '');
  if (_styleCache[key]) return _styleCache[key];
  try {
    const color = getCategoryColor(cat);
    const emoji = getCategoryEmoji(cat);
    const canvas = document.createElement('canvas');
    canvas.width = 40; canvas.height = 48;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      console.error('[makePoiStyle] Failed to get canvas context');
      return null;
    }

    // Pin shape (cerchio + coda)
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(20, 18, 14, 0, Math.PI * 2);
    ctx.fill();

    // Pin stroke
    ctx.strokeStyle = isGF ? '#4A7C59' : '#ffffff';
    ctx.lineWidth = isGF ? 3 : 2;
    ctx.stroke();

    // Pin tail
    ctx.beginPath();
    ctx.moveTo(15, 28);
    ctx.lineTo(20, 45);
    ctx.lineTo(25, 28);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = isGF ? '#4A7C59' : '#ffffff';
    ctx.stroke();

    // Emoji (con fallback per font issues)
    try {
      ctx.font = 'bold 20px "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(emoji, 20, 18);
    } catch(e) {
      console.warn('[makePoiStyle] Emoji render failed for:', cat, e);
    }

    const style = new ol.style.Style({
      image: new ol.style.Icon({
        img: canvas,
        imgSize: [40, 48],
        anchor: [0.5, 1],
        scale: 1
      })
    });

    return style;
  } catch (err) {
    console.error('[makePoiStyle] Error creating style for cat=' + cat, err);
    return null;
  }
}

  window.CAT_COLORS = CAT_COLORS;
  window.CAT_EMOJI = CAT_EMOJI;
  window.makePoiStyle = makePoiStyle;
  window._makeClusterStyle = _makeClusterStyle;
  window.createFallbackStyle = createFallbackStyle;
})();
