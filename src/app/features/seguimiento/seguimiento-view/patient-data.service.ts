import { Injectable } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { Appointment, Patient, PatientSeguimientoResumen } from '../../../core/models';
import { AppointmentsService } from '../../../core/services/appointments.service';
import { fullName } from '../../../core/utils/full-name.util';

export interface MonthOption {
  value: string;
  label: string;
}

export interface PatientGroup {
  patient: Patient;
  appointments: Appointment[];
  totalAdeudado: number;
  totalTurnos: number;
  availableYears: string[];
}

/** Referencia estable compartida: evita crear un array nuevo en cada chequeo cuando no hay meses cacheados. */
const EMPTY_MONTHS: MonthOption[] = [];

/**
 * Dueño de la carga, cache y agrupación/filtrado de pacientes+turnos de la vista de seguimiento.
 * Scoped al componente (no providedIn:'root') para que el cache se resetee cada vez que se entra a la vista.
 */
@Injectable()
export class PatientDataService {
  patients: Patient[] = [];
  patientsMap: Map<string, Patient> = new Map();
  private appointmentsByYear = new Map<string, Appointment[]>();
  private resumenByIdentificacion = new Map<string, PatientSeguimientoResumen>();

  searchTerm = '';
  patientGroups: PatientGroup[] = [];

  selectedYearByIdentificacion: Record<string, string> = {};
  selectedMonthByIdentificacion: Record<string, string> = {};
  availableMonthsByIdentificacion: Record<string, MonthOption[]> = {};
  private filteredAppointmentsByIdentificacion: Record<string, Appointment[]> = {};

  constructor(private appointmentsService: AppointmentsService) {}

  setPatients(patients: Patient[]): void {
    this.patients = patients;
    this.patientsMap = new Map();
    patients.forEach(patient => {
      if (patient.identificacion) {
        this.patientsMap.set(patient.identificacion, patient);
      }
    });
  }

  setResumen(resumen: PatientSeguimientoResumen[]): void {
    this.resumenByIdentificacion = new Map(resumen.map(r => [r.patientIdentificacion, r]));
  }

  refreshResumen(): Observable<void> {
    return this.appointmentsService.getSeguimientoResumen().pipe(
      tap(resumen => {
        this.setResumen(resumen);
        this.updatePatientGroups();
      }),
      map(() => undefined)
    );
  }

  /** Muta directamente el turno cacheado tras un update (pago/precio/observaciones), sin refetch. */
  updateCachedAppointment(updated: Appointment): void {
    const year = updated.fecha.substring(0, 4);
    const list = this.appointmentsByYear.get(year);
    if (list) {
      this.appointmentsByYear.set(year, list.map(a => a.id === updated.id ? updated : a));
    }
  }

  currentYear(): string {
    return new Date().getFullYear().toString();
  }

  loadYear(year: string): Observable<Appointment[]> {
    const cached = this.appointmentsByYear.get(year);
    if (cached) return of(cached);
    return this.appointmentsService.findByDateRange(`${year}-01-01`, `${year}-12-31`).pipe(
      tap(apps => this.appointmentsByYear.set(year, apps))
    );
  }

  ensureAllYearsLoaded(identificacion: string): Observable<unknown> {
    const resumen = this.resumenByIdentificacion.get(identificacion);
    const years = resumen?.availableYears?.map(y => y.toString()) ?? [];
    const pending = years.filter(y => !this.appointmentsByYear.has(y));
    if (pending.length === 0) return of(null);
    return forkJoin(pending.map(y => this.loadYear(y)));
  }

  updatePatientGroups(): void {
    const term = this.searchTerm.toLowerCase().trim();

    const filteredPatients = term
      ? this.patients.filter(p =>
          fullName(p.nombre, p.apellido).toLowerCase().includes(term) ||
          (p.identificacion || '').includes(term) ||
          (p.email || '').toLowerCase().includes(term)
        )
      : this.patients;

    this.patientGroups = filteredPatients.map(patient => {
      const resumen = patient.identificacion ? this.resumenByIdentificacion.get(patient.identificacion) : undefined;
      return {
        patient,
        appointments: this.getLoadedAppointmentsForPatient(patient.identificacion),
        totalAdeudado: resumen?.totalAdeudado ?? 0,
        totalTurnos: resumen?.totalTurnos ?? 0,
        availableYears: this.buildAvailableYearOptions(resumen)
      };
    });
    this.patientGroups.forEach(group => this.refreshFiltersForGroup(group));
  }

  /** Turnos del paciente ya cacheados: solo el año seleccionado, o todos los años cargados hasta ahora si es 'all'. */
  private getLoadedAppointmentsForPatient(identificacion?: string | null): Appointment[] {
    if (!identificacion) return [];
    const year = this.getSelectedYear(identificacion);
    if (year === 'all') {
      const merged: Appointment[] = [];
      this.appointmentsByYear.forEach(apps => {
        apps.forEach(app => {
          if (app.patientIdentificacion === identificacion) merged.push(app);
        });
      });
      return merged;
    }
    return (this.appointmentsByYear.get(year) ?? []).filter(app => app.patientIdentificacion === identificacion);
  }

  /** Años del resumen del backend, asegurando que el año actual (default del selector) siempre esté presente. */
  private buildAvailableYearOptions(resumen?: PatientSeguimientoResumen): string[] {
    const years = new Set<string>(resumen?.availableYears?.map(y => y.toString()) ?? []);
    years.add(this.currentYear());
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }

  /**
   * Recalcula y CACHEA los meses disponibles y los turnos filtrados de un paciente.
   * Nunca se debe calcular esto directamente en el template (p.ej. dentro de un *ngFor): bajo
   * change detection zoneless, devolver un array/objeto NUEVO en cada chequeo (aunque el
   * contenido sea idéntico) hace que Angular vuelva a marcar la vista como sucia en cada ciclo,
   * lo que dispara NG0103 (bucle infinito de refresco).
   */
  private refreshFiltersForGroup(group: PatientGroup): void {
    const identificacion = group.patient.identificacion;
    if (!identificacion) return;
    const year = this.getSelectedYear(identificacion);
    const month = this.getSelectedMonth(identificacion);
    this.availableMonthsByIdentificacion[identificacion] = this.buildAvailableMonths(group.appointments, year);
    this.filteredAppointmentsByIdentificacion[identificacion] = this.buildFilteredAppointments(group.appointments, year, month);
  }

  private buildAvailableMonths(apps: Appointment[], year: string): MonthOption[] {
    const filtered = year === 'all' ? apps : apps.filter(app => app.fecha.substring(0, 4) === year);
    const months = new Map<string, string>();
    filtered.forEach(app => {
      const key = app.fecha.substring(5, 7);
      if (!months.has(key)) {
        const date = new Date(app.fecha + 'T00:00:00');
        const label = date.toLocaleDateString('es-ES', { month: 'long' });
        months.set(key, label.charAt(0).toUpperCase() + label.slice(1));
      }
    });
    return Array.from(months.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([value, label]) => ({ value, label }));
  }

  private buildFilteredAppointments(apps: Appointment[], year: string, month: string): Appointment[] {
    return apps.filter(app => {
      if (year !== 'all' && app.fecha.substring(0, 4) !== year) return false;
      if (month !== 'all' && app.fecha.substring(5, 7) !== month) return false;
      return true;
    });
  }

  getSelectedYear(identificacion?: string | null): string {
    if (!identificacion) return this.currentYear();
    return this.selectedYearByIdentificacion[identificacion] || this.currentYear();
  }

  getSelectedMonth(identificacion?: string | null): string {
    if (!identificacion) return 'all';
    return this.selectedMonthByIdentificacion[identificacion] || 'all';
  }

  /** Actualiza el filtro de año y devuelve el observable de carga a esperar (loadYear o ensureAllYearsLoaded). */
  onYearFilterChange(identificacion: string, value: string): Observable<unknown> {
    this.selectedYearByIdentificacion[identificacion] = value;
    this.selectedMonthByIdentificacion[identificacion] = 'all';
    return value === 'all' ? this.ensureAllYearsLoaded(identificacion) : this.loadYear(value);
  }

  onMonthFilterChange(identificacion: string, value: string): void {
    this.selectedMonthByIdentificacion[identificacion] = value;
    const group = this.patientGroups.find(g => g.patient.identificacion === identificacion);
    if (group) this.refreshFiltersForGroup(group);
  }

  getAvailableMonths(identificacion?: string | null): MonthOption[] {
    if (!identificacion) return EMPTY_MONTHS;
    return this.availableMonthsByIdentificacion[identificacion] ?? EMPTY_MONTHS;
  }

  getFilteredAppointments(group: PatientGroup): Appointment[] {
    const identificacion = group.patient.identificacion;
    if (!identificacion) return group.appointments;
    return this.filteredAppointmentsByIdentificacion[identificacion] ?? group.appointments;
  }
}
