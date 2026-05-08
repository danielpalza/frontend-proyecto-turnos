import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PerioToothSparklineComponent } from '../perio-tooth-sparkline/perio-tooth-sparkline.component';

interface PerioFaceMvp {
  /** Profundidad de sondaje (PS), en mm. Se mide del margen gingival al fondo del saco. */
  probing: [number, number, number];
  /** Nivel de Inserción Clínica (NIC), en mm. Se mide del CEJ al fondo del saco; es el input principal. */
  nic: [number, number, number];
  bleeding: [boolean, boolean, boolean];
  plaque: [boolean, boolean, boolean];
  suppuration: [boolean, boolean, boolean];
  calculus: [boolean, boolean, boolean];
}

interface PerioToothMvp {
  id: number;
  present: boolean;
  vestibular: PerioFaceMvp;
  lingual: PerioFaceMvp;
  mobility: number;
  furcation: number;
}

@Component({
  selector: 'app-periodontograma-form',
  standalone: true,
  imports: [CommonModule, FormsModule, PerioToothSparklineComponent],
  templateUrl: './periodontograma-form.component.html',
  styleUrls: ['./periodontograma-form.component.scss']
})
export class PeriodontogramaFormComponent {
  readonly upperIds = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
  readonly lowerIds = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

  /** Vista activa: una arcada a la vez para reducir scroll en pantallas pequeñas. */
  activeArc: 'upper' | 'lower' = 'upper';

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

  /**
   * Clase de fondo para valores en mm (PS, NIC): 0–3 verde, 4–5 amarillo, 6+ rojo.
   */
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

  /**
   * Margen gingival (MG) de un sitio = NIC − PS. Es derivado, no se carga.
   * Se clampa a 0 si la combinación es inválida (NIC < PS) para no
   * representar valores negativos en el gráfico.
   */
  getMg(face: PerioFaceMvp, siteIndex: 0 | 1 | 2): number {
    const ps = Number(face.probing[siteIndex]) || 0;
    const nic = Number(face.nic[siteIndex]) || 0;
    return Math.max(0, nic - ps);
  }

  /** Máximo NIC de la pieza (cualquier cara/sitio); usado en el header del tooth-form. */
  getNic(tooth: PerioToothMvp): number {
    let max = 0;
    for (const face of [tooth.vestibular, tooth.lingual]) {
      for (let i = 0; i < 3; i++) {
        const nic = this.clamp(face.nic[i]);
        if (nic > max) {
          max = nic;
        }
      }
    }
    return max;
  }

  onNumberInput(
    face: PerioFaceMvp,
    field: 'probing' | 'nic',
    siteIndex: 0 | 1 | 2,
    event: Event
  ): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) {
      return;
    }

    face[field][siteIndex] = this.clamp(Number(input.value));
  }

  /**
   * Al enfocar (click o tab) un input numérico cuyo valor es 0, lo deja
   * vacío para que el usuario tipee directamente sin tener que borrar el
   * 0 previo. Marca el input con un dataset flag para poder restaurarlo
   * en `onBlurRestoreZero` si el usuario sale sin tipear nada.
   */
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

  /**
   * Si el input quedó vacío y al enfocarlo era 0, repone el "0" visual al
   * salir para que la celda no aparezca en blanco.
   */
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

  /**
   * Devuelve la cara (vestibular/lingual) de la pieza vecina (anterior o
   * siguiente) si existe y está presente; sino, null. Sirve para que el
   * sparkline de cada diente pueda extender sus polilíneas hasta el borde
   * compartido con sus vecinos.
   */
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

  private makeTooth(id: number): PerioToothMvp {
    return {
      id,
      present: true,
      vestibular: this.emptyFace(),
      lingual: this.emptyFace(),
      mobility: 0,
      furcation: 0
    };
  }

  private emptyFace(): PerioFaceMvp {
    return {
      probing: [0, 0, 0],
      nic: [0, 0, 0],
      bleeding: [false, false, false],
      plaque: [false, false, false],
      suppuration: [false, false, false],
      calculus: [false, false, false]
    };
  }

  private clamp(value: number, min = 0, max = 12): number {
    if (Number.isNaN(value)) {
      return min;
    }

    return Math.min(max, Math.max(min, value));
  }
}

