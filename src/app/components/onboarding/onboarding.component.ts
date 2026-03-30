import { Component, inject, signal, computed, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LanguageService } from '../../services/language.service';
import { ThemeService } from '../../services/theme.service';
import { RoleService } from '../../services/role.service';
import { RoutesService } from '../../services/routes.service';
import { NotificationsService } from '../../services/notifications.service';
import { Route } from '../../models/route.model';

export type OnboardingStep = 'language' | 'theme' | 'role' | 'route' | 'done';
const STEPS: OnboardingStep[] = ['language', 'theme', 'role', 'route'];
const ONBOARDING_KEY = 'onboarding_done';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './onboarding.component.html',
  styleUrl: './onboarding.component.css',
})
export class OnboardingComponent {
  private readonly langService = inject(LanguageService);
  private readonly themeService = inject(ThemeService);
  private readonly roleService = inject(RoleService);
  private readonly routesService = inject(RoutesService);
  private readonly notificationsService = inject(NotificationsService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);

  readonly stepIndex = signal(0);
  readonly selectedLang = signal(this.langService.currentLang());
  readonly selectedTheme = signal(this.themeService.currentTheme());
  readonly selectedRole = signal<'passenger' | 'driver' | null>(null);
  readonly selectedRouteId = signal('');

  readonly routes: Signal<Route[]>;
  readonly currentStep = computed(() => STEPS[this.stepIndex()]);
  readonly totalSteps = STEPS.length;
  readonly isLast = computed(() => this.stepIndex() === STEPS.length - 1);

  constructor() {
    this.routes = toSignal(this.routesService.getRoutes(), { initialValue: [] });
  }

  setLang(lang: 'en' | 'ar'): void {
    this.selectedLang.set(lang);
    this.langService.setLanguage(lang);
  }

  setTheme(theme: 'dark' | 'light'): void {
    this.selectedTheme.set(theme);
    this.themeService.setTheme(theme);
  }

  setRole(role: 'passenger' | 'driver'): void {
    this.selectedRole.set(role);
  }

  next(): void {
    const step = this.currentStep();
    // Skip route step for drivers
    if (step === 'role' && this.selectedRole() === 'driver') {
      this.finish();
      return;
    }
    if (this.isLast()) {
      this.finish();
    } else {
      this.stepIndex.update((i) => i + 1);
    }
  }

  canNext(): boolean {
    switch (this.currentStep()) {
      case 'language':
        return true;
      case 'theme':
        return true;
      case 'role':
        return this.selectedRole() !== null;
      case 'route':
        return true; // route is optional
      default:
        return false;
    }
  }

  finish(): void {
    this.roleService.setRole(this.selectedRole()!);

    if (this.selectedRole() === 'passenger' && this.selectedRouteId()) {
      this.roleService.updatePassengerProfile({
        name: '',
        defaultRouteId: this.selectedRouteId(),
      });
    }

    localStorage.setItem(ONBOARDING_KEY, 'true');
    // Request notification permission right after onboarding — best time to ask
    this.notificationsService.init();

    if (this.selectedRole() === 'driver') {
      this.router.navigate(['/driver/register']);
    } else {
      this.router.navigate(['/home']);
    }
  }

  routeLabel(r: Route): string {
    return this.translate.currentLang === 'ar' ? r.nameAr : r.name;
  }
}
