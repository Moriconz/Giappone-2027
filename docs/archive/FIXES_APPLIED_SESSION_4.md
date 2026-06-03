# Giappone 2027 — Fixes Applied (Session 4)

## Summary
Fixed critical map rendering issue and implemented GPS-based filtering for GF places, vintage shopping, and map markers.

---

## ✅ FIXES COMPLETED

### 1. **Map Rendering Fix — `window.map` Exposure** ⭐ CRITICAL
**Issue:** Markers were added to vectorSource but not visible on the map. Google Places Loader couldn't access the map.

**Root Cause:** The OpenLayers map was created as a local `const` variable but not exposed to `window.map`, so:
- google-places-loader.js couldn't attach the moveend event listener
- Map movements didn't trigger new POI loads
- Refresh button didn't work

**Solution:**
- Added `window.map = map;` after map initialization (line 821)
- Now google-places-loader.js can access window.map properly
- moveend listener now fires correctly

**Changes Made:**
- `index.html` lines 820-822: Exposed map to window

**Files Modified:**
- `index.html` — Exposed map object

---

### 2. **Tab GF — GPS-Based Filtering (50km) with Find Me Gluten Free Fallback** ✅
**Issue:** GF restaurants were shown without any distance filter. No fallback to Find Me Gluten Free if no results.

**Solution:**
- Added `lat` and `lng` coordinates to all 10 GF_RESTAURANTS hardcoded entries
- Modified `renderGFList()` to filter hardcoded restaurants by 50km GPS radius
- Shows distance for each restaurant when GPS available
- If no restaurants found within 50km, displays prominent "Cerca su Find Me Gluten Free" button
- Shows user-friendly message: "Nessun ristorante gluten-free trovato entro 50km dalla tua posizione"

**Changes Made:**
- Lines 4696-4707: Added `lat` and `lng` to GF_RESTAURANTS (Tokyo, Kyoto, Osaka, Nara, Sapporo, Kanazawa, Beppu)
- Lines 4751-4768: New filtering logic with 50km radius check
- Line 4774: Distance calculation and display
- Lines 4768-4772: Improved "no results" messaging with Find Me GF link

**Coordinates Added:**
- Tokyo Roppongi: 35.6642, 139.7322
- Tokyo Akihabara: 35.6995, 139.7725
- Tokyo Station: 35.6809, 139.7673
- Kyoto: 35.0116, 135.7681
- Kyoto Kawaramachi: 35.0035, 135.7654
- Osaka Namba: 34.6669, 135.5016
- Nara: 34.6854, 135.8048
- Sapporo: 43.0642, 141.3469
- Kanazawa: 36.5628, 136.6564
- Beppu: 33.2843, 131.4945

**Files Modified:**
- `index.html` — GF_RESTAURANTS + renderGFList()

---

### 3. **Vintage & Second-Hand Shops — Expanded to 50km** ✅
**Issue:** Vintage/thrift shops were limited to 20km like regular shops.

**Solution:**
- Separated filtering logic for regular shops vs. vintage/thrift
- Regular shops: 20km radius
- Vintage/thrift shops: 50km radius
- Both sorted by distance
- Updated all messaging to reflect new radius

**Changes Made:**
- Lines 4255-4287: New filtering with separate REGULAR_MAX_KM (20) and VINTAGE_MAX_KM (50)
- Separate arrays: `regularPOIs` and `vintagePOIs`
- Both sorted independently by distance
- Console logs show count for each type
- Updated error messages to reflect 50km for vintage

**Files Modified:**
- `index.html` — renderShoppingView() filtering logic

---

### 4. **Map Markers — Expanded Radius to 50km** ✅
**Issue:** Map only loaded POIs within 20km even though user wanted 50km.

**Solution:**
- Extended RADIUS_TIERS to include 50km tier
- Progressive loading: 1km → 2km → 5km → 10km → 20km → 50km
- Same moveend listener now triggers for larger area
- 300m threshold still applies for map movements

**Changes Made:**
- `js/google-places-loader.js` line 11: Added 50000 to RADIUS_TIERS

**Before:** [1000, 2000, 5000, 10000, 20000]
**After:** [1000, 2000, 5000, 10000, 20000, 50000]

**Files Modified:**
- `js/google-places-loader.js` — RADIUS_TIERS configuration

---

## 🔍 VERIFICATION CHECKLIST

### Tab GF:
- [ ] Hard refresh browser (Ctrl+Shift+R)
- [ ] Click "🌾 Gluten Free" tab
- [ ] Verify hardcoded restaurants appear with their city/area
- [ ] Check that distance shows (e.g., "5.2 km") for each restaurant
- [ ] Test "Cerca su Find Me GF" button appears if no restaurants found
- [ ] Test filtering by city — should show only restaurants in that city within 50km
- [ ] Test search — should find restaurants by name

### Tab Shopping:
- [ ] Hard refresh browser
- [ ] Click "🛍️ Shopping" tab
- [ ] Regular shops show within 20km radius
- [ ] Vintage/thrift shops show within 50km radius  
- [ ] Both tabs show distance and rating
- [ ] Search works for both regular and vintage

### Map Markers:
- [ ] Hard refresh browser
- [ ] Open map
- [ ] Verify markers appear (should see 26+ shops from Tokyo area)
- [ ] Drag map >300 meters
- [ ] Watch console for "Map moved X meters, loading POIs"
- [ ] Verify new markers appear when moving far enough
- [ ] Click refresh button (🔄) to manually reload current area
- [ ] Zoom out to see the full 50km radius of markers

---

## 🧪 Testing Scenarios

### Scenario 1: GF Restaurant Discovery
1. Go to Tab GF
2. See hardcoded restaurants within 50km of Tokyo (3 restaurants)
3. Filter by "Kyoto" — should see 2 restaurants
4. Search for "CHASEN" — should find 1 result
5. Click restaurant → opens detail with FMGF link

### Scenario 2: Vintage Expansion
1. Go to Tab Shopping
2. Check "Vintage & Second-Hand" tab
3. Should show more results now (up to 50km vs 20km)
4. Verify distance shown for each (some may be 30+ km away)
5. Regular shops tab still limited to 20km

### Scenario 3: Map Exploration
1. Open map with GPS enabled at Tokyo
2. Should see 50+ markers (from 50km radius)
3. Move map east/west/north/south
4. New markers appear as you move (every ~300m)
5. Drag far away (1km+) and new POIs load
6. Click refresh button to reload current area

---

## 📋 Known Limitations

1. **GF Restaurant Coordinates** 
   - Coordinates are approximate city centers (not exact addresses)
   - For production: retrieve exact coordinates from Google Places API
   - Users can verify exact location via "Apri in Maps" button

2. **Vintage Type Detection**
   - Google Places types detected: 'antique_shop', 'thrift_store'
   - Some vintage shops may be miscategorized as regular shopping
   - Can expand VINTAGE_TYPES array if needed

3. **GPS Requirement**
   - Features require GPS to be enabled (or hardcoded window.state GPS)
   - If GPS disabled, shows message "Abilita il GPS"
   - Find Me GF links available as fallback

---

## 🚀 Deployment Instructions

**Files to Deploy:**
1. `index.html` — All changes (GF filtering, shopping categories, window.map)
2. `js/google-places-loader.js` — Expanded radius tiers

**Browser Cache:**
- Users need hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Service worker will update automatically

**Testing Steps:**
1. Hard refresh on all browsers
2. Test each tab (GF, Shopping, Map)
3. Verify distances show correctly
4. Check filtering works (by city, by search)
5. Test map movements trigger new loads

---

## 🔗 Technical Details

### GF Filtering Logic
```javascript
// Filter for 50km from GPS
const hardcodedFiltered = GF_RESTAURANTS.filter(r => {
  if (!state.gpsCurrentLat) return true; // Show all if no GPS
  if (r.lat && r.lng) {
    const dist = haversineKm(state.gpsCurrentLat, state.gpsCurrentLng, r.lat, r.lng);
    return dist <= MAX_GF_DISTANCE_KM; // 50km max
  }
  return true;
});
```

### Shopping Filtering Logic
```javascript
// Different max distances for different categories
const REGULAR_MAX_KM = 20;
const VINTAGE_MAX_KM = 50;

const regularPOIs = googlePOIs.filter(p => {
  // Skip vintage types
  if (VINTAGE_TYPES.some(t => p.types?.includes(t))) return false;
  const dist = haversineKm(...);
  return dist <= REGULAR_MAX_KM;
});

const vintagePOIs = googlePOIs.filter(p => {
  // Only vintage types
  if (!VINTAGE_TYPES.some(t => p.types?.includes(t))) return false;
  const dist = haversineKm(...);
  return dist <= VINTAGE_MAX_KM;
});
```

### Map Radius Tiers
```javascript
// Progressive loading up to 50km
const RADIUS_TIERS = [1000, 2000, 5000, 10000, 20000, 50000];
```

---

**Status:** ✅ Ready for Testing
**Last Updated:** 2026-04-29
**Session:** 4

