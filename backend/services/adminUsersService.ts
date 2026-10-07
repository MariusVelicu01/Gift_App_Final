import { adminAuth, db } from '../config/firebase';
import { getUserProfileByUid, markUserDeleted, UserProfile } from './userService';

const DELETED_EMAILS_COLLECTION = 'deletedEmails';

export async function isEmailBlacklisted(email: string): Promise<boolean> {
  const doc = await db
    .collection(DELETED_EMAILS_COLLECTION)
    .doc(email.trim().toLowerCase())
    .get();
  return doc.exists;
}

// Deletion is permanent and irreversible: the email is blacklisted forever (a new
// account can never be created with it again), the Firebase Auth user is removed
// entirely (so login fails immediately, "from scratch"), but the Firestore profile
// document is kept — only flagged with `deletedAt` — so admin statistics that key off
// historical user data are unaffected.
export async function deleteUserAccount(uid: string, adminUid: string): Promise<UserProfile> {
  const profile = await getUserProfileByUid(uid);
  if (!profile) throw new Error('Utilizatorul nu a fost găsit.');
  if (profile.role === 'admin') throw new Error('Nu poți șterge un cont de administrator.');
  if (profile.deletedAt) throw new Error('Contul este deja șters.');

  const emailKey = profile.email.trim().toLowerCase();

  await db.collection(DELETED_EMAILS_COLLECTION).doc(emailKey).set({
    email: profile.email,
    originalUid: uid,
    deletedAt: new Date().toISOString(),
    deletedByUid: adminUid,
  });

  const updated = await markUserDeleted(uid);

  await adminAuth.deleteUser(uid).catch(() => {
    // Already gone from Firebase Auth (e.g. a retried request) — the blacklist entry
    // and the Firestore `deletedAt` flag are the real source of truth either way.
  });

  return updated!;
}
