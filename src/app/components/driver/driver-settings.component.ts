import { Component, inject, signal, computed, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { RoleService, DriverProfile } from '../../services/role.service';
import { DriversService } from '../../services/drivers.service';
import { RoutesService } from '../../services/routes.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { Route } from '../../models/route.model';

@Component({
  selector: 'app-driver-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslatePipe],
  template: `
    <div class="page-container">
      <div class="page-scroll">
        <div class="detail-header">
          <a routerLink="/driver/dashboard" class="btn-ghost back-btn">← Dashboard</a>
          <h1>Driver Settings</h1>
          <p class="text-muted">Manage your profile and route</p>
        </div>

        <div class="p-lg">
          <div class="bus-card p-md">
            <!-- Form -->
            <div class="form-group">
              <label class="form-label">Full Name</label>
              <input
                type="text"
                class="form-input"
                [ngModel]="name()"
                (ngModelChange)="name.set($event)"
                placeholder="Enter your name"
              />
            </div>

            <div class="form-group mt-md">
              <label class="form-label">Phone Number</label>
              <input
                type="tel"
                class="form-input"
                [ngModel]="phone()"
                (ngModelChange)="phone.set($event)"
                placeholder="70 123 456"
              />
            </div>

            <div class="form-group mt-md">
              <label class="form-label">Bus Plate Number</label>
              <input
                type="text"
                class="form-input"
                [ngModel]="plateNumber()"
                (ngModelChange)="plateNumber.set($event)"
                placeholder="G 123456"
              />
            </div>

            <div class="form-group mt-md">
              <label class="form-label">Primary Route (Road Line)</label>
              <select
                class="form-input"
                [ngModel]="routeId()"
                (ngModelChange)="routeId.set($event)"
              >
                @for (r of routes(); track r.id) {
                  <option [value]="r.id">{{ r.name }}</option>
                }
              </select>
            </div>

            <div class="form-group mt-md">
              <label class="form-label">{{ 'SETTINGS.VEHICLE_TYPE' | translate }}</label>
              <select
                class="form-input"
                [ngModel]="vehicleType()"
                (ngModelChange)="vehicleType.set($event)"
              >
                <option value="bus">{{ 'VEHICLE_TYPES.BUS' | translate }}</option>
                <option value="minibus">{{ 'VEHICLE_TYPES.MINIBUS' | translate }}</option>
                <option value="van">{{ 'VEHICLE_TYPES.VAN' | translate }}</option>
                <option value="car">{{ 'VEHICLE_TYPES.CAR' | translate }}</option>
              </select>
            </div>

            <div class="mt-lg">
              <button class="btn-primary" (click)="saveSettings()" [disabled]="isSubmitting()">
                {{ isSubmitting() ? 'Saving...' : 'Save Changes' }}
              </button>

              @if (successMsg()) {
                <div class="success-alert mt-md">{{ successMsg() }}</div>
              }
              @if (errorMsg()) {
                <div class="error-alert mt-md">{{ errorMsg() }}</div>
              }
            </div>
          </div>

          <div class="mt-xl text-center">
            <button class="btn-ghost text-danger" (click)="logout()">
              Sign Out / Reset Account
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .success-alert {
        color: var(--success);
        font-weight: 600;
        text-align: center;
      }
      .error-alert {
        color: var(--danger);
        font-weight: 600;
        text-align: center;
      }
    `,
  ],
})
export class DriverSettingsComponent {
  readonly routes: Signal<Route[]>;
  readonly profile = computed(() => this.roleService.driverProfile());
  readonly name = signal('');
  readonly phone = signal('');
  readonly plateNumber = signal('');
  readonly routeId = signal('');
  readonly vehicleType = signal<'bus' | 'minibus' | 'van' | 'car'>('bus');
  readonly isSubmitting = signal(false);
  readonly successMsg = signal('');
  readonly errorMsg = signal('');

  constructor() {
    this.routes = toSignal(this.routesService.getRoutes(), { initialValue: [] });

    const p = this.profile();
    if (p) {
      this.name.set(p.name);
      this.phone.set(p.phone);
      this.plateNumber.set(p.plateNumber);
      this.routeId.set(p.routeId);
      this.vehicleType.set((p.vehicleType as any) ?? 'bus');
    }
  }

  private readonly roleService = inject(RoleService);
  private readonly driversService = inject(DriversService);
  private readonly routesService = inject(RoutesService);
  private readonly router = inject(Router);

  async saveSettings() {
    const p = this.profile();
    if (!p) return;

    this.isSubmitting.set(true);
    this.successMsg.set('');
    this.errorMsg.set('');

    try {
      const updatedProfile: DriverProfile = {
        id: p.id,
        name: this.name(),
        phone: this.phone(),
        plateNumber: this.plateNumber(),
        routeId: this.routeId(),
        vehicleType: this.vehicleType(),
      };

      await this.driversService.updateDriver(p.id, {
        name: updatedProfile.name,
        phone: updatedProfile.phone,
        plateNumber: updatedProfile.plateNumber,
        routeId: updatedProfile.routeId,
        vehicleType: this.vehicleType(),
      });

      this.roleService.updateProfile(updatedProfile);

      this.successMsg.set('Settings saved successfully!');
      setTimeout(() => this.successMsg.set(''), 3000);
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
