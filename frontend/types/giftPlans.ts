export type GiftPurpose =
  | 'Zi de nastere'
  | 'Craciun'
  | 'Paste'
  | 'Zi de nume'
  | 'Aniversare'
  | 'Multumire'
  | 'Alta ocazie';

export type GiftPlan = {
  id: string;
  lovedOneId: string;
  purpose: GiftPurpose;
  budget: number;
  deadlineDate: string;
  requiresCustomDate: boolean;
  status: 'planned' | 'completed';
  canModify: boolean;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
  experienceDetails?: string;
  reactionRating?: number;
};

export type GiftPlanPayload = {
  purpose: GiftPurpose;
  budget: number;
  deadlineDay?: number;
  deadlineMonth?: number;
  deadlineYear?: number;
};

export type CompleteGiftPlanPayload = {
  experienceDetails: string;
  reactionRating: number;
};
