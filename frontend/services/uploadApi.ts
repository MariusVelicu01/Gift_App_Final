import { Platform } from 'react-native';
import { API_BASE_URL } from './config';

export async function uploadImageApi(
  params: {
    uri: string;
    file?: File | null;
  },
  token: string
) {
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

  return data.imageUrl;
}
