# 📦 Come aggiornare il repo GitHub

**Guida rapida per sostituire i file nel tuo repo.**

---

## 📸 Cosa vedrai su GitHub

Esattamente come lo screenshot:

```
📁 js/                     ← CARTELLA NUOVA
📄 MODULAR_STRUCTURE.md    ← FILE NUOVO
📄 README.md               ← AGGIORNATO
📄 icon-192.png            ← Mantieni
📄 icon-512.png            ← Mantieni
📄 index.html              ← SOSTITUITO
📄 manifest.webmanifest    ← Mantieni
📄 test-modular.html       ← FILE NUOVO (opzionale)
```

---

## 🔄 Procedura Drag-Drop (GitHub Web)

### Step 1: Elimina il vecchio `index.html`
1. Apri il repo su **github.com**
2. Clicca su **`index.html`**
3. Clicca ⋮ (menu) → **Delete file**
4. Scrivi messaggio: `refactor: replace monolithic index.html with modular version`
5. **Commit changes**

### Step 2: Aggiungi i file nuovi
1. Torna alla home del repo (clicca su nome repo)
2. Clicca **"Add file"** → **"Upload files"**
3. **Drag-drop questo file:**
   - `index.html` (NUOVO)
4. Scrivi: `Add modular index.html`
5. **Commit**

### Step 3: Aggiungi la cartella `js/` e i file dentro
1. Clicca di nuovo **"Add file"** → **"Upload files"**
2. **Drag-drop questi file INSIEME:**
   ```
   state.js
   features-ai.js
   features-gps.js
   ui-helpers.js
   ```
3. GitHub automaticamente li mette in una cartella `js/`
4. Scrivi: `Add modular JavaScript structure`
5. **Commit**

### Step 4: Aggiungi i nuovi file markdown
1. Clicca **"Add file"** → **"Upload files"**
2. **Drag-drop:**
   ```
   README.md (sostituisce il vecchio)
   MODULAR_STRUCTURE.md (nuovo)
   test-modular.html (nuovo, opzionale)
   ```
3. Scrivi: `Update documentation and add test file`
4. **Commit**

---

## ⚡ Procedura Veloce (Git Locale)

Se usi Git sul computer:

```bash
# 1. Vai nella cartella repo
cd ~/Documents/giappone-2027

# 2. Elimina il vecchio index.html
rm index.html

# 3. Copia i file NUOVI dalla cartella download/outputs
cp ~/Downloads/outputs/index.html .
cp -r ~/Downloads/outputs/js .
cp ~/Downloads/outputs/README.md .
cp ~/Downloads/outputs/MODULAR_STRUCTURE.md .
cp ~/Downloads/outputs/test-modular.html .

# 4. Verifica
ls -la
# Output dovrebbe avere: index.html, js/, README.md, etc

# 5. Git
git add .
git commit -m "refactor: convert to modular structure with separate feature files"
git push origin main
```

---

## 📋 File da aggiungere/sostituire

### SOSTITUISCI (elimina vecchio, carica nuovo)
- ✏️ `index.html` — nuovo, con script tags

### AGGIUNGI (nuovo, non esiste)
- ✨ `js/` (cartella intera)
  - ✨ `js/state.js`
  - ✨ `js/features-ai.js`
  - ✨ `js/features-gps.js`
  - ✨ `js/ui-helpers.js`
- ✨ `MODULAR_STRUCTURE.md`
- ✨ `test-modular.html` (opzionale)

### AGGIORNA (esiste, sostituisci)
- ✏️ `README.md` — nuovo, molto più dettagliato

### MANTIENI (non toccare)
- ✅ `manifest.webmanifest`
- ✅ `icon-192.png`
- ✅ `icon-512.png`
- ✅ `sw.js` (se presente)
- ✅ `.gitignore`
- ✅ Tutto il resto

---

## ✅ Verificare che sia tutto OK

Dopo il push, controlla:

1. **Apri il repo su GitHub**
   - Dovrebbe avere la cartella `js/` visibile

2. **Apri il file `index.html`**
   - Righe 20-23 dovrebbero avere i 4 script tags:
     ```html
     <script src="./js/state.js"></script>
     <script src="./js/features-ai.js"></script>
     <script src="./js/features-gps.js"></script>
     <script src="./js/ui-helpers.js"></script>
     ```

3. **Apri `js/state.js`**
   - Dovrebbe iniziare con: `window.state = Object.assign(...)`

4. **Clicca su `MODULAR_STRUCTURE.md`**
   - Dovrebbe visualizzare la documentazione

---

## 🔔 Aggiornamenti recenti

- **AI Assistant**: la UI non richiede più una Gemini API Key.
- **Fallback offline gratuito**: l’assistente risponde anche senza chiave e usa il fallback locale.
- **Interfaccia AI migliorata**: il pannello AI ha altezza maggiore e layout più fluido.

## 🧪 Test dopo l'aggiornamento

Una volta pushato su GitHub:

1. **Clona il repo fresco** (per simulare)
   ```bash
   git clone https://github.com/tuouser/giappone-2027.git temp-test
   cd temp-test
   npx http-server . -p 5500
   ```

2. **Apri nel browser e verifica:**
   - [ ] F12 → Console → `window.state` esiste ✓
   - [ ] Clicca tab AI → funziona senza errori ✓
   - [ ] Scrivi messaggio → risposta offline ✓
   - [ ] Mappa funziona normalmente ✓

---

## 🎁 Package pronto

Se preferisci, ho creato anche:
- **`giappone-2027-update.zip`** — Contiene TUTTO pronto per drag-drop

---

## ❓ FAQ

**D: Perdo dati degli utenti quando aggiorno?**  
R: No. I dati sono in `localStorage`. L'aggiornamento solo cambia il codice HTML/JS, non cancella localStorage.

**D: Devo aggiornare anche `manifest.webmanifest`?**  
R: No. Mantienilo come è.

**D: E se il sito è già installato come PWA su mobile?**  
R: Auto-aggiorna alla prossima visita (service worker). Se non aggiorna: clearing app data nel telefono.

**D: Che succede ai vecchi commit?**  
R: Rimangono in Git history. Puoi ancora vedere il vecchio `index.html` nei commit precedenti.

**D: Quanto tempo per aggiornare?**  
R: 5-10 minuti via web GitHub, 2 minuti via Git locale.

---

## 📞 Se qualcosa va male

Se vedi errore dopo il push:

1. **F12 → Console** — Copia l'errore rosso
2. **Verifica:**
   - `js/state.js` esiste nella cartella `js/`?
   - `index.html` ha i 4 script tags nelle righe 20-23?
   - Hai fatto hard refresh (Ctrl+Shift+R)?

3. **Se ancora errore:** Rollback il commit e prova di nuovo

---

**Facile. Pronto? Fammi sapere quando hai pushato su GitHub!** 🚀
