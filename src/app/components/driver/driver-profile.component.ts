import { Component, inject, computed, input, signal, Signal, effect } from '@angular/core';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { CommonModule, Location } from '@angular/common';
import { RatingsService } from '../../services/ratings.service';
import { DriversService } from '../../services/drivers.service';
import { AuthService } from '../../services/auth.service';
import { SEOService } from '../../services/seo.service';
import { StarRatingComponent } from '../shared/star-rating/star-rating.component';
import { FormsModule } from '@angular/forms';
import { switchMap } from 'rxjs';
import { Route } from '../../models/route.model';
import { Driver } from '../../models/driver.model';
import { RoleService } from '../../services/role.service';
import { Rating } from '../../models/rating.model';

@Component({
  selector: 'app-driver-profile',
  standalone: true,
  imports: [CommonModule, StarRatingComponent, FormsModule],
  templateUrl: './driver-profile.component.html',
  styleUrl: './driver-profile.component.css'
})
export class DriverProfileComponent {
  readonly id = input.required<string>();
  readonly driver: Signal<Driver | undefined>;
  readonly ratings: Signal<Rating[]>;
  readonly hasRated = computed(() =>
    this.ratings().some(r => r.deviceId === this.authService.currentDeviceId)
  );
  readonly submitting = signal(false);
  readonly showValidation = signal(false);
  readonly myRating = signal(0);
  readonly myComment = signal('');
  readonly isPassenger = computed(() => this.roleService.isPassenger());

  constructor() {
    this.driver = toSignal(
      toObservable(this.id).pipe(
        switchMap(id => this.driversService.getDriver(id))
      )
    );

    this.ratings = toSignal(
      toObservable(this.id).pipe(
        switchMap(id => this.ratingsService.getRatingsForDriver(id))
      ),
      { initialValue: [] }
    );

    effect(() => {
      const d = this.driver();
      if (d) {
        this.seoService.updateTags(undefined, undefined, {
          image: '', // Could add driver photo if available
        });
        // Override manually for dynamic content
        const title = `${d.name} | Lebanon Bus Driver`;
        document.title = title;
      }
    });
  }

  private readonly seoService = inject(SEOService);
  private readonly roleService = inject(RoleService);

  private readonly driversService = inject(DriversService);
  private readonly ratingsService = inject(RatingsService);
  private readonly authService = inject(AuthService);
  private readonly location = inject(Location);

  goBack() { this.location.back(); }

  vehicleLabel(type: string): string {
    const map: Record<string, string> = {
      minibus: '🚐 Minibus', bus: '🚌 Bus', van: '🚙 Van', service: '🚗 Service'
    };
    return map[type] ?? type;
  }

  async submitRating(): Promise<void> {
    if (this.myRating() === 0) {
      this.showValidation.set(true);
      return;
    }
    this.submitting.set(true);
    try {
      await this.ratingsService.rateDriver(
        this.id(), this.myRating(), this.myComment(), this.authService.currentDeviceId
      );
    } finally {
      this.submitting.set(false);
    }
  }
}
