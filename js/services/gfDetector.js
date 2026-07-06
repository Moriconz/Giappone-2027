/**
 * GLUTEN FREE DETECTION SERVICE
 *
 * Unica fonte automatica: scan keyword nelle review (debole, va verificato
 * sul posto). Stato massimo raggiungibile: 'likely', mai 'confirmed' — un
 * automatismo che legge testo di recensioni non può "confermare" nulla per
 * un celiaco.
 *
 * Rimosse due fonti che gonfiavano falsamente lo score verso 'confirmed':
 * - Ex Fonte B (Find Me Gluten Free): il fetch() diretto al loro sito viene
 *   sempre bloccato da CORS lato browser (nessuna API pubblica reale usata),
 *   quindi non ha mai prodotto risultati — era dead code che sprecava un
 *   timeout di 3s ad ogni lookup e faceva scrivere in UI "Confermato da Find
 *   Me Gluten Free" quando quella fonte non era mai stata davvero consultata.
 * - Ex Fonte C (servesVegetarianFood/servesVeganFood): vegetariano/vegano
 *   NON vuol dire senza glutine (pasta, pane, seitan sono entrambi comuni in
 *   cucina vegetariana) — contava come evidenza GF qualcosa che non lo è,
 *   rischio concreto di falso positivo per chi ha celiachia reale.
 *
 * La vera conferma "sul campo" resta il layer umano in gf-crowdsource.js
 * (riscontri ✅/⚠️ del gruppo), non toccato da questo modulo.
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
 * Unica fonte: scan keyword review. Tetto a 'likely' — mai 'confirmed':
 * la conferma vera è il riscontro umano in GFCrowd (gf-crowdsource.js).
 * `details` non più usato (era solo per l'ex fonte vegetariano/vegano),
 * lasciato nella firma per non toccare i chiamanti esistenti.
 */
async function detectGlutenFree(poi, placeId, details = {}, reviews = []) {
  // Check cache prima
  const cached = getCachedGFStatus(placeId);
  if (cached) {
    console.debug('[GF Detector] Cache hit:', cached.status);
    return cached;
  }

  console.debug('[GF Detector] Starting detection for:', poi.name);

  const { points } = await sourceA_reviewsKeywords(reviews);
  const status = points >= 1 ? 'likely' : 'unknown';

  const result = {
    status,
    source: points > 0 ? 'reviews' : 'unknown',
    timestamp: Date.now(),
    score: points
  };

  console.debug('[GF Detector] Result:', status, '(score:', totalScore, ')');

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

console.debug('[GlutenFreeDetector] Module loaded');
