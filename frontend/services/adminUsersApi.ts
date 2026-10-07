import { apiFetch } from './api';
import { UserProfile } from '../types/user';

export async function getAdminUsers(token: string, search?: string): Promise<UserProfile[]> {
  const query = search && search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
  return apiFetch(`/admin-users${query}`, {}, token);
}

export async function setUserBlocked(token: string, uid: string, blocked: boolean) {
  return apiFetch(
    `/admin-users/${uid}/block`,
    { method: 'PUT', body: JSON.stringify({ blocked }) },
    token
  );
}

export async function deleteUserAccount(token: string, uid: string) {
  return apiFetch(`/admin-users/${uid}`, { method: 'DELETE' }, token);
}
