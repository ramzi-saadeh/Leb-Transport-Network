import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { DriversService } from '../../../services/drivers.service';
import { RatingsService } from '../../../services/ratings.service';
import { RoutesService } from '../../../services/routes.service';
import { AuthService } from '../../../services/auth.service';
import { StarRatingComponent } from '../star-rating/star-rating.component';
import { Driver } from '../../../models/driver.model';
import { Route } from '../../../models/route.model';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-review-by-plate',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, StarRatingComponent, TranslatePipe],
  templateUrl: './review-by-plate.component.html',
  styleUrl: './review-by-plate.component.css',
})
export class ReviewByPlateComponent {
  plateNumber = '';
  driverName = '';
  vehicleType: 'bus' | 'minibus' | 'van' | 'car' = 'bus';
  rating = 0;
  comment = '';
  selectedRouteId = '';

  submitting = signal(false);
  submitted = signal(false);
  existingRatings = signal<any[]>([]);
  routes = signal<Route[]>([]);

  readonly alreadyRated = computed(() =>
    this.existingRatings().some((r: any) => r.deviceId === this.authService.currentDeviceId)
  );

  private readonly driversService = inject(DriversService);
  private readonly ratingsService = inject(RatingsService);
  private readonly routesService = inject(RoutesService);
  private readonly authService = inject(AuthService);
  private readonly location = inject(Location);

  constructor() {
    this.routesService.getRoutes().subscribe(r => this.routes.set(r));
  }

  goBack() { this.location.back(); }

  private ratingSub: any;

  async onPlateInput() {
    this.plateNumber = this.plateNumber.toUpperCase();
    this.existingRatings.set([]);

    if (this.plateNumber.length < 3) return;

    if (this.ratingSub) this.ratingSub.unsubscribe();

    this.ratingSub = this.driversService.getDriverByPlate(this.plateNumber).subscribe((drivers) => {
      if (drivers && drivers.length > 0) {
        // Auto-suggest driver's primary route
        if (drivers[0].routeId && drivers[0].routeId !== 'general') {
          this.selectedRouteId = drivers[0].routeId;
        }
        this.ratingsService.getRatingsForDriver(drivers[0].id!).subscribe((ratings) => {
          this.existingRatings.set(ratings);
        });
      }
    });
  }

  async submitReview() {
    if (!this.plateNumber || this.rating === 0) return;
    this.submitting.set(true);

    try {
      // Find or create driver
      const drivers = await firstValueFrom(this.driversService.getDriverByPlate(this.plateNumber));
      let driverId: string;

      if (drivers && drivers.length > 0) {
        driverId = drivers[0].id!;
        // If user selected a route and the driver's current routeId is 'general', update it
        if (this.selectedRouteId && drivers[0].routeId === 'general') {
          await this.driversService.updateDriverRoute(driverId, this.selectedRouteId);
        }
      } else {
        const newDriver: Omit<Driver, 'id' | 'rating' | 'ratingCount'> = {
          name: this.driverName.trim() || 'Unknown Driver',
          nameAr: 'سائق غير معروف',
          phone: '',
          plateNumber: this.plateNumber,
          routeId: this.selectedRouteId || 'general',
          vehicleType: this.vehicleType,
          isActive: false,
        };
        driverId = await this.driversService.registerDriver(newDriver);
      }

      await this.ratingsService.rateDriver(
        driverId,
        this.rating,
        this.comment,
        this.authService.currentDeviceId,
        this.selectedRouteId || undefined,
      );

      this.submitted.set(true);
    } catch (error) {
      console.error('Error submitting review:', error);
    } finally {
      this.submitting.set(false);
    }
  }
}
