# Debugging Guide: Markers Not Visible on Map

## Problem
Console shows "added 26 markers" but markers don't appear on the map.

---

## Quick Diagnostic Steps

Run these in console order:

### 1. Check if POI data exists
```javascript
window.GooglePlacesDebug.checkVectorLayerFeatures()
```
**Should show:** 
- Total POIs from allPOIs() > 0
- Google Places POIs in window.GOOGLE_PLACES_POIS > 0
- Sample POIs with valid lat/lng values

**If empty:** POIs aren't being loaded. Check GPS status first.

### 2. Check GPS status
```javascript
window.GooglePlacesDebug.checkGPS()
```
**Should show:**
- GPS Enabled: YES
- Current Lat/Lng: actual numbers (not null)
- GPS Accuracy: a number in meters

**If GPS is NO or null:** 
- GPS isn't enabled or hasn't found coordinates yet
- User needs to enable GPS or the loader timed out waiting for GPS

### 3. Check map center
```javascript
window.GooglePlacesDebug.getMapCenter()
```
**Should show:**
- lat/lng: numbers around 35-36 (Japan)
- zoom: 8-14

### 4. Test marker rendering
```javascript
window.GooglePlacesDebug.createTestMarker()
```
This creates a test marker at your current map center.

**If test marker appears:** Rendering works, POI data might be bad
**If test marker doesn't appear:** Rendering is broken (styling/layer issue)

---

## Common Issues & Fixes

### Issue 1: GPS Not Available
**Symptom:** `GPS Enabled: NO` or `Current Lat: null`

**Cause:** GPS isn't set or loader timed out waiting for it

**Solution:**
```javascript
// Manually set GPS to Tokyo for testing
window.state.gpsCurrentLat = 35.6762;
window.state.gpsCurrentLng = 139.6503;

// Then trigger loader
await window.GooglePlacesLoader.loadNearbyPOIs(35.6762, 139.6503);
```

### Issue 2: POIs loaded but markers invisible
**Symptom:** 
- `[renderMarkers] added 26 markers` appears
- But nothing shows on map

**Diagnosis:** Rendering or styling issue

**Test:**
```javascript
// Create test marker - if this works, something is wrong with POI data
window.GooglePlacesDebug.createTestMarker()
```

### Issue 3: POI coordinates are invalid
**Symptom:** Markers render but in wrong place, or log shows:
- `lat: undefined, lng: undefined`

**Cause:** Google Places API response not being parsed correctly

**Solution:** Check console logs when POIs load:
```
[renderMarkers] Sample POI #1: NAME at (35.1234, 139.5678), cat=..., fromGoogle=✅
```

If coordinates are missing, Google Places POIs aren't extracting lat/lng correctly.

---

## Full Diagnostic Sequence

Run this command for complete analysis:
```javascript
window.GooglePlacesDebug.fullDiagnostic()
```

This runs:
1. checkModules() — Verify modules loaded
2. checkGPS() — Check GPS status
3. checkCache() — Check cached POIs
4. checkGooglePlacesPOIs() — Check GOOGLE_PLACES_POIS
5. checkAllPOIs() — Check combined POI list
6. testAPIEndpoint() — Test Google Places API

---

## What Should Happen

### Normal Flow:
1. User opens app
2. GPS gets set (either from user enabling it, or defaults to Tokyo)
3. google-places-loader.js loads POIs within radius tiers (1km, 2km, 5km, 10km, 20km)
4. `google-places-pois-loaded` event fires with 20-30 POIs
5. Main app adds POIs to `window.GOOGLE_PLACES_POIS`
6. `renderMarkers()` gets POIs from `allPOIs()`
7. For each POI: creates feature with ol.Feature, adds to vectorSource
8. OpenLayers renders features with emoji markers on map

### Expected Console Output:
```
[GooglePlacesLoader] Loading nearby POIs from 35.6762, 139.6503
[GooglePlacesLoader] Fetching from API: 1000m
[GooglePlacesLoader] Loaded 25 POIs at 1000m
[GooglePlacesLoader] Rendering 25 markers from Google Places
[App] Google Places loaded: 25 POIs
[App] Added 25 new POIs | Total: 25
[renderMarkers] filtered(): 25
[renderMarkers] after visibleFilter: 25
[renderMarkers] toRender: 25
[renderMarkers] Sample POI #1: 〜Japanese Cafe〜 at (35.6789, 139.7012), cat=food, fromGoogle=✅
[renderMarkers] ✅ DONE: added 25 markers | total on map: 25
```

---

## Manual Testing

### Test 1: Create dummy POI
```javascript
window.GOOGLE_PLACES_POIS = [{
  id: 'test1',
  name: 'Test Shop',
  lat: 35.6762,
  lng: 139.6503,
  cat: 'food',
  fromGooglePlaces: true
}];
window.renderMarkers();
```
Should show a marker at Tokyo center.

### Test 2: Move map and reload
1. Click/drag map somewhere else
2. Click refresh button 🔄
3. Check console for new loads
4. Watch for "added X new POIs"

### Test 3: Enable GPS manually
```javascript
window.state.gpsEnabled = true;
window.state.gpsCurrentLat = 35.7000;
window.state.gpsCurrentLng = 139.7000;
await window.GooglePlacesLoader.loadNearbyPOIs(35.7000, 139.7000);
```

---

## Browser Console Tips

- Clear console: `console.clear()`
- Save logs: Right-click console → Save as...
- Search in logs: Ctrl+F in console
- Filter by [tag]: Type `[renderMarkers]` in filter box

---

## If Nothing Works

1. Check browser console for ANY red errors
2. Run full diagnostic: `window.GooglePlacesDebug.fullDiagnostic()`
3. Create test marker: `window.GooglePlacesDebug.createTestMarker()`
4. Check if test marker renders
5. Report what appears in console

---

**Last Updated:** 2026-04-29
