import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { RoleService } from '../../services/role.service';

@Component({
  selector: 'app-role-selection',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './role-selection.component.html',
  styleUrl: './role-selection.component.css'
})
export class RoleSelectionComponent {
  selectPassenger() {
    this.roleService.setRole('passenger');
    this.router.navigate(['/home']);
  }

  selectDriver() {
    this.roleService.setRole('driver');
    this.router.navigate(['/driver/register']);
  }

  private readonly roleService = inject(RoleService);
  private readonly router = inject(Router);
}
