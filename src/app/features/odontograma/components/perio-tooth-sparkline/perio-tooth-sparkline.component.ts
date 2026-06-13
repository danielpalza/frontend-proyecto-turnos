/**
 * Mini gráfico SVG por cara dental: PS, MG, NIC, relleno del saco
 * y marcas de sangrado/placa/supuración/cálculo; enlaza con vecinos.
 */
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/** Eje vertical fijo −7…12 mm (siete divisiones por debajo del CEJ); 12 mm = fondo de saco. */
const Y_AXIS_MIN = -7;
const Y_AXIS_MAX = 12;
const Y_SPAN = Y_AXIS_MAX - Y_AXIS_MIN;

@Component({
  selector: 'app-perio-tooth-sparkline',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './perio-tooth-sparkline.component.html',
  styleUrls: ['./perio-tooth-sparkline.component.scss']
})
export class PerioToothSparklineComponent {
  @Input({ required: true }) probing!: [number, number, number];
  /** NIC (nivel de inserción clínica), en mm desde el CEJ al fondo del saco. Derivado: PS + MG. */
  @Input({ required: true }) nic!: [number, number, number];
  /** Margen gingival (MG), en mm respecto al CEJ; input manual (misma escala que PS/NIC). */
  @Input({ required: true }) mg!: [number, number, number];
  @Input({ required: true }) bleeding!: [boolean, boolean, boolean];
  @Input({ required: true }) plaque!: [boolean, boolean, boolean];
  @Input({ required: true }) suppuration!: [boolean, boolean, boolean];
  @Input({ required: true }) calculus!: [boolean, boolean, boolean];
  @Input({ required: true }) present!: boolean;

  /** Si true, muestra marcas del eje Y cada 3 mm (incluye negativos). Útil solo en el primer diente de cada fila. */
  @Input() showAxisLabels = false;

  /**
   * Si true, el CEJ (0 mm) queda abajo y 12 mm arriba (útil en arcada superior,
   * coherente con mirar el maxilar desde abajo).
   */
  @Input() zeroAtBottom = false;

  /** Identificador del diente para data-testid del mini gráfico. */
  @Input() toothId?: number;
  @Input() chartFace: 'vest' | 'ling' = 'vest';

  get sparklineTestId(): string | null {
    if (this.toothId == null) {
      return null;
    }
    return `periodontogram-mini-chart-${this.toothId}-${this.chartFace}`;
  }

  /**
   * Datos del sitio distal de la pieza vecina anterior (mismo arco y misma cara).
   * Si están presentes, el gráfico dibuja la media cola izquierda hasta el borde
   * compartido con esa pieza para encadenar las polilíneas entre dientes.
   */
  @Input() prevDistalProbing: number | null = null;
  @Input() prevDistalNic: number | null = null;
  @Input() prevDistalMg: number | null = null;

  /** Datos del sitio mesial de la pieza vecina siguiente (mismo arco y misma cara). */
  @Input() nextMesialProbing: number | null = null;
  @Input() nextMesialNic: number | null = null;
  @Input() nextMesialMg: number | null = null;

  /** Marcas horizontales cada 1 mm (−7 … 12). */
  readonly mmTicks: readonly number[] = Array.from(
    { length: Y_AXIS_MAX - Y_AXIS_MIN + 1 },
    (_, i) => Y_AXIS_MIN + i
  );

  readonly siteIndices: readonly [0, 1, 2] = [0, 1, 2];

  /** Texto accesible que describe curvas y orientación del eje. */
  get sparklineAriaLabel(): string {
    if (!this.present) {
      return 'Diente no presente: mini gráfico desactivado';
    }
    const axis = this.zeroAtBottom
      ? 'eje −7 a 12 mm (0 abajo, 12 arriba)'
      : 'eje −7 a 12 mm (0 arriba, 12 abajo)';
    return `Mini gráfico perio: PS (rojo), MG (verde), NIC (azul, PS + MG), ${axis}`;
  }

  /** Etiquetas del eje Y (mm), alineadas con la rejilla mayor cada 3 mm. */
  readonly axisMajorMms: readonly number[] = [-6, -3, 0, 3, 6, 9, 12];

  /** Posición X del borde derecho de las etiquetas (text-anchor: end). */
  readonly axisLabelAnchorX = 5.2;

  /** viewBox interno (ancho reducido: sin franja vacía solo para números del eje). */
  readonly vbW = 52;
  readonly vbH = 56;

  readonly plot = { left: 5.5, right: 49.5, top: 5.5, bottom: 50.5 };

  /** Borde izquierdo del área de trazado (viewBox). */
  get plotLeft(): number {
    return this.plot.left;
  }

  /** Borde derecho del área de trazado (viewBox). */
  get plotRight(): number {
    return this.plot.right;
  }

  /** Líneas horizontales de la rejilla (mayores cada 3 mm). */
  get gridLines(): { mm: number; y: number; major: boolean }[] {
    return this.mmTicks.map((mm) => ({
      mm,
      y: this.yPx(mm),
      major: mm % 3 === 0
    }));
  }

  /** Coordenadas X de los tres sitios (distal, central, mesial). */
  get siteXs(): number[] {
    const { left, right } = this.plot;
    return [left, (left + right) / 2, right];
  }

  /**
   * Posición relativa (0–1) del borde físico entre dos columnas vecinas,
   * medida desde el distal de la pieza izquierda hacia el mesial de la pieza
   * derecha. Depende de los márgenes horizontales (vbW − plot.right vs plot.left).
   */
  get boundaryT(): number {
    const rightTail = this.vbW - this.plot.right;
    const leftTail = this.plot.left;
    return rightTail / (rightTail + leftTail);
  }

  /** Atributo points de la polilínea de profundidad de sondaje (PS). */
  get probingPolyline(): string {
    return this.polylinePoints(
      (i) => this.clampMm(Math.max(0, Number(this.probing[i]) || 0)),
      this.hasPrevConnectorPS ? this.clampMm(Math.max(0, this.prevDistalProbing!)) : null,
      this.hasNextConnectorPS ? this.clampMm(Math.max(0, this.nextMesialProbing!)) : null
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
   * Línea del margen gingival (MG), mm respecto al CEJ; coincide con el
   * valor ingresado (NIC = PS + MG).
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

  /**
   * MG (mm) del sitio i (input manual), clampa al rango visible del eje
   * (−7…12 mm).
   */
  private mgAtSite(i: number): number {
    return this.clampMm(Number(this.mg[i]) || 0);
  }

  /** Construye puntos SVG con conectores opcionales a piezas vecinas. */
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

  /** MG (mm) en el distal del vecino anterior (input del vecino, clampado al eje). */
  private get prevDistalMgMm(): number | null {
    if (this.prevDistalMg == null) {
      return null;
    }
    return this.clampMm(this.prevDistalMg);
  }

  /** MG (mm) en el mesial del vecino siguiente (input del vecino, clampado al eje). */
  private get nextMesialMgMm(): number | null {
    if (this.nextMesialMg == null) {
      return null;
    }
    return this.clampMm(this.nextMesialMg);
  }

  /**
   * Unión de la línea del margen gingival con la pieza anterior: MG distal
   * del vecino y MG mesial propio distintos de cero.
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

  /** Convierte mm clínicos a coordenada Y en el viewBox. */
  yPx(mm: number): number {
    const { top, bottom } = this.plot;
    const h = bottom - top;
    const t = (mm - Y_AXIS_MIN) / Y_SPAN;
    return this.zeroAtBottom ? bottom - t * h : top + t * h;
  }

  /** Acota un valor al rango visible del eje (−7…12 mm). */
  clampMm(v: number): number {
    if (!Number.isFinite(v)) {
      return 0;
    }
    return Math.min(Y_AXIS_MAX, Math.max(Y_AXIS_MIN, v));
  }

  /**
   * Triángulo equilátero apuntando hacia abajo, dibujado justo por debajo
   * de la línea de PS en el sitio i. Marca supuración (pus) en el saco.
   */
  suppurationPoints(i: number): string {
    const cx = this.siteXs[i];
    const off = this.zeroAtBottom ? -3 : 3;
    const cy = this.yPx(this.clampMm(Math.max(0, Number(this.probing[i]) || 0))) + off;
    const half = 1.5;
    return `${cx - half},${cy - 1.2} ${cx + half},${cy - 1.2} ${cx},${cy + 1.6}`;
  }

  /**
   * Rombo (cuadrado rotado 45°) dibujado justo por debajo del margen
   * gingival (MG) en el sitio i. Marca cálculo subgingival.
   */
  calculusPoints(i: number): string {
    const cx = this.siteXs[i];
    const off = this.zeroAtBottom ? -3 : 3;
    const cy = this.yPx(this.mgAtSite(i)) + off;
    const half = 1.5;
    return `${cx},${cy - half} ${cx + half},${cy} ${cx},${cy + half} ${cx - half},${cy}`;
  }
}
