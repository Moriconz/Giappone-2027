/**
 * GF Photo Upload — Menu foto per POI
 * Celiaco scatta foto menu GF → validazione automatica
 */

class GFPhotoUpload {
  constructor() {
    this.currentPOIId = null;
    this.photos = new Map(); // poiId → [{ file, timestamp, validated }]
    this.loadFromIndexedDB();
  }

  /**
   * Apri upload modal per POI
   */
  openForPOI(poiId, poiName = 'POI') {
    this.currentPOIId = poiId;

    // Remove if exists
    const existing = document.getElementById('gf-photo-modal');
    if (existing) existing.remove();

    // Create modal
    const modal = document.createElement('div');
    modal.id = 'gf-photo-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 5000;
      padding: 20px;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      background: linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%);
      border-radius: 20px;
      padding: 30px;
      max-width: 400px;
      width: 100%;
      color: white;
      font-family: 'Segoe UI', sans-serif;
    `;

    const title = document.createElement('h2');
    title.style.cssText = 'margin: 0 0 10px 0; font-size: 1.5rem;';
    title.textContent = `📸 Foto Menu GF`;

    const subtitle = document.createElement('p');
    subtitle.style.cssText = 'margin: 0 0 20px 0; font-size: 0.9rem; opacity: 0.9;';
    subtitle.textContent = `Ristorante: ${poiName}`;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.style.cssText = `
      display: block;
      margin-bottom: 20px;
      width: 100%;
      padding: 10px;
      background: rgba(255, 255, 255, 0.1);
      border: 2px dashed rgba(255, 255, 255, 0.5);
      border-radius: 10px;
      color: white;
      cursor: pointer;
    `;

    const uploadBtn = document.createElement('button');
    uploadBtn.style.cssText = `
      width: 100%;
      padding: 15px;
      background: rgba(255, 255, 255, 0.2);
      border: 2px solid white;
      color: white;
      border-radius: 10px;
      font-size: 1rem;
      font-weight: bold;
      cursor: pointer;
      margin-bottom: 10px;
      transition: all 0.3s ease;
    `;
    uploadBtn.textContent = '📤 Salva Foto';

    uploadBtn.onmouseover = () => {
      uploadBtn.style.background = 'rgba(255, 255, 255, 0.3)';
      uploadBtn.style.transform = 'scale(1.05)';
    };
    uploadBtn.onmouseout = () => {
      uploadBtn.style.background = 'rgba(255, 255, 255, 0.2)';
      uploadBtn.style.transform = 'scale(1)';
    };

    uploadBtn.onclick = () => this.uploadPhotos(input.files);

    const cancelBtn = document.createElement('button');
    cancelBtn.style.cssText = `
      width: 100%;
      padding: 15px;
      background: rgba(0, 0, 0, 0.2);
      border: 2px solid rgba(255, 255, 255, 0.5);
      color: white;
      border-radius: 10px;
      font-size: 1rem;
      cursor: pointer;
    `;
    cancelBtn.textContent = 'Chiudi';
    cancelBtn.onclick = () => modal.remove();

    content.appendChild(title);
    content.appendChild(subtitle);
    content.appendChild(input);
    content.appendChild(uploadBtn);
    content.appendChild(cancelBtn);

    modal.appendChild(content);
    document.body.appendChild(modal);

    // Close on Escape
    const escapeHandler = (e) => {
      if (e.key === 'Escape') modal.remove();
    };
    document.addEventListener('keydown', escapeHandler, { once: true });
  }

  /**
   * Upload + compress + save to IndexedDB
   */
  async uploadPhotos(fileList) {
    if (!fileList.length) {
      alert('Seleziona almeno una foto');
      return;
    }

    const poiPhotos = this.photos.get(this.currentPOIId) || [];

    for (const file of fileList) {
      // Compress client-side
      const compressed = await this.compressImage(file);

      // Save to IndexedDB
      poiPhotos.push({
        id: `${this.currentPOIId}-${Date.now()}-${Math.random()}`,
        poiId: this.currentPOIId,
        filename: file.name,
        compressed: compressed, // base64
        timestamp: new Date().toISOString(),
        validated: false
      });

      console.log(`[GFPhoto] ✓ Compressed ${file.name} → ${(compressed.length / 1024).toFixed(0)} KB`);
    }

    this.photos.set(this.currentPOIId, poiPhotos);
    await this.saveToIndexedDB();

    alert(`✅ ${fileList.length} foto salvate per questo ristorante`);
    document.getElementById('gf-photo-modal')?.remove();
  }

  /**
   * Compress image to JPEG 85% quality
   */
  async compressImage(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const img = new Image();

        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          // Resize: max 1200px width
          let width = img.width;
          let height = img.height;

          if (width > 1200) {
            height = Math.round((height * 1200) / width);
            width = 1200;
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          // Compress to JPEG 85%
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          resolve(compressed);
        };

        img.src = e.target.result;
      };

      reader.readAsDataURL(file);
    });
  }

  /**
   * Save to IndexedDB (photos for offline)
   */
  async saveToIndexedDB() {
    return new Promise((resolve) => {
      const request = indexedDB.open('GFPhotos', 1);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('photos')) {
          db.createObjectStore('photos', { keyPath: 'id' });
        }
      };

      request.onsuccess = (e) => {
        const db = e.target.result;
        const tx = db.transaction('photos', 'readwrite');
        const store = tx.objectStore('photos');

        for (const [poiId, photoList] of this.photos) {
          for (const photo of photoList) {
            store.put(photo);
          }
        }

        tx.oncomplete = () => {
          console.log('[GFPhoto] ✓ Saved to IndexedDB');
          resolve();
        };
      };
    });
  }

  /**
   * Load from IndexedDB on init
   */
  async loadFromIndexedDB() {
    return new Promise((resolve) => {
      const request = indexedDB.open('GFPhotos', 1);

      request.onsuccess = (e) => {
        const db = e.target.result;
        const tx = db.transaction('photos', 'readonly');
        const store = tx.objectStore('photos');
        const allPhotos = store.getAll();

        allPhotos.onsuccess = () => {
          const photosArray = allPhotos.result;

          for (const photo of photosArray) {
            const poiId = photo.poiId;
            if (!this.photos.has(poiId)) {
              this.photos.set(poiId, []);
            }
            this.photos.get(poiId).push(photo);
          }

          console.log(`[GFPhoto] ✓ Loaded ${photosArray.length} foto from IndexedDB`);
          resolve();
        };
      };

      request.onerror = () => resolve();
    });
  }

  /**
   * Get photos per POI
   */
  getPhotosForPOI(poiId) {
    return this.photos.get(poiId) || [];
  }

  /**
   * Delete photo
   */
  async deletePhoto(photoId) {
    return new Promise((resolve) => {
      const request = indexedDB.open('GFPhotos', 1);

      request.onsuccess = (e) => {
        const db = e.target.result;
        const tx = db.transaction('photos', 'readwrite');
        const store = tx.objectStore('photos');
        store.delete(photoId);

        tx.oncomplete = () => {
          // Remove from memory
          for (const [, photoList] of this.photos) {
            const idx = photoList.findIndex((p) => p.id === photoId);
            if (idx !== -1) {
              photoList.splice(idx, 1);
            }
          }
          console.log(`[GFPhoto] ✓ Deleted ${photoId}`);
          resolve();
        };
      };
    });
  }
}

// Export singleton
export const gfPhotoUpload = new GFPhotoUpload();

// Keyboard shortcut: Ctrl+Shift+P = open photo upload for active POI
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
    e.preventDefault();
    // Assume active POI in window (or use geolocation to find nearest)
    if (window.lastActivePOI) {
      gfPhotoUpload.openForPOI(window.lastActivePOI.id, window.lastActivePOI.name);
    } else {
      alert('Seleziona un ristorante dalla mappa prima');
    }
  }
});
