// ============================================================================
// gesture-detector.js — GestureDetector class + swipe-to-close sheet handler
// Extracted from app-core.js. No external dependencies.
// ============================================================================

/* ════════════════════════════════════════════════════════════════════
   GESTURE SUPPORT 2026 — Swipe, Pinch, Long-Press Detection
════════════════════════════════════════════════════════════════════ */

class GestureDetector {
  constructor() {
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchEndX = 0;
    this.touchEndY = 0;
    this.touchStartTime = 0;
    this.initialDistance = 0;

    // Bind methods
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);

    this.init();
  }

  init() {
    document.addEventListener('touchstart', this.handleTouchStart, false);
    document.addEventListener('touchmove', this.handleTouchMove, false);
    document.addEventListener('touchend', this.handleTouchEnd, false);
    console.log('[Gestures] ✓ Gesture detection initialized');
  }

  handleTouchStart(e) {
    this.touchStartX = e.changedTouches[0].screenX;
    this.touchStartY = e.changedTouches[0].screenY;
    this.touchStartTime = Date.now();

    // Pinch detection
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      this.initialDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
    }

    // Long-press detection
    this.longPressTimer = setTimeout(() => {
      this.triggerLongPress(e);
    }, 500);
  }

  handleTouchMove(e) {
    // Cancel long-press if user moves
    clearTimeout(this.longPressTimer);

    // Pinch zoom
    if (e.touches.length === 2 && this.initialDistance) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      const scale = currentDistance / this.initialDistance;

      if (Math.abs(scale - 1) > 0.1) {
        this.triggerPinch(scale, e);
      }
    }
  }

  handleTouchEnd(e) {
    clearTimeout(this.longPressTimer);

    this.touchEndX = e.changedTouches[0].screenX;
    this.touchEndY = e.changedTouches[0].screenY;
    const touchDuration = Date.now() - this.touchStartTime;

    // Detect swipe
    const diffX = this.touchStartX - this.touchEndX;
    const diffY = this.touchStartY - this.touchEndY;
    const minSwipeDistance = 50;

    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > minSwipeDistance) {
      if (diffX > 0) {
        this.triggerSwipe('left', e);
      } else {
        this.triggerSwipe('right', e);
      }
    } else if (Math.abs(diffY) > minSwipeDistance) {
      if (diffY > 0) {
        this.triggerSwipe('up', e);
      } else {
        this.triggerSwipe('down', e);
      }
    }
  }

  triggerSwipe(direction, event) {
    const customEvent = new CustomEvent('gesture-swipe', {
      detail: { direction, target: event.target }
    });
    document.dispatchEvent(customEvent);
    console.log('[Gestures] 👆 Swipe detected:', direction);
  }

  triggerPinch(scale, event) {
    const customEvent = new CustomEvent('gesture-pinch', {
      detail: { scale, target: event.target }
    });
    document.dispatchEvent(customEvent);
  }

  triggerLongPress(event) {
    const customEvent = new CustomEvent('gesture-longpress', {
      detail: { target: event.target }
    });
    document.dispatchEvent(customEvent);
    console.log('[Gestures] 👁️ Long-press detected');
  }
}

// Initialize gesture detection — wait for DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new GestureDetector();
    console.log('[Gestures] ✓ Initialized after DOM loaded');
  });
} else {
  new GestureDetector();
  console.log('[Gestures] ✓ Initialized (DOM already loaded)');
}

// Example: Close sheet on swipe down
document.addEventListener('gesture-swipe', (e) => {
  if (e.detail.direction === 'down' && document.querySelector('.sheet.show')) {
    console.log('[Gestures] Closing sheet via swipe-down');
    // Close active sheet
    const sheet = document.querySelector('.sheet.show');
    if (sheet) sheet.classList.remove('show');
  }
});
