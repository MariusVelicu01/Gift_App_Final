export type AppRole = 'client' | 'admin';

export interface AppUserProfile {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string; // păstrăm simplu pentru MVP
  gender: string;
  role: AppRole;
  isActive: boolean;
  createdAt?: unknown;
}