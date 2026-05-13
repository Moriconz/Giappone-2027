/**
 * Map Module — Core, always loaded
 */

export function init() {
  console.log('[MapModule] Initializing...');
  if (window.initMap && typeof window.initMap === 'function') {
    window.initMap();
  }
}
