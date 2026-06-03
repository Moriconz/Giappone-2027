# 🔑 Setup API Keys — Vercel Environment Variables

## Cosa è stato fixato

✅ **Reverse Geocoding**: Converte coordinate GPS → nome reale del luogo  
✅ **Unsplash Photos**: Mostra foto reali per ogni POI  
✅ **NIENTE prompt nel codice**: Le chiavi rimangono SOLO sul server Vercel

---

## Come configurare su Vercel

### 1. **Google Maps API Key** (per reverse geocoding)

1. Vai su [Google Cloud Console](https://console.cloud.google.com)
2. Crea un nuovo progetto (es. "Giappone-2027")
3. Abilita **Geocoding API** (va su API e servizi → Libreria → cerca "Geocoding")
4. Vai su **Credenziali** → **Crea credenziali** → **Chiave API**
5. Copia la chiave

### 2. **Unsplash API Key** (per le foto)

1. Vai su [Unsplash Developers](https://unsplash.com/developers)
2. Clicca "Create an application"
3. Accetta i termini e continua
4. Completa il form (Nome app, descrizione)
5. Copia l'**Access Key**

### 3. **Aggiungi su Vercel**

1. Apri il tuo progetto su [Vercel Dashboard](https://vercel.com/dashboard)
2. Vai su **Settings** → **Environment Variables**
3. Aggiungi due variabili:

```
GOOGLE_MAPS_API_KEY = [chiave Google Maps]
UNSPLASH_API_KEY = [chiave Unsplash]
```

4. **Salva** e **Redeploy** il progetto (o rideploya da GitHub)

---

## Come funziona adesso

```
Utente clicca su marker
    ↓
index.html carica POI detail
    ↓
Chiama /api/reverseGeocode (lat, lng)
    ↓
Vercel Function usa GOOGLE_MAPS_API_KEY dal backend
    ↓
Ottieni nome reale del luogo (es. "Senso-ji Temple")
    ↓
Chiama /api/searchUnsplash (nome)
    ↓
Vercel Function usa UNSPLASH_API_KEY dal backend
    ↓
Mostra 3-5 foto reali del luogo
```

**NESSUNA chiave esposta al client!** ✅

---

## Test locale (dev)

Se vuoi testare in locale:

```bash
# 1. Crea file .env.local nella root
echo "GOOGLE_MAPS_API_KEY=your-key-here" > .env.local
echo "UNSPLASH_API_KEY=your-key-here" >> .env.local

# 2. Installa Vercel CLI
npm i -g vercel

# 3. Esegui localmente
vercel dev
```

---

## Troubleshooting

| Errore | Soluzione |
|--------|-----------|
| "API key not configured" | Assicurati di aver aggiunto le env vars su Vercel e fatto redeploy |
| "Nessuna foto disponibile" | Unsplash non ha foto per quel nome. Prova reverse geocoding |
| "Rate limit exceeded" | Unsplash e Google Maps hanno limiti. Upgrade piano se necessario |

---

## Costi approssimi (April 2026)

- **Google Maps Geocoding**: €0.005 per request (primo mese gratis)
- **Unsplash**: Gratuito fino a 50 request/ora (Plus = €10/mese)

---

**Fatto? Contatta Moriconz se serve help!** 🚀
