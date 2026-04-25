import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface PerioToothMvp {
  id: number;
  present: boolean;
  probing: number;
  recession: number;
  bleeding: [boolean, boolean, boolean];
  plaque: [boolean, boolean, boolean];
  mobility: number;
  furcation: number;
}

@Component({
  selector: 'app-periodontograma-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './periodontograma-form.component.html',
  styleUrls: ['./periodontograma-form.component.scss']
})
export class PeriodontogramaFormComponent {
  readonly upperIds = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
  readonly lowerIds = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

  patientInfo = {
    name: '',
    operator: '',
    date: new Date().toISOString().split('T')[0] ?? ''
  };

  readonly teethMap = new Map<number, PerioToothMvp>();

  constructor() {
    [...this.upperIds, ...this.lowerIds].forEach((id) => {
      this.teethMap.set(id, this.makeTooth(id));
    });
  }

  get upperTeeth(): PerioToothMvp[] {
    return this.upperIds.map((id) => this.teethMap.get(id)!).filter(Boolean);
  }

  get lowerTeeth(): PerioToothMvp[] {
    return this.lowerIds.map((id) => this.teethMap.get(id)!).filter(Boolean);
  }

  get totalSites(): number {
    return this.activeTeeth.length * 6;
  }

  get bleedingPercent(): number {
    if (this.totalSites === 0) {
      return 0;
    }

    const bleedingSites = this.activeTeeth.reduce(
      (acc, tooth) => acc + tooth.bleeding.filter(Boolean).length * 2,
      0
    );
    return Math.round((bleedingSites / this.totalSites) * 100);
  }

  get plaquePercent(): number {
    if (this.totalSites === 0) {
      return 0;
    }

    const plaqueSites = this.activeTeeth.reduce(
      (acc, tooth) => acc + tooth.plaque.filter(Boolean).length * 2,
      0
    );
    return Math.round((plaqueSites / this.totalSites) * 100);
  }

  get avgProbing(): string {
    const withProbing = this.activeTeeth.filter((t) => t.probing > 0);
    if (withProbing.length === 0) {
      return '—';
    }

    const sum = withProbing.reduce((acc, tooth) => acc + tooth.probing, 0);
    return (sum / withProbing.length).toFixed(1);
  }

  get deepSites(): number {
    return this.activeTeeth.filter((t) => t.probing >= 6).length * 6;
  }

  getNic(tooth: PerioToothMvp): number {
    return this.clamp(tooth.probing + tooth.recession);
  }

  onNumberInput(tooth: PerioToothMvp, field: 'probing' | 'recession', event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) {
      return;
    }

    tooth[field] = this.clamp(Number(input.value));
  }

  private get activeTeeth(): PerioToothMvp[] {
    return [...this.teethMap.values()].filter((tooth) => tooth.present);
  }

  private makeTooth(id: number): PerioToothMvp {
    return {
      id,
      present: true,
      probing: 0,
      recession: 0,
      bleeding: [false, false, false],
      plaque: [false, false, false],
      mobility: 0,
      furcation: 0
    };
  }

  private clamp(value: number, min = 0, max = 12): number {
    if (Number.isNaN(value)) {
      return min;
    }

    return Math.min(max, Math.max(min, value));
  }
}

