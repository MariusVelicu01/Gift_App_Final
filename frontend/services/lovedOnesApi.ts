import { apiFetch } from './api';
import { LovedOne } from '../types/lovedOnes';

export async function getLovedOnes(token: string): Promise<LovedOne[]> {
  return apiFetch('/loved-ones', { method: 'GET' }, token);
}

export async function createLovedOne(token: string, data: Partial<LovedOne>) {
  return apiFetch('/loved-ones', {
    method: 'POST',
    body: JSON.stringify(data),
  }, token);
}