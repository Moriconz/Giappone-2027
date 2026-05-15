/**
 * PERFORMANCE UTILITIES — Debounce, throttle, and batched state saves
 *
 * For low-end devices: avoid main thread blocking, reduce reflows
 */

const PERF_UTILS = {
  /**
   * Debounce function — delays execution until N ms after last call
   * Usage: const debouncedFn = debounce(myFn, 300);
   */
  debounce(fn, delayMs) {
    let timeoutId = null;
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        fn.apply(this, args);
      }, delayMs);
    };
  },

  /**
   * Throttle function — ensures function runs at most once per N ms
   * Usage: const throttledFn = throttle(myFn, 300);
   */
  throttle(fn, delayMs) {
    let lastRunTime = 0;
    return function (...args) {
      const now = Date.now();
      if (now - lastRunTime >= delayMs) {
        lastRunTime = now;
        fn.apply(this, args);
      }
    };
  },

  /**
   * Batched saveState — groups multiple saves into one
   * Useful when multiple edits happen in quick succession
   * Usage: Call this instead of window.saveState() directly
   */
  batchedSaveState: (function () {
    let pendingSave = false;

    return function () {
      if (pendingSave) return; // Already scheduled

      pendingSave = true;
      requestAnimationFrame(() => {
        if (window.saveState) {
          window.saveState();
        }
        pendingSave = false;
      });
    };
  })(),

  /**
   * RequestAnimationFrame wrapper for smooth animations
   * Ensures animations use GPU-friendly properties (transform, opacity)
   */
  animateProperty(element, property, startValue, endValue, durationMs, easing = 'ease') {
    if (!element) return;

    // Only allow GPU-friendly animations
    if (!['transform', 'opacity'].includes(property)) {
      console.warn(`[PerfUtils] Warning: animating ${property} is not GPU-friendly. Use transform or opacity.`);
      return;
    }

    const startTime = performance.now();
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / durationMs, 1);

      // Simple linear easing for now
      const value = startValue + (endValue - startValue) * progress;

      if (property === 'transform') {
        element.style.transform = `scale(${value})`;
      } else if (property === 'opacity') {
        element.style.opacity = value;
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }
};

window.PERF_UTILS = PERF_UTILS;
