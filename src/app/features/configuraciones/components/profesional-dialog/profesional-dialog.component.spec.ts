import { render } from '@testing-library/angular';
import { ProfesionalDialogComponent } from './profesional-dialog.component';
import { AuthService } from '../../../../core/services/auth.service';
import { Profesional } from '../../../../core/models';
import { Capability, MODULE_PRESETS } from '../../../../core/auth/capabilities';

function makeMocks(overrides: { hasRole?: boolean; grantedModules?: string[]; hasCapability?: boolean } = {}) {
  return {
    authService: {
      hasCapability: vi.fn(() => overrides.hasCapability ?? true),
      hasRole: vi.fn(() => overrides.hasRole ?? false),
      grantedModules: vi.fn(() => overrides.grantedModules ?? [])
    }
  };
}

async function renderDialog(mocks: ReturnType<typeof makeMocks>, inputs: Record<string, unknown> = { open: true }) {
  return render(ProfesionalDialogComponent, {
    inputs,
    providers: [{ provide: AuthService, useValue: mocks.authService }]
  });
}

describe('ProfesionalDialogComponent', () => {
  describe('canGrant', () => {
    it('OWNER siempre puede otorgar cualquier módulo', async () => {
      const mocks = makeMocks({ hasRole: true, grantedModules: [] });
      const { fixture } = await renderDialog(mocks);

      expect(fixture.componentInstance.canGrant('CONFIGURACIONES')).toBe(true);
    });

    it('un no-OWNER solo puede otorgar los módulos que él mismo tiene', async () => {
      const mocks = makeMocks({ hasRole: false, grantedModules: ['TURNOS'] });
      const { fixture } = await renderDialog(mocks);

      expect(fixture.componentInstance.canGrant('TURNOS')).toBe(true);
      expect(fixture.componentInstance.canGrant('CONFIGURACIONES')).toBe(false);
    });
  });

  describe('applyPreset', () => {
    it('un no-OWNER que aplica el preset "Todos" solo termina con los módulos que puede otorgar', async () => {
      const mocks = makeMocks({ hasRole: false, grantedModules: ['PANEL', 'TURNOS'] });
      const { fixture } = await renderDialog(mocks);
      const todos = MODULE_PRESETS.find(p => p.id === 'TODOS')!;

      fixture.componentInstance.applyPreset(todos);

      expect(fixture.componentInstance.moduleCodes.sort()).toEqual(['PANEL', 'TURNOS']);
    });

    it('un OWNER que aplica el preset "Todos" termina con los 7 módulos', async () => {
      const mocks = makeMocks({ hasRole: true });
      const { fixture } = await renderDialog(mocks);
      const todos = MODULE_PRESETS.find(p => p.id === 'TODOS')!;

      fixture.componentInstance.applyPreset(todos);

      expect(fixture.componentInstance.moduleCodes).toEqual([...todos.modules]);
    });

    it('isPresetActive detecta cuando los módulos actuales coinciden exactamente con un preset', async () => {
      const mocks = makeMocks({ hasRole: true });
      const { fixture } = await renderDialog(mocks);
      const recepcion = MODULE_PRESETS.find(p => p.id === 'RECEPCION')!;

      fixture.componentInstance.applyPreset(recepcion);

      expect(fixture.componentInstance.isPresetActive(recepcion)).toBe(true);
      expect(fixture.componentInstance.isPresetActive(MODULE_PRESETS.find(p => p.id === 'PROFESIONAL')!)).toBe(false);
    });
  });

  describe('isDerived/derived (delega en capabilities.ts, no se re-deriva la regla acá)', () => {
    it('marcar TURNOS deriva SEGUIMIENTO como incluido sin tilde manual', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderDialog(mocks);
      fixture.componentInstance.moduleCodes = ['TURNOS'];

      expect(fixture.componentInstance.isDerived('SEGUIMIENTO')).toBe(true);
      expect(fixture.componentInstance.isDerived('TURNOS')).toBe(false);
    });
  });

  describe('passwordStrength: la regla "mayúscula + dígito" está combinada, no son dos puntos independientes', () => {
    it('sin contraseña, ancho 0% y label de ayuda', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderDialog(mocks);

      expect(fixture.componentInstance.passwordStrength()).toEqual({
        width: '0%', color: '#e2e8f0', label: 'Ingresá al menos 6 caracteres'
      });
    });

    it('mayúscula SIN dígito puntúa igual que sin ninguna de las dos (misma regla combinada)', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderDialog(mocks);

      fixture.componentInstance.form.patchValue({ password: 'Abcdef' });
      const conMayuscula = fixture.componentInstance.passwordStrength();

      fixture.componentInstance.form.patchValue({ password: 'abcdef' });
      const sinNinguna = fixture.componentInstance.passwordStrength();

      expect(conMayuscula).toEqual(sinNinguna);
    });

    it('mayúscula Y dígito juntas SÍ suman el punto extra', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderDialog(mocks);

      fixture.componentInstance.form.patchValue({ password: 'abcdef' });
      const sinNada = fixture.componentInstance.passwordStrength();

      fixture.componentInstance.form.patchValue({ password: 'Abcdef1' });
      const conAmbas = fixture.componentInstance.passwordStrength();

      expect(conAmbas.label).not.toBe(sinNada.label);
    });

    it('una contraseña larga y con símbolo llega a "Fuerte"', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderDialog(mocks);

      fixture.componentInstance.form.patchValue({ password: 'Abcdefghi1!' });

      expect(fixture.componentInstance.passwordStrength().label).toBe('Fuerte');
    });
  });

  describe('ngOnChanges: abrir el diálogo resetea el form', () => {
    it('sin profesional en edición, arranca con los defaults', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderDialog(mocks, { open: true, editingProfesional: null });

      expect(fixture.componentInstance.form.value.nombre).toBe('');
      expect(fixture.componentInstance.moduleCodes).toEqual([]);
    });

    it('con profesional en edición, precarga sus datos y módulos', async () => {
      const mocks = makeMocks();
      const prof: Profesional = { id: 'p1', nombre: 'Ana', apellido: 'García', moduleCodes: ['PANEL'] } as Profesional;
      const { fixture } = await renderDialog(mocks, { open: true, editingProfesional: prof });

      expect(fixture.componentInstance.form.value.nombre).toBe('Ana');
      expect(fixture.componentInstance.moduleCodes).toEqual(['PANEL']);
    });
  });

  describe('toggleCrearAcceso', () => {
    it('al desactivarlo, limpia username/password/moduleCodes', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderDialog(mocks);
      fixture.componentInstance.form.patchValue({ crearAcceso: true, username: 'ana', password: '123456' });
      fixture.componentInstance.moduleCodes = ['PANEL'];

      fixture.componentInstance.toggleCrearAcceso();

      expect(fixture.componentInstance.form.value.crearAcceso).toBe(false);
      expect(fixture.componentInstance.form.value.username).toBe('');
      expect(fixture.componentInstance.form.value.password).toBe('');
      expect(fixture.componentInstance.moduleCodes).toEqual([]);
    });

    it('al activarlo, no toca los demás campos', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderDialog(mocks);

      fixture.componentInstance.toggleCrearAcceso();

      expect(fixture.componentInstance.form.value.crearAcceso).toBe(true);
    });
  });

  describe('handleSubmit', () => {
    function fillRequired(fixture: { componentInstance: ProfesionalDialogComponent }) {
      fixture.componentInstance.form.patchValue({ nombre: 'Ana', apellido: 'García' });
    }

    it('formulario inválido: marca todo como touched y no emite save', async () => {
      const save = vi.fn();
      const mocks = makeMocks();
      const { fixture } = await render(ProfesionalDialogComponent, {
        inputs: { open: true },
        on: { save },
        providers: [{ provide: AuthService, useValue: mocks.authService }]
      });

      fixture.componentInstance.handleSubmit();

      expect(save).not.toHaveBeenCalled();
      expect(fixture.componentInstance.form.get('nombre')!.touched).toBe(true);
    });

    it('mientras isSaving=true, no hace nada', async () => {
      const save = vi.fn();
      const mocks = makeMocks();
      const { fixture } = await render(ProfesionalDialogComponent, {
        inputs: { open: true, isSaving: true },
        on: { save },
        providers: [{ provide: AuthService, useValue: mocks.authService }]
      });
      fillRequired(fixture);

      fixture.componentInstance.handleSubmit();

      expect(save).not.toHaveBeenCalled();
    });

    it('crearAcceso sin ningún módulo seleccionado: error, no emite save', async () => {
      const save = vi.fn();
      const mocks = makeMocks({ hasCapability: true });
      const { fixture } = await render(ProfesionalDialogComponent, {
        inputs: { open: true },
        on: { save },
        providers: [{ provide: AuthService, useValue: mocks.authService }]
      });
      fillRequired(fixture);
      fixture.componentInstance.form.patchValue({ crearAcceso: true, username: 'ana', password: '123456' });

      fixture.componentInstance.handleSubmit();

      expect(fixture.componentInstance.saveError).toBe('Seleccioná al menos un módulo para el usuario');
      expect(save).not.toHaveBeenCalled();
    });

    it('alta simple sin acceso: emite el dto con activo=true y sin username/password/moduleCodes', async () => {
      const save = vi.fn();
      const mocks = makeMocks({ hasCapability: false });
      const { fixture } = await render(ProfesionalDialogComponent, {
        inputs: { open: true },
        on: { save },
        providers: [{ provide: AuthService, useValue: mocks.authService }]
      });
      fillRequired(fixture);

      fixture.componentInstance.handleSubmit();

      expect(save).toHaveBeenCalledWith(expect.objectContaining({
        nombre: 'Ana', apellido: 'García', activo: true, crearAcceso: false, username: undefined, password: undefined, moduleCodes: undefined
      }));
    });

    it('editando un profesional inactivo, conserva activo=false en el dto', async () => {
      const save = vi.fn();
      const mocks = makeMocks();
      const prof: Profesional = { id: 'p1', nombre: 'Ana', apellido: 'García', activo: false } as Profesional;
      const { fixture } = await render(ProfesionalDialogComponent, {
        inputs: { open: true, editingProfesional: prof },
        on: { save },
        providers: [{ provide: AuthService, useValue: mocks.authService }]
      });

      fixture.componentInstance.handleSubmit();

      expect(save).toHaveBeenCalledWith(expect.objectContaining({ activo: false }));
    });

    it('con acceso y módulos seleccionados, incluye username/password/moduleCodes en el dto', async () => {
      const save = vi.fn();
      const mocks = makeMocks({ hasCapability: true });
      const { fixture } = await render(ProfesionalDialogComponent, {
        inputs: { open: true },
        on: { save },
        providers: [{ provide: AuthService, useValue: mocks.authService }]
      });
      fillRequired(fixture);
      fixture.componentInstance.form.patchValue({ crearAcceso: true, username: 'ana', password: '123456' });
      fixture.componentInstance.moduleCodes = ['PANEL'];

      fixture.componentInstance.handleSubmit();

      expect(save).toHaveBeenCalledWith(expect.objectContaining({
        crearAcceso: true, username: 'ana', password: '123456', moduleCodes: ['PANEL']
      }));
    });
  });

  describe('showModulesSection', () => {
    it('true si canCreateAccess y crearAcceso están tildados', async () => {
      const mocks = makeMocks({ hasCapability: true });
      const { fixture } = await renderDialog(mocks);
      fixture.componentInstance.form.patchValue({ crearAcceso: true });

      expect(fixture.componentInstance.showModulesSection).toBe(true);
    });

    it('true si puede editar módulos de un profesional con usuario vinculado, aunque crearAcceso esté en false', async () => {
      const mocks = makeMocks({ hasCapability: true });
      const prof: Profesional = { id: 'p1', nombre: 'Ana', apellido: 'García', userId: 'u1' } as Profesional;
      const { fixture } = await renderDialog(mocks, { open: true, editingProfesional: prof });

      expect(fixture.componentInstance.showModulesSection).toBe(true);
    });

    it('false para un alta nueva sin tildar "crear acceso"', async () => {
      const mocks = makeMocks({ hasCapability: true });
      const { fixture } = await renderDialog(mocks);

      expect(fixture.componentInstance.showModulesSection).toBe(false);
    });
  });

  it('moduleIcon devuelve un ícono de fallback para códigos desconocidos', async () => {
    const mocks = makeMocks();
    const { fixture } = await renderDialog(mocks);

    expect(fixture.componentInstance.moduleIcon('TURNOS')).toBe('bi-calendar');
    expect(fixture.componentInstance.moduleIcon('X')).toBe('bi-app-indicator');
  });

  it('close emite openChange(false)', async () => {
    const openChange = vi.fn();
    const mocks = makeMocks();
    const { fixture } = await render(ProfesionalDialogComponent, {
      inputs: { open: true },
      on: { openChange },
      providers: [{ provide: AuthService, useValue: mocks.authService }]
    });

    fixture.componentInstance.close();

    expect(openChange).toHaveBeenCalledWith(false);
  });

  it('togglePasswordVisibility alterna showPassword', async () => {
    const mocks = makeMocks();
    const { fixture } = await renderDialog(mocks);

    fixture.componentInstance.togglePasswordVisibility();
    expect(fixture.componentInstance.showPassword).toBe(true);

    fixture.componentInstance.togglePasswordVisibility();
    expect(fixture.componentInstance.showPassword).toBe(false);
  });
});
