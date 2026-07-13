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
  private resumenByDni = new Map<string, PatientSeguimientoResumen>();

  searchTerm = '';
  patientGroups: PatientGroup[] = [];

  selectedYearByDni: Record<string, string> = {};
  selectedMonthByDni: Record<string, string> = {};
  availableMonthsByDni: Record<string, MonthOption[]> = {};
  private filteredAppointmentsByDni: Record<string, Appointment[]> = {};

  constructor(private appointmentsService: AppointmentsService) {}

  setPatients(patients: Patient[]): void {
    this.patients = patients;
    this.patientsMap = new Map();
    patients.forEach(patient => {
      if (patient.dni) {
        this.patientsMap.set(patient.dni, patient);
      }
    });
  }

  setResumen(resumen: PatientSeguimientoResumen[]): void {
    this.resumenByDni = new Map(resumen.map(r => [r.patientDni, r]));
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

  ensureAllYearsLoaded(dni: string): Observable<unknown> {
    const resumen = this.resumenByDni.get(dni);
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
          (p.dni || '').includes(term) ||
          (p.email || '').toLowerCase().includes(term)
        )
      : this.patients;

    this.patientGroups = filteredPatients.map(patient => {
      const resumen = patient.dni ? this.resumenByDni.get(patient.dni) : undefined;
      return {
        patient,
        appointments: this.getLoadedAppointmentsForPatient(patient.dni),
        totalAdeudado: resumen?.totalAdeudado ?? 0,
        totalTurnos: resumen?.totalTurnos ?? 0,
        availableYears: this.buildAvailableYearOptions(resumen)
      };
    });
    this.patientGroups.forEach(group => this.refreshFiltersForGroup(group));
  }

  /** Turnos del paciente ya cacheados: solo el año seleccionado, o todos los años cargados hasta ahora si es 'all'. */
  private getLoadedAppointmentsForPatient(dni?: string | null): Appointment[] {
    if (!dni) return [];
    const year = this.getSelectedYear(dni);
    if (year === 'all') {
      const merged: Appointment[] = [];
      this.appointmentsByYear.forEach(apps => {
        apps.forEach(app => {
          if (app.patientDni === dni) merged.push(app);
        });
      });
      return merged;
    }
    return (this.appointmentsByYear.get(year) ?? []).filter(app => app.patientDni === dni);
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
    const dni = group.patient.dni;
    if (!dni) return;
    const year = this.getSelectedYear(dni);
    const month = this.getSelectedMonth(dni);
    this.availableMonthsByDni[dni] = this.buildAvailableMonths(group.appointments, year);
    this.filteredAppointmentsByDni[dni] = this.buildFilteredAppointments(group.appointments, year, month);
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

  getSelectedYear(dni?: string | null): string {
    if (!dni) return this.currentYear();
    return this.selectedYearByDni[dni] || this.currentYear();
  }

  getSelectedMonth(dni?: string | null): string {
    if (!dni) return 'all';
    return this.selectedMonthByDni[dni] || 'all';
  }

  /** Actualiza el filtro de año y devuelve el observable de carga a esperar (loadYear o ensureAllYearsLoaded). */
  onYearFilterChange(dni: string, value: string): Observable<unknown> {
    this.selectedYearByDni[dni] = value;
    this.selectedMonthByDni[dni] = 'all';
    return value === 'all' ? this.ensureAllYearsLoaded(dni) : this.loadYear(value);
  }

  onMonthFilterChange(dni: string, value: string): void {
    this.selectedMonthByDni[dni] = value;
    const group = this.patientGroups.find(g => g.patient.dni === dni);
    if (group) this.refreshFiltersForGroup(group);
  }

  getAvailableMonths(dni?: string | null): MonthOption[] {
    if (!dni) return EMPTY_MONTHS;
    return this.availableMonthsByDni[dni] ?? EMPTY_MONTHS;
  }

  getFilteredAppointments(group: PatientGroup): Appointment[] {
    const dni = group.patient.dni;
    if (!dni) return group.appointments;
    return this.filteredAppointmentsByDni[dni] ?? group.appointments;
  }
}
