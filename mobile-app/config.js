import Constants from 'expo-constants';

const getApiUrl = () => {
  // Caută IP-ul mașinii de dezvoltare (unde rulează Expo Go)
  const debuggerHost = Constants.expoConfig?.hostUri;
  
  if (debuggerHost) {
    const ip = debuggerHost.split(':')[0];
    return `http://${ip}:5000/api`;
  }

  // Fallback pentru simulator sau web
  return 'http://localhost:5000/api';
};

export const API_URL = getApiUrl();
