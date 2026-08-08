import { Injectable } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { Patient, SeguimientoPatientGroup } from '../../../core/models';
import { AppointmentsService } from '../../../core/services/appointments.service';

/**
 * Dueño del estado de UNA PÁGINA de Seguimiento (paciente + turnos en el rango desde/hasta +
 * resumen de deuda histórica). Scoped al componente (no `providedIn:'root'`) para que el estado se
 * resetee cada vez que se entra a la vista — mismo motivo que antes, ver
 * `bakend-proyecto-turnos/docs` sobre por qué Seguimiento pasó a paginar: 1726 pacientes cargados y
 * filtrados en memoria hacían que la carga inicial tardara ~5s y cada tecla del buscador ~1s.
 *
 * Ya NO cachea todos los pacientes ni todos los turnos de todos los años: cada cambio de
 * desde/hasta/página/búsqueda pide la página correspondiente al backend.
 */
@Injectable()
export class PatientDataService {
  desde = '';
  hasta = '';
  page = 0;
  readonly size = 20;
  searchTerm = '';

  patientGroups: SeguimientoPatientGroup[] = [];
  patientsMap: Map<string, Patient> = new Map();
  totalPages = 0;
  totalElements = 0;
  cargando = false;

  constructor(private appointmentsService: AppointmentsService) {}

  loadPage(): Observable<void> {
    this.cargando = true;
    return this.appointmentsService
      .getSeguimiento(this.desde, this.hasta, this.page, this.size, this.searchTerm.trim() || undefined)
      .pipe(
        tap(response => {
          this.patientGroups = response.content;
          this.totalPages = response.totalPages;
          this.totalElements = response.totalElements;
          this.patientsMap = new Map();
          this.patientGroups.forEach(group => {
            if (group.patient.identificacion) {
              this.patientsMap.set(group.patient.identificacion, group.patient);
            }
          });
          this.cargando = false;
        }),
        map(() => undefined)
      );
  }
}
