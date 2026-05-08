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
  /** NIC (nivel de inserción clínica), en mm desde el CEJ al fondo del saco. Es input directo. */
  @Input({ required: true }) nic!: [number, number, number];
  @Input({ required: true }) bleeding!: [boolean, boolean, boolean];
  @Input({ required: true }) plaque!: [boolean, boolean, boolean];
  @Input({ required: true }) suppuration!: [boolean, boolean, boolean];
  @Input({ required: true }) calculus!: [boolean, boolean, boolean];
  @Input({ required: true }) present!: boolean;

  /** Si true, muestra las marcas del eje Y (0, 3, 6, 9, 12 mm). Útil solo en el primer diente de cada fila. */
  @Input() showAxisLabels = false;

  /**
   * Datos del sitio distal de la pieza vecina anterior (mismo arco y misma cara).
   * Si están presentes, el gráfico dibuja la media cola izquierda hasta el borde
   * compartido con esa pieza para encadenar las polilíneas entre dientes.
   */
  @Input() prevDistalProbing: number | null = null;
  @Input() prevDistalNic: number | null = null;

  /** Datos del sitio mesial de la pieza vecina siguiente (mismo arco y misma cara). */
  @Input() nextMesialProbing: number | null = null;
  @Input() nextMesialNic: number | null = null;

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
    return [left, (left + right) / 2, right];
  }

  /**
   * Posición relativa (0–1) del borde físico entre dos columnas vecinas,
   * medida desde el distal de la pieza izquierda hacia el mesial de la pieza
   * derecha. Como el plot deja un margen mayor a la izquierda (etiquetas)
   * que a la derecha, el borde queda más cerca del distal.
   */
  get boundaryT(): number {
    const rightTail = this.vbW - this.plot.right;
    const leftTail = this.plot.left;
    return rightTail / (rightTail + leftTail);
  }

  get probingPolyline(): string {
    return this.polylinePoints(
      (i) => this.clampMm(this.probing[i]),
      this.hasPrevConnectorPS ? this.prevDistalProbing : null,
      this.hasNextConnectorPS ? this.nextMesialProbing : null
    );
  }

  /** NIC (nivel de inserción clínica), mm desde CEJ al fondo del saco. */
  get nicPolyline(): string {
    return this.polylinePoints(
      (i) => this.clampMm(this.nic[i]),
      this.hasPrevConnectorNIC ? this.prevDistalNic : null,
      this.hasNextConnectorNIC ? this.nextMesialNic : null
    );
  }

  /**
   * Línea del margen gingival (MG) = NIC − PS. Representa la posición del
   * margen de la encía respecto al CEJ. Es derivada: solo se mueve cuando
   * cambian NIC o PS.
   */
  get marginPolyline(): string {
    return this.polylinePoints(
      (i) => this.mgAtSite(i),
      this.hasPrevConnectorMargin ? this.prevDistalMgMm : null,
      this.hasNextConnectorMargin ? this.nextMesialMgMm : null
    );
  }

  /**
   * Relleno del saco: entre la línea del margen gingival (arriba) y la
   * línea del NIC (abajo). Se extiende a un vecino solo cuando *ambas*
   * curvas pueden conectarse por ese lado (NIC y MG).
   */
  get nicPath(): string {
    if (!this.present) {
      return '';
    }
    const xs = this.siteXs;
    const mgAt = (i: number) => this.mgAtSite(i);
    const nicAt = (i: number) => this.clampMm(this.nic[i]);
    const extendPrev = this.hasPrevConnectorMargin && this.hasPrevConnectorNIC;
    const extendNext = this.hasNextConnectorMargin && this.hasNextConnectorNIC;

    const ptsMargin: string[] = [];
    if (extendPrev && this.prevDistalMgMm != null) {
      ptsMargin.push(`0,${this.yPx(this.boundaryMm(this.prevDistalMgMm, mgAt(0)))}`);
    }
    xs.forEach((x, i) => ptsMargin.push(`${x},${this.yPx(mgAt(i))}`));
    if (extendNext && this.nextMesialMgMm != null) {
      ptsMargin.push(
        `${this.vbW},${this.yPx(this.boundaryMm(mgAt(2), this.nextMesialMgMm))}`
      );
    }

    const ptsNic: string[] = [];
    if (extendNext && this.nextMesialNic != null) {
      ptsNic.push(
        `${this.vbW},${this.yPx(this.boundaryMm(nicAt(2), this.nextMesialNic))}`
      );
    }
    for (let i = xs.length - 1; i >= 0; i--) {
      ptsNic.push(`${xs[i]},${this.yPx(nicAt(i))}`);
    }
    if (extendPrev && this.prevDistalNic != null) {
      ptsNic.push(`0,${this.yPx(this.boundaryMm(this.prevDistalNic, nicAt(0)))}`);
    }

    return `M ${ptsMargin.join(' L ')} L ${ptsNic.join(' L ')} Z`;
  }

  /** MG (mm) propio del sitio i, derivado como NIC − PS, clampeado a 0. */
  private mgAtSite(i: number): number {
    const ps = Number(this.probing[i]) || 0;
    const nic = Number(this.nic[i]) || 0;
    return this.clampMm(Math.max(0, nic - ps));
  }

  private polylinePoints(
    yMmAtIndex: (i: number) => number,
    prevValueMm: number | null,
    nextValueMm: number | null
  ): string {
    if (!this.present) {
      return '';
    }
    const xs = this.siteXs;
    const pts: string[] = [];

    if (prevValueMm != null) {
      pts.push(`0,${this.yPx(this.boundaryMm(prevValueMm, yMmAtIndex(0)))}`);
    }

    xs.forEach((x, i) => pts.push(`${x},${this.yPx(yMmAtIndex(i))}`));

    if (nextValueMm != null) {
      pts.push(`${this.vbW},${this.yPx(this.boundaryMm(yMmAtIndex(2), nextValueMm))}`);
    }

    return pts.join(' ');
  }

  /** Interpolación lineal en mm en el borde compartido entre dos columnas. */
  private boundaryMm(leftMm: number, rightMm: number): number {
    const a = this.clampMm(leftMm);
    const b = this.clampMm(rightMm);
    return a + this.boundaryT * (b - a);
  }

  /** Valor distinto de cero (no nulo). Sirve para “hay medición en este sitio”. */
  private nonZero(v: number | null | undefined): boolean {
    return v != null && v !== 0;
  }

  /**
   * Unión de la línea de PS con la pieza anterior: PS distal vecino != 0
   * y PS mesial propio != 0.
   */
  private get hasPrevConnectorPS(): boolean {
    return this.nonZero(this.prevDistalProbing) && this.probing[0] !== 0;
  }

  /** Idem hacia la pieza siguiente. */
  private get hasNextConnectorPS(): boolean {
    return this.probing[2] !== 0 && this.nonZero(this.nextMesialProbing);
  }

  /** Unión de la línea de NIC con la pieza anterior: NIC vecino y propio != 0. */
  private get hasPrevConnectorNIC(): boolean {
    return this.nonZero(this.prevDistalNic) && this.nic[0] !== 0;
  }

  /** Idem hacia la pieza siguiente. */
  private get hasNextConnectorNIC(): boolean {
    return this.nic[2] !== 0 && this.nonZero(this.nextMesialNic);
  }

  /** MG (mm) del distal vecino anterior = NIC vecino − PS vecino. */
  private get prevDistalMgMm(): number | null {
    if (this.prevDistalNic == null || this.prevDistalProbing == null) {
      return null;
    }
    return Math.max(0, this.prevDistalNic - this.prevDistalProbing);
  }

  /** MG (mm) del mesial vecino siguiente = NIC vecino − PS vecino. */
  private get nextMesialMgMm(): number | null {
    if (this.nextMesialNic == null || this.nextMesialProbing == null) {
      return null;
    }
    return Math.max(0, this.nextMesialNic - this.nextMesialProbing);
  }

  /**
   * Unión de la línea del margen gingival con la pieza anterior: hay MG en
   * el distal del vecino y en el mesial propio (es decir, NIC > PS en ambos).
   */
  private get hasPrevConnectorMargin(): boolean {
    const ownMg = this.mgAtSite(0);
    return this.nonZero(this.prevDistalMgMm) && ownMg !== 0;
  }

  /** Idem hacia la pieza siguiente. */
  private get hasNextConnectorMargin(): boolean {
    const ownMg = this.mgAtSite(2);
    return ownMg !== 0 && this.nonZero(this.nextMesialMgMm);
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

  /**
   * Triángulo equilátero apuntando hacia abajo, dibujado justo por debajo
   * de la línea de PS en el sitio i. Marca supuración (pus) en el saco.
   */
  suppurationPoints(i: number): string {
    const cx = this.siteXs[i];
    const cy = this.yPx(this.clampMm(this.probing[i])) + 3;
    const half = 1.5;
    return `${cx - half},${cy - 1.2} ${cx + half},${cy - 1.2} ${cx},${cy + 1.6}`;
  }

  /**
   * Rombo (cuadrado rotado 45°) dibujado justo por debajo del margen
   * gingival (MG = NIC − PS) en el sitio i. Marca cálculo subgingival.
   */
  calculusPoints(i: number): string {
    const cx = this.siteXs[i];
    const cy = this.yPx(this.mgAtSite(i)) + 3;
    const half = 1.5;
    return `${cx},${cy - half} ${cx + half},${cy} ${cx},${cy + half} ${cx - half},${cy}`;
  }
}
