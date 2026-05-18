/**
 * Group Panel Module — Lazy-loaded
 */

export function init() {
  console.log('[GroupPanelModule] Initializing...');
  if (window.initGroupPanel && typeof window.initGroupPanel === 'function') {
    window.initGroupPanel();
  }
}
