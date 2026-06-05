// ============================================================================
// room-crypto.js — E2EE leggera per la stanza di gruppo (AES-256-GCM).
//
// La chiave è derivata UNA VOLTA dal codice stanza (PBKDF2 con salt d'app
// fisso) e cachata: poi ogni messaggio è solo un AES-GCM veloce con IV
// random. Solo chi conosce il codice stanza può decifrare.
//
// PROGETTATO PER NON ROMPERE MAI IL SYNC:
//   - seal() ritorna null se la chiave non è pronta → il transport invia in chiaro
//   - open() ritorna null su qualsiasi errore → il transport prova il parse in chiaro
//   - messaggi cifrati e in chiaro coesistono (retrocompatibile)
//
// API: window.RoomCrypto = { init(roomCode), ready(), seal(obj)->str|null,
//                            open(str)->obj|null, reset() }
// ============================================================================
(function () {
  'use strict';
  const APP_SALT = new TextEncoder().encode('giappone2027-room-v1'); // salt fisso d'app
  const ITER = 150000;
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  let _key = null;        // CryptoKey cachata
  let _room = null;

  const _hasCrypto = () => (typeof crypto !== 'undefined' && crypto.subtle);

  function _b64(buf) { return btoa(String.fromCharCode(...new Uint8Array(buf))); }
  function _unb64(s) { return Uint8Array.from(atob(s), c => c.charCodeAt(0)); }

  // Deriva e cacha la chiave dal codice stanza (una sola volta per stanza)
  async function init(roomCode) {
    if (!_hasCrypto() || !roomCode) { _key = null; _room = null; return false; }
    if (_room === roomCode && _key) return true; // già pronta
    try {
      const material = await crypto.subtle.importKey('raw', enc.encode(String(roomCode)), 'PBKDF2', false, ['deriveKey']);
      _key = await crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: APP_SALT, iterations: ITER, hash: 'SHA-256' },
        material,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
      _room = roomCode;
      console.log('[RoomCrypto] 🔒 Chiave stanza pronta (E2EE attiva)');
      return true;
    } catch (e) {
      console.warn('[RoomCrypto] init failed, sync resterà in chiaro:', e.message);
      _key = null; _room = null;
      return false;
    }
  }

  function ready() { return !!_key; }
  function reset() { _key = null; _room = null; }

  // Cifra un oggetto → stringa base64 (iv + ciphertext). null se non pronta.
  async function seal(obj) {
    if (!_key) return null;
    try {
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, _key, enc.encode(JSON.stringify(obj)));
      const combined = new Uint8Array(12 + ct.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(ct), 12);
      return _b64(combined.buffer);
    } catch (e) {
      console.warn('[RoomCrypto] seal failed:', e.message);
      return null;
    }
  }

  // Decifra una stringa base64 → oggetto. null su qualsiasi errore.
  async function open(str) {
    if (!_key || typeof str !== 'string') return null;
    try {
      const combined = _unb64(str);
      const iv = combined.slice(0, 12);
      const ct = combined.slice(12);
      const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, _key, ct);
      return JSON.parse(dec.decode(plain));
    } catch {
      return null;
    }
  }

  window.RoomCrypto = { init, ready, seal, open, reset };
})();
