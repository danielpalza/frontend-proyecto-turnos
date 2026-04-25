import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToothFacesComponent } from '../tooth-faces/tooth-faces.component';

interface TeethLayout {
  topRight: number[];
  topLeft: number[];
  bottomLeft: number[];
  bottomRight: number[];
}

@Component({
  selector: 'app-odontograma-form',
  standalone: true,
  imports: [CommonModule, ToothFacesComponent],
  templateUrl: './odontograma-form.component.html',
  styleUrls: ['./odontograma-form.component.scss']
})
export class OdontogramaFormComponent {
  permanentTeeth: TeethLayout = {
    topRight: [18, 17, 16, 15, 14, 13, 12, 11],
    topLeft: [21, 22, 23, 24, 25, 26, 27, 28],
    bottomLeft: [31, 32, 33, 34, 35, 36, 37, 38],
    bottomRight: [48, 47, 46, 45, 44, 43, 42, 41],
  };

  primaryTeeth: TeethLayout = {
    topRight: [55, 54, 53, 52, 51],
    topLeft: [61, 62, 63, 64, 65],
    bottomRight: [85, 84, 83, 82, 81],
    bottomLeft: [71, 72, 73, 74, 75],
  };
}

