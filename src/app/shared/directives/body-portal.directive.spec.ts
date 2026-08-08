import { render, screen } from '@testing-library/angular';
import { BodyPortalDirective } from './body-portal.directive';

describe('BodyPortalDirective', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('mueve el elemento host a document.body al inicializarse', async () => {
    await render('<div appBodyPortal>Contenido</div>', { imports: [BodyPortalDirective] });

    const el = screen.getByText('Contenido');
    expect(el.parentElement).toBe(document.body);
  });

  it('saca el elemento de document.body al destruirse', async () => {
    const { fixture } = await render('<div appBodyPortal>Contenido</div>', { imports: [BodyPortalDirective] });

    expect(screen.getByText('Contenido')).toBeTruthy();
    fixture.destroy();

    expect(screen.queryByText('Contenido')).toBeNull();
  });
});
