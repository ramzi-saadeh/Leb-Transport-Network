import { Component, inject, signal, model, computed, Signal, OnDestroy } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { DriversService } from '../../services/drivers.service';
import { RoutesService } from '../../services/routes.service';
import { AuthService } from '../../services/auth.service';
import { RoleService } from '../../services/role.service';
import { GeolocationService } from '../../services/geolocation.service';
import { Route } from '../../models/route.model';

type FormState = 'idle' | 'submitting' | 'success' | 'error';

@Component({
  selector: 'app-driver-register',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './driver-register.component.html',
  styleUrl: './driver-register.component.css',
})
export class DriverRegisterComponent implements OnDestroy {
  readonly routes: Signal<Route[]>;
  readonly formState = signal<FormState>('idle');
  readonly errorMsg = signal('');
  readonly name = model('');
  readonly phone = model('');
  readonly routeId = model('');
  readonly plateNumber = model('');
  readonly vehicleType = model<'bus' | 'minibus' | 'van' | 'car' | ''>('');
  readonly isFormValid = computed(
    () =>
      !!(this.name() && this.phone() && this.routeId() && this.plateNumber() && this.vehicleType()),
  );

  constructor() {
    this.routes = toSignal(this.routesService.getRoutes(), { initialValue: [] });
  }

  private readonly driversService = inject(DriversService);
  private readonly routesService = inject(RoutesService);
  private readonly authService = inject(AuthService);
  private readonly roleService = inject(RoleService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly geoService = inject(GeolocationService);

  goBack() { this.location.back(); }

  private navTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnDestroy(): void {
    if (this.navTimer) clearTimeout(this.navTimer);
  }

  async submit(): Promise<void> {
    if (!this.isFormValid()) return;
    this.formState.set('submitting');
    this.errorMsg.set('');
    try {
      const docId = await this.driversService.registerDriver({
        name: this.name(),
        phone: this.phone(),
        routeId: this.routeId(),
        plateNumber: this.plateNumber(),
        vehicleType: this.vehicleType() as 'bus' | 'minibus' | 'van' | 'car',
        uid: this.authService.currentDeviceId,
        isActive: true,
      });

      this.roleService.setRegistered(true, {
        id: docId,
        name: this.name(),
        phone: this.phone(),
        plateNumber: this.plateNumber(),
        routeId: this.routeId(),
        vehicleType: this.vehicleType(),
      });
      this.formState.set('success');
      // Request GPS permission right after registration so driver is ready to share location
      this.geoService.requestPermission();

      this.navTimer = setTimeout(() => {
        this.router.navigate(['/driver/dashboard']);
      }, 1500);
    } catch (err: any) {
      this.errorMsg.set(err?.message ?? 'Registration failed. Please try again.');
      this.formState.set('error');
    }
  }
}
