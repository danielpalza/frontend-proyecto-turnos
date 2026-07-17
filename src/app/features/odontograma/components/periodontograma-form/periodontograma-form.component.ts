/**
 * Formulario de periodontograma: datos por pieza (PS, MG, índices),
 * KPIs de la arcada, tabulación clínica y sparklines por cara.
 */
import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { PerioToothSparklineComponent } from '../perio-tooth-sparkline/perio-tooth-sparkline.component';
import { OdontogramaStateService } from '../../services/odontograma-state.service';
import { PerioFaceMvp, PerioToothMvp } from '../../../../core/models/periodontograma.model';

@Component({
  selector: 'app-periodontograma-form',
  standalone: true,
  imports: [CommonModule, FormsModule, PerioToothSparklineComponent],
  templateUrl: './periodontograma-form.component.html',
  styleUrls: ['./periodontograma-form.component.scss']
})
export class PeriodontogramaFormComponent implements OnInit, OnDestroy {
  readonly upperIds = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
  readonly lowerIds = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

  activeArc: 'upper' | 'lower' = 'upper';

  teethMap = new Map<number, PerioToothMvp>();

  private perioSub?: Subscription;

  constructor(private readonly stateService: OdontogramaStateService) {}

  ngOnInit(): void {
    this.teethMap = this.stateService.getPerioTeethMap();
    this.perioSub = this.stateService.perioTeeth$.subscribe(map => {
      this.teethMap = map;
    });
  }

  ngOnDestroy(): void {
    this.perioSub?.unsubscribe();
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

    const bleedingSites = this.activeTeeth.reduce((acc, tooth) => {
      const v = tooth.vestibular.bleeding.filter(Boolean).length;
      const l = tooth.lingual.bleeding.filter(Boolean).length;
      return acc + v + l;
    }, 0);
    return Math.round((bleedingSites / this.totalSites) * 100);
  }

  get plaquePercent(): number {
    if (this.totalSites === 0) {
      return 0;
    }

    const plaqueSites = this.activeTeeth.reduce((acc, tooth) => {
      const v = tooth.vestibular.plaque.filter(Boolean).length;
      const l = tooth.lingual.plaque.filter(Boolean).length;
      return acc + v + l;
    }, 0);
    return Math.round((plaqueSites / this.totalSites) * 100);
  }

  get suppurationPercent(): number {
    if (this.totalSites === 0) {
      return 0;
    }

    const suppurationSites = this.activeTeeth.reduce((acc, tooth) => {
      const v = tooth.vestibular.suppuration.filter(Boolean).length;
      const l = tooth.lingual.suppuration.filter(Boolean).length;
      return acc + v + l;
    }, 0);
    return Math.round((suppurationSites / this.totalSites) * 100);
  }

  get calculusPercent(): number {
    if (this.totalSites === 0) {
      return 0;
    }

    const calculusSites = this.activeTeeth.reduce((acc, tooth) => {
      const v = tooth.vestibular.calculus.filter(Boolean).length;
      const l = tooth.lingual.calculus.filter(Boolean).length;
      return acc + v + l;
    }, 0);
    return Math.round((calculusSites / this.totalSites) * 100);
  }

  get avgProbing(): string {
    const values: number[] = [];
    for (const tooth of this.activeTeeth) {
      for (const face of [tooth.vestibular, tooth.lingual]) {
        for (const p of face.probing) {
          if (p > 0) {
            values.push(p);
          }
        }
      }
    }
    if (values.length === 0) {
      return '—';
    }

    const sum = values.reduce((acc, p) => acc + p, 0);
    return (sum / values.length).toFixed(1);
  }

  get deepSites(): number {
    return this.activeTeeth.reduce((acc, tooth) => {
      const v = tooth.vestibular.probing.filter((p) => p >= 6).length;
      const l = tooth.lingual.probing.filter((p) => p >= 6).length;
      return acc + v + l;
    }, 0);
  }

  perioValueToneClass(value: number): 'perio-val--low' | 'perio-val--mid' | 'perio-val--high' {
    const n = Number(value);
    if (!Number.isFinite(n)) {
      return 'perio-val--low';
    }
    if (n <= 3) {
      return 'perio-val--low';
    }
    if (n <= 5) {
      return 'perio-val--mid';
    }
    return 'perio-val--high';
  }

  nicAt(face: PerioFaceMvp, siteIndex: 0 | 1 | 2): number {
    const ps = Number(face.probing[siteIndex]) || 0;
    const mg = Number(face.mg[siteIndex]) || 0;
    return this.clamp(ps + mg);
  }

  nicTuple(face: PerioFaceMvp): [number, number, number] {
    return [this.nicAt(face, 0), this.nicAt(face, 1), this.nicAt(face, 2)];
  }

  prevDistalNic(teeth: PerioToothMvp[], index: number, face: 'vestibular' | 'lingual'): number | null {
    const n = this.neighborFace(teeth, index, 'prev', face);
    return n ? this.nicAt(n, 2) : null;
  }

  nextMesialNic(teeth: PerioToothMvp[], index: number, face: 'vestibular' | 'lingual'): number | null {
    const n = this.neighborFace(teeth, index, 'next', face);
    return n ? this.nicAt(n, 0) : null;
  }

  getNic(tooth: PerioToothMvp): number {
    let max = 0;
    for (const face of [tooth.vestibular, tooth.lingual]) {
      for (let i = 0; i < 3; i++) {
        const nic = this.nicAt(face, i as 0 | 1 | 2);
        if (nic > max) {
          max = nic;
        }
      }
    }
    return max;
  }

  syncPerio(): void {
    this.stateService.notifyPerioChange();
  }

  onNumberInput(
    toothId: number,
    faceSide: 'vestibular' | 'lingual',
    field: 'probing' | 'mg',
    siteIndex: 0 | 1 | 2,
    event: Event
  ): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) {
      return;
    }

    const min = field === 'mg' ? -10 : 0;
    const value = this.clamp(Number(input.value), min, 12);

    this.stateService.updatePerioTooth(toothId, tooth => {
      tooth[faceSide][field][siteIndex] = value;
    });
  }

  onFocusClearIfZero(event: FocusEvent): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) {
      return;
    }

    if (Number(input.value) === 0) {
      input.dataset['perioWasZero'] = '1';
      input.value = '';
    }
  }

  onBlurRestoreZero(event: FocusEvent): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) {
      return;
    }

    if (input.dataset['perioWasZero'] === '1' && input.value === '') {
      input.value = '0';
    }
    delete input.dataset['perioWasZero'];
  }

  onPerioTabPath(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.shiftKey) {
      return;
    }

    const currentInput = keyboardEvent.target as HTMLInputElement | null;
    if (!currentInput) {
      return;
    }

    const field = currentInput.dataset['field'];
    const siteText = currentInput.dataset['site'];
    const site = Number(siteText);
    if ((field !== 'mg' && field !== 'probing') || !Number.isInteger(site)) {
      return;
    }

    let nextInput: HTMLInputElement | null = null;
    if (field === 'mg') {
      const grid = currentInput.closest('.perio-grid');
      nextInput = grid?.querySelector<HTMLInputElement>(
        `input[data-field="probing"][data-site="${site}"]`
      ) ?? null;
    } else if (site < 2) {
      const grid = currentInput.closest('.perio-grid');
      nextInput = grid?.querySelector<HTMLInputElement>(
        `input[data-field="mg"][data-site="${site + 1}"]`
      ) ?? null;
    } else {
      nextInput = this.findNextToothMesialMg(currentInput);
    }

    if (!nextInput || nextInput.disabled) {
      return;
    }

    keyboardEvent.preventDefault();
    nextInput.focus();
    nextInput.select();
  }

  onMgTabToMatchingPs(event: Event): void {
    this.onPerioTabPath(event);
  }

  private findNextToothMesialMg(currentInput: HTMLInputElement): HTMLInputElement | null {
    let currentColumn = currentInput.closest('.tooth-column') as HTMLElement | null;
    while (currentColumn?.nextElementSibling) {
      currentColumn = currentColumn.nextElementSibling as HTMLElement;
      const candidate = currentColumn.querySelector<HTMLInputElement>(
        '.perio-grid input[data-field="mg"][data-site="0"]'
      );
      if (candidate && !candidate.disabled) {
        return candidate;
      }
    }
    return null;
  }

  neighborFace(
    teeth: PerioToothMvp[],
    i: number,
    side: 'prev' | 'next',
    face: 'vestibular' | 'lingual'
  ): PerioFaceMvp | null {
    const idx = side === 'prev' ? i - 1 : i + 1;
    const t = teeth[idx];
    return t?.present ? t[face] : null;
  }

  private get activeTeeth(): PerioToothMvp[] {
    return [...this.teethMap.values()].filter((tooth) => tooth.present);
  }

  private clamp(value: number, min = 0, max = 12): number {
    if (Number.isNaN(value)) {
      return min;
    }

    return Math.min(max, Math.max(min, value));
  }

  psVestTestId(toothId: number, site: number): string {
    return `periodontogram-ps-vest-${toothId}-${site}`;
  }

  psLingTestId(toothId: number, site: number): string {
    return `periodontogram-ps-ling-${toothId}-${site}`;
  }

  nicDisplayTestId(toothId: number): string {
    return `periodontogram-nic-display-${toothId}`;
  }

  mobilityTestId(toothId: number): string {
    return `periodontogram-mobility-${toothId}`;
  }

  furcationTestId(toothId: number): string {
    return `periodontogram-furcation-${toothId}`;
  }
}
