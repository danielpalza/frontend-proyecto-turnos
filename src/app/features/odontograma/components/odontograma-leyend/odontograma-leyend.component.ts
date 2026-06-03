/**
 * Panel lateral de leyenda: estados, condiciones, movilidad y furca
 * aplicados al diente seleccionado vía OdontogramaStateService.
 */
import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { LeyendaItem, OdontogramaStateService } from '../../services/odontograma-state.service';

@Component({
  selector: 'app-odontograma-leyend',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './odontograma-leyend.component.html',
  styleUrls: ['./odontograma-leyend.component.scss']
})
export class OdontogramaLeyendComponent implements OnDestroy {
  selectedTooth: number | null = null;
  legendOpen = true;
  private selectedSub?: Subscription;

  constructor(private readonly stateService: OdontogramaStateService) {
    this.selectedSub = this.stateService.selectedTooth$.subscribe(tooth => {
      this.selectedTooth = tooth;
    });
  }

  ngOnDestroy(): void {
    this.selectedSub?.unsubscribe();
  }

  readonly estados = [
   { label: 'Ausencia', icono: 'bi bi-0-circle' },
    { label: 'Implante', icono: 'bi bi-1-circle' },
    { label: 'Corona', icono: 'bi bi-2-circle' },
    { label: 'Puente', icono: 'bi bi-3-circle' },
    { label: 'Eripcion', icono: 'bi bi-4-circle' },
    { label: 'Retención', icono: 'bi bi-5-circle' },
    { label: 'Erupcion', icono: 'bi bi-6-circle' },
    { label: 'Impactado', icono: 'bi bi-7-circle' },
    { label: 'Extraer', icono: 'bi bi-8-circle' },
  ];

  readonly condiciones = [
    { label: 'Endodoncia', icono: 'bi bi-0-square' },
    { label: 'Fractura', icono: 'bi bi-1-square' },
    { label: 'Lesion', icono: 'bi bi-2-square' },
    { label: 'Dolor/Sensibilidad', icono: 'bi bi-3-square' },
  ];

  readonly movilidadOpciones = [
    { label: 'M0', icono: 'bi bi-0-circle-fill' },
    { label: 'M1', icono: 'bi bi-1-circle-fill' },
    { label: 'M2', icono: 'bi bi-2-circle-fill' },
    { label: 'M3', icono: 'bi bi-3-circle-fill' },
  ];

  readonly furcaOpciones = [
    { label: 'F0', icono: 'bi bi-0-square-fill' },
    { label: 'F1', icono: 'bi bi-1-square-fill' },
    { label: 'F2', icono: 'bi bi-2-square-fill' },
    { label: 'F3', icono: 'bi bi-3-square-fill' },
  ];

  onToggleEstado(estado: LeyendaItem, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.stateService.toggleItemForSelectedTooth(estado, checked);
  }

  onToggleCondicion(condicion: LeyendaItem, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.stateService.toggleItemForSelectedTooth(condicion, checked);
  }

  isItemSelected(label: string): boolean {
    return this.stateService.isItemSelectedForCurrentTooth(label);
  }

  onMovilidadChange(event: Event): void {
    const selectedLabel = (event.target as HTMLSelectElement).value;
    const movilidadLabels = this.movilidadOpciones.map(opcion => opcion.label);
    this.stateService.removeItemsByLabelsForSelectedTooth(movilidadLabels);

    const movilidadSeleccionada = this.movilidadOpciones.find(opcion => opcion.label === selectedLabel);
    if (movilidadSeleccionada) {
      this.stateService.toggleItemForSelectedTooth(movilidadSeleccionada, true);
    }
  }

  getSelectedMovilidadLabel(): string {
    const movilidadActual = this.movilidadOpciones.find(opcion => this.isItemSelected(opcion.label));
    return movilidadActual?.label ?? '';
  }

  onFurcaChange(event: Event): void {
    const selectedLabel = (event.target as HTMLSelectElement).value;
    const furcaLabels = this.furcaOpciones.map(opcion => opcion.label);
    this.stateService.removeItemsByLabelsForSelectedTooth(furcaLabels);

    const furcaSeleccionada = this.furcaOpciones.find(opcion => opcion.label === selectedLabel);
    if (furcaSeleccionada) {
      this.stateService.toggleItemForSelectedTooth(furcaSeleccionada, true);
    }
  }

  getSelectedFurcaLabel(): string {
    const furcaActual = this.furcaOpciones.find(opcion => this.isItemSelected(opcion.label));
    return furcaActual?.label ?? '';
  }
}
