/**
 * Parseo de `Patient.anamnesis`: el paso "Antecedentes médicos" del wizard serializa sus 8 controles
 * a un JSON y lo guarda en ese único campo de texto. Acá se lo vuelve a abrir para mostrarlo.
 */

export interface AnamnesisItem {
  label: string;
  value: string;
}

export interface Anamnesis {
  /** Solo los antecedentes con contenido, en el orden del formulario. */
  items: AnamnesisItem[];
  /** Texto libre de "Otros antecedentes" (`''` si no hay). */
  otros: string;
}

export const EMPTY_ANAMNESIS: Anamnesis = { items: [], otros: '' };

/**
 * Claves del JSON con las etiquetas del formulario. No son las del paso de revisión del wizard
 * (`PATIENT_WIZARD_REVIEW_GROUPS`, que las abrevia): acá se muestra la ficha completa del paciente.
 */
const ANAMNESIS_FIELDS: ReadonlyArray<{ key: string; label: string }> = [
  { key: 'enfermedades', label: 'Enfermedades' },
  { key: 'alergias', label: 'Alergias' },
  { key: 'medicacion', label: 'Medicación actual o previa' },
  { key: 'cirugias', label: 'Cirugías/tratamientos/trastornos' },
  { key: 'embarazo', label: 'Embarazo o lactancia' },
  { key: 'marcapasos', label: 'Marcapasos/prótesis' },
  { key: 'consumos', label: 'Consumos (tabaco, alcohol, drogas)' }
];

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Los pacientes viejos tienen `anamnesis` como texto plano en vez de JSON. Ese contenido se descarta
 * (queda vacío), igual que hace el wizard al rehidratar el formulario.
 */
export function parseAnamnesis(raw?: string | null): Anamnesis {
  if (!raw) {
    return EMPTY_ANAMNESIS;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return EMPTY_ANAMNESIS;
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return EMPTY_ANAMNESIS;
  }

  const data = parsed as Record<string, unknown>;
  const items: AnamnesisItem[] = [];

  for (const field of ANAMNESIS_FIELDS) {
    const value = asText(data[field.key]);
    if (value) {
      items.push({ label: field.label, value });
    }
  }

  return { items, otros: asText(data['otrosAntecedentes']) };
}

export function hasAnamnesis(anamnesis: Anamnesis): boolean {
  return anamnesis.items.length > 0 || anamnesis.otros !== '';
}
