/**
 * Contenedor de ruta del módulo Historia Clínica Básica (HISTORIA_CLINICA_FREE). Mirror simplificado
 * de OdontogramaViewComponent: acá no hay alternancia de sub-formularios, es una sola ficha.
 */
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, distinctUntilChanged, finalize, map, of, switchMap } from 'rxjs';
import { HistoriaClinicaFormComponent } from '../historia-clinica-form/historia-clinica-form.component';
import { HistoriaClinicaStateService } from '../../services/historia-clinica-state.service';

@Component({
  selector: 'app-historia-clinica-view',
  standalone: true,
  imports: [CommonModule, HistoriaClinicaFormComponent],
  templateUrl: './historia-clinica-view.component.html',
  styleUrls: ['./historia-clinica-view.component.scss']
})
export class HistoriaClinicaViewComponent implements OnInit {
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  /** Turno cerrado (registro FIRMADO, o el paciente tiene un registro clínico posterior). */
  readonly editable = signal(true);

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly stateService: HistoriaClinicaStateService
  ) {}

  ngOnInit(): void {
    this.stateService.editable$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(editable => this.editable.set(editable));

    this.route.paramMap.pipe(
      map(params => params.get('appointmentId')),
      distinctUntilChanged(),
      switchMap(idParam => {
        const appointmentId = idParam || '';

        if (!appointmentId) {
          this.router.navigate(['/turnos']);
          return of(null);
        }

        this.loading.set(true);
        this.loadError.set(null);

        return this.stateService.loadForAppointment(appointmentId).pipe(
          catchError(() => {
            this.loadError.set('No se pudieron cargar los datos de la historia clínica.');
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
}
