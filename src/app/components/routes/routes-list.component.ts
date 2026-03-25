import { Component, inject, signal, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Location } from '@angular/common';
import { RoutesService } from '../../services/routes.service';
import { RouteCardComponent } from '../shared/route-card/route-card.component';
import { Route } from '../../models/route.model';

@Component({
  selector: 'app-routes-list',
  standalone: true,
  imports: [CommonModule, RouteCardComponent],
  templateUrl: './routes-list.component.html',
  styleUrl: './routes-list.component.css'
})
export class RoutesListComponent {
  readonly routes: Signal<Route[]>;
  readonly loading = signal(false);

  constructor() {
    this.routes = toSignal(this.routesService.getRoutes(), { initialValue: [] });
  }

  private readonly routesService = inject(RoutesService);
  private readonly location = inject(Location);

  goBack() { this.location.back(); }

  async seedRoutes(): Promise<void> {
    await this.routesService.seedRoutes();
  }
}
