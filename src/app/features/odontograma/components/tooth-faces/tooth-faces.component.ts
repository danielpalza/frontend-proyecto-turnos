import { Component, Input, signal } from '@angular/core';

type FaceState = 'normal' | 'caries' | 'obturacion' | 'ausente';

interface FaceStates {
  top: FaceState;
  right: FaceState;
  center: FaceState;
  left: FaceState;
  bottom: FaceState;
}

@Component({
  selector: 'app-tooth-faces',
  standalone: true,
  templateUrl: './tooth-faces.component.html'
})
export class ToothFacesComponent {
  @Input() toothNumber!: number;
  @Input() size: 'sm' | 'md' = 'md';

  faces = signal<FaceStates>({
    top: 'normal',
    right: 'normal',
    center: 'normal',
    left: 'normal',
    bottom: 'normal',
  });

  cycleState(current: FaceState): FaceState {
    switch (current) {
      case 'normal': return 'caries';
      case 'caries': return 'obturacion';
      case 'obturacion': return 'ausente';
      default: return 'normal';
    }
  }

  handleFaceClick(face: keyof FaceStates, event: MouseEvent) {
    event.stopPropagation();

    this.faces.update(prev => ({
      ...prev,
      [face]: this.cycleState(prev[face])
    }));
  }

  getFaceColor(state: FaceState): string {
    switch (state) {
      case 'caries': return '#ef4444';   // red-500
      case 'obturacion': return '#3b82f6'; // blue-500
      case 'ausente': return '#94a3b8';  // slate-400
      default: return '#ffffff';
    }
  }

  get circleSize() {
    return this.size === 'sm' ? 32 : 40;
  }

  get strokeWidth() {
    return this.size === 'sm' ? 1.5 : 2;
  }
}

