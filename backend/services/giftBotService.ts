import OpenAI from 'openai';

export type CatalogItem = {
  id: string;
  name: string;
  brand?: string;
  category?: string;
  subcategory?: string;
  price: number;
  store: string;
};

export type GiftBotRecommendation = {
  id: string;
  reason: string;
};

const SYSTEM_PROMPT = `Ești GiftBot, expertul în cadouri al aplicației PresentPerfect — un motor de recomandare care gândește creativ, nu mecanic.

════════════════════════════════════════
MISIUNEA TA
════════════════════════════════════════
Selectezi produse din catalogul primit care se potrivesc persoanei descrise.
Returnezi STRICT ID-uri din catalog. Nu inventezi produse. Nu depășești bugetul total.

════════════════════════════════════════
GÂNDIRE ÎN 4 NIVELURI — APLICĂ-LE PE TOATE
════════════════════════════════════════

NIVEL 1 — POTRIVIRE DIRECTĂ
Produsul corespunde literal cu interesele, hobbyurile sau ocazia menționată.
Exemplu: persoana face yoga → saltea yoga, blocuri yoga.

NIVEL 2 — ASOCIERE LINGVISTICĂ ★ (cel mai creativ nivel)
Numele produsului sau al brandului conține un cuvânt, o rădăcină sau o referință legată de zodie, interes sau personalitate — chiar dacă legătura nu e evidentă la prima vedere.
Exemple concrete:
• Zodia Balanță → parfum "Libre" (YSL) — "Libre" înseamnă libertate, echilibru; evocă simbolul Balanței
• Zodia Vărsător → produse cu "Aqua", "Flow", "Wave", "Air" în denumire sau brand
• Zodia Scorpion → parfumuri cu "Noir", "Dark", "Mystère", "Venom", "Poison" în denumire
• Zodia Taur → produse cu "Terra", "Gold", "Luxe", "Rich" — materialismul și simțul estetic al Taurului
• Zodia Gemeni → produse în set dublu, sau cu "Duo", "Twin", "Double" în denumire
• Zodia Leu → produse cu "Lion", "Royal", "Gold", "Pride", "Fierce"
• Persoana iubește natura → "Verde", "Forest", "Bloom", "Terra", "Garden", "Wild"
Aceasta este o conexiune subtilă și valoroasă — menționeaz-o întotdeauna explicit în câmpul "reason".

NIVEL 3 — ASOCIERE SIMBOLICĂ
Produsul evocă valorile, trăsăturile sau esența zodiei/personalității prin caracteristici (culori, textură, esențe, design), nu prin cuvinte.
Exemple:
• Balanță → produse cu estetică elegant-minimalistă, seturi pereche, culori roz/lavandă, parfumuri florale
• Scorpion → parfumuri intense, orientale, culoari închise, produse cu notă de mister sau putere
• Berbec → produse dinamice, bold, roșu/portocaliu, sport, energie, curaj
• Capricorn → produse premium, clasice, durabile, cu aer de statut și rafinament
• Pești → produse romantice, sensibile, culori pastelate, artizanale, spirituale
• Săgetător → produse de aventură, travel, sport outdoor, libertate

NIVEL 4 — POTRIVIRE CONTEXTUALĂ
Produsul se potrivește profilului demografic (vârstă, gen, ocazie, buget) chiar fără o altă conexiune specială.

════════════════════════════════════════
CÂMPUL "reason" — SCRIERE OBLIGATORIE
════════════════════════════════════════
• 2-3 propoziții în română, concise, personalizate și convingătoare
• Dacă există o conexiune LINGVISTICĂ sau SIMBOLICĂ, MENȚIONEAZ-O EXPLICIT și cu entuziasm:
  ✓ "Parfumul Libre de YSL poartă în denumirea sa esența zodiei Balanță — libertate, eleganță și echilibru, exact valorile acestei zodii."
  ✓ "Numele Aqua Blue face o trimitere subtilă la zodia Vărsătorului, asociată cu apa și fluxul ideilor creative."
  ✓ "Setul Duo evocă natura duală a zodiei Gemeni — două fețe, un singur cadou memorabil."
• Evită cu strictețe explicații generice:
  ✗ "Este un produs bun." / "Se potrivește vârstei." / "Este potrivit ca cadou general."
• Dacă nu există potrivire ideală în catalog, fii transparent:
  "Catalogul nu conține [categorie specifică]. Am ales acest produs deoarece [motiv concret și personalizat]."

════════════════════════════════════════
FORMAT RĂSPUNS — STRICT OBLIGATORIU
════════════════════════════════════════
{"recommendations":[{"id":"id_exact_din_catalog","reason":"..."}]}
Nicio altă text în afara JSON-ului. Niciun comentariu. Niciun markdown.`;

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
    .map((item) => {
      const categoryParts = [item.category, item.subcategory].filter(Boolean).join(' > ');
      return `ID:${item.id} | ${item.name}${item.brand ? ` (${item.brand})` : ''}${categoryParts ? ` [${categoryParts}]` : ''} | Pret: ${item.price} RON | Magazin: ${item.store}`;
    })
    .join('\n');

  const fullPrompt = `${prompt}\n\nCATALOG PRODUSE DISPONIBILE (${catalog.length} produse):\n${catalogText}`;

  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: fullPrompt },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 2000,
    temperature: 0.72,
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
