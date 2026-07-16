// ============================================================================
// VERCEL WEB ANALYTICS — Privacy-friendly traffic insights
// ============================================================================
// Dynamically inject Vercel Analytics for static HTML project
// Docs: https://vercel.com/docs/analytics/quickstart

(function() {
  'use strict';
  
  // Initialize the queue for analytics events
  window.va = window.va || function() {
    (window.vaq = window.vaq || []).push(arguments);
  };

  // Inject the Vercel Analytics script
  var script = document.createElement('script');
  script.defer = true;
  script.src = '/_vercel/insights/script.js';
  document.head.appendChild(script);

  if (window.DEBUG) {
    console.log('[Analytics] Vercel Web Analytics initialized');
  }
})();
