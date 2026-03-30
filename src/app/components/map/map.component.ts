import {
  Component,
  inject,
  signal,
  computed,
  effect,
  viewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  Signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import * as L from 'leaflet';
import { RoutesService } from '../../services/routes.service';
import { DriverLocationService } from '../../services/driver-location.service';
import { DriversService } from '../../services/drivers.service';

import { RoleService } from '../../services/role.service';
import { Route } from '../../models/route.model';
import { LiveDriverLocationWithId } from '../../models/driver-location.model';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './map.component.html',
  styleUrl: './map.component.css',
})
export class MapComponent implements AfterViewInit, OnDestroy {
  readonly mapContainer = viewChild<ElementRef>('liveMap');

  readonly routes: Signal<Route[]>;
  readonly selectedRouteId = signal<string>('');
  readonly liveDrivers = signal<LiveDriverLocationWithId[]>([]);
  readonly driverCount = computed(() => this.liveDrivers().length);

  private readonly routesService = inject(RoutesService);
  private readonly driverLocationService = inject(DriverLocationService);
  private readonly driversService = inject(DriversService);
  private readonly roleService = inject(RoleService);
  private readonly location = inject(Location);

  private readonly mapSig = signal<L.Map | null>(null);
  private driverMarkers = new Map<string, L.Marker>();
  private driverInfoCache = new Map<string, { name: string; plate: string }>();
  private routePolyline: L.Polyline | null = null;
  private liveSub: any;
  /** True once the user manually drags the map — stops auto-follow. */
  private userHasPanned = false;
  /** True after the first driver position is received for the current route. */
  private hasAutoZoomed = false;

  goBack() {
    this.location.back();
  }

  constructor() {
    this.routes = toSignal(this.routesService.getRoutes(), { initialValue: [] });

    // Pre-select passenger's preferred route
    const profile = this.roleService.passengerProfile();
    if (profile?.defaultRouteId) {
      this.selectedRouteId.set(profile.defaultRouteId);
    }

    // When route or map changes → subscribe to live drivers + draw polyline
    effect(() => {
      const routeId = this.selectedRouteId();
      const map = this.mapSig();
      this.clearDriverMarkers();
      this.clearPolyline();
      if (this.liveSub) this.liveSub.unsubscribe();
      // Reset follow state on every route change
      this.userHasPanned = false;
      this.hasAutoZoomed = false;
      if (!routeId || !map) return;

      this.drawRoutePolyline(routeId, map);

      this.liveSub = this.driverLocationService
        .getActiveDriversOnRoute(routeId)
        .subscribe((drivers) => {
          this.liveDrivers.set(drivers);
          this.updateDriverMarkers(drivers, map);
        });
    });
  }

  ngAfterViewInit(): void {
    const m = L.map('live-map', {
      center: [33.8938, 35.5018],
      zoom: 9,
      zoomControl: false,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '\u00a9 OpenStreetMap',
      maxZoom: 18,
    }).addTo(m);
    L.control.zoom({ position: 'bottomright' }).addTo(m);
    // Stop auto-follow if the user manually drags
    m.on('dragstart', () => { this.userHasPanned = true; });
    this.mapSig.set(m);
  }

  onRouteChange(id: string): void {
    this.selectedRouteId.set(id);
  }

  private drawRoutePolyline(routeId: string, map: L.Map): void {
    const route = this.routes().find((r) => r.id === routeId);
    if (!route?.waypoints?.length) return;
    const latlngs = route.waypoints.map((w) => [w.lat, w.lng] as L.LatLngExpression);
    this.routePolyline = L.polyline(latlngs, {
      color: route.color || '#F5A623',
      weight: 5,
      opacity: 0.75,
      dashArray: '10, 8',
    }).addTo(map);
    map.fitBounds(this.routePolyline.getBounds(), { padding: [60, 60] });
  }

  private buildDriverIcon(heading: number, isFull: boolean): L.DivIcon {
    const border = isFull ? '#EF4444' : '#F5A623';
    const glow = isFull ? 'rgba(239,68,68,0.25)' : 'rgba(245,166,35,0.25)';
    const fullBadge = isFull
      ? `<span style="position:absolute;top:-6px;right:-6px;background:#EF4444;color:#fff;font-size:9px;font-weight:800;padding:2px 4px;border-radius:99px;border:2px solid #fff;white-space:nowrap;">FULL</span>`
      : '';
    return L.divIcon({
      html: `<div style="position:relative;width:48px;height:48px;border-radius:50%;
          background:#1E3A5F;border:3px solid ${border};
          box-shadow:0 4px 14px rgba(0,0,0,0.55),0 0 0 4px ${glow};
          display:flex;align-items:center;justify-content:center;
          animation:bounce 1s ease-in-out infinite alternate;">
          <span style="font-size:24px;line-height:1;display:block;transform:rotate(${heading}deg);">🚌</span>
          ${fullBadge}
        </div>`,
      className: '',
      iconAnchor: [24, 24],
    });
  }

  private updateDriverMarkers(drivers: LiveDriverLocationWithId[], map: L.Map): void {
    const seen = new Set<string>();
    for (const d of drivers) {
      seen.add(d.id);
      const icon = this.buildDriverIcon(d.heading ?? 0, !!d.isFull);
      if (this.driverMarkers.has(d.id)) {
        const m = this.driverMarkers.get(d.id)!;
        m.setLatLng([d.lat, d.lng]);
        m.setIcon(icon);
        // Refresh popup so the Bus Full tag reflects the current state
        const cached = this.driverInfoCache.get(d.id);
        if (cached) {
          m.setPopupContent(this.buildPopupHtml(d.id, cached.name, cached.plate, !!d.isFull));
        }
      } else {
        const marker = L.marker([d.lat, d.lng], { icon })
          .addTo(map)
          .bindPopup(`<strong>🚌 Driver</strong><br/>`);
        this.driverMarkers.set(d.id, marker);
        // Fetch driver info and update popup asynchronously
        firstValueFrom(this.driversService.getDriver(d.id))
          .then((driver) => {
            if (!driver) return;
            const name = driver.name || 'Unknown Driver';
            const plate = driver.plateNumber || '';
            this.driverInfoCache.set(d.id, { name, plate });
            marker.setPopupContent(this.buildPopupHtml(d.id, name, plate, !!d.isFull));
          })
          .catch(() => {});
      }
    }
    // Remove markers for drivers no longer active
    for (const [id, marker] of this.driverMarkers) {
      if (!seen.has(id)) {
        marker.remove();
        this.driverMarkers.delete(id);
      }
    }

    // Auto-zoom toward live driver(s) — only on the first update, only if user hasn't panned
    if (!this.userHasPanned && !this.hasAutoZoomed && drivers.length > 0) {
      this.hasAutoZoomed = true;
      if (drivers.length === 1) {
        map.flyTo([drivers[0].lat, drivers[0].lng], 15, { animate: true, duration: 1.2 });
      } else {
        const bounds = L.latLngBounds(drivers.map(d => [d.lat, d.lng] as L.LatLngExpression));
        map.flyToBounds(bounds, { padding: [60, 60], maxZoom: 15, animate: true, duration: 1.2 });
      }
    }
  }

  private buildPopupHtml(driverId: string, name: string, plate: string, isFull: boolean): string {
    const plateHtml = plate ? `<br/>🔢 ${plate}` : '';
    const fullHtml = isFull
      ? `<br/><span style="color:#EF4444;font-weight:700;background:rgba(239,68,68,0.1);padding:2px 8px;border-radius:6px;display:inline-block;margin-top:4px;">🚫 Bus Full — Cannot board</span>`
      : '';
    return `<strong>🚌 ${name}</strong>${plateHtml}${fullHtml}<br/><a href="/drivers/${driverId}" style="color:#F5A623;font-size:12px;">View profile →</a>`;
  }

  private clearDriverMarkers(): void {
    this.driverMarkers.forEach((m) => m.remove());
    this.driverMarkers.clear();
    this.driverInfoCache.clear();
    this.liveDrivers.set([]);
  }

  private clearPolyline(): void {
    if (this.routePolyline) { this.routePolyline.remove(); this.routePolyline = null; }
  }

  ngOnDestroy(): void {
    if (this.liveSub) this.liveSub.unsubscribe();
    this.mapSig()?.remove();
  }
}
