/**
 * gf-heatmap.js — Layer heatmap della densità di luoghi gluten-free
 *
 * Mostra "dove conviene cercare": una heatmap OpenLayers sovrapposta alla mappa
 * con l'intensità proporzionale alla concentrazione di POI gluten-free noti
 * (DB curato `GFPlaces` + eventuali shop trovati via Google Places).
 *
 * Distintivo del prodotto: a colpo d'occhio l'utente vede le zone "GF-friendly"
 * (Tokyo centro, Kyoto) vs i deserti GF.
 *
 * Toggle: voce "🔥 Heatmap GF" nel menu drawer + API window.GFHeatmap.toggle().
 * Layer indipendente, non interferisce con i marker esistenti.
 *
 * Dipendenze esterne (tutte su window):
 *   - window.map (OpenLayers), window.ol
 *   - window.GFPlaces.getGFPlaces() (DB curato)
 *   - window.allGlutenFreeShops (opzionale, popolato da renderGFView)
 *   - window.toast, window.t
 */
(function () {
  'use strict';

  const T = (k, f) => (typeof window.t === 'function') ? window.t(k, f) : f;

  let heatLayer = null;
  let heatSource = null;
  let visible = false;

  // Estrae [lng, lat] da forme diverse di POI GF
  function _coordOf(p) {
    if (!p) return null;
    if (typeof p.lng === 'number' && typeof p.lat === 'number') return [p.lng, p.lat];
    if (p.geometry?.location) {
      const loc = p.geometry.location;
      const lat = typeof loc.lat === 'function' ? loc.lat() : loc.lat;
      const lng = typeof loc.lng === 'function' ? loc.lng() : loc.lng;
      if (typeof lat === 'number' && typeof lng === 'number') return [lng, lat];
    }
    if (typeof p.longitude === 'number' && typeof p.latitude === 'number') return [p.longitude, p.latitude];
    return null;
  }

  // Pesa per safety level (full=1, partial=0.6, none/unknown=0.3)
  function _weightOf(p) {
    const lvl = (p?.safety_level || p?.safetyLevel || '').toString().toLowerCase();
    if (lvl.includes('green') || lvl.includes('full')) return 1;
    if (lvl.includes('yellow') || lvl.includes('partial')) return 0.6;
    return 0.4;
  }

  function _collectPoints() {
    const pts = [];
    const seen = new Set();
    const push = (p) => {
      const c = _coordOf(p);
      if (!c) return;
      const key = c[0].toFixed(4) + ',' + c[1].toFixed(4);
      if (seen.has(key)) return;
      seen.add(key);
      pts.push({ coord: c, weight: _weightOf(p) });
    };

    // window.GFPlaces espone getAll() (alias storico getGFPlaces)
    try {
      const gf = window.GFPlaces;
      const curated = (gf?.getAll?.() || gf?.getGFPlaces?.() || []);
      curated.forEach(push);
    } catch (_) {}
    try { (Array.isArray(window.allGlutenFreeShops) ? window.allGlutenFreeShops : []).forEach(push); } catch (_) {}
    return pts;
  }

  function _ensureLayer() {
    if (heatLayer || !window.map || !window.ol) return;
    heatSource = new ol.source.Vector();
    heatLayer = new ol.layer.Heatmap({
      source: heatSource,
      blur: 24,
      radius: 16,
      weight: (feature) => feature.get('w') || 0.5,
      zIndex: 40,
      // gradiente verde→giallo→rosso (verde = molti GF safe)
      gradient: ['#00640033', '#7fe2a9', '#ffd166', '#ff8c42', '#ff5050']
    });
    heatLayer.setVisible(false);
    window.map.addLayer(heatLayer);
  }

  function refresh() {
    _ensureLayer();
    if (!heatSource || !window.ol) return 0;
    heatSource.clear();
    const pts = _collectPoints();
    pts.forEach(({ coord, weight }) => {
      const f = new ol.Feature({ geometry: new ol.geom.Point(ol.proj.fromLonLat(coord)) });
      f.set('w', weight);
      heatSource.addFeature(f);
    });
    return pts.length;
  }

  function show() {
    _ensureLayer();
    const n = refresh();
    if (n === 0) {
      window.toast?.('⚠️ ' + T('heat.noData', 'Nessun dato GF da mostrare ancora. Apri la GF Guide per caricarli.'));
      return false;
    }
    heatLayer.setVisible(true);
    visible = true;
    window.toast?.('🔥 ' + T('heat.on', 'Heatmap GF attiva') + ` (${n})`);
    return true;
  }

  function hide() {
    if (heatLayer) heatLayer.setVisible(false);
    visible = false;
    window.toast?.(T('heat.off', 'Heatmap GF disattivata'));
  }

  function toggle() {
    if (visible) { hide(); return false; }
    return show();
  }

  function isOn() { return visible; }

  window.GFHeatmap = { toggle, show, hide, isOn, refresh };
})();
