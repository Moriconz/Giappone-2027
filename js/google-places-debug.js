/**
 * GOOGLE PLACES DEBUG — Console utilities for testing the new system
 *
 * Run these commands in browser console to diagnose issues
 */

window.GooglePlacesDebug = {
  // 1. Check if modules are loaded
  async checkModules() {
    console.log('%c[DEBUG] Module Status', 'background: #4A7C59; color: white; padding: 4px 8px; border-radius: 3px; font-weight: bold');
    console.table({
      'GooglePlacesCache': typeof window.GooglePlacesCache !== 'undefined' ? '✅ Loaded' : '❌ Missing',
      'GooglePlacesLoader': typeof window.GooglePlacesLoader !== 'undefined' ? '✅ Loaded' : '❌ Missing',
      'GOOGLE_PLACES_POIS': Array.isArray(window.GOOGLE_PLACES_POIS) ? `✅ Array (${window.GOOGLE_PLACES_POIS.length} POIs)` : '❌ Missing',
      'allPOIs function': typeof window.allPOIs === 'function' ? '✅ Defined' : '❌ Missing'
    });
  },

  // 2. Check GPS status
  async checkGPS() {
    console.log('%c[DEBUG] GPS Status', 'background: #FF6B6B; color: white; padding: 4px 8px; border-radius: 3px; font-weight: bold');
    if (window.state) {
      console.table({
        'GPS Enabled': window.state.gpsEnabled ? '✅ YES' : '❌ NO',
        'Current Lat': window.state.gpsCurrentLat || '❌ null',
        'Current Lng': window.state.gpsCurrentLng || '❌ null',
        'GPS Accuracy': window.state.gpsAccuracy ? `${window.state.gpsAccuracy.toFixed(0)}m` : '❌ null'
      });
    } else {
      console.warn('[DEBUG] window.state not found');
    }
  },

  // 3. Test API endpoint
  async testAPIEndpoint() {
    console.log('%c[DEBUG] Testing /api/googlePlacesNearby', 'background: #E8A838; color: white; padding: 4px 8px; border-radius: 3px; font-weight: bold');

    // Use Tokyo as test location
    const testLat = 35.6762;
    const testLng = 139.6503;
    const testRadius = 1000;

    try {
      const response = await fetch('/api/googlePlacesNearby', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: testLat,
          lng: testLng,
          radiusM: testRadius
        })
      });

      const data = await response.json();
      console.log('%c✅ API Response:', 'color: #4A7C59; font-weight: bold');
      console.table({
        'Status': data.status,
        'Results Count': data.results?.length || 0,
        'HTTP Status': response.status
      });

      if (data.results?.length > 0) {
        console.log('%c📍 Sample POIs:', 'color: #4A7C59; font-weight: bold');
        console.table(data.results.slice(0, 5).map(p => ({
          name: p.name,
          lat: p.geometry.location.lat.toFixed(4),
          lng: p.geometry.location.lng.toFixed(4),
          rating: p.rating || 'N/A'
        })));
      } else {
        console.warn('[DEBUG] No results from API');
      }

      return data;
    } catch (err) {
      console.error('%c❌ API Error:', 'color: #D9534F; font-weight: bold', err);
    }
  },

  // 4. Check cache status
  async checkCache() {
    console.log('%c[DEBUG] Cache Status', 'background: #4A7C59; color: white; padding: 4px 8px; border-radius: 3px; font-weight: bold');

    try {
      const allCached = await window.GooglePlacesCache.getAllCached();
      console.table({
        'Total Cached POIs': allCached.length,
        'Cache Ready': window.GooglePlacesCache.db ? '✅ YES' : '❌ NO'
      });

      if (allCached.length > 0) {
        console.log('%c📦 Cached POI Sample:', 'color: #4A7C59; font-weight: bold');
        console.table(allCached.slice(0, 5).map(p => ({
          name: p.name,
          googlePlaceId: p.googlePlaceId,
          lat: p.lat.toFixed(4),
          lng: p.lng.toFixed(4)
        })));
      }
    } catch (err) {
      console.error('[DEBUG] Cache error:', err);
    }
  },

  // 5. Check GOOGLE_PLACES_POIS population
  async checkGooglePlacesPOIs() {
    console.log('%c[DEBUG] GOOGLE_PLACES_POIS Status', 'background: #FF6B6B; color: white; padding: 4px 8px; border-radius: 3px; font-weight: bold');

    const pois = window.GOOGLE_PLACES_POIS || [];
    console.table({
      'Total POIs': pois.length,
      'Array Valid': Array.isArray(pois) ? '✅ YES' : '❌ NO'
    });

    if (pois.length > 0) {
      console.log('%c🗺️ Current POIs:', 'color: #FF6B6B; font-weight: bold');
      console.table(pois.slice(0, 10).map(p => ({
        name: p.name,
        lat: p.lat.toFixed(4),
        lng: p.lng.toFixed(4),
        rating: p.rating || 'N/A'
      })));
    } else {
      console.warn('[DEBUG] GOOGLE_PLACES_POIS is empty - waiting for data...');
    }
  },

  // 6. Check allPOIs() function
  async checkAllPOIs() {
    console.log('%c[DEBUG] allPOIs() Function', 'background: #4A7C59; color: white; padding: 4px 8px; border-radius: 3px; font-weight: bold');

    try {
      const allPois = window.allPOIs?.();
      console.table({
        'allPOIs() Returns': Array.isArray(allPois) ? `✅ Array (${allPois.length} items)` : '❌ Not an array',
        'First Item': allPois?.[0]?.name || '❌ None'
      });

      if (allPois?.length > 0) {
        console.log('%c📋 allPOIs() Sample:', 'color: #4A7C59; font-weight: bold');
        console.table(allPois.slice(0, 5).map(p => ({
          name: p.name || p.googlePlaceId,
          type: p.googlePlaceId ? 'Google Places' : p.custom ? 'Custom' : 'Local'
        })));
      }
    } catch (err) {
      console.error('[DEBUG] allPOIs() error:', err);
    }
  },

  // 7. Listen for events
  async listenForEvents() {
    console.log('%c[DEBUG] Listening for Events', 'background: #E8A838; color: white; padding: 4px 8px; border-radius: 3px; font-weight: bold');

    window.addEventListener('google-places-pois-loaded', (e) => {
      console.log('%c✅ google-places-pois-loaded Event Fired!', 'background: #4A7C59; color: white; font-weight: bold');
      console.log(`📍 Received ${e.detail.pois.length} POIs`);
      console.table(e.detail.pois.slice(0, 3).map(p => ({
        name: p.name,
        lat: p.lat.toFixed(4),
        lng: p.lng.toFixed(4)
      })));
    });

    console.log('🔔 Listening... (waiting for events)');
  },

  // 8. Full diagnostic
  async fullDiagnostic() {
    console.log('%c╔════════════════════════════════════════╗', 'color: #4A7C59; font-weight: bold');
    console.log('%c║  GOOGLE PLACES SYSTEM DIAGNOSTIC      ║', 'color: #4A7C59; font-weight: bold');
    console.log('%c╚════════════════════════════════════════╝', 'color: #4A7C59; font-weight: bold');

    await this.checkModules();
    console.log('');

    await this.checkGPS();
    console.log('');

    await this.checkCache();
    console.log('');

    await this.checkGooglePlacesPOIs();
    console.log('');

    await this.checkAllPOIs();
    console.log('');

    console.log('%c[DEBUG] Running API test...', 'color: #E8A838; font-weight: bold');
    await this.testAPIEndpoint();
  },

  // 9. Manually trigger load
  async manualLoad() {
    console.log('%c[DEBUG] Manually triggering load...', 'background: #FF6B6B; color: white; font-weight: bold');

    if (window.state?.gpsCurrentLat && window.state?.gpsCurrentLng) {
      console.log(`📍 Loading from GPS: ${window.state.gpsCurrentLat}, ${window.state.gpsCurrentLng}`);
      await window.GooglePlacesLoader.loadNearbyPOIs(window.state.gpsCurrentLat, window.state.gpsCurrentLng);
    } else {
      console.warn('[DEBUG] GPS not available, using Tokyo as test');
      await window.GooglePlacesLoader.loadNearbyPOIs(35.6762, 139.6503);
    }
  },

  // 10. Check loader statistics
  async getLoaderStats() {
    console.log('%c[DEBUG] Loader Statistics', 'background: #4A7C59; color: white; padding: 4px 8px; border-radius: 3px; font-weight: bold');
    try {
      if (!window.GooglePlacesLoader) {
        console.warn('[DEBUG] GooglePlacesLoader not available yet');
        return null;
      }
      if (typeof window.GooglePlacesLoader.getLoaderStats !== 'function') {
        console.warn('[DEBUG] getLoaderStats not a function:', typeof window.GooglePlacesLoader.getLoaderStats);
        return null;
      }
      const stats = await window.GooglePlacesLoader.getLoaderStats();
      if (stats) {
        console.table(stats);
        return stats;
      } else {
        console.warn('[DEBUG] getLoaderStats returned null');
      }
    } catch (err) {
      console.error('[DEBUG] Error getting stats:', err);
    }
  },

  // 11. Check map center position
  getMapCenter() {
    console.log('%c[DEBUG] Current Map Center', 'background: #E8A838; color: white; padding: 4px 8px; border-radius: 3px; font-weight: bold');
    if (window.map) {
      const view = window.map.getView();
      const center = ol.proj.transform(view.getCenter(), 'EPSG:3857', 'EPSG:4326');
      const coords = { lat: center[1], lng: center[0], zoom: view.getZoom() };
      console.table(coords);
      return coords;
    } else {
      console.warn('[DEBUG] window.map not found');
    }
  },

  // 12. Check vector layer features (markers on map)
  checkVectorLayerFeatures() {
    console.log('%c[DEBUG] Vector Layer Features', 'background: #FF6B6B; color: white; padding: 4px 8px; border-radius: 3px; font-weight: bold');

    // Check if we have access to vectorSource (it's in the local scope, so we check through allPOIs)
    if (window.allPOIs && typeof window.allPOIs === 'function') {
      const allPois = window.allPOIs();
      console.log(`Total POIs from allPOIs(): ${allPois.length}`);

      if (allPois.length > 0) {
        console.log('%c📍 Sample POIs (first 5):', 'color: #FF6B6B; font-weight: bold');
        console.table(allPois.slice(0, 5).map(p => ({
          name: p.name,
          lat: p.lat?.toFixed(4) || 'undefined',
          lng: p.lng?.toFixed(4) || 'undefined',
          cat: p.cat,
          fromGoogle: p.fromGooglePlaces ? '✅' : '❌'
        })));
      } else {
        console.warn('[DEBUG] allPOIs() returned empty array');
      }
    } else {
      console.warn('[DEBUG] allPOIs function not available');
    }

    // Check GOOGLE_PLACES_POIS directly
    const googlePOIs = window.GOOGLE_PLACES_POIS || [];
    console.log(`Google Places POIs in window.GOOGLE_PLACES_POIS: ${googlePOIs.length}`);
    if (googlePOIs.length > 0) {
      console.log('%c🌍 Sample Google Places POIs (first 3):', 'color: #FF6B6B; font-weight: bold');
      console.table(googlePOIs.slice(0, 3).map(p => ({
        name: p.name,
        lat: p.lat?.toFixed(4) || 'undefined',
        lng: p.lng?.toFixed(4) || 'undefined',
        googlePlaceId: p.googlePlaceId
      })));
    }
  },

  // 13. Create test marker at map center
  createTestMarker() {
    console.log('%c[DEBUG] Creating Test Marker', 'background: #E8A838; color: white; padding: 4px 8px; border-radius: 3px; font-weight: bold');

    if (!window.map) {
      console.error('[DEBUG] window.map not available');
      return;
    }

    try {
      const view = window.map.getView();
      const center = ol.proj.transform(view.getCenter(), 'EPSG:3857', 'EPSG:4326');
      const lat = center[1];
      const lng = center[0];

      console.log(`📍 Creating test marker at (${lat.toFixed(4)}, ${lng.toFixed(4)})`);

      // Create a simple feature to test rendering
      const testPoi = {
        id: 'test_marker_' + Date.now(),
        name: '🧪 Test Marker',
        lat: lat,
        lng: lng,
        cat: 'poi',
        fromGooglePlaces: false
      };

      // Add to GOOGLE_PLACES_POIS
      if (!window.GOOGLE_PLACES_POIS) window.GOOGLE_PLACES_POIS = [];
      window.GOOGLE_PLACES_POIS.push(testPoi);

      console.log('[DEBUG] Test POI added to GOOGLE_PLACES_POIS');
      console.log('[DEBUG] Calling renderMarkers() to display test marker...');

      // Trigger render (renderMarkers is in global scope)
      if (window.renderMarkers) {
        window.renderMarkers();
        console.log('%c✅ Test marker should now appear on the map!', 'color: #4A7C59; font-weight: bold');
      } else {
        console.error('[DEBUG] renderMarkers function not found');
      }
    } catch (err) {
      console.error('[DEBUG] Error creating test marker:', err);
    }
  }
};

console.log('%c[Google Places Debug] Available commands:', 'background: #4A7C59; color: white; padding: 4px 8px; border-radius: 3px; font-weight: bold');
console.log('window.GooglePlacesDebug.fullDiagnostic()         — Complete system check');
console.log('window.GooglePlacesDebug.checkModules()           — Check if modules loaded');
console.log('window.GooglePlacesDebug.checkGPS()               — Check GPS status');
console.log('window.GooglePlacesDebug.testAPIEndpoint()        — Test API endpoint');
console.log('window.GooglePlacesDebug.checkCache()             — Check IndexedDB cache');
console.log('window.GooglePlacesDebug.checkGooglePlacesPOIs()  — Check GOOGLE_PLACES_POIS');
console.log('window.GooglePlacesDebug.checkAllPOIs()           — Check allPOIs() function');
console.log('window.GooglePlacesDebug.listenForEvents()        — Listen for events');
console.log('window.GooglePlacesDebug.manualLoad()             — Manually trigger load');
console.log('window.GooglePlacesDebug.getLoaderStats()         — Check loader statistics');
console.log('window.GooglePlacesDebug.getMapCenter()           — Get current map center');
console.log('window.GooglePlacesDebug.checkVectorLayerFeatures() — Check POIs on map');
console.log('window.GooglePlacesDebug.createTestMarker()       — Create test marker at map center');
