// ============================================================================
// gf-menu-analyzer.js — GroqMenuAnalyzer (analisi menu/foto gluten-free)
// Estratto da gf-places-panel.js (nessun cambio di comportamento).
// Deps (window.*): toast, t. Espone: window.GroqMenuAnalyzer
// ============================================================================
(function () {
  'use strict';

  const T = (k, f) => (typeof window.t === 'function') ? window.t(k, f) : f;

/* ================= GROQ MENU ANALYZER ================= */
const GroqMenuAnalyzer = {
  CACHE_KEY: 'groq_menu_cache',

  async analyzeMenu(menuText) {
    if (!menuText.trim()) {
      window.toast(T('groq.noMenu', '⚠️ Inserisci il menu da analizzare'));
      return null;
    }

    const hash = btoa(menuText).substring(0, 16);
    const cached = this.getFromCache(hash);
    if (cached) {
      window.toast(T('groq.cached', '✅ Risultato da cache offline'));
      return cached;
    }

    try {
      window.toast(T('groq.analyzing', '🔄 Analizzando menu con Groq...'));
      const resp = await fetch('/api/groqAnalyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ menuText })
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        window.toast(`❌ Groq error: ${err.error || 'server error'}`);
        return null;
      }

      const data = await resp.json();
      const result = data.result;
      if (!result) {
        window.toast(T('groq.badResponse', '❌ Groq error: risposta non valida'));
        return null;
      }

      this.saveToCache(hash, result);
      window.toast(T('groq.done', '✅ Menu analizzato!'));
      return result;
    } catch (err) {
      console.error('[Groq]', err);
      window.toast(`❌ Errore: ${err.message}`);
      return null;
    }
  },

  async analyzeImage(imageBase64, imageLabels = [], menuText = '') {
    if (!imageBase64) {
      window.toast(T('groq.noPhoto', '⚠️ Nessuna foto caricata'));
      return null;
    }

    if (!imageLabels.length && !menuText.trim()) {
      window.toast('⚠️ Carica una foto e/o inserisci un testo per l\'analisi');
      return null;
    }

    window.toast(T('groq.analyzingPhoto', '🔄 Analizzando foto con Groq...'));
    try {
      const resp = await fetch('/api/groqImageAnalyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ imageBase64, imageLabels, menuText })
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        const errorMessage = err.error || 'server error';
        if (imageLabels.length) {
          window.toast(T('groq.offline', '⚠️ Groq non disponibile, uso analisi locale'));
          return this.localAnalyzeFromLabels(imageLabels, menuText);
        }
        window.toast(`❌ Errore immagine: ${errorMessage}`);
        return null;
      }

      const data = await resp.json();
      const result = data.result;
      if (!result) {
        if (imageLabels.length) {
          window.toast(T('groq.invalid', '⚠️ Risposta Groq invalida, uso analisi locale'));
          return this.localAnalyzeFromLabels(imageLabels, menuText);
        }
        window.toast(T('groq.imgError', '❌ Errore: risposta immagine non valida'));
        return null;
      }

      window.toast(T('groq.photoDone', '✅ Foto analizzata!'));
      return result;
    } catch (err) {
      console.error('[GroqImage]', err);
      if (imageLabels.length) {
        window.toast(T('groq.fallback', '⚠️ Errore Groq, uso analisi locale'));
        return this.localAnalyzeFromLabels(imageLabels, menuText);
      }
      window.toast(`❌ Errore immagine: ${err.message}`);
      return null;
    }
  },

  localAnalyzeFromLabels(labels = [], menuText = '') {
    const labelText = labels.join(' ').toLowerCase();
    const normalized = labelText.replace(/[^a-z0-9\s]/g, ' ');
    const safe = [];
    const risk = [];
    const avoid = [];
    const dishName = labels[0] || 'Piatto non identificato';

    const addUnique = (arr, value) => {
      if (value && !arr.includes(value)) arr.push(value);
    };

    const patterns = {
      safe: ['sashimi', 'salad', 'vegetable', 'grilled fish', 'grilled chicken', 'steak', 'tofu', 'fruit', 'rice dish', 'seafood'],
      risk: ['sushi', 'soy sauce', 'teriyaki', 'yakitori', 'gyoza', 'dumpling', 'curry', 'tempura', 'fried rice', 'asian noodle', 'udon', 'soba', 'ramen'],
      avoid: ['pizza', 'pasta', 'spaghetti', 'lasagna', 'bread', 'sandwich', 'burger', 'roll', 'cake', 'donut', 'cookie', 'croissant', 'dumpling', 'ramen', 'udon', 'soba', 'tempura']
    };

    if (patterns.avoid.some(term => normalized.includes(term))) {
      addUnique(avoid, `${dishName} (probabile glutine)`);
    } else if (patterns.risk.some(term => normalized.includes(term))) {
      addUnique(risk, `${dishName} (possibile salsa di soia o contaminazione)`);
    } else if (patterns.safe.some(term => normalized.includes(term))) {
      addUnique(safe, `${dishName} (probabilmente GF se preparato senza pane)`);
    } else {
      addUnique(risk, `${dishName} (non identificato, procedi con cautela)`);
    }

    return {
      piatti_sicuri: safe,
      rischi: risk,
      sconsigliato: avoid
    };
  },

  getFromCache(hash) {
    try {
      const cache = JSON.parse(localStorage.getItem(this.CACHE_KEY) || '{}');
      return cache[hash] || null;
    } catch { return null; }
  },

  saveToCache(hash, result) {
    try {
      const cache = JSON.parse(localStorage.getItem(this.CACHE_KEY) || '{}');
      cache[hash] = result;
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
    } catch (err) { console.error('[Cache save]', err); }
  }
};

  window.GroqMenuAnalyzer = GroqMenuAnalyzer;
})();
