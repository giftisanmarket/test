import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.giftisan.app',
  appName: 'Giftisan',
  webDir: 'public',
  server: {
    // In production, Capacitor loads directly from your live Next.js domain
    // During local development, you can change this to your LAN IP (e.g., http://192.168.1.X:3000)
    url: process.env.CAPACITOR_SERVER_URL || 'https://www.giftisan.com',
    cleartext: true,
    androidScheme: 'https',
    allowNavigation: [
      'giftisan.com',
      '*.giftisan.com',
      'www.giftisan.com',
      '*.paymob.com',
      '*.bosta.co',
      '*.cloudinary.com',
      'res.cloudinary.com',
      'accounts.google.com',
      '*.google.com',
    ],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1800,
      launchAutoHide: true,
      backgroundColor: '#064E3B', // Giftisan brand primary forest green
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    StatusBar: {
      overlaysWebView: false,
      backgroundColor: '#064E3B', // Giftisan brand primary forest green
      style: 'DARK', // White text on dark green bar
    },
  },
};

export default config;
