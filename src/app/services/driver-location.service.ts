import { Injectable, inject } from '@angular/core';
import {
  Database,
  ref,
  set,
  onValue,
  query,
  orderByChild,
  equalTo,
  onDisconnect,
} from '@angular/fire/database';
import { Observable } from 'rxjs';
import { LiveDriverLocation, LiveDriverLocationWithId } from '../models/driver-location.model';

const STALE_MS = 30_000; // hide drivers not updated in 30s

@Injectable({ providedIn: 'root' })
export class DriverLocationService {
  private readonly db = inject(Database);

  private watchId: number | null = null;
  private activeDriverId: string | null = null;

  /**
   * Start broadcasting this driver's GPS position via watchPosition.
   * Updates fire whenever the device reports a new position.
   * Idempotent — calling again with a new driverId stops the previous session.
   */
  startSharing(driverId: string, routeId: string): void {
    this.stopSharing();
    this.activeDriverId = driverId;

    if (!navigator.geolocation) return;

    const locationRef = ref(this.db, `driver_locations/${driverId}`);

    // Mark inactive automatically if the RTDB connection drops
    onDisconnect(locationRef).update({ isActive: false, updatedAt: Date.now() });

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const payload: LiveDriverLocation = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          routeId,
          heading: pos.coords.heading ?? 0,
          speed: pos.coords.speed ? pos.coords.speed * 3.6 : 0, // m/s → km/h
          isActive: true,
          updatedAt: Date.now(),
        };
        set(locationRef, payload);
      },
      () => {}, // silently ignore individual GPS errors
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 5_000 },
    );
  }

  /** Stop broadcasting — clears the GPS watch and marks driver inactive in RTDB. */
  stopSharing(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    if (this.activeDriverId) {
      const locationRef = ref(this.db, `driver_locations/${this.activeDriverId}`);
      set(locationRef, {
        lat: 0, lng: 0, routeId: '', heading: 0, speed: 0,
        isActive: false,
        updatedAt: Date.now(),
      });
      this.activeDriverId = null;
    }
  }

  /**
   * Real-time stream of all active, non-stale drivers on a given route.
   * Filtered server-side by routeId; stale / inactive ones dropped client-side.
   */
  getActiveDriversOnRoute(routeId: string): Observable<LiveDriverLocationWithId[]> {
    return new Observable((observer) => {
      const q = query(
        ref(this.db, 'driver_locations'),
        orderByChild('routeId'),
        equalTo(routeId),
      );
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
