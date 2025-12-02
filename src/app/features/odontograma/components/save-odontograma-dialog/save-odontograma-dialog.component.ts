import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

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

  formData = signal({
    precioBono: '0',
    precioTratamiento: '0',
    extras: '0',
    montoPago: '0',
    observacionesPago: '',
    observacionesProfesional: ''
  });

  close() {
    this.open = false;
    this.openChange.emit(false);
  }

  updateField(key: string, value: string) {
    this.formData.update(prev => ({ ...prev, [key]: value }));
  }

  calcularTotal() {
    const d = this.formData();
    const total = 
      parseFloat(d.precioBono || '0') +
      parseFloat(d.precioTratamiento || '0') +
      parseFloat(d.extras || '0');
    return total.toFixed(2);
  }

  calcularResto() {
    const d = this.formData();
    const total = parseFloat(this.calcularTotal());
    const pago = parseFloat(d.montoPago || '0');
    return (total - pago).toFixed(2);
  }

  handleSubmit() {
    console.log('Guardando odontograma:', this.formData());
    alert('Odontograma guardado exitosamente');
    this.close();

    this.formData.set({
      precioBono: '0',
      precioTratamiento: '0',
      extras: '0',
      montoPago: '0',
      observacionesPago: '',
      observacionesProfesional: ''
    });
  }
}

