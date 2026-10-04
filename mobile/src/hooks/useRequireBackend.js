import { Alert } from 'react-native';
import { API_URL } from '../config/api';

export function useRequireBackend() {
  // Cache health checks so we don't spam the server / UI.
  let lastCheckAt = 0;
  let lastOk = null;

  const checkHealth = async () => {
    const now = Date.now();
    if (now - lastCheckAt < 8000 && lastOk !== null) return lastOk;
    lastCheckAt = now;

    try {
      const res = await fetch(`${API_URL}/health`, { method: 'GET' });
      lastOk = res.ok;
      return lastOk;
    } catch {
      lastOk = false;
      return false;
    }
  };

  const requireBackend = (hint) => {
    Alert.alert(
      'Server required',
      `${hint ? `${hint}\n\n` : ''}Start backend:\ncd backend && npm start\n\nBackend URL:\n${API_URL}`
    );
    return false;
  };

  const guard = async () => {
    const ok = await checkHealth();
    if (!ok) return requireBackend('Cannot reach backend from your phone/emulator.');
    return true;
  };

  return { guard, requireBackend };
}
