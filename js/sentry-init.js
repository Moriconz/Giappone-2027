/**
 * Sentry error tracking - Load async, no bundle bloat
 * Captures: unhandled errors, promise rejections, crashes
 */

window.sentryInit = async function() {
  try {
    // Load Sentry CDN (async, non-blocking)
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@sentry/browser@7.80.0/build/bundle.min.js';
    script.async = true;

    script.onload = () => {
      if (window.Sentry) {
        window.Sentry.init({
          // Replace with your actual DSN from sentry.io free account
          dsn: 'https://REPLACE_WITH_YOUR_DSN@sentry.io/PROJECT_ID',

          // Environment
          environment: window.location.hostname === 'localhost' ? 'development' : 'production',

          // Sample rate (capture 100% in production, 0% in dev for noise)
          tracesSampleRate: 0.1,

          // Ignore certain errors
          ignoreErrors: [
            // Ignore browser extensions
            'top.GLOBALS',
            'e.innerText',
            // Ignore WebGL errors
            'WebGLRenderingContext',
            // Ignore Open-Meteo timeout (expected in slow connection)
            'open-meteo.com'
          ],

          // Integrations
          integrations: [
            new window.Sentry.Replay({
              maskAllText: true,
              blockAllMedia: true
            })
          ],

          // Capture replay on error
          replaysOnErrorSampleRate: 1.0,

          // Release version
          release: '3.2.0'
        });

        console.log('[Sentry] ✓ Error tracking initialized');

        // Attach to window for manual logging
        window.logError = (msg, extra = {}) => {
          window.Sentry.captureException(new Error(msg), { extra });
        };
      }
    };

    document.head.appendChild(script);
  } catch (err) {
    console.warn('[Sentry] Init failed:', err);
  }
};

// Auto-init on page load (async, non-blocking)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', window.sentryInit);
} else {
  setTimeout(window.sentryInit, 100);
}

// Unhandled promise rejection catcher
window.addEventListener('unhandledrejection', (event) => {
  console.error('[Error] Unhandled promise rejection:', event.reason);
  if (window.Sentry) {
    window.Sentry.captureException(event.reason);
  }
});
