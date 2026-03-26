import { apiFetch } from './api';
import { UserProfile } from '../types/user';

export type RegisterPayload = {
  firstName: string;
  lastName: string;
  birthDate: string;
  email: string;
  password: string;
  role: 'client' | 'admin';
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

export async function forgotPasswordRequest(email: string) {
  return apiFetch('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function meRequest(token: string): Promise<UserProfile> {
  return apiFetch('/auth/me', { method: 'GET' }, token);
}