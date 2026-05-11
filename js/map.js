/**
 * MAP — OpenLayers initialization + POI rendering
 * Extracted from index.html inline JS
 */

import { state, CITY_COORDS, getGpsRadiusKm } from './core.js';

// ============================================================================
// MAP INITIALIZATION
// ============================================================================

export let map = null;
export let vectorSource = null;
export let vectorLayer = null;
export let currentZoom = 9;
export let POIS = [];
export let POIS_LOADED = false;

export function initMap() {
  console.log('[Map] Initializing OpenLayers...');

  // Vector source for POI markers
  vectorSource = new ol.source.Vector();
  vectorLayer = new ol.layer.Vector({
    source: vectorSource,
    style: featureStyle
  });

  // Base map layer (OpenStreetMap tiles)
  const tileLayer = new ol.layer.Tile({
    source: new ol.source.OSM()
  });

  // Create map
  map = new ol.Map({
    target: 'map',
    layers: [tileLayer, vectorLayer],
    view: new ol.View({
      center: ol.proj.fromLonLat([139.76, 35.68]), // Tokyo
      zoom: currentZoom,
      maxZoom: 18,
      minZoom: 5
    })
  });

  // Handle zoom changes
  map.on('moveend', () => {
    currentZoom = map.getView().getZoom();
    console.log('[Map] Zoom:', currentZoom);
  });

  // Handle POI click
  map.on('click', (event) => {
    let clicked = false;
    map.forEachFeatureAtPixel(event.pixel, (feature) => {
      onPoiClick(feature.getProperties());
      clicked = true;
    });
  });

  console.log('[Map] ✓ OpenLayers initialized');
  return map;
}

// ============================================================================
// POI STYLING
// ============================================================================

function featureStyle(feature) {
  const props = feature.getProperties();
  const isGF = props.gluten_free || props.category === 'restaurant';
  const isActive = props.id === state.activePoi;

  return new ol.style.Style({
    image: new ol.style.Circle({
      radius: isActive ? 12 : isGF ? 10 : 8,
      fill: new ol.style.Fill({
        color: isActive ? '#FF6B35' : isGF ? '#4CAF50' : '#2196F3'
      }),
      stroke: new ol.style.Stroke({
        color: '#ffffff',
        width: isActive ? 3 : 2
      })
    }),
    text: new ol.style.Text({
      text: props.icon || '📍',
      font: '16px Arial',
      offsetY: -12
    })
  });
}

// ============================================================================
// POI LOADING
// ============================================================================

export async function loadPOIs(filterGF = false) {
  if (POIS_LOADED && !filterGF) {
    console.log('[Map] POIs already loaded');
    return POIS;
  }

  console.log('[Map] Loading POIs...');

  // Placeholder: In production, load from API/GeoJSON
  // For now, add dummy POI
  POIS = [
    {
      id: 'tokyo-001',
      name: 'Sample Restaurant',
      lat: 35.68,
      lon: 139.76,
      category: 'restaurant',
      gluten_free: true,
      icon: '🍜'
    }
  ];

  // Render on map
  renderPOIs(filterGF);
  POIS_LOADED = true;

  console.log('[Map] ✓ Loaded', POIS.length, 'POIs');
  return POIS;
}

// ============================================================================
// POI RENDERING
// ============================================================================

export function renderPOIs(filterGF = false) {
  if (!vectorSource) return;

  vectorSource.clear();

  let filtered = POIS;
  if (filterGF) {
    filtered = POIS.filter(p => p.gluten_free);
  }

  filtered.forEach(poi => {
    const feature = new ol.Feature({
      geometry: new ol.geom.Point(ol.proj.fromLonLat([poi.lon, poi.lat])),
      ...poi
    });
    vectorSource.addFeature(feature);
  });

  console.log('[Map] Rendered', filtered.length, 'POIs');
}

// ============================================================================
// POI INTERACTION
// ============================================================================

export function onPoiClick(props) {
  console.log('[Map] POI clicked:', props.name);
  state.activePoi = props.id;

  // Show details in sheet
  const sheet = document.getElementById('sheet');
  const sheetTitle = document.getElementById('sheet-title');
  const sheetBody = document.getElementById('sheet-body');

  if (sheet && sheetTitle && sheetBody) {
    sheetTitle.textContent = props.name;
    sheetBody.innerHTML = `
      <div style="padding: 16px;">
        <p><strong>Categoria:</strong> ${props.category}</p>
        <p><strong>GF:</strong> ${props.gluten_free ? '✓ Sì' : '✗ No'}</p>
        <p><strong>Coordinate:</strong> ${props.lat.toFixed(2)}, ${props.lon.toFixed(2)}</p>
      </div>
    `;
    sheet.style.display = 'block';
  }
}

export function closePOISheet() {
  const sheet = document.getElementById('sheet');
  if (sheet) {
    sheet.style.display = 'none';
    state.activePoi = null;
  }
}

// ============================================================================
// VIEWPORT UTILITIES
// ============================================================================

export function fitToCoords(coords) {
  if (!map) return;
  const view = map.getView();
  const extent = ol.extent.createEmpty();
  coords.forEach(([lon, lat]) => {
    ol.extent.extend(extent, ol.proj.fromLonLat([lon, lat]));
  });
  view.fit(extent, { padding: [50, 50, 50, 50], duration: 500 });
}

export function centerOn(lat, lon, zoom = 12) {
  if (!map) return;
  const view = map.getView();
  view.animate({
    center: ol.proj.fromLonLat([lon, lat]),
    zoom: zoom,
    duration: 500
  });
}

// ============================================================================
// INIT LOG
// ============================================================================

console.log('[Map] ✓ Map module loaded');
