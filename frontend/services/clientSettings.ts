import AsyncStorage from '@react-native-async-storage/async-storage';

export const CLIENT_SETTINGS_KEY = 'gift_app_client_settings';

export type ClientSettings = {
  notificationsEnabled: boolean;
  notifyBuyReminder: boolean;
  notifyOfferReminder: boolean;
  notifyPriceUp: boolean;
  notifyPriceDown: boolean;
  notifyBirthdays: boolean;
  buyReminderDays: string;
  offerReminderDays: string;
};

export const DEFAULT_SETTINGS: ClientSettings = {
  notificationsEnabled: true,
  notifyBuyReminder: true,
  notifyOfferReminder: true,
  notifyPriceUp: true,
  notifyPriceDown: true,
  notifyBirthdays: true,
  buyReminderDays: '7',
  offerReminderDays: '2',
};

export async function loadClientSettings(): Promise<ClientSettings> {
  try {
    const saved = await AsyncStorage.getItem(CLIENT_SETTINGS_KEY);
    if (!saved) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveClientSettings(settings: ClientSettings): Promise<void> {
  await AsyncStorage.setItem(CLIENT_SETTINGS_KEY, JSON.stringify(settings));
}
