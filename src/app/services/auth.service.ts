import { Injectable, signal } from '@angular/core';
import { Observable, of, BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly DEVICE_ID_KEY = 'app_device_id';
  
  private _user = new BehaviorSubject<any>(null); // Dummy user for compatibility
  user$ = this._user.asObservable();

  deviceId = signal<string>(this.getOrCreateDeviceId());

  constructor() {
    // Simulate a signed-in user for systems that depend on user$
    this._user.next({ uid: this.deviceId(), isAnonymous: true } as any);
  }

  private getOrCreateDeviceId(): string {
    let id = localStorage.getItem(this.DEVICE_ID_KEY);
    if (!id) {
      id = 'dev_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem(this.DEVICE_ID_KEY, id);
    }
    return id;
  }

  get currentUser(): any {
    return { uid: this.deviceId(), isAnonymous: true };
  }

  get currentDeviceId(): string {
    return this.deviceId();
  }

  logout(): Promise<void> {
    localStorage.removeItem(this.DEVICE_ID_KEY);
    this.deviceId.set(this.getOrCreateDeviceId());
    return Promise.resolve();
  }
}
