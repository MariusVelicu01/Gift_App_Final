import crypto from 'crypto';
import { Request, Response } from 'express';
import {
  changeUserPassword,
  completeGoogleRegistration,
  getMyProfile,
  loginOrInitGoogleUser,
  loginWithFirebase,
  refreshFirebaseToken,
  registerUser,
  sendPasswordReset,
  updateUserName,
} from '../services/authService';
import { updateUserConsent } from '../services/userService';
import { db } from '../config/firebase';

// ─── Firestore-backed OAuth stores (survive restarts & scale-out) ────────────
const PKCE_COL = '_oauth_pkce';
const TEMP_COL = '_oauth_temp';
const OAUTH_TTL_MS = 10 * 60 * 1000;

interface PkceEntry { codeVerifier: string; redirectUri: string; expiresAt: number }
interface TempEntry { googleAccessToken: string; googleEmail: string; googleFirstName: string; googleLastName: string; expiresAt: number }

async function pkceSet(state: string, entry: PkceEntry) {
  await db.collection(PKCE_COL).doc(state).set(entry);
}
async function pkceGet(state: string): Promise<PkceEntry | null> {
  const doc = await db.collection(PKCE_COL).doc(state).get();
  return doc.exists ? (doc.data() as PkceEntry) : null;
}
async function pkceDelete(state: string) {
  await db.collection(PKCE_COL).doc(state).delete().catch(() => {});
}

async function tempSet(token: string, entry: TempEntry) {
  await db.collection(TEMP_COL).doc(token).set(entry);
}
async function tempGet(token: string): Promise<TempEntry | null> {
  const doc = await db.collection(TEMP_COL).doc(token).get();
  return doc.exists ? (doc.data() as TempEntry) : null;
}
async function tempDelete(token: string) {
  await db.collection(TEMP_COL).doc(token).delete().catch(() => {});
}

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

    if (role !== 'client') {
      return res.status(400).json({ message: 'Rol invalid.' });
    }

    if (!['male', 'female', 'unknown'].includes(gender)) {
      return res.status(400).json({ message: 'Gen invalid.' });
    }

    const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
    if (!PASSWORD_RE.test(String(password))) {
      return res.status(400).json({
        message: 'Parola trebuie să conțină minim 8 caractere, o literă mare, o literă mică, o cifră și un caracter special.',
      });
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

    const { consent } = req.body;
    if (!consent || consent.privacyAndTerms !== true) {
      return res.status(400).json({ message: 'Trebuie să accepți Politica de confidențialitate și Termenii și condițiile.' });
    }
    const consentPayload = {
      privacyAndTerms: true as const,
      giftBot: consent.giftBot === true,
      marketing: consent.marketing === true,
      consentVersion: '1.0',
      consentTimestamp: new Date().toISOString(),
    };

    const user = await registerUser({
      firstName,
      lastName,
      birthDate,
      gender,
      email,
      password,
      role,
      consent: consentPayload,
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

export async function refreshToken(req: Request, res: Response) {
  try {
    const { refreshToken: rt } = req.body;

    if (!rt || typeof rt !== 'string') {
      return res.status(400).json({ message: 'Refresh token lipsă.' });
    }

    const result = await refreshFirebaseToken(rt);

    return res.status(200).json({
      token: result.idToken,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
    });
  } catch {
    return res.status(401).json({ message: 'Sesiunea a expirat. Autentifică-te din nou.' });
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

    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !EMAIL_RE.test(String(email))) {
      return res.status(400).json({ message: 'Adresa de email este invalidă.' });
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

export async function googleOAuthStart(req: Request, res: Response) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const backendUrl = process.env.BACKEND_URL;
  if (!clientId || !backendUrl) {
    return res.status(500).send('Google OAuth not configured.');
  }

  const redirectUri = String(req.query.redirectUri || '');
  if (!redirectUri.startsWith('frontend://') && !redirectUri.startsWith('exp://')) {
    return res.status(400).send('Invalid redirect URI.');
  }

  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  const state = crypto.randomBytes(16).toString('hex');

  await pkceSet(state, { codeVerifier, redirectUri, expiresAt: Date.now() + OAUTH_TTL_MS });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${backendUrl}/api/auth/google/oauth-callback`,
    response_type: 'code',
    scope: 'openid email profile',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
    access_type: 'online',
    prompt: 'select_account',
  });

  return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}

export async function googleOAuthCallback(req: Request, res: Response) {
  const { code, state, error } = req.query as Record<string, string>;

  const pkce = state ? await pkceGet(state) : null;
  const redirectUri = pkce?.redirectUri || 'frontend://google-auth';
  const fail = (msg: string) =>
    res.redirect(`${redirectUri}?error=${encodeURIComponent(msg)}`);

  if (error || !code || !state || !pkce) {
    if (state) await pkceDelete(state);
    return fail('cancelled');
  }
  if (pkce.expiresAt < Date.now()) {
    await pkceDelete(state);
    return fail('expired');
  }
  await pkceDelete(state);

  try {
    const backendUrl = process.env.BACKEND_URL!;
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        code,
        code_verifier: pkce.codeVerifier,
        grant_type: 'authorization_code',
        redirect_uri: `${backendUrl}/api/auth/google/oauth-callback`,
      }),
    });

    const tokenData = (await tokenRes.json()) as any;
    if (!tokenData.access_token) return fail('token_failed');

    const result = await loginOrInitGoogleUser(tokenData.access_token);

    if (!result.isNewUser) {
      const p = new URLSearchParams({
        token: result.idToken,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn,
      });
      return res.redirect(`${redirectUri}?${p}`);
    }

    const tempToken = crypto.randomBytes(16).toString('hex');
    // Store PII in Firestore — NOT in the redirect URL (M-4)
    await tempSet(tempToken, {
      googleAccessToken: tokenData.access_token,
      googleEmail: result.googleEmail,
      googleFirstName: result.googleFirstName,
      googleLastName: result.googleLastName,
      expiresAt: Date.now() + OAUTH_TTL_MS,
    });

    const p = new URLSearchParams({ needsProfile: 'true', tempToken });
    return res.redirect(`${redirectUri}?${p}`);
  } catch {
    return fail('server_error');
  }
}

// Returns name/email hint without consuming the temp token (used to pre-fill the profile form)
export async function googleProfileHint(req: Request, res: Response) {
  const { tempToken } = req.query as Record<string, string>;
  if (!tempToken) return res.status(400).json({ message: 'Token lipsă.' });
  const stored = await tempGet(tempToken);
  if (!stored || stored.expiresAt < Date.now()) {
    return res.status(404).json({ message: 'Sesiune expirată.' });
  }
  return res.status(200).json({
    googleEmail: stored.googleEmail,
    googleFirstName: stored.googleFirstName,
    googleLastName: stored.googleLastName,
  });
}

export async function googleCompleteWithTempToken(req: Request, res: Response) {
  try {
    const { tempToken, firstName, lastName, birthDate, gender, consent } = req.body;

    if (!tempToken || typeof tempToken !== 'string') {
      return res.status(400).json({ message: 'Token temporar lipsă.' });
    }

    if (!consent || consent.privacyAndTerms !== true) {
      return res.status(400).json({ message: 'Trebuie să accepți Politica de confidențialitate și Termenii și condițiile.' });
    }
    const consentPayload = {
      privacyAndTerms: true as const,
      giftBot: consent.giftBot === true,
      marketing: consent.marketing === true,
      consentVersion: '1.0',
      consentTimestamp: new Date().toISOString(),
    };

    const stored = await tempGet(tempToken);
    if (!stored || stored.expiresAt < Date.now()) {
      await tempDelete(tempToken);
      return res.status(400).json({ message: 'Sesiunea a expirat. Încearcă din nou cu Google.' });
    }
    await tempDelete(tempToken);

    if (!String(firstName || '').trim() || !String(lastName || '').trim()) {
      return res.status(400).json({ message: 'Numele și prenumele sunt obligatorii.' });
    }
    const age = calculateAge(birthDate);
    if (!birthDate || age === null || age < 16) {
      return res.status(400).json({ message: 'Data nașterii invalidă. Trebuie să ai cel puțin 16 ani.' });
    }
    if (!gender || !['male', 'female', 'unknown'].includes(gender)) {
      return res.status(400).json({ message: 'Genul este obligatoriu.' });
    }

    const tokens = await completeGoogleRegistration(
      stored.googleAccessToken,
      String(firstName).trim(),
      String(lastName).trim(),
      birthDate,
      gender,
      consentPayload
    );
    return res.status(200).json({ token: tokens.idToken, refreshToken: tokens.refreshToken, expiresIn: tokens.expiresIn });
  } catch (error: any) {
    const msg = String(error?.message || '');
    if (msg.includes('already-exists') || msg.includes('deja')) {
      return res.status(409).json({ message: 'Există deja un cont cu acest email.' });
    }
    return res.status(500).json({ message: 'Nu am putut crea contul Google.' });
  }
}

export async function updateConsent(req: Request, res: Response) {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ message: 'Unauthorized.' });

    const { giftBot, marketing } = req.body;
    if (typeof giftBot !== 'boolean' || typeof marketing !== 'boolean') {
      return res.status(400).json({ message: 'Valorile de consimțământ sunt invalide.' });
    }

    const profile = await updateUserConsent(uid, { giftBot, marketing });
    return res.status(200).json(profile);
  } catch {
    return res.status(500).json({ message: 'Nu am putut actualiza consimțămintele.' });
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
