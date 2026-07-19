import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type OdontoIconName =
  | 'ausencia'
  | 'implante'
  | 'corona'
  | 'puente'
  | 'retencion'
  | 'erupcion'
  | 'impactado'
  | 'extraer'
  | 'endodoncia'
  | 'fractura'
  | 'lesion'
  | 'dolor-sensibilidad'
  | 'm1'
  | 'm2'
  | 'm3'
  | 'f1'
  | 'f2'
  | 'f3';

/**
 * Renderiza los iconos propios del odontograma (nombre en `name`) o, si `name`
 * no coincide con ninguno, cae al fallback legacy tratándolo como clase de Bootstrap Icons
 * (usado por M0/F0, que aún no tienen SVG propio).
 */
@Component({
  selector: 'app-odonto-icon',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './odonto-icon.component.html',
  styleUrls: ['./odonto-icon.component.scss']
})
export class OdontoIconComponent {
  @Input() name: OdontoIconName | string = '';
}
