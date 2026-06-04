#!/usr/bin/env node
/**
 * visual-regression.mjs — Cattura screenshot delle viste principali e rileva
 * cambiamenti rispetto a una baseline. Zero dipendenze oltre puppeteer.
 *
 * NON è un diff pixel-perfect (servirebbe pixelmatch+pngjs): è una
 * change-detection via hash SHA-256 del PNG. Per ridurre i falsi positivi
 * neutralizza il non-determinismo: disabilita animazioni/transizioni,
 * nasconde il widget meteo, forza viewport fisso, attende networkidle.
 *
 * Uso:
 *   node scripts/visual-regression.mjs [baseURL]            confronta con baseline
 *   node scripts/visual-regression.mjs [baseURL] --update   (ri)genera la baseline
 *
 * Output: screenshots/current/<view>.png + verdetto OK/CHANGED/NEW per vista.
 * Exit 1 se ci sono CHANGED (in modalità confronto).
 */
import { mkdirSync, existsSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import puppeteer from 'puppeteer';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const BASE_URL = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'http://localhost:8080';
const UPDATE = process.argv.includes('--update');

const SHOTS = join(ROOT, 'screenshots');
const BASELINE = join(SHOTS, 'baseline');
const CURRENT = join(SHOTS, 'current');
[SHOTS, BASELINE, CURRENT].forEach(d => { if (!existsSync(d)) mkdirSync(d, { recursive: true }); });

// Viste da catturare: { name, action(page) }
const VIEWS = [
  { name: 'map', action: async () => {} },
  { name: 'itinerary', action: async (pg) => { await clickNav(pg, 'itinerary'); } },
  { name: 'gf', action: async (pg) => { await clickNav(pg, 'gf'); } },
  { name: 'menu', action: async (pg) => { await clickNav(pg, 'menu'); } }
];

async function clickNav(pg, view) {
  await pg.evaluate((v) => {
    const btn = document.querySelector(`nav.bottom button[data-view="${v}"]`);
    if (btn) btn.click();
  }, view);
  await sleep(900);
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function sha(buf) { return createHash('sha256').update(buf).digest('hex').slice(0, 16); }

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 }); // iPhone-ish fisso

  // Neutralizza non-determinismo prima di ogni navigazione
  await page.evaluateOnNewDocument(() => {
    const css = `*{animation:none!important;transition:none!important;caret-color:transparent!important}
                 #weather-floating{display:none!important}`;
    const s = document.createElement('style');
    s.textContent = css;
    (document.head || document.documentElement).appendChild(s);
  });

  await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 45000 });
  await sleep(1500);

  const results = [];
  for (const view of VIEWS) {
    try {
      await view.action(page);
      await sleep(500);
      const buf = await page.screenshot({ type: 'png' });
      const curPath = join(CURRENT, view.name + '.png');
      writeFileSync(curPath, buf);
      const basePath = join(BASELINE, view.name + '.png');

      if (UPDATE || !existsSync(basePath)) {
        copyFileSync(curPath, basePath);
        results.push({ view: view.name, status: UPDATE ? 'BASELINE-UPDATED' : 'NEW', hash: sha(buf) });
      } else {
        const baseBuf = readFileSync(basePath);
        const same = sha(baseBuf) === sha(buf);
        results.push({ view: view.name, status: same ? 'OK' : 'CHANGED', hash: sha(buf), baseHash: sha(baseBuf) });
      }
    } catch (e) {
      results.push({ view: view.name, status: 'ERROR', error: e.message });
    }
  }

  await browser.close();

  console.log('── visual-regression ─────────────────────────────');
  console.log(`baseURL: ${BASE_URL}  mode: ${UPDATE ? 'UPDATE baseline' : 'COMPARE'}`);
  let changed = 0, errors = 0;
  for (const r of results) {
    const icon = { OK: '✅', CHANGED: '⚠️', NEW: '🆕', 'BASELINE-UPDATED': '📸', ERROR: '❌' }[r.status] || '•';
    if (r.status === 'CHANGED') { changed++; console.log(`  ⚠️  ${r.view}: CHANGED (${r.baseHash} → ${r.hash}) — ispeziona screenshots/current/${r.view}.png`); }
    else if (r.status === 'ERROR') { errors++; console.log(`  ❌ ${r.view}: ERROR ${r.error}`); }
    else console.log(`  ${icon} ${r.view}: ${r.status} (${r.hash})`);
  }
  console.log('──────────────────────────────────────────────────');
  console.log(`${results.length} viste · ${changed} changed · ${errors} errori`);
  if (errors > 0) process.exit(2);
  if (changed > 0 && !UPDATE) { console.log('⚠️ Differenze rilevate. Se intenzionali: --update'); process.exit(1); }
  console.log('✅ Nessuna differenza inattesa.');
  process.exit(0);
})();
