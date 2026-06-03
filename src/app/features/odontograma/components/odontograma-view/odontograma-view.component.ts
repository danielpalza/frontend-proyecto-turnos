/**
 * Contenedor principal del módulo dental: alterna odontograma / periodontograma
 * y agrupa leyenda, formulario, acciones y comentarios.
 */
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, distinctUntilChanged, finalize, map, of, switchMap } from 'rxjs';
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
export class OdontogramaViewComponent implements OnInit {
  activeForm: DentalFormMode = 'odontograma';
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly stateService: OdontogramaStateService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(
      map(params => params.get('appointmentId')),
      distinctUntilChanged(),
      switchMap(idParam => {
        const appointmentId = idParam ? Number(idParam) : NaN;

        if (!idParam || Number.isNaN(appointmentId)) {
          this.router.navigate(['/turnos']);
          return of(null);
        }

        this.loading.set(true);
        this.loadError.set(null);

        return this.stateService.loadForAppointment(appointmentId).pipe(
          catchError(() => {
            this.loadError.set('No se pudieron cargar los datos clínicos del turno.');
            return of(undefined);
          }),
          finalize(() => {
            this.loading.set(false);
          })
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();
  }

  setActiveForm(mode: DentalFormMode): void {
    this.activeForm = mode;
  }
}
