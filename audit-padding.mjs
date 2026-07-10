import puppeteer from 'puppeteer';
const BASE = process.argv[2] || 'http://localhost:8080';
const THEME = process.argv[3] || 'dark';
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, isMobile: true });
await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: THEME }]);
await page.goto(BASE + '/index.html', { waitUntil: 'networkidle2', timeout: 30000 }).catch(()=>{});
await new Promise(r=>setTimeout(r, 1500));

const PANELS = ['Biglietti','Prenota','Shopping','Gruppo','Budget','Spese di gruppo','Checklist del gruppo','Tips Viaggio','Timeline viaggio','Conviene il JR Pass','Calendario Giappone','Suggerisci Posti','SOS','Galleria'];

async function openPanel(label) {
  await page.evaluate(() => {
    [...document.querySelectorAll('button')].filter(b=>b.textContent.trim()==='✕').forEach(b=>b.click());
  });
  await new Promise(r=>setTimeout(r, 300));
  await page.evaluate(() => { [...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Menu')?.click(); });
  await new Promise(r=>setTimeout(r, 300));
  const ok = await page.evaluate((label) => {
    const btns = [...document.querySelectorAll('dialog button, [role=dialog] button')];
    const b = btns.find(x=>x.textContent.includes(label));
    if (!b) return false;
    b.click(); return true;
  }, label);
  await new Promise(r=>setTimeout(r, 600));
  return ok;
}

async function audit(panelName) {
  return page.evaluate((panelName) => {
    const roots = [...document.querySelectorAll('.y2k-win-body, .sheet-body')].filter(r=>r.offsetParent);
    const offenders = [];
    for (const root of roots) {
      for (const el of root.querySelectorAll('*')) {
        if (!el.offsetParent) continue;
        const cs = getComputedStyle(el);
        const hasBorder = parseFloat(cs.borderLeftWidth) > 0 && cs.borderLeftStyle !== 'none';
        const bg = cs.backgroundColor;
        const hasBg = bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent';
        if (!hasBorder && !hasBg) continue;
        if (['BUTTON','INPUT','SELECT','TEXTAREA','IMG','CANVAS','SVG'].includes(el.tagName)) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 100 || r.height < 34) continue;
        // min left/top of any visible child element or text
        let minL = Infinity, minT = Infinity, sample = '';
        for (const ch of el.children) {
          if (!ch.offsetParent && getComputedStyle(ch).position!=='absolute') continue;
          const cr = ch.getBoundingClientRect();
          if (cr.width === 0 && cr.height === 0) continue;
          if (cr.left < minL) { minL = cr.left; sample = (ch.textContent||'').trim().slice(0,25); }
          if (cr.top < minT) minT = cr.top;
        }
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        let tn;
        while ((tn = walker.nextNode())) {
          if (tn.parentElement !== el || !tn.textContent.trim()) continue;
          const range = document.createRange(); range.selectNodeContents(tn);
          const tr = range.getBoundingClientRect();
          if (tr.width && tr.left < minL) { minL = tr.left; sample = tn.textContent.trim().slice(0,25); }
          if (tr.width && tr.top < minT) minT = tr.top;
        }
        if (minL === Infinity) continue;
        const gapL = minL - r.left, gapT = minT - r.top;
        if (gapL < 6 || gapT < 4) {
          offenders.push({ panel: panelName, tag: el.tagName, cls: (el.className||'').toString().slice(0,45),
            pad: cs.padding, gapL: Math.round(gapL), gapT: Math.round(gapT), text: sample });
        }
      }
    }
    return offenders;
  }, panelName);
}

const all = [];
for (const p of PANELS) {
  const ok = await openPanel(p);
  if (!ok) { all.push({ panel: p, err: 'not found' }); continue; }
  all.push(...await audit(p));
}
console.log('THEME:', THEME, 'offenders:', all.length);
console.log(JSON.stringify(all, null, 2));
await browser.close();
