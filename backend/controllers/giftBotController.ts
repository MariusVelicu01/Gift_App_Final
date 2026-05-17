import { Request, Response } from 'express';
import { CatalogItem, getGiftBotRecommendations } from '../services/giftBotService';

export async function recommend(req: Request, res: Response) {
  try {
    const uid = req.user?.uid;

    if (!uid) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    const { prompt, catalog } = req.body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return res.status(400).json({ message: 'Promptul este obligatoriu.' });
    }

    if (prompt.length > 5000) {
      return res.status(400).json({ message: 'Promptul este prea lung.' });
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
        id: item.id,
        name: item.name,
        brand: item.brand || undefined,
        category: item.category || undefined,
        price: item.price,
        store: item.store || '',
      }));

    if (safeCatalog.length === 0) {
      return res.status(400).json({ message: 'Catalogul de produse este invalid.' });
    }

    const recommendations = await getGiftBotRecommendations(prompt.trim(), safeCatalog);
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
