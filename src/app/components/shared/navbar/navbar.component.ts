import { Component, inject, computed } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { RoleService } from '../../../services/role.service';
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
  private readonly langService = inject(LanguageService);

  readonly isPassenger = computed(() => this.roleService.isPassenger());
  readonly isDriver = computed(() => this.roleService.isDriver());
  readonly currentLang = computed(() => this.langService.currentLang());
  readonly isRtl = computed(() => this.langService.isRtl());

  toggleLanguage() {
    this.langService.toggleLanguage();
  }
}
