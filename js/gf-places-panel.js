// ============================================================================
// gf-places-panel.js — GroqMenuAnalyzer, GFSuggestionsDB, GFPlacesDB,
//   openGroqPanel, analyzeMenuGroq, gfEditMode, openGFPlacesPanel,
//   startEditGFPlace, saveGFPlace, handleDeepLink, geocodeRestaurant,
//   parseSharedRestaurantData, geocodeGFPlace, deleteGFPlace, editGFPlace,
//   openGFSuggestionPanel, submitGFSuggestion, onDataChannelMessage hook
// Extracted from app-core.js. Deps (all window.*):
//   toast, openSheet, refreshGFPlacesLayer, broadcastToPeers, VisionImageAnalyzer
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

/* ================= GF PLACES DATABASE ================= */

function _makeLocalDB(storeKey) {
  return {
    STORE_KEY: storeKey,
    getAll() {
      try { return JSON.parse(localStorage.getItem(storeKey) || '[]'); } catch { return []; }
    },
    _save(items) { localStorage.setItem(storeKey, JSON.stringify(items)); },
    delete(id) {
      try {
        this._save(this.getAll().filter(x => x.id !== id));
        return true;
      } catch (err) { console.error('[LocalDB.delete]', err); return false; }
    }
  };
}

const GFSuggestionsDB = Object.assign(_makeLocalDB('gf_suggestions_submitted'), {
  add(suggestion) {
    try {
      const list = this.getAll();
      suggestion.id = 'gfs_' + Date.now();
      suggestion.submittedAt = new Date().toISOString();
      suggestion.status = 'pending';
      list.push(suggestion);
      this._save(list);
      window.broadcastToPeers?.({ type: 'gf_suggestion_add', suggestion });
      return suggestion;
    } catch (err) { console.error('[GFSuggestionsDB.add]', err); return null; }
  }
});

const GFPlacesDB = Object.assign(_makeLocalDB('gf_custom_places'), {
  add(place) {
    try {
      const places = this.getAll();
      place.id = 'gf_' + Date.now();
      place.createdAt = new Date().toISOString();
      places.push(place);
      this._save(places);
      window.broadcastToPeers?.({ type: 'gf_place_add', place });
      return place;
    } catch (err) { console.error('[GFPlacesDB.add]', err); return null; }
  },
  edit(id, updates) {
    try {
      const places = this.getAll();
      const idx = places.findIndex(p => p.id === id);
      if (idx < 0) return null;
      places[idx] = { ...places[idx], ...updates, updatedAt: new Date().toISOString() };
      this._save(places);
      window.broadcastToPeers?.({ type: 'gf_place_edit', id, updates });
      return places[idx];
    } catch (err) { console.error('[GFPlacesDB.edit]', err); return null; }
  },
  delete(id) {
    try {
      const places = this.getAll().filter(p => p.id !== id);
      this._save(places);
      window.broadcastToPeers?.({ type: 'gf_place_delete', id });
      return true;
    } catch (err) { console.error('[GFPlacesDB.delete]', err); return false; }
  },
  sync(incoming) {
    try {
      const merged = [...this.getAll()];
      for (const item of incoming) {
        const ex = merged.find(p => p.id === item.id);
        if (!ex) merged.push(item);
        else if (new Date(item.updatedAt) > new Date(ex.updatedAt)) Object.assign(ex, item);
      }
      this._save(merged);
      return merged;
    } catch (err) { console.error('[GFPlacesDB.sync]', err); return this.getAll(); }
  }
});

/* ================= UI HANDLERS ================= */

window.openGroqPanel = async function() {
  const html = `
    <div class="groq-panel">
      <div>
        <label style="font-size:15px;font-weight:700;color:var(--text);display:block;margin-bottom:8px">Incolla il menu da analizzare:</label>
        <textarea id="groq-menu-textarea" class="groq-menu-textarea" placeholder="Es: Pasta al pomodoro, Risotto ai funghi, Petto di pollo..."></textarea>
      </div>
      <div style="margin-top:14px">
        <label style="font-size:15px;font-weight:700;color:var(--text);display:block;margin-bottom:8px">Carica una foto del piatto:</label>
        <div class="photo-upload-zone" id="groq-photo-zone">📷 Tocca per aggiungere una foto</div>
        <input type="file" id="groq-photo-input" accept="image/*" style="display:none" />
        <img id="groq-photo-preview" class="photo-preview" />
        <p style="font-size:14px;color:var(--muted);margin-top:6px">Se carichi una foto, l'app cercherà di riconoscere il piatto tramite etichette visive e determinerà il rischio gluten-free. Se il server Groq non è disponibile, userà l'analisi locale.</p>
      </div>

      <button class="groq-analyze-btn" onclick="window.analyzeMenuGroq()">🤖 Analizza</button>

      <div id="groq-result" style="display:none;"></div>
    </div>
  `;

  window.openSheet('🤖 Analizza Menu Gluten-Free', html);

  const photoZone = document.getElementById('groq-photo-zone');
  const photoInput = document.getElementById('groq-photo-input');
  const photoPreview = document.getElementById('groq-photo-preview');
  let photoBase64 = null;

  photoZone.onclick = () => photoInput.click();
  photoInput.onchange = ev => {
    const file = ev.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const MAX = 800;
        let w = img.width;
        let h = img.height;
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
          else { w = Math.round(w * MAX / h); h = MAX; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        photoBase64 = canvas.toDataURL('image/jpeg', 0.75);
        photoPreview.src = photoBase64;
        photoPreview.style.display = 'block';
        photoInput.dataset.base64 = photoBase64;
        photoInput.dataset.labels = '';
        photoZone.textContent = '🚀 Analisi foto in corso...';

        window.VisionImageAnalyzer.classifyImage(photoBase64).then(predictions => {
          const labels = predictions.slice(0, 4).map(p => p.label);
          photoInput.dataset.labels = JSON.stringify(labels);
          if (labels.length) {
            photoZone.textContent = `✅ Foto caricata: ${labels.join(', ')}`;
          } else {
            photoZone.textContent = '✅ Foto caricata (classificazione non disponibile)';
          }
        }).catch(err => {
          console.warn('[Vision]', err);
          photoZone.textContent = '✅ Foto caricata';
        });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };
};

window.analyzeMenuGroq = async function() {
  const menuText = document.getElementById('groq-menu-textarea')?.value || '';
  const photoInput = document.getElementById('groq-photo-input');
  const photoBase64 = photoInput?.dataset?.base64 || '';
  const imageLabels = photoInput?.dataset?.labels ? JSON.parse(photoInput.dataset.labels) : [];

  if (!menuText.trim() && !photoBase64) {
    window.toast(T('groq.noInput', '⚠️ Inserisci il menu o carica una foto da analizzare'));
    return;
  }

  let result = null;
  if (photoBase64) {
    result = await GroqMenuAnalyzer.analyzeImage(photoBase64, imageLabels, menuText);
  } else {
    result = await GroqMenuAnalyzer.analyzeMenu(menuText);
  }
  if (!result) return;
  
  const html = `
    <div class="gf-analysis-result">
      <div class="gf-result-card safe">
        <h4><span class="emoji">🟢</span> Piatti Sicuri</h4>
        <ul>${(result.piatti_sicuri || []).map(p => `<li>${p}</li>`).join('')}</ul>
      </div>
      <div class="gf-result-card risk">
        <h4><span class="emoji">🟡</span> Rischio Contaminazione</h4>
        <ul>${(result.rischi || []).map(p => `<li>${p}</li>`).join('')}</ul>
      </div>
      <div class="gf-result-card avoid">
        <h4><span class="emoji">🔴</span> Sconsigliato</h4>
        <ul>${(result.sconsigliato || []).map(p => `<li>${p}</li>`).join('')}</ul>
      </div>
    </div>
  `;
  
  const resultDiv = document.getElementById('groq-result');
  if (resultDiv) {
    resultDiv.innerHTML = html;
    resultDiv.style.display = 'block';
  }
};

// Global state for edit mode
window.gfEditMode = {
  enabled: false,
  placeId: null
};

window.openGFPlacesPanel = function(prefillData = null, editId = null) {
  // Set edit mode if editId provided
  if (editId) {
    window.gfEditMode.enabled = true;
    window.gfEditMode.placeId = editId;
  } else {
    window.gfEditMode.enabled = false;
    window.gfEditMode.placeId = null;
  }

  const places = GFPlacesDB.getAll();

  let placesHtml = '';
  if (places.length === 0) {
    placesHtml = '<div class="gf-empty-state"><div class="icon">📍</div>Nessun posto aggiunto. Comincia ad aggiungere i tuoi posti GF!</div>';
  } else {
    placesHtml = places.map(p => `
      <div class="gf-place-card" style="background:rgba(74,91,168,0.08);border:1px solid rgba(74,91,168,0.2);border-radius:12px;padding:12px;">
        <div class="gpc-header" style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px;">
          <div>
            <div class="gpc-name" style="font-weight:700;color:var(--text);margin-bottom:4px;">${p.name}</div>
            <div class="gpc-city" style="font-size:14px;color:var(--muted);">${p.city}${p.area ? ' · ' + p.area : ''}</div>
          </div>
          <div class="gpc-rating" style="font-size:16px;">${'⭐'.repeat(p.rating || 0)}</div>
        </div>
        ${p.safety_level ? `<div style="display:inline-block;padding:4px 8px;border-radius:4px;font-size:13px;font-weight:700;margin-bottom:8px;${p.safety_level === 'GREEN' ? 'background:rgba(127,255,127,0.2);color:#7FFF7F' : p.safety_level === 'YELLOW' ? 'background:rgba(255,215,0,0.2);color:#FFD700' : 'background:rgba(255,107,107,0.2);color:#FF6B6B'};">${p.safety_level === 'GREEN' ? '🟢 SAFE' : p.safety_level === 'YELLOW' ? '🟡 CAUTION' : '🔴 DANGER'}</div>` : ''}
        <div class="gpc-meta" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">
          ${(p.tags || []).map(t => `<span class="gpc-tag" style="background:rgba(20,30,60,0.05);border:1px solid rgba(20,30,60,0.12);border-radius:4px;padding:3px 8px;font-size:13px;color:var(--l-ink);">${t}</span>`).join('')}
        </div>
        ${p.note ? `<div style="margin:8px 0;font-size:14px;color:var(--muted);line-height:1.4;">${p.note}</div>` : ''}
        <div class="gpc-actions" style="display:flex;gap:6px;margin-top:10px;">
          <button onclick="window.startEditGFPlace('${p.id}')" style="flex:1;padding:6px;background:rgba(100,149,237,0.2);border:1px solid rgba(100,149,237,0.4);color:var(--text);border-radius:4px;font-size:13px;cursor:pointer;">✏️ Modifica</button>
          <button onclick="(window.modalConfirm||((m)=>Promise.resolve(confirm(m))))('Eliminare questo posto?',{danger:true,confirmText:'Elimina'}).then(ok=>{ if(ok){ window.deleteGFPlace('${p.id}'); window.openGFPlacesPanel(); } })" style="flex:1;padding:6px;background:rgba(255,107,107,0.2);border:1px solid rgba(255,107,107,0.4);color:var(--text);border-radius:4px;font-size:13px;cursor:pointer;">🗑️ Elimina</button>
        </div>
      </div>
    `).join('');
  }

  const addFormHtml = `
    <div class="gf-place-form" style="background:rgba(74,91,168,0.12);backdrop-filter:blur(10px);border:1px solid rgba(74,91,168,0.3);border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:12px;">
      <div style="display:flex;gap:8px;margin-bottom:12px;">
        <a href="https://www.findmeglutenfree.com/jp" target="_blank" style="flex:1;padding:10px;background:linear-gradient(180deg,#4A5BA8,#3A4B98);color:#fff;border:none;border-radius:6px;text-decoration:none;font-weight:700;font-size:14px;text-align:center;cursor:pointer;">🌐 Trova su Find Me GF</a>
      </div>

      <h3 style="margin:0;font-size:15px;color:var(--text);font-weight:700;">➕ Aggiungi Manualmente</h3>

      <div style="display:flex;gap:8px;">
        <input type="text" id="gf-place-name" placeholder="Nome" style="flex:1;padding:10px;background:var(--surface-2);color:var(--text);border:1px solid var(--border);border-radius:6px;font-size:14px;" />
        <input type="text" id="gf-place-city" placeholder="Città" style="flex:0.8;padding:10px;background:var(--surface-2);color:var(--text);border:1px solid var(--border);border-radius:6px;font-size:14px;" />
      </div>

      <div style="display:flex;gap:8px;">
        <input type="text" id="gf-place-area" placeholder="Zona (opz.)" style="flex:1;padding:10px;background:var(--surface-2);color:var(--text);border:1px solid var(--border);border-radius:6px;font-size:14px;" />
        <select id="gf-place-rating" style="flex:1;padding:10px;background:var(--surface-2);color:var(--text);border:1px solid var(--border);border-radius:6px;font-size:14px;">
          <option value="5">⭐⭐⭐⭐⭐</option>
          <option value="4">⭐⭐⭐⭐</option>
          <option value="3">⭐⭐⭐</option>
          <option value="2">⭐⭐</option>
          <option value="1">⭐</option>
        </select>
      </div>

      <select id="gf-place-safety" style="width:100%;padding:10px;background:var(--surface-2);color:var(--text);border:1px solid var(--border);border-radius:6px;font-size:14px;">
        <option value="GREEN">🟢 GREEN - 100% Safe</option>
        <option value="YELLOW" selected>🟡 YELLOW - Caution</option>
        <option value="RED">🔴 RED - Danger</option>
      </select>

      <textarea id="gf-place-note" placeholder="Note personali..." style="width:100%;padding:10px;background:var(--surface-2);color:var(--text);border:1px solid var(--border);border-radius:6px;font-size:14px;min-height:70px;"></textarea>

      <input type="text" id="gf-place-tags" placeholder="Tags (Es: 100% sicuro, Cucina separata)" style="width:100%;padding:10px;background:var(--surface-2);color:var(--text);border:1px solid var(--border);border-radius:6px;font-size:14px;" />

      <input type="hidden" id="gf-place-source-url" value="" />
      <input type="hidden" id="gf-place-lat" value="" />
      <input type="hidden" id="gf-place-lng" value="" />

      <div style="display:flex;gap:8px;margin-bottom:10px;">
        <button onclick="window.geocodeGFPlace()" style="flex:1;padding:8px;background:rgba(100,149,237,0.2);border:1px solid rgba(100,149,237,0.4);color:var(--text);border-radius:6px;font-weight:700;font-size:13px;cursor:pointer;">📍 Geo-localizza</button>
        <button onclick="window.saveGFPlace()" id="gf-save-button" style="flex:1;padding:8px;background:linear-gradient(180deg,#7FFF7F,#6FEF6F);color:#000;border:none;border-radius:6px;font-weight:700;font-size:13px;cursor:pointer;">💾 Salva</button>
      </div>
    </div>
  `;

  const html = `<div class="gf-places-container" style="padding:16px;display:flex;flex-direction:column;gap:16px;">${addFormHtml}${placesHtml}</div>`;
  window.openSheet('🏪 I Miei Posti GF', html);

  // Pre-fill form if data provided (deep linking or edit mode)
  if (prefillData) {
    setTimeout(() => {
      if (prefillData.name) {
        const nameField = document.getElementById('gf-place-name');
        if (nameField) nameField.value = prefillData.name;
      }
      if (prefillData.city) {
        const cityField = document.getElementById('gf-place-city');
        if (cityField) cityField.value = prefillData.city;
      }
      if (prefillData.area) {
        const areaField = document.getElementById('gf-place-area');
        if (areaField) areaField.value = prefillData.area;
      }
      if (prefillData.rating) {
        const ratingField = document.getElementById('gf-place-rating');
        if (ratingField) ratingField.value = prefillData.rating;
      }
      if (prefillData.safety_level) {
        const safetyField = document.getElementById('gf-place-safety');
        if (safetyField) safetyField.value = prefillData.safety_level;
      }
      if (prefillData.note) {
        const noteField = document.getElementById('gf-place-note');
        if (noteField) noteField.value = prefillData.note;
      }
      if (prefillData.tags && Array.isArray(prefillData.tags)) {
        const tagsField = document.getElementById('gf-place-tags');
        if (tagsField) tagsField.value = prefillData.tags.join(', ');
      }
      if (prefillData.source_url) {
        const sourceUrlField = document.getElementById('gf-place-source-url');
        if (sourceUrlField) sourceUrlField.value = prefillData.source_url;
      }
      if (prefillData.lat) {
        document.getElementById('gf-place-lat').value = prefillData.lat;
      }
      if (prefillData.lng) {
        document.getElementById('gf-place-lng').value = prefillData.lng;
      }

      // Update button text if in edit mode
      if (window.gfEditMode?.enabled) {
        const saveBtn = document.getElementById('gf-save-button');
        if (saveBtn) {
          saveBtn.innerHTML = '✏️ Aggiorna';
          saveBtn.style.background = 'linear-gradient(180deg,#6BA3D4,#5B93C4)';
        }
      }

      console.log('[openGFPlacesPanel] Form pre-filled with:', prefillData);
    }, 100);
  } else {
    // Reset button text if not in edit mode
    setTimeout(() => {
      const saveBtn = document.getElementById('gf-save-button');
      if (saveBtn) {
        saveBtn.innerHTML = '💾 Salva';
        saveBtn.style.background = 'linear-gradient(180deg,#7FFF7F,#6FEF6F)';
      }
    }, 100);
  }
};

window.startEditGFPlace = function(placeId) {
  console.log('[startEditGFPlace] Starting edit for:', placeId);

  const places = GFPlacesDB.getAll();
  const place = places.find(p => p.id === placeId);

  if (!place) {
    window.toast(T('gfp.notFound', '❌ Posto non trovato'));
    return;
  }

  console.log('[startEditGFPlace] Found place:', place);

  // Open panel with edit mode
  window.openGFPlacesPanel(place, placeId);
};

window.saveGFPlace = function() {
  console.log('[saveGFPlace] Starting...');

  // Ottieni valori dai campi
  const nameField = document.getElementById('gf-place-name');
  const cityField = document.getElementById('gf-place-city');
  const areaField = document.getElementById('gf-place-area');
  const noteField = document.getElementById('gf-place-note');
  const ratingField = document.getElementById('gf-place-rating');
  const safetyField = document.getElementById('gf-place-safety');
  const tagsField = document.getElementById('gf-place-tags');
  const sourceUrlField = document.getElementById('gf-place-source-url');

  console.log('[saveGFPlace] Fields found:', {
    name: !!nameField,
    city: !!cityField,
    area: !!areaField,
    note: !!noteField,
    rating: !!ratingField,
    safety: !!safetyField,
    tags: !!tagsField,
    sourceUrl: !!sourceUrlField
  });

  const name = nameField?.value.trim();
  const city = cityField?.value.trim();
  const area = areaField?.value.trim() || null;
  const note = noteField?.value.trim() || null;
  const rating = parseInt(ratingField?.value || '5');
  const safety_level = safetyField?.value || 'YELLOW';
  const tags = (tagsField?.value || '')
    .split(',').map(t => t.trim()).filter(Boolean);
  const source_url = sourceUrlField?.value.trim() || null;
  const lat = document.getElementById('gf-place-lat')?.value || null;
  const lng = document.getElementById('gf-place-lng')?.value || null;

  console.log('[saveGFPlace] Values:', { name, city, area, note, rating, safety_level, tags, source_url });

  // Validazione
  if (!name || !city) {
    console.warn('[saveGFPlace] Validation failed - name or city missing');
    window.toast(T('gfp.required', '❌ Nome e città sono obbligatori'));
    return;
  }

  // Crea l'oggetto place
  const place = { name, city, area, note, rating, safety_level, tags, source_url, lat, lng };
  console.log('[saveGFPlace] Place object:', place);

  // Salva o aggiorna nel database
  let saved;
  const isEdit = window.gfEditMode?.enabled;

  if (isEdit) {
    console.log('[saveGFPlace] Edit mode - updating place:', window.gfEditMode.placeId);
    saved = GFPlacesDB.edit(window.gfEditMode.placeId, place);
  } else {
    console.log('[saveGFPlace] Add mode - creating new place');
    saved = GFPlacesDB.add(place);
  }

  console.log('[saveGFPlace] Saved to DB:', saved);

  if (!saved) {
    console.error('[saveGFPlace] Failed to save place');
    window.toast(T('gfp.saveError', '❌ Errore nel salvataggio del posto'));
    return;
  }

  // Pulisci il form
  if (nameField) nameField.value = '';
  if (cityField) cityField.value = '';
  if (areaField) areaField.value = '';
  if (noteField) noteField.value = '';
  if (ratingField) ratingField.value = '5';
  if (tagsField) tagsField.value = '';
  document.getElementById('gf-place-lat').value = '';
  document.getElementById('gf-place-lng').value = '';
  document.getElementById('gf-place-source-url').value = '';

  console.log('[saveGFPlace] Form cleared');

  // Mostra successo
  const successMsg = isEdit ? '✅ Posto aggiornato!' : '✅ Posto aggiunto!';
  window.toast(successMsg);
  console.log('[saveGFPlace] Success - reopening panel');

  // Reset edit mode
  window.gfEditMode.enabled = false;
  window.gfEditMode.placeId = null;

  // Riapri il panel dopo un po'
  setTimeout(() => {
    console.log('[saveGFPlace] Reopening GFPlacesPanel');
    window.openGFPlacesPanel();
  }, 500);

  // Refresh GF places layer on map
  if (window.refreshGFPlacesLayer) {
    window.refreshGFPlacesLayer();
  }
};

// ===== DEEP LINKING & SHARE TARGET SUPPORT =====
window.handleDeepLink = function() {
  const params = new URLSearchParams(window.location.search);

  // Check for Share Target API data (when shared from another app)
  const sharedTitle = params.get('title');
  const sharedText = params.get('text');
  const sharedUrl = params.get('url');

  if (sharedTitle || sharedText || sharedUrl) {
    console.log('[handleDeepLink] Detected Share Target data:', { sharedTitle, sharedText, sharedUrl });

    // Parse the shared data to extract restaurant info
    const prefillData = window.parseSharedRestaurantData(sharedTitle, sharedText, sharedUrl);

    // Clean URL bar (remove parameters)
    window.history.replaceState({}, document.title, window.location.pathname);

    console.log('[handleDeepLink] Opening GF Places panel from shared data:', prefillData);

    // Show confirmation toast
    window.toast?.('📲 Ristorante importato da Find Me GF!');

    // Open panel after a brief delay
    setTimeout(() => {
      window.openGFPlacesPanel(prefillData);
    }, 500);

    return true;
  }

  // Check if any GF deep link parameters exist (custom deep links)
  const gfName = params.get('gf_name');
  const gfCity = params.get('gf_city');

  if (gfName || gfCity) {
    console.log('[handleDeepLink] Detected GF deep link parameters');

    // Build prefill data
    const prefillData = {
      name: gfName || '',
      city: gfCity || '',
      area: params.get('gf_area') || '',
      rating: params.get('gf_rating') || '5',
      safety_level: params.get('gf_safety') || 'YELLOW',
      note: params.get('gf_note') || '',
      tags: params.get('gf_tags') ? params.get('gf_tags').split(',').map(t => t.trim()) : [],
      source_url: params.get('gf_source_url') || ''
    };

    // Clean URL bar (remove parameters)
    window.history.replaceState({}, document.title, window.location.pathname);

    console.log('[handleDeepLink] Opening GF Places panel with prefilled data:', prefillData);

    // Open panel after a brief delay to ensure page is ready
    setTimeout(() => {
      window.openGFPlacesPanel(prefillData);
    }, 500);

    return true;
  }

  return false;
};

// ===== GEOCODING SUPPORT (OpenStreetMap Nominatim) =====
window.geocodeRestaurant = async function(name, city, address) {
  try {
    console.log('[Geocode] Looking up:', { name, city, address });

    // Build search query
    const query = address ? address : `${name}, ${city}, Japan`;
    console.log('[Geocode] Query:', query);

    // Use Nominatim (OpenStreetMap) free geocoding service
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`
    );

    if (!response.ok) {
      console.warn('[Geocode] API error:', response.status);
      return null;
    }

    const results = await response.json();
    if (results.length === 0) {
      console.warn('[Geocode] No results found for:', query);
      return null;
    }

    const result = results[0];
    const coords = {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      address: result.display_name
    };

    console.log('[Geocode] Found:', coords);
    return coords;
  } catch (err) {
    console.error('[Geocode] Error:', err);
    return null;
  }
};

// ===== PARSE SHARED RESTAURANT DATA =====
// Extract restaurant name and city from shared text/title
window.parseSharedRestaurantData = function(title, text, url) {
  console.log('[parseSharedRestaurantData] Input:', { title, text, url });

  let restaurantName = '';
  let city = '';
  let sourceUrl = url || '';
  let notes = '';

  // Strategy 1: If title looks like a restaurant name (from FMGF or similar)
  if (title && title.length > 0) {
    restaurantName = title.trim();
  }

  // Strategy 2: Extract from text/description
  if (text && text.length > 0) {
    const textLines = text.split('\n');

    // First line often has the restaurant name
    if (!restaurantName && textLines.length > 0) {
      restaurantName = textLines[0].trim();
    }

    // Look for city patterns (Tokyo, Kyoto, Osaka, etc.)
    const cityPatterns = /(?:Tokyo|Kyoto|Osaka|Kobe|Nagoya|Sapporo|Fukuoka|Hiroshima|Kobe|Nara|Kanazawa|Nagano|Sendai)/i;
    const cityMatch = text.match(cityPatterns);
    if (cityMatch) {
      city = cityMatch[0];
    }

    // Store full text as notes
    notes = text.substring(0, 200); // First 200 chars as notes
  }

  // Strategy 3: Extract restaurant name from URL (if it's a FMGF or similar URL)
  if (!restaurantName && url && url.includes('findmeglutenfree')) {
    // Try to extract from URL path
    const nameMatch = url.match(/\/places\/([\w-]+)/i);
    if (nameMatch) {
      restaurantName = decodeURIComponent(nameMatch[1]).replace(/-/g, ' ');
    }
  }

  const prefillData = {
    name: restaurantName,
    city: city,
    area: '',
    rating: '4',
    safety_level: 'YELLOW',
    note: notes,
    tags: url && url.includes('findmeglutenfree') ? ['Da FMGF'] : [],
    source_url: sourceUrl
  };

  console.log('[parseSharedRestaurantData] Result:', prefillData);
  return prefillData;
};

window.geocodeGFPlace = async function() {
  console.log('[geocodeGFPlace] Starting geocoding...');

  const nameField = document.getElementById('gf-place-name');
  const cityField = document.getElementById('gf-place-city');
  const areaField = document.getElementById('gf-place-area');

  const name = nameField?.value.trim();
  const city = cityField?.value.trim();
  const area = areaField?.value.trim();

  if (!name || !city) {
    window.toast(T('gfp.geoRequired', '⚠️ Inserisci nome e città prima di geo-localizzare'));
    return;
  }

  window.toast('🔍 Geo-localizzando ' + name + '...');

  const address = area ? `${name}, ${area}, ${city}, Japan` : `${name}, ${city}, Japan`;
  const coords = await window.geocodeRestaurant(name, city, address);

  if (coords) {
    console.log('[geocodeGFPlace] Success:', coords);
    document.getElementById('gf-place-lat').value = coords.lat;
    document.getElementById('gf-place-lng').value = coords.lng;
    window.toast(`✅ Trovato! ${coords.address.substring(0, 40)}...`);
  } else {
    window.toast(T('gfp.geoFail', '❌ Posizione non trovata. Riprova con un indirizzo più specifico.'));
  }
};

window.deleteGFPlace = function(id) {
  GFPlacesDB.delete(id);
  window.toast(T('gfp.deleted', '✅ Posto eliminato'));

  // Refresh GF places layer on map
  if (window.refreshGFPlacesLayer) {
    window.refreshGFPlacesLayer();
  }
};


// ===== GF POI SUGGESTION PANEL =====
window.openGFSuggestionPanel = function() {
  const suggestions = GFSuggestionsDB.getAll();

  let suggestionsHtml = '';
  if (suggestions.length === 0) {
    suggestionsHtml = '<div style="text-align:center;padding:20px;color:var(--muted);">Nessun suggerimento inviato ancora</div>';
  } else {
    suggestionsHtml = suggestions.map(s => `
      <div style="background:rgba(74,91,168,0.08);border:1px solid rgba(74,91,168,0.2);border-radius:12px;padding:12px;margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px;">
          <div>
            <div style="font-weight:700;color:var(--text);">${s.name}</div>
            <div style="font-size:14px;color:var(--muted);">${s.city}${s.area ? ' · ' + s.area : ''}</div>
          </div>
          <div style="padding:3px 8px;border-radius:4px;font-size:14px;font-weight:700;${
            s.status === 'approved' ? 'background:rgba(127,255,127,0.2);color:#7FFF7F' :
            s.status === 'rejected' ? 'background:rgba(255,107,107,0.2);color:#FF6B6B' :
            'background:rgba(255,215,0,0.2);color:#FFD700'
          };">${s.status === 'approved' ? '✅ Approvato' : s.status === 'rejected' ? '❌ Rifiutato' : '⏳ In attesa'}</div>
        </div>
        <div style="font-size:13px;color:var(--muted);margin-bottom:6px;">Inviato: ${new Date(s.submittedAt).toLocaleDateString('it-IT')}</div>
        <button onclick="(window.modalConfirm||((m)=>Promise.resolve(confirm(m))))('Eliminare questo suggerimento?',{danger:true,confirmText:'Elimina'}).then(ok=>{ if(ok){ GFSuggestionsDB.delete('${s.id}'); window.openGFSuggestionPanel(); } })" style="width:100%;padding:6px;background:rgba(255,107,107,0.2);border:1px solid rgba(255,107,107,0.4);color:var(--text);border-radius:4px;font-size:13px;cursor:pointer;">🗑️ Elimina</button>
      </div>
    `).join('');
  }

  const formHtml = `
    <div style="background:rgba(100,200,100,0.12);backdrop-filter:blur(10px);border:1px solid rgba(100,200,100,0.3);border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:12px;">
      <h3 style="margin:0;font-size:15px;color:var(--text);font-weight:700;">✨ Suggerisci un Nuovo POI</h3>

      <div style="display:flex;gap:8px;">
        <input type="text" id="gf-suggest-name" placeholder="Nome ristorante" style="flex:1;padding:10px;background:var(--surface-2);color:var(--text);border:1px solid var(--border);border-radius:6px;font-size:14px;box-sizing:border-box;" />
        <input type="text" id="gf-suggest-city" placeholder="Città" style="flex:0.8;padding:10px;background:var(--surface-2);color:var(--text);border:1px solid var(--border);border-radius:6px;font-size:14px;box-sizing:border-box;" />
      </div>

      <div style="display:flex;gap:8px;">
        <input type="text" id="gf-suggest-area" placeholder="Zona (opz.)" style="flex:1;padding:10px;background:var(--surface-2);color:var(--text);border:1px solid var(--border);border-radius:6px;font-size:14px;box-sizing:border-box;" />
        <input type="text" id="gf-suggest-address" placeholder="Indirizzo (opz.)" style="flex:1;padding:10px;background:var(--surface-2);color:var(--text);border:1px solid var(--border);border-radius:6px;font-size:14px;box-sizing:border-box;" />
      </div>

      <input type="email" id="gf-suggest-email" placeholder="La tua email (opzionale)" style="width:100%;padding:10px;background:var(--surface-2);color:var(--text);border:1px solid var(--border);border-radius:6px;font-size:14px;box-sizing:border-box;" />

      <textarea id="gf-suggest-description" placeholder="Descrizione / Motivo (Eg: Menu 100% GF, staff attento...)" style="width:100%;padding:10px;background:var(--surface-2);color:var(--text);border:1px solid var(--border);border-radius:6px;font-size:14px;min-height:70px;box-sizing:border-box;"></textarea>

      <button onclick="window.submitGFSuggestion()" style="width:100%;padding:10px;background:linear-gradient(180deg,#64C864,#54B854);color:#000;border:none;border-radius:6px;font-weight:700;font-size:14px;cursor:pointer;box-sizing:border-box;">🚀 Invia Suggerimento</button>
    </div>
  `;

  const html = `<div style="padding:16px;display:flex;flex-direction:column;gap:16px;">${formHtml}<div><h3 style="margin:0 0 12px;font-size:15px;color:var(--text);font-weight:700;">📋 I Tuoi Suggerimenti</h3>${suggestionsHtml}</div></div>`;
  window.openSheet('💡 Suggerisci POI', html);
};

window.submitGFSuggestion = function() {
  const name = document.getElementById('gf-suggest-name')?.value.trim();
  const city = document.getElementById('gf-suggest-city')?.value.trim();
  const area = document.getElementById('gf-suggest-area')?.value.trim() || null;
  const address = document.getElementById('gf-suggest-address')?.value.trim() || null;
  const email = document.getElementById('gf-suggest-email')?.value.trim() || null;
  const description = document.getElementById('gf-suggest-description')?.value.trim() || null;

  if (!name || !city) {
    window.toast(T('gfp.required', '❌ Nome e città sono obbligatori'));
    return;
  }

  const suggestion = {
    name,
    city,
    area,
    address,
    email,
    description
  };

  const saved = GFSuggestionsDB.add(suggestion);

  if (saved) {
    window.toast(T('gfp.submitted', '🎉 Suggerimento inviato! Grazie per aver contribuito! 🙏'));

    // Pulisci il form
    document.getElementById('gf-suggest-name').value = '';
    document.getElementById('gf-suggest-city').value = '';
    document.getElementById('gf-suggest-area').value = '';
    document.getElementById('gf-suggest-address').value = '';
    document.getElementById('gf-suggest-email').value = '';
    document.getElementById('gf-suggest-description').value = '';

    // Riapri panel
    setTimeout(() => {
      window.openGFSuggestionPanel();
    }, 500);
  } else {
    window.toast(T('gfp.saveErr', '❌ Errore nel salvataggio'));
  }
};

// ===== FIND ME GLUTEN FREE INTEGRATION =====

// Hook: broadcast GF places quando ricevi aggiornamenti P2P
const originalOnMessage = window.onDataChannelMessage;
window.onDataChannelMessage = function(msg) {
  if (originalOnMessage) originalOnMessage(msg);
  
  if (msg.type === 'gf_place_add' || msg.type === 'gf_place_edit' || msg.type === 'gf_place_delete') {
    const places = GFPlacesDB.getAll();
    if (msg.type === 'gf_place_add') {
      GFPlacesDB.add(msg.place);
    } else if (msg.type === 'gf_place_edit') {
      GFPlacesDB.edit(msg.id, msg.updates);
    } else if (msg.type === 'gf_place_delete') {
      GFPlacesDB.delete(msg.id);
    }
    window.toast(T('gfp.synced', '🔄 Posti GF sincronizzati dal peer'));
  }
};

  window.GroqMenuAnalyzer = GroqMenuAnalyzer;
  window.GFSuggestionsDB = GFSuggestionsDB;
  window.GFPlacesDB = GFPlacesDB;
})();
