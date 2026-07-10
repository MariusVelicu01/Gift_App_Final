import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

let SecureStore: typeof import('expo-secure-store') | null = null;

if (Platform.OS !== 'web') {
  SecureStore = require('expo-secure-store');
}

export async function secureGet(key: string): Promise<string | null> {
  if (SecureStore) {
    return SecureStore.getItemAsync(key);
  }
  return AsyncStorage.getItem(key);
}

export async function secureSet(key: string, value: string): Promise<void> {
  if (SecureStore) {
    await SecureStore.setItemAsync(key, value);
    return;
  }
  await AsyncStorage.setItem(key, value);
}

export async function secureDelete(key: string): Promise<void> {
  if (SecureStore) {
    await SecureStore.deleteItemAsync(key);
    return;
  }
  await AsyncStorage.removeItem(key);
}

export async function secureMultiGet(keys: string[]): Promise<Array<[string, string | null]>> {
  if (SecureStore) {
    const pairs = await Promise.all(
      keys.map(async (key) => [key, await SecureStore!.getItemAsync(key)] as [string, string | null])
    );
    return pairs;
  }
  const result = await AsyncStorage.multiGet(keys);
  return result.map(([k, v]) => [k, v] as [string, string | null]);
}

export async function secureMultiSet(pairs: Array<[string, string]>): Promise<void> {
  if (SecureStore) {
    await Promise.all(pairs.map(([key, value]) => SecureStore!.setItemAsync(key, value)));
    return;
  }
  await AsyncStorage.multiSet(pairs);
}

export async function secureMultiDelete(keys: string[]): Promise<void> {
  if (SecureStore) {
    await Promise.all(keys.map((key) => SecureStore!.deleteItemAsync(key)));
    return;
  }
  await AsyncStorage.multiRemove(keys);
}
