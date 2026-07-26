import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, OnDestroy, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Observable, Subject, Subscription, forkJoin, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { Capability } from '../../../../core/auth/capabilities';
import { CanDirective } from '../../../../shared/directives/can.directive';
import { ScrollLockDirective } from '../../../../shared/directives/scroll-lock.directive';
import { Appointment } from '../../../../core/models';
import {
  CaraDiente,
  EstadoCara,
  LeyendaDelta,
  OdontogramaResponse,
  VALOR_TO_LEYENDA_LABEL,
  ValorLeyenda
} from '../../../../core/models/odontograma.model';
import { PeriodontogramaDienteDelta, PeriodontogramaResponse } from '../../../../core/models/periodontograma.model';
import { OdontogramaService } from '../../../../core/services/odontograma.service';
import { PeriodontogramaService } from '../../../../core/services/periodontograma.service';
import { fullName } from '../../../../core/utils/full-name.util';
import { formatDate as formatDateShared } from '../../utils/seguimiento-display.util';

const CARA_LABEL: Record<CaraDiente, string> = {
  arriba: 'Arriba',
  derecha: 'Derecha',
  centro: 'Centro',
  izquierda: 'Izquierda',
  abajo: 'Abajo'
};

const ESTADO_CARA_LABEL: Record<EstadoCara, string> = {
  normal: 'Normal',
  caries: 'Caries',
  obturacion: 'Obturación',
  ausente: 'Ausente',
  otro: 'Otro'
};

/** Cambios del turno agrupados por diente, listos para renderizar. */
export interface ToothChanges {
  numeroDiente: number;
  caras: { cara: string; estado: string; estadoKey: EstadoCara }[];
  leyendas: string[];
  movilidad: number | null;
  furca: number | null;
}

export interface PerioSummary {
  dientes: number;
  sangrado: number;
  placa: number;
  supuracion: number;
  calculo: number;
  movilidad: number;
  furca: number;
}

/**
 * Resumen clínico de solo lectura de un turno (odontograma + periodontograma), pensado para
 * consultarse sin salir de Seguimiento. Para editar hay que abrir el odontograma completo.
 */
@Component({
  selector: 'app-turn-clinical-modal',
  standalone: true,
  imports: [CommonModule, CanDirective, ScrollLockDirective],
  templateUrl: './turn-clinical-modal.component.html',
  styleUrls: ['./turn-clinical-modal.component.scss']
})
export class TurnClinicalModalComponent implements OnChanges, OnDestroy {
  readonly Capability = Capability;
  @Input() open = false;
  @Output() closed = new EventEmitter<void>();

  private currentAppointment: Appointment | null = null;
  get appointment(): Appointment | null {
    return this.currentAppointment;
  }
  @Input() set appointment(value: Appointment | null) {
    if (!value) return;
    this.currentAppointment = { ...value };
  }

  /**
   * La carga se dispara acá y no en el setter de `appointment` porque el padre comparte
   * `selectedAppointment` con el modal de pagos: sin mirar `open` pediríamos el odontograma cada vez
   * que se abre el modal de cobros.
   */
  ngOnChanges(): void {
    const appointmentId = this.open ? this.currentAppointment?.id : undefined;
    if (!appointmentId) {
      if (!this.open) this.loadedAppointmentId = null;
      return;
    }
    if (appointmentId === this.loadedAppointmentId) return;
    this.loadedAppointmentId = appointmentId;
    this.resetData();
    this.isLoading = true;
    this.loadRequests.next(appointmentId);
  }

  isLoading = false;
  loadError = false;
  odontograma: OdontogramaResponse | null = null;
  periodontograma: PeriodontogramaResponse | null = null;
  toothChanges: ToothChanges[] = [];
  perioSummary: PerioSummary | null = null;

  private loadedAppointmentId: string | null = null;
  private readonly loadRequests = new Subject<string>();
  private readonly subscription: Subscription;

  constructor(
    private readonly odontogramaService: OdontogramaService,
    private readonly periodontogramaService: PeriodontogramaService,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef
  ) {
    // `switchMap` descarta la respuesta del turno anterior si se abre otro antes de que llegue.
    this.subscription = this.loadRequests.pipe(
      switchMap(appointmentId => forkJoin([
        this.guarded(this.odontogramaService.getByAppointment(appointmentId)),
        this.guarded(this.periodontogramaService.getByAppointment(appointmentId))
      ]))
    ).subscribe(([odontograma, periodontograma]) => {
      this.odontograma = odontograma;
      this.periodontograma = periodontograma;
      this.toothChanges = this.buildToothChanges(odontograma);
      this.perioSummary = this.buildPerioSummary(periodontograma);
      this.isLoading = false;
      // La app es zoneless (`provideZonelessChangeDetection`): la respuesta HTTP no dispara un
      // refresco por sí sola, hay que pedirlo a mano.
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  /** Sin notas ni cambios registrados: el turno no tiene nada clínico que mostrar. */
  get isEmpty(): boolean {
    return !this.isLoading && !this.loadError
      && !this.hasNotes
      && this.toothChanges.length === 0
      && !this.periodontograma?.notas
      && !this.perioSummary?.dientes;
  }

  get hasNotes(): boolean {
    return !!(this.odontograma?.comentario || this.odontograma?.planTratamiento || this.odontograma?.comentarioAnterior);
  }

  fullName(nombre?: string | null, apellido?: string | null): string {
    return fullName(nombre, apellido);
  }

  formatDate(dateStr: string): string {
    return formatDateShared(dateStr);
  }

  close(): void {
    this.currentAppointment = null;
    this.loadedAppointmentId = null;
    this.resetData();
    this.closed.emit();
  }

  openOdontogram(): void {
    const appointmentId = this.currentAppointment?.id;
    if (!appointmentId) return;
    this.close();
    this.router.navigate(['/odontograma', appointmentId]);
  }

  /**
   * Un turno sin registros clínicos responde 404: eso es un estado vacío legítimo, no un error.
   * El resto de los fallos (500, red) sí marcan el modal como fallido.
   */
  private guarded<T>(request$: Observable<T>): Observable<T | null> {
    return request$.pipe(
      catchError((error: { status?: number }) => {
        if (error?.status !== 404) this.loadError = true;
        return of(null);
      })
    );
  }

  private resetData(): void {
    this.isLoading = false;
    this.loadError = false;
    this.odontograma = null;
    this.periodontograma = null;
    this.toothChanges = [];
    this.perioSummary = null;
  }

  /** Agrupa caras y leyendas del delta del turno por número de diente. */
  private buildToothChanges(odontograma: OdontogramaResponse | null): ToothChanges[] {
    const cambios = odontograma?.cambiosTurno;
    if (!cambios) return [];

    const byTooth = new Map<number, ToothChanges>();
    const entryFor = (numeroDiente: number): ToothChanges => {
      let entry = byTooth.get(numeroDiente);
      if (!entry) {
        entry = { numeroDiente, caras: [], leyendas: [], movilidad: null, furca: null };
        byTooth.set(numeroDiente, entry);
      }
      return entry;
    };

    (cambios.caras ?? []).forEach(cara => {
      entryFor(cara.numeroDiente).caras.push({
        cara: CARA_LABEL[cara.cara] ?? cara.cara,
        estado: ESTADO_CARA_LABEL[cara.estado] ?? cara.estado,
        estadoKey: cara.estado
      });
    });

    (cambios.leyendas ?? []).forEach(leyenda => {
      const entry = entryFor(leyenda.numeroDiente);
      entry.leyendas.push(...this.activeLegendLabels(leyenda));
      if (leyenda.movilidad != null) entry.movilidad = leyenda.movilidad;
      if (leyenda.furca != null) entry.furca = leyenda.furca;
    });

    return [...byTooth.values()]
      .filter(entry => entry.caras.length || entry.leyendas.length || entry.movilidad != null || entry.furca != null)
      .sort((a, b) => a.numeroDiente - b.numeroDiente);
  }

  /** Solo los flags en `true`, con las etiquetas ya definidas por el modelo del odontograma. */
  private activeLegendLabels(leyenda: LeyendaDelta): string[] {
    return (Object.keys(VALOR_TO_LEYENDA_LABEL) as ValorLeyenda[])
      .filter(valor => leyenda[valor] === true)
      .map(valor => VALOR_TO_LEYENDA_LABEL[valor] as string);
  }

  private buildPerioSummary(periodontograma: PeriodontogramaResponse | null): PerioSummary | null {
    const dientes = periodontograma?.cambiosTurno?.dientes ?? [];
    if (dientes.length === 0) return null;

    const countBy = (predicate: (diente: PeriodontogramaDienteDelta) => boolean) => dientes.filter(predicate).length;
    // Cada hallazgo se registra en 6 sitios (vestibular y lingual x mesial/central/distal): basta
    // con que uno esté marcado para contar el diente.
    const anyFlag = (diente: PeriodontogramaDienteDelta, prefix: 'Sangrado' | 'Placa' | 'Supuracion' | 'Calculo'): boolean =>
      (['vest', 'ling'] as const).some(face =>
        (['M', 'C', 'D'] as const).some(site => diente[`${face}${prefix}${site}` as keyof PeriodontogramaDienteDelta] === true)
      );

    return {
      dientes: dientes.length,
      sangrado: countBy(diente => anyFlag(diente, 'Sangrado')),
      placa: countBy(diente => anyFlag(diente, 'Placa')),
      supuracion: countBy(diente => anyFlag(diente, 'Supuracion')),
      calculo: countBy(diente => anyFlag(diente, 'Calculo')),
      movilidad: countBy(diente => !!diente.mobility),
      furca: countBy(diente => !!diente.furcation)
    };
  }
}
