import AsyncStorage from '@react-native-async-storage/async-storage';
import { LovedOne } from '../types/lovedOnes';
import { BirthdayAlert } from '../types/priceAlerts';

const BIRTHDAY_READS_KEY = 'gift_app_birthday_reads';

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export async function generateBirthdayAlerts(lovedOnes: LovedOne[]): Promise<BirthdayAlert[]> {
  const today = new Date();
  const todayDay = today.getDate();
  const todayMonth = today.getMonth() + 1;
  const key = todayKey();

  const birthdayPeople = lovedOnes.filter(
    (p) => !p.isDeleted && p.day === todayDay && p.month === todayMonth
  );

  if (!birthdayPeople.length) return [];

  let reads: Record<string, string> = {};
  try {
    const stored = await AsyncStorage.getItem(BIRTHDAY_READS_KEY);
    if (stored) reads = JSON.parse(stored);
  } catch {}

  return birthdayPeople.map((person) => {
    const id = `birthday-${person.id}-${key}`;
    return {
      notificationKind: 'birthday' as const,
      id,
      type: 'birthday' as const,
      lovedOneId: person.id,
      lovedOneName: person.name,
      day: person.day,
      month: person.month,
      year: person.year,
      createdAt: today.toISOString(),
      readAt: reads[id] ?? null,
    };
  });
}

export async function markBirthdayAlertRead(id: string): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(BIRTHDAY_READS_KEY);
    const reads: Record<string, string> = stored ? JSON.parse(stored) : {};
    reads[id] = new Date().toISOString();
    await AsyncStorage.setItem(BIRTHDAY_READS_KEY, JSON.stringify(reads));
  } catch {}
}
