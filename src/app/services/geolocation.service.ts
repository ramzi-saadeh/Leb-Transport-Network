import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export type LocationPermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported';

@Injectable({ providedIn: 'root' })
export class GeolocationService {

  /**
   * Checks the current permission state and, if it hasn't been decided yet,
   * triggers the native browser dialog. Returns the resulting state.
   */
  async requestPermission(): Promise<LocationPermissionState> {
    if (!navigator.geolocation) return 'unsupported';

    // Use Permissions API if available to check state first
    if (navigator.permissions) {
      const status = await navigator.permissions.query({ name: 'geolocation' });
      if (status.state === 'granted') return 'granted';
      if (status.state === 'denied') return 'denied';
    }

    // State is 'prompt' (or Permissions API unavailable) — trigger the dialog
    return new Promise<LocationPermissionState>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => resolve('granted'),
        (err) => resolve(err.code === 1 ? 'denied' : 'prompt'),
        { enableHighAccuracy: false, timeout: 15_000, maximumAge: 60_000 },
      );
    });
  }

  getCurrentPosition(): Promise<{ lat: number; lng: number }> {
    return this.tryGetPosition(true).catch(() => this.tryGetPosition(false));
  }

  private tryGetPosition(highAccuracy: boolean): Promise<{ lat: number; lng: number }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        err => reject(err),
        { enableHighAccuracy: highAccuracy, timeout: highAccuracy ? 10000 : 20000, maximumAge: 60000 }
      );
    });
  }

  watchPosition(): Observable<{ lat: number; lng: number }> {
    return new Observable(observer => {
      if (!navigator.geolocation) {
        observer.error('Geolocation not supported');
        return;
      }
      const id = navigator.geolocation.watchPosition(
        pos => observer.next({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        err => observer.error(err),
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(id);
    });
  }
}
