/**
 * GOOGLE PLACES DETAILS API — Enhanced POI Data
 *
 * Endpoint: POST /api/googlePlacesDetails
 * Body: { placeId: "string" }
 * Returns: {
 *   displayName, editorialSummary, rating, userRatingCount,
 *   currentOpeningHours, priceLevel, websiteUri, nationalPhoneNumber,
 *   photos, reviews, accessibilityOptions,
 *   servesLunch, servesDinner, reservable, takeout, servesBeer, servesVegetarianFood
 * }
 */

import { cacheGet, cacheSet, TTL } from './_lib/kv-cache.js';
import { setAllowedOrigin } from './_lib/cors.js';

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

console.log('[googlePlacesDetails] API Key:', GOOGLE_PLACES_API_KEY ? '✅' : '❌');

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  setAllowedOrigin(req, res);
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

  if (!GOOGLE_PLACES_API_KEY) {
    return res.status(500).json({ error: 'Google API key not configured' });
  }

  try {
    const { placeId } = req.body;

    if (!placeId || typeof placeId !== 'string') {
      return res.status(400).json({ error: 'placeId required' });
    }

    const cacheParams = { placeId };
    const cached = await cacheGet('details', cacheParams);
    if (cached) return res.status(200).json(cached);

    console.log(`[googlePlacesDetails] Fetching details for place_id: ${placeId}`);

    // FieldMask per ottimizzare costi API
    const fieldMask = [
      'places.id',
      'places.displayName',
      'places.editorialSummary',
      'places.rating',
      'places.userRatingCount',
      'places.currentOpeningHours',
      'places.priceLevel',
      'places.websiteUri',
      'places.nationalPhoneNumber',
      'places.photos',
      'places.reviews',
      'places.accessibilityOptions',
      'places.servesLunch',
      'places.servesDinner',
      'places.reservable',
      'places.takeout',
      'places.servesBeer',
      'places.servesVegetarianFood'
    ].join(',');

    // Chiamata a Google Places Details API (New)
    const url = `https://places.googleapis.com/v1/places/${placeId}`;
    const detailsRes = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
        'X-Goog-FieldMask': fieldMask
      }
    });

    if (!detailsRes.ok) {
      const errorText = await detailsRes.text();
      console.error(`[googlePlacesDetails] API error: ${detailsRes.status}`, errorText);
      return res.status(detailsRes.status).json({
        error: `Google Places API error: ${detailsRes.status}`,
        details: errorText
      });
    }

    const detailsData = await detailsRes.json();

    // Transform response
    const result = {
      id: detailsData.id,
      displayName: detailsData.displayName?.text || null,
      editorialSummary: detailsData.editorialSummary?.text || null,
      rating: detailsData.rating || null,
      userRatingCount: detailsData.userRatingCount || 0,
      currentOpeningHours: detailsData.currentOpeningHours || null,
      priceLevel: detailsData.priceLevel || null,
      websiteUri: detailsData.websiteUri || null,
      nationalPhoneNumber: detailsData.nationalPhoneNumber || null,
      // Photos: restituisci name, non URL (gli URL hanno TTL di 3 giorni)
      photos: (detailsData.photos || []).map(photo => ({
        name: photo.name, // es. "places/abc123/photos/xyz"
        heightPx: photo.heightPx,
        widthPx: photo.widthPx,
        attribution: photo.attributions || []
      })),
      // Reviews: ultimi 5
      reviews: (detailsData.reviews || []).slice(0, 5).map(review => ({
        author: review.authorAttribution?.displayName || 'Anonimo',
        rating: review.rating || 0,
        text: review.originalText || '',
        relativePublishTimeDescription: review.relativePublishTimeDescription || ''
      })),
      accessibilityOptions: detailsData.accessibilityOptions || {},
      // Restaurant attributes
      servesLunch: detailsData.servesLunch || false,
      servesDinner: detailsData.servesDinner || false,
      reservable: detailsData.reservable || false,
      takeout: detailsData.takeout || false,
      servesBeer: detailsData.servesBeer || false,
      servesVegetarianFood: detailsData.servesVegetarianFood || false
    };

    console.log(`[googlePlacesDetails] Success:`, {
      name: result.displayName,
      hasEditorial: !!result.editorialSummary,
      rating: result.rating,
      photos: result.photos.length,
      reviews: result.reviews.length
    });

    await cacheSet('details', cacheParams, result, TTL.SEVEN_DAYS);
    return res.status(200).json(result);

  } catch (err) {
    console.error('[googlePlacesDetails] Fatal error:', err);
    return res.status(500).json({ error: err.message });
  }
}
