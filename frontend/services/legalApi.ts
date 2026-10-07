import { apiFetch } from './api';

export type LegalDocType = 'privacy' | 'terms' | 'affiliate';
export type LegalSection = { heading: string; body: string };
export type LegalDoc = {
  type: LegalDocType;
  sections: LegalSection[];
  version: number;
  updatedAt: string;
  updatedByUid: string | null;
};

export async function getLegalDocs(): Promise<Record<LegalDocType, LegalDoc>> {
  return apiFetch('/legal');
}

export async function updateLegalDoc(token: string, type: LegalDocType, sections: LegalSection[]) {
  return apiFetch(`/legal/${type}`, { method: 'PUT', body: JSON.stringify({ sections }) }, token);
}

export async function acceptCurrentTerms(token: string) {
  return apiFetch('/legal/accept-terms', { method: 'POST' }, token);
}
