import Constants from 'expo-constants';
import { Platform } from 'react-native';

const DEFAULT_API_URL = 'https://proiect-paam.onrender.com/api';
const ANDROID_EMULATOR_API_URL = 'https://proiect-paam.onrender.com/api';

const normalizeUrl = (url) => {
  if (!url) return url;
  return url.replace(/\/+$/, '');
};

const isTunnelHost = (host) => {
  const h = (host || '').toLowerCase();
  return h.endsWith('.exp.direct') || h.endsWith('.expo.dev');
};

const sanitizeApiOverride = (raw) => {
  const normalized = normalizeUrl(raw);
  if (!normalized) return null;

  // Accept values like "10.0.2.2:5000/api" (missing scheme)
  const withScheme = /^https?:\/\//i.test(normalized) ? normalized : `http://${normalized}`;

  try {
    const url = new URL(withScheme);

    // Guardrail: Expo/Metro dev server commonly runs on 8081.
    if (url.port === '8081') return null;

    // Ensure we're pointing at the backend base path.
    const path = (url.pathname || '/').replace(/\/+$/, '');
    if (!path || path === '/') {
      url.pathname = '/api';
    } else if (!path.includes('/api')) {
      // If user accidentally sets a non-API path (e.g. /events), force /api.
      url.pathname = '/api';
    } else {
      url.pathname = path;
    }

    return normalizeUrl(`${url.origin}${url.pathname}`);
  } catch {
    // If it's not a valid URL, ignore override to avoid hard-to-debug failures.
    return null;
  }
};

const getExpoHost = () => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    // older/alternative fields
    Constants.expoConfig?.debuggerHost ||
    Constants.manifest2?.extra?.expoClient?.hostUri ||
    Constants.manifest?.debuggerHost;

  if (!hostUri) return null;
  return hostUri.split(':')[0];
};

const getApiUrl = () => {
  // Optional override (useful when running Expo in tunnel mode)
  const override = sanitizeApiOverride(process.env.EXPO_PUBLIC_API_URL);
  if (override) return override;

  const host = getExpoHost();

  // Android emulator cannot reach your PC via localhost.
  if (Platform.OS === 'android') {
    if (!host || host === 'localhost' || host === '127.0.0.1') {
      return ANDROID_EMULATOR_API_URL;
    }
    if (isTunnelHost(host)) {
      // In tunnel mode Expo host is not your LAN IP; require EXPO_PUBLIC_API_URL.
      return ANDROID_EMULATOR_API_URL;
    }
    return `http://${host}:5000/api`;
  }

  // On web, localhost is correct.
  if (Platform.OS === 'web') {
    return host && !isTunnelHost(host) ? `http://${host}:5000/api` : DEFAULT_API_URL;
  }

  // On physical devices, Expo tunnel host (exp.direct) is NOT your backend host.
  if (!host || host === 'localhost' || host === '127.0.0.1' || isTunnelHost(host)) {
    return DEFAULT_API_URL;
  }

  return `http://${host}:5000/api`;
};

export const API_URL = normalizeUrl(getApiUrl());
