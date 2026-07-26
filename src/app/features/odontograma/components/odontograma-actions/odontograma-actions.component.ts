/**
 * Barra de acciones: imprimir y guardar odontograma o periodontograma.
 */
import { Component, DestroyRef, EventEmitter, Input, Output, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { SaveOdontogramaDialogComponent } from '../save-odontograma-dialog/save-odontograma-dialog.component';
import { OdontogramaStateService } from '../../services/odontograma-state.service';

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
  /** Turno cerrado por tener un registro clínico posterior: no hay nada para guardar. */
  editable = true;

  private readonly destroyRef = inject(DestroyRef);

  constructor(private readonly stateService: OdontogramaStateService) {
    this.stateService.editable$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(editable => (this.editable = editable));
  }

  get saveLabel(): string {
    return 'Guardar';
  }

  handlePrint(): void {
    if (this.print.observers.length > 0) {
      this.print.emit();
    } else {
      window.print();
    }
  }

  openSaveDialog(): void {
    if (!this.editable) return;
    this.showSaveDialog = true;
  }

  onDialogChange(isOpen: boolean): void {
    this.showSaveDialog = isOpen;
  }
}
