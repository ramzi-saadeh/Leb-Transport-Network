import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/splash/splash.component').then((m) => m.SplashComponent),
    data: { titleKey: 'SPLASH.TITLE', descriptionKey: 'SPLASH.DESC' },
  },
  {
    path: 'onboarding',
    loadComponent: () =>
      import('./components/onboarding/onboarding.component').then((m) => m.OnboardingComponent),
    data: { titleKey: 'ONBOARDING.PAGE_TITLE', descriptionKey: 'ONBOARDING.PAGE_TITLE' },
  },
  {
    path: 'home',
    loadComponent: () => import('./components/home/home.component').then((m) => m.HomeComponent),
    data: { titleKey: 'HOME.TITLE', descriptionKey: 'HOME.DESC' },
  },
  {
    path: 'role-selection',
    loadComponent: () =>
      import('./components/role-selection/role-selection.component').then(
        (m) => m.RoleSelectionComponent
      ),
    data: { titleKey: 'ROLE.TITLE', descriptionKey: 'ROLE.DESC' },
  },
  {
    path: 'routes',
    loadComponent: () =>
      import('./components/routes/routes-list.component').then((m) => m.RoutesListComponent),
    data: { titleKey: 'ROUTES.TITLE', descriptionKey: 'ROUTES.DESC' },
  },
  {
    path: 'routes/:id',
    loadComponent: () =>
      import('./components/routes/route-detail.component').then((m) => m.RouteDetailComponent),
    // Dynamic titles will be handled in the component
  },
  {
    path: 'map',
    loadComponent: () => import('./components/map/map.component').then((m) => m.MapComponent),
    data: { titleKey: 'MAP.TITLE', descriptionKey: 'MAP.DESC' },
  },
  {
    path: 'drivers/:id',
    loadComponent: () =>
      import('./components/driver/driver-profile.component').then((m) => m.DriverProfileComponent),
    // Dynamic titles will be handled in the component
  },
  {
    path: 'driver/register',
    loadComponent: () =>
      import('./components/driver/driver-register.component').then(
        (m) => m.DriverRegisterComponent
      ),
    data: { titleKey: 'DRIVER_REG.TITLE', descriptionKey: 'DRIVER_REG.DESC' },
  },
  {
    path: 'driver/dashboard',
    loadComponent: () =>
      import('./components/driver/driver-dashboard.component').then(
        (m) => m.DriverDashboardComponent
      ),
    data: { titleKey: 'DASHBOARD.TITLE', descriptionKey: 'DASHBOARD.DESC' },
  },
  {
    path: 'driver/settings',
    loadComponent: () =>
      import('./components/settings/settings.component').then((m) => m.SettingsComponent),
    data: { titleKey: 'SETTINGS.TITLE', descriptionKey: 'SETTINGS.SUBTITLE' },
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./components/settings/settings.component').then((m) => m.SettingsComponent),
    data: { titleKey: 'SETTINGS.TITLE', descriptionKey: 'SETTINGS.SUBTITLE' },
  },
  {
    path: 'waiting',
    loadComponent: () =>
      import('./components/waiting/waiting.component').then((m) => m.WaitingComponent),
    data: { titleKey: 'WAITING.TITLE', descriptionKey: 'WAITING.DESC' },
  },
  {
    path: 'review-by-plate',
    loadComponent: () =>
      import('./components/shared/review-by-plate/review-by-plate.component').then(
        (m) => m.ReviewByPlateComponent
      ),
    data: { titleKey: 'REVIEW.TITLE', descriptionKey: 'REVIEW.DESC' },
  },

  {
    path: '**',
    redirectTo: '',
  },
];
