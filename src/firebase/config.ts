import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAOHUBxCg-FuVwJOY2ipNr1sdQ8kby4JT8",
  authDomain: "gift-app-20212.firebaseapp.com",
  projectId: "gift-app-20212",
  storageBucket: "gift-app-20212.firebasestorage.app",
  messagingSenderId: "759716716845",
  appId: "1:759716716845:web:82e769cee3ffa6a65e33a4"
};

// Initialize Firebase

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;