/**
 * Grilla del odontograma (permanente y temporal): selección de piezas,
 * caras SVG e iconos de leyenda por diente.
 */
import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ToothFacesComponent } from '../tooth-faces/tooth-faces.component';
import { OdontoIconComponent } from '../odonto-icon/odonto-icon.component';
import { LeyendaItem, OdontogramaStateService } from '../../services/odontograma-state.service';

interface TeethLayout {
  topRight: number[];
  topLeft: number[];
  bottomLeft: number[];
  bottomRight: number[];
}

@Component({
  selector: 'app-odontograma-form',
  standalone: true,
  imports: [CommonModule, ToothFacesComponent, OdontoIconComponent],
  templateUrl: './odontograma-form.component.html',
  styleUrls: ['./odontograma-form.component.scss']
})
export class OdontogramaFormComponent implements OnDestroy {
  selectedTooth: number | null = null;
  private selectedSub?: Subscription;

  constructor(private readonly stateService: OdontogramaStateService) {
    this.selectedSub = this.stateService.selectedTooth$.subscribe(tooth => {
      this.selectedTooth = tooth;
    });
  }

  ngOnDestroy(): void {
    this.selectedSub?.unsubscribe();
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

  selectTooth(tooth: number): void {
    const nextTooth = this.selectedTooth === tooth ? null : tooth;
    this.stateService.selectTooth(nextTooth);
  }

  isToothSelected(tooth: number): boolean {
    return this.selectedTooth === tooth;
  }

  private readonly movilidadLabels = new Set(['M0', 'M1', 'M2', 'M3']);
  private readonly furcaLabels = new Set(['F0', 'F1', 'F2', 'F3']);

  getToothIcons(tooth: number): LeyendaItem[] {
    return this.stateService.getIconsForTooth(tooth);
  }

  getMovilidadIconForTooth(tooth: number): LeyendaItem | null {
    return this.getToothIcons(tooth).find(item => this.movilidadLabels.has(item.label)) ?? null;
  }

  getFurcaIconForTooth(tooth: number): LeyendaItem | null {
    return this.getToothIcons(tooth).find(item => this.furcaLabels.has(item.label)) ?? null;
  }

  getToothIconsExcludingMovilidad(tooth: number): LeyendaItem[] {
    return this.getToothIcons(tooth).filter(
      item => !this.movilidadLabels.has(item.label) && !this.furcaLabels.has(item.label)
    );
  }
}
