/** Bloque reutilizable de título + textarea para observaciones del odontograma. */
import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-odontograma-comment-component',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './odontograma-comment.component.html',
  styleUrls: ['./odontograma-comment.component.scss']
})
export class OdontogramaCommentComponent {
  @Input() title = '';   // Encabezado del bloque
  @Input() text = '';    // Contenido del textarea (two-way desde el padre)
  @Input() rows = 3;     // Filas visibles del textarea
}
