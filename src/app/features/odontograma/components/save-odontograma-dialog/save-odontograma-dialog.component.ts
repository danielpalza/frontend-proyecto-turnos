import { Component, Input, Output, EventEmitter, Signal, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
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
  private _open = false;

  @Input()
  set open(val: boolean) {
    const wasClosed = !this._open;
    this._open = val;
    if (val && wasClosed) {
      this.prefillFromAppointment();
    }
  }
  get open(): boolean {
    return this._open;
  }

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

  // Textos de los paneles de comentarios, para el resumen de la columna derecha.
  readonly comentarioTurno: Signal<string>;
  readonly planTratamiento: Signal<string>;
  readonly comentarioAnterior: Signal<string>;
  readonly historiaClinica: Signal<string>;

  constructor(
    private readonly stateService: OdontogramaStateService,
    private readonly notification: NotificationService,
    private readonly router: Router
  ) {
    this.comentarioTurno = toSignal(this.stateService.comentario$, { initialValue: '' });
    this.planTratamiento = toSignal(this.stateService.planTratamiento$, { initialValue: '' });
    this.comentarioAnterior = toSignal(this.stateService.comentarioAnterior$, { initialValue: '' });
    this.historiaClinica = toSignal(this.stateService.historiaClinica$, { initialValue: '' });
  }

  private prefillFromAppointment(): void {
    const p = this.stateService.appointmentPaymentSnapshot;
    this.formData.set({
      precioBono: p.precioBono > 0 ? p.precioBono.toFixed(2) : '0',
      precioTratamiento: p.precioTratamiento > 0 ? p.precioTratamiento.toFixed(2) : '0',
      extras: p.extras > 0 ? p.extras.toFixed(2) : '0',
      montoPago: p.montoPago > 0 ? p.montoPago.toFixed(2) : '0',
      observacionesPago: p.observaciones,
      observacionesProfesional: p.observacionesTurno
    });
  }

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
    this.stateService.saveTurnoCompleto(pago).subscribe({
      next: () => {
        this.notification.showSuccess('Cambios guardados correctamente');
        this.saving = false;
        this.close();
        this.router.navigate(['/turnos']);
      },
      error: () => {
        this.saving = false;
        this.saveError.set('Error al guardar. Verifica los datos e intenta nuevamente.');
      }
    });
  }
}
