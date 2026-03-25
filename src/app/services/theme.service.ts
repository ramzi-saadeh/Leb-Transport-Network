import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'dark' | 'light';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly THEME_KEY = 'app_theme';
  private readonly currentThemeSignal = signal<Theme>(this.getInitialTheme());
  readonly currentTheme = this.currentThemeSignal.asReadonly();

  constructor() {
    this.applyTheme(this.currentThemeSignal());
    effect(() => {
      const theme = this.currentThemeSignal();
      localStorage.setItem(this.THEME_KEY, theme);
      this.applyTheme(theme);
    });
  }

  setTheme(theme: Theme): void {
    this.currentThemeSignal.set(theme);
  }

  toggleTheme(): void {
    this.currentThemeSignal.set(this.currentThemeSignal() === 'dark' ? 'light' : 'dark');
  }

  private getInitialTheme(): Theme {
    const saved = localStorage.getItem(this.THEME_KEY) as Theme;
    if (saved === 'dark' || saved === 'light') return saved;
    return 'dark';
  }

  private applyTheme(theme: Theme): void {
    document.documentElement.setAttribute('data-theme', theme);
  }
}
