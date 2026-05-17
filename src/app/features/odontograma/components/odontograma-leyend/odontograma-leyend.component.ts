/**
 * Panel lateral de leyenda: estados, condiciones, movilidad y furca
 * aplicados al diente seleccionado vía OdontogramaSelectionService.
 */
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OdontogramaSelectionService, LeyendaItem } from '../../services/odontograma-selection.service';

@Component({
  selector: 'app-odontograma-leyend',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './odontograma-leyend.component.html',
  styleUrls: ['./odontograma-leyend.component.scss']
})
export class OdontogramaLeyendComponent {
  selectedTooth: number | null = null;
  legendOpen = true;

  /** Refleja en el panel la pieza seleccionada en la grilla. */
  constructor(private readonly odontogramaSelectionService: OdontogramaSelectionService) {
    this.odontogramaSelectionService.selectedTooth$.subscribe(tooth => {
      this.selectedTooth = tooth;
    });
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

  /** Activa o quita un estado (ausencia, corona, etc.) del diente seleccionado. */
  onToggleEstado(estado: LeyendaItem, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.odontogramaSelectionService.toggleItemForSelectedTooth(estado, checked);
  }

  /** Activa o quita una condición (endodoncia, fractura, etc.) del diente seleccionado. */
  onToggleCondicion(condicion: LeyendaItem, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.odontogramaSelectionService.toggleItemForSelectedTooth(condicion, checked);
  }

  /** Indica si la etiqueta está marcada en el diente actual. */
  isItemSelected(label: string): boolean {
    return this.odontogramaSelectionService.isItemSelectedForCurrentTooth(label);
  }

  /** Reemplaza la opción de movilidad (M0–M3) del diente seleccionado. */
  onMovilidadChange(event: Event): void {
    const selectedLabel = (event.target as HTMLSelectElement).value;
    const movilidadLabels = this.movilidadOpciones.map(opcion => opcion.label);
    this.odontogramaSelectionService.removeItemsByLabelsForSelectedTooth(movilidadLabels);

    const movilidadSeleccionada = this.movilidadOpciones.find(opcion => opcion.label === selectedLabel);
    if (movilidadSeleccionada) {
      this.odontogramaSelectionService.toggleItemForSelectedTooth(movilidadSeleccionada, true);
    }
  }

  /** Etiqueta de movilidad activa para enlazar el select del template. */
  getSelectedMovilidadLabel(): string {
    const movilidadActual = this.movilidadOpciones.find(opcion => this.isItemSelected(opcion.label));
    return movilidadActual?.label ?? '';
  }

  /** Reemplaza la opción de furca (F0–F3) del diente seleccionado. */
  onFurcaChange(event: Event): void {
    const selectedLabel = (event.target as HTMLSelectElement).value;
    const furcaLabels = this.furcaOpciones.map(opcion => opcion.label);
    this.odontogramaSelectionService.removeItemsByLabelsForSelectedTooth(furcaLabels);

    const furcaSeleccionada = this.furcaOpciones.find(opcion => opcion.label === selectedLabel);
    if (furcaSeleccionada) {
      this.odontogramaSelectionService.toggleItemForSelectedTooth(furcaSeleccionada, true);
    }
  }

  /** Etiqueta de furca activa para enlazar el select del template. */
  getSelectedFurcaLabel(): string {
    const furcaActual = this.furcaOpciones.find(opcion => this.isItemSelected(opcion.label));
    return furcaActual?.label ?? '';
  }
}
