import { Component, inject, signal, computed, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RoutesService } from '../../services/routes.service';
import { PendingRoutesService } from '../../services/pending-routes.service';
import { AuthService } from '../../services/auth.service';
import { Route } from '../../models/route.model';

interface CityEntry { en: string; ar: string; }

@Component({
  selector: 'app-my-route',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslateModule],
  templateUrl: './my-route.component.html',
  styleUrl: './my-route.component.css',
})
export class MyRouteComponent {
  readonly fromCity = signal('');
  readonly toCity = signal('');
  readonly submitting = signal(false);
  readonly submitted = signal(false);
  readonly matchedRouteId = signal<string | null>(null);

  private readonly allRoutes: Signal<Route[]>;

  readonly cities = computed<CityEntry[]>(() => {
    const map = new Map<string, string>();
    this.allRoutes().forEach(r => {
      map.set(r.from, r.fromAr);
      map.set(r.to, r.toAr);
    });
    return Array.from(map.entries())
      .map(([en, ar]) => ({ en, ar }))
      .sort((a, b) => a.en.localeCompare(b.en));
  });

  readonly toCities = computed(() =>
    this.cities().filter(c => c.en !== this.fromCity())
  );

  readonly canSubmit = computed(() =>
    this.fromCity() !== '' && this.toCity() !== '' && this.fromCity() !== this.toCity()
  );

  readonly isAr = computed(() => this.translate.currentLang === 'ar');

  private readonly routesService = inject(RoutesService);
  private readonly pendingRoutesService = inject(PendingRoutesService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly translate = inject(TranslateService);

  constructor() {
    this.allRoutes = toSignal(this.routesService.getRoutes(), { initialValue: [] });
  }

  goBack() { this.location.back(); }

  onFromChange(value: string): void {
    this.fromCity.set(value);
    if (this.toCity() === value) {
      this.toCity.set('');
    }
  }

  cityLabel(city: CityEntry): string {
    return this.isAr() ? city.ar : city.en;
  }

  async submit(): Promise<void> {
    if (!this.canSubmit()) return;
    this.submitting.set(true);

    try {
      const from = this.fromCity();
      const to = this.toCity();

      // Try to find a matching route (both directions)
      const match = this.allRoutes().find(r =>
        (r.from === from && r.to === to) || (r.from === to && r.to === from)
      );

      if (match) {
        this.matchedRouteId.set(match.id!);
        this.submitted.set(true);
        return;
      }

      // No match — save as pending for admin review
      const fromAr = this.cities().find(c => c.en === from)?.ar ?? from;
      const toAr = this.cities().find(c => c.en === to)?.ar ?? to;
      await this.pendingRoutesService.submit(from, to, fromAr, toAr, this.authService.currentDeviceId);
      this.submitted.set(true);
    } finally {
      this.submitting.set(false);
    }
  }
}
