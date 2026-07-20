#!/usr/bin/env node
// ============================================================================
// generate-voxel-parts.mjs — genera il set base di parti voxel dell'avatar V2.
// Output: assets/game/voxel/parts/<slot>/<id>.json (formato spec prompt V2)
//       + assets/game/voxel/parts-catalog.json (bundle unico per il runtime).
// Coordinate ASSOLUTE nello spazio avatar: y up, fronte +z.
// Layout: gambe y0-7, torso y8-15, testa y16-24 (9×9×9, chunky ~36%).
// palette[0] = colore primario ricolorabile quando meta.recolorable=true.
// Rilanciare dopo ogni modifica: i JSON generati NON si editano a mano.
// ============================================================================
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'assets/game/voxel/parts');

// ── helpers ──────────────────────────────────────────────────────────────────
const V = [];                          // buffer voxel corrente
function box(x1, x2, y1, y2, z1, z2, c = 0) {
  for (let x = x1; x <= x2; x++) for (let y = y1; y <= y2; y++) for (let z = z1; z <= z2; z++) V.push([x, y, z, c]);
}
function vox(x, y, z, c = 0) { V.push([x, y, z, c]); }
function take() { const out = V.slice(); V.length = 0; return out; }
function bbox(voxels) {
  if (!voxels.length) return [0, 0, 0];
  let [mx, my, mz, Mx, My, Mz] = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  voxels.forEach(([x, y, z]) => { mx = Math.min(mx, x); my = Math.min(my, y); mz = Math.min(mz, z); Mx = Math.max(Mx, x); My = Math.max(My, y); Mz = Math.max(Mz, z); });
  return [Mx - mx + 1, My - my + 1, Mz - mz + 1];
}

const parts = {}; // "<slot>/<id>" → part json
function part(slot, id, name, palette, recolorable, voxels) {
  parts[`${slot}/${id}`] = {
    size: bbox(voxels), voxels, palette, anchor: [0, 0, 0],
    meta: { slot, id, name_i18n: name, rarity: 'base', price_koban: 0, earnable: true, recolorable, effect: 'cosmetic' }
  };
}
const N = (it, en, ja) => ({ it, en, ja });

// ── CORPO (pelle: testa+torso+braccia+gambe). palette[0]=tono pelle ─────────
// Varianti = proporzioni; il tono è parametrico (avatar.colors.body).
const bodies = {
  std:   { tw: 3, aw: 5, note: N('Classico', 'Classic', 'クラシック') },
  slim:  { tw: 2, aw: 4, note: N('Snello', 'Slim', 'スリム') },
  round: { tw: 4, aw: 6, note: N('Rotondo', 'Round', 'まる') },
  broad: { tw: 4, aw: 6, wide: true, note: N('Robusto', 'Broad', 'がっしり') },
  chibi: { tw: 3, aw: 5, chibi: true, note: N('Chibi', 'Chibi', 'ちび') },
  tallB: { tw: 3, aw: 5, tall: true, note: N('Slanciato', 'Tall', 'のっぽ') },
};
for (const [id, b] of Object.entries(bodies)) {
  const headY = b.chibi ? 14 : 16, topY = b.chibi ? 22 : 24, legTop = b.chibi ? 5 : 7, torsoTop = b.chibi ? 13 : 15;
  box(-4, 4, headY, b.tall ? topY + 1 : topY, -4, 4);                    // testa
  box(-b.tw, b.tw, legTop + 1, torsoTop, -2, 2);                        // torso
  box(-b.aw, -b.aw + 1, legTop + 2, torsoTop, -1, 1);                   // braccio sx
  box(b.aw - 1, b.aw, legTop + 2, torsoTop, -1, 1);                     // braccio dx
  box(-2, -1, 0, legTop, -1, 1); box(1, 2, 0, legTop, -1, 1);           // gambe
  part('body', id, b.note, ['#f2c89b'], true, take());
}

// ── VISO (decal fronte testa z=4, sovrascrive pelle) ────────────────────────
const EYE = '#2b2d42', WHITE = '#ffffff', BLUSH = '#e8836f';
function eyes(lx, rx, y, style) {
  if (style === 'closed') { vox(lx, y, 4, 0); vox(lx - 1, y, 4, 0); vox(rx, y, 4, 0); vox(rx + 1, y, 4, 0); }
  else if (style === 'wink') { vox(lx, y, 4, 0); vox(rx, y, 4, 0); vox(rx + 1, y, 4, 0); }
  else { vox(lx, y, 4, 0); vox(rx, y, 4, 0); if (style === 'big') { vox(lx, y - 1, 4, 0); vox(rx, y - 1, 4, 0); } }
}
const faces = {
  smile:     { e: 'dot',    m: 'smile', note: N('Sorriso', 'Smile', 'にこにこ') },
  happy:     { e: 'closed', m: 'open',  note: N('Felice', 'Happy', 'うれしい') },
  neutral:   { e: 'dot',    m: 'flat',  note: N('Neutro', 'Neutral', 'ふつう') },
  wink:      { e: 'wink',   m: 'smile', note: N('Occhiolino', 'Wink', 'ウインク') },
  surprised: { e: 'big',    m: 'o',     note: N('Sorpreso', 'Surprised', 'びっくり') },
  blush:     { e: 'dot',    m: 'smile', blush: true, note: N('Timido', 'Shy', 'てれてれ') },
};
for (const [id, f] of Object.entries(faces)) {
  eyes(-2, 2, 21, f.e);
  if (f.m === 'smile') { vox(-1, 18, 4, 0); vox(0, 17, 4, 0); vox(1, 18, 4, 0); }
  if (f.m === 'flat')  { vox(-1, 18, 4, 0); vox(0, 18, 4, 0); vox(1, 18, 4, 0); }
  if (f.m === 'open')  { vox(-1, 18, 4, 0); vox(0, 18, 4, 1); vox(1, 18, 4, 0); vox(0, 17, 4, 0); }
  if (f.m === 'o')     { vox(0, 18, 4, 0); vox(0, 17, 4, 0); }
  if (f.blush) { vox(-3, 19, 4, 2); vox(3, 19, 4, 2); }
  part('face', id, f.note, [EYE, WHITE, BLUSH], false, take());
}

// ── CAPELLI (guscio sopra/retro testa; palette[0] ricolorabile) ─────────────
const hairs = {
  short: { note: N('Corti', 'Short', 'ショート') },
  spiky: { note: N('Spettinati', 'Spiky', 'ツンツン') },
  long:  { note: N('Lunghi', 'Long', 'ロング') },
  bob:   { note: N('Caschetto', 'Bob', 'ボブ') },
  bun:   { note: N('Chignon', 'Bun', 'おだんご') },
  fringe:{ note: N('Frangia', 'Fringe', 'まえがみ') },
};
for (const [id] of Object.entries(hairs)) {
  box(-4, 4, 25, 25, -4, 4);                                            // calotta
  box(-4, 4, 22, 24, -5, -5);                                           // retro
  if (id === 'spiky') { vox(-3, 26, 0, 0); vox(0, 26, -2, 0); vox(3, 26, 1, 0); vox(1, 26, 3, 0); }
  if (id === 'long') box(-4, 4, 14, 24, -5, -5);                        // retro lungo
  if (id === 'bob') { box(-5, -5, 18, 24, -4, 2, 0); box(5, 5, 18, 24, -4, 2, 0); }
  if (id === 'bun') box(-1, 1, 26, 27, -3, -1);
  if (id === 'fringe') box(-4, 4, 24, 24, 4, 4);                        // frangia sul fronte
  part('hair', id, hairs[id].note, ['#4a3220'], true, take());
}

// ── TOP (sovrascrive torso/braccia; palette[0] ricolorabile) ────────────────
const ACC2 = '#f5efe0';
const tops = {
  tee:    { note: N('T-shirt', 'Tee', 'Tシャツ') },
  sleeves:{ note: N('Maniche lunghe', 'Long sleeves', 'ながそで') },
  tank:   { note: N('Canotta', 'Tank', 'タンク') },
  hoodie: { note: N('Felpa', 'Hoodie', 'パーカー') },
  kimono: { note: N('Kimono', 'Kimono', 'きもの') },
  jacket: { note: N('Giacca', 'Jacket', 'ジャケット') },
};
for (const [id] of Object.entries(tops)) {
  box(-3, 3, 9, 15, -2, 2);                                             // torso
  if (id !== 'tank') box(-5, -4, 12, 15, -1, 1), box(4, 5, 12, 15, -1, 1);        // mezze maniche
  if (id === 'sleeves' || id === 'hoodie' || id === 'kimono' || id === 'jacket') { box(-5, -4, 9, 11, -1, 1); box(4, 5, 9, 11, -1, 1); }
  if (id === 'hoodie') box(-3, 3, 15, 16, -4, -3);                      // cappuccio giù
  if (id === 'kimono') { box(-3, 3, 8, 8, -2, 2); for (let i = 0; i < 6; i++) vox(i - 2, 15 - i, 2, 1); } // fascia diagonale
  if (id === 'jacket') box(0, 0, 9, 15, 2, 2, 1);                       // zip
  part('top', id, tops[id].note, ['#c0392b', ACC2], true, take());
}

// ── BOTTOM (sovrascrive gambe; palette[0] ricolorabile) ─────────────────────
const bottoms = {
  pants:   { note: N('Pantaloni', 'Pants', 'ズボン') },
  shorts:  { note: N('Pantaloncini', 'Shorts', 'ショートパンツ') },
  skirt:   { note: N('Gonna', 'Skirt', 'スカート') },
  hakama:  { note: N('Hakama', 'Hakama', 'はかま') },
  leggings:{ note: N('Leggings', 'Leggings', 'レギンス') },
  culottes:{ note: N('Culotte', 'Culottes', 'キュロット') },
};
for (const [id] of Object.entries(bottoms)) {
  if (id === 'shorts') { box(-2, -1, 5, 7, -1, 1); box(1, 2, 5, 7, -1, 1); }
  else if (id === 'skirt') box(-3, 3, 5, 8, -2, 2);
  else if (id === 'hakama') { box(-3, -1, 2, 7, -2, 2); box(1, 3, 2, 7, -2, 2); }
  else if (id === 'culottes') { box(-2, -1, 3, 7, -2, 2); box(1, 2, 3, 7, -2, 2); }
  else { box(-2, -1, 2, 7, -1, 1); box(1, 2, 2, 7, -1, 1); }            // pants/leggings
  part('bottom', id, bottoms[id].note, [id === 'leggings' ? '#3d3d3d' : '#2c3e50'], true, take());
}

// ── SCARPE (y0-1 + punta z=2; palette[0] ricolorabile) ──────────────────────
const shoes = {
  sneakers: { note: N('Sneakers', 'Sneakers', 'スニーカー') },
  boots:    { note: N('Stivali', 'Boots', 'ブーツ') },
  sandals:  { note: N('Sandali', 'Sandals', 'サンダル') },
  geta:     { note: N('Geta', 'Geta', 'げた') },
  slipon:   { note: N('Slip-on', 'Slip-on', 'スリッポン') },
  hightops: { note: N('Alte', 'High-tops', 'ハイカット') },
};
for (const [id] of Object.entries(shoes)) {
  const top = id === 'boots' ? 2 : id === 'hightops' ? 2 : id === 'sandals' || id === 'geta' ? 0 : 1;
  box(-2, -1, 0, top, -1, 1); box(1, 2, 0, top, -1, 1);
  if (id !== 'sandals' && id !== 'geta') { box(-2, -1, 0, 0, 2, 2); box(1, 2, 0, 0, 2, 2); } // punta
  if (id === 'sneakers' || id === 'hightops') { box(-2, -1, 0, 0, -1, 1, 1); box(1, 2, 0, 0, -1, 1, 1); } // suola
  part('shoes', id, shoes[id].note, ['#7f8c8d', WHITE], true, take());
}

// ── CAPPELLO (sopra testa/capelli; palette[0] ricolorabile) ─────────────────
const hats = {
  none:    { note: N('Nessuno', 'None', 'なし') },
  cap:     { note: N('Cappellino', 'Cap', 'キャップ') },
  beanie:  { note: N('Berretto', 'Beanie', 'ニットぼう') },
  kasa:    { note: N('Kasa di paglia', 'Straw kasa', 'かさ') },
  crown:   { note: N('Corona', 'Crown', 'かんむり') },
  headband:{ note: N('Fascia', 'Headband', 'はちまき') },
};
for (const [id] of Object.entries(hats)) {
  if (id === 'cap') { box(-4, 4, 25, 26, -4, 4); box(-3, 3, 25, 25, 5, 6); }
  if (id === 'beanie') { box(-4, 4, 25, 26, -4, 4); box(-4, 4, 24, 24, -4, 4); }
  if (id === 'kasa') { box(-6, 6, 25, 25, -6, 6); box(-3, 3, 26, 27, -3, 3); }
  if (id === 'crown') { box(-3, 3, 25, 25, -3, 3); vox(-3, 26, 0); vox(0, 26, 0); vox(3, 26, 0); }
  if (id === 'headband') box(-4, 4, 24, 24, -4, 4);
  part('hat', id, hats[id].note, [id === 'kasa' ? '#d4b483' : id === 'crown' ? '#e0b04b' : '#c0392b'], true, take());
}

// ── ACCESSORIO (collo/viso; palette[0] ricolorabile) ────────────────────────
const accs = {
  none:    { note: N('Nessuno', 'None', 'なし') },
  scarf:   { note: N('Sciarpa', 'Scarf', 'マフラー') },
  glasses: { note: N('Occhiali', 'Glasses', 'めがね') },
  bowtie:  { note: N('Papillon', 'Bow tie', 'ちょうネクタイ') },
  flower:  { note: N('Fiore', 'Flower', 'はな') },
  mask:    { note: N('Mascherina', 'Mask', 'マスク') },
};
for (const [id] of Object.entries(accs)) {
  if (id === 'scarf') { box(-3, 3, 15, 16, -3, 3); box(1, 2, 10, 14, 3, 3); }
  if (id === 'glasses') { box(-3, -1, 21, 21, 4, 4); box(1, 3, 21, 21, 4, 4); vox(0, 21, 4, 1); }
  if (id === 'bowtie') { vox(-1, 15, 2); vox(1, 15, 2); vox(0, 15, 2, 1); }
  if (id === 'flower') { vox(4, 24, 2); vox(4, 25, 2); vox(3, 25, 2); vox(5, 25, 2); vox(4, 25, 1, 1); }
  if (id === 'mask') box(-2, 2, 17, 19, 4, 4);
  part('accessory', id, accs[id].note, [id === 'mask' ? WHITE : id === 'flower' ? '#e8836f' : '#c0392b', '#2b2d42'], true, take());
}

// ── ZAINO (retro torso z=-3/-4; palette[0] ricolorabile) ────────────────────
const packs = {
  none:     { note: N('Nessuno', 'None', 'なし') },
  daypack:  { note: N('Zainetto', 'Daypack', 'リュック') },
  randoseru:{ note: N('Randoseru', 'Randoseru', 'ランドセル') },
  shell:    { note: N('Guscio', 'Shell', 'こうら') },
  camera:   { note: N('Borsa foto', 'Camera bag', 'カメラバッグ') },
  tote:     { note: N('Tote', 'Tote', 'トート') },
};
for (const [id] of Object.entries(packs)) {
  if (id === 'daypack') { box(-2, 2, 9, 14, -4, -3); box(-1, 1, 12, 13, -5, -5, 1); }
  if (id === 'randoseru') box(-3, 3, 8, 14, -4, -3);
  if (id === 'shell') { box(-2, 2, 9, 14, -4, -3); box(-1, 1, 10, 13, -5, -5); }
  if (id === 'camera') box(3, 5, 9, 11, -3, -1);
  if (id === 'tote') box(-5, -3, 7, 12, -3, -1);
  part('backpack', id, packs[id].note, [id === 'randoseru' ? '#8c2f39' : '#7a8c5a', ACC2], true, take());
}

// ── scrittura file ──────────────────────────────────────────────────────────
let count = 0;
for (const [key, p] of Object.entries(parts)) {
  const [slot, id] = key.split('/');
  const dir = join(OUT, slot);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${id}.json`), JSON.stringify(p));
  count++;
}
const slots = ['body', 'face', 'hair', 'top', 'bottom', 'shoes', 'hat', 'accessory', 'backpack'];
const catalog = { version: 1, slots, order: slots, parts };
writeFileSync(join(OUT, '..', 'parts-catalog.json'), JSON.stringify(catalog));
const perSlot = slots.map(s => `${s}:${Object.keys(parts).filter(k => k.startsWith(s + '/')).length}`).join(' ');
console.log(`✅ ${count} parti generate (${perSlot}) + parts-catalog.json`);
if (slots.some(s => Object.keys(parts).filter(k => k.startsWith(s + '/')).length < 6)) { console.error('❌ slot con <6 opzioni'); process.exit(1); }
