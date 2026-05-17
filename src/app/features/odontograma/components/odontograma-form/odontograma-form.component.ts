/**
 * Grilla del odontograma (permanente y temporal): selección de piezas,
 * caras SVG e iconos de leyenda por diente.
 */
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToothFacesComponent } from '../tooth-faces/tooth-faces.component';
import { OdontogramaSelectionService, LeyendaItem } from '../../services/odontograma-selection.service';

interface TeethLayout {
  topRight: number[];
  topLeft: number[];
  bottomLeft: number[];
  bottomRight: number[];
}

@Component({
  selector: 'app-odontograma-form',
  standalone: true,
  imports: [CommonModule, ToothFacesComponent],
  templateUrl: './odontograma-form.component.html',
  styleUrls: ['./odontograma-form.component.scss']
})
export class OdontogramaFormComponent {
  selectedTooth: number | null = null;

  /** Sincroniza la pieza seleccionada con el servicio compartido. */
  constructor(private readonly odontogramaSelectionService: OdontogramaSelectionService) {
    this.odontogramaSelectionService.selectedTooth$.subscribe(tooth => {
      this.selectedTooth = tooth;
    });
  }

  permanentTeeth: TeethLayout = {
    topRight: [18, 17, 16, 15, 14, 13, 12, 11],
    topLeft: [21, 22, 23, 24, 25, 26, 27, 28],
    bottomLeft: [31, 32, 33, 34, 35, 36, 37, 38],
    bottomRight: [48, 47, 46, 45, 44, 43, 42, 41],
  };

  primaryTeeth: TeethLayout = {
    topRight: [55, 54, 53, 52, 51],
    topLeft: [61, 62, 63, 64, 65],
    bottomRight: [85, 84, 83, 82, 81],
    bottomLeft: [71, 72, 73, 74, 75],
  };

  /** Selecciona la pieza o la deselecciona si ya estaba activa. */
  selectTooth(tooth: number): void {
    const nextTooth = this.selectedTooth === tooth ? null : tooth;
    this.odontogramaSelectionService.selectTooth(nextTooth);
  }

  /** Indica si la pieza está seleccionada en la grilla. */
  isToothSelected(tooth: number): boolean {
    return this.selectedTooth === tooth;
  }

  private readonly movilidadLabels = new Set(['M0', 'M1', 'M2', 'M3']);
  private readonly furcaLabels = new Set(['F0', 'F1', 'F2', 'F3']);

  /** Iconos de leyenda asociados a una pieza. */
  getToothIcons(tooth: number): LeyendaItem[] {
    return this.odontogramaSelectionService.getIconsForTooth(tooth);
  }

  /** Icono M0–M3 de la pieza, si existe. */
  getMovilidadIconForTooth(tooth: number): LeyendaItem | null {
    return this.getToothIcons(tooth).find(item => this.movilidadLabels.has(item.label)) ?? null;
  }

  /** Icono F0–F3 de la pieza, si existe. */
  getFurcaIconForTooth(tooth: number): LeyendaItem | null {
    return this.getToothIcons(tooth).find(item => this.furcaLabels.has(item.label)) ?? null;
  }

  /** Iconos de leyenda sin movilidad ni furca (se muestran aparte). */
  getToothIconsExcludingMovilidad(tooth: number): LeyendaItem[] {
    return this.getToothIcons(tooth).filter(
      item => !this.movilidadLabels.has(item.label) && !this.furcaLabels.has(item.label)
    );
  }
}

