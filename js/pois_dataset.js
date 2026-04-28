// POI DATASET - Loader dinamico (52 città)
window.POIS_DATASET = {};
const POIS_MANIFEST = {"Hiroshima": {"file": "hiroshima.js", "count": 724}, "Kamakura": {"file": "kamakura.js", "count": 757}, "Kanazawa": {"file": "kanazawa.js", "count": 868}, "Nagoya": {"file": "nagoya.js", "count": 2979}, "Nara": {"file": "nara.js", "count": 507}, "Yokohama": {"file": "yokohama.js", "count": 1622}, "akita": {"file": "akita.js", "count": 4}, "aomori": {"file": "aomori.js", "count": 547}, "asahikawa": {"file": "asahikawa.js", "count": 124}, "atami": {"file": "atami.js", "count": 119}, "chiba": {"file": "chiba.js", "count": 170}, "fukuoka": {"file": "fukuoka.js", "count": 1052}, "gifu": {"file": "gifu.js", "count": 102}, "hakodate": {"file": "hakodate.js", "count": 232}, "hakone": {"file": "hakone.js", "count": 147}, "hamamatsu": {"file": "hamamatsu.js", "count": 617}, "ise": {"file": "ise.js", "count": 148}, "kagoshima": {"file": "kagoshima.js", "count": 330}, "kawasaki": {"file": "kawasaki.js", "count": 807}, "kitakyushu": {"file": "kitakyushu.js", "count": 242}, "kobe": {"file": "kobe.js", "count": 1093}, "kochi": {"file": "kochi.js", "count": 194}, "koyasan": {"file": "koyasan.js", "count": 88}, "kumamoto": {"file": "kumamoto.js", "count": 212}, "kyoto": {"file": "kyoto.js", "count": 14093}, "matsue": {"file": "matsue.js", "count": 109}, "matsumoto": {"file": "matsumoto.js", "count": 156}, "matsuyama": {"file": "matsuyama.js", "count": 242}, "miyazaki": {"file": "miyazaki.js", "count": 108}, "morioka": {"file": "morioka.js", "count": 208}, "nagano": {"file": "nagano.js", "count": 534}, "nagasaki": {"file": "nagasaki.js", "count": 246}, "nikko": {"file": "nikko.js", "count": 48}, "oita": {"file": "oita.js", "count": 200}, "okayama": {"file": "okayama.js", "count": 950}, "osaka": {"file": "osaka.js", "count": 22673}, "otsu": {"file": "otsu.js", "count": 491}, "saitama": {"file": "saitama.js", "count": 560}, "sapporo": {"file": "sapporo.js", "count": 1254}, "sasebo": {"file": "sasebo.js", "count": 3}, "sendai": {"file": "sendai.js", "count": 2375}, "shimizu": {"file": "shimizu.js", "count": 1}, "shizuoka": {"file": "shizuoka.js", "count": 286}, "takamatsu": {"file": "takamatsu.js", "count": 396}, "takayama": {"file": "takayama.js", "count": 214}, "tokushima": {"file": "tokushima.js", "count": 152}, "tokyo": {"file": "tokyo.js", "count": 38843}, "tottori": {"file": "tottori.js", "count": 105}, "toyama": {"file": "toyama.js", "count": 132}, "tsu": {"file": "tsu.js", "count": 159}, "wakayama": {"file": "wakayama.js", "count": 325}, "yamaguchi": {"file": "yamaguchi.js", "count": 45}};

async function loadAllPOIS() {
  let loaded = 0;
  const href = window.location.href;
  const basePath = href.substring(0, href.lastIndexOf('/') + 1);
  const baseUrl = basePath + 'js/pois/';

  console.log('[POI Dataset] Starting load from:', baseUrl);

  for (const [city, info] of Object.entries(POIS_MANIFEST)) {
    try {
      const url = `${baseUrl}${info.file}`;
      const resp = await fetch(url);
      if (!resp.ok) {
        console.warn(`[POI] Failed to load ${city}:`, resp.status);
        continue;
      }
      const text = await resp.text();
      const actualCode = text.replace(/\\\\n/g, '\n');
      const match = actualCode.match(/\[\s*\{[\s\S]*?\}\s*\]/);
      if (!match) {
        console.warn(`[POI] No data found in ${city}`);
        continue;
      }
      try {
        let jsonStr = match[0].replace(/\n/g, ' ');
        const jsonData = JSON.parse(jsonStr);
        window.POIS_DATASET[city] = jsonData;
        loaded++;
        console.log(`[POI] Loaded ${city}: ${jsonData.length} POI`);
      } catch(parseErr) {
        console.error(`[POI] Parse error in ${city}:`, parseErr.message);
      }
    } catch(e) {
      console.error(`[POI] Error loading ${city}:`, e.message);
    }
  }

  console.log(`[POI Dataset] Load complete: ${loaded}/${Object.keys(POIS_MANIFEST).length} città caricati`);
  window.dispatchEvent(new CustomEvent('POI_DATASET_READY', { detail: { loaded, total: Object.keys(POIS_MANIFEST).length } }));
}

// Carica subito (non aspettare DOMContentLoaded)
console.log('[POI Dataset] Initializing...');
loadAllPOIS().catch(err => console.error('[POI Dataset] Fatal error:', err));
