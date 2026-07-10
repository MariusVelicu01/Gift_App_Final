import { randomUUID } from 'crypto';
import { bucket } from '../config/firebase';

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export async function uploadImageToStorage(
  file: Express.Multer.File,
  uid: string
): Promise<string> {
  const ext = MIME_TO_EXT[file.mimetype] ?? 'jpg';
  const fileName = `loved-ones/${uid}/${randomUUID()}.${ext}`;

  const fileUpload = bucket.file(fileName);

  await fileUpload.save(file.buffer, {
    metadata: {
      contentType: file.mimetype,
    },
  });

  await fileUpload.makePublic();

  return `https://storage.googleapis.com/${bucket.name}/${fileName}`;
}
