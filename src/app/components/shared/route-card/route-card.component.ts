import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Route } from '../../../models/route.model';

@Component({
  selector: 'app-route-card',
  imports: [RouterLink],
  templateUrl: './route-card.component.html',
  styleUrl: './route-card.component.css'
})
export class RouteCardComponent {
  readonly route = input.required<Route>();

  formatPrice(p: number): string {
    return p >= 1000 ? (p / 1000).toFixed(0) + 'k' : p.toString();
  }
}
