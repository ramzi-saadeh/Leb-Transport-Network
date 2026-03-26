import { Injectable } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';
import { Observable } from 'rxjs';

export type LocationPermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported';

@Injectable({ providedIn: 'root' })
export class GeolocationService {

  /**
   * Requests location permission via Capacitor (native dialog on Android/iOS,
   * browser dialog on web). Returns the resulting state.
   */
  async requestPermission(): Promise<LocationPermissionState> {
    try {
      const status = await Geolocation.checkPermissions();

      if (status.location === 'granted' || status.coarseLocation === 'granted') {
        return 'granted';
      }

      if (status.location === 'denied') {
        return 'denied';
      }

      // 'prompt' or 'prompt-with-rationale' — request it
      const result = await Geolocation.requestPermissions({ permissions: ['location'] });
      if (result.location === 'granted') return 'granted';
      if (result.location === 'denied') return 'denied';
      return 'prompt';
    } catch {
      return 'unsupported';
    }
  }

  async getCurrentPosition(): Promise<{ lat: number; lng: number }> {
    try {
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10_000,
        maximumAge: 60_000,
      });
      return { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch {
      // Fallback: try with low accuracy
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: false,
        timeout: 20_000,
        maximumAge: 60_000,
      });
      return { lat: pos.coords.latitude, lng: pos.coords.longitude };
    }
  }

  watchPosition(): Observable<{ lat: number; lng: number }> {
    return new Observable(observer => {
      let watchId: string | null = null;

      Geolocation.watchPosition(
        { enableHighAccuracy: true },
        (pos, err) => {
          if (err || !pos) {
            observer.error(err);
            return;
          }
          observer.next({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        }
      ).then(id => { watchId = id; });

      return () => {
        if (watchId) Geolocation.clearWatch({ id: watchId });
      };
    });
  }
}
