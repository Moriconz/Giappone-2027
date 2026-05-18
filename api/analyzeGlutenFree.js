/**
 * Vercel Function: analyzeGlutenFree
 * Analizza le review su Google Places per determinare il livello gluten-free di un locale
 * URL: /api/analyzeGlutenFree?place_id=xyz&name=Restaurant&city=Tokyo
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

  const { place_id, name, city } = req.query;
  const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

  if (!place_id && !name) {
    return res.status(400).json({ error: 'Missing place_id or name', gf: null });
  }

  if (!GOOGLE_MAPS_API_KEY) {
    return res.status(400).json({ error: 'Missing API key', gf: null });
  }

  async function fetchJson(url) {
    const resp = await fetch(url);
    return resp.json();
  }

  // Keywords per riconoscere gluten-free nelle review
  const GF_KEYWORDS = [
    'gluten free', 'gluten-free', 'glutenfree',
    'celiac', 'coeliac', 'celiac friendly',
    'gf', 'gf menu', 'gf options',
    'no gluten', 'without gluten',
    '小麦', // Gluten in Japanese (wheat)
  ];

  const NO_GF_KEYWORDS = [
    'not gluten free', 'no gluten free', 'no gf',
    'contains gluten', 'full gluten'
  ];

  try {
    let details = null;

    // Se hai place_id, prendi i dettagli da lì
    if (place_id) {
      const detailsParams = new URLSearchParams({
        place_id: place_id,
        fields: 'name,formatted_address,rating,user_ratings_total,reviews',
        language: 'en',
        key: GOOGLE_MAPS_API_KEY
      });

      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?${detailsParams.toString()}`;
      const detailsData = await fetchJson(detailsUrl);

      if (detailsData.status === 'OK' && detailsData.result) {
        details = detailsData.result;
      }
    } else {
      // Se no, cerca il locale per nome + città
      const findParams = new URLSearchParams({
        input: `${name} ${city}`,
        inputtype: 'textquery',
        fields: 'place_id,name,formatted_address,rating,user_ratings_total,reviews',
        language: 'en',
        key: GOOGLE_MAPS_API_KEY
      });

      const findUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?${findParams.toString()}`;
      const findData = await fetchJson(findUrl);

      if (findData.status === 'OK' && findData.candidates?.[0]) {
        const place = findData.candidates[0];
        const detailsParams = new URLSearchParams({
          place_id: place.place_id,
          fields: 'name,formatted_address,rating,user_ratings_total,reviews',
          language: 'en',
          key: GOOGLE_MAPS_API_KEY
        });

        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?${detailsParams.toString()}`;
        const detailsData = await fetchJson(detailsUrl);

        if (detailsData.status === 'OK') {
          details = detailsData.result;
        }
      }
    }

    if (!details) {
      return res.status(200).json({
        gf: { lvl: 'unknown', confidence: 0, source: 'no_data' }
      });
    }

    // Analizza le review per keyword gluten-free
    const reviews = details.reviews || [];
    let gfMentions = 0;
    let noGfMentions = 0;
    let gfText = '';

    reviews.forEach(review => {
      const text = (review.text || '').toLowerCase();

      // Controlla keyword gluten-free
      GF_KEYWORDS.forEach(kw => {
        if (text.includes(kw.toLowerCase())) {
          gfMentions++;
        }
      });

      // Controlla keyword "no gluten-free"
      NO_GF_KEYWORDS.forEach(kw => {
        if (text.includes(kw.toLowerCase())) {
          noGfMentions++;
        }
      });
    });

    // Determina il livello gluten-free basato su analisi
    let gfLevel = 'unknown';
    let confidence = 0;

    if (reviews.length > 0) {
      const gfRatio = gfMentions / reviews.length;

      if (gfMentions >= 3) {
        gfLevel = 'full'; // Almeno 3 menzioni di gluten-free
        confidence = Math.min(95, (gfMentions / reviews.length) * 100);
      } else if (gfMentions >= 1) {
        gfLevel = 'partial'; // 1-2 menzioni
        confidence = (gfMentions / reviews.length) * 100;
      } else if (noGfMentions >= 1) {
        gfLevel = 'no'; // Menzioni esplicite di "non gluten-free"
        confidence = 80;
      } else {
        gfLevel = 'unknown';
        confidence = 0;
      }
    }

    return res.status(200).json({
      gf: {
        lvl: gfLevel,
        confidence: Math.round(confidence),
        mentions: gfMentions,
        no_mentions: noGfMentions,
        total_reviews: reviews.length,
        source: 'google_places_reviews'
      }
    });

  } catch (error) {
    console.error('[analyzeGlutenFree] Error:', error);
    return res.status(500).json({ error: error.message, gf: null });
  }
}
