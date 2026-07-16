/**
 * SHARED QUOTA GUARD — server-side, cross-user daily call limits (Redis)
 *
 * js/api-quota.js applica gli stessi limiti lato client, ma via localStorage
 * — quindi per DISPOSITIVO. Con più persone che usano l'app insieme, ognuno
 * ha il proprio contatore indipendente: N utenti potevano arrivare a N×
 * il limite pensato per una persona sola. Qui il contatore è UNICO e
 * condiviso tra tutti (stesso Redis di kv-cache.js), quindi il tetto sulla
 * spesa reale verso Google/Groq è quello vero, indipendentemente da quante
 * persone usano l'app in parallelo.
 *
 * Degradazione: se Redis non è configurato (sviluppo locale, o KV non
 * collegato su Vercel), check fail-open (lascia sempre passare) — l'unica
 * protezione resta il guard client-side per-dispositivo in js/api-quota.js,
 * esattamente come prima dell'introduzione di questo file.
 */

import { Redis } from '@upstash/redis';

const redis = (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
  ? new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN })
  : null;

// Stessi endpoint/limiti di js/api-quota.js DAILY_LIMITS — se cambi uno,
// cambia anche l'altro (nessuna fonte unica perché uno gira nel browser e
// l'altro nelle funzioni serverless, moduli separati per design).
export const DAILY_LIMITS = {
  googlePlacesNearby:    15,
  googlePlacesDetails:   20,
  enrichPOI:             15,
  searchGlutenFreeShops: 2,
  searchVintageShops:    2,
  placePhoto:            40,
  groqAnalyze:            5,
  groqImageAnalyze:       5,
};

function _todayKey(endpoint) {
  const day = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
  return `quota:${endpoint}:${day}`;
}

/**
 * Incrementa e controlla in un solo passaggio atomico (Redis INCR), per
 * evitare la race "leggi-poi-scrivi" tra richieste concorrenti di utenti
 * diversi che arriverebbero quasi nello stesso istante.
 *
 * Ritorna { limited, used, limit } — se limited=true, il chiamante deve
 * rifiutare la richiesta PRIMA di fare la chiamata a pagamento (Google/Groq).
 */
export async function checkAndConsumeQuota(endpoint) {
  const limit = DAILY_LIMITS[endpoint];
  if (limit === undefined) return { limited: false }; // endpoint non tracciato

  if (!redis) return { limited: false, noRedis: true }; // fail-open senza KV

  try {
    const key = _todayKey(endpoint);
    const used = await redis.incr(key);
    if (used === 1) {
      // Prima chiamata di oggi per questo endpoint: imposta scadenza a poco
      // più di un giorno, così il contatore si azzera da solo a mezzanotte
      // UTC (± il margine) senza bisogno di un cron di pulizia a parte.
      await redis.expire(key, 25 * 3600);
    }
    return { limited: used > limit, used, limit };
  } catch (err) {
    console.warn(`[Quota] Redis error (non-fatal, fail-open): ${err.message}`);
    return { limited: false, error: true };
  }
}

/**
 * Corpo risposta 429 condiviso — stessa forma { error, quota_exceeded:true }
 * già prodotta dal guard client-side, così il codice che già la gestisce
 * (es. js/views/gf-view.js) funziona identico indipendentemente da quale
 * dei due livelli ha bloccato la richiesta.
 */
export function quotaExceededBody(endpoint, limit) {
  return {
    error: `Quota giornaliera condivisa esaurita per "${endpoint}" (${limit}/giorno). Si sblocca automaticamente domani.`,
    quota_exceeded: true,
  };
}
