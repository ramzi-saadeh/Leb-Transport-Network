import { Component, inject, computed, Signal, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { RoutesService } from '../../services/routes.service';
import { DriversService } from '../../services/drivers.service';
import { RouteCardComponent } from '../shared/route-card/route-card.component';
import { RoleService } from '../../services/role.service';
import { Route } from '../../models/route.model';
import { Driver } from '../../models/driver.model';

@Component({
  selector: 'app-home',
  imports: [CommonModule, RouterLink, RouteCardComponent, TranslatePipe],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {
  readonly isPassenger = computed(() => this.roleService.isPassenger());
  readonly isDriver = computed(() => this.roleService.isDriver());
  readonly driverProfile = computed(() => this.roleService.driverProfile());
  readonly passengerProfile = computed(() => this.roleService.passengerProfile());
  readonly passengerName = computed(() => this.passengerProfile()?.name || '');

  readonly allRoutes: Signal<Route[]>;
  readonly allDrivers: Signal<Driver[]>;
  readonly totalDrivers = computed(() => this.allDrivers().length);
  readonly activeDrivers = computed(() => this.allDrivers().filter((d) => d.isActive).length);
  readonly totalRoutes = computed(() => this.allRoutes().length);
  readonly avgNetworkRating = computed(() => {
    const rated = this.allDrivers().filter((d) => (d.ratingCount ?? 0) > 0);
    if (rated.length === 0) return '—';
    const totalWeighted = rated.reduce((sum, d) => sum + d.rating * (d.ratingCount ?? 0), 0);
    const totalCount = rated.reduce((sum, d) => sum + (d.ratingCount ?? 0), 0);
    return (totalWeighted / totalCount).toFixed(1);
  });
  readonly fleetBreakdown = computed(() => {
    const drivers = this.allDrivers();
    const total = drivers.length;
    if (total === 0) return [];
    const types: Driver['vehicleType'][] = ['bus', 'minibus', 'van', 'car'];
    return types
      .map((type) => ({
        type,
        typeKey: 'VEHICLE_TYPES.' + type.toUpperCase(),
        count: drivers.filter((d) => d.vehicleType === type).length,
        percentage: (drivers.filter((d) => d.vehicleType === type).length / total) * 100,
      }))
      .filter((item) => item.count > 0);
  });

  readonly preferredRouteId = computed(() => {
    if (this.isDriver()) {
      return this.driverProfile()?.routeId || null;
    }
    return this.passengerProfile()?.defaultRouteId || null;
  });

  readonly preferredRoute = computed(() => {
    const id = this.preferredRouteId();
    if (!id) return null;
    return (this.allRoutes() || []).find((r) => r.id === id) || null;
  });

  private readonly routesService = inject(RoutesService);
  private readonly driversService = inject(DriversService);
  private readonly roleService = inject(RoleService);

  readonly shareCopied = signal(false);

  async shareApp(): Promise<void> {
    const url = 'https://bus-leb.web.app';
    const title = 'Lebanon Bus Guide 🇱🇧';
    const text = 'Find bus routes, signal drivers and explore Lebanon\'s public transport network!';
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      this.shareCopied.set(true);
      setTimeout(() => this.shareCopied.set(false), 2500);
    }
  }

  constructor() {
    this.allRoutes = toSignal(this.routesService.getRoutes(), { initialValue: [] });
    this.allDrivers = toSignal(this.driversService.getAllDrivers(), { initialValue: [] });
  }
}
