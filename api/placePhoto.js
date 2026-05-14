/**
 * Endpoint per convertire Google Places photo_reference in URL diretto
 *
 * Usage: /api/placePhoto?reference=PHOTO_REFERENCE&maxwidth=400
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

  const { reference, photoName, maxwidth = '400', maxheight = '600' } = req.query;
  const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

  if (!GOOGLE_API_KEY) {
    return res.status(500).json({ error: 'Google API key not configured' });
  }

  if (!reference && !photoName) {
    return res.status(400).json({ error: 'Missing photo reference or photoName' });
  }

  // Support both old API (reference) and new API (photoName)
  let photoUrl;

  if (photoName) {
    // New Places API (V1) - photo.name format: "places/abc123/photos/xyz"
    photoUrl = `https://places.googleapis.com/v1/${encodeURIComponent(photoName)}/media?maxHeightPx=${encodeURIComponent(maxheight)}&maxWidthPx=${encodeURIComponent(maxwidth)}&key=${GOOGLE_API_KEY}`;
  } else {
    // Old Places API - using photo_reference
    photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${encodeURIComponent(maxwidth)}&photoreference=${encodeURIComponent(reference)}&key=${GOOGLE_API_KEY}`;
  }

  try {
    const response = await fetch(photoUrl);

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Photo not found' });
    }

    // Get the image buffer
    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    // Set cache headers for 30 days
    res.setHeader('Cache-Control', 'public, max-age=2592000');
    res.setHeader('Content-Type', contentType);
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('[placePhoto] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
