# 🔑 Setup API Keys — Vercel Environment Variables

Tabi è statica lato frontend, ma le funzioni in `api/` (ricerca luoghi, foto,
geocoding, analisi gluten-free AI) girano come funzioni serverless Vercel e hanno
bisogno di alcune chiavi, configurate **solo lato server** (mai esposte al client).

## Le 2 variabili essenziali

| Variabile | Serve per | Dove usata |
|---|---|---|
| `GOOGLE_MAPS_API_KEY` | Places (ricerca/dettagli/foto), Geocoding, Static Map, Street View | 9 dei 11 endpoint in `api/` |
| `GROQ_API_KEY` | Groq AI — analisi gluten-free di menu/foto | `api/groqAnalyze.js`, `api/groqImageAnalyze.js` |

Senza queste due, le funzioni corrispondenti falliscono (niente ricerca luoghi/foto/geocoding senza la prima, niente Assistente AI/analisi menu senza la seconda).

## 2 variabili opzionali (miglioramento, non requisito)

| Variabile | Serve per | Dove usata |
|---|---|---|
| `GOOGLE_CUSTOM_SEARCH_API_KEY` | Foto aggiuntive quando Google Places non ne ha nessuna | `api/searchGooglePlacesPhotos.js` |
| `GOOGLE_CUSTOM_SEARCH_CX` | ID del motore di ricerca personalizzato (va con la chiave sopra) | `api/searchGooglePlacesPhotos.js` |

**Se assenti, nessun errore**: `api/searchGooglePlacesPhotos.js` prova prima Google Places
(quasi sempre trova qualcosa con la sola `GOOGLE_MAPS_API_KEY`), poi in cascata
Wikipedia, Street View e Static Map — tutti senza bisogno di queste due variabili.
Configurale solo se noti luoghi frequentemente senza nessuna foto.

Una quinta coppia (`KV_REST_API_URL` / `KV_REST_API_TOKEN`) abilita Vercel KV /
Upstash Redis, usato per due cose — tecnicamente opzionale (l'app funziona anche
senza), ma **fortemente consigliato se più persone useranno l'app insieme**:

1. **Cache condivisa** (`api/_lib/kv-cache.js`) — il primo utente che carica
   un'area/luogo "paga" la chiamata a Google/Groq, tutti gli altri (inclusi i
   membri del gruppo) ottengono la risposta cached a costo zero.
2. **Limite giornaliero condiviso** (`api/_lib/quota.js`) — senza questo, il
   limite di chiamate/giorno per endpoint (vedi tabella sopra, stessi numeri
   duplicati in `js/api-quota.js`) è applicato **per dispositivo** via
   localStorage: con N persone che usano l'app insieme, la spesa reale verso
   Google/Groq può arrivare a N× il limite pensato per una persona sola. Con
   KV configurato, il contatore è invece **unico e condiviso** tra tutti.

Se assente, le funzioni funzionano comunque — solo senza cache condivisa e con
il limite solo per-dispositivo, non un tetto di gruppo reale. Vercel imposta le
env vars da sola se colleghi un'integrazione KV al progetto — non vanno
configurate a mano.

## Come procurarsi le chiavi

### 1. Google Maps API Key

1. [Google Cloud Console](https://console.cloud.google.com) → crea/scegli un progetto.
2. **API e servizi → Libreria**, abilita: **Places API**, **Geocoding API**,
   **Maps Static API**, **Street View Static API**.
3. **Credenziali → Crea credenziali → Chiave API** → copia il valore.
4. Consigliato: restrizioni della chiave per referrer/IP e per le sole API sopra,
   per limitare l'abuso se la chiave dovesse trapelare.

### 2. Groq API Key

1. [console.groq.com](https://console.groq.com) → crea un account/progetto.
2. **API Keys → Create API Key** → copia il valore.

### 3. Google Custom Search (fallback foto)

1. [Programmable Search Engine](https://programmablesearchengine.google.com/) →
   crea un motore, attiva "Cerca immagini" e "Cerca l'intero web".
2. Copia l'**ID motore di ricerca** (è il valore di `GOOGLE_CUSTOM_SEARCH_CX`).
3. In [Google Cloud Console](https://console.cloud.google.com), abilita la
   **Custom Search API** e genera una chiave API dedicata (può essere la stessa
   di Google Maps se non hai restrizioni per-API, ma è più pulito separarle).

## Configurazione su Vercel

1. Apri il progetto su [Vercel Dashboard](https://vercel.com/dashboard).
2. **Settings → Environments → Production** (la UI Vercel ha spostato qui le
   env var, non più in una tab "Environment Variables" a sé), aggiungi almeno
   le 2 essenziali (le 2 opzionali solo se vuoi le foto di riserva):

```
GOOGLE_MAPS_API_KEY = ...
GROQ_API_KEY = ...
GOOGLE_CUSTOM_SEARCH_API_KEY = ...   # opzionale
GOOGLE_CUSTOM_SEARCH_CX = ...        # opzionale
```

3. **Salva** e rideploya (push su `main` o "Redeploy" dalla dashboard).

## Test locale

```bash
# 1. Crea .env.local nella root con le variabili che ti servono
cat > .env.local <<'EOF'
GOOGLE_MAPS_API_KEY=your-key-here
GROQ_API_KEY=your-key-here
GOOGLE_CUSTOM_SEARCH_API_KEY=your-key-here
GOOGLE_CUSTOM_SEARCH_CX=your-cx-here
EOF

# 2. Vercel CLI (se non già installata)
npm i -g vercel

# 3. Esegui con le funzioni serverless attive
vercel dev
```

> Un semplice `python3 -m http.server` (vedi [README](README.md)) **non** esegue le
> funzioni in `api/` — va bene per sviluppare itinerario/budget/mappa/collaborazione,
> ma ricerca luoghi/foto/analisi AI restano non disponibili finché non usi `vercel dev`
> o non deployi su Vercel con le chiavi configurate.

## Troubleshooting

| Errore | Causa probabile |
|---|---|
| "API key not configured" nei toast dell'app | Variabile mancante su Vercel — controlla nome esatto e fai un redeploy dopo averla aggiunta |
| Ricerca luoghi vuota ma nessun errore | Quota Google Places esaurita (vedi `js/api-quota.js`) — l'app degrada a stime locali, non è un bug |
| "No more than 12 Serverless Functions" al deploy | Limite del piano Hobby Vercel — vedi `api/_lib/` nel codice: i file condivisi con prefisso `_` non contano come funzioni, non aggiungere nuovi endpoint `api/*.js` senza controllare il totale |

## Costi indicativi

Prezzi soggetti a cambiare — controlla sempre i listini ufficiali prima di stimare un budget:
- **Google Maps Platform**: pay-as-you-go con credito gratuito mensile, vedi
  [pricing ufficiale](https://mapsplatform.google.com/pricing/).
- **Groq**: vedi [pricing ufficiale](https://groq.com/pricing/) — quota giornaliera
  gestita lato app in `js/api-quota.js` per restare dentro i limiti gratuiti.
- **Google Custom Search**: 100 query/giorno gratuite, poi a pagamento — vedi
  [documentazione ufficiale](https://developers.google.com/custom-search/v1/overview).
