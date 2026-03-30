import { Injectable, signal } from '@angular/core';

const FAVORITES_KEY = 'favorite_routes';

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private readonly ids = signal<string[]>(this.load());
  readonly favoriteIds = this.ids.asReadonly();

  isFavorite(routeId: string): boolean {
    return this.ids().includes(routeId);
  }

  toggle(routeId: string): void {
    const current = this.ids();
    if (current.includes(routeId)) {
      this.ids.set(current.filter(id => id !== routeId));
    } else {
      this.ids.set([...current, routeId]);
    }
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(this.ids()));
  }

  private load(): string[] {
    try {
      const s = localStorage.getItem(FAVORITES_KEY);
      return s ? JSON.parse(s) : [];
    } catch { return []; }
  }
}
