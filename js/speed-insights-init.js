// ============================================================================
// JS/SPEED-INSIGHTS-INIT.JS — Vercel Speed Insights initialization
// Tracks Core Web Vitals and performance metrics
// ============================================================================

import { injectSpeedInsights } from './speed-insights.mjs';

// Initialize Speed Insights when the page loads
// Only tracks in production (no data collected in development)
if (typeof window !== 'undefined') {
  injectSpeedInsights({
    // Debug mode automatically enabled in development
    debug: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
    // Route tracking for SPA-like behavior
    route: window.location.pathname
  });
}
