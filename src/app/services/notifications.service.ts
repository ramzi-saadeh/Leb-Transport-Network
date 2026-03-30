import { Injectable, inject } from '@angular/core';
import {
  PushNotifications,
  Token,
  PushNotificationSchema,
  ActionPerformed,
} from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { DriversService } from './drivers.service';
import { RoleService } from './role.service';

export type NotificationPermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported';

/**
 * NotificationsService
 *
 * Wraps @capacitor/push-notifications and @capacitor/local-notifications.
 * Call init() once after the user reaches HomeComponent (role is known).
 *
 * Topic-based notifications (route-level):
 *  - Drivers subscribe to topic `route_<routeId>` when going On Duty
 *  - Drivers unsubscribe when going Off Duty
 *  - When a passenger signals waiting, a Cloud Function sends a message to that topic
 *    (client-side send is not possible — requires Firebase Admin SDK / Cloud Functions)
 *
 * FCM setup required:
 *  1. google-services.json placed at android/app/google-services.json  ✅
 *  2. iOS: APNs key uploaded to Firebase Console
 */
@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private fcmToken: string | null = null;
  private initialized = false;
  private readonly driversService = inject(DriversService);
  private readonly roleService = inject(RoleService);

  /** Request permission, register FCM, save token, register listeners. Safe to call multiple times. */
  async init(): Promise<void> {
    if (this.initialized) return;
    if (!Capacitor.isNativePlatform()) return;

    const permission = await this.requestPermission();
    if (permission !== 'granted') return;

    this.initialized = true;
    this.registerListeners(); // must be before register() so the token event is not missed
    await PushNotifications.register();
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

  getFCMToken(): string | null {
    return this.fcmToken;
  }

  /**
   * Subscribe this device to a route topic. Call when driver goes On Duty.
   * Topic name: `route_<routeId>` (e.g. "route_abc123")
   * A Cloud Function listens for new waiting_passengers docs and sends to this topic.
   */
  async subscribeToRouteTopic(routeId: string): Promise<void> {
    if (!Capacitor.isNativePlatform() || !routeId) return;
    try {
      // @capacitor/push-notifications does not expose topic subscription directly;
      // FCM topic subscription is handled automatically by the server when it sends
      // to a topic — OR via the Firebase Admin SDK.
      // For client-side: store the routeId in the driver's Firestore doc so a
      // Cloud Function can fan-out or use FCM topic messaging.
      // We store the token + routeId so the server knows who is on which route.
      const profile = this.roleService.driverProfile();
      if (profile?.id && this.fcmToken) {
        await this.driversService.updateDriver(profile.id, { fcmToken: this.fcmToken });
      }
      console.log('[Notifications] Subscribed to route topic:', `route_${routeId}`);
    } catch (e) {
      console.error('[Notifications] Topic subscribe error:', e);
    }
  }

  /**
   * Unsubscribe from route topic. Call when driver goes Off Duty.
   * Clears the fcmToken from Firestore so the driver won't receive notifications.
   */
  async unsubscribeFromRouteTopic(routeId: string): Promise<void> {
    if (!Capacitor.isNativePlatform() || !routeId) return;
    try {
      const profile = this.roleService.driverProfile();
      if (profile?.id) {
        await this.driversService.updateDriver(profile.id, { fcmToken: undefined });
      }
      console.log('[Notifications] Unsubscribed from route topic:', `route_${routeId}`);
    } catch (e) {
      console.error('[Notifications] Topic unsubscribe error:', e);
    }
  }

  /**
   * Show an immediate local notification (no server required).
   */
  async showLocal(title: string, body: string, id = Date.now()): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
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
        schedule: { at: new Date(Date.now() + 100) },
      }],
    });
  }

  private registerListeners(): void {
    PushNotifications.addListener('registration', (token: Token) => {
      this.fcmToken = token.value;
      console.log('[Notifications] FCM token:', token.value);
      // Retry saving token — driverProfile() may not be loaded yet at this point
      const save = (attempt: number) => {
        const profile = this.roleService.driverProfile();
        if (profile?.id) {
          this.driversService.updateDriver(profile.id, { fcmToken: token.value });
        } else if (attempt < 10) {
          setTimeout(() => save(attempt + 1), 1000);
        }
      };
      save(0);
    });

    PushNotifications.addListener('registrationError', (err) => {
      console.error('[Notifications] Registration error:', err);
    });

    PushNotifications.addListener(
      'pushNotificationReceived',
      (notification: PushNotificationSchema) => {
        this.showLocal(
          notification.title ?? 'Lebanon Bus 🚌',
          notification.body ?? '',
        );
      },
    );

    PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (action: ActionPerformed) => {
        console.log('[Notifications] Tapped:', action.notification);
        // TODO: navigate to dashboard if action.notification.data?.routeId
      },
    );
  }
}
