/**
 * THEME TOGGLE — override manuale chiaro/scuro sopra il comportamento di
 * sistema (prefers-color-scheme), che resta il default finché l'utente non
 * tocca il bottone. Ciclo: automatico → opposto del sistema → altro tema →
 * automatico. La scelta persiste in localStorage; liquid-light.css legge
 * l'attributo html[data-theme] con specificità più alta del solo :root,
 * quindi vince sempre sulla media query quando presente.
 */
(function () {
  'use strict';

  const KEY = 'themeOverride'; // 'light' | 'dark' | assente = segue il sistema

  const SUN_SVG = `<svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="10" cy="10" r="4"/><line x1="10" y1="1" x2="10" y2="3.2"/><line x1="10" y1="16.8" x2="10" y2="19"/><line x1="1" y1="10" x2="3.2" y2="10"/><line x1="16.8" y1="10" x2="19" y2="10"/><line x1="3.5" y1="3.5" x2="5" y2="5"/><line x1="15" y1="15" x2="16.5" y2="16.5"/><line x1="16.5" y1="3.5" x2="15" y2="5"/><line x1="5" y1="15" x2="3.5" y2="16.5"/></svg>`;
  const MOON_SVG = `<svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor"><path d="M14.5 2.5c-4.8 0-8.7 3.9-8.7 8.7 0 4.8 3.9 8.7 8.7 8.7 1.6 0 3.1-.4 4.4-1.2-3.6-.6-6.4-3.7-6.4-7.5s2.8-6.9 6.4-7.5c-1.3-.8-2.8-1.2-4.4-1.2z"/></svg>`;

  function current() {
    return localStorage.getItem(KEY); // null se non impostato (segue il sistema)
  }

  function systemPrefersDark() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function effectiveIsDark() {
    const override = current();
    return override ? override === 'dark' : systemPrefersDark();
  }

  function updateIcon() {
    const btn = document.getElementById('theme-toggle-btn');
    if (!btn) return;
    btn.innerHTML = effectiveIsDark() ? SUN_SVG : MOON_SVG; // mostra l'icona per passare all'ALTRO tema
    const override = current();
    btn.title = override ? `Tema: ${override === 'dark' ? 'scuro' : 'chiaro'} (tocca per cambiare)` : 'Tema: automatico (tocca per cambiare)';
  }

  function apply(mode) {
    if (mode) document.documentElement.dataset.theme = mode;
    else delete document.documentElement.dataset.theme;
    updateIcon();
  }

  function cycle() {
    const now = current();
    let next;
    if (!now) next = systemPrefersDark() ? 'light' : 'dark'; // primo tocco: forza l'opposto del sistema
    else if (now === (systemPrefersDark() ? 'light' : 'dark')) next = (now === 'light') ? 'dark' : 'light'; // secondo tocco: l'altro tema esplicito
    else next = null; // terzo tocco: torna ad automatico
    if (next) localStorage.setItem(KEY, next); else localStorage.removeItem(KEY);
    apply(next);
  }

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (!current()) updateIcon(); // in automatico, l'icona segue il cambio di sistema live
  });

  apply(current());
  window.ThemeToggle = { cycle };
})();
