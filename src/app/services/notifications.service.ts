import { Injectable } from '@angular/core';
import {
  PushNotifications,
  Token,
  PushNotificationSchema,
  ActionPerformed,
} from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export type NotificationPermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported';

/**
 * NotificationsService
 *
 * Wraps @capacitor/push-notifications and @capacitor/local-notifications.
 * Call init() once on app startup (e.g. after role is known).
 *
 * FCM setup required before push works:
 *  1. Download google-services.json from Firebase Console
 *  2. Place it at android/app/google-services.json
 *  3. In Firebase Console → Cloud Messaging → add your Android app package (com.bus.leb)
 *
 * Usage:
 *   - this.notificationsService.init()         // request permission & set up listeners
 *   - this.notificationsService.getFCMToken()  // get the device token to store server-side
 *   - this.notificationsService.showLocal(...)  // show an immediate local notification
 */
@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private fcmToken: string | null = null;
  private initialized = false;

  /** Request permission and register push listeners. Safe to call multiple times. */
  async init(): Promise<void> {
    if (this.initialized) return;
    if (!Capacitor.isNativePlatform()) return; // No-op on web/PWA

    const permission = await this.requestPermission();
    if (permission !== 'granted') return;

    this.initialized = true;
    await PushNotifications.register();
    this.registerListeners();
  }

  async requestPermission(): Promise<NotificationPermissionState> {
    if (!Capacitor.isNativePlatform()) return 'unsupported';
    try {
      const status = await PushNotifications.checkPermissions();
      if (status.receive === 'granted') return 'granted';
      if (status.receive === 'denied') return 'denied';
      const result = await PushNotifications.requestPermissions();
      return result.receive === 'granted' ? 'granted' : 'denied';
    } catch {
      return 'unsupported';
    }
  }

  /** Returns the FCM device token (set after init() resolves). */
  getFCMToken(): string | null {
    return this.fcmToken;
  }

  /**
   * Show an immediate local notification (no server required).
   * Useful for: "Your waiting signal has expired", "Driver nearby", etc.
   */
  async showLocal(title: string, body: string, id = Date.now()): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      // Fallback for web: use browser Notification API if permitted
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/icons/icon-192x192.png' });
      }
      return;
    }
    await LocalNotifications.schedule({
      notifications: [{
        id,
        title,
        body,
        smallIcon: 'ic_stat_icon_config_sample',
        iconColor: '#F5A623',
        schedule: { at: new Date(Date.now() + 100) }, // near-immediate
      }],
    });
  }

  private registerListeners(): void {
    // Device token received from FCM — store this in Firestore to target this device
    PushNotifications.addListener('registration', (token: Token) => {
      this.fcmToken = token.value;
      console.log('[Notifications] FCM token:', token.value);
      // TODO: save token to Firestore under the driver/passenger's document
      // e.g. driversService.updateDriver(profile.id, { fcmToken: token.value })
    });

    PushNotifications.addListener('registrationError', (err) => {
      console.error('[Notifications] Registration error:', err);
    });

    // Notification received while app is in foreground
    PushNotifications.addListener(
      'pushNotificationReceived',
      (notification: PushNotificationSchema) => {
        console.log('[Notifications] Foreground push:', notification);
        // Show as local notification so it's visible even in foreground
        this.showLocal(
          notification.title ?? 'Lebanon Bus',
          notification.body ?? '',
        );
      },
    );

    // User tapped a notification (app was in background/closed)
    PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (action: ActionPerformed) => {
        console.log('[Notifications] Notification tapped:', action.notification);
        // TODO: navigate to relevant page based on action.notification.data
        // e.g. if (action.notification.data?.routeId) router.navigate(['/routes', routeId])
      },
    );
  }
}
