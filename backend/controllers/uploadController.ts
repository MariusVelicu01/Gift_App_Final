import { Request, Response } from 'express';
import { uploadImageToStorage } from '../services/uploadService';

type MagicCheck = (b: Buffer) => boolean;
const MAGIC_CHECKS: Record<string, MagicCheck> = {
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  'image/gif': (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38,
  'image/webp': (b) =>
    b.length >= 12 &&
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && // RIFF
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50, // WEBP
};

function hasMagicBytes(buffer: Buffer, mimeType: string): boolean {
  const check = MAGIC_CHECKS[mimeType];
  return !!check && buffer.length >= 12 && check(buffer);
}

export async function uploadImage(req: Request, res: Response) {
  try {
    const uid = req.user?.uid;

    if (!uid) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    if (!hasMagicBytes(file.buffer, file.mimetype)) {
      return res.status(400).json({ message: 'Fișierul nu este o imagine validă.' });
    }

    const imageUrl = await uploadImageToStorage(file, uid);

    return res.status(200).json({ imageUrl });
  } catch (error: any) {
    if (error?.message?.includes('neacceptat')) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Upload failed' });
  }
}

