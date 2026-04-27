/**
 * Vercel Function: reverseGeocode
 * Reverse geocoding per ottenere nomi reali da coordinate geografiche
 * URL: /api/reverseGeocode?lat=...&lng=...&apiKey=...
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

  const { lat, lng, apiKey } = req.query;

  if (!lat || !lng || !apiKey) {
    return res.status(400).json({ error: 'Missing lat, lng, or apiKey' });
  }

  try {
    // Reverse Geocoding: coordinate → place name
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=en&key=${apiKey}`;

    const response = await fetch(geocodeUrl);
    const data = await response.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      // Estrai il nome del luogo (prima parte dell'indirizzo formattato)
      const fullAddress = data.results[0].formatted_address;
      const placeName = fullAddress.split(',')[0].trim();

      return res.status(200).json({ name: placeName });
    }

    // Se nessun risultato trovato
    return res.status(200).json({ name: null, status: data.status });
  } catch (error) {
    console.error('[reverseGeocode] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
