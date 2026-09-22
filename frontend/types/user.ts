export type AppRole = 'client' | 'admin';
export type UserGender = 'male' | 'female' | 'unknown';

export type UserConsent = {
  privacyAndTerms: true;
  giftBot: boolean;
  marketing: boolean;
  consentVersion: string;
  consentTimestamp: string;
};

export type UserProfile = {
  uid: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  gender?: UserGender;
  email: string;
  role: AppRole;
  createdAt: string;
  consent?: UserConsent;
};
