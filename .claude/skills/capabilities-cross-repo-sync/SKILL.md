---
name: capabilities-cross-repo-sync
description: Use when adding or changing a module code, capability, derivation rule, or preset touched in this repo's core/auth/capabilities.ts, auth.guard.ts, or navbar.component.ts. The backend is the runtime source of truth and this file is only a cosmetic/UX-preview copy — the two, plus a third repo's E2E fixtures, drift silently since each repo builds independently.
---

# Sincronizar reglas de capacidades entre los 3 repos

`docs/PERMISOS.md` de este repo es explícito: `core/auth/capabilities.ts` es una **"copia
cosmética"** de la fuente de verdad, que vive en el backend. El backend es quien realmente
autoriza; esta copia solo sirve para que la UI se vea consistente antes de que llegue la
respuesta del servidor (preview optimista) y como fallback de sesión legacy. Eso significa que un
cambio de regla acá **no cambia nada real** si el backend no lo refleja, y viceversa: un cambio
en el backend no se nota en la UI hasta que alguien copia la regla acá a mano.

Hay tres repos hermanos bajo `Proyectos/` que deben quedar consistentes:

| Repo | Qué tiene |
|---|---|
| `../bakend-proyecto-turnos` | `MODULE_CAPABILITIES` / `MODULE_IMPLICATIONS` (fuente de verdad real), `docs/PERMISOS.md` §5 |
| Este repo | `core/auth/capabilities.ts` (copia cosmética), `auth.guard.ts` (lee `route.data['capability']`), `navbar.component.ts` (filtra ítems de menú por capability, más la pestaña dinámica "Atención" resuelta contra `ModuleRulesService` en runtime) |
| `../frontend-proyecto-tests` | `data/auth/personas.ts` (presets de persona) + suite `tests/permisos/`, en particular `reglas-sincronizadas.spec.ts` |

## Al cambiar una regla de derivación o agregar un módulo/capability

1. **Backend primero** — la regla real vive en `MODULE_CAPABILITIES`/`MODULE_IMPLICATIONS` del
   backend (`docs/PERMISOS.md` §5 ahí). Si el cambio no está reflejado ahí, cambiarlo acá es
   cosmético y puede generar una UI que promete algo que el backend va a rechazar con 403.
2. **Este repo** — replicá la regla en `core/auth/capabilities.ts`. Si agregás un módulo nuevo,
   revisá si necesita entrada en `navbar.component.ts` (filtro de menú) y en los
   `route.data['capability']` que consume `auth.guard.ts`. Si el módulo es de tipo clínico
   (como `HISTORIA_CLINICA_FREE`), la pestaña "Atención" del navbar se resuelve dinámicamente vía
   `GET /api/modules/rules` (`ModuleRulesService`) — confirmá si tu cambio debe pasar por ahí en
   vez de por la copia estática.
3. **`frontend-proyecto-tests`** — actualizá `data/auth/personas.ts` si el cambio afecta qué
   puede hacer alguno de los presets (profesional/recepción/administración), y corré/actualizá
   `tests/permisos/reglas-sincronizadas.spec.ts` — ese spec existe específicamente para detectar
   un diff entre `GET /modules/rules` del backend y la copia hardcodeada del frontend.

## Antes de dar por cerrado

Este repo no tiene tests unitarios que fallen si la copia queda desactualizada (ver skill
`testid-discipline` sobre la cobertura cero de `src/`). La única red real es
`reglas-sincronizadas.spec.ts` en el repo de E2E — correlo explícitamente, no asumas que otra
verificación lo cubre.
