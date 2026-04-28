/**
 * Vercel Function: enrichPOI
 * Valida e arricchisce 1 POI con dati da Google Places
 * URL: /api/enrichPOI?id=poi-123&name=Tokyo Tower&lat=35.6762&lng=139.7505
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { id, name, lat, lng } = req.query;
  const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

  if (!id || !name || !GOOGLE_MAPS_API_KEY) {
    return res.status(400).json({ error: 'Missing parameters', poi: null });
  }

  async function fetchJson(url) {
    const resp = await fetch(url);
    return resp.json();
  }

  try {
    // 1. FIND PLACE - Trova il luogo su Google Places
    const findParams = new URLSearchParams({
      input: name,
      inputtype: 'textquery',
      fields: 'place_id,name,formatted_address,geometry,type,photos',
      language: 'en',
      key: GOOGLE_MAPS_API_KEY
    });

    if (lat && lng) {
      findParams.set('locationbias', `circle:2000@${lat},${lng}`);
    }

    const findUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?${findParams.toString()}`;
    const findData = await fetchJson(findUrl);

    if (findData.status !== 'OK' || !findData.candidates?.[0]) {
      return res.status(200).json({
        poi: {
          id,
          name,
          lat,
          lng,
          validated: false,
          error: 'Place not found on Google Maps'
        }
      });
    }

    const place = findData.candidates[0];
    const placeId = place.place_id;

    // 2. GET DETAILS - Dettagli completi del luogo
    const detailsParams = new URLSearchParams({
      place_id: placeId,
      fields: 'name,formatted_address,geometry,rating,user_ratings_total,opening_hours,website,phone,types,price_level,formatted_phone_number,photos',
      language: 'en',
      key: GOOGLE_MAPS_API_KEY
    });

    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?${detailsParams.toString()}`;
    const detailsData = await fetchJson(detailsUrl);

    if (detailsData.status !== 'OK' || !detailsData.result) {
      return res.status(200).json({
        poi: {
          id,
          name,
          lat,
          lng,
          validated: false,
          place_id: placeId
        }
      });
    }

    const details = detailsData.result;

    // 3. EXTRACT PHOTOS - Estrai fino a 3 foto
    const photos = (details.photos || []).slice(0, 3).map(photo => ({
      url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photo.photo_reference}&key=${GOOGLE_MAPS_API_KEY}`,
      credit: photo.html_attributions?.[0] || 'Google Maps'
    }));

    // 4. DETERMINE CATEGORY - Determina la categoria da Google types
    const googleTypes = details.types || [];
    let inferredCategory = 'poi'; // default

    const categoryMap = {
      'restaurant': 'restaurant',
      'cafe': 'cafe',
      'museum': 'museum',
      'park': 'park',
      'temple': 'temple',
      'shrine': 'shrine',
      'store': 'shop',
      'shopping_mall': 'shop',
      'hotel': 'hotel',
      'hospital': 'hospital',
      'point_of_interest': 'poi',
      'tourist_attraction': 'poi',
      'art_gallery': 'gallery',
      'library': 'library'
    };

    for (const type of googleTypes) {
      if (categoryMap[type]) {
        inferredCategory = categoryMap[type];
        break;
      }
    }

    // 5. BUILD RESPONSE
    const enrichedPOI = {
      id,
      name: details.name,
      lat: details.geometry?.location?.lat || lat,
      lng: details.geometry?.location?.lng || lng,
      desc: details.formatted_address || '',
      phone: details.formatted_phone_number || details.phone || null,
      website: details.website || null,
      rating: details.rating || null,
      review_count: details.user_ratings_total || 0,
      price_level: details.price_level || null,
      inferred_category: inferredCategory,
      google_types: googleTypes,
      opening_hours: details.opening_hours?.weekday_text || null,
      is_open: details.opening_hours?.open_now || null,
      photos: photos,
      place_id: placeId,
      validated: true,
      validated_at: new Date().toISOString(),
      google_maps_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(details.name)}&query_place_id=${placeId}`
    };

    return res.status(200).json({ poi: enrichedPOI });

  } catch (error) {
    console.error('[enrichPOI] Error:', error);
    return res.status(500).json({ error: error.message, poi: null });
  }
}
