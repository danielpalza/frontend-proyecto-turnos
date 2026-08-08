import { TestBed } from '@angular/core/testing';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NotificationService);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.useRealTimers();
  });

  it('crea el contenedor de toasts en document.body al instanciarse', () => {
    expect(document.getElementById('toast-container')).not.toBeNull();
  });

  it('showError agrega un toast con el mensaje y el título "Error:"', () => {
    service.showError('Algo salió mal');
    const body = document.querySelector('[data-testid="toast-body"]');
    const title = document.querySelector('[data-testid="toast-title"]');
    expect(body?.textContent).toBe('Algo salió mal');
    expect(title?.textContent).toBe('Error:');
  });

  it('escapa HTML del mensaje para prevenir XSS', () => {
    service.showError('<script>alert(1)</script>');
    const body = document.querySelector('[data-testid="toast-body"]');
    expect(body?.innerHTML).not.toContain('<script>');
    expect(body?.textContent).toBe('<script>alert(1)</script>');
  });

  it('dismissible: false no renderiza el botón de cerrar', () => {
    service.showInfo('Info', { dismissible: false });
    expect(document.querySelector('[data-testid="toast-close-btn"]')).toBeNull();
  });

  it('dismissible por defecto sí renderiza el botón de cerrar', () => {
    service.showInfo('Info');
    expect(document.querySelector('[data-testid="toast-close-btn"]')).not.toBeNull();
  });

  it('con duration por defecto (5000ms), el toast se remueve solo pasado ese tiempo + la animación de salida', () => {
    vi.useFakeTimers();
    service.showSuccess('Listo');
    expect(document.querySelector('[data-testid="toast-message"]')).not.toBeNull();

    vi.advanceTimersByTime(5000 + 350);

    expect(document.querySelector('[data-testid="toast-message"]')).toBeNull();
  });

  it('con duration: 0 el toast no se autodescarta', () => {
    vi.useFakeTimers();
    service.showSuccess('Persistente', { duration: 0 });

    vi.advanceTimersByTime(60000);

    expect(document.querySelector('[data-testid="toast-message"]')).not.toBeNull();
  });

  it('dismissible: false no afecta el auto-cierre por duration (son mecanismos independientes)', () => {
    vi.useFakeTimers();
    service.showSuccess('Listo', { dismissible: false, duration: 1000 });

    vi.advanceTimersByTime(1000 + 350);

    expect(document.querySelector('[data-testid="toast-message"]')).toBeNull();
  });

  it('múltiples toasts se acumulan sin dedupe (comportamiento actual, ver DEUDA § 3.5)', () => {
    service.showError('Mismo mensaje');
    service.showError('Mismo mensaje');
    expect(document.querySelectorAll('[data-testid="toast-message"]').length).toBe(2);
  });
});
