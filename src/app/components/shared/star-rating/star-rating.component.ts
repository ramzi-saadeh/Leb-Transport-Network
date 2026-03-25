import { Component, input, output, signal, model } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-star-rating',
  imports: [CommonModule],
  templateUrl: './star-rating.component.html',
  styleUrl: './star-rating.component.css'
})
export class StarRatingComponent {
  readonly value = model(0);
  readonly readonly = input(false);
  readonly showCount = input(false);
  readonly count = input(0);
  readonly stars = [1, 2, 3, 4, 5];
  readonly hoveredStar = signal(0);

  rated = output<number>();

  onSelect(star: number): void {
    if (!this.readonly()) {
      this.value.set(star);
      this.rated.emit(star);
    }
  }
}
