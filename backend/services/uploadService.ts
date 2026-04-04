import { bucket } from '../config/firebase';

export async function uploadImageToStorage(
  file: Express.Multer.File,
  uid: string
) {
  const fileName = `loved-ones/${uid}/${Date.now()}-${file.originalname}`;

  const fileUpload = bucket.file(fileName);

  await fileUpload.save(file.buffer, {
    metadata: {
      contentType: file.mimetype,
    },
  });

  await fileUpload.makePublic();

  return `https://storage.googleapis.com/${bucket.name}/${fileName}`;
}