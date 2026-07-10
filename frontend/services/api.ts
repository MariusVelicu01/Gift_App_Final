import { API_BASE_URL } from './config';
import { emitSessionExpired } from './authEventBus';

export async function apiFetch(
  path: string,
  options: RequestInit = {},
  token?: string
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => null);

  if (response.status === 401) {
    emitSessionExpired();
  }

  if (!response.ok) {
    const err: any = new Error(data?.message || 'Request failed.');
    if (data?.code) err.code = data.code;
    throw err;
  }

  return data;
}
