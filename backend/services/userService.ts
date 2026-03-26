import { db } from '../config/firebase';

export type AppRole = 'client' | 'admin';

export type UserProfile = {
  uid: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  email: string;
  role: AppRole;
  createdAt: string;
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