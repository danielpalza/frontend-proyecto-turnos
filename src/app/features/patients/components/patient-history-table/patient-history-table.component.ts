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
    return this.entries || [];
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}

