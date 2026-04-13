import { apiFetch } from './api';
import {
  CompleteGiftPlanPayload,
  GiftPlan,
  GiftPlanPayload,
} from '../types/giftPlans';

export async function getGiftPlans(
  token: string,
  lovedOneId: string
): Promise<GiftPlan[]> {
  return apiFetch(`/loved-ones/${lovedOneId}/gift-plans`, { method: 'GET' }, token);
}

export async function createGiftPlan(
  token: string,
  lovedOneId: string,
  data: GiftPlanPayload
): Promise<GiftPlan> {
  return apiFetch(
    `/loved-ones/${lovedOneId}/gift-plans`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
    token
  );
}

export async function updateGiftPlan(
  token: string,
  lovedOneId: string,
  giftPlanId: string,
  data: GiftPlanPayload
): Promise<GiftPlan> {
  return apiFetch(
    `/loved-ones/${lovedOneId}/gift-plans/${giftPlanId}`,
    {
      method: 'PUT',
      body: JSON.stringify(data),
    },
    token
  );
}

export async function deleteGiftPlan(
  token: string,
  lovedOneId: string,
  giftPlanId: string
) {
  return apiFetch(
    `/loved-ones/${lovedOneId}/gift-plans/${giftPlanId}`,
    { method: 'DELETE' },
    token
  );
}

export async function completeGiftPlan(
  token: string,
  lovedOneId: string,
  giftPlanId: string,
  data: CompleteGiftPlanPayload
): Promise<GiftPlan> {
  return apiFetch(
    `/loved-ones/${lovedOneId}/gift-plans/${giftPlanId}/complete`,
    {
      method: 'PATCH',
      body: JSON.stringify(data),
    },
    token
  );
}
