# 🧪 COMPLETE TESTING CHECKLIST — All 11 Features + 15 Bug Fixes

## 📋 QUICK OVERVIEW

**Total Tests:** 30 (15 bug fixes + 15 feature tests)
**Environment:** http://localhost:8000
**Duration:** ~45-60 minutes total

---

## 🐛 SECTION A: BUG FIXES (15 tests)

### PHASE 1: Wizard State Pollution (Bug A)
**Test:** Add 2 different POIs to different days with different data
- ✓ Add POI 1 to Day 1: time 14:30, duration 45, cost 3000
- ✓ Add POI 2 to Day 2: time 18:00, duration 60, cost 5000
- **Expected:** POI 2 shows correct data (18:00, 60, 5000), NOT POI 1's data
- **Evidence:** Check itinerary, second POI correct

---

### PHASE 2: Time Input Capture (Bug B)
**Test:** Type time without blurring, immediately click Avanti
- ✓ Add POI, step 2
- ✓ Type "12:45" in time field
- ✓ **Immediately** click Avanti WITHOUT clicking elsewhere
- **Expected:** Time preserved as 12:45 in step 3 display
- **Evidence:** Review step shows 12:45

---

### PHASE 3: Cost Parameter (Bug G)
**Test:** Verify cost is passed and stored
- ✓ Add POI with cost "4500"
- ✓ Go to ITINERARY tab
- ✓ Open POI menu (tap ⋯ on card)
- **Expected:** Cost field shows "4500"
- **Evidence:** POI detail shows correct cost

---

### PHASE 4: Budget Calculation (Bug E)
**Test:** Budget spent calculation
- ✓ Add 3 POIs: costs 3000, 5000, 4500
- ✓ Go to BUDGET tab
- **Expected:** 
  - Spent: ¥12,500 (sum of costs)
  - Remaining: ¥487,500 (500k - 12.5k)
  - Progress bar ~2.5% filled
- **Evidence:** Budget tab shows correct numbers

---

### PHASE 5: State Persistence (Bug F)
**Test:** Corrupted localStorage recovery
- ✓ Open DevTools → Application → Local Storage
- ✓ Find "giapponeState" and corrupt value to: `{bad json{{`
- ✓ Refresh page
- **Expected:** App loads with default empty state (no crash)
- **Evidence:** Page loads, console shows parse error warning, app usable

---

### PHASE 6: Time Validation (Validation Module)
**Test:** Invalid time formats rejected
- ✓ Add POI, step 2
- ✓ Try "25:00" → **Expect error:** "Ore devono essere tra 00 e 23"
- ✓ Try "14:61" → **Expect error:** "Minuti devono essere tra 00 e 59"
- ✓ Try "14" → **Expect error:** "Formato orario non valido"
- **Evidence:** Each shows appropriate error message

---

### PHASE 7: Notes Input Capture (Bug H)
**Test:** Notes captured without blur
- ✓ Add POI, step 3 notes field
- ✓ Type "This is a great place"
- ✓ **Without clicking elsewhere**, click Avanti
- ✓ Check step 4 review
- **Expected:** Notes field shows "This is a great place"
- **Evidence:** Review step displays notes

---

### PHASE 8: Routing Coordinates (Bug I)
**Test:** Coordinates with 0 values handled correctly
- ✓ Add 2 POIs to same day
- ✓ Go to ITINERARY, expand day
- **Expected:** All POI cards show routing badge with distance/time
- **Evidence:** Routing badge visible on all cards

---

### PHASE 9: POI Movement (Bug J - batchedSaveState)
**Test:** Drag POI preserves all data
- ✓ Create POI in Day 1: time 14:30, duration 60, cost 3000, notes "Test"
- ✓ In ITINERARY, drag POI to Day 2
- **Expected:** 
  - POI moves to Day 2
  - All data preserved (14:30, 60, 3000, "Test")
  - Budget still accurate
- **Evidence:** Day 2 shows complete POI with all fields

---

### PHASE 10: Service Worker (Bug L)
**Test:** Single registration
- ✓ Open DevTools → Application → Service Workers
- **Expected:** Exactly 1 active service worker
- **Evidence:** Service workers panel shows 1 entry

---

### PHASE 11: Responsive 360px (Bug U)
**Test:** Small phone layout
- ✓ DevTools → Device mode → 360px width
- **Expected:**
  - No overflow
  - Buttons readable and tappable
  - Font sizes ≥11px
  - Layout adapts gracefully
- **Evidence:** No visual overflow, all text readable

---

### PHASE 12: Font Readability (Bug T)
**Test:** Show to Waiter card fonts
- ✓ Open any POI detail
- ✓ Check "Show to Waiter" card
- **Expected:** All text clearly readable (11px+)
- **Evidence:** Text is legible, not tiny

---

### PHASE 13: PWA Manifest (Bug V)
**Test:** Maskable icon support
- ✓ Open http://localhost:8000/manifest.webmanifest
- **Expected:** Both icons have `"purpose": "any maskable"`
- **Evidence:** JSON shows correct purpose fields

---

### PHASE 14: Dead Code Verification (Bugs M, N, O)
**Test:** Dead code removed
- ✓ Console: `typeof window._wizardConfirm` → **expect: "undefined"**
- ✓ In wizard, click "Annulla" → **expect: closes**
- ✓ DevTools inspect, search "navigate-poi" → **expect: not found**
- **Evidence:** All three verified

---

### PHASE 15: Console Security (Bug S)
**Test:** No sensitive data in logs
- ✓ Send chat message
- ✓ Open DevTools → Console
- **Expected:** Message content NOT logged
- **Evidence:** No sensitive data visible in console

---

## ✨ SECTION B: NEW FEATURES (15 tests)

### FEATURE 1: Status Visitato (Visited Toggle)
**Test:** Mark POI as visited
- ✓ Add POI to itinerary
- ✓ In ITINERARY tab, find POI card
- **Expected:** Shows "✅ Segna visitato" button
- ✓ Click "Segna visitato"
- **Expected:**
  - Button changes to "✅ Visitato" badge (green, opacity 0.7)
  - POI name gets line-through decoration
  - Card slightly transparent (opacity 0.7)
  - Status persists on page refresh
- **Evidence:** Visited POI visually distinct from proposed

---

### FEATURE 2: Day Summary with Distance
**Test:** Day header shows km, hours, cost
- ✓ Add 3 POIs to Day 1:
  - POI 1: time 10:00, duration 30, cost 2000
  - POI 2: time 11:00, duration 45, cost 3000
  - POI 3: time 12:30, duration 60, cost 2500
- ✓ Go to ITINERARY tab, expand Day 1
- **Expected:** Day header badges show:
  - "⏱ 2.3h" (135 min total)
  - "¥7,500" (cost sum with thousand separator)
  - "🚶 X.Xkm" (distance from routing, if > 0)
  - POI count "3 tappe"
- **Evidence:** All badges visible and correct

---

### FEATURE 3: Auto-Sort by Time
**Test:** POIs auto-sort chronologically
- ✓ Add 3 POIs to Day 1 in random order:
  - POI A: 15:00
  - POI B: 11:00
  - POI C: 13:00
- ✓ Refresh page
- **Expected:** POIs reorder automatically to 11:00, 13:00, 15:00
- **Evidence:** POIs appear in chronological order on load

---

### FEATURE 4: Budget per Categoria
**Test:** Category selection and breakdown
- ✓ Add POI with wizard step 3
- **Expected:** Category dropdown visible with options:
  - 🍔 Cibo (default)
  - 🚌 Trasporti
  - 🎟️ Ingressi
  - 🛍️ Shopping
  - 📌 Altro
- ✓ Select "🍔 Cibo" and add POI
- ✓ Go to BUDGET tab
- **Expected:** Budget breakdown shows:
  - Cibo: ¥XXXX
  - Trasporti: ¥0
  - Ingressi: ¥0
  - Shopping: ¥0
  - Altro: ¥0
- **Evidence:** Category breakdown visible and correct

---

### FEATURE 5: Opening Hours Validation
**Test:** Warning for times outside business hours
- ✓ Add POI with known opening hours (e.g., 09:00–18:00)
- ✓ In step 2, select time "20:00" (after closing)
- **Expected:** Yellow warning banner shows:
  "⚠️ Questo luogo apre 09:00–18:00"
- ✓ Can still proceed (not blocking)
- **Evidence:** Warning appears and dismissible

---

### FEATURE 6: Weather Alerts
**Test:** Contextual weather warnings
- ✓ Go to FORECAST tab, check weather
- ✓ If rain forecast on any day with outdoor POIs (park, temple, garden, etc.)
- **Expected:** Orange banner at top of itinerary:
  "⛈️ Rain forecast on Day X - check outdoor POIs"
- ✓ Click ✕ to dismiss
- **Expected:** Banner hides and stays dismissed (sessionStorage)
- **Evidence:** Alert appears for rainy outdoor days

---

### FEATURE 7: Export HTML Stampabile (Printable)
**Test:** Export itinerary as HTML
- ✓ Go to ITINERARY tab
- ✓ Find "📄 Esporta (stampabile)" button in sharing section
- ✓ Click button
- **Expected:** New tab opens with HTML table:
  - H1: Trip title "Giappone 2027"
  - H2 per day: "Giorno 1", "Giorno 2", etc.
  - Table with columns: #, Luogo, Orario, Durata, Costo, Note
  - Summary section: Totale, Speso, Rimasto
  - Print-friendly styling (white bg, no modal)
- ✓ Ctrl/Cmd+P to print
- **Expected:** Page prints clearly
- **Evidence:** New tab shows formatted HTML table

---

### FEATURE 8: BroadcastChannel Sync (Collaboration)
**Test:** Real-time sync between tabs
- ✓ Open app in 2 browser tabs (same tab 1 and tab 2)
- ✓ In Tab 1: Add POI to Day 1
- **Expected:** In Tab 2, POI appears automatically (no refresh needed)
- ✓ In Tab 2: Change POI cost from 3000 to 4000
- **Expected:** In Tab 1, cost updates automatically
- ✓ In Tab 2: Delete POI
- **Expected:** In Tab 1, POI disappears automatically
- **Evidence:** Changes sync across tabs in real-time

---

### FEATURE 9: Export/Import Itinerary (Collaboration)
**Test:** Manual sync via JSON file
- ✓ Go to ITINERARY → Sharing section
- ✓ Click "⬇️ Esporta itinerario"
- **Expected:** JSON file downloads: `itinerario-[timestamp].json`
- ✓ Open file, verify JSON structure:
  ```json
  {
    "version": 1,
    "roomId": "...",
    "exportedBy": "...",
    "exportedAt": ...,
    "itineraryByDay": {...},
    "tripProfile": {...}
  }
  ```
- ✓ In new app instance: Click "⬆️ Importa itinerario"
- ✓ Select downloaded JSON file
- **Expected:** Itinerary merges with last-write-wins strategy
- **Evidence:** Exported/imported itinerary matches original

---

### FEATURE 10: Proposta POI al Gruppo (Collaboration)
**Test:** POI suggestion structure
- ✓ Open itinerary and check chat area
- **Expected:** Chat message structure supports POI proposals
- ✓ Verify message can include POI details
- **Evidence:** Chat system prepared for POI proposals

---

### FEATURE 11: Indicatore "Chi ha Aggiunto" (Collaboration)
**Test:** POI creator attribution
- ✓ Set group name in settings (e.g., "Alice")
- ✓ Add POI to itinerary
- ✓ Go to ITINERARY tab
- ✓ Look at POI card row 1
- **Expected:** Shows "da Alice" under POI name
- ✓ Go to GROUP tab, simulate another member adding POI
- **Expected:** Shows "da Bob" or other member name
- **Evidence:** All POIs show correct creator attribution

---

## 📊 MASTER CHECKLIST

| # | Category | Test | Status |
|---|----------|------|--------|
| 1 | Bug Fix | Wizard State (A) | [ ] |
| 2 | Bug Fix | Time Input (B) | [ ] |
| 3 | Bug Fix | Cost Parameter (G) | [ ] |
| 4 | Bug Fix | Budget Calc (E) | [ ] |
| 5 | Bug Fix | State Persist (F) | [ ] |
| 6 | Bug Fix | Time Validation | [ ] |
| 7 | Bug Fix | Notes Input (H) | [ ] |
| 8 | Bug Fix | Routing Coords (I) | [ ] |
| 9 | Bug Fix | POI Movement (J) | [ ] |
| 10 | Bug Fix | Service Worker (L) | [ ] |
| 11 | Bug Fix | Responsive 360px (U) | [ ] |
| 12 | Bug Fix | Font Read (T) | [ ] |
| 13 | Bug Fix | PWA Manifest (V) | [ ] |
| 14 | Bug Fix | Dead Code (M,N,O) | [ ] |
| 15 | Bug Fix | Console Security (S) | [ ] |
| 16 | Feature | Status Visitato | [ ] |
| 17 | Feature | Day Summary/Distance | [ ] |
| 18 | Feature | Auto-Sort by Time | [ ] |
| 19 | Feature | Budget Categoria | [ ] |
| 20 | Feature | Opening Hours Valid | [ ] |
| 21 | Feature | Weather Alerts | [ ] |
| 22 | Feature | Export HTML | [ ] |
| 23 | Feature | BroadcastChannel Sync | [ ] |
| 24 | Feature | Export/Import JSON | [ ] |
| 25 | Feature | POI Proposal | [ ] |
| 26 | Feature | Chi ha Aggiunto | [ ] |

---

## 🚀 TESTING PROCEDURE

### Recommended Order
1. **Start with bug fixes 1-7** (critical path — data integrity)
2. **Then bug fixes 8-15** (UX and PWA)
3. **Then features 16-26** (new functionality)
4. **Final: Full regression test** (add 2 POIs, edit, delete, export/import)

### For Each Test
```
PHASE X: [Test Name]
- ✓ Step 1: [Do this]
- ✓ Step 2: [Do this]
Expected: [What should happen]
Result: ✅ PASS / ❌ FAIL
Notes: [Any issues?]
```

---

## ⚠️ FAILURE RECOVERY

If test fails:
1. Check **browser console** for errors
2. Check **DevTools Network tab** for failed requests
3. **Hard refresh** (Ctrl+Shift+R / Cmd+Shift+R)
4. Check **localStorage** is not corrupted
5. Check **git diff** — verify changes applied
6. Restart dev server if needed

---

## ✅ PRODUCTION READINESS

App is production-ready when:
- [ ] All 26 tests show ✅ PASS
- [ ] No JavaScript errors in console
- [ ] localStorage persists across refresh
- [ ] Offline mode functional
- [ ] All animations smooth (60fps)
- [ ] Mobile responsive (360-1200px)
- [ ] No console warnings (except expected logs)

---

**Testing Environment:** http://localhost:8000  
**Version:** Giappone 2027 (11 features + 23 bug fixes)  
**Date:** May 18, 2026  
**Estimated Duration:** 45-60 minutes for complete testing
