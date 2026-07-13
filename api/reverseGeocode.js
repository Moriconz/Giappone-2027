/**
 * Vercel Function: reverseGeocode
 * Reverse geocoding per ottenere nomi reali da coordinate geografiche
 * API key stored securely on server (NOT passed via client)
 * URL: /api/reverseGeocode?lat=...&lng=...
 */

import { cacheGet, cacheSet, TTL } from './_lib/kv-cache.js';
import { setAllowedOrigin } from './_lib/cors.js';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  setAllowedOrigin(req, res);
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { lat, lng } = req.query;
  const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

  if (!lat || !lng) {
    return res.status(400).json({ error: 'Missing lat or lng' });
  }

  if (!GOOGLE_MAPS_API_KEY) {
    return res.status(500).json({ error: 'Google Maps API key not configured on server' });
  }

  // Arrotonda a 3 decimali (~110m) — coordinate vicine condividono il risultato
  const cacheParams = {
    lat: Math.round(parseFloat(lat) * 1000) / 1000,
    lng: Math.round(parseFloat(lng) * 1000) / 1000
  };
  const cached = await cacheGet('reverseGeocode', cacheParams);
  if (cached) return res.status(200).json(cached);

  try {
    // Reverse Geocoding: coordinate → place name
    // API key stays on server — NOT exposed to client
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=en&key=${GOOGLE_MAPS_API_KEY}`;

    const response = await fetch(geocodeUrl);
    const data = await response.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      // Estrai il nome del luogo (prima parte dell'indirizzo formattato)
      const fullAddress = data.results[0].formatted_address;
      const placeName = fullAddress.split(',')[0].trim();
      const responseBody = { name: placeName };
      await cacheSet('reverseGeocode', cacheParams, responseBody, TTL.THIRTY_DAYS);
      return res.status(200).json(responseBody);
    }

    // Se nessun risultato trovato
    return res.status(200).json({ name: null, status: data.status });
  } catch (error) {
    console.error('[reverseGeocode] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
