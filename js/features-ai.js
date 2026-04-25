// ============================================================================
// FEATURES-AI.JS — Feature 3: Gemini AI Chat
// Dipende da: window.state (caricato prima)
// ============================================================================

console.log('[AI] Loading features...');

// Global AI history
window.aiHistory = [];

// ============================================================================
// FEATURE 3: Gemini AI — Free Tier Chat
// ============================================================================

function saveAIConfig() {
  if (!window.state) {
    console.warn('[AI] State not ready');
    return;
  }

  const keyEl = document.getElementById('gemini-api-key');
  const key = (keyEl?.value || '').trim();

  if (!window.state.ai) window.state.ai = {};
  window.state.ai.geminiApiKey = key;
  window.state.ai.geminiModel = "gemini-pro";

  window.saveState();
  if (window.toast) window.toast(key ? '✅ API Key Gemini salvata' : 'ℹ️ Usi offline AI');
}

function loadAIConfig() {
  if (!window.state) return;

  const keyEl = document.getElementById('gemini-api-key');
  if (keyEl && window.state.ai?.geminiApiKey) {
    keyEl.value = window.state.ai.geminiApiKey;
  }
}

function checkAIQuota() {
  if (!window.state) {
    return true; // Allow if state not ready
  }

  const today = new Date().toDateString();

  if (window.state.aiQuotaDate !== today) {
    window.state.aiQuotaDate = today;
    window.state.aiCallsToday = 0;
    window.saveState();
  }

  return (window.state.aiCallsToday || 0) < 50;
}

function loadAIQuota() {
  if (!window.state) return;

  const today = new Date().toDateString();
  if (window.state.aiQuotaDate !== today) {
    window.state.aiQuotaDate = today;
    window.state.aiCallsToday = 0;
    window.saveState();
  }
  if (window.DEBUG) console.log('[AI] Quota:', window.state.aiCallsToday, '/ 50');
}

function saveAIQuota() {
  window.saveState();
}

function getAIQuotaStatus() {
  const today = new Date().toDateString();
  if (window.state && window.state.aiQuotaDate === today) {
    return `${window.state.aiCallsToday || 0} / 50 richieste oggi`;
  }
  return "0 / 50 richieste oggi";
}

async function sendAIMessage(userText) {
  if (!window.aiHistory) window.aiHistory = [];

  // Ensure state is initialized
  if (!window.state || typeof window.state !== 'object') {
    console.warn('[AI] State not ready, using offline mode');
    window.aiHistory.push({ role: "user", content: userText });
    const offlineResponse = getOfflineAISuggestion(userText);
    window.aiHistory.push({ role: "assistant", content: offlineResponse });
    if (window.renderAIChat) window.renderAIChat();
    return;
  }

  window.aiHistory.push({ role: "user", content: userText });
  if (window.renderAIChat) window.renderAIChat();

  if (!checkAIQuota()) {
    const msg = "⚠️ Quota giornaliera raggiunta (50 richieste). Uso offline.";
    window.aiHistory.push({ role: "assistant", content: msg });
    if (window.renderAIChat) window.renderAIChat();
    return;
  }

  if (window.state.ai?.geminiApiKey && navigator.onLine) {
    await callGeminiAPI(userText);
  } else {
    const offlineResponse = getOfflineAISuggestion(userText);
    window.aiHistory.push({ role: "assistant", content: offlineResponse });
    if (window.renderAIChat) window.renderAIChat();
  }

  window.saveState();
}

async function callGeminiAPI(userText) {
  // Ensure state is initialized
  if (!window.state || !window.state.ai || !window.state.ai.geminiApiKey) {
    console.warn('[AI] No API key available');
    return;
  }

  const apiKey = window.state.ai.geminiApiKey;
  const model = "gemini-pro";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    let context = "";
    if (window.state.itinerary?.length > 0) {
      const cities = [...new Set(window.state.itinerary.map(i => i.city))];
      context = `\n\n[Contesto: Viaggio Giappone 2027, tappe: ${cities.join(", ")}]`;
    }

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: userText + context
          }]
        }]
      })
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Errore nella risposta Gemini.";

    window.aiHistory.push({ role: "assistant", content: aiText });
    window.state.aiCallsToday = (window.state.aiCallsToday || 0) + 1;
    saveAIQuota();

    if (window.DEBUG) console.log('[AI] Gemini call success. Quota:', window.state.aiCallsToday);
  } catch (err) {
    window.aiHistory.push({
      role: "assistant",
      content: `❌ Errore API: ${err.message}. Uso offline.`
    });

    const offlineResponse = getOfflineAISuggestion(userText);
    window.aiHistory.push({
      role: "assistant",
      content: offlineResponse
    });

    console.error('[AI] Gemini error:', err);
  }

  if (window.renderAIChat) window.renderAIChat();
}

function getAllPoiData() {
  if (typeof allPOIs === 'function') return allPOIs();
  return Array.isArray(window.POIS) ? window.POIS : Array.isArray(window.POIS_BASE) ? window.POIS_BASE : [];
}

function normalizeText(text) {
  return String(text || '').trim().toLowerCase();
}

function extractCityFromText(text) {
  const cities = [...new Set(getAllPoiData().map(p => normalizeText(p.city)).filter(Boolean))];
  const lower = normalizeText(text);
  return cities.find(city => city && lower.includes(city)) || null;
}

function formatPoiNames(pois, max = 3) {
  return pois.slice(0, max).map(p => `${p.name}${p.jp ? ` (${p.jp})` : ''}`).join(', ');
}

function getPoiSuggestions(city, categories = [], onlyGF = false) {
  return getAllPoiData().filter(p => {
    if (city && normalizeText(p.city) !== normalizeText(city)) return false;
    if (categories.length > 0 && !categories.includes(p.cat)) return false;
    if (onlyGF) return p.gf && (p.gf.lvl === 'full' || p.gf.lvl === 'partial');
    return true;
  });
}

function getOfflineAISuggestion(userText) {
  const lower = normalizeText(userText);
  const city = extractCityFromText(lower);
  const gfFoodPois = getPoiSuggestions(city, ['food', 'market'], true);
  const sightseeingCats = ['temple', 'shrine', 'viewpoint', 'museum', 'castle', 'nature', 'experience', 'shopping', 'food', 'market', 'water'];
  const citySightseeing = getPoiSuggestions(city, sightseeingCats);

  if (lower.includes('ristoranti') || lower.includes('mangiare') || lower.includes('cibo') || lower.includes('pranzo') || lower.includes('cena')) {
    if (gfFoodPois.length > 0) {
      return `🍽️ Ecco alcune opzioni gluten-free${city ? ` a ${city}` : ''}: ${formatPoiNames(gfFoodPois, 3)}. ` +
             `Apri la mappa e usa il filtro 'food' + gluten-free per vederle tutte.`;
    }
    if (city) {
      return `🍜 Non ho trovato ristoranti gluten-free già mappati a ${city}, ma puoi usare il filtro 'food' e abilitare il filtro gluten-free per cercare altre opzioni.`;
    }
    return "🍜 Cerca i punti 'food' e abilita il filtro gluten-free per trovare i migliori locali GF in Giappone.";
  }

  if (lower.includes('gluten') || lower.includes('gf')) {
    if (city && gfFoodPois.length > 0) {
      return `🌾 A ${city}, i migliori locali GF sono: ${formatPoiNames(gfFoodPois, 4)}. ` +
             `Usa il chip 'Solo gluten-free' per filtrarli sulla mappa.`;
    }
    return `🌾 Tutti i POI supportano il filtro gluten-free. Per un risultato rapido, usa il chip 'Solo gluten-free' e cerca 'food' o 'market'.`;
  }

  if (lower.includes('cosa vedere') || lower.includes('cosa visitare') || lower.includes('visitare')) {
    if (city) {
      if (citySightseeing.length > 0) {
        return `📍 A ${city}, comincia da: ${formatPoiNames(citySightseeing, 3)}. ` +
               `Sono tappe iconiche e facili da raggiungere, perfette per una giornata di visita.`;
      }
      return `📍 Per ${city}, prova ad aprire la mappa e cercare le categorie 'temple', 'shrine', 'museum' e 'nature' per trovare le attrazioni più belle.`;
    }
    return "📍 Prova a chiedere 'Cosa vedere a Kyoto' o 'Cosa visitare a Osaka' per ricevere consigli specifici per città.";
  }

  if (lower.includes('itinerario') || lower.includes('giorni') || lower.includes('tappe')) {
    if (city) {
      return `🧭 Itinerario consigliato per ${city}: giorno 1 esplora i mercati e i templi locali, giorno 2 visita i musei e i quartieri storici, giorno 3 assaggia i piatti GF e fai shopping in un mercato tradizionale.`;
    }
    return "🧭 Per un itinerario rapido, scegli una città (es. Kyoto, Tokyo, Osaka) e ti darò una proposta di 3-5 giorni basata sui POI locali.";
  }

  if (lower.includes('suggerisci') || lower.includes('consiglia') || lower.includes('consigliami')) {
    if (window.state?.itinerary?.length > 0) {
      const nextStop = window.state.itinerary[0];
      return `📍 Prossima tappa: **${nextStop.name}** a ${nextStop.city}. Ti suggerisco di visitare i principali templi, il mercato locale e un ristorante GF consigliato.`;
    }
    return "💡 Puoi chiedere: 'Itinerario a Kyoto', 'Ristoranti gluten-free a Tokyo', o 'Cosa vedere a Osaka'.";
  }

  if (city && citySightseeing.length > 0) {
    return `📍 A ${city}, ti suggerisco di iniziare da: ${formatPoiNames(citySightseeing, 3)}. ` +
           `Apri la mappa e usa i filtri per esplorare altri luoghi simili.`;
  }

  return "💭 Domanda interessante! Uso il fallback offline gratuito per risposte veloci e sicure. Prova a chiedere: 'Cosa vedere a Kyoto' o 'Ristoranti gluten-free a Tokyo'.";
}

// ============================================================================
// FEATURE 7: Quota Gemini Persistenza (localStorage)
// Already handled in Feature 3
// ============================================================================

// ============================================================================
// BONUS: POI Photos (Google Places API)
// Ricerca foto per ogni POI, cache in localStorage
// ============================================================================

const GOOGLE_PLACES_API_KEY = 'AIzaSyA8bYrY9J3cNFCUFh_aJiPCnsYmqk9Ksug';

async function searchPlacePhotos(poiName, city) {
  const cacheKey = `poi_photos_${poiName}_${city}`.replace(/\s+/g, '_');
  const cached = localStorage.getItem(cacheKey);
  if (cached) return JSON.parse(cached);

  try {
    // Ricerca posto su Google Places API
    const query = `${poiName} ${city} Japan`;
    const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${GOOGLE_PLACES_API_KEY}`;
    
    const response = await fetch(searchUrl);
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      const place = data.results[0];
      const placeId = place.place_id;
      
      // Ricerca dettagli (incluse foto)
      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=photos&key=${GOOGLE_PLACES_API_KEY}`;
      const detailsResponse = await fetch(detailsUrl);
      const detailsData = await detailsResponse.json();
      
      if (detailsData.result && detailsData.result.photos) {
        const photos = detailsData.result.photos.map(photo => ({
          url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photo.photo_reference}&key=${GOOGLE_PLACES_API_KEY}`,
          attribution: photo.html_attributions?.[0] || 'Google Places'
        }));
        
        localStorage.setItem(cacheKey, JSON.stringify(photos));
        return photos;
      }
    }
  } catch (err) {
    console.warn('[Photos] API error:', err.message);
  }
  
  return [];
}

function getPoiPhotoUrl(poiName, city) {
  // Cache key
  const cacheKey = `poi_photo_${poiName}_${city}`.replace(/\s+/g, '_');
  const cached = localStorage.getItem(cacheKey);
  if (cached) return cached;
  
  // Fallback placeholder
  const placeholder = `https://via.placeholder.com/400x300?text=${encodeURIComponent(poiName)}`;
  localStorage.setItem(cacheKey, placeholder);
  return placeholder;
}

function enrichPoiWithPhoto(poi) {
  if (!poi.photos) {
    poi.photos = [];
    // Carica foto async senza bloccare
    searchPlacePhotos(poi.name, poi.city).then(photos => {
      poi.photos = photos;
    });
  }
  return poi;
}

// ============================================================================
// Export functions to window
// ============================================================================
window.saveAIConfig = saveAIConfig;
window.loadAIConfig = loadAIConfig;
window.checkAIQuota = checkAIQuota;
window.loadAIQuota = loadAIQuota;
window.saveAIQuota = saveAIQuota;
window.getAIQuotaStatus = getAIQuotaStatus;
window.sendAIMessage = sendAIMessage;
window.callGeminiAPI = callGeminiAPI;
window.getOfflineAISuggestion = getOfflineAISuggestion;
window.getPoiPhotoUrl = getPoiPhotoUrl;
window.enrichPoiWithPhoto = enrichPoiWithPhoto;
window.searchPlacePhotos = searchPlacePhotos;

console.log('[AI] Features loaded ✓');
