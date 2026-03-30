import { Injectable, inject } from '@angular/core';
import {
  Database,
  ref,
  set,
  update,
  onValue,
  query,
  orderByChild,
  equalTo,
  onDisconnect,
} from '@angular/fire/database';
import { BackgroundGeolocationPlugin, CallbackError, Location } from '@capacitor-community/background-geolocation';
import { Capacitor, registerPlugin } from '@capacitor/core';
const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');
import { Geolocation } from '@capacitor/geolocation';
import { Observable } from 'rxjs';
import { LiveDriverLocation, LiveDriverLocationWithId } from '../models/driver-location.model';

const STALE_MS = 60_000;

@Injectable({ providedIn: 'root' })
export class DriverLocationService {
  private readonly db = inject(Database);

  private watchId: string | null = null;
  private activeDriverId: string | null = null;

  /**
   * Start broadcasting GPS position — works in foreground AND background.
   * On native: uses BackgroundGeolocation (foreground service on Android,
   *             background mode on iOS).
   * On web: falls back to @capacitor/geolocation watchPosition.
   * Idempotent — safe to call multiple times.
   */
  startSharing(driverId: string, routeId: string): void {
    if (this.activeDriverId === driverId && this.watchId !== null) return;
    this.stopSharing();
    this.activeDriverId = driverId;

    const locationRef = ref(this.db, `driver_locations/${driverId}`);
    onDisconnect(locationRef).update({ isActive: false, updatedAt: Date.now() });

    // Use update() (merge) instead of set() so that isFull and other fields
    // written by setFull() are NOT overwritten on every GPS tick.
    const writePosition = (lat: number, lng: number, heading: number | null) => {
      update(locationRef, {
        lat, lng, routeId,
        heading: heading ?? 0,
        isActive: true,
        updatedAt: Date.now(),
      });
    };

    if (Capacitor.isNativePlatform()) {
      BackgroundGeolocation.addWatcher(
        {
          backgroundMessage: 'Lebanon Bus is tracking your location for passengers.',
          backgroundTitle: 'Lebanon Bus — On Duty',
          requestPermissions: true,
          stale: false,
          distanceFilter: 10,
        },
        (location: Location | undefined, error: CallbackError | undefined) => {
          if (error || !location) return;
          writePosition(location.latitude, location.longitude, location.bearing ?? null);
        }
      ).then((id: string) => { this.watchId = id; });
    } else {
      Geolocation.watchPosition(
        { enableHighAccuracy: true, timeout: 10_000, maximumAge: 5_000 },
        (pos, err) => {
          if (err || !pos) return;
          writePosition(pos.coords.latitude, pos.coords.longitude, pos.coords.heading);
        }
      ).then((id: string) => { this.watchId = id; });
    }
  }

  stopSharing(): void {
    if (this.watchId !== null) {
      if (Capacitor.isNativePlatform()) {
        BackgroundGeolocation.removeWatcher({ id: this.watchId });
      } else {
        Geolocation.clearWatch({ id: this.watchId });
      }
      this.watchId = null;
    }
    if (this.activeDriverId) {
      const locationRef = ref(this.db, `driver_locations/${this.activeDriverId}`);
      set(locationRef, { lat: 0, lng: 0, routeId: '', heading: 0, isActive: false, updatedAt: Date.now() });
      this.activeDriverId = null;
    }
  }

  /** Toggle isFull flag on the driver's live location node. */
  async setFull(driverId: string, isFull: boolean): Promise<void> {
    const locationRef = ref(this.db, `driver_locations/${driverId}`);
    // Also refresh updatedAt so the stale filter never hides the pin.
    await update(locationRef, { isFull, updatedAt: Date.now() });
  }

  /**
   * Real-time stream of all active, non-stale drivers on a given route.
   * Filtered server-side by routeId; stale / inactive ones dropped client-side.
   */
  getActiveDriversOnRoute(routeId: string): Observable<LiveDriverLocationWithId[]> {
    return new Observable((observer) => {
      const q = query(ref(this.db, 'driver_locations'), orderByChild('routeId'), equalTo(routeId));
      const unsubscribe = onValue(
        q,
        (snapshot) => {
          const drivers: LiveDriverLocationWithId[] = [];
          snapshot.forEach((child) => {
            const d = child.val() as LiveDriverLocation;
            if (d.isActive && Date.now() - d.updatedAt <= STALE_MS) {
              drivers.push({ id: child.key!, ...d });
            }
          });
          observer.next(drivers);
        },
        (err) => observer.error(err),
      );
      return () => unsubscribe();
    });
  }

  /** Real-time stream of a single driver's isFull flag, regardless of active state. */
  getDriverFullStatus(driverId: string): Observable<boolean> {
    return new Observable((observer) => {
      const fullRef = ref(this.db, `driver_locations/${driverId}/isFull`);
      const unsubscribe = onValue(fullRef, (snapshot) => {
        observer.next(snapshot.val() === true);
      });
      return () => unsubscribe();
    });
  }

  /** Real-time stream of a single driver's location (for passenger map view). */
  getDriverLocation(driverId: string): Observable<LiveDriverLocationWithId | null> {
    return new Observable((observer) => {
      const locationRef = ref(this.db, `driver_locations/${driverId}`);
      const unsubscribe = onValue(locationRef, (snapshot) => {
        const d = snapshot.val() as LiveDriverLocation | null;
        if (d && d.isActive && Date.now() - d.updatedAt <= STALE_MS) {
          observer.next({ id: driverId, ...d });
        } else {
          observer.next(null);
        }
      });
      return () => unsubscribe();
    });
  }
}
