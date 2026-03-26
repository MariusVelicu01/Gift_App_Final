import { Request, Response } from 'express';
import {
  getMyProfile,
  loginWithFirebase,
  registerUser,
  sendPasswordReset,
} from '../services/authService';

export async function register(req: Request, res: Response) {
  try {
    const { firstName, lastName, email, password, role } = req.body;

    if (!firstName || !lastName || !email || !password || !role) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    if (!['client', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role.' });
    }

    const user = await registerUser({
      firstName,
      lastName,
      email,
      password,
      role,
    });

    return res.status(201).json({
      message: 'User registered successfully.',
      user,
    });
  } catch (error: any) {
    return res.status(500).json({
      message: error?.message || 'Failed to register user.',
    });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const loginResult = await loginWithFirebase(email, password);

    return res.status(200).json({
      message: 'Login successful.',
      token: loginResult.idToken,
      refreshToken: loginResult.refreshToken,
      expiresIn: loginResult.expiresIn,
      uid: loginResult.localId,
      email: loginResult.email,
    });
  } catch (error: any) {
    return res.status(401).json({
      message: error?.message || 'Login failed.',
    });
  }
}

export async function forgotPassword(req: Request, res: Response) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const result = await sendPasswordReset(email);

    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(400).json({
      message: error?.message || 'Failed to send password reset email.',
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
  } catch (error: any) {
    return res.status(500).json({
      message: error?.message || 'Failed to get profile.',
    });
  }
}