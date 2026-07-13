import { Linking, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

export function openUrl(url: string): void {
  if (!url) return;
  try {
    const { protocol } = new URL(url);
    if (protocol !== 'https:' && protocol !== 'http:') return;
  } catch {
    return;
  }
  if (Platform.OS === 'web') {
    Linking.openURL(url).catch(() => {});
  } else {
    WebBrowser.openBrowserAsync(url).catch(() => {});
  }
}
