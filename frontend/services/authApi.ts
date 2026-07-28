import { apiFetch } from './api';
import { UserConsent, UserGender, UserProfile } from '../types/user';

export type ConsentPayload = {
  privacyAndTerms: true;
  giftBot: boolean;
  marketing: boolean;
};

export type RegisterPayload = {
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: UserGender;
  email: string;
  password: string;
  role: 'client' | 'admin';
  consent: ConsentPayload;
};

export async function checkServerHealth() {
  return apiFetch('/health', { method: 'GET' });
}

export async function registerRequest(payload: RegisterPayload) {
  return apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function loginRequest(email: string, password: string) {
  return apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function refreshTokenRequest(refreshToken: string): Promise<{
  token: string;
  refreshToken: string;
  expiresIn: string;
}> {
  return apiFetch('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
}

export async function forgotPasswordRequest(email: string) {
  return apiFetch('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function meRequest(token: string): Promise<UserProfile> {
  return apiFetch('/auth/me', { method: 'GET' }, token);
}

export async function updateProfileRequest(
  token: string,
  firstName: string,
  lastName: string
): Promise<UserProfile> {
  return apiFetch(
    '/auth/profile',
    { method: 'PATCH', body: JSON.stringify({ firstName, lastName }) },
    token
  );
}

export async function changePasswordRequest(
  token: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  return apiFetch(
    '/auth/change-password',
    { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) },
    token
  );
}

export async function googleProfileHintRequest(tempToken: string): Promise<{
  googleEmail: string;
  googleFirstName: string;
  googleLastName: string;
}> {
  return apiFetch(`/auth/google/profile-hint?tempToken=${encodeURIComponent(tempToken)}`, { method: 'GET' });
}

export async function googleCompleteProfileRequest(
  tempToken: string,
  firstName: string,
  lastName: string,
  birthDate: string,
  gender: UserGender,
  consent: ConsentPayload
): Promise<{ token: string; refreshToken: string; expiresIn: string }> {
  return apiFetch('/auth/google/complete-profile', {
    method: 'POST',
    body: JSON.stringify({ tempToken, firstName, lastName, birthDate, gender, consent }),
  });
}

export async function updateConsentRequest(
  token: string,
  consent: Pick<UserConsent, 'giftBot' | 'marketing'>
): Promise<UserProfile> {
  return apiFetch(
    '/auth/consent',
    { method: 'PATCH', body: JSON.stringify(consent) },
    token
  );
}
