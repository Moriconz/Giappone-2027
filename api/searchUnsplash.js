/**
 * Vercel Function: searchUnsplash
 * Search Unsplash photos with API key stored securely on server
 *
 * Usage: /api/searchUnsplash?query=Senso-ji%20Temple
 *
 * Returns Unsplash API response: { results: [{ urls, user, links, ... }] }
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

  const { query } = req.query;
  const UNSPLASH_API_KEY = process.env.UNSPLASH_API_KEY;

  if (!query) {
    return res.status(400).json({ error: 'Missing query parameter', results: [] });
  }

  if (!UNSPLASH_API_KEY) {
    console.error('[searchUnsplash] UNSPLASH_API_KEY not set in environment');
    return res.status(500).json({ error: 'API key not configured', results: [] });
  }

  try {
    // Official Unsplash API endpoint
    // https://unsplash.com/documentation#search-photos
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=5&order_by=relevant`;

    console.log('[searchUnsplash] Searching for:', query);

    const response = await fetch(url, {
      headers: {
        'Authorization': `Client-ID ${UNSPLASH_API_KEY}`,
        'Accept-Version': 'v1'
      }
    });

    if (!response.ok) {
      console.error('[searchUnsplash] Unsplash API error:', response.status);
      return res.status(response.status).json({
        error: `Unsplash API returned ${response.status}`,
        results: []
      });
    }

    const data = await response.json();

    // Unsplash returns: { results: [...], total: N, total_pages: N }
    console.log('[searchUnsplash] Got', data.results?.length || 0, 'photos');

    return res.status(200).json({
      results: data.results || []
    });
  } catch (error) {
    console.error('[searchUnsplash] Fetch error:', error.message);
    return res.status(500).json({
      error: error.message,
      results: []
    });
  }
}
