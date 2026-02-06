import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { MonthCalendarComponent } from '../../../calendar/components/month-calendar/month-calendar.component';
import { AppointmentsPanelComponent } from '../../components/appointments-panel/appointments-panel.component';
import { AppointmentDialogComponent } from '../../components/appointment-dialog/appointment-dialog.component';
import { ConfirmDialogComponent } from '../../components/confirm-dialog/confirm-dialog.component';
import { AppointmentsService } from '../../../../core/services/appointments.service';
import { PatientService } from '../../../../core/services/patient.service';
import { ProfesionalService } from '../../../../core/services/profesional.service';
import { ErrorHandlerService } from '../../../../core/services/error-handler.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Appointment, AppointmentCreateDTO, Patient, Profesional } from '../../../../core/models';
import { getTodayAsYYYYMMDD } from '../../../../core/utils/date.utils';

@Component({
  selector: 'app-turnos-view',
  standalone: true,
  imports: [
    CommonModule,
    MonthCalendarComponent,
    AppointmentsPanelComponent,
    AppointmentDialogComponent,
    ConfirmDialogComponent
  ],
  templateUrl: './turnos-view.component.html',
  styleUrls: ['./turnos-view.component.scss']
})
export class TurnosViewComponent implements OnInit, OnDestroy {
  // Estado
  appointments: Appointment[] = [];
  patients: Patient[] = [];
  profesionales: Profesional[] = [];
  
  currentDate = new Date();
  selectedDate: string | null = null;
  isDialogOpen = false;
  isLoading = false;

  // Modal confirmación eliminación
  isDeleteConfirmOpen = false;
  isDeletingAppointment = false;
  deleteCandidateId: number | null = null;
  deleteCandidateSummary: string | null = null;
  
  // Filtro saldo pendiente (checkbox en búsqueda)
  pendingOnlyFilter = false;

  // Estados de error
  hasError = false;
  errorMessage: string | null = null;
  isLoadingAppointments = false;
  isLoadingPatients = false;
  isLoadingProfesionales = false;

  private subscriptions = new Subscription();
  private destroy$ = new Subject<void>();

  constructor(
    private appointmentsService: AppointmentsService,
    private patientService: PatientService,
    private profesionalService: ProfesionalService,
    private errorHandler: ErrorHandlerService,
    private notification: NotificationService
  ) {}

  ngOnInit(): void {
    // Suscribirse a los turnos filtrados (el servicio usa cache + filtro)
    this.appointmentsService.getFilteredAppointments()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (appointments) => {
          this.appointments = appointments;
          this.isLoadingAppointments = false;
          this.hasError = false;
        },
        error: (err) => {
          console.error('Error loading appointments:', err);
          // Los errores 404 se manejan completamente desde el backend sin notificaciones
          if (err.status !== 404) {
            const message = this.errorHandler.getErrorMessage(err, 'cargar los turnos');
            console.log('Mensaje de error generado:', message);
            // Para errores de red, mostrar solo el alert dismissible en la vista (sin toast)
            if (!this.errorHandler.isNetworkError(err)) {
              this.notification.showError(message);
            }
            this.errorMessage = message;
          }
          this.isLoadingAppointments = false;
          this.hasError = true;
        }
      });

    // Suscribirse a los pacientes (el servicio usa cache, así que el error se maneja en loadPatients)
    this.patientService.getPatients()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (patients) => {
          this.patients = patients;
          this.isLoadingPatients = false;
        },
        error: (err) => {
          // Los errores 404 se manejan completamente desde el backend sin notificaciones
          if (err.status !== 404) {
            const message = this.errorHandler.getErrorMessage(err, 'cargar los pacientes');
            if (!this.errorHandler.isNetworkError(err)) {
              this.notification.showError(message);
            }
          }
          this.isLoadingPatients = false;
          console.error('Error loading patients:', err);
        }
      });

    // Suscribirse a los profesionales
    this.profesionalService.getProfesionales()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (profesionales) => {
          this.profesionales = profesionales;
          this.isLoadingProfesionales = false;
        },
        error: (err) => {
          // Los errores 404 se manejan completamente desde el backend sin notificaciones
          if (err.status !== 404) {
            const message = this.errorHandler.getErrorMessage(err, 'cargar los profesionales');
            if (!this.errorHandler.isNetworkError(err)) {
              this.notification.showError(message);
            }
          }
          this.isLoadingProfesionales = false;
          console.error('Error loading profesionales:', err);
        }
      });

    // Si no hay fecha seleccionada, se selecciona la fecha actual
    if (!this.selectedDate) {
      this.selectedDate = getTodayAsYYYYMMDD();
    }
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.subscriptions.unsubscribe();
  }

  onDateClick(date: string): void {
    this.selectedDate = date;
  }

  onMonthChange(date: Date): void {
    this.currentDate = date;
  }

  /**
   * Maneja cambios en el filtro de calendario (paciente / profesional)
   */
  onFilterChange(filter: { type: 'patient' | 'profesional'; term: string }): void {
    const type = filter.term ? filter.type : 'none';
    this.appointmentsService.setFilter(type, filter.term);
  }

  /**
   * Maneja el checkbox "Solo con saldo pendiente".
   * Actualiza el filtro en el servicio; getFilteredAppointments() hará una petición al backend con pendingOnly.
   */
  onPendingOnlyChange(checked: boolean): void {
    this.pendingOnlyFilter = checked;
    this.appointmentsService.setFilterPendingOnly(checked);
  }

  /**
   * Maneja el clic en el botón "Agregar turno"
   * Valida que haya una fecha seleccionada antes de abrir el diálogo
   */
  onAddAppointmentClick(): void {
    if (!this.selectedDate) {
      this.notification.showWarning('Por favor, seleccione una fecha para el turno antes de crear uno nuevo.');
      this.isDialogOpen = false; // Asegurar que esté cerrado
      return;
    }
    
    this.isDialogOpen = true;
  }

  /**
   * Maneja los cambios en el estado de apertura del diálogo
   * Sincroniza el estado del componente con el estado del diálogo
   */
  onDialogOpenChange(open: boolean): void {
    this.isDialogOpen = open;
    
    // Si se cierra el diálogo, resetear isLoading para prevenir UI bloqueada
    if (!open) {
      this.isLoading = false;
    }
    
    // Si se cierra el diálogo sin fecha seleccionada, asegurar estado consistente
    if (!open && !this.selectedDate) {
      this.isDialogOpen = false; // Asegurar estado consistente
    }
  }

  /**
   * Crear nuevo turno
   * Recibe los datos del formulario y crea el turno en el backend
   */
  onCreateAppointment(data: { patientData: Partial<Patient>; appointmentData: AppointmentCreateDTO }): void {
    if (!this.selectedDate) {
      this.notification.showWarning('Por favor, seleccione una fecha para el turno.');
      this.isDialogOpen = false; // Cerrar diálogo si no hay fecha
      return;
    }

    // Prevenir múltiples submits
    if (this.isLoading) {
      return;
    }

    // Validar que el profesional seleccionado exista en la lista de profesionales activos
    if (data.appointmentData.profesionalId) {
      const profesionalExists = this.activeProfesionales.some(
        p => p.id === data.appointmentData.profesionalId
      );
      
      if (!profesionalExists) {
        this.notification.showError('El profesional seleccionado no está disponible. Por favor, seleccione otro profesional.');
        this.isLoading = false;
        return;
      }
    }

    this.isLoading = true;

    // Si el paciente no existe (no tiene id), primero lo creamos
    if (!data.patientData.id) {
      // Pasar true para indicar que el componente manejará el error específicamente
      this.patientService.create(data.patientData as Patient, true)
        .pipe(
          takeUntil(this.destroy$),
          finalize(() => {
            // Garantizar que isLoading se resetee siempre si la operación se cancela
            // Nota: Si la operación es exitosa, createAppointment() manejará el reset
            // Si hay error, el error handler lo resetea, pero finalize garantiza reset en cancelación
            // Sin embargo, no resetear aquí porque si es exitoso, createAppointment() necesita isLoading = true
          })
        )
        .subscribe({
        next: (newPatient) => {
          // Validar que el paciente se creó correctamente
          if (!newPatient.id) {
            this.isLoading = false;
            this.notification.showError('Error al crear el paciente. El ID no fue generado correctamente.');
            return;
          }

          // Ahora crear el turno con el ID del paciente creado
          // No resetear isLoading aquí porque createAppointment() necesita que esté en true
          const appointmentData: AppointmentCreateDTO = {
            ...data.appointmentData,
            patientId: newPatient.id,
            fecha: this.selectedDate!
          };
          this.createAppointment(appointmentData);
        },
        error: (err) => {
          // Los errores 404 se manejan completamente desde el backend sin notificaciones
          if (err.status !== 404) {
            const message = this.errorHandler.getErrorMessage(err, 'crear el paciente');
            if (!this.errorHandler.isNetworkError(err)) {
              this.notification.showError(message);
            }
          }
          this.isLoading = false;
          console.error('Error creating patient:', err);
        }
      });
    } else {
      // Paciente existente, crear turno directamente
      const appointmentData: AppointmentCreateDTO = {
        ...data.appointmentData,
        patientId: data.patientData.id,
        fecha: this.selectedDate!
      };
      this.createAppointment(appointmentData);
    }
  }

  private createAppointment(data: AppointmentCreateDTO): void {
    // Validar que patientId existe
    if (!data.patientId) {
      this.isLoading = false;
      this.notification.showError('Error: El ID del paciente es requerido.');
      return;
    }

    // Pasar true para indicar que el componente manejará el error específicamente
    this.appointmentsService.create(data, true)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          // Garantizar que isLoading se resetee siempre, incluso si hay error o se cancela
          this.isLoading = false;
        })
      )
      .subscribe({
      next: () => {
        this.isDialogOpen = false;
        this.notification.showSuccess('Turno creado correctamente.');
        // isLoading ya se resetea en finalize
      },
      error: (err) => {
        // Los errores 404 se manejan completamente desde el backend sin notificaciones
        if (err.status !== 404) {
          const message = this.errorHandler.getErrorMessage(err, 'crear el turno');
          if (!this.errorHandler.isNetworkError(err)) {
            this.notification.showError(message);
          }
        }
        console.error('Error creating appointment:', err);
        // isLoading ya se resetea en finalize
        // No cerrar el diálogo en caso de error para que el usuario pueda corregir
      }
    });
  }

  onDeleteAppointment(id: number): void {
    this.openDeleteConfirm(id);
  }

  openDeleteConfirm(id: number): void {
    if (this.isDeletingAppointment) {
      return;
    }

    this.deleteCandidateId = id;
    const a = this.appointments.find(ap => ap.id === id);
    const hora = a?.hora ? a.hora.substring(0, 5) : null;
    const parts = [
      a?.patientName || 'Paciente',
      a?.profesionalName ? `- ${a.profesionalName}` : null,
      hora ? `(${hora})` : null
    ].filter(Boolean);
    this.deleteCandidateSummary = parts.length ? parts.join(' ') : null;

    this.isDeleteConfirmOpen = true;
  }

  closeDeleteConfirm(): void {
    if (this.isDeletingAppointment) {
      return;
    }
    this.isDeleteConfirmOpen = false;
    this.deleteCandidateId = null;
    this.deleteCandidateSummary = null;
  }

  private forceCloseDeleteConfirm(): void {
    this.isDeleteConfirmOpen = false;
    this.deleteCandidateId = null;
    this.deleteCandidateSummary = null;
  }

  onDeleteConfirmOpenChange(open: boolean): void {
    this.isDeleteConfirmOpen = open;
    if (!open) {
      // Limpiar datos cuando se cierra el modal
      if (!this.isDeletingAppointment) {
        this.deleteCandidateId = null;
        this.deleteCandidateSummary = null;
      }
    }
  }

  confirmDeleteAppointment(): void {
    if (this.isDeletingAppointment) {
      return;
    }

    const id = this.deleteCandidateId;
    if (id == null) {
      this.isDeleteConfirmOpen = false;
      this.deleteCandidateId = null;
      this.deleteCandidateSummary = null;
      return;
    }

    this.isDeletingAppointment = true;

    // Pasar true para indicar que el componente manejará el error específicamente
    this.appointmentsService.delete(id, true)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isDeletingAppointment = false;
        })
      )
      .subscribe({
        next: () => {
          this.notification.showSuccess('Turno eliminado correctamente.');
          // Cerrar el modal después de la operación exitosa
          this.forceCloseDeleteConfirm();
        },
      error: (err) => {
        // Los errores 404 se manejan completamente desde el backend sin notificaciones
        if (err.status !== 404) {
          const message = this.errorHandler.getErrorMessage(err, 'eliminar el turno');
          if (!this.errorHandler.isNetworkError(err)) {
            this.notification.showError(message);
          }
        }
        console.error('Error deleting appointment:', err);
        // No cerrar el modal en caso de error para que el usuario pueda intentar de nuevo
      }
      });
  }

  /**
   * Obtener turnos para una fecha (para el calendario)
   * Método normal de clase para mejor rendimiento y compatibilidad con Angular change detection
   */
  getAppointmentsForDate(date: string): Appointment[] {
    if (!this.appointments || !Array.isArray(this.appointments)) {
      return [];
    }
    return this.appointments.filter(app => app.fecha === date);
  }

  /**
   * Lista de pacientes existentes para el combobox
   */
  get existingPatients(): Patient[] {
    return this.patients;
  }

  /**
   * Lista de profesionales activos para el dropdown
   */
  get activeProfesionales(): Profesional[] {
    return this.profesionales.filter(p => p.activo !== false);
  }
}
