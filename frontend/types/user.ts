export type AppRole = 'client' | 'admin';
export type UserGender = 'male' | 'female' | 'unknown';

export type UserProfile = {
  uid: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  gender?: UserGender;
  email: string;
  role: AppRole;
  createdAt: string;
};
