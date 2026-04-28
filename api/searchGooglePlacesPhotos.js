/**
 * Vercel Function: searchGooglePlacesPhotos
 * Search multiple official sources for place photos and return image URLs.
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
  const GOOGLE_CUSTOM_SEARCH_API_KEY = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
  const GOOGLE_CUSTOM_SEARCH_CX = process.env.GOOGLE_CUSTOM_SEARCH_CX;

  if (!query || !query.trim()) {
    return res.status(400).json({ error: 'Missing query parameter', photos: [] });
  }

  const searchQuery = city ? `${query} ${city} Japan` : `${query} Japan`;
  const placeQuery = query.trim();

  function buildPhoto(url, source, link, width = null, height = null, author = null) {
    return { url, source, link, width, height, author };
  }

  async function fetchJson(url) {
    const resp = await fetch(url);
    return resp.json();
  }

  async function searchGooglePlacesPhotos() {
    if (!GOOGLE_MAPS_API_KEY) return { place: null, photos: [] };

    const findParams = new URLSearchParams({
      input: searchQuery,
      inputtype: 'textquery',
      fields: 'place_id,name,formatted_address,photos',
      language: 'en',
      key: GOOGLE_MAPS_API_KEY
    });
    if (lat && lng) findParams.set('locationbias', `circle:2000@${lat},${lng}`);

    const findUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?${findParams.toString()}`;
    const findData = await fetchJson(findUrl);
    if (findData.status === 'OK' && Array.isArray(findData.candidates) && findData.candidates.length) {
      const place = findData.candidates[0];
      const placeLink = place.place_id
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name || placeQuery)}&query_place_id=${place.place_id}`
        : `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(place.name || placeQuery)}`;

      let photos = Array.isArray(place.photos)
        ? place.photos.slice(0, 5).map(photo => buildPhoto(
          `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photo.photo_reference}&key=${GOOGLE_MAPS_API_KEY}`,
          'google_places',
          placeLink,
          photo.width,
          photo.height,
          place.name
        ))
        : [];

      if (!photos.length && place.place_id) {
        const detailsParams = new URLSearchParams({
          place_id: place.place_id,
          fields: 'name,formatted_address,photos',
          language: 'en',
          key: GOOGLE_MAPS_API_KEY
        });
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?${detailsParams.toString()}`;
        const detailsData = await fetchJson(detailsUrl);
        if (detailsData.status === 'OK' && detailsData.result) {
          const detailLink = detailsData.result.place_id
            ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(detailsData.result.name || placeQuery)}&query_place_id=${detailsData.result.place_id}`
            : `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(detailsData.result.name || placeQuery)}`;
          photos = Array.isArray(detailsData.result.photos)
            ? detailsData.result.photos.slice(0, 5).map(photo => buildPhoto(
              `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photo.photo_reference}&key=${GOOGLE_MAPS_API_KEY}`,
              'google_places',
              detailLink,
              photo.width,
              photo.height,
              detailsData.result.name
            ))
            : [];
        }
      }

      if (photos.length) {
        return { place, photos };
      }
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
    const textData = await fetchJson(textUrl);
    if (textData.status === 'OK' && Array.isArray(textData.results) && textData.results.length) {
      const place = textData.results[0];
      const placeLink = place.place_id
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name || placeQuery)}&query_place_id=${place.place_id}`
        : `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(place.name || placeQuery)}`;
      const photos = Array.isArray(place.photos)
        ? place.photos.slice(0, 5).map(photo => buildPhoto(
          `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photo.photo_reference}&key=${GOOGLE_MAPS_API_KEY}`,
          'google_places',
          placeLink,
          photo.width,
          photo.height,
          place.name
        ))
        : [];
      return { place, photos };
    }

    return { place: null, photos: [] };
  }

  async function searchGoogleCustomSearchImages() {
    if (!GOOGLE_CUSTOM_SEARCH_API_KEY || !GOOGLE_CUSTOM_SEARCH_CX) return [];
    const params = new URLSearchParams({
      key: GOOGLE_CUSTOM_SEARCH_API_KEY,
      cx: GOOGLE_CUSTOM_SEARCH_CX,
      q: searchQuery,
      searchType: 'image',
      num: '5',
      imgSize: 'xlarge',
      safe: 'medium'
    });
    const url = `https://www.googleapis.com/customsearch/v1?${params.toString()}`;
    try {
      const data = await fetchJson(url);
      if (Array.isArray(data.items)) {
        return data.items.slice(0, 5).map(item => buildPhoto(
          item.link,
          'google_custom_search',
          item.image?.contextLink || `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(searchQuery)}`,
          item.image?.width,
          item.image?.height,
          item.displayLink || 'Google Search'
        ));
      }
    } catch (err) {
      console.warn('[GoogleCustomSearch] Error:', err.message || err);
    }
    return [];
  }

  async function searchWikimediaImages() {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(placeQuery)}&format=json&srprop=&srlimit=1&origin=*`;
    try {
      const searchData = await fetchJson(searchUrl);
      const page = searchData.query?.search?.[0];
      if (page && page.pageid) {
        const pageId = page.pageid;
        const detailUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&piprop=original&format=json&pageids=${pageId}&origin=*`;
        const detailData = await fetchJson(detailUrl);
        const pageInfo = detailData.query?.pages?.[pageId];
        if (pageInfo?.original?.source) {
          return [buildPhoto(
            pageInfo.original.source,
            'wikipedia',
            `https://en.wikipedia.org/?curid=${pageId}`,
            pageInfo.original.width,
            pageInfo.original.height,
            pageInfo.title
          )];
        }
      }
    } catch (err) {
      console.warn('[Wikimedia] Error:', err.message || err);
    }
    return [];
  }

  async function searchGoogleStreetView() {
    if (!GOOGLE_MAPS_API_KEY || !lat || !lng) return [];
    const url = `https://maps.googleapis.com/maps/api/streetview?size=1200x720&location=${encodeURIComponent(`${lat},${lng}`)}&key=${GOOGLE_MAPS_API_KEY}`;
    return [buildPhoto(url, 'google_street_view', `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`, 1200, 720, 'Google Street View')];
  }

  async function searchGoogleStaticMap() {
    if (!GOOGLE_MAPS_API_KEY || !lat || !lng) return [];
    const url = `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(`${lat},${lng}`)}&zoom=16&size=1200x720&maptype=roadmap&markers=color:red%7C${encodeURIComponent(`${lat},${lng}`)}&key=${GOOGLE_MAPS_API_KEY}`;
    return [buildPhoto(url, 'google_static_map', `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`, 1200, 720, 'Google Maps')];
  }

  try {
    const placeResult = await searchGooglePlacesPhotos();
    if (placeResult.photos.length) {
      return res.status(200).json({ place: placeResult.place, photos: placeResult.photos });
    }

    const customPhotos = await searchGoogleCustomSearchImages();
    if (customPhotos.length) {
      return res.status(200).json({ place: null, photos: customPhotos });
    }

    const wikiPhotos = await searchWikimediaImages();
    if (wikiPhotos.length) {
      return res.status(200).json({ place: null, photos: wikiPhotos });
    }

    const streetPhotos = await searchGoogleStreetView();
    if (streetPhotos.length) {
      return res.status(200).json({ place: null, photos: streetPhotos });
    }

    const staticPhotos = await searchGoogleStaticMap();
    if (staticPhotos.length) {
      return res.status(200).json({ place: null, photos: staticPhotos });
    }

    return res.status(200).json({ place: null, photos: [] });
  } catch (error) {
    console.error('[searchGooglePlacesPhotos] Error:', error);
    return res.status(500).json({ error: error.message, photos: [] });
  }
}
