import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface Patient {
  nombreApellido: string;
  dni: string;
  email: string;
}

@Component({
  selector: 'app-patient-combobox',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './patient-combobox.component.html',
  styleUrls: ['./patient-combobox.component.scss']
})
export class PatientComboboxComponent {
  @Input() patients: Patient[] = [];
  @Input() value: string = '';

  @Output() valueChange = new EventEmitter<string>();
  @Output() selectPatient = new EventEmitter<Patient | null>();

  isOpen = false;

  get uniquePatients(): Patient[] {
    return Array.from(
      new Map(
        this.patients.map(p => [p.nombreApellido.toLowerCase(), p])
      ).values()
    );
  }

  get filteredPatients(): Patient[] {
    const search = this.value.toLowerCase();
    return this.uniquePatients.filter(p =>
      p.nombreApellido.toLowerCase().includes(search)
    );
  }

  updateValue(newValue: string) {
    this.value = newValue;
    this.valueChange.emit(newValue);
    this.selectPatient.emit(null);
  }

  choosePatient(patient: Patient) {
    this.value = patient.nombreApellido;
    this.valueChange.emit(this.value);
    this.selectPatient.emit(patient);
    this.isOpen = false;
  }
}

