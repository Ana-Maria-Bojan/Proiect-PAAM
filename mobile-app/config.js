import Constants from 'expo-constants';
import { Platform } from 'react-native';

const DEFAULT_API_URL = 'http://localhost:5000/api';

const normalizeUrl = (url) => {
  if (!url) return url;
  return url.replace(/\/+$/, '');
};

const isTunnelHost = (host) => {
  const h = (host || '').toLowerCase();
  return h.endsWith('.exp.direct') || h.endsWith('.expo.dev');
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
  const override = normalizeUrl(process.env.EXPO_PUBLIC_API_URL);
  if (override) return override;

  const host = getExpoHost();

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
