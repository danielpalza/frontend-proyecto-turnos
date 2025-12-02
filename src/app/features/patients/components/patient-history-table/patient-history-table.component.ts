import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface HistoryEntry {
  id: string;
  patient: string;
  date: string;
  observations: string;
}

@Component({
  selector: 'app-patient-history-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './patient-history-table.component.html',
  styleUrls: ['./patient-history-table.component.scss'],
})
export class PatientHistoryTableComponent {
  @Input() entries: HistoryEntry[] = [];

  get dataToShow(): HistoryEntry[] {
    if (this.entries && this.entries.length > 0) return this.entries;

    // Datos mock si no vienen desde el padre
    return [
      {
        id: '1',
        patient: 'María González',
        date: '2024-11-15',
        observations: 'Limpieza dental - Control de caries en molar 36',
      },
      {
        id: '2',
        patient: 'María González',
        date: '2024-11-10',
        observations: 'Obturación de pieza 16 - Seguimiento en 6 meses',
      },
      {
        id: '3',
        patient: 'María González',
        date: '2024-11-05',
        observations: 'Extracción de pieza 48 - Tratamiento con antibiótico',
      },
    ];
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}

