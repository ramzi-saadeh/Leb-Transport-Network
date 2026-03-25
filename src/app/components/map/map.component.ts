import { Component, inject } from '@angular/core';
import { Location } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './map.component.html',
  styleUrl: './map.component.css'
})
export class MapComponent {
  private readonly location = inject(Location);
  goBack() { this.location.back(); }
}
