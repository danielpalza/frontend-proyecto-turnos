/**
 * Panel lateral de leyenda: estados, condiciones, movilidad y furca
 * aplicados al diente seleccionado vía OdontogramaStateService.
 */
import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { LeyendaItem, OdontogramaStateService } from '../../services/odontograma-state.service';
import { OdontoIconComponent } from '../odonto-icon/odonto-icon.component';

@Component({
  selector: 'app-odontograma-leyend',
  standalone: true,
  imports: [CommonModule, OdontoIconComponent],
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
    { label: 'Ausencia', icono: 'ausencia' },
    { label: 'Implante', icono: 'implante' },
    { label: 'Corona', icono: 'corona' },
    { label: 'Puente', icono: 'puente' },
    { label: 'Retención', icono: 'retencion' },
    { label: 'Erupcion', icono: 'erupcion' },
    { label: 'Impactado', icono: 'impactado' },
    { label: 'Extraer', icono: 'extraer' },
  ];

  readonly condiciones = [
    { label: 'Endodoncia', icono: 'endodoncia' },
    { label: 'Fractura', icono: 'fractura' },
    { label: 'Lesion', icono: 'lesion' },
    { label: 'Dolor/Sensibilidad', icono: 'dolor-sensibilidad' },
  ];

  readonly movilidadOpciones = [
    { label: 'M0', icono: 'bi bi-0-circle-fill' },
    { label: 'M1', icono: 'm1' },
    { label: 'M2', icono: 'm2' },
    { label: 'M3', icono: 'm3' },
  ];

  readonly furcaOpciones = [
    { label: 'F0', icono: 'bi bi-0-square-fill' },
    { label: 'F1', icono: 'f1' },
    { label: 'F2', icono: 'f2' },
    { label: 'F3', icono: 'f3' },
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
