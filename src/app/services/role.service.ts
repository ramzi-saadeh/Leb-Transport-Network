import { Injectable, signal, computed } from '@angular/core';

export type UserRole = 'passenger' | 'driver' | null;
// ... (rest of imports/types)

export interface DriverProfile {
  id: string; // Firestore document ID
  name: string;
  phone: string;
  plateNumber: string;
  routeId: string;
  vehicleType?: string;
}

export interface PassengerProfile {
  name: string;
  defaultRouteId: string;
}

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  private readonly ROLE_KEY = 'user_role';
  private readonly REG_DRIVER_KEY = 'is_registered_driver';
  private readonly REG_ROUTE_KEY = 'driver_route_id';
  private readonly REG_PROFILE_KEY = 'driver_profile';
  private readonly PASSENGER_PROFILE_KEY = 'passenger_profile';

  private roleSignal = signal<UserRole>(this.getInitialRole());
  private isRegisteredSignal = signal<boolean>(this.getInitialRegistration());
  private driverRouteIdSignal = signal<string | null>(this.getInitialRouteId());
  private driverProfileSignal = signal<DriverProfile | null>(this.getInitialProfile());
  private passengerProfileSignal = signal<PassengerProfile | null>(this.getInitialPassengerProfile());

  readonly role = this.roleSignal.asReadonly();
  readonly isRegistered = this.isRegisteredSignal.asReadonly();
  readonly driverRouteId = this.driverRouteIdSignal.asReadonly();
  readonly driverProfile = this.driverProfileSignal.asReadonly();
  readonly passengerProfile = this.passengerProfileSignal.asReadonly();

  constructor() {}

  private getInitialRole(): UserRole {
    const saved = localStorage.getItem(this.ROLE_KEY);
    return (saved as UserRole) || null;
  }

  private getInitialRegistration(): boolean {
    return localStorage.getItem(this.REG_DRIVER_KEY) === 'true';
  }

  private getInitialRouteId(): string | null {
    return localStorage.getItem(this.REG_ROUTE_KEY);
  }

  private getInitialProfile(): DriverProfile | null {
    const saved = localStorage.getItem(this.REG_PROFILE_KEY);
    return saved ? JSON.parse(saved) : null;
  }

  private getInitialPassengerProfile(): PassengerProfile | null {
    const saved = localStorage.getItem(this.PASSENGER_PROFILE_KEY);
    return saved ? JSON.parse(saved) : null;
  }

  setRole(role: UserRole) {
    if (role) {
      localStorage.setItem(this.ROLE_KEY, role);
    } else {
      localStorage.removeItem(this.ROLE_KEY);
    }
    this.roleSignal.set(role);
  }

  setRegistered(status: boolean, profile?: DriverProfile) {
    if (status && profile) {
      localStorage.setItem(this.REG_DRIVER_KEY, 'true');
      localStorage.setItem(this.REG_ROUTE_KEY, profile.routeId);
      localStorage.setItem(this.REG_PROFILE_KEY, JSON.stringify(profile));
      this.driverRouteIdSignal.set(profile.routeId);
      this.driverProfileSignal.set(profile);
    } else {
      localStorage.removeItem(this.REG_DRIVER_KEY);
      localStorage.removeItem(this.REG_ROUTE_KEY);
      localStorage.removeItem(this.REG_PROFILE_KEY);
      this.driverRouteIdSignal.set(null);
      this.driverProfileSignal.set(null);
    }
    this.isRegisteredSignal.set(status);
  }

  updateProfile(profile: DriverProfile) {
    localStorage.setItem(this.REG_ROUTE_KEY, profile.routeId);
    localStorage.setItem(this.REG_PROFILE_KEY, JSON.stringify(profile));
    this.driverRouteIdSignal.set(profile.routeId);
    this.driverProfileSignal.set(profile);
  }

  updatePassengerProfile(profile: PassengerProfile) {
    localStorage.setItem(this.PASSENGER_PROFILE_KEY, JSON.stringify(profile));
    this.passengerProfileSignal.set(profile);
  }

  readonly isPassenger = computed(() => this.role() === 'passenger');
  readonly isDriver = computed(() => this.role() === 'driver');
  readonly hasRole = computed(() => this.role() !== null);
}
