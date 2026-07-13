import { db, adminAuth } from '../config/firebase';

export type AppRole = 'client' | 'admin';
export type UserGender = 'male' | 'female' | 'unknown';
export type SubscriptionTier = 'free' | 'premium';

export type UserConsent = {
  privacyAndTerms: true;
  giftBot: boolean;
  marketing: boolean;
  consentVersion: string;
  consentTimestamp: string;
};

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
  consent?: UserConsent;
};

const USERS_COLLECTION = 'users';

const PROFILE_CACHE_TTL = 60_000;
const PROFILE_CACHE_MAX = 500;
const profileCache = new Map<string, { profile: UserProfile; expiresAt: number }>();

function cacheSet(profile: UserProfile) {
  // Evict oldest entry when at capacity (Map preserves insertion order)
  if (profileCache.size >= PROFILE_CACHE_MAX && !profileCache.has(profile.uid)) {
    const firstKey = profileCache.keys().next().value;
    if (firstKey) profileCache.delete(firstKey);
  }
  profileCache.set(profile.uid, { profile, expiresAt: Date.now() + PROFILE_CACHE_TTL });
}

function cacheInvalidate(uid: string) {
  profileCache.delete(uid);
}

export async function createUserProfile(profile: UserProfile) {
  await db.collection(USERS_COLLECTION).doc(profile.uid).set(profile);
  cacheSet(profile);
}

export async function getUserProfileByUid(uid: string): Promise<UserProfile | null> {
  const cached = profileCache.get(uid);
  if (cached && cached.expiresAt > Date.now()) return cached.profile;

  const doc = await db.collection(USERS_COLLECTION).doc(uid).get();
  if (!doc.exists) return null;

  const profile = doc.data() as UserProfile;
  cacheSet(profile);
  return profile;
}

export async function updateUserProfile(
  uid: string,
  updates: Partial<Pick<UserProfile, 'firstName' | 'lastName'>>
) {
  cacheInvalidate(uid);
  await db.collection(USERS_COLLECTION).doc(uid).update(updates);
  return getUserProfileByUid(uid);
}

export async function updateUserConsent(
  uid: string,
  updates: Pick<UserConsent, 'giftBot' | 'marketing'>
) {
  cacheInvalidate(uid);
  await db.collection(USERS_COLLECTION).doc(uid).update({
    'consent.giftBot': updates.giftBot,
    'consent.marketing': updates.marketing,
  });
  return getUserProfileByUid(uid);
}

export async function updateSubscription(
  uid: string,
  tier: SubscriptionTier,
  expiresAt?: string
) {
  cacheInvalidate(uid);
  const updates: Record<string, any> = { subscriptionTier: tier };
  if (expiresAt) updates.subscriptionExpiresAt = expiresAt;
  else updates.subscriptionExpiresAt = null;
  await db.collection(USERS_COLLECTION).doc(uid).update(updates);
  // Revoke refresh tokens so the user's next token refresh picks up the new subscription tier.
  // The user's current ID token stays valid until expiry (~1h), but the next refresh will reflect the change.
  await adminAuth.revokeRefreshTokens(uid).catch(() => {});
  return getUserProfileByUid(uid);
}
