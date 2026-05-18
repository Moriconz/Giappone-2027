// ============================================================================
// JS/ENCRYPTION.JS — AES-256-GCM via Web Crypto API (nativo, no librerie)
// Phase 3 — caricato per primo tra i moduli app
// ============================================================================

console.log('[Encryption] Loading...');

window.appEncryption = (() => {
  const ENC = 'AES-GCM';
  const ITER = 100_000;
  const SALT_LEN = 16;
  const IV_LEN = 12;

  // Deriva chiave AES da password + salt (PBKDF2)
  async function _deriveKey(password, salt) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256' },
      keyMaterial,
      { name: ENC, length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  // Converti ArrayBuffer ↔ Base64
  function _toB64(buf) {
    return btoa(String.fromCharCode(...new Uint8Array(buf)));
  }
  function _fromB64(b64) {
    return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  }

  /**
   * encrypt(plaintext, password) → string cifrata (base64, include salt+iv)
   */
  async function encrypt(plaintext, password) {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
    const iv   = crypto.getRandomValues(new Uint8Array(IV_LEN));
    const key  = await _deriveKey(password, salt);
    const enc  = new TextEncoder();

    const cipherBuf = await crypto.subtle.encrypt(
      { name: ENC, iv },
      key,
      enc.encode(plaintext)
    );

    // Formato: salt(16) + iv(12) + ciphertext → base64
    const combined = new Uint8Array(SALT_LEN + IV_LEN + cipherBuf.byteLength);
    combined.set(salt, 0);
    combined.set(iv, SALT_LEN);
    combined.set(new Uint8Array(cipherBuf), SALT_LEN + IV_LEN);
    return _toB64(combined.buffer);
  }

  /**
   * decrypt(encrypted, password) → plaintext string | null
   */
  async function decrypt(encrypted, password) {
    try {
      const combined = _fromB64(encrypted);
      const salt      = combined.slice(0, SALT_LEN);
      const iv        = combined.slice(SALT_LEN, SALT_LEN + IV_LEN);
      const cipherBuf = combined.slice(SALT_LEN + IV_LEN);
      const key       = await _deriveKey(password, salt);

      const plainBuf = await crypto.subtle.decrypt({ name: ENC, iv }, key, cipherBuf);
      return new TextDecoder().decode(plainBuf);
    } catch {
      return null;
    }
  }

  return { encrypt, decrypt };
})();

console.log('[Encryption] Loaded ✓ (AES-256-GCM, Web Crypto API)');
