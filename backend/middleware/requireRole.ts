import { NextFunction, Request, Response } from 'express';
import { getUserProfileByUid, AppRole } from '../services/userService';

export function requireRole(...roles: AppRole[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const uid = req.user?.uid;

    console.log('REQUIRE ROLE UID:', uid);

    if (!uid) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    const profile = await getUserProfileByUid(uid);

    console.log('REQUIRE ROLE PROFILE:', profile);
    console.log('REQUIRE ROLE ALLOWED:', roles);

    if (!profile) {
      return res.status(404).json({ message: 'User profile not found.' });
    }

    if (!roles.includes(profile.role)) {
      return res.status(403).json({ message: 'Forbidden.' });
    }

    req.userProfile = profile;
    next();
  };
}