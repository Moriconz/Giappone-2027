/**
 * Gallery Module — Lazy-loaded
 */

export function init() {
  console.log('[GalleryModule] Initializing...');
  if (window.initGalleryTab && typeof window.initGalleryTab === 'function') {
    window.initGalleryTab();
  }
}
