import {
  Component,
  inject,
  computed,
  signal,
  viewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  effect,
  Signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { CommonModule } from '@angular/common';
import { WaitingPassengersService } from '../../services/waiting-passengers.service';
import { RoutesService } from '../../services/routes.service';
import { RatingsService } from '../../services/ratings.service';
import { DriversService } from '../../services/drivers.service';
import { DriverLocationService } from '../../services/driver-location.service';
import { WaitingPassenger } from '../../models/waiting-passenger.model';
import { StarRatingComponent } from '../shared/star-rating/star-rating.component';
import * as L from 'leaflet';
import { RoleService } from '../../services/role.service';
import { TranslatePipe } from '@ngx-translate/core';
import { Route } from '../../models/route.model';

@Component({
  selector: 'app-driver-dashboard',
  standalone: true,
  imports: [CommonModule, StarRatingComponent, TranslatePipe],
  templateUrl: './driver-dashboard.component.html',
  styleUrl: './driver-dashboard.component.css',
})
export class DriverDashboardComponent implements AfterViewInit, OnDestroy {
  readonly mapContainer = viewChild<ElementRef>('dashMap');
  readonly driverRouteId = computed(() => this.roleService.driverRouteId());
  readonly routes: Signal<Route[]>;
  readonly ratings = signal<any[]>([]);
  readonly selectedRouteId = signal<string | null>(null);
  readonly passengers = signal<WaitingPassenger[]>([]);
  readonly waitingTotal = computed(() =>
    this.passengers().reduce((s: number, p: WaitingPassenger) => s + p.count, 0),
  );
  readonly driverIsActive = signal<boolean>(true);

  constructor() {
    this.routes = toSignal(this.routesService.getRoutes(), { initialValue: [] });

    // Initial filter for the driver's registered route
    const drId = this.roleService.driverRouteId();
    if (drId) {
      this.selectedRouteId.set(drId);
    }

    effect(() => {
      if (!this.roleService.isRegistered()) {
        this.router.navigate(['/driver/register']);
      }
    });

    // Reactive data fetching
    effect(() => {
      const id = this.selectedRouteId();
      if (this.sub) this.sub.unsubscribe();

      const obs$ = id
        ? this.waitingService.getWaitingForRoute(id)
        : this.waitingService.getAllActive();
      this.sub = obs$.subscribe((data) => {
        this.passengers.set(data);
      });
    });

    // Reactive marker updates
    effect(() => {
      const ps = this.passengers();
      const m = this.mapSignal();
      if (m) {
        this.refreshMarkers(ps, m);
      }
    });

    // Reactive route polyline drawing
    effect(() => {
      const id = this.selectedRouteId();
      const allRoutes = this.routes();
      const m = this.mapSignal();

      if (m) {
        // Clear previous route layer
        if (this.routePolyline) {
          this.routePolyline.remove();
          this.routePolyline = null;
        }
        this.stopMarkers.forEach((sm) => sm.remove());
        this.stopMarkers = [];

        if (id && allRoutes.length > 0) {
          const selectedRoute = allRoutes.find((r) => r.id === id);
          if (selectedRoute?.waypoints && selectedRoute.waypoints.length > 0) {
            const wps = selectedRoute.waypoints;
            const color = selectedRoute.color || '#F5A623';
            const latlngs = wps.map((wp) => [wp.lat, wp.lng] as L.LatLngExpression);

            // Polyline
            this.routePolyline = L.polyline(latlngs, {
              color,
              weight: 5,
              opacity: 0.8,
              dashArray: '10, 10',
            }).addTo(m);

            // Terminal stops (larger dot)
            this.addStopMarker(m, wps[0], selectedRoute.from, color, true);
            this.addStopMarker(m, wps[wps.length - 1], selectedRoute.to, color, true);

            // Intermediate waypoints
            wps.slice(1, -1).forEach((wp, i) =>
              this.addStopMarker(m, wp, `Stop ${i + 1}`, color, false),
            );

            m.fitBounds(this.routePolyline.getBounds(), { padding: [50, 50] });
          }
        }
      }
    });

    // Fetch ratings for current driver
    effect(() => {
      const profile = this.roleService.driverProfile();
      if (profile?.id) {
        if (this.resSub) this.resSub.unsubscribe();
        this.resSub = this.ratingsService.getRatingsForDriver(profile.id).subscribe((data) => {
          this.ratings.set(data);
        });
      }
    });

    effect(() => {
      const profile = this.roleService.driverProfile();
      if (profile?.id) {
        if (this.driverSub) this.driverSub.unsubscribe();
        this.driverSub = this.driversService.getDriver(profile.id).subscribe((d) => {
          if (d !== undefined) this.driverIsActive.set(d.isActive);
        });
      }
    });

    // Start / stop location sharing when duty status changes
    effect(() => {
      const isActive = this.driverIsActive();
      const profile = this.roleService.driverProfile();
      const routeId = this.selectedRouteId() ?? profile?.routeId;
      if (isActive && profile?.id && routeId) {
        this.driverLocationService.startSharing(profile.id, routeId);
      } else {
        this.driverLocationService.stopSharing();
      }
    });


  }
  markers: L.Marker[] = [];
  private readonly roleService = inject(RoleService);
  private readonly routesService = inject(RoutesService);
  private readonly waitingService = inject(WaitingPassengersService);
  private readonly ratingsService = inject(RatingsService);
  private readonly driversService = inject(DriversService);
  private readonly driverLocationService = inject(DriverLocationService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly mapSignal = signal<L.Map | null>(null);

  goBack() { this.location.back(); }

  private sub: any;
  private resSub: any;
  private driverSub: any;
  private routePolyline: L.Polyline | null = null;
  private stopMarkers: L.Marker[] = [];

  ngAfterViewInit(): void {
    const m = L.map('dash-map', { center: [33.8938, 35.5018], zoom: 10, zoomControl: false });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 18,
    }).addTo(m);
    L.control.zoom({ position: 'bottomright' }).addTo(m);
    this.mapSignal.set(m);
  }

  private refreshMarkers(passengers: WaitingPassenger[], map: L.Map): void {
    this.clearMarkers();
    passengers.forEach((p) => {
      const icon = L.divIcon({
        html: `<div style="
          position:relative;
          width:48px;height:48px;border-radius:50%;
          background:#0D7A4E;border:3px solid #34D399;
          box-shadow:0 4px 14px rgba(0,0,0,0.55),0 0 0 4px rgba(52,211,153,0.25);
          display:flex;align-items:center;justify-content:center;
          animation:bounce 1s ease-in-out infinite alternate;">
          <span style="font-size:20px;line-height:1;">✋</span>
          <span style="position:absolute;top:-6px;right:-6px;background:#34D399;color:#0D3B2A;font-size:11px;font-weight:800;min-width:18px;height:18px;border-radius:99px;display:flex;align-items:center;justify-content:center;padding:0 4px;border:2px solid #fff;">${p.count}</span>
        </div>`,
        className: '',
        iconAnchor: [24, 24],
      });
      const marker = L.marker([p.location.lat, p.location.lng], { icon })
        .addTo(map)
        .bindPopup(`<strong>✋ ${p.count} waiting</strong>`);
      this.markers.push(marker);
    });
  }

  private clearMarkers(): void {
    this.markers.forEach((m) => m.remove());
    this.markers = [];
  }
  private addStopMarker(map: L.Map, wp: { lat: number; lng: number }, label: string, color: string, isTerminal: boolean): void {
    const size = isTerminal ? 14 : 10;
    const icon = L.divIcon({
      html: `<div style="
        width:${size}px; height:${size}px;
        background:${color};
        border: 2px solid #fff;
        border-radius: 50%;
        box-shadow: 0 2px 6px rgba(0,0,0,0.4);
      "></div>`,
      className: '',
      iconAnchor: [size / 2, size / 2],
    });
    const marker = L.marker([wp.lat, wp.lng], { icon })
      .addTo(map)
      .bindPopup(`<strong>📍 ${label}</strong>`);
    this.stopMarkers.push(marker);
  }
  filterRoute(id: string | null): void {
    this.selectedRouteId.set(id);
  }

  async toggleDutyStatus(): Promise<void> {
    const profile = this.roleService.driverProfile();
    if (!profile?.id) return;
    await this.driversService.updateDriver(profile.id, { isActive: !this.driverIsActive() });
  }

  ngOnDestroy(): void {
    if (this.sub) this.sub.unsubscribe();
    if (this.resSub) this.resSub.unsubscribe();
    if (this.driverSub) this.driverSub.unsubscribe();
    this.driverLocationService.stopSharing();
    this.mapSignal()?.remove();
  }
}
