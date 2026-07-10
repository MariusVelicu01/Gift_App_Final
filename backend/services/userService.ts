import { db } from '../config/firebase';

export type AppRole = 'client' | 'admin';
export type UserGender = 'male' | 'female' | 'unknown';
export type SubscriptionTier = 'free' | 'premium';

export type UserProfile = {
  uid: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  gender?: UserGender;
  email: string;
  role: AppRole;
  createdAt: string;
  subscriptionTier: SubscriptionTier;
  subscriptionExpiresAt?: string;
};

const USERS_COLLECTION = 'users';

export async function createUserProfile(profile: UserProfile) {
  await db.collection(USERS_COLLECTION).doc(profile.uid).set(profile);
}

export async function getUserProfileByUid(uid: string) {
  const doc = await db.collection(USERS_COLLECTION).doc(uid).get();

  if (!doc.exists) {
    return null;
  }

  return doc.data() as UserProfile;
}

export async function updateUserProfile(
  uid: string,
  updates: Partial<Pick<UserProfile, 'firstName' | 'lastName'>>
) {
  await db.collection(USERS_COLLECTION).doc(uid).update(updates);
  return getUserProfileByUid(uid);
}

export async function updateSubscription(
  uid: string,
  tier: SubscriptionTier,
  expiresAt?: string
) {
  const updates: Record<string, any> = { subscriptionTier: tier };
  if (expiresAt) updates.subscriptionExpiresAt = expiresAt;
  else updates.subscriptionExpiresAt = null;
  await db.collection(USERS_COLLECTION).doc(uid).update(updates);
  return getUserProfileByUid(uid);
}
