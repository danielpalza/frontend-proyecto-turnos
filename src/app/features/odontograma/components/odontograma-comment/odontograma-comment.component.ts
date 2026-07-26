/**
 * Bloque reutilizable de título + contenido para los paneles del odontograma. Las tres variantes de
 * comentarios muestran un textarea; la de historia clínica, la lista de antecedentes del paciente.
 */
import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Anamnesis, EMPTY_ANAMNESIS, hasAnamnesis } from '../../../../core/utils/anamnesis.util';
import { OdontogramaStateService } from '../../services/odontograma-state.service';

const CLINICAL_HISTORY_TITLE = 'Historia clinica del paciente';

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
  /** Antecedentes del paciente: solo se usa en la variante de historia clínica. */
  historiaClinica: Anamnesis = EMPTY_ANAMNESIS;
  /** El panel admite escritura por su tipo: turno anterior e historia clínica nunca la admiten. */
  isEditable = false;
  /** El turno sigue abierto: si tiene un registro clínico posterior, ningún panel se edita. */
  recordEditable = true;

  get isClinicalHistory(): boolean {
    return this.title === CLINICAL_HISTORY_TITLE;
  }

  get hasHistoriaClinica(): boolean {
    return hasAnamnesis(this.historiaClinica);
  }

  private sub?: Subscription;
  private editableSub?: Subscription;

  constructor(private readonly stateService: OdontogramaStateService) {}

  ngOnInit(): void {
    this.editableSub = this.stateService.editable$.subscribe(v => (this.recordEditable = v));

    if (this.title === 'Comentarios del turno') {
      this.isEditable = true;
      this.sub = this.stateService.comentario$.subscribe(v => (this.value = v));
    } else if (this.title === 'Plan de tratamiento') {
      this.isEditable = true;
      this.sub = this.stateService.planTratamiento$.subscribe(v => (this.value = v));
    } else if (this.title === 'Comentarios del turno anterior') {
      this.sub = this.stateService.comentarioAnterior$.subscribe(v => (this.value = v));
    } else if (this.isClinicalHistory) {
      this.sub = this.stateService.historiaClinica$.subscribe(v => (this.historiaClinica = v));
    }
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.editableSub?.unsubscribe();
  }

  onValueChange(value: string): void {
    if (this.title === 'Comentarios del turno') {
      this.stateService.setComentario(value);
    } else if (this.title === 'Plan de tratamiento') {
      this.stateService.setPlanTratamiento(value);
    }
  }
}
