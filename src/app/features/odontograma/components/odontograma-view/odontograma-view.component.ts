import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PatientHistoryTableComponent } from '../../../patients/components/patient-history-table/patient-history-table.component';
import { OdontogramaActionsComponent } from '../odontograma-actions/odontograma-actions.component';
import { ToothFacesComponent } from '../tooth-faces/tooth-faces.component';
import { ToothIconComponent } from '../tooth-icon/tooth-icon.component';
import { OdontogramaSidebarComponent } from '../odontograma-sidebar/odontograma-sidebar.component';

type ToothType = 'molar' | 'premolar' | 'canine' | 'incisor';

interface TeethLayout {
  topRight: number[];
  topLeft: number[];
  bottomLeft: number[];
  bottomRight: number[];
}

@Component({
  selector: 'app-odontograma-view',
  standalone: true,
  imports: [
    CommonModule,
    ToothIconComponent,
    ToothFacesComponent,
    OdontogramaSidebarComponent,
    OdontogramaActionsComponent,
    PatientHistoryTableComponent
  ],
  templateUrl: './odontograma-view.component.html',
  styleUrls: ['./odontograma-view.component.scss']
})
export class OdontogramaViewComponent {
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

  getToothType(num: number): ToothType {
    const lastDigit = num % 10;
    if (lastDigit === 8 || lastDigit === 7 || lastDigit === 6) {
      return 'molar';
    }
    if (lastDigit === 5 || lastDigit === 4) {
      return 'premolar';
    }
    if (lastDigit === 3) {
      return 'canine';
    }
    return 'incisor';
  }
}

