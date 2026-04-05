export type LovedOne = {
  id: string;
  name: string;
  day: number;
  month: number;
  year?: number;
  estimatedAgeRange?: string;
  gender: 'male' | 'female' | 'unknown';
  notes?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt?: string;
};