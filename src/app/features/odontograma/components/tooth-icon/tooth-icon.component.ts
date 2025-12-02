import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tooth-icon',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tooth-icon.component.html'
})
export class ToothIconComponent {
  @Input() type: 'molar' | 'premolar' | 'canine' | 'incisor' = 'molar';
  @Input() position: 'top' | 'bottom' = 'top';

  get isTop() {
    return this.position === 'top';
  }
}

