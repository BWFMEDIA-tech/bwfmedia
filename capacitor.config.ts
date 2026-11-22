import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.tunevio',
  appName: 'Tunevio',
  webDir: 'dist',
  server: {
    url: 'https://tunevio.com',
    cleartext: false,
  },
  ios: {
    contentInset: 'always',
  },
};

export default config;