/**
 * VERCEL SERVERLESS FUNCTION — POI Verification with Google Places
 *
 * Endpoint: POST /api/verifyPOIs
 * Body: { pois: [{id, name, lat, lng, cat, city}, ...], radiusM: 500 }
 * Returns: { verified: [{localId, googlePlaceId, ...allGoogleData}, ...], errors: [...] }
 */

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const RATE_LIMIT_DELAY_MS = 200; // 5 requests/sec max

// Helper: delay for rate limiting
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: name similarity check (first 5 chars)
const namesMatch = (local, google) => {
  const localBase = local.toLowerCase().substring(0, 5);
  const googleBase = google.toLowerCase().substring(0, 5);
  return localBase === googleBase;
};

// Helper: category mapping
const getCategoryKeywords = (cat) => {
  const map = {
    food: ['restaurant', 'cafe', 'bakery', 'ramen', 'sushi', 'izakaya'],
    drink: ['bar', 'cafe', 'pub', 'nightlife'],
    shop: ['shopping_mall', 'store', 'supermarket'],
    sight: ['tourist_attraction', 'museum', 'temple', 'shrine'],
  };
  return map[cat] || [];
};

// Main verification function
async function verifyPOI(poi, radiusM = 500) {
  try {
    // Step 1: Nearby Search
    const nearbyUrl = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
    nearbyUrl.searchParams.set('location', `${poi.lat},${poi.lng}`);
    nearbyUrl.searchParams.set('radius', String(radiusM));
    nearbyUrl.searchParams.set('keyword', poi.name);
    nearbyUrl.searchParams.set('key', GOOGLE_API_KEY);

    const nearbyRes = await fetch(nearbyUrl.toString());
    const nearbyData = await nearbyRes.json();

    if (nearbyData.status !== 'OK' || !nearbyData.results?.length) {
      return { error: `No results for ${poi.name}` };
    }

    // Step 2: Filter by name match
    let match = nearbyData.results.find(r => namesMatch(poi.name, r.name));

    if (!match) {
      return { error: `Name mismatch for ${poi.name}` };
    }

    // Step 3: Get full details
    const detailsUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json');
    detailsUrl.searchParams.set('place_id', match.place_id);
    detailsUrl.searchParams.set('fields', [
      // Basic
      'name', 'place_id', 'geometry', 'formatted_address', 'address_component',
      // Contact
      'phone_number', 'international_phone_number', 'website', 'email',
      // Details
      'rating', 'user_ratings_total', 'review_count', 'types',
      // Hours
      'opening_hours', 'current_opening_hours',
      // Photos
      'photos',
      // Business
      'business_status', 'formatted_phone_number',
      // URL
      'url'
    ].join(','));
    detailsUrl.searchParams.set('key', GOOGLE_API_KEY);

    const detailsRes = await fetch(detailsUrl.toString());
    const detailsData = await detailsRes.json();

    if (detailsData.status !== 'OK') {
      return { error: `Details failed for ${poi.name}: ${detailsData.status}` };
    }

    const result = detailsData.result;

    // Step 4: Extract address components
    const addressComponents = {};
    if (result.address_components) {
      result.address_components.forEach(comp => {
        const type = comp.types[0];
        addressComponents[type] = comp.long_name;
      });
    }

    // Step 5: Extract photos
    const photoReferences = [];
    if (result.photos) {
      result.photos.forEach(photo => {
        photoReferences.push({
          reference: photo.photo_reference,
          height: photo.height,
          width: photo.width,
          attribution: photo.html_attributions || []
        });
      });
    }

    // Step 6: Extract opening hours
    const openingHours = {};
    if (result.opening_hours?.weekday_text) {
      result.opening_hours.weekday_text.forEach((text, i) => {
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        openingHours[days[i]] = text;
      });
    }

    // Verified POI object
    return {
      verified: true,
      localId: poi.id,
      googlePlaceId: result.place_id,

      // Basic
      name: result.name,
      category: poi.cat,

      // Location
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
      address: result.formatted_address,

      // Address components
      addressCity: addressComponents.locality,
      addressCountry: addressComponents.country,
      addressPostalCode: addressComponents.postal_code,
      addressProvince: addressComponents.administrative_area_level_1,

      // Contact
      phone: result.phone_number,
      phoneInternational: result.international_phone_number,
      website: result.website,
      email: result.email || null,
      url: result.url, // Google Maps URL

      // Business info
      businessStatus: result.business_status,
      types: result.types || [],

      // Rating
      rating: result.rating || null,
      ratingCount: result.user_ratings_total || 0,
      reviewCount: result.review_count || 0,

      // Hours
      openingHours: openingHours,
      isOpenNow: result.opening_hours?.open_now || null,

      // Media
      photoReferences: photoReferences,
      formattedPhoneNumber: result.formatted_phone_number,

      // Metadata
      verifiedAt: new Date().toISOString(),
      verifiedTimestamp: Date.now()
    };
  } catch (err) {
    return { error: `Exception for ${poi.name}: ${err.message}` };
  }
}

// Main handler
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
    const { pois, radiusM = 500 } = req.body;

    if (!Array.isArray(pois) || pois.length === 0) {
      return res.status(400).json({ error: 'pois must be non-empty array' });
    }

    if (pois.length > 50) {
      return res.status(400).json({ error: 'Max 50 POIs per request' });
    }

    console.log(`[verifyPOIs] Processing ${pois.length} POIs with radius ${radiusM}m`);

    const verified = [];
    const errors = [];

    // Process with rate limiting
    for (let i = 0; i < pois.length; i++) {
      const poi = pois[i];
      console.log(`[verifyPOIs] [${i + 1}/${pois.length}] Verifying: ${poi.name}`);

      const result = await verifyPOI(poi, radiusM);

      if (result.verified) {
        verified.push(result);
      } else {
        errors.push({
          poiId: poi.id,
          poiName: poi.name,
          error: result.error
        });
      }

      // Rate limiting
      if (i < pois.length - 1) {
        await delay(RATE_LIMIT_DELAY_MS);
      }
    }

    console.log(`[verifyPOIs] Complete: ${verified.length} verified, ${errors.length} errors`);

    return res.status(200).json({
      timestamp: new Date().toISOString(),
      verified,
      errors,
      stats: {
        total: pois.length,
        verifiedCount: verified.length,
        errorCount: errors.length,
        successRate: ((verified.length / pois.length) * 100).toFixed(2) + '%'
      }
    });
  } catch (err) {
    console.error('[verifyPOIs] Fatal error:', err);
    return res.status(500).json({ error: err.message });
  }
}
