/**
 * smoke-test.mjs — verifica runtime headless dell'app (Chromium via Puppeteer).
 * Carica l'app con /api mockate, simula i flussi chiave (POI → dettaglio →
 * itinerario → budget → render) e cattura errori console / eccezioni / 404.
 *
 * USO:
 *   python3 -m http.server 8080 &
 *   node smoke-test.mjs http://localhost:8080
 */
import puppeteer from 'puppeteer';

const BASE = process.argv[2] || 'http://localhost:8780';
const PATH = process.argv[3] || '/index.html';
const R = { consoleErrors: [], pageErrors: [], failedLocal: [], checks: {} };

// POI finti in formato Google Places (shape attesa da transformGooglePlacesPOIs)
const MOCK_POIS = [
  { place_id: 'mock_1', name: 'Tokyo Skytree', geometry: { location: { lat: 35.7101, lng: 139.8107 } }, types: ['tourist_attraction', 'point_of_interest'], vicinity: 'Oshiage, Sumida City, Tokyo', rating: 4.5, user_ratings_total: 50000, price_level: 2, opening_hours: { open_now: true }, photos: [{ photo_reference: 'ref1', width: 800, height: 600 }] },
  { place_id: 'mock_2', name: 'Senso-ji Temple', geometry: { location: { lat: 35.7148, lng: 139.7967 } }, types: ['place_of_worship', 'tourist_attraction'], vicinity: 'Asakusa, Taito City, Tokyo', rating: 4.6, user_ratings_total: 80000, opening_hours: { open_now: true } },
  { place_id: 'mock_3', name: 'Ichiran Ramen Shibuya', geometry: { location: { lat: 35.6595, lng: 139.7005 } }, types: ['restaurant', 'food'], vicinity: 'Shibuya City, Tokyo', rating: 4.3, user_ratings_total: 12000, price_level: 2 }
];

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, isMobile: true });

// Mock serverless /api (in locale non c'è Vercel)
await page.setRequestInterception(true);
page.on('request', req => {
  const u = req.url();
  if (u.includes('/api/googlePlacesNearby')) {
    req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'OK', results: MOCK_POIS }) });
  } else if (u.includes('/api/placePhoto')) {
    req.respond({ status: 200, contentType: 'image/gif', body: Buffer.from('R0lGODlhAQABAAAAACw=', 'base64') });
  } else if (u.includes('/api/')) {
    req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'OK', results: [] }) });
  } else {
    req.continue();
  }
});

page.on('console', m => { if (m.type() === 'error') R.consoleErrors.push(m.text().slice(0, 200)); });
page.on('pageerror', e => R.pageErrors.push((String(e.message) + ' @@ ' + String(e.stack || '').split('\n').slice(1, 3).join(' | ')).slice(0, 400)));
page.on('requestfailed', req => { if (req.url().startsWith(BASE)) R.failedLocal.push({ url: req.url().slice(0, 90), err: req.failure()?.errorText }); });

try { await page.goto(BASE + PATH, { waitUntil: 'load', timeout: 30000 }); }
catch (e) { R.gotoError = e.message; }
await new Promise(r => setTimeout(r, 4000));

// ── Base ──────────────────────────────────────────────────────────
R.checks.title = await page.title();
R.checks.navButtons = await page.$$eval('nav.bottom button', b => b.length).catch(() => 'ERR');
R.checks.mapInit = !!(await page.$('.ol-viewport'));
R.checks.openSheetFn = await page.evaluate(() => typeof window.openSheet === 'function');
R.checks.y2kWindowsApi = await page.evaluate(() => !!(window.y2kWindows && window.y2kWindows.open && window.y2kWindows.closeAll));
R.checks.stateInit = await page.evaluate(() => !!(window.state && typeof window.saveState === 'function'));
R.checks.modernBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);

// ── Pannelli ──────────────────────────────────────────────────────
R.checks.panelOpen = await page.evaluate(() => {
  try {
    window.openSheet('Test Pannello', '<p id="__probe">CIAO_PROBE</p>');
    const win = document.querySelector('.y2k-win');
    const body = win && win.querySelector('.y2k-win-body');
    return { winCreated: !!win, hasContent: !!(body && body.textContent.includes('CIAO_PROBE')), hasCloseBtn: !!(win && win.querySelector('.y2k-win-close')) };
  } catch (e) { return { error: e.message }; }
});

// ── FLUSSO 1: caricamento POI (con /api mockate) ──────────────────
R.checks.poiLoad = await page.evaluate(async () => {
  try {
    const race = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
    await race(window.GooglePlacesLoader.loadNearbyPOIs(35.68, 139.76), 20000).catch(() => {});
    const all = await window.GooglePlacesLoader.getAllGooglePOIs();
    return { count: Array.isArray(all) ? all.length : 'not-array', firstName: all && all[0] && all[0].name };
  } catch (e) { return { error: e.message }; }
});

// ── FLUSSO 2: apertura dettaglio POI (allPOIs() = window.GOOGLE_PLACES_POIS) ─
R.checks.openPoi = await page.evaluate(async () => {
  try {
    const store = window.GOOGLE_PLACES_POIS || [];
    if (!store.length) return { skipped: 'GOOGLE_PLACES_POIS vuoto' };
    const id = store[0].id;
    window.y2kWindows.closeAll();
    window.openPOI(id);
    await new Promise(r => setTimeout(r, 1500)); // openSheet è dentro IIFE async (enrichment)
    const body = document.querySelector('.y2k-win .y2k-win-body');
    return { id, opened: !!body, hasContent: !!(body && body.textContent.trim().length > 10) };
  } catch (e) { return { error: e.message, stack: String(e.stack || '').split('\n').slice(1, 4).join(' | ') }; }
});

// ── FLUSSO 2b: render del wizard (click "Aggiungi all'itinerario") ─
R.checks.wizardRender = await page.evaluate(async () => {
  try {
    const store = window.GOOGLE_PLACES_POIS || [];
    if (!store.length) return { skipped: 'no pois' };
    window.y2kWindows.closeAll();
    window.openPOI(store[0].id);
    await new Promise(r => setTimeout(r, 1200));
    const btn = document.getElementById('add-to-itinerary-btn');
    if (!btn) return { noBtn: true };
    btn.click();
    await new Promise(r => setTimeout(r, 1000));
    // scansiona TUTTI i pannelli (il wizard può aprirsi in una finestra separata)
    const allTxt = Array.from(document.querySelectorAll('.y2k-win-body')).map(b => b.textContent).join(' ');
    const rendered = /STEP|Scegli il giorno|Choose the day|日を選択/.test(allTxt);
    return { rendered, snippet: allTxt.replace(/\s+/g, ' ').slice(0, 80) };
  } catch (e) { return { error: e.message }; }
});

// ── FLUSSO 3: aggiunta all'itinerario ─────────────────────────────
R.checks.itineraryAdd = await page.evaluate(() => {
  try {
    window.ITINERARY.addPOIToDay('gp_mock_1', 'Tokyo Skytree', 0, '10:00', 90, 'test note', 1500, 'attrazione');
    const day0 = (window.state.itineraryByDay && window.state.itineraryByDay[0]) || [];
    const found = day0.find(e => e.poiId === 'gp_mock_1' || (e.poiName || e.poi_name || e.name || '').includes('Skytree'));
    return { day0count: day0.length, added: !!found, cost: found && (found.cost ?? found.ticket_cost) };
  } catch (e) { return { error: e.message }; }
});

// ── FLUSSO 4: budget ──────────────────────────────────────────────
R.checks.budget = await page.evaluate(() => {
  try {
    return { dayBudget: window.ITINERARY.calculateDayBudget(0), total: window.ITINERARY.calculateTotalBudget() };
  } catch (e) { return { error: e.message }; }
});

// ── FLUSSO 5: render itinerario (non deve lanciare) ───────────────
R.checks.renderItinerary = await page.evaluate(() => {
  try {
    if (typeof window.renderItineraryUnified === 'function') window.renderItineraryUnified();
    else if (typeof window.renderItineraryView === 'function') window.renderItineraryView();
    return { ok: true };
  } catch (e) { return { error: e.message }; }
});

R.checks.closeAll = await page.evaluate(() => { try { window.y2kWindows.closeAll(); return document.querySelectorAll('.y2k-win').length === 0; } catch (e) { return { error: e.message }; } });

// ── FLUSSO 6: i18n (it → en → ja) ─────────────────────────────────
R.checks.i18n = await page.evaluate(() => {
  try {
    const navLabel = () => document.querySelector('nav.bottom button[data-view="map"] [data-i18n="nav.map"]')?.textContent;
    const it = navLabel();
    window.I18N.setLang('en'); const en = navLabel();
    window.I18N.setLang('ja'); const ja = navLabel();
    // traduzioni POI (poi-section-builders)
    window.I18N.setLang('ja'); const addrJa = window.t('poi.address'); const catJa = window.t('cat.restaurant');
    window.I18N.setLang('en'); const addrEn = window.t('poi.address');
    window.I18N.setLang('ja'); const budgetJa = window.t('budget.title');
    window.I18N.setLang('it'); // ripristina
    return { hasT: typeof window.t === 'function', switcher: !!document.getElementById('lang-switcher'), it, en, ja, addrEn, addrJa, catJa, budgetJa };
  } catch (e) { return { error: e.message }; }
});

// ── FLUSSO 7: onboarding a primo avvio + banner offline ───────────
R.checks.onboarding = await page.evaluate(() => {
  return {
    choiceShown: !!document.getElementById('onboarding-choice-overlay'),
    initFn: typeof window.showOnboardingChoiceModal === 'function' || typeof showOnboardingChoiceModal !== 'undefined'
  };
});
R.checks.offlineBanner = await page.evaluate(() => {
  const b = document.getElementById('offline-banner');
  return { exists: !!b, i18n: b?.getAttribute('data-i18n') === 'banner.offline' };
});

await browser.close();
console.log(JSON.stringify(R, null, 2));
