import { Component, inject, computed, input, signal, Signal, effect, viewChild, ElementRef } from '@angular/core';
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
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-driver-profile',
  standalone: true,
  imports: [CommonModule, StarRatingComponent, FormsModule, TranslatePipe],
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
  readonly isOwnProfile = computed(() => this.roleService.driverProfile()?.id === this.id());
  readonly uploadingPhoto = signal(false);
  readonly photoInput = viewChild<ElementRef<HTMLInputElement>>('photoInput');

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

  /** Called from the 📷 button — native picker on device, file input on web. */
  async pickAndUploadPhoto(): Promise<void> {
    if (this.uploadingPhoto()) return;
    if (Capacitor.isNativePlatform()) {
      try {
        const photo = await Camera.getPhoto({
          resultType: CameraResultType.Base64,
          source: CameraSource.Prompt,
          quality: 80,
          width: 150,
          height: 150,
          correctOrientation: true,
        });
        if (!photo.base64String) return;
        const dataUrl = `data:image/jpeg;base64,${photo.base64String}`;
        await this.savePhoto(dataUrl);
      } catch {
        // user cancelled or permission denied — silent
      }
    } else {
      this.photoInput()?.nativeElement.click();
    }
  }

  /** Handles the hidden file input (web fallback). */
  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      input.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be smaller than 5 MB.');
      input.value = '';
      return;
    }
    const dataUrl = await this.resizeToDataUrl(file, 150, 150);
    await this.savePhoto(dataUrl);
    input.value = '';
  }

  private async savePhoto(dataUrl: string): Promise<void> {
    this.uploadingPhoto.set(true);
    try {
      await this.driversService.updateDriver(this.id(), { photoUrl: dataUrl });
    } finally {
      this.uploadingPhoto.set(false);
    }
  }

  /** Resize + center-crop to a square, returns a base64 data URL. */
  private resizeToDataUrl(file: File, w: number, h: number): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        const ratio = Math.max(w / img.width, h / img.height);
        const sw = w / ratio, sh = h / ratio;
        const sx = (img.width - sw) / 2, sy = (img.height - sh) / 2;
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.80));
      };
      img.src = URL.createObjectURL(file);
    });
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
