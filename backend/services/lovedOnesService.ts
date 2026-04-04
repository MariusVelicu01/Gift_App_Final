import { db } from '../config/firebase';

const COLLECTION = 'users';

export async function createLovedOne(uid: string, data: any) {
  const ref = db
    .collection(COLLECTION)
    .doc(uid)
    .collection('lovedOnes')
    .doc();

  const payload = {
    id: ref.id,
    ...data,
  };

  await ref.set(payload);

  return payload;
}

export async function getLovedOnes(uid: string) {
  const snapshot = await db
    .collection(COLLECTION)
    .doc(uid)
    .collection('lovedOnes')
    .orderBy('createdAt', 'desc')
    .get();

  return snapshot.docs.map((doc) => doc.data());
}