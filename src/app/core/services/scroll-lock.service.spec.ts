import { TestBed } from '@angular/core/testing';
import { ScrollLockService } from './scroll-lock.service';

describe('ScrollLockService', () => {
  let service: ScrollLockService;

  beforeEach(() => {
    document.documentElement.removeAttribute('style');
    TestBed.configureTestingModule({});
    service = TestBed.inject(ScrollLockService);
  });

  it('bloquea el scroll seteando overflow-y: hidden con !important', () => {
    service.lock();

    const root = document.documentElement;
    expect(root.style.getPropertyValue('overflow-y')).toBe('hidden');
    expect(root.style.getPropertyPriority('overflow-y')).toBe('important');
  });

  it('restaura el overflow-y original al liberar el último lock', () => {
    document.documentElement.style.setProperty('overflow-y', 'scroll');

    service.lock();
    service.unlock();

    expect(document.documentElement.style.getPropertyValue('overflow-y')).toBe('scroll');
  });

  it('no libera el scroll mientras haya locks apilados (modales anidados)', () => {
    service.lock();
    service.lock();
    service.unlock();

    expect(document.documentElement.style.getPropertyValue('overflow-y')).toBe('hidden');

    service.unlock();
    expect(document.documentElement.style.getPropertyValue('overflow-y')).toBe('');
  });

  it('ignora un unlock() de más sin lock previo', () => {
    expect(() => service.unlock()).not.toThrow();
    expect(document.documentElement.style.getPropertyValue('overflow-y')).toBe('');
  });
});
