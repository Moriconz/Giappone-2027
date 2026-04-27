/**
 * Vercel Function: searchGooglePlacesPhotos
 * Search Google Places for a place and return official Place Photo image URLs.
 * URL: /api/searchGooglePlacesPhotos?query=...&lat=...&lng=...&city=...
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { query, lat, lng, city } = req.query;
  const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

  if (!query || !query.trim()) {
    return res.status(400).json({ error: 'Missing query parameter', photos: [] });
  }

  if (!GOOGLE_MAPS_API_KEY) {
    console.error('[searchGooglePlacesPhotos] GOOGLE_MAPS_API_KEY not set');
    return res.status(500).json({ error: 'Google Maps API key not configured', photos: [] });
  }

  const searchQuery = city ? `${query} ${city} Japan` : `${query} Japan`;
  const findParams = new URLSearchParams({
    input: searchQuery,
    inputtype: 'textquery',
    fields: 'place_id,name,formatted_address,photos',
    language: 'en'
  });

  if (lat && lng) {
    findParams.set('locationbias', `circle:2000@${lat},${lng}`);
  }
  findParams.set('key', GOOGLE_MAPS_API_KEY);

  try {
    const findUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?${findParams.toString()}`;
    const findResp = await fetch(findUrl);
    const findData = await findResp.json();

    if (findData.status === 'OK' && Array.isArray(findData.candidates) && findData.candidates.length) {
      const place = findData.candidates[0];
      const placeLink = place.place_id
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name || query)}&query_place_id=${place.place_id}`
        : `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(place.name || query)}`;
      let photos = Array.isArray(place.photos) ? place.photos.slice(0, 5).map(photo => ({
        url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photo.photo_reference}&key=${GOOGLE_MAPS_API_KEY}`,
        width: photo.width,
        height: photo.height,
        source: 'google_places',
        link: placeLink
      })) : [];

      if (!photos.length && place.place_id) {
        const detailsParams = new URLSearchParams({
          place_id: place.place_id,
          fields: 'name,formatted_address,photos',
          language: 'en',
          key: GOOGLE_MAPS_API_KEY
        });
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?${detailsParams.toString()}`;
        const detailsResp = await fetch(detailsUrl);
        const detailsData = await detailsResp.json();
        if (detailsData.status === 'OK' && detailsData.result) {
          const detailLink = detailsData.result.place_id
            ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(detailsData.result.name || query)}&query_place_id=${detailsData.result.place_id}`
            : `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(detailsData.result.name || query)}`;
          photos = Array.isArray(detailsData.result.photos)
            ? detailsData.result.photos.slice(0, 5).map(photo => ({
              url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photo.photo_reference}&key=${GOOGLE_MAPS_API_KEY}`,
              width: photo.width,
              height: photo.height,
              source: 'google_places',
              link: detailLink
            }))
            : [];
        }
      }

      return res.status(200).json({ place, photos });
    }

    const textParams = new URLSearchParams({
      query: searchQuery,
      language: 'en',
      key: GOOGLE_MAPS_API_KEY
    });
    if (lat && lng) {
      textParams.set('location', `${lat},${lng}`);
      textParams.set('radius', '5000');
    }

    const textUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?${textParams.toString()}`;
    const textResp = await fetch(textUrl);
    const textData = await textResp.json();

    if (textData.status === 'OK' && Array.isArray(textData.results) && textData.results.length) {
      const place = textData.results[0];
      const placeLink = place.place_id
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name || query)}&query_place_id=${place.place_id}`
        : `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(place.name || query)}`;
      const photos = Array.isArray(place.photos) ? place.photos.slice(0, 5).map(photo => ({
        url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photo.photo_reference}&key=${GOOGLE_MAPS_API_KEY}`,
        width: photo.width,
        height: photo.height,
        source: 'google_places',
        link: placeLink
      })) : [];
      return res.status(200).json({ place, photos });
    }

    return res.status(200).json({ place: null, photos: [] });
  } catch (error) {
    console.error('[searchGooglePlacesPhotos] Error:', error);
    return res.status(500).json({ error: error.message, photos: [] });
  }
}
