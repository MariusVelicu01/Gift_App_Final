import { randomUUID } from 'crypto';
import { bucket } from '../config/firebase';

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export type UploadPurpose = 'loved-one' | 'purchase-proof';

// Loved-one photos can show real people (potentially minors), so they're stored privately
// and only ever exposed through a freshly-signed, short-lived URL resolved for the owner.
// Purchase-proof photos (receipts/products attached when marking a gift as bought) are lower
// sensitivity and keep the previous public-URL behavior for simplicity.
const LOVED_ONE_SIGNED_URL_TTL_MS = 24 * 60 * 60 * 1000;

export async function uploadImageToStorage(
  file: Express.Multer.File,
  uid: string,
  purpose: UploadPurpose
): Promise<{ imageUrl: string; imagePath?: string }> {
  const ext = MIME_TO_EXT[file.mimetype] ?? 'jpg';

  if (purpose === 'loved-one') {
    const imagePath = `loved-ones/${uid}/${randomUUID()}.${ext}`;
    await bucket.file(imagePath).save(file.buffer, {
      metadata: { contentType: file.mimetype },
    });
    const imageUrl = await signLovedOneImage(imagePath);
    return { imageUrl, imagePath };
  }

  const fileName = `purchase-proofs/${uid}/${randomUUID()}.${ext}`;
  const fileUpload = bucket.file(fileName);

  await fileUpload.save(file.buffer, {
    metadata: { contentType: file.mimetype },
  });
  await fileUpload.makePublic();

  return { imageUrl: `https://storage.googleapis.com/${bucket.name}/${fileName}` };
}

// Every read of a loved-one's data re-signs its photo URL. Without caching, the URL's
// query-string signature differs on every single call, so the client's image cache (keyed
// by URL) never hits — every screen open/app restart re-downloads every photo from GCS.
// Caching the signed URL for a while under its own expiry keeps the URL stable, so repeat
// views within the window are served from the device's local image cache instead.
const SIGNED_URL_CACHE_TTL_MS = 23 * 60 * 60 * 1000;
const SIGNED_URL_CACHE_MAX = 2000;
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

export async function signLovedOneImage(
  imagePath: string,
  ttlMs = LOVED_ONE_SIGNED_URL_TTL_MS
): Promise<string> {
  const cached = signedUrlCache.get(imagePath);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url;
  }

  const [url] = await bucket.file(imagePath).getSignedUrl({
    action: 'read',
    expires: Date.now() + ttlMs,
  });

  // Evict oldest entry when at capacity (Map preserves insertion order)
  if (signedUrlCache.size >= SIGNED_URL_CACHE_MAX && !signedUrlCache.has(imagePath)) {
    const firstKey = signedUrlCache.keys().next().value;
    if (firstKey) signedUrlCache.delete(firstKey);
  }
  signedUrlCache.set(imagePath, { url, expiresAt: Date.now() + SIGNED_URL_CACHE_TTL_MS });
  return url;
}
