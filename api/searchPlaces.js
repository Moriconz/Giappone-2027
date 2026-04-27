/**
 * Vercel Function: searchPlaces
 * Proxy per Google Places API — risolve problema CORS
 * URL: /api/searchPlaces?poiName=...&city=...&apiKey=...
 */

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { poiName, city, apiKey } = req.query;

  if (!poiName || !city || !apiKey) {
    return res.status(400).json({ error: 'Missing poiName, city, or apiKey' });
  }

  try {
    // Step 1: Text Search per trovare il luogo
    const query = `${poiName} ${city} Japan`;
    const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`;

    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();

    if (!searchData.results || searchData.results.length === 0) {
      return res.status(200).json({ photos: [] });
    }

    // Step 2: Place Details per le foto
    const placeId = searchData.results[0].place_id;
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=photos&key=${apiKey}`;

    const detailsResponse = await fetch(detailsUrl);
    const detailsData = await detailsResponse.json();

    if (!detailsData.result || !detailsData.result.photos) {
      return res.status(200).json({ photos: [] });
    }

    // Step 3: Costruisci URL delle foto
    const photos = detailsData.result.photos.map(photo => ({
      url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photo.photo_reference}&key=${apiKey}`,
      attribution: photo.html_attributions?.[0] || 'Google Places'
    }));

    return res.status(200).json({ photos });
  } catch (error) {
    console.error('[searchPlaces] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
