// ============================================================================
// battery-saver.js — Modalità risparmio batteria
// Disattiva blur/animazioni/ombre (i veri divoratori di GPU in viaggio).
// Preferenza persistita in localStorage, applicata subito al boot.
// API: window.BatterySaver.{isOn, toggle}
// ============================================================================
(function () {
  'use strict';

  const KEY = 'batterySaver';
  const T = (k, f) => (typeof window.t === 'function') ? window.t(k, f) : f;

  function isOn() {
    try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; }
  }

  function apply(on) {
    document.documentElement.classList.toggle('battery-saver', !!on);
  }

  function toggle() {
    const on = !isOn();
    try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) {}
    apply(on);
    window.toast?.(on
      ? T('batt.on', '🔋 Risparmio batteria ATTIVO — effetti grafici ridotti')
      : T('batt.off', '🔋 Risparmio batteria disattivato'));
    return on;
  }

  // Applica subito la preferenza salvata (lo script è defer: DOM già parsato o quasi)
  if (document.documentElement) apply(isOn());

  window.BatterySaver = { isOn, toggle };
})();
