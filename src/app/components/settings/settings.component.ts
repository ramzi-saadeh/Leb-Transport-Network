import { Component, inject, signal, computed, Signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { RoleService } from '../../services/role.service';
import { LanguageService } from '../../services/language.service';
import { ThemeService } from '../../services/theme.service';
import { DriversService } from '../../services/drivers.service';
import { RoutesService } from '../../services/routes.service';
import { Route } from '../../models/route.model';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslateModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css',
})
export class SettingsComponent implements OnDestroy {
  readonly currentLang = computed(() => this.langService.currentLang());
  readonly currentTheme = computed(() => this.themeService.currentTheme());
  readonly isPassenger = computed(() => this.roleService.isPassenger());
  readonly isDriver = computed(() => this.roleService.isDriver());
  readonly isRegistered = computed(() => this.roleService.isRegistered());
  readonly routes: Signal<Route[]>;

  // Passenger Form Signals
  readonly passengerName = signal('');
  readonly passengerRouteId = signal('');
  readonly isSubmittingPassenger = signal(false);
  readonly passengerSuccessMsg = signal('');
  readonly passengerErrorMsg = signal('');

  // Driver Form Signals
  readonly name = signal('');
  readonly phone = signal('');
  readonly plateNumber = signal('');
  readonly routeId = signal('');
  readonly vehicleType = signal<'bus' | 'minibus' | 'van' | 'car'>('bus');
  readonly isSubmitting = signal(false);
  readonly successMsg = signal('');
  readonly errorMsg = signal('');

  private readonly langService = inject(LanguageService);
  private readonly themeService = inject(ThemeService);
  private readonly roleService = inject(RoleService);
  private readonly driversService = inject(DriversService);
  private readonly routesService = inject(RoutesService);
  private readonly router = inject(Router);

  private passengerMsgTimer: ReturnType<typeof setTimeout> | null = null;
  private driverMsgTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnDestroy(): void {
    if (this.passengerMsgTimer) clearTimeout(this.passengerMsgTimer);
    if (this.driverMsgTimer) clearTimeout(this.driverMsgTimer);
  }

  constructor() {
    this.routes = toSignal(this.routesService.getRoutes(), { initialValue: [] });

    // Load passenger data
    const pp = this.roleService.passengerProfile();
    if (pp) {
      this.passengerName.set(pp.name);
      this.passengerRouteId.set(pp.defaultRouteId);
    }

    // Load driver data if applicable
    const p = this.roleService.driverProfile();
    if (p) {
      this.name.set(p.name);
      this.phone.set(p.phone);
      this.plateNumber.set(p.plateNumber);
      this.routeId.set(p.routeId);
      this.vehicleType.set((p.vehicleType as any) ?? 'bus');
    }
  }

  setLanguage(lang: 'en' | 'ar') {
    this.langService.setLanguage(lang);
  }

  setTheme(theme: 'dark' | 'light') {
    this.themeService.setTheme(theme);
  }

  async savePassengerSettings() {
    this.isSubmittingPassenger.set(true);
    this.passengerSuccessMsg.set('');
    this.passengerErrorMsg.set('');

    try {
      this.roleService.updatePassengerProfile({
        name: this.passengerName(),
        defaultRouteId: this.passengerRouteId(),
      });
      this.passengerSuccessMsg.set('Settings saved!');
      if (this.passengerMsgTimer) clearTimeout(this.passengerMsgTimer);
      this.passengerMsgTimer = setTimeout(() => this.passengerSuccessMsg.set(''), 3000);
    } catch (err: any) {
      this.passengerErrorMsg.set('Failed to save settings');
    } finally {
      this.isSubmittingPassenger.set(false);
    }
  }

  async saveDriverSettings() {
    const p = this.roleService.driverProfile();
    if (!p) return;

    this.isSubmitting.set(true);
    this.successMsg.set('');
    this.errorMsg.set('');

    try {
      await this.driversService.updateDriver(p.id, {
        name: this.name(),
        phone: this.phone(),
        plateNumber: this.plateNumber(),
        routeId: this.routeId(),
        vehicleType: this.vehicleType(),
      });

      this.roleService.updateProfile({
        ...p,
        name: this.name(),
        phone: this.phone(),
        plateNumber: this.plateNumber(),
        routeId: this.routeId(),
        vehicleType: this.vehicleType(),
      });

      this.successMsg.set('Settings saved successfully!');
      if (this.driverMsgTimer) clearTimeout(this.driverMsgTimer);
      this.driverMsgTimer = setTimeout(() => this.successMsg.set(''), 3000);
    } catch (err: any) {
      this.errorMsg.set('Failed to save settings: ' + err.message);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  logout() {
    if (confirm('Are you sure you want to sign out and clear your local registration?')) {
      this.roleService.setRegistered(false);
      this.router.navigate(['/']);
    }
  }
}
