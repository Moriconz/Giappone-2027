/**
 * Service Worker Wrapper — Giappone 2027
 * Importa il SW principale da js/sw.js per controllare la root dell'app
 */

console.log('[SW-Wrapper] Loading main service worker...');
importScripts('./js/sw.js');
console.log('[SW-Wrapper] Main SW loaded');
