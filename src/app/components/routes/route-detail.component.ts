import { Component, inject, computed, input, signal, Signal, effect, OnDestroy } from '@angular/core';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RoutesService } from '../../services/routes.service';
import { DriversService } from '../../services/drivers.service';
import { DriverLocationService } from '../../services/driver-location.service';
import { RoleService } from '../../services/role.service';
import { SEOService } from '../../services/seo.service';
import { FavoritesService } from '../../services/favorites.service';
import { StarRatingComponent } from '../shared/star-rating/star-rating.component';
import { Location } from '@angular/common';
import { switchMap, map } from 'rxjs';
import { Route } from '../../models/route.model';
import { LiveDriverLocationWithId } from '../../models/driver-location.model';

@Component({
  selector: 'app-route-detail',
  imports: [CommonModule, RouterLink, StarRatingComponent, TranslateModule],
  templateUrl: './route-detail.component.html',
  styleUrl: './route-detail.component.css'
})
export class RouteDetailComponent implements OnDestroy {
  readonly id = input.required<string>();
  readonly isPassenger = computed(() => this.roleService.isPassenger());
  readonly route: Signal<Route | undefined>;
  readonly drivers: Signal<any[]>;
  readonly driversLoading = signal(false);
  readonly copied = signal(false);
  readonly liveDrivers = signal<LiveDriverLocationWithId[]>([]);
  readonly liveCount = computed(() => this.liveDrivers().length);
  readonly isFavorite = computed(() => this.favoritesService.isFavorite(this.id()));

  /** Check if a driver is currently broadcasting "bus full" */
  isDriverFull(driverId: string): boolean {
    return this.liveDrivers().find(d => d.id === driverId)?.isFull ?? false;
  }

  toggleFavorite(): void {
    this.favoritesService.toggle(this.id());
  }

  private readonly roleService = inject(RoleService);
  private readonly routesService = inject(RoutesService);
  private readonly driversService = inject(DriversService);
  private readonly driverLocationService = inject(DriverLocationService);
  private readonly seoService = inject(SEOService);
  private readonly translate = inject(TranslateService);
  private readonly location = inject(Location);
  private readonly favoritesService = inject(FavoritesService);

  private liveSub: any;
  private copiedTimer: ReturnType<typeof setTimeout> | null = null;

  goBack() { this.location.back(); }

  constructor() {
    this.route = toSignal(
      toObservable(this.id).pipe(
        switchMap(id => this.routesService.getRoute(id))
      )
    );
    this.drivers = toSignal(
      toObservable(this.id).pipe(
        switchMap(id => this.driversService.getDriversByRoute(id)),
        map(drivers => [...drivers].sort((a, b) => {
          const aV = a.verified ? 1 : 0;
          const bV = b.verified ? 1 : 0;
          if (bV !== aV) return bV - aV;
          return b.rating - a.rating;
        }))
      ),
      { initialValue: [] }
    );

    // Subscribe to live RTDB driver locations for this route
    effect(() => {
      const routeId = this.id();
      if (this.liveSub) this.liveSub.unsubscribe();
      this.liveSub = this.driverLocationService
        .getActiveDriversOnRoute(routeId)
        .subscribe(drivers => this.liveDrivers.set(drivers));
    });

    effect(() => {
      const r = this.route();
      if (r) {
        const isAr = this.translate.currentLang === 'ar';
        const name = isAr ? r.nameAr : r.name;
        this.seoService.updateTags(undefined, undefined, {
          image: '', // Could add route map card image later
        });
        // Override manually for dynamic content
        const title = `${name} | Lebanon Bus`;
        document.title = title;
      }
    });
  }

  formatPrice(p: number): string {
    return p >= 1000 ? (p / 1000).toFixed(0) + 'k' : p.toString();
  }

  ngOnDestroy(): void {
    if (this.liveSub) this.liveSub.unsubscribe();
    if (this.copiedTimer) clearTimeout(this.copiedTimer);
  }

  vehicleLabel(type: string): string {
    const map: Record<string, string> = {
      minibus: '🚐 Minibus', bus: '🚌 Bus', van: '🚙 Van', service: '🚗 Service'
    };
    return map[type] ?? type;
  }

  shareRoute(): void {
    const r = this.route();
    if (!r) return;
    const url = `${window.location.origin}/routes/${r.id}`;
    const isAr = this.translate.currentLang === 'ar';
    const name = (isAr ? r.nameAr : r.name) ?? r.name;
    const text = `${name} — Lebanon Bus: ${url}`;
    if (navigator.share) {
      navigator.share({ title: name, text, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        this.copied.set(true);
        if (this.copiedTimer) clearTimeout(this.copiedTimer);
        this.copiedTimer = setTimeout(() => this.copied.set(false), 2000);
      });
    }
  }
}
