import { render } from '@testing-library/angular';
import { ScrollLockDirective } from './scroll-lock.directive';
import { ScrollLockService } from '../../core/services/scroll-lock.service';

describe('ScrollLockDirective', () => {
  it('llama lock() al crearse y unlock() al destruirse', async () => {
    const scrollLock = { lock: vi.fn(), unlock: vi.fn() };

    const { fixture } = await render('<div appScrollLock>Modal</div>', {
      imports: [ScrollLockDirective],
      providers: [{ provide: ScrollLockService, useValue: scrollLock }]
    });

    expect(scrollLock.lock).toHaveBeenCalledTimes(1);
    expect(scrollLock.unlock).not.toHaveBeenCalled();

    fixture.destroy();

    expect(scrollLock.unlock).toHaveBeenCalledTimes(1);
  });
});
