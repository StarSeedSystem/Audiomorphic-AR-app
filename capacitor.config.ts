import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.audiomorphic.app',
  appName: 'Audiomorphic AR',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
    hostname: 'audiomorphic.app'
  },
  plugins: {
    GoogleAuth: {
      scopes: ["profile", "email"],
      serverClientId: "698477112390-qhjvdfvrtnm3n7m3n7m3n7m3n7m3n.apps.googleusercontent.com",
      forceCodeForRefreshToken: false
    }
  }
};

export default config;
