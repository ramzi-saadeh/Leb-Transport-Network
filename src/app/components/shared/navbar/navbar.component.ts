import { Component, inject, computed } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap, of } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';
import { RoleService } from '../../../services/role.service';
import { DriversService } from '../../../services/drivers.service';
import { CommonModule } from '@angular/common';
import { LanguageService } from '../../../services/language.service';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent {
  private readonly roleService = inject(RoleService);
  private readonly driversService = inject(DriversService);
  private readonly langService = inject(LanguageService);

  readonly isPassenger = computed(() => this.roleService.isPassenger());
  readonly isDriver = computed(() => this.roleService.isDriver());
  readonly currentLang = computed(() => this.langService.currentLang());
  readonly isRtl = computed(() => this.langService.isRtl());

  // Live duty status from Firestore
  readonly driverIsActive = toSignal(
    toObservable(this.roleService.driverProfile).pipe(
      switchMap(profile => profile?.id ? this.driversService.getDriver(profile.id) : of(null))
    ),
    { initialValue: null }
  );

  get isOnDuty(): boolean {
    return this.driverIsActive()?.isActive ?? false;
  }

  async toggleDuty(): Promise<void> {
    const profile = this.roleService.driverProfile();
    if (!profile?.id) return;
    await this.driversService.updateDriver(profile.id, { isActive: !this.isOnDuty });
  }

  toggleLanguage() {
    this.langService.toggleLanguage();
  }
}
