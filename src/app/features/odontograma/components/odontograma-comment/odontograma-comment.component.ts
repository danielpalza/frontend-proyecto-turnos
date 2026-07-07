/** Bloque reutilizable de título + textarea para observaciones del odontograma. */
import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { OdontogramaStateService } from '../../services/odontograma-state.service';

@Component({
  selector: 'app-odontograma-comment-component',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './odontograma-comment.component.html',
  styleUrls: ['./odontograma-comment.component.scss']
})
export class OdontogramaCommentComponent implements OnInit, OnDestroy {
  @Input() title = '';
  @Input() rows = 3;

  value = '';
  isEditable = false;

  private sub?: Subscription;

  constructor(private readonly stateService: OdontogramaStateService) {}

  ngOnInit(): void {
    if (this.title === 'Comentarios del turno') {
      this.isEditable = true;
      this.sub = this.stateService.comentario$.subscribe(v => (this.value = v));
    } else if (this.title === 'Plan de tratamiento') {
      this.isEditable = true;
      this.sub = this.stateService.planTratamiento$.subscribe(v => (this.value = v));
    } else if (this.title === 'Comentarios del turno anterior') {
      this.sub = this.stateService.comentarioAnterior$.subscribe(v => (this.value = v));
    } else if (this.title === 'Historia clinica del paciente') {
      this.sub = this.stateService.historiaClinica$.subscribe(v => (this.value = v));
    }
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  onValueChange(value: string): void {
    if (this.title === 'Comentarios del turno') {
      this.stateService.setComentario(value);
    } else if (this.title === 'Plan de tratamiento') {
      this.stateService.setPlanTratamiento(value);
    }
  }
}
