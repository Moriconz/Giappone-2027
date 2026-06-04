#!/usr/bin/env node
/**
 * lint-i18n.mjs — Verifica parità chiavi tra i 3 dizionari (it / en / ja).
 *
 * Cosa controlla:
 *   1. Chiavi presenti in `it` ma mancanti in `en` o `ja` (→ fallback IT, ma segnalate)
 *   2. Chiavi presenti in `en`/`ja` ma assenti in `it` (orfane: it è la base canonica)
 *   3. Duplicati di chiave nello stesso dizionario (l'ultima vince silenziosamente)
 *   4. (warning) chiavi `data-i18n="..."` in index.html senza corrispettivo in `it`
 *
 * Uso:  node scripts/lint-i18n.mjs
 * Exit code 1 se ci sono chiavi orfane o duplicate (errori veri).
 * Le chiavi mancanti in en/ja sono WARNING (il fallback IT le copre).
 *
 * Parser volutamente semplice: estrae le 3 sezioni it/en/ja da js/i18n.js
 * e raccoglie le chiavi `'x.y': '...'`. Non esegue il JS (no eval).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const src = readFileSync(join(ROOT, 'js/i18n.js'), 'utf8');

// Trova gli offset di "    it: {", "    en: {", "    ja: {"
function sectionBounds(lang) {
  const re = new RegExp(`\\n\\s{4}${lang}:\\s*\\{`, '');
  const m = re.exec(src);
  if (!m) return null;
  const start = m.index + m[0].length;
  // La sezione finisce alla prossima "\n    XX: {" o alla chiusura "  };"
  const rest = src.slice(start);
  // Cerca la prossima dichiarazione di lingua o la fine del DICT
  const endRe = /\n\s{4}(it|en|ja):\s*\{|\n\s{2}\};/;
  const em = endRe.exec(rest);
  const end = em ? start + em.index : src.length;
  return { start, end };
}

// Estrae le chiavi 'x.y' o "x.y" da una sezione (e rileva duplicati)
function extractKeys(text) {
  const keys = [];
  const dups = [];
  const seen = new Set();
  // match 'key': oppure "key":  (la key può contenere . _ - alnum)
  const re = /(['"])([A-Za-z0-9_.\-]+)\1\s*:/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const k = m[2];
    if (seen.has(k)) dups.push(k);
    else seen.add(k);
    keys.push(k);
  }
  return { set: seen, dups };
}

const langs = ['it', 'en', 'ja'];
const data = {};
for (const lang of langs) {
  const b = sectionBounds(lang);
  if (!b) {
    console.error(`❌ Sezione dizionario '${lang}' non trovata in js/i18n.js`);
    process.exit(2);
  }
  data[lang] = extractKeys(src.slice(b.start, b.end));
}

let errors = 0;
let warnings = 0;
const line = (s) => console.log(s);

line('── lint-i18n ─────────────────────────────────────');
line(`Chiavi: it=${data.it.set.size}  en=${data.en.set.size}  ja=${data.ja.set.size}`);

// 1. Duplicati (errore)
for (const lang of langs) {
  if (data[lang].dups.length) {
    errors += data[lang].dups.length;
    line(`\n❌ Duplicati in '${lang}' (${data[lang].dups.length}):`);
    [...new Set(data[lang].dups)].forEach(k => line(`   - ${k}`));
  }
}

// 2. Mancanti in en/ja rispetto a it (warning — fallback IT copre)
for (const lang of ['en', 'ja']) {
  const missing = [...data.it.set].filter(k => !data[lang].set.has(k));
  if (missing.length) {
    warnings += missing.length;
    line(`\n⚠️  Mancanti in '${lang}' (${missing.length}) — useranno fallback IT:`);
    missing.slice(0, 40).forEach(k => line(`   - ${k}`));
    if (missing.length > 40) line(`   … e altre ${missing.length - 40}`);
  }
}

// 3. Orfane in en/ja non presenti in it (errore — it è la base)
for (const lang of ['en', 'ja']) {
  const orphan = [...data[lang].set].filter(k => !data.it.set.has(k));
  if (orphan.length) {
    errors += orphan.length;
    line(`\n❌ Orfane in '${lang}' (assenti in it) (${orphan.length}):`);
    orphan.forEach(k => line(`   - ${k}`));
  }
}

// 4. data-i18n in index.html senza chiave in it (warning)
try {
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const htmlKeys = new Set();
  const re = /data-i18n(?:-(?:ph|title|html))?=["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(html)) !== null) htmlKeys.add(m[1]);
  const missingHtml = [...htmlKeys].filter(k => !data.it.set.has(k));
  if (missingHtml.length) {
    warnings += missingHtml.length;
    line(`\n⚠️  data-i18n in index.html senza chiave 'it' (${missingHtml.length}):`);
    missingHtml.forEach(k => line(`   - ${k}`));
  } else {
    line(`\n✅ Tutti i ${htmlKeys.size} data-i18n di index.html hanno chiave 'it'.`);
  }
} catch (e) {
  line('\n(skip controllo index.html: ' + e.message + ')');
}

line('\n──────────────────────────────────────────────────');
line(`Risultato: ${errors} errori, ${warnings} warning`);
if (errors > 0) {
  line('❌ FAIL — risolvere gli errori (duplicati/orfane).');
  process.exit(1);
}
line('✅ OK — nessun errore bloccante.');
process.exit(0);
