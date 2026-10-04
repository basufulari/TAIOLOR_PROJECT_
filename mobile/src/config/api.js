import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Auto-pick backend URL:
 * - Physical phone (Expo Go): same WiFi IP as Metro (from debuggerHost)
 * - Android emulator: 10.0.2.2
 * - iOS simulator / web: localhost
 */
export function getApiUrl() {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  const fromExtra = Constants.expoConfig?.extra?.apiUrl;
  if (fromExtra && !fromExtra.includes('10.0.2.2')) {
    return fromExtra.replace(/\/$/, '');
  }

  // Expo / RN fields differ across SDKs (and between dev client / Expo Go).
  // We try several known locations to get the Metro host IP.
  const debuggerHost =
    Constants.expoConfig?.hostUri?.split(':')[0] ||
    Constants.expoGoConfig?.debuggerHost?.split(':')[0] ||
    Constants.manifest?.debuggerHost?.split(':')[0] ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost?.split(':')[0] ||
    Constants.manifest2?.extra?.expoClient?.hostUri?.split(':')[0];

  if (debuggerHost) {
    const host = debuggerHost.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:5000`;
    }
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000';
  }

  return 'http://localhost:5000';
}

export const API_URL = getApiUrl();

export const mediaUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;
};
