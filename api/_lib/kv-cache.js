/**
 * KV CACHE — Shared server-side cache via Vercel KV (Redis)
 *
 * Ogni chiamata alle API esterne (Google Places, Groq) controlla prima
 * questo cache. Il primo utente che carica un'area/luogo "paga" la chiamata;
 * tutti gli altri (inclusi utenti futuri e membri del gruppo) ottengono la
 * risposta cached a costo zero.
 *
 * Setup (una tantum su Vercel):
 *   1. Dashboard → Storage → Create KV database
 *   2. Connetti al progetto → Vercel imposta automaticamente:
 *      KV_URL, KV_REST_API_URL, KV_REST_API_TOKEN, KV_REST_API_READ_ONLY_TOKEN
 *
 * Degradazione: se KV non è configurato (sviluppo locale, env vars mancanti),
 * cacheGet() ritorna null e cacheSet() è no-op. L'app funziona normalmente,
 * semplicemente senza cache condivisa.
 */

import { Redis } from '@upstash/redis';

// Inizializza Redis con le env vars che Vercel imposta automaticamente
// quando colleghi un database Upstash. Se non configurate (sviluppo locale),
// redis è null e tutte le operazioni diventano no-op.
const redis = (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
  ? new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN })
  : null;

// djb2 — veloce, deterministico, adatto a cache keys
function _hash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(h, 31) + str.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}

/**
 * Genera la KV key da endpoint + parametri (ordine indipendente).
 * Format: c1:<endpoint>:<hash>
 */
export function makeKey(endpoint, params) {
  const normalized = JSON.stringify(params, Object.keys(params).sort());
  return `c1:${endpoint}:${_hash(normalized)}`;
}

/**
 * Recupera un valore cachato. Ritorna null su miss o errore.
 */
export async function cacheGet(endpoint, params) {
  if (!redis) return null;
  try {
    const key = makeKey(endpoint, params);
    const value = await redis.get(key);
    if (value != null) {
      console.log(`[KVCache] HIT  ${endpoint} (${key})`);
      return value;
    }
    console.log(`[KVCache] MISS ${endpoint}`);
    return null;
  } catch (err) {
    console.warn(`[KVCache] get error (non-fatal): ${err.message}`);
    return null;
  }
}

/**
 * Salva un valore con TTL in secondi. No-op su errore.
 */
export async function cacheSet(endpoint, params, value, ttlSec = TTL.THIRTY_DAYS) {
  if (!redis) return;
  try {
    const key = makeKey(endpoint, params);
    await redis.set(key, value, { ex: ttlSec });
    console.log(`[KVCache] SET  ${endpoint} TTL=${ttlSec}s`);
  } catch (err) {
    console.warn(`[KVCache] set error (non-fatal): ${err.message}`);
  }
}

export const TTL = {
  THIRTY_DAYS: 2_592_000,   // 30 giorni — dati geografici stabili
  SEVEN_DAYS:    604_800,   //  7 giorni — orari/rating possono cambiare
  ONE_DAY:        86_400,   //  1 giorno — dati molto volatili
};
