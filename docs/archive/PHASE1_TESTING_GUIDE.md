# Phase 1 Testing Guide — Component System Verification

## Quick Start: Manual Testing Steps

Open the app at `file:///Users/riccardomoricone/Desktop/Giappone-2027-main-2/index.html` and follow these tests:

---

## Test Suite 1: Address Row + Copy Button

**Precondition**: Open any POI detail modal

### Test 1.1: Address displays with correct styling
- [ ] Address appears in a subtle card-like box
- [ ] Address text is truncated with ellipsis if too long
- [ ] Copy button (⧉ icon) appears on the right
- [ ] No empty box visible if POI has no address

### Test 1.2: Copy button behavior
- [ ] Copy button background is transparent normally
- [ ] On hover: button gets light background (`rgba(255,255,255,0.08)`)
- [ ] Click copy button: text "⧉" remains visible (no change to ✓)
- [ ] Verify in browser DevTools: no inline style attributes (should only have class names)

**Expected Classes Only**:
- `class="address-row"`
- `class="address-text"`
- `class="btn-copy-address"`

---

## Test Suite 2: Notes Section

**Precondition**: Open any POI detail modal

### Test 2.1: Notes button styling (no existing note)
- [ ] Button shows "📝 Aggiungi una nota"
- [ ] Button has dashed border
- [ ] Button background is transparent
- [ ] On hover: border becomes solid, color brightens
- [ ] Check DevTools: class names only (no inline styles)

### Test 2.2: Notes textarea (when displaying saved note)
- [ ] Textarea displays with proper padding and border radius
- [ ] Text is white color on dark background
- [ ] Textarea has light border on hover
- [ ] Check DevTools: uses `.form-input` and `.form-textarea` classes

**Expected Classes Only**:
- `class="notes-section"`
- `class="form-input form-textarea"`
- `class="notes-button"`

---

## Test Suite 3: Primary CTA Button

**Precondition**: Scroll down in any POI detail modal

### Test 3.1: Button appearance
- [ ] Button text: "📅 Aggiungi all'itinerario"
- [ ] Button color: Brown (#b5541e)
- [ ] Button height: 44px minimum (proper touch target)
- [ ] Button width: 100% of container
- [ ] Button text is white, bold

### Test 3.2: Button interactions
- [ ] Hover: Button casts larger shadow (0 6px 18px instead of 0 4px 14px)
- [ ] Hover: Button moves up slightly (translateY(-2px))
- [ ] Click: Button moves down (normal position)
- [ ] No onmouseover/onmouseout handlers visible in DevTools

**Expected Classes Only**:
- `class="btn-cta"`

---

## Test Suite 4: Star Rating System

**Precondition**: Open any POI detail modal, scroll to rating section

### Test 4.1: Star rendering
- [ ] 5 stars visible in a row
- [ ] Stars are size 28px
- [ ] Unselected stars: light gray color (rgba(255,255,255,0.3))
- [ ] If previously rated: filled stars are golden (#f59e0b)
- [ ] Each star is clickable

### Test 4.2: Star interactions
- [ ] Hover over any star: star scales to 1.2x larger
- [ ] Hover: star color turns golden (#f59e0b)
- [ ] Click star: all stars up to that position turn golden
- [ ] Rating persists after closing and reopening POI modal
- [ ] Check DevTools: uses `.star` class with `.active` modifier, no inline styles

### Test 4.3: Rating persistence
- [ ] Click 3rd star for a POI → stars 1, 2, 3 turn golden
- [ ] Close modal and reopen same POI
- [ ] Verify: stars 1, 2, 3 still golden (loaded from localStorage)

**Expected Classes Only**:
- `class="rating-stars"`
- `class="star active"` (for selected stars)
- `class="star"` (for unselected stars)

---

## Test Suite 5: Gluten-Free Status Badges

**Precondition**: Open a restaurant POI detail modal (type: ristorante, cafe, etc.)

### Test 5.1: Confirmed status (green)
- [ ] Background color: Light green (rgba(74, 222, 128, 0.12))
- [ ] Border color: Bright green (rgba(74, 222, 128, 0.35))
- [ ] Text color: Green (#4ade80)
- [ ] Icon: 🌾
- [ ] Text: "Opzioni gluten-free disponibili"
- [ ] Subtext: "Confermato da Find Me Gluten Free"
- [ ] Arrow (→) visible on the right
- [ ] Clickable link to Find Me Gluten Free

**Expected Classes Only**:
- `class="status-badge status-confirmed"`
- `class="status-content"`
- `class="status-arrow"`

### Test 5.2: Likely status (yellow)
- [ ] Background color: Light yellow (rgba(251, 191, 36, 0.12))
- [ ] Border color: Bright yellow (rgba(251, 191, 36, 0.35))
- [ ] Text color: Yellow (#fbbf24)
- [ ] Icon: 🌾
- [ ] Text: "Probabilmente gluten-free"
- [ ] Subtext: "Menzionato nelle recensioni, verifica al locale"
- [ ] NOT clickable (no arrow)

**Expected Classes Only**:
- `class="status-badge status-likely"`
- `class="status-content"`

### Test 5.3: Unknown status (soft gray)
- [ ] Background color: Very subtle (rgba(255, 255, 255, 0.025))
- [ ] Border color: Almost invisible (rgba(255, 255, 255, 0.06))
- [ ] Text color: Muted white (rgba(255, 255, 255, 0.65))
- [ ] Icon: No emoji (just text)
- [ ] Text: "Gluten-free non verificato"
- [ ] Subtext: "Nessuna conferma trovata al momento"
- [ ] Soft, non-alarming appearance

**Expected Classes Only**:
- `class="status-badge status-unknown"`
- `class="status-content"`

### Test 5.4: Non-restaurant POI
- [ ] Museums, temples, attractions: NO gluten-free section visible
- [ ] Only appears for food/drink categories

---

## Test Suite 6: Console Verification

**How to Check**: Open Chrome DevTools (F12) → Console tab

### Check 6.1: No errors
- [ ] Scroll through console
- [ ] Look for red error messages
- [ ] Expected: Clean console or only "Loading..." messages

### Check 6.2: Inspect element (right-click element → Inspect)

#### Address row example:
```html
<!-- BEFORE (inline styles): -->
<div class="poi-address-row" style="display:flex;align-items:center;justify-content:space-between;gap:12px;...">

<!-- AFTER (component classes): -->
<div class="address-row">
```
- [ ] `address-row` uses CSS classes, no inline style attribute

#### Star rating example:
```html
<!-- BEFORE (inline styles): -->
<span class="star-rating" style="font-size:28px;color:rgba(255,255,255,0.3);cursor:pointer;..." onmouseover="..." onmouseout="...">★</span>

<!-- AFTER (component classes): -->
<span class="star active" data-star="3" data-id="poi-123">★</span>
```
- [ ] `.star` and `.star.active` classes used
- [ ] No onmouseover/onmouseout handlers
- [ ] No inline styles

#### CTA button example:
```html
<!-- BEFORE (inline styles): -->
<button id="add-to-itinerary-btn" style="width:100%;background-color:#b5541e;border:none;...">

<!-- AFTER (component classes): -->
<button id="add-to-itinerary-btn" class="btn-cta">
```
- [ ] Only `class="btn-cta"` attribute
- [ ] No style attribute
- [ ] No onmouseover/onmouseout handlers

---

## Test Suite 7: Responsive Design (Mobile)

**How to Test**: Chrome DevTools → Toggle Device Toolbar (Ctrl+Shift+M)
Set viewport to 375px width (iPhone SE)

### Test 7.1: Touch targets
- [ ] All buttons at least 44px tall
- [ ] Buttons have proper spacing (8px gap minimum)
- [ ] Copy button still visible and tappable
- [ ] Star rating stars properly spaced

### Test 7.2: Text overflow
- [ ] Address text truncates with ellipsis if too long
- [ ] No text overlapping buttons
- [ ] Labels remain readable

### Test 7.3: Spacing
- [ ] Padding reduces on mobile (--space-lg from 16px)
- [ ] Modal sections still readable
- [ ] No cramped layout

---

## Test Suite 8: Color Accuracy Verification

Use Chrome DevTools Color Picker (right-click → Inspect → hover over element)

### Colors to verify:
| Component | Expected Color | Tolerance |
|-----------|---|---|
| Address row background | rgba(255,255,255,0.04) | ±1% |
| Address row border | rgba(255,255,255,0.1) | ±1% |
| Copy button hover | rgba(255,255,255,0.08) | ±1% |
| CTA button | #b5541e or rgb(181,84,30) | Exact |
| CTA button shadow | rgba(181,84,30,0.4) | ±2% |
| Star active color | #f59e0b or rgb(245,158,11) | Exact |
| Confirmed badge green | #4ade80 or rgb(74,222,128) | Exact |
| Likely badge yellow | #fbbf24 or rgb(251,191,36) | Exact |
| Unknown badge text | rgba(255,255,255,0.65) | ±2% |

---

## Regression Test: Existing Functionality

### Test R1: POI modal opens correctly
- [ ] Click any marker on map
- [ ] POI detail modal opens
- [ ] All sections visible (address, notes, rating, CTA, etc.)

### Test R2: No broken interactions
- [ ] Copy address works
- [ ] Add note button shows/hides textarea
- [ ] Star rating is clickable
- [ ] GF status appears for restaurants
- [ ] Non-restaurant POIs have no GF box
- [ ] CTA button is clickable

### Test R3: LocalStorage still works
- [ ] Rate a POI (click stars)
- [ ] Close and reopen POI
- [ ] Rating persists
- [ ] Add a note
- [ ] Close and reopen
- [ ] Note text persists

---

## Performance Check

**In Chrome DevTools → Performance tab**:

1. Open POI modal
2. Click record button
3. Click a star
4. Stop recording
5. Check results:
   - [ ] No long tasks (red bars)
   - [ ] No jank (stuttering)
   - [ ] Frame rate: 60 FPS or close to it
   - [ ] Transition should take ~200ms (based on --transition-normal: 0.2s)

---

## Summary Table

| Feature | Inline Styles | Component Classes | Status |
|---------|---|---|---|
| Address row | ❌ Removed | ✅ .address-row | ✓ |
| Copy button | ❌ Removed | ✅ .btn-copy-address | ✓ |
| Notes section | ❌ Removed | ✅ .form-input, .notes-* | ✓ |
| Primary CTA | ❌ Removed | ✅ .btn-cta | ✓ |
| Star rating | ❌ Removed | ✅ .star, .active | ✓ |
| Status badges | ❌ Removed | ✅ .status-badge, .status-* | ✓ |
| Event handlers | ✅ Still event-based | ✅ Class selectors | ✓ |
| localStorage | ✅ Still working | ✅ Same logic | ✓ |

---

## Known Limitations (Phase 1)

- Some wrapper divs still use inline padding/margin (Phase 2 will address)
- Maps dropdown button styling not yet refactored (Phase 2)
- Secondary buttons (save, calendar) styling pending (Phase 2)
- Section headers/dividers not yet standardized (Phase 2)

---

## Bug Reports Template

If you find issues, please document:

1. **Screenshot**: Use Chrome DevTools Inspector view
2. **Steps to reproduce**: Exact clicks/actions
3. **Expected vs actual**: What should happen vs. what happens
4. **Component class**: Which CSS class is affected
5. **Browser/device**: Chrome version, iOS/Android/Desktop

Example:
```
BUG: Star rating not scaling on hover
- Precondition: Open any POI modal
- Step 1: Hover over first star
- Expected: Star scales to 1.2x, color turns golden
- Actual: Star color changes but doesn't scale
- Component: .star (line 6400 in index.html)
- Browser: Chrome 120.0.6099.129, Desktop
```

---

**Last Updated**: May 14, 2026  
**Next Review**: After Phase 1 QA completion
