import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bus.leb',
  appName: 'Lebanon Bus',
  webDir: 'dist/bus-leb/browser',
  plugins: {
    PushNotifications: {
      // presentationOptions controls how FCM notifications appear when app is in foreground
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#F5A623',
      sound: 'beep.wav',
    },
  },
};

export default config;
