import { db } from '../config/firebase';

const USERS_COLLECTION = 'users';

export type GiftPurpose =
  | 'Zi de nastere'
  | 'Craciun'
  | 'Paste'
  | 'Zi de nume'
  | 'Aniversare'
  | 'Multumire'
  | 'Alta ocazie';

export type GiftPlanPayload = {
  purpose: GiftPurpose;
  budget: number;
  deadlineDate: string;
  purchaseDeadlineDate?: string;
  requiresCustomDate: boolean;
  status?: 'planned' | 'purchased' | 'completed';
  createdAt?: string;
  updatedAt?: string;
  budgetHistory?: unknown[];
};

export type CompleteGiftPlanPayload = {
  status: 'purchased';
  appFeedbackDetails?: string;
  appFeedbackRating?: number;
  completedAt: string;
  daysUntilCompleted: number;
  daysRemainingUntilGift?: number;
  budget: number;
  budgetHistory?: unknown[];
  selectedProducts: unknown[];
  updatedAt: string;
};

export type OfferGiftPlanPayload = {
  status: 'completed';
  experienceDetails?: string;
  reactionRating: number;
  productReactions: unknown[];
  offeredAt: string;
  daysRemainingUntilGift: number;
  updatedAt: string;
};

export type GiftPlanProductPayload = {
  selectedProducts: unknown[];
  budget?: number;
  budgetHistory?: unknown[];
  updatedAt: string;
};

function giftPlansCollection(uid: string, lovedOneId: string) {
  return db
    .collection(USERS_COLLECTION)
    .doc(uid)
    .collection('lovedOnes')
    .doc(lovedOneId)
    .collection('giftPlans');
}

export async function createGiftPlan(
  uid: string,
  lovedOneId: string,
  data: GiftPlanPayload
) {
  const ref = giftPlansCollection(uid, lovedOneId).doc();
  const payload = {
    id: ref.id,
    lovedOneId,
    ...data,
  };

  await ref.set(payload);
  return payload;
}

export async function getGiftPlans(uid: string, lovedOneId: string) {
  const snapshot = await giftPlansCollection(uid, lovedOneId)
    .orderBy('createdAt', 'desc')
    .get();

  return snapshot.docs.map((doc) => doc.data());
}

export async function getGiftPlanById(
  uid: string,
  lovedOneId: string,
  giftPlanId: string
) {
  const doc = await giftPlansCollection(uid, lovedOneId).doc(giftPlanId).get();

  if (!doc.exists) {
    return null;
  }

  return doc.data();
}

export async function updateGiftPlan(
  uid: string,
  lovedOneId: string,
  giftPlanId: string,
  data: GiftPlanPayload
) {
  const ref = giftPlansCollection(uid, lovedOneId).doc(giftPlanId);

  await ref.update(data);

  const updated = await ref.get();
  return updated.data();
}

export async function completeGiftPlan(
  uid: string,
  lovedOneId: string,
  giftPlanId: string,
  data: CompleteGiftPlanPayload
) {
  const ref = giftPlansCollection(uid, lovedOneId).doc(giftPlanId);

  await ref.update(data);

  const updated = await ref.get();
  return updated.data();
}

export async function offerGiftPlan(
  uid: string,
  lovedOneId: string,
  giftPlanId: string,
  data: OfferGiftPlanPayload
) {
  const ref = giftPlansCollection(uid, lovedOneId).doc(giftPlanId);

  await ref.update(data);

  const updated = await ref.get();
  return updated.data();
}

export async function updateGiftPlanProducts(
  uid: string,
  lovedOneId: string,
  giftPlanId: string,
  data: GiftPlanProductPayload
) {
  const ref = giftPlansCollection(uid, lovedOneId).doc(giftPlanId);

  await ref.update(data);

  const updated = await ref.get();
  return updated.data();
}

export async function deleteGiftPlan(
  uid: string,
  lovedOneId: string,
  giftPlanId: string
) {
  await giftPlansCollection(uid, lovedOneId).doc(giftPlanId).delete();
}
