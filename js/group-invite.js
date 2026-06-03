/**
 * group-invite.js — Inviti gruppo via deep link
 *
 * Risolve l'attrito di "come ti invito al gruppo?". Oggi serve dettare il
 * codice 6-char a voce o via chat esterna. Con questo modulo l'invitante
 * copia un link `https://.../?join=ABC123` e il destinatario:
 *   1. clicca il link
 *   2. l'app si apre direttamente sul modal "Entra in gruppo"
 *      con il codice già pre-compilato
 *   3. deve solo digitare il proprio nome e premere "✅ Connetti"
 *
 * Esposto:
 *   - window.copyGroupInviteLink()  → copia negli appunti l'URL invito
 *   - window.handleJoinDeepLink()   → eseguito al boot da handleDeepLink (auto)
 *
 * Hook su handleDeepLink esistente (app-core.js): l'IIFE registra
 * un wrapper attorno al `window.handleDeepLink` che chiama prima la nostra
 * logica e poi la originale.
 *
 * Dipendenze esterne (tutte su window):
 *   - window.state.group?.roomId           per costruire l'URL invito
 *   - window.toast(msg)                     feedback (con fallback console)
 *   - window.renderGroupView                per aprire la group view al join
 *   - window.t(key, fallback)              i18n con fallback IT
 */
(function () {
  'use strict';

  function _toast(msg) {
    if (typeof window.toast === 'function') window.toast(msg);
    else console.log('[group-invite]', msg);
  }

  function _T(k, f) {
    return (typeof window.t === 'function') ? window.t(k, f) : f;
  }

  // Costruisce l'URL invito a partire dal codice corrente
  function buildInviteUrl(code) {
    if (!code) return null;
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    const clean = String(code).toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!clean) return null;
    return `${origin}${pathname}?join=${encodeURIComponent(clean)}`;
  }

  async function copyGroupInviteLink() {
    const code = window.state?.group?.roomId;
    if (!code) {
      _toast(_T('invite.noRoom', '⚠️ Non sei in nessuna stanza'));
      return false;
    }
    const url = buildInviteUrl(code);
    if (!url) {
      _toast(_T('invite.badCode', '⚠️ Codice stanza non valido'));
      return false;
    }

    // Prova prima share API (Android/iOS native sheet)
    if (navigator.share && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
      try {
        await navigator.share({
          title: _T('invite.shareTitle', '🇯🇵 Giappone 2027 — Unisciti al gruppo'),
          text: _T('invite.shareText', `Codice stanza: ${code}\nClicca per entrare:`),
          url: url
        });
        return true;
      } catch (e) {
        // L'utente ha annullato lo share — fallback a clipboard
        if (e && e.name !== 'AbortError') console.warn('[group-invite] share failed:', e);
      }
    }

    // Fallback: clipboard
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      try {
        await navigator.clipboard.writeText(url);
        _toast(_T('invite.copied', `🔗 Link invito copiato (${code})`));
        return true;
      } catch (e) {
        console.warn('[group-invite] clipboard failed:', e);
      }
    }

    // Ultimo fallback: prompt per copia manuale
    try {
      (window.modalPrompt || function(m, o) { return Promise.resolve(window.prompt(m, o && o.defaultValue || '')); })(_T('invite.copyManual', 'Copia il link invito:'), { defaultValue: url });
      return true;
    } catch (e) {
      _toast('❌ ' + url);
      return false;
    }
  }

  // Gestisce l'arrivo su `?join=CODE` (o `?join=CODE&name=NAME`):
  // apre la group view, forza il mode "join", precompila il campo codice.
  // Resiliente: l'onboarding può intercettare il boot, quindi salviamo in
  // sessionStorage e polling fino a quando il form #group-room-join appare.
  const PENDING_KEY = 'gj2027_pending_join';

  function handleJoinDeepLink() {
    const params = new URLSearchParams(window.location.search);
    let code = params.get('join');
    if (!code) {
      // Riprendi pending da sessionStorage (es. dopo onboarding completato)
      try {
        const pending = JSON.parse(sessionStorage.getItem(PENDING_KEY) || 'null');
        if (pending && pending.code) {
          _startPolling(pending.code, pending.name || '');
        }
      } catch (e) {}
      return false;
    }

    code = String(code).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    if (!code || code.length < 4) return false;

    const suggestedName = params.get('name') || params.get('n') || '';

    // Pulisci URL bar
    try {
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (e) {}

    // Persisti in sessionStorage (resiste a redirect/onboarding)
    try {
      sessionStorage.setItem(PENDING_KEY, JSON.stringify({ code, name: suggestedName, ts: Date.now() }));
    } catch (e) {}

    console.log('[group-invite] join deep-link rilevato, codice:', code);
    _toast(_T('invite.detected', `📲 Invito gruppo: ${code}`));

    _startPolling(code, suggestedName);
    return true;
  }

  // Polling robusto: ogni 600ms cerca #group-room-join. Quando lo trova,
  // forza join mode + precompila + cancella pending. Max ~60s di tentativi.
  function _startPolling(code, suggestedName) {
    const start = Date.now();
    const TIMEOUT_MS = 60000;
    const INTERVAL_MS = 600;

    const tick = () => {
      // Se già scaduto, smetti
      if (Date.now() - start > TIMEOUT_MS) {
        console.warn('[group-invite] polling scaduto, gruppo non aperto in tempo');
        try { sessionStorage.removeItem(PENDING_KEY); } catch (e) {}
        return;
      }

      // Apri la group view se l'API esiste e non è già aperta
      const codeInput = document.getElementById('group-room-join');
      if (!codeInput) {
        // renderGroupView è esposta su window (vedi app-core.js fine renderGroupView)
        if (typeof window.renderGroupView === 'function') {
          try { window.renderGroupView(); } catch (e) { console.warn('[group-invite] renderGroupView threw:', e); }
        }
        return setTimeout(tick, INTERVAL_MS);
      }

      // Form pronto: forza join mode
      const modeJoinBtn = document.getElementById('mode-join');
      const joinModeDiv = document.getElementById('join-mode');
      if (modeJoinBtn && (!joinModeDiv || joinModeDiv.style.display === 'none')) {
        try { modeJoinBtn.click(); } catch (e) {}
      }

      // Precompila codice
      codeInput.value = code;
      try { codeInput.focus(); } catch (e) {}

      // Precompila nome se non già impostato
      if (suggestedName) {
        const nameInput = document.getElementById('group-name');
        if (nameInput && !nameInput.value) nameInput.value = suggestedName;
      }

      // Done
      try { sessionStorage.removeItem(PENDING_KEY); } catch (e) {}
      console.log('[group-invite] precompilato codice:', code);
    };

    // Avvio con piccolo delay iniziale per dare tempo al renderGroupView di esistere
    setTimeout(tick, 300);
  }

  // Hook su handleDeepLink di app-core. Wrappa l'originale: se il pattern
  // ?join=CODE è presente, lo gestiamo noi; altrimenti delega all'originale.
  function _installDeepLinkHook() {
    const original = window.handleDeepLink;
    window.handleDeepLink = function () {
      const params = new URLSearchParams(window.location.search);
      if (params.get('join')) {
        return handleJoinDeepLink();
      }
      if (typeof original === 'function') return original.apply(this, arguments);
      return false;
    };
    // Se siamo arrivati DOPO che app-core ha già invocato handleDeepLink
    // (ordine script in index.html), gestiamo subito un eventuale join attivo
    if (new URLSearchParams(window.location.search).get('join')) {
      handleJoinDeepLink();
    }
  }

  // Aspetta che app-core abbia registrato il suo handleDeepLink
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(_installDeepLinkHook, 50));
  } else {
    setTimeout(_installDeepLinkHook, 50);
  }

  window.copyGroupInviteLink = copyGroupInviteLink;
  window.handleJoinDeepLink = handleJoinDeepLink;
  window.buildGroupInviteUrl = buildInviteUrl;
})();
