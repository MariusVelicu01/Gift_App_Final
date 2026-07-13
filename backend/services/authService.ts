import { adminAuth } from '../config/firebase';
import {
  createUserProfile,
  getUserProfileByUid,
  updateUserProfile,
  AppRole,
  UserGender,
  UserConsent,
} from './userService';

type RegisterInput = {
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: UserGender;
  email: string;
  password: string;
  role: AppRole;
  consent: UserConsent;
};

type FirebaseLoginResponse = {
  idToken: string;
  refreshToken: string;
  expiresIn: string;
  localId: string;
  email: string;
};

async function getGoogleUserInfo(accessToken: string) {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('Token Google invalid sau expirat.');
  const data = (await res.json()) as any;
  if (!data.email) throw new Error('Google nu a returnat un email valid.');
  return {
    email: data.email as string,
    firstName: (data.given_name as string) || '',
    lastName: (data.family_name as string) || '',
  };
}

async function signInWithCustomToken(customToken: string) {
  const apiKey = process.env.FIREBASE_WEB_API_KEY;
  if (!apiKey) throw new Error('Missing FIREBASE_WEB_API_KEY.');
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    }
  );
  const data = (await res.json()) as any;
  if (!res.ok) throw new Error('Nu am putut genera sesiunea Google.');
  return { idToken: data.idToken as string, refreshToken: data.refreshToken as string, expiresIn: data.expiresIn as string };
}

export type GoogleInitResult =
  | { isNewUser: false; idToken: string; refreshToken: string; expiresIn: string }
  | { isNewUser: true; googleEmail: string; googleFirstName: string; googleLastName: string };

export async function loginOrInitGoogleUser(googleAccessToken: string): Promise<GoogleInitResult> {
  const googleUser = await getGoogleUserInfo(googleAccessToken);

  try {
    const existing = await adminAuth.getUserByEmail(googleUser.email);
    const hasPassword = !!existing.passwordHash;
    const hasGoogle = existing.providerData?.some((p) => p.providerId === 'google.com');

    if (hasPassword && !hasGoogle) {
      throw new Error(
        'Există deja un cont cu acest email creat cu parolă. Autentifică-te cu email și parolă.'
      );
    }

    const customToken = await adminAuth.createCustomToken(existing.uid, {
      role: (existing.customClaims as any)?.role || 'client',
    });
    const tokens = await signInWithCustomToken(customToken);
    return { isNewUser: false, ...tokens };
  } catch (err: any) {
    if (err.code === 'auth/user-not-found') {
      return {
        isNewUser: true,
        googleEmail: googleUser.email,
        googleFirstName: googleUser.firstName,
        googleLastName: googleUser.lastName,
      };
    }
    throw err;
  }
}

export async function completeGoogleRegistration(
  googleAccessToken: string,
  firstName: string,
  lastName: string,
  birthDate: string,
  gender: UserGender,
  consent: UserConsent
) {
  const googleUser = await getGoogleUserInfo(googleAccessToken);

  const userRecord = await adminAuth.createUser({
    email: googleUser.email,
    displayName: `${firstName} ${lastName}`,
    emailVerified: true,
  });

  try {
    await Promise.all([
      createUserProfile({
        uid: userRecord.uid,
        firstName,
        lastName,
        birthDate,
        gender,
        email: googleUser.email,
        role: 'client',
        createdAt: new Date().toISOString(),
        subscriptionTier: 'free',
        consent,
      }),
      adminAuth.setCustomUserClaims(userRecord.uid, { role: 'client' }),
    ]);

    const customToken = await adminAuth.createCustomToken(userRecord.uid, { role: 'client' });
    return signInWithCustomToken(customToken);
  } catch (err) {
    await adminAuth.deleteUser(userRecord.uid);
    throw err;
  }
}

export async function registerUser(input: RegisterInput) {
  const { firstName, lastName, birthDate, gender, email, password, role, consent } = input;

  const userRecord = await adminAuth.createUser({
    email,
    password,
    displayName: `${firstName} ${lastName}`,
  });

  try {
    await Promise.all([
      createUserProfile({
        uid: userRecord.uid,
        firstName,
        lastName,
        birthDate,
        gender,
        email,
        role,
        createdAt: new Date().toISOString(),
        subscriptionTier: 'free',
        consent,
      }),
      adminAuth.setCustomUserClaims(userRecord.uid, { role }),
    ]);

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

  if (!response.ok) {
    await response.json().catch(() => null);
    throw new Error('Nu am putut trimite emailul de resetare.');
  }

  return { message: 'Password reset email sent.' };
}

export async function refreshFirebaseToken(refreshToken: string) {
  const apiKey = process.env.FIREBASE_WEB_API_KEY;

  if (!apiKey) {
    throw new Error('Missing FIREBASE_WEB_API_KEY.');
  }

  const response = await fetch(
    `https://securetoken.googleapis.com/v1/token?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`,
    }
  );

  const data = (await response.json()) as any;

  if (!response.ok) {
    throw new Error('Token-ul de refresh este invalid sau expirat.');
  }

  return {
    idToken: data.id_token as string,
    refreshToken: data.refresh_token as string,
    expiresIn: data.expires_in as string,
  };
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
