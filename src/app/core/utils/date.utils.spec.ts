import { formatDateToYYYYMMDD, getTodayAsYYYYMMDD } from './date.utils';

describe('formatDateToYYYYMMDD', () => {
  it('formatea con ceros a la izquierda en mes y día', () => {
    expect(formatDateToYYYYMMDD(new Date(2024, 0, 5))).toBe('2024-01-05');
  });

  it('usa getters locales (no toISOString): no corre la fecha cerca de medianoche', () => {
    const date = new Date(2026, 11, 31, 23, 0, 0);
    expect(formatDateToYYYYMMDD(date)).toBe('2026-12-31');
  });
});

describe('getTodayAsYYYYMMDD', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('devuelve la fecha del sistema en formato YYYY-MM-DD', () => {
    vi.setSystemTime(new Date(2026, 2, 9));
    expect(getTodayAsYYYYMMDD()).toBe('2026-03-09');
  });
});
