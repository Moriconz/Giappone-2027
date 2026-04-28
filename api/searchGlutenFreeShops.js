/**
 * Vercel Function: searchGlutenFreeShops
 * Search for gluten-free restaurants, cafes, bakeries using Google Places API
 * URL: /api/searchGlutenFreeShops?city=Tokyo&lat=35.6762&lng=139.7505
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

  const { city, lat, lng } = req.query;
  const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

  if (!city || !GOOGLE_MAPS_API_KEY) {
    return res.status(400).json({ error: 'Missing city or API key', shops: [] });
  }

  async function fetchJson(url) {
    const resp = await fetch(url);
    return resp.json();
  }

  async function searchGlutenFreeShops() {
    // Multiple search queries per coprire diverse categorie di gluten-free
    const queries = [
      `gluten free restaurant ${city} Japan`,
      `gluten free cafe ${city} Japan`,
      `gluten free bakery ${city} Japan`,
      `celiac friendly restaurant ${city} Japan`,
      `coeliac restaurant ${city} Japan`
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
    return res.status(200).json({
      city: city,
      count: shops.length,
      shops: shops
    });
  } catch (error) {
    console.error('[searchGlutenFreeShops] Error:', error);
    return res.status(500).json({ error: error.message, shops: [] });
  }
}
