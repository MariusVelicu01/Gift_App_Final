export type AppRole = 'client' | 'admin';

export type UserProfile = {
  uid: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  email: string;
  role: AppRole;
  createdAt: string;
};