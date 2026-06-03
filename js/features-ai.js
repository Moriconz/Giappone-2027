// ============================================================================
// JS/FEATURES-AI.JS — Utilities for AI / notification UI
// ============================================================================

console.log('[AI] Loading...');

(function() {
  const TOAST_ID = 'toast-container';
  let toastTimeout = null;

  function toast(message, duration = 3200) {
    const el = document.getElementById(TOAST_ID);
    if (!el) {
      console.warn('[toast] missing element:', TOAST_ID);
      return;
    }
    el.textContent = message;
    el.classList.add('show');
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      el.classList.remove('show');
    }, duration);
  }

  window.toast = toast;

  window.VisionImageAnalyzer = {
    model: null,

    // Lazy-load TensorFlow.js + MobileNet (~1.5MB) only on first use.
    _ensureLibs() {
      if (window._visionLibsPromise) return window._visionLibsPromise;
      if (typeof mobilenet !== 'undefined') return (window._visionLibsPromise = Promise.resolve());
      const load = (src) => new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = src; s.async = true;
        s.onload = res;
        s.onerror = () => rej(new Error('Failed to load ' + src));
        document.head.appendChild(s);
      });
      window._visionLibsPromise = (async () => {
        if (typeof tf === 'undefined') {
          await load('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.12.0/dist/tf.min.js');
        }
        await load('https://cdn.jsdelivr.net/npm/@tensorflow-models/mobilenet@2.1.0/dist/mobilenet.min.js');
      })();
      return window._visionLibsPromise;
    },

    async loadModel() {
      if (this.model) return this.model;
      await this._ensureLibs();
      if (typeof mobilenet === 'undefined') {
        throw new Error('Vision libraries are not loaded');
      }
      this.model = await mobilenet.load();
      return this.model;
    },

    async classifyImage(imageBase64) {
      if (!imageBase64) return [];
      try {
        const img = document.createElement('img');
        img.src = imageBase64;
        await new Promise((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Failed to load image for classification'));
        });

        const model = await this.loadModel();
        const predictions = await model.classify(img, 4);
        return predictions.map(pred => ({
          label: String(pred.className || '').trim(),
          probability: Number(pred.probability || 0)
        }));
      } catch (err) {
        console.error('[VisionImageAnalyzer]', err);
        return [];
      }
    }
  };
})();

console.log('[AI] Loaded ✓');
