/**
 * Barra de acciones: imprimir y guardar odontograma o periodontograma.
 */
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SaveOdontogramaDialogComponent } from '../save-odontograma-dialog/save-odontograma-dialog.component';

type DentalFormMode = 'odontograma' | 'periodontograma';

@Component({
  selector: 'app-odontograma-actions',
  standalone: true,
  imports: [CommonModule, SaveOdontogramaDialogComponent],
  templateUrl: './odontograma-actions.component.html',
  styleUrls: ['./odontograma-actions.component.scss']
})
export class OdontogramaActionsComponent {
  @Input() activeForm: DentalFormMode = 'odontograma';
  @Output() print = new EventEmitter<void>();

  showSaveDialog = false;

  constructor() {}

  get saveLabel(): string {
    return this.activeForm === 'periodontograma' ? 'Guardar Periodontograma' : 'Guardar';
  }

  handlePrint(): void {
    if (this.print.observers.length > 0) {
      this.print.emit();
    } else {
      window.print();
    }
  }

  openSaveDialog(): void {
    this.showSaveDialog = true;
  }

  onDialogChange(isOpen: boolean): void {
    this.showSaveDialog = isOpen;
  }
}
