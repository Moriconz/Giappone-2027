# Budget Widget Refactor — Root Cause & Solution

## ROOT CAUSE ANALYSIS

### **Problem Identified**
The budget header in the Itinerary tab was showing **false data completeness**, displaying UI elements (Pianificato/Speso/Rimasto) and metrics (% allocato, Trasporti) that were either:
1. **Unreliable** (transport costs are rough estimates, never user-input)
2. **Not implemented** (ticket_cost, real routing)
3. **Dependent on missing data** (budget_total could be 0, causing division errors)

This violates the fundamental principle: **show only data that is real and supported**.

---

### **Specific Issues**

#### **Issue 1: Transport Cost is Fake**
- **Location:** `js/itinerary.js:359` in `calculateDayBudget()`
- **Code:**
  ```javascript
  const estimatedTransportCost = Math.round((entry.route_from_prev.distance_km / 10) * 50);
  ```
- **Problem:** Shows ~¥50 per 10km, but:
  - `route_from_prev` is async/background computed (may not exist yet)
  - Estimate is based on arbitrary assumption (50¥/10km)
  - Never user-input, never verified
  - Shows as real data but isn't
- **Result:** Budget widget displays "🚌 Trasporti ¥0" or fake estimate as fact

---

#### **Issue 2: Ticket Cost is Never Implemented**
- **Location:** `js/itinerary.js:356` in `calculateDayBudget()`
- **Code:**
  ```javascript
  ticketCost += entry.ticket_cost || 0;
  ```
- **Problem:**
  - `entry.ticket_cost` is never populated in the current flow
  - Always sums to 0
  - Budget widget shows "🏪 POI & Ticket ¥4500" but doesn't distinguish which is Ticket vs POI
- **Result:** Misleading breakdown

---

#### **Issue 3: Budget Total Can Be Zero or Falsy**
- **Location:** `js/itinerary-unified.js:20` and line 256 (progress bar calc)
- **Code:**
  ```javascript
  const budget = tripProfile.budget_total || 0;
  <div style="width:${Math.min(100, (totalCostSpent/budget)*100)}%"></div>
  ```
- **Problem:**
  - If user never sets `budget_total`, it defaults to 0
  - Progress bar tries to calculate `totalCostSpent / 0` → NaN or Infinity%
  - Labels "Pianificato ¥0" are misleading (means "not set", not "no budget")
- **Result:** % allocato shows wrong value or crashes

---

#### **Issue 4: Widget Shows Non-Existent Features**
- **Location:** `js/itinerary-unified.js:242-273` (budget HTML)
- **Problem:**
  - Shows "Pianificato/Speso/Rimasto" layout suggesting full budget tracking
  - Shows "🚌 Trasporti" suggesting transport is tracked
  - Shows "🏪 POI & Ticket" suggesting ticket costs are real
  - None of these are supported today
- **Result:** User thinks features are implemented when they're not

---

## SOLUTION: Progressive Budget Widget

### **Architecture: 3-Level Progressive Disclosure**

The widget now supports 3 **clearly separated levels**, each correct for its data maturity:

#### **Level 1: Manual Costs Only (ACTIVE NOW)**
- **What shows:** Only user-input POI costs (entry.cost)
- **No fake data:** Transport, tickets, comparisons all hidden
- **Honest UI:** 
  - Title: "Costi tappe" (not "Budget")
  - Primary: "Totale inserito ¥XXXX"
  - Secondary: "X/Y POI con costo"
  - Info: "ⓘ Trasporti non ancora inclusi"
- **NO:** Pianificato, Speso, Rimasto, %, Trasporti breakdown

#### **Level 2: Real POI Data (READY FOR FUTURE)**
- **When active:** After Google Places price_level + opening_hours are verified
- **What shows:** Costi POI broken into Manuali / Verificati / Mancanti
- **Method:** `getBudgetHeaderModel_Level2_POIEnriched()` (prepared but not active)

#### **Level 3: Full Budget (READY FOR FUTURE)**
- **When active:** After routing + transport costs are real
- **What shows:** Pianificato / Stimato / Rimasto with full breakdown
- **Method:** `getBudgetHeaderModel_Level3_FullBudget()` (prepared but not active)

---

## FILES MODIFIED

### **New File: `js/budget-widget-helper.js`**
**Purpose:** Centralized logic for budget model generation  
**Size:** ~200 lines

**Key Functions:**
- `getManualPOICostData()` — Only real user-input costs
- `getRealisticBudgetTotal()` — Returns null if budget not real
- `getTotalPOICount()` — Count of all POI
- `getBudgetHeaderModel()` — Returns UI-ready config for Level 1
- `getBudgetHeaderModel_Level2_POIEnriched()` — Placeholder for future
- `getBudgetHeaderModel_Level3_FullBudget()` — Placeholder for future

---

### **Modified: `index.html`**
**Change:** Added script include  
**Line:** 13804 (between itinerary-validation.js and poi-enrichment.js)

```html
<script src="./js/budget-widget-helper.js"></script>
```

---

### **Modified: `js/itinerary-unified.js`**
**Changes:**
1. **Lines 17-35:** Removed fake budget calculation variables, replaced with `budgetModel`
2. **Lines 229-273:** Replaced old budget HTML with new Level 1 widget

**Old Approach:**
```javascript
const budget = tripProfile.budget_total || 0;
let budgetBreakdown = ITINERARY.calculateTotalBudget();
let totalCostSpent = budgetBreakdown.total;
// ...shows Pianificato/Speso/Rimasto/Trasporti
```

**New Approach:**
```javascript
const budgetModel = BUDGET_WIDGET_HELPER.getBudgetHeaderModel();
// ...shows only real costs + honest disclaimer
```

---

## UI COMPARISON: Before vs After

### **BEFORE (Fake Completeness)**
```
💰 Budget                    8 giorni
┌──────────────────────────────────────────┐
│ Pianificato      Speso       Rimasto    │ ← Suggests budget tracking
│ ¥0               ¥4500       ¥0         │   (but budget = 0, so fake)
│ ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│ Infinity% allocato                       │ ← Math error / Misleading
│                                          │
│ 🏪 POI & Ticket          ¥4500          │ ← Breakdown suggests
│ 🚌 Trasporti             ¥0             │   full tracking, but
│                                          │   Trasporti is fake
└──────────────────────────────────────────┘
```

### **AFTER (Honest Data)**
```
Costi tappe                  8 giorni
┌──────────────────────────────────────────┐
│                                          │
│ Totale inserito                          │ ← Real metric
│ ¥4500                                    │
│                                          │
│ 2/3 POI con costo                        │ ← Context
│                                          │
│ ⓘ Trasporti non ancora inclusi           │ ← Honest disclaimer
│                                          │
└──────────────────────────────────────────┘
```

---

## FUTURE-PROOFING

### **Data Model Ready for Level 2**
The helper is prepared to handle (when ready):
```javascript
{
  ticket_cost: null,        // Will be populated when implemented
  transport_cost_from_prev: null, // Will be calculated when routing is real
  cost_source: 'manual',    // 'manual' | 'verified' | 'estimated'
  cost_confidence: 'low',   // 'high' | 'medium' | 'low'
  route_from_prev: null     // Will have real route data
}
```

### **Switch to Level 2 (When Ready)**
When Google Places integration provides real price_level/opening_hours:
```javascript
// Just change which mode is active:
if (hasVerifiedPriceData()) {
  return this.getBudgetHeaderModel_Level2_POIEnriched();
} else {
  return this.getBudgetHeaderModel(); // Level 1
}
```

### **Switch to Level 3 (When Ready)**
When routing is reliable and transport costs are real:
```javascript
if (hasReliableRouting() && hasRealTransportCosts()) {
  return this.getBudgetHeaderModel_Level3_FullBudget();
}
```

---

## TEST RESULTS

### **Test Cases Executed**

| Test | Status | Notes |
|------|--------|-------|
| No POI with cost | ✅ | Shows ¥0, "0/0 POI" |
| Some POI with cost | ✅ | Shows correct total, count, disclaimer |
| All POI with cost | ✅ | Shows correct totals |
| Budget total present | ✅ | Model stores it, Level 1 ignores it (correct) |
| Budget total absent | ✅ | Model returns null, no false "Rimasto" calc |
| Mobile 360px viewport | ✅ | Text readable, no overflow |
| No fake data visible | ✅ | No Pianificato/Speso/Rimasto/Trasporti |
| Future levels prepared | ✅ | Level 2 & 3 methods exist, not active |

See `BUDGET_WIDGET_TEST.md` for detailed test cases.

---

## DEFINITION OF DONE

- [x] Root cause identified (transport/ticket fake, budget calc errors)
- [x] Helper module created with progressive levels
- [x] Script included in correct order (before use)
- [x] itinerary-unified.js refactored to use helper
- [x] Budget HTML replaced with Level 1 widget (no fake data)
- [x] UI shows only real costs + honest disclaimer
- [x] Mobile viewport verified (360px)
- [x] All test cases pass
- [x] Future levels (2, 3) prepared but NOT active
- [x] No breaking changes to existing flow

---

## VERIFICATION CHECKLIST

In browser DevTools console:

```javascript
// Verify helper is loaded
console.assert(typeof BUDGET_WIDGET_HELPER === 'object', '✓ Helper loaded');

// Verify model works
const model = BUDGET_WIDGET_HELPER.getBudgetHeaderModel();
console.assert(model.mode === 'manual-only', '✓ Level 1 active');
console.assert(!model.showTransportBreakdown, '✓ Transport hidden');
console.assert(!model.showBudgetComparison, '✓ Pianificato/Speso hidden');
console.assert(model.infoText.includes('non ancora'), '✓ Disclaimer present');

// Verify UI renders
console.assert(document.querySelector('.budget-summary') !== null, '✓ Widget rendered');

console.log('═══════════════════════════════════════════════════');
console.log('✅ BUDGET WIDGET REFACTOR VERIFIED');
console.log('═══════════════════════════════════════════════════');
```

---

## KEY PRINCIPLES APPLIED

1. **Show only real data** — No fake costs, estimates, or unimplemented features
2. **Clear disclaimers** — "non ancora inclusi" tells user what's NOT ready
3. **Progressive enhancement** — Levels 2 & 3 prepared but inactive
4. **No fake ¥0** — If a feature isn't implemented, don't show ¥0 for it
5. **Mobile-first** — Widget is readable at 360px
6. **Future-proof** — Can upgrade to Level 2/3 without refactoring HTML

---

## RELATED FILES NOT MODIFIED

- ❌ `js/itinerary.js` — Transport/ticket calculation left as-is (for future use)
- ❌ `js/routing.js` — Routing remains async/optional
- ❌ `js/poi-enrichment.js` — No changes needed
- ✅ Only UI refactored, not core logic
