import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-odontograma-leyend',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './odontograma-leyend.component.html',
  styleUrls: ['./odontograma-leyend.component.scss']
})
export class OdontogramaLeyendComponent {
  readonly estados = [
    'Ausencia',
    'Implante',
    'Corona',
    'Puente',
    'Eripcion',
    'Retención',
    'Erupcion',
    'Impactado',
    'Extraer',
    '',
  ];

  readonly condiciones = [
    'Endodoncia',
    'Fractura',
    'Lesion',
    'Dolor/Sensibilidad',
  ];

  readonly movilidadOpciones = ['M0', 'M1', 'M2', 'M3'];
}
