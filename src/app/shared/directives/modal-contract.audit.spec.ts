import { readFileSync, readdirSync } from 'fs';
import { join, relative } from 'path';

// `process.cwd()` es la raíz del repo (Vitest corre desde ahí vía el builder de Angular) — más
// confiable que resolver contra `import.meta.url`, que este builder no expone con la ruta real en disco.
const APP_ROOT = join(process.cwd(), 'src/app');

function findComponentTemplates(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findComponentTemplates(fullPath));
    } else if (entry.name.endsWith('.component.html')) {
      files.push(fullPath);
    }
  }
  return files;
}

function toPosixRelative(file: string): string {
  return relative(APP_ROOT, file).split('\\').join('/');
}

/**
 * Ver DEUDA_TECNICA.md § 1.1: siete modales usan `appScrollLock` sin `appBodyPortal`, así que dependen
 * de que ningún ancestro cree un bloque contenedor (zoom/transform) para no romperse. Esta lista es la
 * fotografía conocida al 2026-08-07. Si aparece un octavo caso, este test falla — señal de revisar si
 * hay que agregarlo a DEUDA_TECNICA.md o arreglarlo directo. Si se corrige alguno de los siete, sacarlo
 * de acá (el test también va a fallar hasta que se actualice, a propósito).
 */
const KNOWN_VIOLATORS = [
  'features/appointments/components/appointment-dialog/appointment-dialog.component.html',
  'features/appointments/components/confirm-dialog/confirm-dialog.component.html',
  'features/coberturas/coberturas-view/coberturas-view.component.html',
  'features/odontograma/components/save-odontograma-dialog/save-odontograma-dialog.component.html',
  'features/seguimiento/components/patient-wizard-panel/patient-wizard-panel.component.html',
  'features/seguimiento/components/turn-clinical-modal/turn-clinical-modal.component.html',
  'features/seguimiento/components/turn-payment-modal/turn-payment-modal.component.html'
].sort();

describe('Contrato de modal: appScrollLock siempre debe ir acompañada de appBodyPortal (DEUDA § 1.1)', () => {
  it('la lista de templates con appScrollLock pero sin appBodyPortal es exactamente la ya conocida', () => {
    const templates = findComponentTemplates(APP_ROOT);

    const violators = templates
      .filter(file => {
        const content = readFileSync(file, 'utf-8');
        return content.includes('appScrollLock') && !content.includes('appBodyPortal');
      })
      .map(toPosixRelative)
      .sort();

    expect(violators).toEqual(KNOWN_VIOLATORS);
  });

  it('ningún template usa appBodyPortal sin appScrollLock (el portal sin el lock de scroll no tiene sentido)', () => {
    const templates = findComponentTemplates(APP_ROOT);

    const onlyPortal = templates
      .filter(file => {
        const content = readFileSync(file, 'utf-8');
        return content.includes('appBodyPortal') && !content.includes('appScrollLock');
      })
      .map(toPosixRelative);

    expect(onlyPortal).toEqual([]);
  });
});
