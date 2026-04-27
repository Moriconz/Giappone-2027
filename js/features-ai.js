// ============================================================================
// FEATURES-AI.JS — Feature 3: Gemini AI Chat
// Dipende da: window.state (caricato prima)
// ============================================================================

console.log('[AI] Loading features...');

// Safe toast wrapper - evita conflitto con elemento HTML #toast
if (!window.toast || typeof window.toast !== 'function') {
  window.toast = function(msg) {
    const toastEl = document.getElementById('toast');
    if (toastEl && typeof toastEl.textContent !== 'undefined') {
      toastEl.textContent = msg;
      toastEl.classList.add('show');
      setTimeout(() => toastEl.classList.remove('show'), 3000);
    } else {
      console.log('[toast]', msg);
    }
  };
}

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

  // Routing: Gemini → Groq → offline
  const _geminiKey = window.state.ai?.geminiApiKey
    || (window.appConfig ? await window.appConfig.getKey('gemini') : null);
  const _groqKey = window.appConfig ? await window.appConfig.getKey('groq') : null;

  if (_geminiKey && navigator.onLine) {
    await callGeminiAPI(userText, _geminiKey);
  } else if (_groqKey && navigator.onLine) {
    await callGroqAPI(userText, _groqKey);
  } else {
    const offlineResponse = getOfflineAISuggestion(userText);
    window.aiHistory.push({ role: "assistant", content: offlineResponse });
    if (window.renderAIChat) window.renderAIChat();
  }

  window.saveState();
}

async function callGeminiAPI(userText, apiKey) {
  if (!apiKey) {
    apiKey = window.state?.ai?.geminiApiKey
      || (window.appConfig ? await window.appConfig.getKey('gemini') : null);
  }
  if (!apiKey) {
    console.warn('[AI] No Gemini key available');
    return;
  }
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

// ============================================================================
// Phase 4: Groq API fallback
// Endpoint: https://api.groq.com/openai/v1/chat/completions
// Model: mixtral-8x7b-32768 (fast, 32k ctx, free tier)
// ============================================================================

async function callGroqAPI(userText, apiKey) {
  if (!apiKey) {
    apiKey = window.appConfig ? await window.appConfig.getKey('groq') : null;
  }
  if (!apiKey) {
    console.warn('[AI] No Groq key');
    const offlineResponse = getOfflineAISuggestion(userText);
    window.aiHistory.push({ role: "assistant", content: offlineResponse });
    if (window.renderAIChat) window.renderAIChat();
    return;
  }

  let context = '';
  if (window.state?.itinerary?.length > 0) {
    const cities = [...new Set(window.state.itinerary.map(i => i.city))];
    context = `\n\n[Contesto: Viaggio Giappone 2027, tappe: ${cities.join(', ')}]`;
  }

  const systemPrompt = `Sei un esperto di viaggi in Giappone, specializzato in cucina gluten-free e itinerari culturali.
Rispondi sempre in italiano, in modo conciso e pratico. Usa emoji per rendere le risposte più leggibili.
Se non hai informazioni sufficienti, suggerisci di usare la mappa con i filtri disponibili.`;

  try {
    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'mixtral-8x7b-32768',
        max_tokens: 512,
        messages: [
          { role: 'system', content: systemPrompt },
          ...window.aiHistory
            .slice(-6) // ultimi 6 messaggi per contesto
            .map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
          { role: 'user', content: userText + context },
        ],
      }),
    });

    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const data = await resp.json();
    const text = data.choices?.[0]?.message?.content || 'Errore risposta Groq.';

    window.aiHistory.push({ role: 'assistant', content: `[Groq] ${text}` });
    window.state.aiCallsToday = (window.state.aiCallsToday || 0) + 1;
    window.saveState();
    if (window.DEBUG) console.log('[AI] Groq OK. Quota:', window.state.aiCallsToday);
  } catch (err) {
    console.error('[AI] Groq error:', err);
    window.aiHistory.push({ role: 'assistant', content: `❌ Groq error: ${err.message}. Uso offline.` });
    window.aiHistory.push({ role: 'assistant', content: getOfflineAISuggestion(userText) });
  }

  if (window.renderAIChat) window.renderAIChat();
}

async function searchPlacePhotos(poiName, city) {
  const cacheKey = `poi_photos_${poiName}_${city}`.replace(/\s+/g, '_');
  const cached = localStorage.getItem(cacheKey);
  if (cached) return JSON.parse(cached);

  // Ottieni API key da config.js
  const apiKey = window.appConfig
    ? await window.appConfig.getKey('googlePlaces')
    : null;
  if (!apiKey) {
    console.warn('[Photos] No Google Places key configured');
    return [];
  }

  try {
    // Chiama il proxy Vercel Function invece di Google Places direttamente
    // Questo risolve il problema CORS
    const proxyUrl = `/api/searchPlaces?poiName=${encodeURIComponent(poiName)}&city=${encodeURIComponent(city)}&apiKey=${encodeURIComponent(apiKey)}`;
    const response = await fetch(proxyUrl);
    const data = await response.json();

    if (data.photos && Array.isArray(data.photos)) {
      localStorage.setItem(cacheKey, JSON.stringify(data.photos));
      return data.photos;
    }
  } catch (err) {
    console.warn('[Photos] Proxy error:', err.message);
  }
  return [];
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
// BONUS: POI Photos (Google Places API) — Versione buona: usapps config.js
// Ricerca foto per ogni POI, cache in localStorage
// ============================================================================

// API key recuperata da config.js (cifrata) — mai hardcoded
// searchPlacePhotos() usa await window.appConfig.getKey('googlePlaces')

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
window.callGroqAPI = callGroqAPI;
window.callGeminiAPI = callGeminiAPI;
window.getOfflineAISuggestion = getOfflineAISuggestion;
window.getPoiPhotoUrl = getPoiPhotoUrl;
window.enrichPoiWithPhoto = enrichPoiWithPhoto;
window.searchPlacePhotos = searchPlacePhotos;

console.log('[AI] Features loaded ✓');
