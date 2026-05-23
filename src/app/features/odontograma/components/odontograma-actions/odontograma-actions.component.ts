/**
 * Barra de acciones: imprimir y abrir el diálogo de guardado del odontograma.
 */
import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SaveOdontogramaDialogComponent } from '../save-odontograma-dialog/save-odontograma-dialog.component';

@Component({
  selector: 'app-odontograma-actions',
  standalone: true,
  imports: [CommonModule, SaveOdontogramaDialogComponent],
  templateUrl: './odontograma-actions.component.html',
  styleUrls: ['./odontograma-actions.component.scss']
})
export class OdontogramaActionsComponent {
  @Output() print = new EventEmitter<void>();
  
  showSaveDialog = false;

  /** Emite print al padre o usa window.print() si no hay listener. */
  handlePrint(): void {
    if (this.print.observers.length > 0) {
      this.print.emit();
    } else {
      window.print();
    }
  }

  /** Muestra el modal de guardar odontograma. */
  openSaveDialog(): void {
    this.showSaveDialog = true;
  }

  /** Sincroniza visibilidad del modal cuando el hijo lo cierra. */
  onDialogChange(isOpen: boolean): void {
    this.showSaveDialog = isOpen;
  }
}

