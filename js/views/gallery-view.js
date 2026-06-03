/**
 * views/gallery-view.js — Galleria foto (upload + timeline)
 *
 * Storage: IndexedDB ('gj2027-gallery', store 'photos') invece di
 * localStorage — nessun limite pratico di dimensioni, migliore perf.
 * Migrazione automatica da localStorage 'GalleryDB' al primo avvio.
 *
 * Esposto:
 *   - window.renderGalleryView()
 *
 * Dipendenze: window.openSheet, window.toast, window.modalConfirm,
 *             window.modalPrompt
 */
(function () {
  'use strict';

  const IDB_NAME  = 'gj2027-gallery';
  const IDB_VER   = 1;
  const IDB_STORE = 'photos';
  let _idb = null;

  // ─── IndexedDB helpers ───────────────────────────────────────────

  function openIDB() {
    if (_idb) return Promise.resolve(_idb);
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(IDB_NAME, IDB_VER);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess  = (e) => { _idb = e.target.result; resolve(_idb); };
      req.onerror    = (e) => reject(e.target.error);
    });
  }

  async function getAllPhotos() {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
      const req = db.transaction(IDB_STORE, 'readonly')
                    .objectStore(IDB_STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror   = () => reject(req.error);
    });
  }

  async function addPhotoIDB(photo) {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
      const req = db.transaction(IDB_STORE, 'readwrite')
                    .objectStore(IDB_STORE).put(photo);
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
    });
  }

  async function deletePhotoIDB(id) {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
      const req = db.transaction(IDB_STORE, 'readwrite')
                    .objectStore(IDB_STORE).delete(id);
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
    });
  }

  // ─── Migration from localStorage ─────────────────────────────────

  async function migrateFromLocalStorage() {
    const raw = localStorage.getItem('GalleryDB');
    if (!raw) return;
    try {
      const { photos = [] } = JSON.parse(raw);
      if (!photos.length) { localStorage.removeItem('GalleryDB'); return; }
      for (const p of photos) {
        if (p.id == null) p.id = Date.now() + Math.random();
        await addPhotoIDB(p);
      }
      localStorage.removeItem('GalleryDB');
    } catch (_) {}
  }

  // ─── Image compression ────────────────────────────────────────────

  function compressImage(dataUrl, maxW = 800, maxH = 800) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > h) { if (w > maxW) { h = (h * maxW) / w; w = maxW; } }
        else        { if (h > maxH) { w = (w * maxH) / h; h = maxH; } }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.src = dataUrl;
    });
  }

  // ─── Render ───────────────────────────────────────────────────────

  async function renderGalleryView() {
    await migrateFromLocalStorage();
    const photos = await getAllPhotos();
    photos.sort((a, b) => new Date(b.date) - new Date(a.date));
    const totalKB = (photos.reduce((s, p) => s + (p.data?.length || 0), 0) / 1024).toFixed(0);

    const photoGrid = photos.length === 0 ? `
      <div style="grid-column:1/-1;display:flex;flex-direction:column;align-items:center;padding:40px 20px;text-align:center;">
        <div style="font-size:52px;margin-bottom:14px">📷</div>
        <div style="font-size:16px;font-weight:700;color:var(--m-text);margin-bottom:6px">Nessuna foto ancora</div>
        <p style="font-size:13px;color:var(--m-text-3);margin:0 0 20px;max-width:240px;line-height:1.5">Cattura i momenti del viaggio e salvali qui. Le foto restano nel dispositivo.</p>
        <button onclick="document.getElementById('gallery-file-input')?.click()" class="m-btn-cta">📁 Aggiungi la prima foto</button>
      </div>` : photos.map((photo, idx) => {
      const date = new Date(photo.date).toLocaleDateString('it-IT', { month: 'short', day: 'numeric' });
      return `
        <div class="gallery-photo-card">
          <img src="${photo.data}" alt="Foto ${idx + 1}" loading="lazy" decoding="async" class="gallery-photo-img" />
          <div class="gallery-photo-meta">
            <div class="gallery-photo-date">${date}</div>
            ${photo.caption ? `<div class="gallery-photo-caption">${photo.caption}</div>` : ''}
          </div>
          <div class="gallery-photo-actions">
            <button class="gallery-btn-edit"   data-id="${photo.id}" aria-label="Modifica descrizione">✏️</button>
            <button class="gallery-btn-delete" data-id="${photo.id}" aria-label="Elimina foto">🗑️</button>
          </div>
        </div>`;
    }).join('');

    const html = `
      <div class="gallery-container">
        <div class="gallery-header">
          <h2 style="margin:0;color:var(--m-text);font-size:18px;font-weight:700">📸 Galleria</h2>
          <div style="font-size:13px;color:var(--m-text-3);font-weight:600">${photos.length} foto · ${totalKB > 1024 ? (totalKB / 1024).toFixed(1) + ' MB' : totalKB + ' KB'}</div>
        </div>

        <div class="gallery-upload-section">
          <div class="gallery-upload-area" id="gallery-drop-zone">
            <input type="file" id="gallery-file-input" accept="image/*" multiple style="display:none" />
            <div style="text-align:center;padding:20px;cursor:pointer">
              <div style="font-size:32px;margin-bottom:8px">📷</div>
              <div style="color:var(--m-text);font-weight:700;font-size:14px;margin-bottom:4px">Aggiungi Foto</div>
              <div style="color:var(--m-text-3);font-size:12px">Clicca o trascina foto qui</div>
            </div>
          </div>
        </div>

        <div class="gallery-grid">${photoGrid}</div>

        <div class="gallery-stats">
          <div style="color:var(--m-text-3);font-size:12px">
            Archiviato in IndexedDB — nessun limite di spazio
          </div>
        </div>
      </div>`;

    window.openSheet('📸 Galleria', html);

    async function handleFiles(files) {
      for (const file of files) {
        if (!file.type.startsWith('image/')) continue;
        const reader = new FileReader();
        reader.onload = async (e) => {
          const compressed = await compressImage(e.target.result);
          await addPhotoIDB({
            id: Date.now() + Math.random(),
            data: compressed,
            date: new Date().toISOString(),
            caption: '',
          });
          window.toast('Foto aggiunta!');
          renderGalleryView();
        };
        reader.readAsDataURL(file);
      }
    }

    setTimeout(() => {
      const fileInput = document.getElementById('gallery-file-input');
      const dropZone  = document.getElementById('gallery-drop-zone');
      if (!fileInput || !dropZone) return;
      dropZone.onclick  = () => fileInput.click();
      dropZone.ondragover = (e) => { e.preventDefault(); dropZone.style.background = 'rgba(255,122,69,0.1)'; };
      dropZone.ondragleave = () => { dropZone.style.background = ''; };
      dropZone.ondrop = (e) => { e.preventDefault(); dropZone.style.background = ''; handleFiles(e.dataTransfer.files); };
      fileInput.onchange = (e) => handleFiles(e.target.files);

      document.querySelectorAll('.gallery-btn-edit').forEach(btn => {
        btn.onclick = async () => {
          const id   = Number(btn.dataset.id);
          const photo = photos.find(p => p.id === id);
          if (!photo) return;
          const caption = await (window.modalPrompt || ((msg, o) => Promise.resolve(prompt(msg, o?.defaultValue || ''))))('Didascalia:', { defaultValue: photo.caption || '' });
          if (caption !== null) {
            photo.caption = caption;
            await addPhotoIDB(photo);
            renderGalleryView();
          }
        };
      });

      document.querySelectorAll('.gallery-btn-delete').forEach(btn => {
        btn.onclick = async () => {
          const id = Number(btn.dataset.id);
          const ok = await (window.modalConfirm || ((m) => Promise.resolve(confirm(m))))('Eliminare questa foto?', { danger: true, confirmText: 'Elimina' });
          if (!ok) return;
          await deletePhotoIDB(id);
          window.toast('Foto eliminata');
          renderGalleryView();
        };
      });
    }, 100);
  }

  window.renderGalleryView = renderGalleryView;
})();
