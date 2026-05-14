/**
 * VERCEL SERVERLESS FUNCTION — Google Places Nearby Search
 *
 * Endpoint: POST /api/googlePlacesNearby
 * Body: { lat, lng, radiusM }
 * Returns: { results: [...POIs from Google Places] }
 */

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const RATE_LIMIT_DELAY_MS = 200; // 5 requests/sec max

console.log('[googlePlacesNearby] API Key loaded:', GOOGLE_API_KEY ? '✅ YES' : '❌ MISSING');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!GOOGLE_API_KEY) {
    return res.status(500).json({ error: 'Google API key not configured' });
  }

  try {
    const { lat, lng, radiusM = 1000, type = null } = req.body;

    if (!lat || !lng || typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({ error: 'lat and lng must be numbers' });
    }

    if (radiusM < 100 || radiusM > 50000) {
      return res.status(400).json({ error: 'radiusM must be between 100 and 50000' });
    }

    console.log(`[googlePlacesNearby] Search: ${lat}, ${lng}, radius ${radiusM}m${type ? `, type: ${type}` : ''}`);

    // Google Places Nearby Search API
    const nearbyUrl = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
    nearbyUrl.searchParams.set('location', `${lat},${lng}`);
    nearbyUrl.searchParams.set('radius', String(radiusM));
    nearbyUrl.searchParams.set('key', GOOGLE_API_KEY);

    // Optional: filter by type if provided (supports single type or array)
    if (type) {
      nearbyUrl.searchParams.set('type', Array.isArray(type) ? type[0] : type);
    }

    const nearbyRes = await fetch(nearbyUrl.toString());
    const nearbyData = await nearbyRes.json();

    console.log(`[googlePlacesNearby] Response status: ${nearbyData.status}`);

    if (nearbyData.status === 'ZERO_RESULTS') {
      return res.status(200).json({
        results: [],
        status: 'ZERO_RESULTS',
        message: 'No places found in this radius'
      });
    }

    if (nearbyData.status !== 'OK') {
      const errorMsg = nearbyData.error_message || nearbyData.status;
      return res.status(400).json({
        error: `Google Places API error: ${errorMsg}`,
        status: nearbyData.status
      });
    }

    // Return raw results from Google Places
    const results = (nearbyData.results || []).map(place => ({
      place_id: place.place_id,
      name: place.name,
      vicinity: place.vicinity,
      formatted_address: place.formatted_address,
      geometry: place.geometry,
      rating: place.rating,
      user_ratings_total: place.user_ratings_total,
      types: place.types,
      business_status: place.business_status,
      icon: place.icon,
      photos: place.photos,
      opening_hours: place.opening_hours
    }));

    console.log(`[googlePlacesNearby] Returning ${results.length} results`);

    return res.status(200).json({
      results,
      status: 'OK',
      count: results.length,
      lat,
      lng,
      radiusM
    });
  } catch (err) {
    console.error('[googlePlacesNearby] Fatal error:', err);
    return res.status(500).json({ error: err.message });
  }
}
