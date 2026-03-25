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
  private routePolyline: L.Polyline | null = null;
  private liveSub: any;

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
      attribution: '© OpenStreetMap',
      maxZoom: 18,
    }).addTo(m);
    L.control.zoom({ position: 'bottomright' }).addTo(m);
    this.mapSig.set(m); // triggers the route effect to subscribe
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

  private updateDriverMarkers(drivers: LiveDriverLocationWithId[], map: L.Map): void {
    const seen = new Set<string>();
    for (const d of drivers) {
      seen.add(d.id);
      const icon = L.divIcon({
        html: `<div style="
          width:48px;height:48px;border-radius:50%;
          background:#1E3A5F;border:3px solid #F5A623;
          box-shadow:0 4px 14px rgba(0,0,0,0.55),0 0 0 4px rgba(245,166,35,0.25);
          display:flex;align-items:center;justify-content:center;
          animation:bounce 1s ease-in-out infinite alternate;
        "><span style="font-size:24px;line-height:1;">🚌</span></div>`,
        className: '',
        iconAnchor: [24, 24],
      });
      if (this.driverMarkers.has(d.id)) {
        this.driverMarkers.get(d.id)!.setLatLng([d.lat, d.lng]);
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
            const plate = driver.plateNumber ? `<br/>🔢 ${driver.plateNumber}` : '';
            // const speed = Math.round(d.speed);
            marker.setPopupContent(
              `<strong>🚌 ${name}</strong>${plate}<br/><a href="/drivers/${d.id}" style="color:#F5A623;font-size:12px;">View profile →</a>`,
            );
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
  }

  private clearDriverMarkers(): void {
    this.driverMarkers.forEach((m) => m.remove());
    this.driverMarkers.clear();
    this.liveDrivers.set([]);
  }

  private clearPolyline(): void {
    if (this.routePolyline) {
      this.routePolyline.remove();
      this.routePolyline = null;
    }
  }

  ngOnDestroy(): void {
    if (this.liveSub) this.liveSub.unsubscribe();
    this.mapSig()?.remove();
  }
}
