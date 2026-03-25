import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RoleService } from '../../services/role.service';
import { OnboardingComponent } from '../onboarding/onboarding.component';

const ONBOARDING_KEY = 'onboarding_done';

@Component({
  selector: 'app-splash',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './splash.component.html',
  styleUrl: './splash.component.css',
})
export class SplashComponent implements OnInit, OnDestroy {
  private splashTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.splashTimer = setTimeout(() => {
      // First-ever launch: show onboarding wizard
      const onboardingDone = localStorage.getItem(ONBOARDING_KEY) === 'true';
      if (!onboardingDone) {
        this.router.navigate(['/onboarding']);
        return;
      }
      if (this.roleService.hasRole()) {
        if (this.roleService.isDriver()) {
          if (this.roleService.isRegistered()) {
            this.router.navigate(['/driver/dashboard']);
          } else {
            this.router.navigate(['/driver/register']);
          }
        } else {
          this.router.navigate(['/home']);
        }
      } else {
        this.router.navigate(['/role-selection']);
      }
    }, 2000);
  }

  private readonly router = inject(Router);
  private readonly roleService = inject(RoleService);

  ngOnDestroy(): void {
    if (this.splashTimer) clearTimeout(this.splashTimer);
  }
}
