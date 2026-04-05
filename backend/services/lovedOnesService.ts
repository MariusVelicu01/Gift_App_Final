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

export async function getLovedOneById(uid: string, lovedOneId: string) {
  const doc = await db
    .collection(COLLECTION)
    .doc(uid)
    .collection('lovedOnes')
    .doc(lovedOneId)
    .get();

  if (!doc.exists) {
    return null;
  }

  return doc.data();
}

export async function updateLovedOne(uid: string, lovedOneId: string, data: any) {
  const ref = db
    .collection(COLLECTION)
    .doc(uid)
    .collection('lovedOnes')
    .doc(lovedOneId);

  await ref.update(data);

  const updated = await ref.get();
  return updated.data();
}