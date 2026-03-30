import { Component, inject, signal, effect, model, Signal, OnInit } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RoutesService } from '../../services/routes.service';
import { WaitingPassengersService } from '../../services/waiting-passengers.service';
import { GeolocationService } from '../../services/geolocation.service';
import { AuthService } from '../../services/auth.service';
import { RoleService } from '../../services/role.service';
import { NotificationsService } from '../../services/notifications.service';
import { Route } from '../../models/route.model';
import { TranslatePipe } from '@ngx-translate/core';

type WaitingState = 'idle' | 'locating' | 'confirming' | 'waiting' | 'error';

@Component({
  selector: 'app-waiting',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './waiting.component.html',
  styleUrl: './waiting.component.css'
})
export class WaitingComponent implements OnInit {
  readonly routes: Signal<Route[]>;
  readonly state = signal<WaitingState>('idle');
  readonly location = signal<{ lat: number; lng: number } | null>(null);
  readonly errorMsg = signal('');
  readonly count = signal(1);
  readonly selectedRouteId = model('');
  readonly activeDocId = signal('');
  readonly queryParams: Signal<any>;

  constructor() {
    this.routes = toSignal(this.routesService.getRoutes(), { initialValue: [] });
    this.queryParams = toSignal(this.activatedRoute.queryParams);

    effect(() => {
      const p = this.queryParams() as Record<string, string>;
      const preferredId = this.roleService.passengerProfile()?.defaultRouteId;

      if (p && p['routeId'] && !this.selectedRouteId()) {
        this.selectedRouteId.set(p['routeId']);
      } else if (preferredId && !this.selectedRouteId()) {
        this.selectedRouteId.set(preferredId);
      }
    });

    effect(async () => {
      const c = this.count();
      const id = this.activeDocId();
      if (id && this.state() === 'waiting') {
        try {
          await this.waitingService.updateWaitingCount(id, c);
        } catch (err) {
          console.error('Failed to update passenger count:', err);
        }
      }
    });
  }

  private readonly routesService = inject(RoutesService);
  private readonly waitingService = inject(WaitingPassengersService);
  private readonly geoService = inject(GeolocationService);
  private readonly authService = inject(AuthService);
  private readonly roleService = inject(RoleService);
  private readonly notificationsService = inject(NotificationsService);
  private readonly locationService = inject(Location);

  goBack() { this.locationService.back(); }
  private readonly activatedRoute = inject(ActivatedRoute);

  async ngOnInit(): Promise<void> {
    // Restore state if this device already has an active waiting entry
    const existing = await this.waitingService.getActiveByDevice(this.authService.currentDeviceId);
    if (existing && existing.id) {
      this.activeDocId.set(existing.id);
      this.location.set(existing.location);
      this.count.set(existing.count);
      this.selectedRouteId.set(existing.routeId);
      this.state.set('waiting');
    }
  }

  adjustCount(delta: number): void {
    this.count.update(c => Math.max(1, Math.min(10, c + delta)));
  }

  async startWaiting(): Promise<void> {
    if (!this.selectedRouteId()) return;
    this.state.set('locating');
    try {
      const pos = await this.geoService.getCurrentPosition();
      this.location.set(pos);
      const docId = await this.waitingService.addWaiting(
        this.selectedRouteId(), pos, this.count(), this.authService.currentDeviceId
      );
      this.activeDocId.set(docId);
      this.state.set('waiting');
      // Notify drivers on this route via local notification
      // (server-side Cloud Function will send FCM to `route_<routeId>` topic)
      await this.notificationsService.showLocal(
        '✋ Passenger Waiting',
        `${this.count()} passenger(s) waiting on your route.`,
      );
    } catch (err: any) {
      this.errorMsg.set(this.friendlyGeoError(err));
      this.state.set('error');
    }
  }

  private friendlyGeoError(err: any): string {
    const code: number = err?.code ?? 0;
    if (code === 1) return 'Location access was denied. Please allow location permission in your browser settings and try again.';
    if (code === 2) return 'Your location could not be determined. Make sure Location Services are enabled on your device.';
    if (code === 3) return 'Location request timed out. Please move to an area with better signal and try again.';
    return 'Could not get your location. Please allow location access and try again.';
  }

  async cancelWaiting(): Promise<void> {
    const id = this.activeDocId();
    if (id) {
      await this.waitingService.removeWaiting(id);
    }
    this.state.set('idle');
    this.location.set(null);
    this.activeDocId.set('');
  }
}
