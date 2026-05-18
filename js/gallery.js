/**
 * GALLERY — Photos + IndexedDB management
 * Extracted from index.html
 */

import { state, showToast } from './core.js';

export let photos = [];
export let idbDatabase = null;

// ============================================================================
// INDEXEDDB INIT
// ============================================================================

export async function initIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SafeEatsPhotos', 1);

    request.onerror = () => {
      console.error('[Gallery] IDB init error:', request.error);
      reject(request.error);
    };

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('photos')) {
        db.createObjectStore('photos', { keyPath: 'id' });
      }
      console.log('[Gallery] IDB store created');
    };

    request.onsuccess = () => {
      idbDatabase = request.result;
      console.log('[Gallery] ✓ IndexedDB initialized');
      resolve(idbDatabase);
    };
  });
}

// ============================================================================
// PHOTO UPLOAD
// ============================================================================

export async function uploadPhoto(file, metadata = {}) {
  if (!file.type.startsWith('image/')) {
    showToast('Invalid file type', 'error');
    return null;
  }

  try {
    const compressed = await compressImage(file);

    const photo = {
      id: `photo_${Date.now()}_${Math.random()}`,
      filename: file.name,
      compressed: compressed,
      size: compressed.length,
      timestamp: new Date().toISOString(),
      mimeType: 'image/jpeg',
      ...metadata
    };

    // Save to IndexedDB
    await savePhotoToIDB(photo);

    photos.push(photo);
    console.log('[Gallery] Photo uploaded:', file.name, `(${(compressed.length / 1024).toFixed(0)} KB)`);
    showToast('Photo saved', 'success');

    return photo;
  } catch (err) {
    console.error('[Gallery] Upload error:', err);
    showToast('Upload failed', 'error');
    return null;
  }
}

// ============================================================================
// IMAGE COMPRESSION
// ============================================================================

async function compressImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        let width = img.width;
        let height = img.height;

        // Resize to max 1200px
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

// ============================================================================
// INDEXEDDB OPERATIONS
// ============================================================================

function savePhotoToIDB(photo) {
  return new Promise((resolve, reject) => {
    if (!idbDatabase) {
      reject(new Error('IDB not initialized'));
      return;
    }

    const tx = idbDatabase.transaction('photos', 'readwrite');
    const store = tx.objectStore('photos');
    const request = store.put(photo);

    request.onsuccess = () => {
      console.log('[Gallery] Photo saved to IDB:', photo.id);
      resolve(photo);
    };

    request.onerror = () => {
      console.error('[Gallery] IDB save error:', request.error);
      reject(request.error);
    };
  });
}

export async function loadPhotosFromIDB() {
  return new Promise((resolve, reject) => {
    if (!idbDatabase) {
      reject(new Error('IDB not initialized'));
      return;
    }

    const tx = idbDatabase.transaction('photos', 'readonly');
    const store = tx.objectStore('photos');
    const request = store.getAll();

    request.onsuccess = () => {
      photos = request.result;
      console.log('[Gallery] ✓ Loaded', photos.length, 'photos from IDB');
      resolve(photos);
    };

    request.onerror = () => {
      console.error('[Gallery] IDB load error:', request.error);
      reject(request.error);
    };
  });
}

export async function deletePhotoFromIDB(photoId) {
  return new Promise((resolve, reject) => {
    if (!idbDatabase) {
      reject(new Error('IDB not initialized'));
      return;
    }

    const tx = idbDatabase.transaction('photos', 'readwrite');
    const store = tx.objectStore('photos');
    const request = store.delete(photoId);

    request.onsuccess = () => {
      photos = photos.filter(p => p.id !== photoId);
      console.log('[Gallery] Photo deleted:', photoId);
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// ============================================================================
// GALLERY RENDERING
// ============================================================================

export function renderGallery() {
  const gallery = document.getElementById('gallery-grid');
  if (!gallery) return;

  gallery.innerHTML = photos
    .map(photo => `
      <div style="border: 1px solid rgba(255,255,255,0.3); border-radius: 8px; padding: 8px; cursor: pointer; hover-scale: 1.05; transition: all 0.2s;">
        <img src="${photo.compressed}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 4px; margin-bottom: 8px;" alt="${photo.filename}">
        <small style="display: block; opacity: 0.7; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          ${photo.filename}
        </small>
        <small style="display: block; opacity: 0.5; font-size: 10px;">
          ${new Date(photo.timestamp).toLocaleDateString('it-IT')}
        </small>
      </div>
    `)
    .join('');
}

// ============================================================================
// EXPORT
// ============================================================================

export function getPhotos(limit = null) {
  if (limit) {
    return photos.slice(-limit);
  }
  return photos;
}

export function getPhotoById(id) {
  return photos.find(p => p.id === id);
}

// ============================================================================
// INIT
// ============================================================================

console.log('[Gallery] ✓ Gallery module loaded');
