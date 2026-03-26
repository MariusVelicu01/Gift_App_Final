import { Request, Response } from 'express';
import {
  getMyProfile,
  loginWithFirebase,
  registerUser,
  sendPasswordReset,
} from '../services/authService';

function calculateAge(dateString: string) {
  const birth = new Date(dateString);
  if (Number.isNaN(birth.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birth.getDate())
  ) {
    age--;
  }

  return age;
}

export async function register(req: Request, res: Response) {
  try {
    const { firstName, lastName, birthDate, email, password, role } = req.body;

    if (!firstName || !lastName || !birthDate || !email || !password || !role) {
      return res.status(400).json({ message: 'Completează toate câmpurile obligatorii.' });
    }

    if (!['client', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Rol invalid.' });
    }

    const age = calculateAge(birthDate);
    if (age === null) {
      return res.status(400).json({ message: 'Data nașterii este invalidă.' });
    }

    if (age < 16) {
      return res.status(400).json({
        message: 'Trebuie să ai cel puțin 16 ani pentru a crea un cont.',
      });
    }

    const user = await registerUser({
      firstName,
      lastName,
      birthDate,
      email,
      password,
      role,
    });

    return res.status(201).json({
      message: 'User registered successfully.',
      user,
    });
  } catch (error: any) {
    const message = String(error?.message || '').toLowerCase();

    if (
      message.includes('email-already-exists') ||
      message.includes('email already exists') ||
      message.includes('already in use')
    ) {
      return res.status(409).json({
        message: 'Există deja un cont asociat acestui email.',
      });
    }

    return res.status(500).json({
      message: 'Nu am putut crea contul.',
    });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Emailul și parola sunt obligatorii.',
      });
    }

    const result = await loginWithFirebase(email, password);

    return res.status(200).json({
      token: result.idToken,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
    });
  } catch {
    return res.status(401).json({
      message: 'Emailul sau parola sunt incorecte.',
    });
  }
}

export async function forgotPassword(req: Request, res: Response) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: 'Emailul este obligatoriu.',
      });
    }

    await sendPasswordReset(email);

    return res.status(200).json({
      message: 'A fost trimis un email pentru resetarea parolei.',
    });
  } catch {
    return res.status(400).json({
      message: 'Nu am putut trimite emailul de resetare.',
    });
  }
}

export async function me(req: Request, res: Response) {
  try {
    const uid = req.user?.uid;

    if (!uid) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    const profile = await getMyProfile(uid);

    if (!profile) {
      return res.status(404).json({ message: 'User profile not found.' });
    }

    return res.status(200).json(profile);
  } catch {
    return res.status(500).json({
      message: 'Failed to get profile.',
    });
  }
}