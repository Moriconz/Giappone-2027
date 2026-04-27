/**
 * Vercel Function: groqAnalyze
 * Uses GRO_API_KEY stored securely on server
 * URL: /api/groqAnalyze
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT,PATCH,DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { menuText } = req.body || {};
  const GRO_API_KEY = process.env.GRO_API_KEY;

  if (!menuText || !menuText.trim()) {
    return res.status(400).json({ error: 'Missing menuText' });
  }

  if (!GRO_API_KEY) {
    console.error('[groqAnalyze] GRO_API_KEY not set in environment');
    return res.status(500).json({ error: 'Groq API key not configured on server' });
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GRO_API_KEY}`
      },
      body: JSON.stringify({
        model: 'mixtral-8x7b-32768',
        messages: [
          {
            role: 'system',
            content: `Sei un esperto di celiachia e gluten-free. Analizza il menu italiano fornito e categorizza i piatti in 3 sezioni:
1. **PIATTI SICURI** (100% senza glutine, nessun rischio contaminazione)
2. **RISCHIO CONTAMINAZIONE** (ingredienti GF ma rischio cucina condivisa)
3. **SCONSIGLIATO** (contiene glutine o ingredients unclear)

Rispondi SOLO in JSON con questo formato (niente testo extra):
{
  "piatti_sicuri": ["piatto1", "piatto2"],
  "rischi": ["piatto3 (motivo)"],
  "sconsigliato": ["piatto4 (motivo)"]
}

Se dubbia, metti in RISCHIO (conservativo).`
          },
          {
            role: 'user',
            content: `Analizza questo menu:\n\n${menuText}`
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const message = err.error?.message || err.error || `Groq API returned ${response.status}`;
      console.error('[groqAnalyze] Groq API error:', message);
      return res.status(response.status).json({ error: message });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    try {
      const result = JSON.parse(content);
      return res.status(200).json({ result });
    } catch (parseErr) {
      console.error('[groqAnalyze] JSON parse error:', parseErr, 'content:', content);
      return res.status(500).json({ error: 'Invalid response format from Groq', detail: content });
    }
  } catch (error) {
    console.error('[groqAnalyze] Fetch error:', error);
    return res.status(500).json({ error: error.message });
  }
}
