/**
 * API QUOTA GUARD — Daily call limits for Google Places API endpoints
 *
 * Intercepts all fetch() calls to /api/<endpoint> and enforces per-day caps
 * stored in localStorage. Resets automatically at midnight.
 *
 * Why: In May 2026, 5699 Nearby Searches + 6650 Details calls cost ~€59
 * (covered by promo credit, but credits will expire). These limits keep
 * monthly spend well within the $200 Google Maps free credit.
 *
 * Monthly cost at these limits (30 days × daily limit):
 *   Nearby:  15×30×$0.032  = $14.40
 *   Details: 20×30×$0.008  = $4.80
 *   enrich:  15×30×$0.020  = $9.00
 *   GF:       2×30×5×$0.032= $9.60  (5 TextSearch per call)
 *   Vintage:  2×30×$0.032  = $1.92
 *   Photo:   40×30×$0.007  = $8.40
 *   Total:                  ~$48/month → within $200 credit → €0
 */
(function () {
  'use strict';

  // Keys must match the path segment after /api/ in the fetch URL
  const DAILY_LIMITS = {
    googlePlacesNearby:    15,   // Nearby Search ~$0.032/call
    googlePlacesDetails:   20,   // Details (Atmosphere + Contact) ~$0.008/call
    enrichPOI:             15,   // FindPlace + Details legacy ~$0.020/call
    searchGlutenFreeShops: 2,    // 5× TextSearch per city call
    searchVintageShops:    2,    // Nearby Search batch per city
    placePhoto:            40,   // Places Photo ~$0.007/call
    analyzeGlutenFree:     5,    // Groq (paid, not Google)
  };

  const STORAGE_KEY = 'apiQuota_v2';

  function _today() {
    return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  }

  function _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { _date: _today() };
      const s = JSON.parse(raw);
      if (s._date !== _today()) return { _date: _today() }; // New day → reset
      return s;
    } catch {
      return { _date: _today() };
    }
  }

  function _save(s) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch { /* Storage full — ignore silently */ }
  }

  function check(endpoint) {
    const limit = DAILY_LIMITS[endpoint];
    if (limit === undefined) return true; // Untracked → always allow
    return (_load()[endpoint] || 0) < limit;
  }

  function consume(endpoint) {
    const limit = DAILY_LIMITS[endpoint];
    if (limit === undefined) return;
    const s = _load();
    s[endpoint] = (s[endpoint] || 0) + 1;
    _save(s);
    const used = s[endpoint];
    const pct = Math.round((used / limit) * 100);
    console.log(`[ApiQuota] ${endpoint}: ${used}/${limit} oggi (${pct}%)`);
    if (pct >= 80 && pct < 100) {
      window.toast?.(`⚠️ ${endpoint}: ${used}/${limit} chiamate API oggi`);
    }
  }

  function getCount(endpoint) { return _load()[endpoint] || 0; }
  function getLimit(endpoint) { return DAILY_LIMITS[endpoint] ?? Infinity; }

  function status() {
    const s = _load();
    const rows = Object.entries(DAILY_LIMITS).map(([k, lim]) => ({
      endpoint: k,
      used: s[k] || 0,
      limit: lim,
      remaining: lim - (s[k] || 0),
      '%': `${Math.round(((s[k] || 0) / lim) * 100)}%`
    }));
    console.table(rows);
    return rows;
  }

  // Global fetch interceptor — gates all tracked /api/<endpoint> calls
  const _origFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input
      : (input instanceof Request ? input.url : String(input));

    const m = url.match(/\/api\/([^?#/]+)/);
    if (m) {
      const endpoint = m[1];
      if (DAILY_LIMITS[endpoint] !== undefined) {
        if (!check(endpoint)) {
          const limit = DAILY_LIMITS[endpoint];
          const msg = `Quota giornaliera esaurita: ${endpoint} (${limit}/${limit} chiamate). Riprova domani.`;
          console.warn(`[ApiQuota] 🚫 BLOCKED: ${msg}`);
          window.toast?.(`🚫 ${msg}`);
          return Promise.resolve(
            new Response(
              JSON.stringify({ error: msg, quota_exceeded: true }),
              { status: 429, headers: { 'Content-Type': 'application/json' } }
            )
          );
        }
        consume(endpoint);
      }
    }
    return _origFetch(input, init);
  };

  window.ApiQuota = { check, consume, getCount, getLimit, status, DAILY_LIMITS };

  console.log('[ApiQuota] Caricato. Limiti giornalieri:', DAILY_LIMITS);
  // Print today's usage after app init
  setTimeout(() => {
    console.log('[ApiQuota] Utilizzo odierno:');
    status();
  }, 3000);
})();
