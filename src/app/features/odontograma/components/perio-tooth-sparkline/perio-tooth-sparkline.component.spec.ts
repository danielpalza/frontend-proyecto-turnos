import { PerioToothSparklineComponent } from './perio-tooth-sparkline.component';

function makeComponent(overrides: Partial<PerioToothSparklineComponent> = {}): PerioToothSparklineComponent {
  const c = new PerioToothSparklineComponent();
  c.probing = [2, 2, 2];
  c.nic = [2, 2, 2];
  c.mg = [0, 0, 0];
  c.bleeding = [false, false, false];
  c.plaque = [false, false, false];
  c.suppuration = [false, false, false];
  c.calculus = [false, false, false];
  c.present = true;
  Object.assign(c, overrides);
  return c;
}

describe('PerioToothSparklineComponent (sin DI, instanciado con new)', () => {
  describe('yPx', () => {
    it('las dos orientaciones invierten el mismo mapeo lineal simétricamente', () => {
      const normal = makeComponent({ zeroAtBottom: false });
      const invertido = makeComponent({ zeroAtBottom: true });

      const yMinNormal = normal.yPx(-7);
      const yMaxNormal = normal.yPx(12);
      const yMinInvertido = invertido.yPx(-7);
      const yMaxInvertido = invertido.yPx(12);

      expect(yMinNormal).toBe(yMaxInvertido);
      expect(yMaxNormal).toBe(yMinInvertido);
    });

    it('zeroAtBottom=false: -7mm queda arriba (top), 12mm abajo (bottom)', () => {
      const c = makeComponent({ zeroAtBottom: false });
      expect(c.yPx(-7)).toBe(5.5);
      expect(c.yPx(12)).toBe(50.5);
    });
  });

  describe('clampMm', () => {
    it('NaN/Infinity dan 0', () => {
      const c = makeComponent();
      expect(c.clampMm(NaN)).toBe(0);
      expect(c.clampMm(Infinity)).toBe(0);
      expect(c.clampMm(-Infinity)).toBe(0);
    });

    it('fuera de [-7, 12] clampa al borde', () => {
      const c = makeComponent();
      expect(c.clampMm(-100)).toBe(-7);
      expect(c.clampMm(100)).toBe(12);
      expect(c.clampMm(5)).toBe(5);
    });
  });

  describe('conectores hacia dientes vecinos: ambos lados deben ser != 0', () => {
    it('probingPolyline sin present es cadena vacía', () => {
      const c = makeComponent({ present: false });
      expect(c.probingPolyline).toBe('');
    });

    it('con PS propio !=0 pero vecino en 0, NO conecta (sin punto extra en x=0)', () => {
      const c = makeComponent({ probing: [2, 2, 2], prevDistalProbing: 0 });
      const points = c.probingPolyline.split(' ');
      expect(points).toHaveLength(3);
      expect(points[0]).not.toMatch(/^0,/);
    });

    it('con PS propio !=0 y vecino !=0, conecta (agrega un punto extra en x=0)', () => {
      const c = makeComponent({ probing: [2, 2, 2], prevDistalProbing: 3 });
      const points = c.probingPolyline.split(' ');
      expect(points).toHaveLength(4);
      expect(points[0]).toMatch(/^0,/);
    });

    it('con PS propio en 0, NO conecta aunque el vecino sea !=0', () => {
      const c = makeComponent({ probing: [0, 2, 2], prevDistalProbing: 3 });
      const points = c.probingPolyline.split(' ');
      expect(points).toHaveLength(3);
    });

    it('mismo criterio aplica al conector siguiente (mesial->distal del vecino)', () => {
      const conVecino = makeComponent({ probing: [2, 2, 2], nextMesialProbing: 3 });
      const sinVecino = makeComponent({ probing: [2, 2, 2], nextMesialProbing: 0 });

      expect(conVecino.probingPolyline.split(' ')).toHaveLength(4);
      expect(sinVecino.probingPolyline.split(' ')).toHaveLength(3);
    });
  });

  describe('nicPath: relleno cerrado entre MG y NIC', () => {
    it('sin present, devuelve cadena vacía', () => {
      const c = makeComponent({ present: false });
      expect(c.nicPath).toBe('');
    });

    it('con present, arma un path SVG cerrado (M ... L ... Z) con 6 puntos sin conectores', () => {
      const c = makeComponent({ mg: [0, 1, 0], nic: [2, 3, 2] });
      const path = c.nicPath;

      expect(path.startsWith('M ')).toBe(true);
      expect(path.endsWith(' Z')).toBe(true);
      const pointCount = path.replace(/^M /, '').replace(/ Z$/, '').split(' L ').length;
      expect(pointCount).toBe(6);
    });

    it('con conectores hacia ambos lados en MG y NIC, cada curva (margen y NIC) suma un punto extra por lado (10 en total)', () => {
      const c = makeComponent({
        mg: [1, 1, 1], nic: [2, 2, 2],
        prevDistalMg: 1, prevDistalNic: 2,
        nextMesialMg: 1, nextMesialNic: 2
      });

      const pointCount = c.nicPath.replace(/^M /, '').replace(/ Z$/, '').split(' L ').length;
      expect(pointCount).toBe(10);
    });
  });

  describe('marcas de supuración/cálculo', () => {
    it('suppurationPoints arma un triángulo de 3 puntos', () => {
      const c = makeComponent();
      const points = c.suppurationPoints(0).split(' ');
      expect(points).toHaveLength(3);
    });

    it('calculusPoints arma un rombo de 4 puntos', () => {
      const c = makeComponent();
      const points = c.calculusPoints(0).split(' ');
      expect(points).toHaveLength(4);
    });

    it('el offset de las marcas se invierte según zeroAtBottom', () => {
      const normal = makeComponent({ zeroAtBottom: false, probing: [2, 2, 2] });
      const invertido = makeComponent({ zeroAtBottom: true, probing: [2, 2, 2] });

      expect(normal.suppurationPoints(0)).not.toBe(invertido.suppurationPoints(0));
    });
  });

  describe('sparklineTestId / sparklineAriaLabel', () => {
    it('sin toothId, el testId es null', () => {
      const c = makeComponent({ toothId: undefined });
      expect(c.sparklineTestId).toBeNull();
    });

    it('con toothId, arma el testid con diente y cara', () => {
      const c = makeComponent({ toothId: 11, chartFace: 'vest' });
      expect(c.sparklineTestId).toBe('periodontogram-mini-chart-11-vest');
    });

    it('sin present, el aria-label dice que el gráfico está desactivado', () => {
      const c = makeComponent({ present: false });
      expect(c.sparklineAriaLabel).toContain('desactivado');
    });

    it('con present, el aria-label describe la orientación del eje', () => {
      const normal = makeComponent({ present: true, zeroAtBottom: false });
      const invertido = makeComponent({ present: true, zeroAtBottom: true });

      expect(normal.sparklineAriaLabel).toContain('0 arriba, 12 abajo');
      expect(invertido.sparklineAriaLabel).toContain('0 abajo, 12 arriba');
    });
  });

  it('gridLines genera una entrada por cada mm entre -7 y 12, marcando "major" cada 3mm', () => {
    const c = makeComponent();
    expect(c.gridLines).toHaveLength(20);
    expect(c.gridLines.find(g => g.mm === 0)!.major).toBe(true);
    expect(c.gridLines.find(g => g.mm === 1)!.major).toBe(false);
  });

  it('siteXs devuelve 3 coordenadas: distal, centro, mesial', () => {
    const c = makeComponent();
    expect(c.siteXs).toHaveLength(3);
    expect(c.siteXs[1]).toBe((c.plotLeft + c.plotRight) / 2);
  });
});
