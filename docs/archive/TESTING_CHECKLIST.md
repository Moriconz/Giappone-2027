# Testing Checklist — Giappone 2027 Itinerary

## Pre-Test Setup
- [ ] Open app in Firefox/Chrome (desktop) and test mobile view (360px viewport)
- [ ] Open DevTools Console
- [ ] Run: `TEST_HELPERS.enableDebugMode()` to enable verbose logging
- [ ] Run: `TEST_HELPERS.runSmokeTest()` to verify all basic functions

## Core Flow: Add POI to Itinerary

### Step 1: Click on Map POI
- [ ] Navigate to **Map** tab
- [ ] Click/tap on any POI marker
- [ ] **Expected:** Detail sheet opens with POI name, photo, location
- [ ] **Check mobile:** Text doesn't overflow, all details visible at 360px
- [ ] **Check:** Close button (✕) is tappable (44×44 min)

### Step 2: Open Wizard
- [ ] Click **"Aggiungi all'Itinerario"** button
- [ ] **Expected:** Wizard step 1/3 opens
- [ ] **Check:** Progress bar shows ~33% filled
- [ ] **Check:** Button text is readable, not cut off

### Step 3: Confirm POI (Step 1)
- [ ] Verify POI name, city, type are displayed
- [ ] Click **"Continua → Scegli Giorno"**
- [ ] **Expected:** Move to step 2/3

### Step 4: Choose Day & Time (Step 2)
- [ ] Dropdown shows all days (1-8)
- [ ] Default day is suggestion (day with fewest POIs)
- [ ] Time dropdown shows slots from 08:00 to 22:00
- [ ] Suggested time changes when day changes (✓)
- [ ] Click **"Continua →"**
- [ ] **Expected:** Move to step 3/3

### Step 5: Add Notes (Step 3)
- [ ] Textarea is visible and tappable
- [ ] Type a note (e.g., "senza glutine")
- [ ] Click **"✓ Aggiungi all'Itinerario"**
- [ ] **Expected:** Sheet closes, toast appears "✅ {POIName} aggiunto al Day X alle HH:MM"

### Step 6: View in Itinerary Tab
- [ ] Navigate to **Itinerary** tab
- [ ] **Expected:** Budget summary shows at top
- [ ] **Expected:** Day accordion shows the new POI
- [ ] **Expected:** POI card shows:
  - [ ] POI number circle with order
  - [ ] POI name (ellipsis if too long)
  - [ ] Menu button ⋮ (always visible, not hover-only)
  - [ ] Time badge ⏰ HH:MM
  - [ ] Duration badge ⏱️ XXm
  - [ ] Cost badge (if cost > 0)
  - [ ] Notes section (if notes exist)

---

## Edit POI

### Step 1: Open Menu
- [ ] Click ⋮ button on POI card
- [ ] **Expected:** Modal opens with title "✏️ Modifica: {POIName}"
- [ ] **Expected:** Shows all fields: time, duration, cost, notes, move buttons

### Step 2: Edit Fields
- [ ] Change time to **15:45**
  - [ ] Click **Save**
  - [ ] **Expected:** Toast "✓ Modifiche salvate"
  - [ ] POI time badge updates to 15:45
  
- [ ] Open menu again, change duration to **120**
  - [ ] Toast confirms
  - [ ] Duration badge updates
  
- [ ] Add/modify cost to **3000**
  - [ ] Cost badge appears/updates
  - [ ] Budget summary recalculates

### Step 3: Move to Different Day
- [ ] Open menu
- [ ] Click **"Day 2"** button in "Sposta a" grid
- [ ] **Expected:** POI moves to Day 2
- [ ] **Expected:** Day 1 count decreases, Day 2 count increases
- [ ] **Expected:** Budget per day updates

### Step 4: Delete POI
- [ ] Open menu
- [ ] Click **🗑️ Cancella**
- [ ] **Expected:** Confirm dialog appears
- [ ] Click OK
- [ ] **Expected:** POI removed from itinerary
- [ ] **Expected:** Toast "✓ POI rimosso"
- [ ] **Expected:** Budget recalculates

---

## Budget Validation

### Daily Budget
- [ ] Add multiple POIs to same day
- [ ] Check day header shows badge **¥TOTAL_DAY**
- [ ] Budget summary shows breakdown:
  - [ ] Pianificato (trip budget)
  - [ ] Speso (actual spent)
  - [ ] Rimasto (remaining)
  - [ ] Progress bar fills proportionally
  - [ ] Shows "XX% allocato"

### Breakdown
- [ ] Check budget summary shows:
  - [ ] 🏪 POI & Ticket: sum of all POI costs + ticket costs
  - [ ] 🚌 Trasporti: estimated transport cost between tappe

---

## Routing Calculation

### Route Between POIs
- [ ] Add 2+ POIs in same day
- [ ] Wait 2-3 seconds for background routing
- [ ] **Expected:** POI card shows route badge with:
  - [ ] 📍 distance (X.Xkm)
  - [ ] ⏱️ duration (XXmin)
  - [ ] Modal icon (🚶 walking / 🚌 transit / 🚗 driving)
- [ ] Distance should be realistic for Japan (e.g., between Tokyo and Yokohama ~28km)

---

## Validation & Error Messages

### Time Validation
- [ ] Try to edit POI time to "25:00"
- [ ] **Expected:** Toast "⚠️ Ore devono essere tra 00 e 23"

### Duration Validation
- [ ] Try to set duration to "-10"
- [ ] **Expected:** Toast "⚠️ Durata minima: 1 minuto"

### Cost Validation
- [ ] Try to set cost to "1000000"
- [ ] **Expected:** Toast "⚠️ Costo sembra troppo alto (> ¥500k)"

### Duplicate POI
- [ ] Add same POI twice to same day in wizard
- [ ] **Expected:** Toast "⚠️ Questo luogo è già stato aggiunto a questo giorno"
- [ ] Wizard closes without adding

---

## Mobile-Specific Tests (360px viewport)

- [ ] **Accordion toggle:** Tap day header, accordion opens/closes without lag
- [ ] **Menu button:** ⋮ button always visible (not hover-only)
- [ ] **Tap targets:** All buttons ≥44×44px (ⓘ use DevTools device emulation)
- [ ] **Text overflow:** No truncated text on POI names, no broken layout
- [ ] **Scrolling:** Smooth scroll in itinerary list (no jank)
- [ ] **Budget badges:** Don't wrap awkwardly, readable on narrow screen
- [ ] **Drag-drop:** Not available on touch (use menu to move instead) ✓

---

## Performance Tests

### Low-End Device Simulation
1. Open DevTools → **Performance** tab
2. Simulate slow CPU: **6x slowdown**
3. Open Itinerary tab, watch frame rate
- [ ] Should stay ~30-60 FPS
- [ ] No visible lag when toggling accordion
- [ ] Scroll is smooth (no 3+ frame drops)

### Battery Saver Mode
1. Open DevTools → **Rendering** settings
2. Check **"Emulate CSS media feature prefers-reduced-motion"**
3. Open Itinerary
- [ ] Visual effects (backdrop-filter, box-shadow) are reduced
- [ ] Button animations don't play
- [ ] Text is still readable

---

## State Persistence

- [ ] Add 3-4 POIs across different days
- [ ] Close and reopen browser tab
- [ ] **Expected:** All POIs still there, budget intact
- [ ] (Check localStorage: run `localStorage.getItem('state')` in console)

---

## Smoke Test Output

Run in DevTools console:
```javascript
TEST_HELPERS.runSmokeTest()
```

**Expected output:**
```
═══════════════════════════════════════════════════════════
🧪 SMOKE TEST SUITE
═══════════════════════════════════════════════════════════

✅ Itinerary has X POIs
✅ Total budget: ¥XXXX
✅ POI cost: ¥XXXX
✅ Transport cost: ¥XXXX
✅ Valid time 14:30 accepted
✅ Invalid time 25:00 rejected
✅ Valid duration 60 min accepted
✅ Invalid duration -10 rejected
✅ Valid cost ¥5000 accepted
✅ Invalid cost -100 rejected
✅ Tokyo-Yokohama distance: 27.8km (expected ~28km)
✅ Short distance (1km) suggests walking
✅ Long distance (100km) suggests driving
✅ State persisted to localStorage
✅ State contains tripProfile

═══════════════════════════════════════════════════════════
✅ SMOKE TEST COMPLETE
═══════════════════════════════════════════════════════════
```

---

## Sign-Off

- [ ] All checks pass
- [ ] No console errors (except expected warnings)
- [ ] Ready for release ✓

**Date:** ____________  
**Tester:** ____________  
**Browser/Device:** ____________
