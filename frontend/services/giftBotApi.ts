import { apiFetch } from './api';

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

export async function getGiftBotRecommendations(
  token: string,
  prompt: string,
  catalog: CatalogItem[]
): Promise<GiftBotRecommendation[]> {
  const data = await apiFetch(
    '/giftbot/recommend',
    {
      method: 'POST',
      body: JSON.stringify({ prompt, catalog }),
    },
    token
  );
  return data.recommendations as GiftBotRecommendation[];
}
