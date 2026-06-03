# 🧪 Giappone 2027 — End-to-End Testing Checklist

**Date:** May 15, 2026  
**Status:** Ready for Testing  
**Build:** v1.0 (Design System + Button Wiring + Wizard Integration)

---

## ✅ Pre-Flight Checks

Before starting tests:
- [ ] Clear browser cache (Cmd+Shift+Delete / Ctrl+Shift+Delete)
- [ ] Open DevTools Console (F12 or Cmd+Option+J)
- [ ] Check for console errors on load
- [ ] Verify app loads without "Impossibile caricare la mappa" error

---

## 🔴 Task #1: Button Wiring (Export & Share)

### Test 1.1: Empty Itinerary Modal (No POIs)
**Setup:** Fresh instance with 0 POIs in all 8 days  
**Steps:**
1. Click "Itinerario" tab (bottom nav)
2. Scroll down to "📤 Condividi con il Gruppo" section
3. Click "📤 Esporta su WhatsApp" button
4. **Expected:** Modal appears with:
   - Title: "Nessun itinerario da condividere"
   - Icon: 📭
   - Description explaining why sharing is blocked
   - Two CTA buttons: "Ho capito" + "➕ Aggiungi una tappa"
5. Click "Ho capito" → modal closes, stays on Itinerary
6. Click "📥 Condividi con il Gruppo" button
7. **Expected:** Same modal appears
8. Click "➕ Aggiungi una tappa" → modal closes, navigates to Map tab
9. **Verify console:** Look for logs:
   - `[ItineraryUnified] 📤 WhatsApp export clicked`
   - `[ItineraryUnified] ⚠️ Itinerary empty, showing modal`

**Pass Criteria:** ✅ Both buttons trigger modal correctly

---

### Test 1.2: Filled Itinerary Modal (With POIs)
**Setup:** Add 3+ POIs to different days via the wizard
**Steps:**
1. Go to Map tab, click on a POI to open detail sheet
2. Click "➕ Aggiungi all'Itinerario" button
3. Complete 3-step wizard (confirm → day/time → notes → finish)
4. Repeat for 2-3 more POIs
5. Go back to "Itinerario" tab
6. Click "📤 Esporta su WhatsApp"
7. **Expected:** Either:
   - WhatsApp export functionality works, or
   - Modal shows "Funzione export non disponibile" (if webhook not configured)
8. Click "👥 Condividi con Gruppo"
9. **Expected:** Share functionality triggers (may require group setup)
10. **Verify console:** Look for:
    - `[ItineraryUnified] ✅ share allowed: itinerary has POIs`
    - Total POI count > 0

**Pass Criteria:** ✅ Buttons behave differently based on itinerary state

---

## 🟢 Task #2: Design System (Comic Sans → Segoe UI)

### Test 2.1: Font Consistency
**Steps:**
1. Open DevTools → Elements tab
2. Inspect headings in itinerary modal (h2, h3 tags)
3. Check Style panel for `font-family`
4. **Expected:** Should show `'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif`
5. NOT: `Comic Sans MS`
6. Inspect buttons in sheets
7. Check chip elements in filters
8. **Verify files:**
   - `index.html` — no Comic Sans references
   - `js/group-panel.js` — no Comic Sans references
   - `y2k-override.css` — no Comic Sans references

**Pass Criteria:** ✅ 0 instances of Comic Sans in active code

---

### Test 2.2: Glassmorphism Effects
**Steps:**
1. Go to "Menu" tab → "Dettagli Gruppo" if in a group
2. **Expected:** Buttons and panels have:
   - Soft blur effect (backdrop-filter)
   - Transparent background with rgba colors
   - Rounded corners (8-12px)
   - Smooth hover effects
3. Go to Weather widget (bottom-left)
4. **Expected:** Glass card with:
   - `backdrop-filter: blur(20px)`
   - Semi-transparent background
   - Soft borders
5. Open any POI detail sheet
6. **Expected:** Sheet body has glassmorphic styling

**Pass Criteria:** ✅ Visual effects match warm-dark theme

---

## 🔵 Task #3: 3-Step Wizard Integration

### Test 3.1: Wizard Opening
**Setup:** App on Map tab  
**Steps:**
1. Click on any POI on the map
2. POI detail sheet opens
3. Scroll down to bottom
4. **Expected:** Button "➕ Aggiungi all'Itinerario" appears
5. Click the button
6. **Expected:** Sheet closes, wizard modal opens
7. **Verify console:** Look for:
   - `[WizardIntegration] ✅ POI detail detected`
   - `[WizardIntegration] Calling openAddToItineraryWizard`

**Pass Criteria:** ✅ Wizard opens from POI detail

---

### Test 3.2: Wizard Step 1 (Confirm POI)
**Setup:** Wizard open on Step 1  
**Steps:**
1. **Verify display:**
   - Progress bar at 33%
   - Text "Passo 1 di 3"
   - POI name, city, type displayed
   - Photo if available
2. Click "Continua → Scegli Giorno" button
3. **Expected:** Advances to Step 2
4. Click "Annulla" button
5. **Expected:** Wizard closes, returns to Map
6. **Verify console:** `[AddWizard] Step 1 → Step 2`

**Pass Criteria:** ✅ Navigation and UI correct

---

### Test 3.3: Wizard Step 2 (Day & Time)
**Setup:** Wizard on Step 2  
**Steps:**
1. **Verify display:**
   - Progress bar at 66%
   - Day dropdown showing all days
   - Time dropdown (08:00 → 22:00, 30-min intervals)
   - Smart suggestion box
2. Change day dropdown
3. **Expected:** Suggestion updates automatically
4. Change time dropdown manually
5. **Expected:** Value persists
6. Click "← Indietro"
7. **Expected:** Returns to Step 1
8. Click "Continua →"
9. **Expected:** Advances to Step 3
10. **Verify console:** `[AddWizard] Updated day to X`

**Pass Criteria:** ✅ Day/time selection works, suggestions update

---

### Test 3.4: Wizard Step 3 (Notes)
**Setup:** Wizard on Step 3  
**Steps:**
1. **Verify display:**
   - Progress bar at 100%
   - Summary shows: POI name, day, time
   - Notes textarea with placeholder
2. Type notes: "Senza glutine, allergie ai crostacei"
3. Click "← Indietro"
4. **Expected:** Returns to Step 2, notes preserved
5. Click "Continua →"
6. **Expected:** Returns to Step 3, notes still there
7. Click "✓ Aggiungi all'Itinerario"
8. **Expected:**
   - Wizard closes
   - Toast shows: "✅ {POI name} aggiunto al Day {N} alle {HH:MM}"
   - Itinerary view refreshes showing new POI
9. **Verify console:** `[AddWizard] ✅ POI added successfully`

**Pass Criteria:** ✅ Full wizard flow works, POI is added

---

### Test 3.5: Verify Added POI in Itinerary
**Setup:** After completing Test 3.4  
**Steps:**
1. Go to "Itinerario" tab
2. Find the day where POI was added
3. **Expected:** POI card shows:
   - Number (1, 2, 3, etc.)
   - POI name
   - Time (⏰ HH:MM)
   - Menu button (⋮)
4. Click the menu button
5. **Expected:** Options appear:
   - ⏰ Modifica orario
   - 📝 Modifica note
   - 📅 Sposta a giorno
   - ⭐ Valuta
   - ❌ Rimuovi
6. Click "📝 Modifica note"
7. **Expected:** Prompt shows notes from wizard
8. Click "❌ Rimuovi"
9. **Expected:** Confirmation dialog
10. Confirm removal
11. **Expected:** POI disappears, toast shows "✓ Rimosso"

**Pass Criteria:** ✅ POI management works correctly

---

## 🎯 Task #4: End-to-End Flow (Complete Journey)

### Test 4.1: Full User Journey
**Steps:**
1. **Setup Phase:**
   - App loads, you're on Map
   - Check tripProfile shows 8 days
   - Budget shows (€ total, € daily)

2. **Discovery Phase:**
   - Scroll/pan the map
   - Click "Filtri" tab
   - Select "Ristoranti" category
   - Verify POIs filter on map

3. **Selection Phase:**
   - Click a filtered POI on map
   - Detail sheet opens with name, photos, ratings
   - Scroll to find "➕ Aggiungi all'Itinerario"
   - Click it

4. **Wizard Phase:**
   - Step 1: Confirm POI (click Continua)
   - Step 2: Select Day 2, change time to 12:30
   - Step 3: Add note "Prenotare in anticipo"
   - Click "✓ Aggiungi all'Itinerario"

5. **Verification Phase:**
   - Toast appears: "✅ [POI] aggiunto al Day 2 alle 12:30"
   - Go to "Itinerario" tab
   - Expand Day 2
   - Verify POI appears with correct time and note

6. **Sharing Phase:**
   - Go to "Itinerario" tab
   - Scroll to "📤 Condividi con il Gruppo"
   - Click both export buttons
   - Verify correct behavior (empty vs. filled itinerary)

**Pass Criteria:** ✅ Complete flow works without errors

---

## 🔍 Console Validation

### Key Logs to Check
Search console for these patterns (F12 → Console, Ctrl+F):

- `[ItineraryUnified]` — Button wiring logs
- `[AddWizard]` — Wizard flow logs
- `[WizardIntegration]` — POI detail integration logs
- `✅` — Success indicators
- `❌` — Error indicators (should be 0)

**Pass Criteria:** ✅ No error messages, success logs present

---

## 📊 Summary Table

| Task | Feature | Status | Verified |
|------|---------|--------|----------|
| 1 | Empty itinerary modal | ✅ Code complete | ⬜ Needs testing |
| 1 | Export button wiring | ✅ Code complete | ⬜ Needs testing |
| 1 | Share button wiring | ✅ Code complete | ⬜ Needs testing |
| 2 | Comic Sans removal | ✅ Code complete | ⬜ Needs testing |
| 2 | Glassmorphism effects | ✅ Code complete | ⬜ Needs testing |
| 3 | Wizard Step 1 | ✅ Code complete | ⬜ Needs testing |
| 3 | Wizard Step 2 | ✅ Code complete | ⬜ Needs testing |
| 3 | Wizard Step 3 | ✅ Code complete | ⬜ Needs testing |
| 4 | Full journey test | ✅ Ready | ⬜ Needs testing |

---

## 🚀 How to Use This Checklist

1. **Before starting:** Refresh the app (Cmd+R or Ctrl+R)
2. **For each test:** Follow steps exactly
3. **Check boxes:** Click ☑️ to mark complete
4. **Document failures:** Note any console errors or unexpected behavior
5. **Final approval:** When all tests pass, app is ready for production

---

## 📝 Notes

- All code changes saved to repository
- No breaking changes introduced
- Font system is now consistent across all components
- Wizard fully integrated with event delegation architecture
- Event delegation prevents timing issues with dynamic content

---

**Last Updated:** May 15, 2026  
**Tested by:** _______________  
**Date Tested:** _______________
