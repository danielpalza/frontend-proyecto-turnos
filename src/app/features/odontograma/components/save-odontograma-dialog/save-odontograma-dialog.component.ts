import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OdontogramaStateService } from '../../services/odontograma-state.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { OdontogramaPagoDelta } from '../../../../core/models/odontograma.model';

@Component({
  selector: 'app-save-odontograma-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './save-odontograma-dialog.component.html',
  styleUrls: ['./save-odontograma-dialog.component.scss']
})
export class SaveOdontogramaDialogComponent {
  @Input() open = false;
  @Output() openChange = new EventEmitter<boolean>();

  saving = false;
  readonly saveError = signal<string | null>(null);

  formData = signal({
    precioBono: '0',
    precioTratamiento: '0',
    extras: '0',
    montoPago: '0',
    observacionesPago: '',
    observacionesProfesional: ''
  });

  constructor(
    private readonly stateService: OdontogramaStateService,
    private readonly notification: NotificationService
  ) {}

  close(): void {
    this.open = false;
    this.openChange.emit(false);
    this.saveError.set(null);
  }

  updateField(key: string, value: string): void {
    this.formData.update(prev => ({ ...prev, [key]: value }));
  }

  calcularTotal(): string {
    const d = this.formData();
    const total =
      parseFloat(d.precioBono || '0') +
      parseFloat(d.precioTratamiento || '0') +
      parseFloat(d.extras || '0');
    return total.toFixed(2);
  }

  calcularResto(): string {
    const d = this.formData();
    const total = parseFloat(this.calcularTotal());
    const pago = parseFloat(d.montoPago || '0');
    return (total - pago).toFixed(2);
  }

  handleSubmit(): void {
    if (this.saving) {
      return;
    }

    const d = this.formData();
    const pago: OdontogramaPagoDelta = {
      precioBono: parseFloat(d.precioBono || '0'),
      precioTratamiento: parseFloat(d.precioTratamiento || '0'),
      extras: parseFloat(d.extras || '0'),
      montoPago: parseFloat(d.montoPago || '0'),
      observaciones: d.observacionesPago || undefined,
      observacionesTurno: d.observacionesProfesional || undefined
    };

    this.saving = true;
    this.saveError.set(null);
    this.stateService.saveOdontogram(pago).subscribe({
      next: () => {
        this.notification.showSuccess('Odontograma guardado correctamente');
        this.saving = false;
        this.saveError.set(null);
        this.close();
        this.formData.set({
          precioBono: '0',
          precioTratamiento: '0',
          extras: '0',
          montoPago: '0',
          observacionesPago: '',
          observacionesProfesional: ''
        });
      },
      error: () => {
        this.saving = false;
        this.saveError.set('Error al guardar. Verifica los datos e intenta nuevamente.');
      }
    });
  }
}
