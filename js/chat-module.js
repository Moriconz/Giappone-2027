/**
 * Chat Module — Lazy-loaded
 */

export function init() {
  console.log('[ChatModule] Initializing...');
  if (window.initGroupChat && typeof window.initGroupChat === 'function') {
    window.initGroupChat();
  }
}
