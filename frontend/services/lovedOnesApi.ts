import { apiFetch } from './api';
import { LovedOne } from '../types/lovedOnes';

export async function getLovedOnes(token: string): Promise<LovedOne[]> {
  return apiFetch('/loved-ones', { method: 'GET' }, token);
}

export async function getLovedOneById(
  token: string,
  id: string
): Promise<LovedOne> {
  return apiFetch(`/loved-ones/${id}`, { method: 'GET' }, token);
}

export async function createLovedOne(token: string, data: Partial<LovedOne>) {
  return apiFetch(
    '/loved-ones',
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
    token
  );
}

export async function updateLovedOne(
  token: string,
  id: string,
  data: Partial<LovedOne>
) {
  return apiFetch(
    `/loved-ones/${id}`,
    {
      method: 'PUT',
      body: JSON.stringify(data),
    },
    token
  );
}