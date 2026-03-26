import 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email?: string;
      };
      userProfile?: {
        uid: string;
        firstName: string;
        lastName: string;
        email: string;
        role: 'client' | 'admin';
        createdAt: string;
      };
    }
  }
}

export {};