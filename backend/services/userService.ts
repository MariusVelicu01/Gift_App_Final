import { db } from '../config/firebase';

export type AppRole = 'client' | 'admin';
export type UserGender = 'male' | 'female' | 'unknown';

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
  consent?: UserConsent;
  blocked?: boolean;
  deletedAt?: string | null;
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

// Some older/seed profiles predate a couple of conventions every write since has
// followed: `createdAt` as an ISO string (some are still a raw Firestore Timestamp),
// and `uid` stored as a field inside the document (some only ever had it as the
// document ID). Normalize both at read time — `docId` is always authoritative since
// it's how every write already keys these documents (createUserProfile, block, delete).
function normalizeProfile(docId: string, data: UserProfile): UserProfile {
  const createdAt = data.createdAt;
  const normalizedCreatedAt =
    typeof createdAt !== 'string' && createdAt && typeof (createdAt as any).toDate === 'function'
      ? (createdAt as any).toDate().toISOString()
      : createdAt;

  return { ...data, uid: docId, createdAt: normalizedCreatedAt };
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

  const profile = normalizeProfile(doc.id, doc.data() as UserProfile);
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

export async function setConsentVersion(uid: string, version: string) {
  cacheInvalidate(uid);
  await db.collection(USERS_COLLECTION).doc(uid).update({
    'consent.consentVersion': version,
    'consent.consentTimestamp': new Date().toISOString(),
  });
  return getUserProfileByUid(uid);
}

export async function setUserBlocked(uid: string, blocked: boolean) {
  cacheInvalidate(uid);
  await db.collection(USERS_COLLECTION).doc(uid).update({ blocked });
  return getUserProfileByUid(uid);
}

export async function markUserDeleted(uid: string) {
  cacheInvalidate(uid);
  await db.collection(USERS_COLLECTION).doc(uid).update({
    deletedAt: new Date().toISOString(),
    blocked: false,
  });
  return getUserProfileByUid(uid);
}

export async function listClientUsers(search?: string): Promise<UserProfile[]> {
  const snap = await db.collection(USERS_COLLECTION).where('role', '==', 'client').get();
  let users = snap.docs.map((d) => normalizeProfile(d.id, d.data() as UserProfile));

  if (search && search.trim()) {
    const needle = search.trim().toLowerCase();
    users = users.filter((u) => (u.email || '').toLowerCase().includes(needle));
  }

  users.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return users.slice(0, 500);
}

