/**
 * GLUTEN FREE DETECTION SERVICE
 *
 * 3 fonti parallele:
 * - Fonte A: scan reviews keywords locali
 * - Fonte B: Find Me Gluten Free API
 * - Fonte C: servesVegetarianFood flag da Places API
 *
 * Cache localStorage con TTL 30 giorni
 */

const GF_CACHE_PREFIX = 'gf_status_';
const GF_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 giorni

const GF_KEYWORDS_LOCALIZED = {
  en: ['gluten free', 'gluten-free', 'gf', 'celiac'],
  it: ['senza glutine', 'gluten free', 'celiaco', 'celiaca', 'senza gluten'],
  ja: ['グルテンフリー', 'グルテン', '小麦'],
};

/**
 * Fonte A: Scan reviews per keywords locali
 */
async function sourceA_reviewsKeywords(reviews = []) {
  if (!Array.isArray(reviews) || reviews.length === 0) {
    return { points: 0, source: 'reviews' };
  }

  let points = 0;
  const allKeywords = Object.values(GF_KEYWORDS_LOCALIZED).flat();

  reviews.forEach(review => {
    const text = (review.text || '').toLowerCase();
    const matchCount = allKeywords.filter(kw => text.includes(kw.toLowerCase())).length;

    if (matchCount >= 2) points += 2;
    else if (matchCount >= 1) points += 1;
  });

  return { points: Math.min(points, 2), source: 'reviews' };
}

/**
 * Fonte B: Find Me Gluten Free API
 * (Fallback se API non disponibile)
 */
async function sourceB_fmgfApi(placeId, placeName) {
  try {
    // Implementazione reale richiederebbe API key o scraping
    // Qui simuliamo una chiamata asincrona con timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(
      `https://www.findmeglutenfree.com/search?q=${encodeURIComponent(placeName)}`,
      { method: 'GET', signal: controller.signal }
    );

    clearTimeout(timeoutId);

    if (response.ok) {
      const html = await response.text();
      // Parsing semplificato: cerca "gluten-friendly" o "celiac-friendly"
      const isGlutenFriendly =
        html.includes('gluten-friendly') ||
        html.includes('celiac-friendly') ||
        html.includes('gluten free');

      return { points: isGlutenFriendly ? 3 : 0, source: 'fmgf' };
    }
  } catch (err) {
    console.log('[GF Detector] FMGF source unavailable:', err.message);
  }

  return { points: 0, source: 'fmgf' };
}

/**
 * Fonte C: Attributi Places API
 */
function sourceC_placesAttributes(details = {}) {
  let points = 0;

  if (details.servesVegetarianFood === true) points += 0.5;
  if (details.servesVeganFood === true) points += 0.5;

  return { points, source: 'attributes' };
}

/**
 * Check cache localStorage
 */
function getCachedGFStatus(placeId) {
  if (!placeId) return null;

  const key = GF_CACHE_PREFIX + placeId;
  const cached = localStorage.getItem(key);

  if (!cached) return null;

  try {
    const parsed = JSON.parse(cached);
    const age = Date.now() - parsed.timestamp;

    if (age > GF_CACHE_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }

    return parsed;
  } catch (err) {
    console.error('[GF Detector] Cache parse error:', err);
    localStorage.removeItem(key);
    return null;
  }
}

/**
 * Store cache localStorage
 */
function setCachedGFStatus(placeId, status, source) {
  if (!placeId) return;

  const key = GF_CACHE_PREFIX + placeId;
  const data = {
    status,
    source,
    timestamp: Date.now()
  };

  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error('[GF Detector] Cache store error:', err);
  }
}

/**
 * MAIN FUNCTION: detectGlutenFree()
 *
 * Parallelo su 3 fonti con Promise.allSettled
 * Score: confirmed (>=3), likely (>=1), unknown (0)
 */
async function detectGlutenFree(poi, placeId, details = {}, reviews = []) {
  // Check cache prima
  const cached = getCachedGFStatus(placeId);
  if (cached) {
    console.log('[GF Detector] Cache hit:', cached.status);
    return cached;
  }

  console.log('[GF Detector] Starting detection for:', poi.name);

  // Parallelo su 3 fonti
  const results = await Promise.allSettled([
    sourceA_reviewsKeywords(reviews),
    sourceB_fmgfApi(placeId, poi.name || ''),
    Promise.resolve(sourceC_placesAttributes(details))
  ]);

  // Aggregate score
  let totalScore = 0;
  let primarySource = 'unknown';

  results.forEach((result, idx) => {
    if (result.status === 'fulfilled') {
      totalScore += result.value.points || 0;

      // Primary source: la più alta (FMGF > Reviews > Attributes)
      if (result.value.points > 0) {
        const sources = ['reviews', 'fmgf', 'attributes'];
        if (!primarySource || sources.indexOf(result.value.source) < sources.indexOf(primarySource)) {
          primarySource = result.value.source;
        }
      }
    }
  });

  // Determine status
  let status = 'unknown';
  if (totalScore >= 3) status = 'confirmed';
  else if (totalScore >= 1) status = 'likely';

  const result = {
    status,
    source: primarySource,
    timestamp: Date.now(),
    score: totalScore
  };

  console.log('[GF Detector] Result:', status, '(score:', totalScore, ')');

  // Cache
  setCachedGFStatus(placeId, result.status, result.source);

  return result;
}

// Export
window.GlutenFreeDetector = {
  detectGlutenFree,
  getCachedGFStatus,
  clearCache: (placeId) => {
    if (placeId) {
      localStorage.removeItem(GF_CACHE_PREFIX + placeId);
    } else {
      Object.keys(localStorage)
        .filter(k => k.startsWith(GF_CACHE_PREFIX))
        .forEach(k => localStorage.removeItem(k));
    }
  }
};

console.log('[GlutenFreeDetector] Module loaded');
