import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/** Eje vertical fijo 0–12 mm (0 arriba, 12 abajo). */
const Y_MIN = 0;
const Y_MAX = 12;

@Component({
  selector: 'app-perio-tooth-sparkline',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './perio-tooth-sparkline.component.html',
  styleUrls: ['./perio-tooth-sparkline.component.scss']
})
export class PerioToothSparklineComponent {
  @Input({ required: true }) probing!: [number, number, number];
  @Input({ required: true }) recession!: [number, number, number];
  @Input({ required: true }) bleeding!: [boolean, boolean, boolean];
  @Input({ required: true }) plaque!: [boolean, boolean, boolean];
  @Input({ required: true }) present!: boolean;

  /** Marcas horizontales cada 1 mm (0 … 12). */
  readonly mmTicks: readonly number[] = Array.from({ length: Y_MAX - Y_MIN + 1 }, (_, i) => i);

  readonly siteIndices: readonly [0, 1, 2] = [0, 1, 2];

  /** Etiquetas del eje Y (mm), alineadas con la rejilla mayor cada 3 mm. */
  readonly axisMajorMms: readonly number[] = [0, 3, 6, 9, 12];

  /** Posición X del borde derecho de las etiquetas (text-anchor: end). */
  readonly axisLabelAnchorX = 9.2;

  /** viewBox interno: margen izquierdo reservado para etiquetas del eje Y. */
  readonly vbW = 58;
  readonly vbH = 56;

  readonly plot = { left: 11.5, right: 55.5, top: 5.5, bottom: 50.5 };

  get plotLeft(): number {
    return this.plot.left;
  }

  get plotRight(): number {
    return this.plot.right;
  }

  get gridLines(): { y: number; major: boolean }[] {
    const { top, bottom } = this.plot;
    const h = bottom - top;
    return this.mmTicks.map((mm) => ({
      y: top + (mm / Y_MAX) * h,
      major: mm % 3 === 0
    }));
  }

  get siteXs(): number[] {
    const { left, right } = this.plot;
    const w = right - left;
    return [left + w * 0.15, left + w * 0.5, left + w * 0.85];
  }

  get probingPolyline(): string {
    return this.polylinePoints((i) => this.clampMm(this.probing[i]));
  }

  /** NIC (nivel de inserción clínica) = PS + recesión (mm desde CEJ al fondo de bolsa). */
  get nicPolyline(): string {
    return this.polylinePoints((i) => this.clampMm(this.probing[i] + this.recession[i]));
  }

  /** Relleno entre margen gingival (recesión) y NIC. */
  get nicPath(): string {
    if (!this.present) {
      return '';
    }
    const xs = this.siteXs;
    const ptsMargin = xs.map(
      (x, i) => `${x},${this.yPx(this.clampMm(this.recession[i]))}`
    );
    const ptsNic = xs
      .map((x, i) => `${x},${this.yPx(this.clampMm(this.probing[i] + this.recession[i]))}`)
      .reverse();
    return `M ${ptsMargin.join(' L ')} L ${ptsNic.join(' L ')} Z`;
  }

  private polylinePoints(yMmAtIndex: (i: number) => number): string {
    if (!this.present) {
      return '';
    }
    return this.siteXs
      .map((x, i) => `${x},${this.yPx(yMmAtIndex(i))}`)
      .join(' ');
  }

  yPx(mm: number): number {
    const { top, bottom } = this.plot;
    return top + (mm / Y_MAX) * (bottom - top);
  }

  clampMm(v: number): number {
    if (!Number.isFinite(v)) {
      return 0;
    }
    return Math.min(Y_MAX, Math.max(Y_MIN, v));
  }
}
