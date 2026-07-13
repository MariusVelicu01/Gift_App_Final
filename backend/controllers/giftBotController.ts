import { Request, Response } from 'express';
import { CatalogItem, getGiftBotRecommendations } from '../services/giftBotService';
import { getUserProfileByUid } from '../services/userService';

export async function recommend(req: Request, res: Response) {
  try {
    const uid = req.user?.uid;

    if (!uid) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    const profile = await getUserProfileByUid(uid);
    if (!profile?.consent?.giftBot) {
      return res.status(403).json({
        code: 'CONSENT_REQUIRED_GIFTBOT',
        message: 'Activează consimțământul pentru GiftBot din Setări → Datele mele & Confidențialitate.',
      });
    }

    const { prompt, catalog } = req.body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return res.status(400).json({ message: 'Promptul este obligatoriu.' });
    }

    if (prompt.length > 5000) {
      return res.status(400).json({ message: 'Promptul este prea lung.' });
    }

    // Strip ASCII control characters (keep Romanian diacritics and printable unicode)
    const cleanPrompt = prompt.trim().replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    const INJECTION_PATTERNS = [
      /ignore\s+(previous|above|all|prior|the\s+system)/i,
      /^\s*system\s*:/m,
      /["']role["']\s*:\s*["']system["']/i,
      /\bDAN\b/,
      /jailbreak/i,
      /\bforget\s+(your\s+)?(instructions?|rules?|prompt|role)/i,
      /\bact\s+as\b.{0,40}\b(assistant|ai|bot|model|gpt)\b/i,
      /\[INST\]/,
      /<\|im_start\|>/,
      /\bnew\s+(persona|identity|role|instructions?)\b/i,
    ];
    if (INJECTION_PATTERNS.some((p) => p.test(cleanPrompt))) {
      return res.status(400).json({ message: 'Conținut invalid în prompt.' });
    }

    if (!Array.isArray(catalog) || catalog.length === 0) {
      return res.status(400).json({ message: 'Catalogul de produse este gol.' });
    }

    const safeCatalog: CatalogItem[] = (catalog as any[])
      .filter(
        (item) =>
          item &&
          typeof item.id === 'string' &&
          typeof item.name === 'string' &&
          typeof item.price === 'number'
      )
      .slice(0, 500)
      .map((item) => ({
        id: String(item.id).slice(0, 100),
        name: String(item.name).slice(0, 200),
        brand: item.brand ? String(item.brand).slice(0, 100) : undefined,
        category: item.category ? String(item.category).slice(0, 100) : undefined,
        subcategory: item.subcategory ? String(item.subcategory).slice(0, 100) : undefined,
        price: item.price,
        store: String(item.store || '').slice(0, 100),
        ...(typeof item.affiliateUrl === 'string' && item.affiliateUrl ? { affiliateUrl: item.affiliateUrl } : {}),
        ...(typeof item.productUrl === 'string' && item.productUrl ? { productUrl: item.productUrl } : {}),
        ...(typeof item.imageUrl === 'string' && item.imageUrl ? { imageUrl: item.imageUrl } : {}),
      }));

    if (safeCatalog.length === 0) {
      return res.status(400).json({ message: 'Catalogul de produse este invalid.' });
    }

    const recommendations = await getGiftBotRecommendations(cleanPrompt, safeCatalog);
    return res.status(200).json({ recommendations });
  } catch (error: any) {
    console.error('GIFTBOT ERROR:', error);
    const isConfig = error?.message?.includes('OPENAI_API_KEY');
    return res.status(500).json({
      message: isConfig
        ? 'GiftBot nu este configurat pe server.'
        : 'GiftBot nu a putut genera recomandări. Încearcă din nou.',
    });
  }
}
