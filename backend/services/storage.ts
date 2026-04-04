import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_WEB_API_KEY,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

export async function uploadImage(uri: string, uid: string) {
  const response = await fetch(uri);
  const blob = await response.blob();

  const fileName = `loved-ones/${uid}/${Date.now()}.jpg`;

  const storageRef = ref(storage, fileName);

  await uploadBytes(storageRef, blob);

  return getDownloadURL(storageRef);
}