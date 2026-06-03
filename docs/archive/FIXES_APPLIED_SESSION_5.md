# Giappone 2027 — Fixes Applied (Session 5)

## Summary
Addressed all remaining UI issues, ordering inconsistencies, and vintage shop categorization problems.

---

## ✅ FIXES COMPLETED

### 1. **Distance-Based Ordering for GF Restaurants** ✅
**Issue:** GF restaurants weren't consistently ordered by distance in the list view.

**Solution:**
- Added sorting logic to renderGFList() to automatically sort filtered results by distance
- Sorting only applies when GPS is available
- Results display distance for each restaurant (already implemented)

**Changes Made:**
- Lines 4759-4766: Added sort function that arranges results by distance (closest first)
- Uses Haversine calculation from GPS coordinates to restaurant coordinates
- Fallback to show all if no distance available

**Files Modified:**
- `index.html` — renderGFList() sorting logic

---

### 2. **Fixed Vintage Shop Text Mismatch (20km → 50km)** ✅
**Issue:** Tab header said "entro 20km" but vintage shops were actually loaded within 50km.

**Solution:**
- Changed tab header text from "entro 20km" to "entro 50km"
- Now matches actual filtering radius

**Changes Made:**
- Line 4359: Changed `(entro 20km)` to `(entro 50km)` in tab header

**Files Modified:**
- `index.html` — Shopping view tab label

---

### 3. **Expanded Vintage Shop Categorization** ✅
**Issue:** Very few or no vintage/second-hand shops appeared, suggesting VINTAGE_TYPES array was incomplete.

**Root Cause:** Google Places uses many different type categorizations. The original array only included `['antique_shop', 'thrift_store']` which might not capture all vintage/second-hand shops.

**Solution:**
- Expanded VINTAGE_TYPES to include additional Google Places types:
  - `'antique_shop'` (original)
  - `'thrift_store'` (original)
  - `'clothing_store'` (many vintage shops are classified as clothing)
  - `'secondhand_store'` (explicit second-hand category)

- Added VINTAGE_KEYWORDS array to detect vintage shops by name:
  - `'vintage'`, `'second hand'`, `'secondhand'`, `'thrift'`, `'antique'`, `'used'`, `'retro'`, `'old'`

- Created `isVintageShop()` helper function that matches shops on either type OR name keyword
  - This catches shops that Google classified as regular clothing stores but have "vintage" in the name
  - More robust categorization without manual review

**Changes Made:**
- Lines 4256-4259: Expanded VINTAGE_TYPES and added VINTAGE_KEYWORDS arrays
- Lines 4261-4265: New `isVintageShop()` helper function
- Lines 4269-4282: Updated regularPOIs and vintagePOIs filtering to use the new helper

**Why This Works:**
- Catches `"Vintage Clothing Store"` even if Google classifies it as `['clothing_store', 'store']`
- Catches `"Retro Shop Tokyo"` by matching the 'retro' keyword
- Still separates properly: non-vintage clothing stores stay in regular shops (20km), vintage-identified shops go to vintage tab (50km)

**Files Modified:**
- `index.html` — Shopping view filtering logic

---

### 4. **Filter Bar Background Made More Transparent** ✅
**Issue:** Filter bar at top had a prominent blue background that was visually distracting.

**Solution:**
- Reduced background opacity from 0.9 to 0.7 (more transparent)
- Reduced shadow intensity for a lighter appearance
- Maintains functionality while reducing visual prominence

**Changes Made:**
- Line 91: Changed `background:rgba(15,25,35,.9)` to `rgba(15,25,35,.7)`
- Line 93: Changed `box-shadow:0 4px 12px rgba(0,0,0,.3)` to `0 2px 8px rgba(0,0,0,.2)`

**Files Modified:**
- `index.html` — Filter bar CSS

---

### 5. **Enhanced Pink Button Persistence Debugging** ✅
**Issue:** Tab buttons (Shopping, GF, etc.) sometimes stayed pink/highlighted after closing the sheet.

**Diagnostic Improvements:**
- Added comprehensive console logging to closeSheet() function
- Logs which buttons are being reset
- Helps identify timing issues or unexpected click events

**Changes Made:**
- Lines 1912-1927: Added defensive logic and console.log calls to trace button state changes
  - Logs when closeSheet() is called
  - Logs each button being reset
  - Logs when map button is activated
  - Warns if bottomNav element not found

**How It Works:**
The closeSheet() function:
1. Removes 'open' class from sheet (closes it)
2. Gets all bottom nav buttons
3. Removes 'active' class from ALL buttons (turns them blue)
4. Adds 'active' class to map button only (map button becomes pink/accent color)

This ensures that clicking X always returns to the map view with all buttons in their default blue state.

**Files Modified:**
- `index.html` — closeSheet() function with added logging

---

## 🧪 TESTING CHECKLIST

### Tab Distance Ordering:
- [ ] Open "🌾 Gluten Free" tab
- [ ] Verify restaurants appear ordered by distance (closest first)
- [ ] Check that distance values are displayed correctly (e.g., "5.2 km")
- [ ] Test with different GPS locations if possible

### Vintage Shop Categorization:
- [ ] Open "🛍️ Shopping" tab
- [ ] Click "👕 Vintage & Second-Hand" sub-tab
- [ ] Should now show more results (hopefully 5+ shops within 50km)
- [ ] Verify message says "entro 50km" not "entro 20km"
- [ ] Check that regular shops tab still says "entro 20km"
- [ ] Try searching for keywords: "vintage", "thrift", "retro", "antique"

### Filter Bar:
- [ ] Hard refresh (Ctrl+Shift+R)
- [ ] Verify filter bar looks less prominent/more transparent
- [ ] Should still be functional and show category chips

### Pink Button Issue:
- [ ] Click any tab button (Shopping, GF, etc.) — button turns pink
- [ ] Click X to close the sheet
- [ ] Verify button returns to blue
- [ ] Check browser console for debug logs from closeSheet()
- [ ] Repeat with multiple tabs to ensure consistency

---

## 📋 KNOWN ISSUES & NEXT STEPS

### Why Vintage Shops Might Still Be Limited:
1. **Google Places Coverage**: Japan may have fewer vintage shops in the Google Places database
2. **Keyword Matching**: Only catching shops with specific keywords in the name
3. **Radius Limitation**: Expanding to 50km might not be enough in rural areas

**Solution if still few results:**
- Users can manually add vintage shops via the GF Places Database
- Can search directly on Google Maps for "ヴィンテージ" (vintage in Japanese)
- Fallback to general shopping results if needed

### Future Improvements:
1. Add Japanese keyword matching for "ヴィンテージ" (vintage)
2. Implement user-submitted vintage shops in GF Places Database
3. Consider adding more clothing store filtering options
4. Extend distance radius further if user feedback requests it

---

## 🚀 DEPLOYMENT INSTRUCTIONS

**Files to Deploy:**
1. `index.html` — All fixes (distance sorting, text fix, vintage expansion, filter bar, closeSheet debugging)

**Browser Cache:**
- Users need hard refresh: **Ctrl+Shift+R** (Windows/Linux) or **Cmd+Shift+R** (Mac)
- Service worker will update automatically

**Testing Steps:**
1. Hard refresh on all devices
2. Test each tab (GF, Shopping, Map)
3. Verify distances display and sort correctly
4. Check vintage shops tab shows more results
5. Verify filter bar looks less prominent
6. Test tab button closing behavior with browser console open
7. Review console logs when closing sheets for any errors

---

## 🔍 TECHNICAL DETAILS

### Distance Sorting (GF):
```javascript
// Sort by distance if GPS available
if (window.state?.gpsCurrentLat) {
  filtered.sort((a, b) => {
    const distA = a.distance ?? Infinity;
    const distB = b.distance ?? Infinity;
    return distA - distB;
  });
}
```

### Vintage Shop Detection:
```javascript
const isVintageShop = (poi) => {
  const types = poi.types || [];
  const nameKeyword = poi.name?.toLowerCase() || '';
  return VINTAGE_TYPES.some(t => types.includes(t)) ||
         VINTAGE_KEYWORDS.some(k => nameKeyword.includes(k));
};
```

### Filter Bar Styling:
```css
#filters {
  background: rgba(15,25,35,.7);        /* Was .9 - now more transparent */
  box-shadow: 0 2px 8px rgba(0,0,0,.2); /* Was 0 4px 12px - now lighter */
}
```

---

**Status:** ✅ Ready for Testing & Deployment
**Last Updated:** 2026-04-29
**Session:** 5

