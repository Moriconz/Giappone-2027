/**
 * Vercel Function: searchUnsplash
 * Search Unsplash photos with API key stored securely on server
 * URL: /api/searchUnsplash?query=...
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
    return res.status(400).json({ error: 'Missing query parameter' });
  }

  if (!UNSPLASH_API_KEY) {
    return res.status(500).json({ error: 'Unsplash API key not configured on server' });
  }

  try {
    // Call Unsplash API from server (API key stays secure)
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=5&order_by=relevant`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Client-ID ${UNSPLASH_API_KEY}`
      }
    });

    if (!response.ok) {
      console.error('[searchUnsplash] Unsplash API error:', response.status, response.statusText);
      return res.status(response.status).json({ error: 'Unsplash API error', results: [] });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('[searchUnsplash] Error:', error);
    return res.status(500).json({ error: error.message, results: [] });
  }
}
