import { apiFetch } from './api';
import { PriceAlert } from '../types/priceAlerts';

export async function getPriceAlerts(token: string): Promise<PriceAlert[]> {
  return apiFetch('/price-alerts', { method: 'GET' }, token);
}

export async function markPriceAlertRead(
  token: string,
  notificationId: string
): Promise<PriceAlert> {
  return apiFetch(
    `/price-alerts/${notificationId}/read`,
    { method: 'PATCH' },
    token
  );
}

export async function markAllPriceAlertsRead(
  token: string
): Promise<PriceAlert[]> {
  return apiFetch('/price-alerts/read-all', { method: 'PATCH' }, token);
}

export async function deletePriceAlerts(
  token: string,
  mode: 'read' | 'all'
): Promise<PriceAlert[]> {
  return apiFetch(
    '/price-alerts',
    {
      method: 'DELETE',
      body: JSON.stringify({ mode }),
    },
    token
  );
}

export async function markPriceAlertHighlightSeen(
  token: string,
  notificationId: string
): Promise<PriceAlert> {
  return apiFetch(
    `/price-alerts/${notificationId}/highlight-seen`,
    { method: 'PATCH' },
    token
  );
}
