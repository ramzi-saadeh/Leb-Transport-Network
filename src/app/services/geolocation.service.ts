import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class GeolocationService {

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
