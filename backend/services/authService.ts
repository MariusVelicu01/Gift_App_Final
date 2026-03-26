import { adminAuth } from '../config/firebase';
import { createUserProfile, getUserProfileByUid, AppRole } from './userService';

type RegisterInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: AppRole;
};

type FirebaseLoginResponse = {
  idToken: string;
  refreshToken: string;
  expiresIn: string;
  localId: string;
  email: string;
};

export async function registerUser(input: RegisterInput) {
  const { firstName, lastName, email, password, role } = input;

  const userRecord = await adminAuth.createUser({
    email,
    password,
    displayName: `${firstName} ${lastName}`,
  });

  await createUserProfile({
    uid: userRecord.uid,
    firstName,
    lastName,
    email,
    role,
    createdAt: new Date().toISOString(),
  });

  return {
    uid: userRecord.uid,
    firstName,
    lastName,
    email,
    role,
  };
}

export async function loginWithFirebase(email: string, password: string) {
  const apiKey = process.env.FIREBASE_WEB_API_KEY;

  if (!apiKey) {
    throw new Error('Missing FIREBASE_WEB_API_KEY.');
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true,
      }),
    }
  );

  const data = (await response.json()) as any;

  if (!response.ok) {
    throw new Error(data?.error?.message || 'Login failed.');
  }

  return data as FirebaseLoginResponse;
}

export async function sendPasswordReset(email: string) {
  const apiKey = process.env.FIREBASE_WEB_API_KEY;

  if (!apiKey) {
    throw new Error('Missing FIREBASE_WEB_API_KEY.');
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestType: 'PASSWORD_RESET',
        email,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || 'Failed to send reset email.');
  }

  return { message: 'Password reset email sent.' };
}

export async function getMyProfile(uid: string) {
  return getUserProfileByUid(uid);
}