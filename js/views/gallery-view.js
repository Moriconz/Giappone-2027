/**
 * views/gallery-view.js — Galleria foto (upload + timeline)
 *
 * Estratto da app-core.js il 2026-05-29 (refactor §6.9, riduzione monolite).
 * Cluster auto-contenuto: getGalleryDB/saveGalleryDB (localStorage 'GalleryDB'),
 * compressImage (canvas → JPEG 0.75), renderGalleryView (UI upload + griglia +
 * edit/delete caption). Verificato isolato: nessun uso esterno dei 4 simboli.
 *
 * Esposto:
 *   - window.renderGalleryView()  (chiamata dal dispatcher view in app-core)
 *   - window.getGalleryDB / window.saveGalleryDB (riuso eventuale, es. avatar)
 *
 * Dipendenze esterne (tutte su window):
 *   - window.openSheet(title, html), window.toast(msg)
 */
(function () {
  'use strict';

  function getGalleryDB() {
    const stored = localStorage.getItem('GalleryDB');
    return stored ? JSON.parse(stored) : { photos: [] };
  }

  function saveGalleryDB(db) {
    localStorage.setItem('GalleryDB', JSON.stringify(db));
  }

  function compressImage(dataUrl, maxWidth = 800, maxHeight = 800) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) { height = (height * maxWidth) / width; width = maxWidth; }
        } else {
          if (height > maxHeight) { width = (width * maxHeight) / height; height = maxHeight; }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.src = dataUrl;
    });
  }

  function renderGalleryView() {
    const db = getGalleryDB();
    const photoCount = db.photos.length;

    let html = `
      <div class="gallery-container">
        <!-- Header with stats -->
        <div class="gallery-header">
          <h2 style="margin:0;color:var(--y2k-ink);font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif;font-size:18px;font-weight:700">📸 Galleria</h2>
          <div style="font-size:13px;color:var(--y2k-muted);font-weight:700">${photoCount} foto</div>
        </div>

        <!-- Upload section -->
        <div class="gallery-upload-section">
          <div class="gallery-upload-area" id="gallery-drop-zone">
            <input type="file" id="gallery-file-input" accept="image/*" multiple style="display:none" />
            <div style="text-align:center;padding:20px;cursor:pointer">
              <div style="font-size:32px;margin-bottom:8px">📷</div>
              <div style="color:#fff;font-weight:700;font-size:14px;margin-bottom:4px">Aggiungi Foto</div>
              <div style="color:rgba(255,255,255,0.6);font-size:12px">Clicca o trascina foto qui</div>
            </div>
          </div>
        </div>

        <!-- Gallery grid -->
        <div class="gallery-grid">
          ${photoCount === 0 ? `
            <div style="grid-column:1/-1;text-align:center;padding:40px 20px;color:var(--y2k-muted)">
              <div style="font-size:48px;margin-bottom:12px">🗂️</div>
              <p>Nessuna foto ancora. Caricane una per iniziare!</p>
            </div>
          ` : db.photos.sort((a, b) => new Date(b.date) - new Date(a.date)).map((photo, idx) => {
            const date = new Date(photo.date).toLocaleDateString('it-IT', { month: 'short', day: 'numeric' });
            return `
              <div class="gallery-photo-card">
                <img src="${photo.data}" alt="Foto ${idx + 1}" loading="lazy" class="gallery-photo-img" />
                <div class="gallery-photo-meta">
                  <div class="gallery-photo-date">${date}</div>
                  ${photo.caption ? `<div class="gallery-photo-caption">${photo.caption}</div>` : ''}
                </div>
                <div class="gallery-photo-actions">
                  <button class="gallery-btn-edit" data-idx="${idx}">✏️</button>
                  <button class="gallery-btn-delete" data-idx="${idx}">🗑️</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Stats -->
        <div class="gallery-stats">
          <div style="color:var(--y2k-muted);font-size:12px">
            <strong>${photoCount}</strong> foto • <strong>${(db.photos.reduce((s, p) => s + (p.data?.length || 0), 0) / 1024 / 1024).toFixed(1)}</strong> MB
          </div>
        </div>
      </div>
    `;

    window.openSheet('📸 Galleria', html);

    async function handleFiles(files) {
      for (const file of files) {
        if (!file.type.startsWith('image/')) continue;
        const reader = new FileReader();
        reader.onload = async (e) => {
          const compressed = await compressImage(e.target.result);
          db.photos.push({
            id: Date.now() + Math.random(),
            data: compressed,
            date: new Date().toISOString(),
            caption: '',
          });
          saveGalleryDB(db);
          window.toast('Foto aggiunta!');
          renderGalleryView();
        };
        reader.readAsDataURL(file);
      }
    }

    // File input — setup with delay to ensure DOM ready
    setTimeout(() => {
      const fileInput = document.getElementById('gallery-file-input');
      const dropZone = document.getElementById('gallery-drop-zone');
      if (!fileInput || !dropZone) {
        console.warn('[Gallery] File input or drop zone not found');
        return;
      }
      dropZone.onclick = () => { fileInput.click(); };
      dropZone.ondragover = (e) => { e.preventDefault(); dropZone.style.background = 'rgba(255,20,147,0.1)'; };
      dropZone.ondragleave = () => { dropZone.style.background = ''; };
      dropZone.ondrop = (e) => {
        e.preventDefault();
        dropZone.style.background = '';
        handleFiles(e.dataTransfer.files);
      };
      fileInput.onchange = (e) => { handleFiles(e.target.files); };
    }, 100);

    // Edit/Delete handlers
    setTimeout(() => {
      document.querySelectorAll('.gallery-btn-edit').forEach(btn => {
        btn.onclick = () => {
          const idx = parseInt(btn.dataset.idx, 10);
          const photo = db.photos[idx];
          (window.modalPrompt || ((msg, o) => Promise.resolve(prompt(msg, o?.defaultValue || ''))))('Didascalia:', { defaultValue: photo.caption || '' })
            .then(newCaption => {
              if (newCaption !== null) { photo.caption = newCaption; saveGalleryDB(db); renderGalleryView(); }
            });
        };
      });
      document.querySelectorAll('.gallery-btn-delete').forEach(btn => {
        btn.onclick = () => {
          const idx = parseInt(btn.dataset.idx, 10);
          (window.modalConfirm || ((m) => Promise.resolve(confirm(m))))('Eliminare questa foto?', { danger: true, confirmText: 'Elimina' })
            .then(ok => {
              if (!ok) return;
              db.photos.splice(idx, 1);
              saveGalleryDB(db);
              window.toast('Foto eliminata');
              renderGalleryView();
            });
        };
      });
    }, 100);
  }

  window.getGalleryDB = getGalleryDB;
  window.saveGalleryDB = saveGalleryDB;
  window.renderGalleryView = renderGalleryView;
})();
