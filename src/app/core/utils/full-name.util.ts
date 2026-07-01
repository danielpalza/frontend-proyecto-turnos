export function fullName(nombre?: string | null, apellido?: string | null): string {
  return [nombre, apellido].filter(part => !!part && part.trim().length > 0).join(' ').trim();
}
