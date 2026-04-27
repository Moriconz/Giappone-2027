// ============================================================================
// JS/CONFIG.JS — Centralized config + encrypted key management
// Phase 1 / Phase 3 — caricato dopo encryption.js, prima di features-ai.js
// ============================================================================

console.log('[Config] Loading...');

window.appConfig = (() => {
  const STORAGE_KEY = 'giappone2027_config_v1';
  let _masterPassword = null; // mai su disco
  let _decryptedKeys = {};    // cache in-memory per sessione

  // Chiavi supportate
  const KEY_NAMES = ['gemini'];

  // --- Persistenza config cifrata ---
  function _loadRaw() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch { return {}; }
  }

  function _saveRaw(raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(raw));
  }

  // --- Master password ---
  function hasMasterPassword() {
    return !!_masterPassword;
  }

  async function initMasterPassword() {
    const raw = _loadRaw();
    const hasEncrypted = KEY_NAMES.some(k => raw[k]);

    if (!hasEncrypted) {
      // Prima visita: chiedi di impostare master password
      _masterPassword = null;
      return true; // nessuna chiave ancora, ok procedere
    }

    if (_masterPassword) return true; // già in memoria

    // Chiedi master password per decifrare
    const pwd = window.prompt('🔑 Inserisci la master password per accedere alle API key cifrate:');
    if (!pwd) return false;

    // Verifica che funzioni su almeno una chiave
    const firstKey = KEY_NAMES.find(k => raw[k]);
    if (firstKey) {
      try {
        const decrypted = await window.appEncryption.decrypt(raw[firstKey], pwd);
        if (!decrypted) return false;
        _masterPassword = pwd;
        _decryptedKeys[firstKey] = decrypted;
      } catch {
        window.alert('❌ Password errata. Riprova.');
        return false;
      }
    }

    return true;
  }

  // --- Salva chiave cifrata ---
  async function setKey(name, plaintext) {
    if (!KEY_NAMES.includes(name)) return false;
    if (!_masterPassword) {
      const pwd = window.prompt('🔑 Imposta una master password per cifrare le API key:');
      if (!pwd || pwd.length < 4) {
        window.alert('Password troppo corta (min 4 caratteri).');
        return false;
      }
      _masterPassword = pwd;
    }

    const encrypted = await window.appEncryption.encrypt(plaintext, _masterPassword);
    const raw = _loadRaw();
    raw[name] = encrypted;
    _saveRaw(raw);
    _decryptedKeys[name] = plaintext;
    console.log(`[Config] Key '${name}' saved (encrypted)`);
    return true;
  }

  // --- Leggi chiave decifrata ---
  async function getKey(name) {
    if (!KEY_NAMES.includes(name)) return null;

    // Cache in-memory
    if (_decryptedKeys[name]) return _decryptedKeys[name];

    const raw = _loadRaw();
    if (!raw[name]) return null; // mai impostata

    if (!_masterPassword) {
      const ok = await initMasterPassword();
      if (!ok) return null;
    }

    try {
      const decrypted = await window.appEncryption.decrypt(raw[name], _masterPassword);
      _decryptedKeys[name] = decrypted;
      return decrypted;
    } catch {
      console.warn(`[Config] Failed to decrypt key '${name}'`);
      return null;
    }
  }

  // --- Cancella chiave ---
  function removeKey(name) {
    const raw = _loadRaw();
    delete raw[name];
    _saveRaw(raw);
    delete _decryptedKeys[name];
  }

  // --- Stato chiavi (senza esporre valori) ---
  function getKeyStatus() {
    const raw = _loadRaw();
    return KEY_NAMES.reduce((acc, k) => {
      acc[k] = !!raw[k];
      return acc;
    }, {});
  }

  // --- Reset sessione (logout) ---
  function clearSession() {
    _masterPassword = null;
    _decryptedKeys = {};
    console.log('[Config] Session cleared');
  }

  return {
    initMasterPassword,
    hasMasterPassword,
    setKey,
    getKey,
    removeKey,
    getKeyStatus,
    clearSession,
    KEY_NAMES,
  };
})();

console.log('[Config] Loaded ✓');
