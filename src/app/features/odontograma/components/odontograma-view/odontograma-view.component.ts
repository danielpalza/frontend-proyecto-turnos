/**
 * Contenedor principal del módulo dental: alterna odontograma / periodontograma
 * y agrupa leyenda, formulario, acciones y comentarios.
 */
import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { OdontogramaActionsComponent } from '../odontograma-actions/odontograma-actions.component';
import { OdontogramaLeyendComponent } from '../odontograma-leyend/odontograma-leyend.component';
import { OdontogramaFormComponent } from '../odontograma-form/odontograma-form.component';
import { PeriodontogramaFormComponent } from '../periodontograma-form/periodontograma-form.component';
import { OdontogramaCommentComponent } from '../odontograma-comment/odontograma-comment.component';
import { OdontogramaStateService } from '../../services/odontograma-state.service';

type DentalFormMode = 'odontograma' | 'periodontograma';

@Component({
  selector: 'app-odontograma-view',
  standalone: true,
  imports: [
    CommonModule,
    OdontogramaFormComponent,
    PeriodontogramaFormComponent,
    OdontogramaLeyendComponent,
    OdontogramaActionsComponent,
    OdontogramaCommentComponent,
  ],
  templateUrl: './odontograma-view.component.html',
  styleUrls: ['./odontograma-view.component.scss']
})
export class OdontogramaViewComponent implements OnInit, OnDestroy {
  activeForm: DentalFormMode = 'odontograma';
  loading = true;
  loadError: string | null = null;

  private routeSub?: Subscription;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly stateService: OdontogramaStateService
  ) {}

  ngOnInit(): void {
    this.routeSub = this.route.paramMap.subscribe(params => {
      const idParam = params.get('appointmentId');
      const appointmentId = idParam ? Number(idParam) : NaN;

      if (!idParam || Number.isNaN(appointmentId)) {
        this.router.navigate(['/turnos']);
        return;
      }

      this.loading = true;
      this.loadError = null;
      this.stateService.loadForAppointment(appointmentId).subscribe({
        next: () => {
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.loadError = 'No se pudieron cargar los datos clínicos del turno.';
        }
      });
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  setActiveForm(mode: DentalFormMode): void {
    this.activeForm = mode;
  }
}
