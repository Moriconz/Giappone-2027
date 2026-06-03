# Brief per Implementazione Fase 1 — UX Travel Planner

## Problema

Questa app ha **6 criticità bloccanti** che oggi la rendono poco utile come vero travel companion per il Giappone:

1. **Onboarding assente** — Primo accesso confusionario, nessuna personalizzazione
2. **Architettura tab dispersiva** — 10+ tab senza gerarchia, utente perso
3. **Dettaglio POI troppo denso** — Troppo tempo per decidere sì/no
4. **Filtri non orientati a bisogni reali** — Non puoi cercare "GF sicuro + vicino + gratis"
5. **Itinerario troppo statico** — Guardarsi e basta, non modificare davvero
6. **Supporto offline insufficiente** — In viaggio (situazione peggiore) non aiuta

## Orientamento

Il piano deve essere:
- **Pragmatico, use-case driven** — Ogni feature serve a situazione reale
- **Ottimizzato per smartphone** — Durante pianificazione e viaggio
- **Zero priorità estetica** — Solo utilità, velocità decisionale, affidabilità

## Fasi Implementazione

### Fase 1: Usabilità core (3-5 giorni)
- Onboarding rapido (profilo viaggio, preferenze, dieta, budget)
- Riduzione/riorganizzazione tab → 4 principali (Mappa, Itinerario, GF Guide, Menu)
- Dettaglio POI riordinato per decisione rapida (foto → titolo → meta → GF → info → CTA)
- Filtri travel-specific (GF Safe, Gratis, Vicino, Pioggia, Food, Famiglia)
- Itinerario davvero modificabile (accordion giorni, drag POI, modifica orario/note, elimina)
- Empty/Loading/Error states curati per nuovi flussi

### Fase 2: Offline + persistenza (2-3 giorni)
- Offline reale per itinerario, POI salvati, note, indirizzi
- Sync al ritorno online
- Personalizzazione persistente (profilo viaggio salvato)

### Fase 3: Coerenza + polish (2 giorni)
- Coerenza dark mode (colori, contrasto, superfici uniforme)
- UX refinement (accessibilità, touch target ≥44px, micro-interazioni)
- Stati residui coverage
- Rifinitura finale di coerenza visiva e accessibilità

## Schermate nuove da aggiungere

1. **Splash Onboarding** (3-5 step form)
2. **Itinerary View** (accordion giorni + drag)
3. **GF Guide** (lista POI GF filtrata con contatti)
4. **Settings/Menu** (drawer con gear icon)
5. **POI Detail Modal** (reordering info, nuove CTA)

## Scope escluso

- Feature estetiche pure
- Budget planner avanzato
- Sharing live gruppo
- Mappe offline (troppo complex)
- Weather integration
- Statistiche viaggio

## Success criteria

- Utente nuovo: onboarding → itinerario 3gg → filtri GF → risultati in < 5 min
- Tutto navigabile on mobile senza confusione
- Offline: chiudi connessione, itinerario + GF guide + contatti visibili
- Design: non sembra beta, coerente, usabile al sole
- Decisione rapida: POI → sì/no/forse in pochi tap

---

**Nota**: Per dettagli UI/UX specifici, consultare UX_IMPROVEMENT_ROADMAP.md
