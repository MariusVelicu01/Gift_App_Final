import { adminAuth } from '../config/firebase';
import {
  createUserProfile,
  getUserProfileByUid,
  updateUserProfile,
  AppRole,
  UserGender,
} from './userService';

type RegisterInput = {
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: UserGender;
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
  const { firstName, lastName, birthDate, gender, email, password, role } = input;

  const userRecord = await adminAuth.createUser({
    email,
    password,
    displayName: `${firstName} ${lastName}`,
  });

  try {
    await createUserProfile({
      uid: userRecord.uid,
      firstName,
      lastName,
      birthDate,
      gender,
      email,
      role,
      createdAt: new Date().toISOString(),
    });

    return {
      uid: userRecord.uid,
      firstName,
      lastName,
      birthDate,
      gender,
      email,
      role,
    };
  } catch (error) {
    await adminAuth.deleteUser(userRecord.uid);
    throw error;
  }
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
    throw new Error('Emailul sau parola sunt incorecte.');
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
    throw new Error('Nu am putut trimite emailul de resetare.');
  }

  return { message: 'Password reset email sent.' };
}

export async function getMyProfile(uid: string) {
  return getUserProfileByUid(uid);
}

export async function updateUserName(uid: string, firstName: string, lastName: string) {
  await adminAuth.updateUser(uid, { displayName: `${firstName} ${lastName}` });
  return updateUserProfile(uid, { firstName, lastName });
}

export async function changeUserPassword(
  uid: string,
  email: string,
  currentPassword: string,
  newPassword: string
) {
  await loginWithFirebase(email, currentPassword);
  await adminAuth.updateUser(uid, { password: newPassword });
}
