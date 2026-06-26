import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.tunevio',
  appName: 'Tunevio',
  webDir: 'dist',
  server: {
    url: 'https://27e4a45a-5178-4d5c-983d-86a01b3c0985.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  ios: {
    contentInset: 'always',
  },
};

export default config;