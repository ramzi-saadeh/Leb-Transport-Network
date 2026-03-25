import { Component, inject, signal, effect, DestroyRef } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter, map, mergeMap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from './components/shared/navbar/navbar.component';
import { LanguageService } from './services/language.service';
import { SEOService } from './services/seo.service';
import { ThemeService } from './services/theme.service';

const NO_NAV_ROUTES = ['', 'onboarding', 'role-selection'];

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly langService = inject(LanguageService);
  private readonly seoService = inject(SEOService);
  private readonly themeService = inject(ThemeService);
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly showNavbar = signal(false);

  constructor() {
    effect(() => {
      const isRtl = this.langService.isRtl();
      document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
      document.documentElement.lang = this.langService.currentLang();

      // Update SEO tags when language changes (re-trigger with current route data)
      this.updateSEO();
    });

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd), takeUntilDestroyed(this.destroyRef))
      .subscribe((event: NavigationEnd) => {
        const path = event.urlAfterRedirects.split('/')[1].split('?')[0];
        this.showNavbar.set(!NO_NAV_ROUTES.includes(path));
      });

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        map(() => this.activatedRoute),
        map((route) => {
          while (route.firstChild) route = route.firstChild;
          return route;
        }),
        filter((route) => route.outlet === 'primary'),
        mergeMap((route) => route.data),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((data) => {
        this.seoService.updateTags(data['titleKey'], data['descriptionKey']);
      });
  }

  private updateSEO() {
    let route = this.activatedRoute.root;
    while (route.firstChild) route = route.firstChild;
    if (route.outlet === 'primary') {
      const data = route.snapshot.data;
      this.seoService.updateTags(data['titleKey'], data['descriptionKey']);
    }
  }
}
