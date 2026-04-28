/**
 * Vercel Function: batchValidatePOIs
 * Batch job per validare N POI per notte (max 10 per richiesta)
 * Pensato per Vercel Cron: /api/batchValidatePOIs?secret=YOUR_SECRET (ogni notte)
 *
 * URL: /api/batchValidatePOIs?secret=xyz&count=10
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

  // Verifica secret per evitare abuso
  const SECRET = process.env.BATCH_VALIDATE_SECRET;
  const secret = req.query.secret;

  if (!SECRET || secret !== SECRET) {
    return res.status(401).json({ error: 'Unauthorized', processed: 0 });
  }

  const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
  if (!GOOGLE_MAPS_API_KEY) {
    return res.status(400).json({ error: 'Missing API key', processed: 0 });
  }

  const count = Math.min(parseInt(req.query.count || '10'), 10); // max 10 per request

  async function fetchJson(url) {
    const resp = await fetch(url);
    return resp.json();
  }

  async function enrichPOI(poiData) {
    try {
      const { id, name, lat, lng } = poiData;
      if (!name || !lat || !lng) return null;

      const findParams = new URLSearchParams({
        input: name,
        inputtype: 'textquery',
        fields: 'place_id,name,formatted_address,geometry,photos',
        language: 'en',
        key: GOOGLE_MAPS_API_KEY
      });
      findParams.set('locationbias', `circle:2000@${lat},${lng}`);

      const findUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?${findParams.toString()}`;
      const findData = await fetchJson(findUrl);

      if (findData.status !== 'OK' || !findData.candidates?.[0]) {
        return null;
      }

      const place = findData.candidates[0];
      const detailsParams = new URLSearchParams({
        place_id: place.place_id,
        fields: 'name,formatted_address,geometry,rating,user_ratings_total,opening_hours,website,phone,types,price_level,formatted_phone_number,photos',
        language: 'en',
        key: GOOGLE_MAPS_API_KEY
      });

      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?${detailsParams.toString()}`;
      const detailsData = await fetchJson(detailsUrl);

      if (detailsData.status !== 'OK' || !detailsData.result) {
        return null;
      }

      const details = detailsData.result;
      const photos = (details.photos || []).slice(0, 3).map(photo => ({
        url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photo.photo_reference}&key=${GOOGLE_MAPS_API_KEY}`,
        credit: photo.html_attributions?.[0] || 'Google Maps'
      }));

      const categoryMap = {
        'restaurant': 'restaurant', 'cafe': 'cafe', 'museum': 'museum',
        'park': 'park', 'temple': 'temple', 'shrine': 'shrine',
        'store': 'shop', 'shopping_mall': 'shop', 'hotel': 'hotel',
        'hospital': 'hospital', 'art_gallery': 'gallery', 'library': 'library'
      };

      let inferredCategory = 'poi';
      for (const type of (details.types || [])) {
        if (categoryMap[type]) {
          inferredCategory = categoryMap[type];
          break;
        }
      }

      return {
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
        google_types: details.types || [],
        opening_hours: details.opening_hours?.weekday_text || null,
        is_open: details.opening_hours?.open_now || null,
        photos: photos,
        place_id: place.place_id,
        validated: true,
        validated_at: new Date().toISOString()
      };
    } catch (err) {
      console.error('[batchValidate] Error enriching POI:', err.message);
      return null;
    }
  }

  // DEMO: Qui andresti a leggere da un DB quali POI non sono stati validati
  // Per ora, ritorna un risultato di esempio
  // In produzione: leggi dal tuo DB (supabase, mongodb, ecc.)

  const results = {
    timestamp: new Date().toISOString(),
    processed: 0,
    successful: 0,
    failed: 0,
    pois: []
  };

  // Questo è uno stub - in produzione, avresti:
  // 1. Una lista di POI non ancora validati dal tuo DB
  // 2. Selezionare i primi `count` POI
  // 3. Enrichirli
  // 4. Salvare i risultati nel DB

  return res.status(200).json({
    message: 'Batch validation job ready. Integrate with your database.',
    note: 'This is a template. You need to: 1) Connect to your POI database 2) Fetch unvalidated POIs 3) Call enrichPOI for each 4) Save results back',
    ...results
  });
}
