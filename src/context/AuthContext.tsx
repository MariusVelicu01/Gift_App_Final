import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  User,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { auth, db } from '../firebase/config';
import type { AppRole, AppUserProfile } from '../types/user';

type RegisterInput = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  role: AppRole;
  email: string;
  password: string;
  confirmPassword: string;
};

type AuthContextType = {
  firebaseUser: User | null;
  profile: AppUserProfile | null;
  loading: boolean;
  register: (input: RegisterInput) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function normalizeFirebaseError(error: unknown): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code?: string }).code === 'string'
  ) {
    const code = (error as { code: string }).code;

    switch (code) {
      case 'auth/email-already-in-use':
        return 'Există deja un cont cu acest email.';
      case 'auth/invalid-email':
        return 'Email invalid.';
      case 'auth/weak-password':
        return 'Parola este prea slabă.';
      case 'auth/user-not-found':
        return 'Nu există cont cu acest email.';
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Email sau parolă incorectă.';
      case 'auth/missing-password':
        return 'Parola este obligatorie.';
      default:
        return code;
    }
  }

  return 'A apărut o eroare neașteptată.';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppUserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (uid: string) => {
    const ref = doc(db, 'users', uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      setProfile(null);
      return;
    }

    const data = snap.data() as Omit<AppUserProfile, 'uid'>;
    setProfile({
      uid,
      ...data,
    });
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);

      if (user) {
        try {
          await loadProfile(user.uid);
        } catch (error) {
          console.error('Failed to load profile:', error);
          setProfile(null);
        }
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return unsub;
  }, []);

const register = async (input: RegisterInput) => {
  const {
    firstName,
    lastName,
    dateOfBirth,
    gender,
    role,
    email,
    password,
    confirmPassword,
  } = input;

  if (!firstName.trim() || !lastName.trim()) {
    throw new Error('Numele și prenumele sunt obligatorii.');
  }

  if (!dateOfBirth.trim()) {
    throw new Error('Data nașterii este obligatorie.');
  }

  if (!gender.trim()) {
    throw new Error('Genul este obligatoriu.');
  }

  if (!email.trim()) {
    throw new Error('Emailul este obligatoriu.');
  }

  if (!password) {
    throw new Error('Parola este obligatorie.');
  }

  if (password !== confirmPassword) {
    throw new Error('Parolele nu coincid.');
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email.trim(),
      password
    );

    const uid = userCredential.user.uid;

    const profileData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      dateOfBirth: dateOfBirth.trim(),
      gender: gender.trim(),
      role,
      isActive: true,
      createdAt: serverTimestamp(),
    };

    console.log('Creating auth user succeeded. UID:', uid);
    console.log('Writing Firestore profile:', profileData);

    await setDoc(doc(db, 'users', uid), profileData);

    console.log('Firestore profile created successfully.');

    await loadProfile(uid);
  } catch (error: any) {
    console.error('REGISTER ERROR FULL:', error);

    if (error?.code?.startsWith('auth/')) {
      throw new Error(normalizeFirebaseError(error));
    }

    if (error?.code === 'permission-denied') {
      throw new Error('Firestore a refuzat salvarea. Verifică regulile din Firestore.');
    }

    throw new Error(error?.message || 'Înregistrarea a eșuat.');
  }
};

  const login = async (email: string, password: string) => {
    if (!email.trim()) {
      throw new Error('Emailul este obligatoriu.');
    }

    if (!password) {
      throw new Error('Parola este obligatorie.');
    }

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      await loadProfile(userCredential.user.uid);
    } catch (error) {
      throw new Error(normalizeFirebaseError(error));
    }
  };

  const resetPassword = async (email: string) => {
    if (!email.trim()) {
      throw new Error('Introdu emailul pentru resetare.');
    }

    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (error) {
      throw new Error(normalizeFirebaseError(error));
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const value = useMemo(
    () => ({
      firebaseUser,
      profile,
      loading,
      register,
      login,
      resetPassword,
      logout,
    }),
    [firebaseUser, profile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return ctx;
}