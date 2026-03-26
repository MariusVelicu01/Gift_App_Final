const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || '';

type ApiFetchOptions = RequestInit & {
  token?: string | null;
};

export async function apiFetch(path: string, options: ApiFetchOptions = {}) {
  const { token, ...rest } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(rest.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || 'Request failed.');
  }

  return data;
}