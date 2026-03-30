import { Component, inject, signal, computed, Signal, OnDestroy, viewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { of } from 'rxjs';

import { RoleService } from '../../services/role.service';
import { LanguageService } from '../../services/language.service';
import { ThemeService } from '../../services/theme.service';
import { DriversService } from '../../services/drivers.service';
import { RoutesService } from '../../services/routes.service';
import { Route } from '../../models/route.model';
import { Driver } from '../../models/driver.model';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslateModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css',
})
export class SettingsComponent implements OnDestroy {
  readonly currentLang = computed(() => this.langService.currentLang());
  readonly currentTheme = computed(() => this.themeService.currentTheme());
  readonly isPassenger = computed(() => this.roleService.isPassenger());
  readonly isDriver = computed(() => this.roleService.isDriver());
  readonly isRegistered = computed(() => this.roleService.isRegistered());
  readonly routes: Signal<Route[]>;

  // Passenger Form Signals
  readonly passengerName = signal('');
  readonly passengerRouteId = signal('');
  readonly isSubmittingPassenger = signal(false);
  readonly passengerSuccessMsg = signal('');
  readonly passengerErrorMsg = signal('');

  // Driver Form Signals
  readonly name = signal('');
  readonly phone = signal('');
  readonly plateNumber = signal('');
  readonly routeId = signal('');
  readonly vehicleType = signal<'bus' | 'minibus' | 'van' | 'car'>('bus');
  readonly isSubmitting = signal(false);
  readonly successMsg = signal('');
  readonly errorMsg = signal('');
  readonly uploadingPhoto = signal(false);
  readonly photoInput = viewChild<ElementRef<HTMLInputElement>>('photoInput');
  // Live driver doc to display current photoUrl
  readonly driverDoc: Signal<Driver | undefined>;

  private readonly langService = inject(LanguageService);
  private readonly themeService = inject(ThemeService);
  private readonly roleService = inject(RoleService);
  private readonly driversService = inject(DriversService);
  private readonly routesService = inject(RoutesService);
  private readonly router = inject(Router);

  private passengerMsgTimer: ReturnType<typeof setTimeout> | null = null;
  private driverMsgTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnDestroy(): void {
    if (this.passengerMsgTimer) clearTimeout(this.passengerMsgTimer);
    if (this.driverMsgTimer) clearTimeout(this.driverMsgTimer);
  }

  constructor() {
    this.routes = toSignal(this.routesService.getRoutes(), { initialValue: [] });

    // Load passenger data
    const pp = this.roleService.passengerProfile();
    if (pp) {
      this.passengerName.set(pp.name);
      this.passengerRouteId.set(pp.defaultRouteId);
    }

    // Load driver data if applicable
    const p = this.roleService.driverProfile();
    if (p) {
      this.name.set(p.name);
      this.phone.set(p.phone);
      this.plateNumber.set(p.plateNumber);
      this.routeId.set(p.routeId);
      this.vehicleType.set((p.vehicleType as any) ?? 'bus');
    }

    // Live driver doc for photoUrl
    this.driverDoc = toSignal(
      p?.id ? this.driversService.getDriver(p.id) : of(undefined)
    );
  }

  setLanguage(lang: 'en' | 'ar') {
    this.langService.setLanguage(lang);
  }

  setTheme(theme: 'dark' | 'light') {
    this.themeService.setTheme(theme);
  }

  async savePassengerSettings() {
    this.isSubmittingPassenger.set(true);
    this.passengerSuccessMsg.set('');
    this.passengerErrorMsg.set('');

    try {
      this.roleService.updatePassengerProfile({
        name: this.passengerName(),
        defaultRouteId: this.passengerRouteId(),
      });
      this.passengerSuccessMsg.set('Settings saved!');
      if (this.passengerMsgTimer) clearTimeout(this.passengerMsgTimer);
      this.passengerMsgTimer = setTimeout(() => this.passengerSuccessMsg.set(''), 3000);
    } catch (err: any) {
      this.passengerErrorMsg.set('Failed to save settings');
    } finally {
      this.isSubmittingPassenger.set(false);
    }
  }

  async saveDriverSettings() {
    const p = this.roleService.driverProfile();
    if (!p) return;

    this.isSubmitting.set(true);
    this.successMsg.set('');
    this.errorMsg.set('');

    try {
      await this.driversService.updateDriver(p.id, {
        name: this.name(),
        phone: this.phone(),
        plateNumber: this.plateNumber(),
        routeId: this.routeId(),
        vehicleType: this.vehicleType(),
      });

      this.roleService.updateProfile({
        ...p,
        name: this.name(),
        phone: this.phone(),
        plateNumber: this.plateNumber(),
        routeId: this.routeId(),
        vehicleType: this.vehicleType(),
      });

      this.successMsg.set('Settings saved successfully!');
      if (this.driverMsgTimer) clearTimeout(this.driverMsgTimer);
      this.driverMsgTimer = setTimeout(() => this.successMsg.set(''), 3000);
    } catch (err: any) {
      this.errorMsg.set('Failed to save settings: ' + err.message);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  logout() {
    if (confirm('Are you sure you want to sign out and clear your local registration?')) {
      this.roleService.setRegistered(false);
      this.router.navigate(['/']);
    }
  }

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
        await this.savePhoto(`data:image/jpeg;base64,${photo.base64String}`);
      } catch {
        // user cancelled or permission denied — silent
      }
    } else {
      this.photoInput()?.nativeElement.click();
    }
  }

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
    const p = this.roleService.driverProfile();
    if (!p) return;
    this.uploadingPhoto.set(true);
    try {
      await this.driversService.updateDriver(p.id, { photoUrl: dataUrl });
    } finally {
      this.uploadingPhoto.set(false);
    }
  }

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
}
