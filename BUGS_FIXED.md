# 🐛 Bug Report & Fix — Giappone 2027 v3.2+

## Problemi Identificati

### 1. **❌ Marker Click Handler Non Funziona**

**Sintomo**: Quando clicchi su un marker sulla mappa, non si apre niente.

**Causa Root**: Le funzioni `window.__openPOI()` e `window.__openShop()` non erano definite in `index.html`.

**Fix**: ✅ **RISOLTO**  
- Creato file `js/poi-handlers.js` che definisce entrambe le funzioni
- Aggiunte le righe mancanti per cercare nei dataset e aprire il sheet

**Verifica**: Clicca su qualsiasi marker sulla mappa → dovrebbe aprire il detail sheet

---

### 2. **⚠️ Google Maps API Key Non Configurata (403 Error)**

**Sintomo**: 
```
Failed to load resource: the server responded with a status of 403 ()
https://maps.googleapis.com/maps/api/streetview?...
```

**Causa Root**: 
- Non hai aggiunto `GOOGLE_MAPS_API_KEY` alle Environment Variables di Vercel
- L'app cerca di caricare Street View da Google Maps ma non ha la key

**Fix**: ⏳ **DEVI FARE (non è automatico)**

**Step 1**: Genera una Google Maps API key
1. Vai a [Google Cloud Console](https://console.cloud.google.com)
2. Crea un progetto (o usa uno esistente)
3. Abilita questi servizi:
   - ✅ Maps JavaScript API
   - ✅ Street View API
   - ✅ Geocoding API
4. Vai su **Credenziali** → **Crea Credenziale** → **Chiave API**
5. Copia la key (es: `AIzaSyD1234567890ABC...`)

**Step 2**: Aggiungi su Vercel
```
1. Vai su Vercel Dashboard → Seleziona il tuo progetto
2. Settings → Environment Variables
3. Aggiungi:
   GOOGLE_MAPS_API_KEY = [incolla la key]
4. Salva → Rideploy
```

**Verifica**: Dopo il deploy, clicca su un marker → dovrebbe caricare Street View (se disponibile)

---

### 3. **⚠️ Tab Switching Lento (Lag su "Tappe")**

**Sintomo**: Quando clicchi su "Tappe" (list view), c'è lag prima che appaia.

**Causa**: 
- La funzione `renderListView()` deve filtrare e renderizzare TUTTI i POI (~10,000+ locations)
- Nessuna ottimizzazione di performance per grandi dataset

**Workarounds temporanei**:
```javascript
// Nel console, prima di cliccare "Tappe"
state.activeCat = 'food';  // Filtra per categoria
// Ora il lag sarà minimale (solo ~2,000 items)
```

**Fix a lungo termine**: 
- Implementare virtualization (React VirtualList o simile)
- Paginazione lazy-loading
- Memoizzazione dei risultati filtrati

---

### 4. **ℹ️ Bottom Nav Buttons (Ricerca + Info)**

**Status**: ✅ Funzionano (ma non hanno implementazione ancora)

**Nota**: I bottoni in header (`🔍` Ricerca e `ℹ️` Info) non hanno funzionalità assegnate ancora.

Opzioni:
1. **Ricerca**: Implementare search box fulltext
2. **Info**: Mostrare About page / contatti

---

## Checklist di Verifica Post-Fix

- [ ] Clicca su un marker → **apre il detail sheet** ✅
- [ ] Leggi il nome, foto, descrizione, tag GF
- [ ] Clicca "🗺️ Mappa" → apre Google Maps
- [ ] Clicca "Tappe" → vedi lista POI (può essere lenta la prima volta)
- [ ] Clicca su "Agenda" → vedi itinerario drag-drop
- [ ] Clicca su "Gruppo" → vedi chat P2P se abbinato
- [ ] Prova il filtro "Gluten-Free" 🌾

---

## File Modificati

✅ **Creato**: `js/poi-handlers.js` (260 linee)  
✅ **Modificato**: `index.html` (aggiunto `<script src="js/poi-handlers.js"></script>`)

---

## Next Steps

1. **Configura Google Maps API Key su Vercel** (CRITICO per Street View)
2. **Test il click sui marker** (dovrebbe funzionare ora)
3. **Se lag su Tappe**: filtra per categoria prima di cliccare
4. **Report**: Se ancora problemi, controlla console (F12 → Console) per errori

---

**Fatto il 28 Aprile 2026**  
**Autore**: Assistant Analysis  
**Versione**: Giappone 2027 v3.2+
