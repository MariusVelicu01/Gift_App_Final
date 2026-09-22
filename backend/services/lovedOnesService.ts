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

  return snapshot.docs
    .map((doc) => doc.data())
    .filter((item) => !item.isDeleted);
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

  const data = doc.data();

  if (data?.isDeleted) {
    return null;
  }

  return data;
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

export async function deleteLovedOne(uid: string, lovedOneId: string) {
  const ref = db
    .collection(COLLECTION)
    .doc(uid)
    .collection('lovedOnes')
    .doc(lovedOneId);
  const deletedAt = new Date().toISOString();

  await ref.update({
    isDeleted: true,
    deletedAt,
    updatedAt: deletedAt,
  });

  const updated = await ref.get();
  return updated.data();
}
