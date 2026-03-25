import { Component, inject, computed, input, signal, Signal, effect } from '@angular/core';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RoutesService } from '../../services/routes.service';
import { DriversService } from '../../services/drivers.service';
import { RoleService } from '../../services/role.service';
import { SEOService } from '../../services/seo.service';
import { StarRatingComponent } from '../shared/star-rating/star-rating.component';
import { Location } from '@angular/common';
import { switchMap, of } from 'rxjs';
import { Route } from '../../models/route.model';

@Component({
  selector: 'app-route-detail',
  imports: [CommonModule, RouterLink, StarRatingComponent, TranslateModule],
  templateUrl: './route-detail.component.html',
  styleUrl: './route-detail.component.css'
})
export class RouteDetailComponent {
  readonly id = input.required<string>();
  readonly isPassenger = computed(() => this.roleService.isPassenger());
  readonly route: Signal<Route | undefined>;
  readonly drivers: Signal<any[]>;
  readonly driversLoading = signal(false);
  readonly copied = signal(false);

  private readonly roleService = inject(RoleService);
  private readonly routesService = inject(RoutesService);
  private readonly driversService = inject(DriversService);
  private readonly seoService = inject(SEOService);
  private readonly translate = inject(TranslateService);
  private readonly location = inject(Location);

  goBack() { this.location.back(); }

  constructor() {
    this.route = toSignal(
      toObservable(this.id).pipe(
        switchMap(id => this.routesService.getRoute(id))
      )
    );
    this.drivers = toSignal(
      toObservable(this.id).pipe(
        switchMap(id => this.driversService.getDriversByRoute(id))
      ),
      { initialValue: [] }
    );

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
        setTimeout(() => this.copied.set(false), 2000);
      });
    }
  }
}
