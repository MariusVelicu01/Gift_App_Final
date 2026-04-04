const API_BASE_URL = 'http://localhost:4000/api';

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

  console.log('API PATH:', path);
  console.log('API TOKEN:', token);
  console.log('API HEADERS:', headers);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => null);

  console.log('API STATUS:', response.status);
  console.log('API RESPONSE DATA:', data);

  if (!response.ok) {
    throw new Error(data?.message || 'Request failed.');
  }

  return data;
}