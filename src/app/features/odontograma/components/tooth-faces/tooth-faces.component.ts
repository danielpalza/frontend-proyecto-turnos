/**
 * Diente en vista SVG: cinco caras clicables que ciclan estado clínico
 * (normal → caries → obturación → ausente) y definen color/tamaño del círculo.
 */
import { Component, Input, OnDestroy, OnInit, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { OdontogramaStateService } from '../../services/odontograma-state.service';
import { EstadoCara, FaceKey } from '../../../../core/models/odontograma.model';

interface FaceStates {
  top: EstadoCara;
  right: EstadoCara;
  center: EstadoCara;
  left: EstadoCara;
  bottom: EstadoCara;
}

@Component({
  selector: 'app-tooth-faces',
  standalone: true,
  templateUrl: './tooth-faces.component.html'
})
export class ToothFacesComponent implements OnInit, OnDestroy {
  @Input() toothNumber!: number;
  @Input() size: 'sm' | 'md' = 'md';

  faces = signal<FaceStates>({
    top: 'normal',
    right: 'normal',
    center: 'normal',
    left: 'normal',
    bottom: 'normal',
  });

  private facesSub?: Subscription;

  constructor(private readonly stateService: OdontogramaStateService) {}

  ngOnInit(): void {
    this.syncFaces();
    this.facesSub = this.stateService.faces$.subscribe(() => this.syncFaces());
  }

  ngOnDestroy(): void {
    this.facesSub?.unsubscribe();
  }

  /** Click en una cara: actualiza su estado sin propagar al diente padre. */
  handleFaceClick(face: keyof FaceStates, event: MouseEvent): void {
    event.stopPropagation();
    this.stateService.cycleFace(this.toothNumber, face as FaceKey);
  }

  /** Color de relleno SVG según el estado de la cara. */
  getFaceColor(state: EstadoCara): string {
    switch (state) {
      case 'caries': return '#ef4444';
      case 'obturacion': return '#3b82f6';
      case 'ausente': return '#94a3b8';
      default: return '#ffffff';
    }
  }

  /** Diámetro del círculo central según tamaño sm/md. */
  get circleSize() {
    return this.size === 'sm' ? 35 : 40;
  }

  /** Grosor del trazo del círculo según tamaño sm/md. */
  get strokeWidth() {
    return this.size === 'sm' ? 1.5 : 2;
  }

  private syncFaces(): void {
    this.faces.set({
      top: this.stateService.getFaceState(this.toothNumber, 'top'),
      right: this.stateService.getFaceState(this.toothNumber, 'right'),
      center: this.stateService.getFaceState(this.toothNumber, 'center'),
      left: this.stateService.getFaceState(this.toothNumber, 'left'),
      bottom: this.stateService.getFaceState(this.toothNumber, 'bottom'),
    });
  }
}
