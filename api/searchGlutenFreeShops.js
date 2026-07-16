/**
 * Vercel Function: searchGlutenFreeShops
 * Search for gluten-free restaurants, cafes, bakeries using Google Places API
 * URL: /api/searchGlutenFreeShops?city=Tokyo&lat=35.6762&lng=139.7505
 */

import { cacheGet, cacheSet, TTL } from './_lib/kv-cache.js';
import { checkAndConsumeQuota, quotaExceededBody } from './_lib/quota.js';
import { setAllowedOrigin } from './_lib/cors.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  setAllowedOrigin(req, res);
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { city, lat, lng } = req.query;
  const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

  if (!city || !GOOGLE_MAPS_API_KEY) {
    return res.status(400).json({ error: 'Missing city or API key', shops: [] });
  }

  // lat/lng arrotondati nella cache key: due città omonime in paesi diversi
  // (es. Kyoto/altro) non devono condividere la cache ora che il suffisso
  // "Japan" non è più hardcoded.
  const cacheParams = { city: city.toLowerCase(), ll: (lat && lng) ? `${Number(lat).toFixed(1)},${Number(lng).toFixed(1)}` : '' };
  const cached = await cacheGet('gfShops', cacheParams);
  if (cached) return res.status(200).json(cached);

  const quota = await checkAndConsumeQuota('searchGlutenFreeShops');
  if (quota.limited) return res.status(429).json(quotaExceededBody('searchGlutenFreeShops', quota.limit));

  async function fetchJson(url) {
    const resp = await fetch(url);
    return resp.json();
  }

  async function searchGlutenFreeShops() {
    // Multiple search queries per coprire diverse categorie di gluten-free.
    // Niente più " Japan" hardcoded: l'app è un planner globale, la zona la
    // àncora il location bias lat/lng (25km) passato dal client.
    const queries = [
      `gluten free restaurant ${city}`,
      `gluten free cafe ${city}`,
      `gluten free bakery ${city}`,
      `celiac friendly restaurant ${city}`,
      `coeliac restaurant ${city}`
    ];

    const allShops = new Map(); // Usa Map per evitare duplicati (by place_id)

    for (const searchQuery of queries) {
      const params = new URLSearchParams({
        query: searchQuery,
        language: 'en',
        key: GOOGLE_MAPS_API_KEY,
        type: 'restaurant'
      });

      // Aggiungi location bias se fornite coordinate
      if (lat && lng) {
        params.set('location', `${lat},${lng}`);
        params.set('radius', '25000'); // 25km radius per coprire la città
      }

      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?${params.toString()}`;

      try {
        const data = await fetchJson(url);

        if (data.status === 'OK' && Array.isArray(data.results)) {
          data.results.slice(0, 5).forEach(place => {
            if (!allShops.has(place.place_id)) {
              allShops.set(place.place_id, {
                id: `gf_${place.place_id}`,
                name: place.name,
                city: city,
                cat: 'restaurant', // Categoria
                lat: place.geometry?.location?.lat,
                lng: place.geometry?.location?.lng,
                desc: place.formatted_address || '',
                rating: place.rating || null,
                review_count: place.user_ratings_total || 0,
                types: place.types || [],
                google_maps_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.place_id}`,
                place_id: place.place_id,
                is_gluten_free: true, // Flag per identificare locali gluten-free
                source: 'google_places'
              });
            }
          });
        }

        // Pausa tra richieste per evitare rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err) {
        console.warn(`[searchGlutenFreeShops] Error with query "${searchQuery}":`, err.message);
      }
    }

    return Array.from(allShops.values());
  }

  try {
    const shops = await searchGlutenFreeShops();
    const responseBody = { city, count: shops.length, shops };
    await cacheSet('gfShops', cacheParams, responseBody, TTL.TWO_YEARS);
    return res.status(200).json(responseBody);
  } catch (error) {
    console.error('[searchGlutenFreeShops] Error:', error);
    return res.status(500).json({ error: error.message, shops: [] });
  }
}
