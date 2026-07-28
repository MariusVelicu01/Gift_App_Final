import { Platform } from 'react-native';
import { API_BASE_URL } from './config';

export type UploadPurpose = 'loved-one' | 'purchase-proof';

export type UploadImageResult = {
  imageUrl: string;
  // Only present for purpose: 'loved-one' — the private storage key to persist instead
  // of imageUrl (which is a short-lived signed URL, resolved fresh on every read).
  imagePath?: string;
};

export async function uploadImageApi(
  params: {
    uri: string;
    file?: File | null;
  },
  token: string,
  purpose: UploadPurpose
): Promise<UploadImageResult> {
  const formData = new FormData();

  if (Platform.OS === 'web') {
    if (!params.file) {
      throw new Error('Fișierul imaginii nu a fost găsit pentru web.');
    }

    formData.append('image', params.file);
  } else {
    formData.append('image', {
      uri: params.uri,
      name: 'photo.jpg',
      type: 'image/jpeg',
    } as any);
  }

  formData.append('purpose', purpose);

  const response = await fetch(`${API_BASE_URL}/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || 'Upload failed');
  }

  return data;
}
