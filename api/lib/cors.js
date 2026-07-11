/**
 * CORS origin allowlist condiviso dalle funzioni serverless in api/*.js.
 *
 * Prima: 'Access-Control-Allow-Origin: *' ovunque — qualunque sito terzo
 * poteva chiamare queste API dal browser e consumare la quota a pagamento
 * di Google Places / Groq del proprietario (le API key restano server-side,
 * quindi non è una fuga di chiavi, ma è abuso di quota).
 *
 * L'app è un singolo deploy Vercel (frontend statico + funzioni sullo
 * stesso dominio, vedi js/*.js che chiamano /api/... in relativo): il
 * same-origin non ha comunque bisogno di header CORS. Questo helper serve
 * solo a bloccare le chiamate cross-origin da siti non autorizzati.
 *
 * ponytail: allowlist per pattern (non dominio esatto) perché Vercel genera
 * un sottodominio *.vercel.app diverso per ogni preview/branch — un dominio
 * hardcoded romperebbe quei deploy. Aggiorna qui se cambia il provider.
 */
const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/[a-z0-9-]+\.vercel\.app$/i,
  /^https:\/\/[a-z0-9-]+\.github\.io$/i,
  /^http:\/\/localhost(:\d+)?$/i,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/i,
];

export function setAllowedOrigin(req, res) {
  const origin = req.headers?.origin;
  if (origin && ALLOWED_ORIGIN_PATTERNS.some((re) => re.test(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  // Nessun match → nessun header Allow-Origin: il browser blocca la lettura
  // della risposta da parte di script cross-origin non autorizzati.
}
