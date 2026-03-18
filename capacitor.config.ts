import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.audiomorphic.ar',
  appName: 'Audiomorphic VR',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
