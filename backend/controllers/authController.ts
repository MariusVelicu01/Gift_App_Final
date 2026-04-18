import { Request, Response } from 'express';
import {
  changeUserPassword,
  getMyProfile,
  loginWithFirebase,
  registerUser,
  sendPasswordReset,
  updateUserName,
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
    const {
      firstName,
      lastName,
      birthDate,
      email,
      password,
      role,
      gender = 'unknown',
    } = req.body;

    if (!firstName || !lastName || !birthDate || !email || !password || !role) {
      return res.status(400).json({ message: 'Completează toate câmpurile obligatorii.' });
    }

    if (!['client', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Rol invalid.' });
    }

    if (!['male', 'female', 'unknown'].includes(gender)) {
      return res.status(400).json({ message: 'Gen invalid.' });
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
      gender,
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

export async function updateProfile(req: Request, res: Response) {
  try {
    const uid = req.user?.uid;

    if (!uid) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    const { firstName, lastName } = req.body;

    if (!String(firstName || '').trim() || !String(lastName || '').trim()) {
      return res.status(400).json({ message: 'Prenumele si numele sunt obligatorii.' });
    }

    const profile = await updateUserName(uid, firstName.trim(), lastName.trim());
    return res.status(200).json(profile);
  } catch {
    return res.status(500).json({ message: 'Nu am putut actualiza profilul.' });
  }
}

export async function changePassword(req: Request, res: Response) {
  try {
    const uid = req.user?.uid;

    if (!uid) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Parola curenta si cea noua sunt obligatorii.' });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({ message: 'Parola noua trebuie sa aiba cel putin 6 caractere.' });
    }

    const profile = await getMyProfile(uid);

    if (!profile) {
      return res.status(404).json({ message: 'Profil negasit.' });
    }

    await changeUserPassword(uid, profile.email, currentPassword, newPassword);
    return res.status(200).json({ message: 'Parola a fost schimbata cu succes.' });
  } catch (error: any) {
    const msg = String(error?.message || '').toLowerCase();

    if (msg.includes('incorecte') || msg.includes('invalid') || msg.includes('wrong')) {
      return res.status(400).json({ message: 'Parola curenta este incorecta.' });
    }

    return res.status(500).json({ message: 'Nu am putut schimba parola.' });
  }
}
