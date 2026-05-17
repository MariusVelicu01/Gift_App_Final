import OpenAI from 'openai';

export type CatalogItem = {
  id: string;
  name: string;
  brand?: string;
  category?: string;
  price: number;
  store: string;
};

export type GiftBotRecommendation = {
  id: string;
  reason: string;
};

const SYSTEM_PROMPT = `Ești GiftBot, un asistent specializat în recomandări de cadouri pentru aplicația GiftApp.
Primești o descriere a persoanei, scopul cadoului, bugetul și un catalog de produse reale din magazinele partenere.
Sarcina ta este să selectezi din catalog produsele cele mai potrivite, respectând bugetul total indicat.
Returnează DOAR un obiect JSON valid cu cheia "recommendations", care conține o listă de obiecte cu câmpurile "id" (string, exact ca în catalog) și "reason" (string, maxim 2 propoziții în română, de ce e potrivit).
Nu adăuga text în afara JSON-ului. Nu inventa produse care nu există în catalog.`;

export async function getGiftBotRecommendations(
  prompt: string,
  catalog: CatalogItem[]
): Promise<GiftBotRecommendation[]> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY nu este configurat.');
  }

  const client = new OpenAI({ apiKey });

  const catalogText = catalog
    .map(
      (item) =>
        `ID:${item.id} | ${item.name}${item.brand ? ` (${item.brand})` : ''}${item.category ? ` [${item.category}]` : ''} | Pret: ${item.price} RON | Magazin: ${item.store}`
    )
    .join('\n');

  const fullPrompt = `${prompt}\n\nCATALOG PRODUSE DISPONIBILE (${catalog.length} produse):\n${catalogText}`;

  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: fullPrompt },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 1500,
    temperature: 0.5,
  });

  const content = completion.choices[0]?.message?.content;

  if (!content) {
    throw new Error('GiftBot nu a returnat un răspuns.');
  }

  const parsed = JSON.parse(content);
  const recommendations = parsed?.recommendations;

  if (!Array.isArray(recommendations)) {
    throw new Error('Format răspuns invalid de la GiftBot.');
  }

  return recommendations
    .filter(
      (rec: any) =>
        rec &&
        typeof rec.id === 'string' &&
        typeof rec.reason === 'string' &&
        catalog.some((item) => item.id === rec.id)
    )
    .map((rec: any) => ({ id: rec.id as string, reason: rec.reason as string }));
}
