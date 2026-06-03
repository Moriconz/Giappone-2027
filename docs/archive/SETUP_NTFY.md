# 🚀 Setup P2P — ntfy.sh (zero config)

Il sistema P2P è basato su **ntfy.sh** — un servizio pub/sub HTTPS gratuito che non richiede account, API key, o configurazione di alcun tipo.

**Non devi fare nulla.** Il sistema funziona subito.

---

## Come funziona

- Ogni stanza crea due "topic" su ntfy.sh:
  - `giap2027v2_{roomId}` — messaggi generali (chat, sync, heartbeat)
  - `giap2027v2_{roomId}_gps` — aggiornamenti GPS (topic separato per non rallentare i messaggi)
- Pubblicazione: `POST https://ntfy.sh/{topic}` con JSON body
- Ricezione: `EventSource https://ntfy.sh/{topic}/sse` (Server-Sent Events)

## Limiti ntfy.sh (piano gratuito)

- 250 messaggi/ora per topic (abbondantemente sufficiente per 5-10 persone in viaggio)
- Nessun limite di connessioni simultanee
- Messaggi conservati per ~12 ore (solo per history, non serve per il funzionamento live)

## Test

1. Apri l'app su due dispositivi (o due tab)
2. Vai su **Gruppo** → crea/entra nella stessa stanza con lo stesso nome stanza
3. La console mostrerà:
   ```
   [RTDB] ✅ Connesso alla stanza: miostanza | utente: Riccardo
   [RTDB] ✓ peerGPS pronto (ntfy.sh transport — zero config)
   ```
4. Attiva GPS sharing → i marker appariranno sulla mappa dell'altro dispositivo entro 5 secondi

## Deploy su Vercel

```bash
git add .
git commit -m "P2P: replace PeerJS with ntfy.sh transport (zero config)"
git push
```

Vercel fa il deploy automaticamente. Nessuna variabile d'ambiente da configurare.

---

## Se ntfy.sh non fosse raggiungibile (molto improbabile)

ntfy.sh è self-hostabile. In caso di problemi:
1. Installa ntfy su un server: https://docs.ntfy.sh/install/
2. Modifica `NTFY_BASE` in `js/firebase-rtdb.js`:
   ```javascript
   const NTFY_BASE = 'https://il-tuo-server.com';
   ```
