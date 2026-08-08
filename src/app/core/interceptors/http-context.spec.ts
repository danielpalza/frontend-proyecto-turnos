import { HttpContext } from '@angular/common/http';
import { SKIP_GLOBAL_ERROR_HANDLER, skipGlobalErrorHandler } from './http-context';

describe('skipGlobalErrorHandler', () => {
  it('devuelve un HttpContext con SKIP_GLOBAL_ERROR_HANDLER en true', () => {
    const context = skipGlobalErrorHandler();
    expect(context.get(SKIP_GLOBAL_ERROR_HANDLER)).toBe(true);
  });

  it('un HttpContext nuevo sin setear nada tiene el default en false', () => {
    const context = new HttpContext();
    expect(context.get(SKIP_GLOBAL_ERROR_HANDLER)).toBe(false);
  });
});
