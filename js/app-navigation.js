// ============================================================================
// app-navigation.js — bottom nav, map click, refresh-POIs button
// Extracted from app-core.js. Runs inside DOMContentLoaded; registers AFTER
// app-core.js's handler so window.map / window.state are already set.
// Deps (all window.*): map, state, toast, openPOI, closeSheet,
//   renderGFView, renderGroupView, renderBudgetView, showMenuDrawer,
//   renderShoppingView, renderWeatherView, renderItineraryUnified,
//   renderGalleryView, openGroqPanel, openGFPlacesPanel,
//   openGFSuggestionPanel, GooglePlacesLoader, ol.*
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  // ── Weather widget init ──────────────────────────────────────────────────
  const initWeatherWidget = document.getElementById('weather-floating');
  if (initWeatherWidget) initWeatherWidget.classList.add('show');

  window.activeTabView = 'map';

  // ── Bottom nav ───────────────────────────────────────────────────────────
  const bottomNav = document.querySelector('nav.bottom');
  if (bottomNav) {
    bottomNav.addEventListener('click', e => {
      const btn = e.target.closest('button[data-view]');
      if (!btn) return;
      bottomNav.querySelectorAll('button').forEach(b => b.classList.toggle('active', b === btn));
      const view = btn.dataset.view;
      window.activeTabView = view;
      console.log('[BottomNav] Clicked view:', view);

      const weatherWidget = document.getElementById('weather-floating');
      if (weatherWidget && view !== 'map') weatherWidget.classList.remove('show');

      if (view === 'map') {
        if (weatherWidget) weatherWidget.classList.add('show');
        window.closeSheet?.();
        setTimeout(() => {
          const s = window.state;
          if (s?.gpsCurrentLat && s?.gpsCurrentLng) {
            window.map.getView().animate({ center: ol.proj.fromLonLat([s.gpsCurrentLng, s.gpsCurrentLat]), zoom: 14, duration: 500 });
          } else if (s?.group?.lastKnownLat && s?.group?.lastKnownLng) {
            window.map.getView().animate({ center: ol.proj.fromLonLat([s.group.lastKnownLng, s.group.lastKnownLat]), zoom: 12, duration: 500 });
          }
          window.map.updateSize();
        }, 100);
        return;
      }
      if (view === 'itinerary') { window.renderItineraryUnified?.(); return; }
      if (view === 'gf')        { window.renderGFView?.(); return; }
      if (view === 'menu')      { window.showMenuDrawer?.(); return; }
      if (view === 'list')      { window.renderItineraryUnified?.(); return; }
      if (view === 'weather')   { window.renderWeatherView?.(); return; }
      if (view === 'bookings')  { window.loadScript?.('./js/views/bookings-view.js').then(() => window.renderBookingsView?.()); return; }
      if (view === 'shopping')  { window.renderShoppingView?.(); return; }
      if (view === 'group')     { window.renderGroupView?.(); return; }
      if (view === 'budget')    { window.renderBudgetView?.(); return; }
      if (view === 'gallery')   { window.renderGalleryView?.(); return; }
      if (view === 'sos')       { window.loadScript?.('./js/views/sos-view.js').then(() => window.renderSOSPanel?.()); return; }
      if (view === 'tips')      { window.loadScript?.('./js/views/tips-view.js').then(() => window.renderTipsView?.()); return; }
      if (view === 'groq-menu') { window.openGroqPanel?.(); return; }
      if (view === 'gf-places') { window.openGFPlacesPanel?.(); return; }
      if (view === 'gf-suggest'){ window.openGFSuggestionPanel?.(); return; }
      if (view === 'reminders') { window.loadScript?.('./js/itinerary-reminders.js').then(() => window.openItineraryReminders?.()); return; }
      if (view === 'jr-pass')   { window.loadScript?.('./js/jr-pass-calculator.js').then(() => window.openJRPassPanel?.()); return; }
      if (view === 'japan-cal') { window.JapanCalendarHints?.openPanel?.(); return; }
    });
  }

  // ── Map click handler ────────────────────────────────────────────────────
  if (window.map) {
    window.map.on('click', (e) => {
      console.log('%c[MAP CLICK]', 'background: #1A3C5E; color: white; padding: 4px 8px; border-radius: 3px; font-weight: bold');
      let handled = false;
      let featuresFound = 0;
      window.map.forEachFeatureAtPixel(e.pixel, (clusterFeature) => {
        featuresFound++;
        if (handled) return;
        const clusterMembers = clusterFeature.get('features');
        let feature;
        if (clusterMembers && clusterMembers.length > 1) {
          const extent = ol.extent.createEmpty();
          clusterMembers.forEach(f => ol.extent.extend(extent, f.getGeometry().getExtent()));
          window.map.getView().fit(extent, { padding: [80, 80, 80, 80], duration: 400, maxZoom: 16 });
          handled = true;
          return;
        } else if (clusterMembers && clusterMembers.length === 1) {
          feature = clusterMembers[0];
        } else {
          feature = clusterFeature;
        }
        const id = feature.get('id');
        const type = feature.get('type');
        const peerName = feature.get('peerName');
        const name = feature.get('name');
        const safetyLevel = feature.get('safety_level');
        console.log(`%c[MAP CLICK] Feature ${featuresFound}:`, 'background:#FF9800;color:white;padding:4px 8px;border-radius:3px', { id, type, name, peerName });
        if (peerName) {
          window.toast?.('Posizione rilevata ' + peerName);
          handled = true;
        } else if (safetyLevel) {
          const icon = safetyLevel === 'GREEN' ? '🟢' : safetyLevel === 'RED' ? '🔴' : '🟡';
          window.toast?.(`${icon} ${name} (${feature.get('city')})`);
          handled = true;
        } else if (type === 'shopping') {
          window.__openShop?.(id);
          handled = true;
        } else if (id) {
          window.openPOI?.(id);
          handled = true;
        }
      });
      console.log('[MAP CLICK] Features found:', featuresFound, 'Handled:', handled);
    });
  }

  // ── Refresh POIs button ──────────────────────────────────────────────────
  const refreshBtn = document.getElementById('refresh-pois-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      refreshBtn.style.opacity = '0.5';
      refreshBtn.style.cursor = 'wait';
      try {
        const view = window.map.getView();
        const center = ol.proj.transform(view.getCenter(), 'EPSG:3857', 'EPSG:4326');
        if (window.GooglePlacesLoader?.reloadArea) {
          await window.GooglePlacesLoader.reloadArea(center[1], center[0]);
        }
      } catch (err) {
        console.error('[App] Refresh error:', err);
      } finally {
        refreshBtn.style.opacity = '1';
        refreshBtn.style.cursor = 'pointer';
      }
    });
  }
});
