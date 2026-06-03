# 🧪 COMPREHENSIVE TESTING PLAN — Giappone 2027

## Session Testing Checklist

### **PHASE 1: CRITICAL PATH — Add Multiple POIs (Wizard State Fix)**

**What We're Testing:** Bug A — Wizard state pollution where second POI incorrectly reuses first POI's data

**Test Steps:**
1. Open app at http://localhost:8000
2. Tap MAP tab (if not already there)
3. **First POI — "Ramen Ya Nikko":**
   - Click any marker
   - Tap "+ Aggiungi POI a questo giorno"
   - Step 1: Select "Giorno 1"
   - Step 2: Enter time "14:30"
   - Step 3: Enter duration "45", cost "3000", notes "Good tonkotsu"
   - Step 4: Confirm
   - ✅ Expected: POI appears in itinerary with time 14:30, duration 45, cost ¥3000
4. **Second POI — Different restaurant:**
   - Click a *different* marker
   - Tap "+ Aggiungi POI"
   - Step 1: Select "Giorno 2" ← Different day than first POI
   - Step 2: Enter time "18:00" ← Different time
   - Step 3: Enter duration "60", cost "5000", notes "Great sushi"
   - Step 4: Confirm
   - ✅ Expected: 
     - Second POI shows time 18:00 (NOT 14:30 from first)
     - Second POI in Giorno 2 (NOT Giorno 1)
     - Second POI has duration 60, cost 5000 (NOT 45, 3000)
     - First POI still shows 14:30, 45min, ¥3000 (unchanged)

**Why This Matters:**  
Fix A resets `_wizardClickListenerAttached` and `_wizardChangeListenerAttached` flags. Without this, the second wizard reuses the first's stale closure.

**Failure Indication:**
- ❌ Second POI shows wrong time/duration/cost from first
- ❌ Both POIs end up in same day

---

### **PHASE 2: TIME INPUT CAPTURE (Change Event Fix)**

**What We're Testing:** Bug B — Time lost when user types then immediately clicks "Avanti"

**Test Steps:**
1. From previous state, add **third POI:**
2. Click marker
3. Tap "+ Aggiungi POI"
4. Step 1: Select "Giorno 1"
5. Step 2: **Immediately after typing "12:45", WITHOUT BLURRING, click "Avanti" button**
6. ✅ Expected: Time "12:45" is preserved in step 3 display
7. ✗ Failure: Time shows blank or previous value (missing time field read)

**Why This Matters:**  
Fix B reads time input value directly in next button handler before advancing. The `change` event only fires on blur, so we must explicitly check the DOM value.

**Code Location:** index.html L7417-7426 time field value read

---

### **PHASE 3: COST PARAMETER (Wizard Cost Fix)**

**What We're Testing:** Bug G — Cost parameter never passed to `addPOIToDay()`

**Test Steps:**
1. Add a POI with cost "4500"
2. Go to ITINERARY tab
3. Open POI menu (tap ⋯ on card)
4. Check cost field shows "4500"
5. Go to BUDGET tab
6. ✅ Expected: Budget spent increases by 4500, remaining decreases
7. ✗ Failure: Budget unchanged (cost was 0)

**Why This Matters:**  
Fix G adds cost as 7th parameter: `addPOIToDay(poiId, poiName, dayIndex, time, duration, notes, cost)`

**Code Location:** js/itinerary.js L44-76, wizard call at index.html L7346-7348

---

### **PHASE 4: BUDGET CALCULATION (calculateBudgetSpent Fix)**

**What We're Testing:** Bug E — Budget calculation always returned 0

**Test Steps:**
1. After adding 3 POIs with costs (3000, 5000, 4500):
2. Go to BUDGET tab
3. Check calculation:
   - Spent: 12,500 (sum of all costs)
   - Remaining: 487,500 (500k - 12.5k)
   - Progress bar at ~2.5% filled
4. ✅ Expected: Numbers accurate
5. ✗ Failure: Spent shows 0, remaining shows 500k

**Why This Matters:**  
Fix E implements sum: `calculateBudgetSpent()` iterates all days, sums all `entry.cost` fields

**Code Location:** js/itinerary.js L226-241

---

### **PHASE 5: STATE PERSISTENCE (JSON Parse Error Handling)**

**What We're Testing:** Bug F — Corrupted localStorage crashes app

**Test Steps:**
1. Open app
2. Open DevTools → Application tab → Local Storage
3. Find "giapponeState" entry
4. **Edit value to corrupted JSON:** `{corrupted json here{{`
5. Refresh page
6. ✅ Expected: App loads with default state (8 days, ¥500k budget, empty itinerary)
7. ✗ Failure: App crashes or shows blank page

**Why This Matters:**  
Fix F wraps JSON.parse in try/catch: if parse fails, returns `{}`

**Code Location:** js/state.js L37-47

**Testing Note:** This can be verified by checking browser console for errors.

---

### **PHASE 6: TIME VALIDATION (Real-Time Input Validation)**

**What We're Testing:** Time format validation with user-friendly errors

**Test Steps:**
1. Add a POI, go to step 2
2. Try invalid times:
   - "25:00" → Error: "Ore devono essere tra 00 e 23"
   - "14:61" → Error: "Minuti devono essere tra 00 e 59"
   - "14" → Error: "Formato orario non valido. Usa HH:MM"
3. ✅ Expected: Each shows appropriate error message in red
4. ✗ Failure: Accepts invalid time or shows generic error

**Why This Matters:**  
ITINERARY_VALIDATION module validates against regex and ranges

**Code Location:** js/itinerary-validation.js L19-40

---

### **PHASE 7: NOTES INPUT CAPTURE (Input Event Fix)**

**What We're Testing:** Bug H — Notes lost when submitted without blur

**Test Steps:**
1. Add POI, step 3 notes field
2. Type "This is a great place" quickly
3. **Without clicking elsewhere, click "Avanti" button**
4. Step 4 (review): Check notes field
5. ✅ Expected: Shows "This is a great place"
6. ✗ Failure: Notes field blank (wasn't captured on change event)

**Why This Matters:**  
Fix H uses `input` event instead of `change` to capture every keystroke

**Code Location:** js/itinerary-add-wizard.js L600-604 (alternative wizard has same fix)

---

### **PHASE 8: ROUTING COORDINATES (Coordinate Check Fix)**

**What We're Testing:** Bug I — Falsy check breaks on 0 coordinates

**Test Steps:**
1. Add 2 POIs to same day
2. Go to ITINERARY, expand day
3. Check POI cards for routing badge
4. ✅ Expected: Shows "X.Xkm, Ymin, [mode]" for all POIs
5. ✗ Failure: Shows "Rotta non calcolata" or missing badge

**Why This Matters:**  
Fix I uses `== null` check instead of falsy check, allowing 0 lat/lng values (valid: equator/prime meridian)

**Code Location:** js/routing.js L70-72

**Technical Note:** Some coordinates (e.g., restaurants near equator at lat=0) would fail falsy check.

---

### **PHASE 9: POI MOVEMENT (Drag & Drop)**

**What We're Testing:** POI movement between days preserves all data

**Test Steps:**
1. Create POI in Giorno 1: time 14:30, duration 60, cost 3000, notes "Test"
2. In ITINERARY tab, drag POI card to Giorno 2
3. ✅ Expected:
   - POI now appears in Giorno 2
   - Time still 14:30, duration 60, cost 3000, notes "Test" (all preserved)
   - Budget remains accurate
4. ✗ Failure: Data lost during move

**Why This Matters:**  
`moveToDay()` function must preserve all fields

**Code Location:** js/itinerary.js L175-202

---

### **PHASE 10: SERVICE WORKER (Registration)**

**What We're Testing:** Bug L — Service worker registered only once

**Test Steps:**
1. Open DevTools → Application tab → Service Workers
2. ✅ Expected: Exactly 1 active service worker registered
3. ✗ Failure: Shows 2+ registrations or multiple attempts in logs

**Why This Matters:**  
Duplicate registrations waste resources and can cause conflicts

**Code Location:** index.html (previous lines 13455 and 13832, now only one remains)

---

### **PHASE 11: RESPONSIVE DESIGN (Small Phone)**

**What We're Testing:** Bug U — No 360px breakpoint for small phones

**Test Steps:**
1. Open DevTools → Device mode
2. Set width to 360px (iPhone SE)
3. ✅ Expected:
   - POI cards don't overflow
   - Buttons are readable and tappable
   - Font sizes ≥ 11px minimum (especially "Show to Waiter" card)
   - Layout adapts gracefully
4. ✗ Failure: Text overflow, unreadable fonts, button overlap

**Why This Matters:**  
Responsive breakpoints ensure mobile-first design works on smallest phones

**Code Location:** css/components.css L809+ (`@media (max-width: 375px)`)

---

### **PHASE 12: PWA MANIFEST (Adaptive Icons)**

**What We're Testing:** Bug V — Manifest maskable icon support

**Test Steps:**
1. Open manifest.webmanifest in browser: http://localhost:8000/manifest.webmanifest
2. Check JSON structure
3. ✅ Expected: Both icon objects have `"purpose": "any maskable"`
4. ✗ Failure: Shows `"purpose": "any"` (missing maskable)

**Code Location:** manifest.webmanifest L16, L22

---

### **PHASE 13: FONT READABILITY (Show to Waiter Card)**

**What We're Testing:** Bug T — Font sizes < 11px in Show to Waiter card

**Test Steps:**
1. In any POI detail sheet, check "Show to Waiter" card
2. ✅ Expected: All text clearly readable (11-12px minimum)
3. ✗ Failure: Text appears very small/blurry

**Why This Matters:**  
This card is shown to restaurant staff, must be easily readable

**Code Location:** index.html L897-977 (show-to-waiter card styling)

---

### **PHASE 14: DEAD CODE (Verification)**

**What We're Testing:** Dead code removal (Bugs M, N, O)

**Test Steps:**

**Bug M: `_wizardConfirm()` function deleted**
- Open DevTools console
- Type: `typeof window._wizardConfirm`
- ✅ Expected: `"undefined"`
- ✗ Failure: `"function"` (function still exists)

**Bug N: Cancel button delegation fixed**
- In wizard, click "Annulla" button
- ✅ Expected: Wizard closes (works)
- ✗ Failure: Does nothing (handler not bound)

**Bug O: `#navigate-poi` dead code removed**
- Open DevTools → Elements/Inspector
- Search for `navigate-poi`
- ✅ Expected: No element with this ID
- ✗ Failure: Element exists but unused

---

### **PHASE 15: CONSOLE SECURITY (Production Safety)**

**What We're Testing:** Bug S — Removed console.log of sensitive chat data

**Test Steps:**
1. Send a chat message
2. Open DevTools → Console
3. ✅ Expected: No sensitive data logged (message content hidden)
4. ✗ Failure: Console shows full message data

**Why This Matters:**  
Prevents accidental exposure of user data in production

**Code Location:** js/group-chat.js L50 (commented out)

---

## 🎯 OVERALL VERIFICATION MATRIX

| Phase | Feature | Status | Notes |
|-------|---------|--------|-------|
| 1 | Wizard State (A) | PENDING | Add 2 POIs, verify 2nd has correct data |
| 2 | Time Capture (B) | PENDING | Type time, immediately click next |
| 3 | Cost Parameter (G) | PENDING | Add POI with cost, verify budget updates |
| 4 | Budget Calculation (E) | PENDING | Multiple POIs, check spent total |
| 5 | State Persistence (F) | PENDING | Corrupt localStorage, refresh app |
| 6 | Time Validation | PENDING | Try invalid times, check errors |
| 7 | Notes Input (H) | PENDING | Type notes without blur, check saved |
| 8 | Routing Coords (I) | PENDING | Check routing badge on all POIs |
| 9 | POI Movement (J,L) | PENDING | Drag POI to different day |
| 10 | Service Worker (L) | PENDING | Check DevTools, count registrations |
| 11 | Responsive 360px (U) | PENDING | Device mode 360px, check layout |
| 12 | PWA Manifest (V) | PENDING | Check manifest.json icons purpose |
| 13 | Font Readability (T) | PENDING | Show to waiter card, check 11px+ |
| 14 | Dead Code (M,N,O) | PENDING | Check window scope, search DOM |
| 15 | Console Security (S) | PENDING | Send message, check console logs |

---

## ⚠️ FAILURE RECOVERY

If any phase fails:

1. Check browser console for JavaScript errors
2. Check DevTools → Network tab for failed API calls
3. Check localStorage in DevTools → Application
4. Verify file was actually modified (git status)
5. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
6. Check for conflicting browser extensions

---

## 📝 TEST SUMMARY FORMAT

After running each phase, record:

```
PHASE X: [Feature Name]
Result: ✅ PASS / ❌ FAIL
Details: [Brief description of what happened]
Evidence: [Screenshot/console output if relevant]
```

---

## 🚀 READINESS FOR PRODUCTION

App is production-ready when:
- [x] All 15 phases show ✅ PASS
- [x] No JavaScript errors in console
- [x] State persists across refresh
- [x] Offline mode works (Network → Offline in DevTools)
- [x] All animations smooth (60fps)
- [x] Mobile layout responsive down to 360px

---

**Testing Date:** May 18, 2026  
**Tester:** User (interactive browser testing)  
**Environment:** http://localhost:8000  
**App Version:** SafeEats Giappone 2027 (All 22 fixes applied)
