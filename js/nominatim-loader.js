/**
 * NOMINATIM/OVERPASS LOADER — POI discovery gratuita via OpenStreetMap
 *
 * Fonte primaria low-cost per loadNearbyPOIs (vedi google-places-loader.js):
 * riduce le chiamate a Google Places Nearby Search (a pagamento) usando
 * Overpass API come primo tentativo, con fallback su Google se i risultati
 * sono insufficienti.
 *
 * Overpass (non Nominatim/search) è la scelta giusta qui: la ricerca è
 * "tutti i POI con certi tag entro un raggio da un punto" — una query
 * spaziale per-tag, il caso d'uso di Overpass. Nominatim è invece pensato
 * per geocoding testuale (nome → coordinate), non per enumerare POI in
 * un'area, quindi non si presta a questo scopo.
 *
 * Escape hatch: localStorage.setItem('disableNominatimHybrid', 'true')
 * disattiva l'ibrido e fa tornare tutto su Google (vedi check in
 * google-places-loader.js prima di chiamare fetchNearbyPOIs).
 */
(function () {
  'use strict';

  const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
  const MIN_INTERVAL_MS = 1100; // Overpass usage policy: max ~1 req/s

  // Tag OSM più comuni → stesse category-key usate da GOOGLE_TYPE_MAP
  // (riuso la tassonomia esistente invece di inventarne una nuova)
  const OSM_TAG_MAP = {
    'amenity=restaurant': 'restaurant', 'amenity=fast_food': 'restaurant', 'amenity=food_court': 'restaurant',
    'amenity=cafe': 'cafe', 'amenity=ice_cream': 'cafe',
    'amenity=bar': 'bar', 'amenity=pub': 'bar', 'amenity=biergarten': 'bar',
    'amenity=bank': 'bank', 'amenity=atm': 'atm', 'amenity=post_office': 'post_office',
    'amenity=pharmacy': 'pharmacy', 'amenity=hospital': 'hospital', 'amenity=clinic': 'clinic', 'amenity=dentist': 'dentist',
    'amenity=school': 'school', 'amenity=university': 'school', 'amenity=library': 'library',
    'amenity=place_of_worship': 'temple', 'amenity=parking': 'parking', 'amenity=fuel': 'gas_station',
    'amenity=car_rental': 'car_rental', 'amenity=taxi': 'taxi_stand', 'amenity=bus_station': 'bus_station',
    'amenity=theatre': 'performing_arts_theater', 'amenity=cinema': 'movie_theater', 'amenity=casino': 'casino',
    'amenity=nightclub': 'bar',
    'tourism=hotel': 'hotel', 'tourism=motel': 'hotel', 'tourism=hostel': 'hostel', 'tourism=guest_house': 'guest_house',
    'tourism=attraction': 'tourist_attraction', 'tourism=museum': 'museum', 'tourism=gallery': 'art_gallery',
    'tourism=viewpoint': 'viewpoint', 'tourism=zoo': 'zoo', 'tourism=aquarium': 'aquarium',
    'tourism=theme_park': 'theme_park', 'tourism=camp_site': 'campground',
    'leisure=park': 'park', 'leisure=garden': 'garden', 'leisure=fitness_centre': 'fitness_center',
    'leisure=sports_centre': 'sports_complex', 'leisure=stadium': 'stadium', 'leisure=bowling_alley': 'bowling_alley',
    'leisure=water_park': 'water_park',
    'historic=monument': 'monument', 'historic=castle': 'historical_landmark', 'historic=memorial': 'monument',
    'historic=ruins': 'historical_place',
    'shop=supermarket': 'supermarket', 'shop=convenience': 'convenience_store', 'shop=department_store': 'department_store',
    'shop=mall': 'shopping_mall', 'shop=clothes': 'clothing_store', 'shop=shoes': 'shoe_store',
    'shop=books': 'book_store', 'shop=jewelry': 'jewelry_store', 'shop=electronics': 'electronics_store',
    'shop=furniture': 'furniture_store', 'shop=florist': 'florist', 'shop=toys': 'toy_store',
    'shop=bakery': 'bakery',
  };

  let lastRequestAt = 0;

  // Throttling semplice: coda seriale con timestamp ultima fetch (rispetta il rate limit 1/s)
  async function throttle() {
    const wait = MIN_INTERVAL_MS - (Date.now() - lastRequestAt);
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    lastRequestAt = Date.now();
  }

  function isDisabled() {
    return localStorage.getItem('disableNominatimHybrid') === 'true';
  }

  // Determina la category-key dai tag OSM di un elemento (religion=shinto ha priorità speciale)
  function categoryFromTags(tags) {
    if (!tags) return null;
    if (tags.amenity === 'place_of_worship') {
      if (tags.religion === 'shinto') return 'shrine';
      if (tags.religion === 'buddhist') return 'temple';
    }
    for (const key of Object.keys(tags)) {
      const combo = `${key}=${tags[key]}`;
      if (OSM_TAG_MAP[combo]) return OSM_TAG_MAP[combo];
    }
    return null;
  }

  function buildOverpassQuery(lat, lng, radiusM) {
    const tagFilters = [
      'amenity', 'tourism', 'leisure', 'historic', 'shop'
    ];
    const around = `(around:${radiusM},${lat},${lng})`;
    const clauses = tagFilters.map(tag => `node["${tag}"]${around};way["${tag}"]${around};`).join('\n      ');
    return `[out:json][timeout:15];
    (
      ${clauses}
    );
    out center 200;`;
  }

  function elementToGooglePlacesShape(el) {
    const tags = el.tags || {};
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (lat === undefined || lng === undefined) return null;
    const name = tags.name || tags['name:en'] || tags['name:ja'];
    if (!name) return null; // scarta POI senza nome (rumore, non mostrabile)

    const cat = categoryFromTags(tags);
    // types[]: passiamo la category-key già risolta con prefisso riconosciuto solo da
    // mapGoogleTypesToCategory se combacia; altrimenti lasciamo 'point_of_interest' e
    // ci pensa transformGooglePlacesPOIs a lasciarla 'poi'. Per farla combaciare in modo
    // pulito, sfruttiamo che GOOGLE_TYPE_MAP ha chiavi identiche ad alcune category-key
    // (es. 'shrine', 'museum', 'park'...): usiamo quella come type quando esiste in mappa.
    const types = cat ? [cat] : ['point_of_interest'];

    return {
      place_id: `osm_${el.type}_${el.id}`,
      name,
      geometry: { location: { lat, lng } },
      vicinity: [tags['addr:city'], tags['addr:suburb']].filter(Boolean).join(', '),
      types,
      rating: null,
      user_ratings_total: 0,
      business_status: 'OPERATIONAL',
      icon: null,
      photos: [],
      opening_hours: null,
      _source: 'osm'
    };
  }

  async function fetchNearbyPOIs(lat, lng, radiusM) {
    if (isDisabled()) return null;

    await throttle();
    try {
      const query = buildOverpassQuery(lat, lng, radiusM);
      const res = await fetch(OVERPASS_URL, {
        method: 'POST',
        body: 'data=' + encodeURIComponent(query)
      });
      if (!res.ok) {
        console.warn(`[NominatimLoader] Overpass HTTP ${res.status}`);
        return null;
      }
      const data = await res.json();
      const elements = data.elements || [];
      const pois = elements.map(elementToGooglePlacesShape).filter(Boolean);
      console.log(`[NominatimLoader] Overpass: ${pois.length} POI trovati (raggio ${radiusM}m)`);
      return pois;
    } catch (err) {
      console.warn('[NominatimLoader] Overpass fetch error:', err);
      return null;
    }
  }

  window.NominatimLoader = { fetchNearbyPOIs };
  console.log('[NominatimLoader] Module loaded');
})();
