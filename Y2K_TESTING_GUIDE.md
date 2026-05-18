# Y2K Floating Window System — Testing & Verification Guide

**Version:** 1.0  
**Last Updated:** 2026-04-29  
**Status:** Ready for QA Testing

---

## 📋 Pre-Testing Checklist

### Setup
- [ ] Hard refresh browser: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
- [ ] Open browser Developer Tools: `F12` or `Ctrl+Shift+I`
- [ ] Go to Console tab
- [ ] Navigate to Giappone 2027 app
- [ ] Wait for app to fully load (~3-5 seconds)

### Console Verification
Look for these logs:
```
[Y2K] Y2K-WINDOWS.JS LOADED
[Y2K] ✅ openSheet found! Patching now...
[Y2K] ✅ Patching openSheet
```

If you don't see these, the Y2K system didn't load. Troubleshoot:
- Check Network tab for 404 errors
- Verify y2k-windows.js exists at `/js/y2k-windows.js`
- Check index.html line 5444 has correct script tag

---

## 🧪 Test Cases

### Test 1: Opening Windows from Different Tabs

**Objective:** Verify windows open from each main tab

**Steps:**
1. Click **🛍️ Shopping** tab
2. Verify a floating window appears (not a bottom sheet)
3. Note window title: "Shopping"
4. Close window (X button)
5. Repeat for:
   - 🌾 **Gluten Free** tab
   - 📋 **Tappe** (Itinerary) tab
   - Other available tabs

**Expected Result:**
- Each tab opens a floating window
- Window is centered with slight random offset
- Window has pink border and title bar
- Window appears above map (not hidden)

**Pass/Fail:** ☐ Pass ☐ Fail

---

### Test 2: Window Dragging

**Objective:** Verify windows are draggable

**Steps:**
1. Open any tab (e.g., Shopping)
2. Click on the **title bar** (pink area with text)
3. Drag mouse to move window
4. Drag to different screen positions
5. Try dragging to edges of screen
6. Try dragging off-screen (should not go fully off)

**Expected Result:**
- Window follows mouse smoothly
- Window stays mostly on-screen
- Can position window anywhere
- Title bar shows move cursor

**Pass/Fail:** ☐ Pass ☐ Fail

**Notes:**
- Do NOT drag by the close button (should not drag)
- Title bar should show `cursor: move`

---

### Test 3: Window Resizing

**Objective:** Verify windows are resizable

**Steps:**
1. Open any tab
2. Look for **small diagonal area in bottom-right corner**
3. Position mouse there (cursor should change to `↘`)
4. Drag to resize window
5. Try making window very small (test min-size limit)
6. Try making window very large
7. Try resizing in different directions

**Expected Result:**
- Window resizes smoothly
- Minimum size respected (260×180px, no smaller)
- Content scrolls if too small
- Resize handle visible in corner

**Pass/Fail:** ☐ Pass ☐ Fail

---

### Test 4: Close Button

**Objective:** Verify close button works

**Steps:**
1. Open any tab
2. Look for **circular ✕ button** in top-right
3. Click the **✕ button**
4. Verify window closes

**Expected Result:**
- Window immediately disappears
- Map is visible again
- Tab button returns to blue
- No console errors

**Pass/Fail:** ☐ Pass ☐ Fail

---

### Test 5: ESC Key Close All

**Objective:** Verify ESC key closes all windows

**Steps:**
1. Open **multiple tabs** (click several different tabs to open windows)
2. Position windows in different locations
3. Press **ESC key**
4. Verify all windows close at once

**Expected Result:**
- All windows close immediately
- Map becomes clear (no blur)
- All tab buttons are blue
- Only map button is pink/active

**Pass/Fail:** ☐ Pass ☐ Fail

---

### Test 6: Map Blur Effect

**Objective:** Verify map blurs when windows open

**Steps:**
1. Look at the map background
2. Open any tab
3. Verify map becomes **blurred and darker**
4. Close window
5. Verify map blur **disappears**

**Expected Result:**
- Map has blur: `filter: blur(8px) brightness(0.7)`
- Effect applies immediately when window opens
- Effect removes immediately when window closes
- Blur makes window more visually prominent

**Pass/Fail:** ☐ Pass ☐ Fail

---

### Test 7: Filter Bar Visibility

**Objective:** Verify filter bar stays visible over windows

**Steps:**
1. Look at top of screen for **filter chips** (category buttons)
2. Open any tab (window appears)
3. Scroll or position window to try to cover filter bar
4. Verify filter chips are **still visible and clickable**
5. Try clicking on a filter chip while window is open
6. Verify filter chip works (toggles active state)

**Expected Result:**
- Filter bar is always visible
- Filter chips are clickable
- Window doesn't obscure filter bar
- Filter bar has `z-index: 9999`

**Pass/Fail:** ☐ Pass ☐ Fail

---

### Test 8: Tab Button Reset

**Objective:** Verify tab buttons reset when closing windows

**Steps:**
1. Look at bottom navigation buttons (Shopping, GF, Tappe, etc.)
2. Click a tab (e.g., Shopping) — button turns **pink/highlighted**
3. Click window **close button (✕)**
4. Verify button **returns to blue**
5. Verify **map button is now pink/active**

**Alternative Step:**
- Instead of close button, press **ESC key**
- Same result expected

**Expected Result:**
- Tab buttons are blue (inactive) by default
- Clicking a tab makes that button pink (active)
- Closing window removes pink from button
- Map button becomes pink again

**Pass/Fail:** ☐ Pass ☐ Fail

---

### Test 9: Multiple Windows

**Objective:** Verify multiple windows can be open and interact properly

**Steps:**
1. Open **Shopping tab** (window 1 appears)
2. Open **Gluten Free tab** (window 2 appears)
3. Note both windows are visible
4. Click on window 1 title bar
5. Drag window 1 to partially overlap window 2
6. Click on window 2
7. Verify window 2 is now **in front** (higher z-index)
8. Click window 1 again
9. Verify window 1 is now **in front** again
10. Close one window, verify other stays open

**Expected Result:**
- Both windows visible simultaneously
- Windows can overlap
- Clicking window brings it to front
- Closing one doesn't affect others
- Each window maintains its position

**Pass/Fail:** ☐ Pass ☐ Fail

---

### Test 10: Window Content Scrolling

**Objective:** Verify window body scrolls when content exceeds height

**Steps:**
1. Open tab with lots of content (e.g., Shopping with many items)
2. Make window smaller than content (use resize)
3. Scroll inside window using **scroll wheel or swipe**
4. Verify content scrolls smoothly
5. Look for **custom scrollbar** (pink gradient)

**Expected Result:**
- Content scrolls smoothly
- Scrollbar is visible when needed
- Scrollbar has Y2K styling (pink gradient)
- Scroll doesn't move window itself

**Pass/Fail:** ☐ Pass ☐ Fail

---

### Test 11: Mobile/Touch Support

**Objective:** Verify touch interactions work on mobile

**Setup:**
- Use browser DevTools mobile emulation, OR
- Test on actual mobile device

**Steps:**
1. Open tab (window appears)
2. **Touch and drag** title bar to move window
3. **Touch and drag** bottom-right corner to resize
4. **Tap** close button to close
5. Test with multiple fingers (don't create unwanted events)

**Expected Result:**
- Touch drag works smoothly
- Window responds to touch input
- No unexpected side effects
- Gestures feel natural

**Pass/Fail:** ☐ Pass ☐ Fail

---

### Test 12: Window Centering & Offset

**Objective:** Verify windows open centered with random offset

**Steps:**
1. Close all windows
2. Open **Shopping** tab — note window position
3. Close window
4. Open **Shopping** again (within 2 seconds) — note position
5. Verify position is **slightly different** each time

**Expected Result:**
- Windows open roughly centered
- Position varies by ±40px horizontally, ±30px vertically
- Prevents perfect stacking
- Still visible on-screen

**Pass/Fail:** ☐ Pass ☐ Fail

---

### Test 13: Original App Functionality

**Objective:** Verify original app features still work

**Steps:**
1. Verify **map displays** (visible and interactive)
2. Verify **GPS works** (location tracking, distance calculation)
3. Verify **search filters** work (category chips toggle active state)
4. Verify **zoom in/out** works (pinch on mobile, scroll on desktop)
5. Verify **POI markers** display and show details

**Expected Result:**
- All original features work as before
- Y2K system doesn't interfere with app logic
- Map interaction smooth and responsive
- No console errors from app

**Pass/Fail:** ☐ Pass ☐ Fail

---

### Test 14: Console Logs Verification

**Objective:** Verify Y2K system outputs correct debug information

**Steps:**
1. Open browser Console (F12)
2. Hard refresh page
3. Wait for app to load
4. Look for **Y2K logs** starting with `[Y2K]`
5. Verify these appear in order:
   - `Y2K-WINDOWS.JS LOADED`
   - `Waiting for openSheet...`
   - `openSheet found! Patching now...`
   - `✅ Patching openSheet`

**Expected Result:**
- All logs present and in order
- No error messages with `[Y2K]`
- Window IDs logged when opening
- No duplicate logs

**Pass/Fail:** ☐ Pass ☐ Fail

---

### Test 15: Responsiveness & Performance

**Objective:** Verify system runs smoothly without lag

**Steps:**
1. Open 3 windows simultaneously
2. Rapidly drag windows around
3. Try rapid open/close cycles
4. Check browser **Performance tab** for frame drops
5. Monitor **CPU usage** in Task Manager/Activity Monitor
6. Close all windows and verify cleanup

**Expected Result:**
- Dragging is smooth (60 FPS)
- No visible lag or stuttering
- No memory leaks
- CPU usage reasonable (<50%)
- Closing windows frees resources

**Pass/Fail:** ☐ Pass ☐ Fail

---

## 🔧 Troubleshooting

### Issue: Windows not appearing

**Symptoms:** Click on tab, bottom sheet appears instead of floating window

**Diagnosis:**
1. Check Console for `[Y2K] Y2K-WINDOWS.JS LOADED` log
2. If missing, y2k-windows.js didn't load
3. Check Network tab (F12 → Network) for 404s

**Solutions:**
- Verify file exists: `/js/y2k-windows.js`
- Hard refresh: `Ctrl+Shift+R`
- Check index.html line 5444 has `<script src="./js/y2k-windows.js"></script>`
- Clear browser cache

---

### Issue: Filter bar hidden behind windows

**Symptoms:** Can't see or click filter chips when window is open

**Diagnosis:**
- Check y2k-override.css line 115
- Verify `z-index: 9999 !important;` exists on #filters

**Solution:**
- Ensure y2k-override.css is loaded
- Check Developer Tools → Elements → #filters
- Verify computed z-index is 9999
- Hard refresh if recently changed

---

### Issue: Windows can't be dragged

**Symptoms:** Title bar doesn't have move cursor, window doesn't move

**Diagnosis:**
1. Check for CSS `pointer-events: none` on .y2k-win-title
2. Check title bar has correct height

**Solution:**
- Look for conflicting CSS rules
- Override with `pointer-events: auto !important;`
- Check y2k-override.css doesn't have conflicting rules

---

### Issue: Close button doesn't work

**Symptoms:** Clicking ✕ doesn't close window

**Diagnosis:**
1. Check console for JavaScript errors
2. Verify .y2k-win-close element exists (F12 → Elements)
3. Check click event listener attached

**Solution:**
- Hard refresh
- Clear browser cache
- Check for JavaScript errors in Console

---

### Issue: Mobile touch not working

**Symptoms:** Window can't be dragged on mobile, only with mouse

**Diagnosis:**
- Check touch event listeners exist
- Verify `{ passive: true/false }` options correct
- Check for CSS `touch-action` issues

**Solution:**
- Ensure y2k-windows.js loaded
- Test with Chrome DevTools mobile emulation
- Try actual mobile device if possible

---

## 📊 Performance Benchmarks

### Expected Metrics

| Metric | Expected | Acceptable |
|--------|----------|-----------|
| Initial load time | <500ms | <1000ms |
| Window open time | <300ms | <500ms |
| Drag frame rate | 60 FPS | >40 FPS |
| Resize frame rate | 60 FPS | >40 FPS |
| Memory per window | ~15KB | <25KB |
| Memory cleanup | 100% on close | >90% |

---

## ✅ Final Verification

**All Tests Passed:** ☐ Yes ☐ No

**Issues Found:**
- [ ] Critical (blocks usage)
- [ ] Major (affects UX)
- [ ] Minor (cosmetic)
- [ ] None

**Date Tested:** _____________

**Tested By:** _____________

**Browser & OS:** _____________

**Notes:**
```
_____________________________________________
_____________________________________________
_____________________________________________
```

---

## 🚀 Deployment Readiness

- [ ] All tests passing
- [ ] No console errors
- [ ] All features working
- [ ] Performance acceptable
- [ ] Mobile responsive
- [ ] Documentation complete
- [ ] Ready for production

**Status:** ✅ Ready for Deployment

---

**End of Testing Guide**
