/**
 * Vercel Function: groqImageAnalyze
 * Uses Groq chat completions to classify a dish from image labels or menu text.
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

  const { imageLabels, menuText } = req.body || {};
  const GRO_API_KEY = process.env.GRO_API_KEY;

  if ((!Array.isArray(imageLabels) || imageLabels.length === 0) && (!menuText || !menuText.trim())) {
    return res.status(400).json({ error: 'Missing image labels or menu text for analysis' });
  }

  if (!GRO_API_KEY) {
    console.error('[groqImageAnalyze] GRO_API_KEY not set in environment');
    return res.status(501).json({ error: 'Image recognition not configured on server' });
  }

  const labelsText = Array.isArray(imageLabels) ? imageLabels.join(', ') : String(imageLabels || '');
  const prompt = `Sei un esperto di cucina gluten-free. Riceverai una lista di parole chiave che descrivono una foto di un piatto. Analizza ogni piatto possibile e classificane il rischio per celiaci.

Regole:
- Rispondi SOLO in JSON, senza testo extra.
- Il JSON deve contenere sempre queste chiavi: "piatti_sicuri", "rischi", "sconsigliato".
- Usa una spiegazione breve tra parentesi per ogni voce, se possibile.
- Se sei incerto, usa la categoria "rischi".
- Non inventare piatti che non sono chiaramente suggeriti dalle parole chiave.

Esempio di risposta:
{
  "piatti_sicuri": ["Sashimi"],
  "rischi": ["Sushi (possibile salsa di soia o wasabi)"],
  "sconsigliato": ["Pizza (impasto con glutine)"]
}

Parole chiave immagine: ${labelsText}
${menuText ? `Testo menu aggiuntivo: ${menuText}` : ''}`;

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
          { role: 'system', content: 'You are a gluten-free food expert who can reason about dishes from image labels.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.25,
        max_tokens: 400
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const message = err.error?.message || err.error || `Groq API returned ${response.status}`;
      console.error('[groqImageAnalyze] Groq API error:', message);
      return res.status(response.status).json({ error: message });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    const jsonStart = content.indexOf('{');
    const jsonEnd = content.lastIndexOf('}');
    const jsonText = jsonStart >= 0 && jsonEnd >= 0 ? content.slice(jsonStart, jsonEnd + 1) : content;

    try {
      const result = JSON.parse(jsonText);
      return res.status(200).json({ result });
    } catch (parseErr) {
      console.error('[groqImageAnalyze] JSON parse error:', parseErr, 'content:', content);
      return res.status(500).json({ error: 'Invalid response format from Groq', detail: content });
    }
  } catch (error) {
    console.error('[groqImageAnalyze] Fetch error:', error);
    return res.status(500).json({ error: error.message });
  }
}
