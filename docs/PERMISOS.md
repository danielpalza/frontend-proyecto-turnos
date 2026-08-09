# Permisos — OdontoLite (turnos-app)

> **Este documento describe una copia cosmética.** El backend es la única fuente de verdad en
> tiempo de ejecución: `AuthResponse.capabilities` viene ya resuelto desde el login y es lo que la
> app consulta para decidir qué mostrar. La copia de este repo (`core/auth/capabilities.ts`) existe
> únicamente para dos usos acotados de UX, ninguno de los cuales es autorización real:
> 1. Previsualizar en el modal de alta/edición de profesional (`ProfesionalDialogComponent`) qué
>    módulos arrastra cada tilde, **antes** de guardar y de que el backend confirme nada.
>    2. Derivar capacidades de sesiones viejas cacheadas en `localStorage` que solo tienen `modules`
>       (formato legado, pre-capacidades) y todavía no tienen `capabilities`.
>
> Ningún componente del frontend decide si una acción está permitida — solo decide si vale la pena
> **mostrarla habilitada**. El backend vuelve a validar todo en cada request y devuelve 403 si no
> corresponde (ver [§ 5](#5-qué-pasa-si-el-frontend-se-equivoca-o-queda-desactualizado)). El diseño
> completo — catálogo de capacidades, reglas de implicancia, qué controller exige qué — vive en el
> backend: [`bakend-proyecto-turnos/docs/PERMISOS.md`](../../bakend-proyecto-turnos/docs/PERMISOS.md).
> Este documento **no** repite ese diseño; solo mapea las piezas equivalentes del lado frontend.

## 1. Vocabulario

- **Módulo** (`ModuleCode`): lo que un `OWNER` tilda al dar de alta un profesional o generar una
  invitación — `PANEL`, `TURNOS`, `ODONTOGRAMA`, `HISTORIA_CLINICA_FREE`, `SEGUIMIENTO`, `COBERTURA`,
  `CONFIGURACIONES`.
- **Capacidad** (`Capability`): lo que un componente consulta para decidir si mostrar/habilitar algo.
  Formato `MODULO:ACCION`, p. ej. `TURNOS:MANAGE`, `ODONTOGRAMA:VIEW`, `PROFESIONALES:DELETE`. Un
  módulo concedido resuelve a **una o más** capacidades (ver [§ 2.2](#22-module_capabilities)); no
  hay capacidades sueltas que no cuelguen de ningún módulo, salvo `PROFESIONALES:DELETE`, que solo
  la da el rol `OWNER` (ningún módulo la concede — ver el comentario en el propio catálogo).
- **Rol** (`AuthResponse.role`): ortogonal a módulos/capacidades. El único valor usado hoy en el
  frontend es `'OWNER'` (`AuthService.hasRole('OWNER')`); el catálogo completo de roles no está
  documentado del lado frontend — es información del backend (ver `ARCHITECTURE.md § Pendiente`).

## 2. El catálogo: `core/auth/capabilities.ts`

Mirror en TypeScript de la tabla de reglas del backend (`CapabilityCatalog.java`). Todo lo que sigue
vive en ese único archivo.

### 2.1 `Capability` y `ModuleCode`

`Capability` es un objeto `as const` con una entrada por capacidad (`Capability.TURNOS_MANAGE`,
`Capability.ODONTOGRAMA_VIEW`, etc.) — se usa como valor (`data: { capability: Capability.PANEL_VIEW }`
en las rutas, `[appCan]="Capability.TURNOS_MANAGE"` en templates), nunca como string suelto en el
código nuevo. `ModuleCode` es el union type de los 7 códigos de módulo vigentes.

### 2.2 `MODULE_CAPABILITIES`

`Record<ModuleCode, readonly Capability[]>` — qué capacidades trae cada módulo por sí solo. Ejemplo:
`ODONTOGRAMA` → `[ODONTOGRAMA_VIEW, ODONTOGRAMA_EDIT]`; `TURNOS` → `[TURNOS_VIEW, TURNOS_MANAGE,
TURNOS_COBRAR, TURNOS_NOTIFY]`. El módulo clínico más nuevo, `HISTORIA_CLINICA_FREE`, sigue el mismo
patrón `VIEW`/`EDIT` que `ODONTOGRAMA` — cualquier módulo clínico futuro se espera que declare el
mismo par.

### 2.3 `MODULE_IMPLICATIONS`

`Partial<Record<ModuleCode, readonly Capability[]>>` — capacidades **extra** que arrastra tener un
módulo concedido, más allá de las suyas propias. Dos reglas activas hoy:

- Cualquier módulo clínico (`ODONTOGRAMA`, `HISTORIA_CLINICA_FREE`) arrastra `TURNOS_VIEW`: hace
  falta entrar a la pestaña Turnos para poder iniciar un turno, aunque no se tenga el módulo `TURNOS`
  en sí.
- `TURNOS` arrastra **todo** `MODULE_CAPABILITIES.SEGUIMIENTO`: la turnera habilita Seguimiento
  completo sin tildarlo aparte.

**La resolución es de un solo paso, sin clausura transitiva** (comentario explícito en el archivo):
las implicancias disparan desde módulos concedidos, nunca desde capacidades ya derivadas. Por eso
tener solo `ODONTOGRAMA` da `TURNOS_VIEW` pero no arrastra `SEGUIMIENTO`, que cuelga de tener el
módulo `TURNOS` concedido, no de tener la capacidad `TURNOS_VIEW`.

### 2.4 `MODULE_PRESETS`

Combos de módulos para el selector rápido del modal de profesional (`ProfesionalDialogComponent`):
`PROFESIONAL` (`ODONTOGRAMA` + `HISTORIA_CLINICA_FREE`), `RECEPCION` (`TURNOS` + `COBERTURA`),
`ADMINISTRACION` (`PANEL` + `TURNOS` + `CONFIGURACIONES`), `TODOS` (los 7). Tildan **módulos**, no
capacidades — el usuario sigue viendo/tildando módulos en la UI; las capacidades son un detalle de
implementación invisible para quien administra accesos.

### 2.5 Funciones del catálogo

- **`resolveCapabilities(granted: string[]): ReadonlySet<string>`** — combina `MODULE_CAPABILITIES` +
  `MODULE_IMPLICATIONS` de una lista de módulos concedidos. Usada por `AuthService` solo como
  *fallback* para sesiones cacheadas en `localStorage` sin `capabilities` (formato legado); en el
  camino normal el backend ya manda `AuthResponse.capabilities` resuelto y esta función ni se llama.
- **`derivedModules(granted: string[]): Set<ModuleCode>`** — inverso aproximado: qué módulos quedan
  "cubiertos" (todas sus capacidades ya presentes) sin estar tildados explícitamente. Solo se usa para
  previsualizar en el modal de profesional qué casillas se muestran ya marcadas como consecuencia de
  otro tilde.
- **`capabilityDeniedMessage(capability: string): string`** — arma el texto del tooltip que pone
  `CanDirective` en un control bloqueado (p. ej. `"Requiere acceso a Configuración"`), buscando el
  módulo dueño de esa capacidad. Caso especial: `PROFESIONALES_DELETE` siempre devuelve un mensaje
  fijo sobre rol `OWNER`, porque no cuelga de ningún módulo.

## 3. `AuthService.hasCapability()`

`AuthService` guarda `AuthResponse` completo (incluye `capabilities: string[]`) en
`currentUserSubject` y en `localStorage` (`auth_user`). `hasCapability(code)` primero intenta leer
`user.capabilities` directo; si la sesión cacheada es vieja y no trae ese campo, cae a
`resolveCapabilities(user.modules)` como fallback. `hasModule(code)` sigue existiendo pero está
`@deprecated` — ya no lo usa ninguna ruta ni directiva del código nuevo, solo queda por si algo
externo todavía lo llama.

## 4. Las dos directivas: `[appCan]` y `*appCanShow`

Archivo: [`shared/directives/can.directive.ts`](../src/app/shared/directives/can.directive.ts).
Detalle de inputs/outputs en [COMPONENTS.md](./COMPONENTS.md#shared-srcappshared); acá solo la
diferencia de intención, porque es fácil confundirlas:

| | `[appCan]` (`CanDirective`) | `*appCanShow` (`CanShowDirective`) |
|---|---|---|
| Tipo | Atributo | Estructural (`ng-template`) |
| Sin la capacidad | El nodo **sigue en el DOM**, deshabilitado (`disabled`/`aria-disabled`) + tooltip con `capabilityDeniedMessage()` | El nodo se **quita del DOM** (`ViewContainerRef.clear()`) |
| Cuándo usarla | Un control dentro de una pantalla ya visible (botón, campo) — el usuario debe entender que la acción existe pero no la tiene habilitada | Navegación (pestañas, ítems de menú) — un control gris ahí no aporta nada |
| Se re-evalúa | En cada emisión de `AuthService.currentUser$` + `ngOnChanges` | Igual |

Ambas leen `AuthService.hasCapability()` directo — no hay caché propia ni lógica de capacidades
duplicada fuera de `capabilities.ts`.

## 5. Qué pasa si el frontend se equivoca o queda desactualizado

El backend responde **403** a cualquier request sin la capacidad requerida, sin importar qué mostraba
la UI. El interceptor global (`httpErrorInterceptor`) tiene una rama propia para ese caso
(`handleCapabilityForbidden`, documentada en [UI_RULES.md § Manejo de errores HTTP](./UI_RULES.md) —
no se repite acá): si la sesión **creía** tener la capacidad que el backend rechazó, se asume que las
capacidades cambiaron server-side (revocación de módulo, etc., sin refresh del JWT de 24h) y se fuerza
re-login; si ya sabía que no la tenía (llegó por URL directa o un botón mal protegido), alcanza con el
toast de error. Es decir: `capabilities.ts` puede quedarse desactualizado respecto al backend sin
romper la seguridad — en el peor caso, muestra un control habilitado que el backend después rechaza.

## 6. Guard de rutas y enrutamiento por capacidad

`authGuard` ([`core/guards/auth.guard.ts`](../src/app/core/guards/auth.guard.ts)) lee
`route.data['capability']` (una constante de `Capability`, nunca un string suelto) y llama
`authService.hasCapability(...)`. Si falta, redirige a **`/403`** (`ForbiddenComponent`). Antes de
este cambio, el guard leía `route.data['module']` y redirigía a `/panel`, lo que dejaba al usuario en
una pantalla sin explicación cuando no tenía ese módulo. Detalle completo del árbol de rutas y el
guard en [ROUTES.md](./ROUTES.md#guard-authguard).

### 6.5 `resolveHomeRouteForUser()` y el destino de `/` y `**`

[`core/auth/home-route.ts`](../src/app/core/auth/home-route.ts) resuelve a qué ruta mandar a un
usuario recién logueado (o que entra a una URL desconocida). `resolveHomeRouteForUser` mira primero el
**rol**: si `hasRole('ADMIN')`, devuelve `/admin` sin más chequeos (ver [§ 9](#9-rol-admin--panel-superadmin-mecanismo-aparte)
más abajo). Si no, delega en `resolveHomeRoute()`, que recorre una lista fija de pestañas en orden
(`/panel`, `/turnos`, `/seguimiento`, `/coberturas`, `/configuraciones`) y devuelve la primera cuya
capacidad `*_VIEW` tiene el usuario; si no tiene ninguna, devuelve `/403`. Antes de esta función,
`redirectTo` de `''`/`**` era el string fijo `'panel'`, así que un usuario sin `PANEL:VIEW` terminaba
en un guard que lo mandaba a `/login` — indistinguible de una sesión vencida. `/odontograma` y
`/historia-clinica` no están en esa lista: no tienen una ruta fija propia, siempre se entra desde un
turno concreto (ver [§ 7](#7-módulos-clínicos-dinámicos)).

## 7. Módulos clínicos dinámicos

A diferencia de las capacidades "estáticas" del resto de la app, **qué módulos tienen ficha clínica
propia no está hardcodeado** en el frontend — se resuelve en runtime.

### 7.1 `ModuleRulesService` y `GET /api/modules/rules`

[`core/services/module-rules.service.ts`](../src/app/core/services/module-rules.service.ts) consulta
`GET /api/modules/rules` (sin capacidad requerida — describe el sistema de permisos, no datos de la
organización) y cachea la respuesta con `shareReplay(1)` para toda la sesión. La respuesta incluye
`clinicalModules: ClinicalModuleRule[]` — hoy `ODONTOGRAMA` y `HISTORIA_CLINICA_FREE`, cada uno con
`id` (para `Appointment.moduloClinicoId`), `codigo`, `nombre`, `rutaClinica` (slug de ruta frontend,
p. ej. `"odontograma"`, `"historia-clinica"`) e `icono`. Tres consumidores:

- **`AppointmentDialogComponent`**: puebla el selector obligatorio "Módulo clínico" del alta de turno
  (`moduloClinicoId`, ver [FORMS.md](./FORMS.md#paso-4--turno-y-pago-solo-si-includeappointmentstep--true-es-decir-solo-desde-appointmentdialogcomponent)).
- **`AppointmentsPanelComponent` / `TurnClinicalModalComponent`**: resuelven `rutaClinica` y la
  capacidad `<CODIGO>:VIEW` a partir de `appointment.moduloClinicoCodigo`, para navegar a
  `/<rutaClinica>/<id>` sin hardcodear `/odontograma`.
- **`NavbarComponent`**: arma la pestaña única "Atención" (visible si el usuario tiene `VIEW` de
  **cualquier** módulo clínico) y resuelve `isAtencionActive()` comparando la URL contra las
  `rutaClinica` de todos los módulos clínicos.

Ver el diseño multi-módulo completo en [ARCHITECTURE.md](./ARCHITECTURE.md) y el estado/persistencia
del "último turno atendido" (`ClinicalAttentionService`) en [STATE.md](./STATE.md).

## 9. Rol `ADMIN` / panel superadmin — mecanismo aparte

`ADMIN` (2026-08-09) **no** pasa por nada de lo descripto arriba — no es un módulo, no tiene entrada en
`MODULE_CAPABILITIES`/`MODULE_IMPLICATIONS`/`MODULE_PRESETS`, y `capabilities.ts` no lo menciona en
absoluto. Es un chequeo de **rol puro**, cross-organización, para el panel superadmin (`/admin`,
`AdminViewComponent`) — mismo criterio que el backend (`@RequiresRole` vs. `@RequiresCapability`, ver
`bakend-proyecto-turnos/docs/PERMISOS.md § 6.3`): el sistema de capacidades está acotado por diseño a
los módulos contratados de **una** organización, y este panel opera sobre todas.

- **`AuthService.hasRole(role)`** (`core/services/auth.service.ts`): comparación directa
  `currentUser.role === role`, sin derivar nada de `modules`/`capabilities`.
- **Ruteo**: `data: { role: 'ADMIN' }` en vez de `data: { capability: ... }` sobre la ruta `/admin`;
  `authGuard` chequea ambos tipos de dato de forma independiente (ver [ROUTES.md](./ROUTES.md)).
- **Prioridad de aterrizaje**: `resolveHomeRouteForUser()` mira `hasRole('ADMIN')` **antes** que
  cualquier capacidad — un `ADMIN` va siempre a `/admin`, aunque además tenga módulos de una
  organización real (ver [§ 6.5](#65-resolvehomerouteforuser-y-el-destino-de--y-)).
- **Errores**: un 403 de `AdminGuard`/`AdminController` (`ForbiddenException` del backend) viaja **sin**
  el campo `requiredCapability` que sí llevan los 403 de capacidad — `http-error.interceptor.ts` lo
  distingue explícitamente para no forzar un logout cuando lo que falló fue una baranda de rol, no una
  sesión vieja (ver [UI_RULES.md](./UI_RULES.md)).
- **Sin vista reducida por capacidad dentro del panel**: a diferencia del resto de la app (que muestra
  controles deshabilitados con `[appCan]`/`*appCanShow` según capacidad), `/admin` es todo-o-nada — se
  entra completo o no se entra, no hay una versión parcial del panel para ningún otro rol.

Detalle de componentes/endpoints del panel en [PAGES.md](./PAGES.md#panel-superadmin) y
[ARCHITECTURE.md](./ARCHITECTURE.md).

## 10. Ver también

- [ROUTES.md](./ROUTES.md) — árbol de rutas, guard, `homeRedirect`.
- [COMPONENTS.md](./COMPONENTS.md#shared-srcappshared) — inputs/outputs de `CanDirective`/`CanShowDirective`.
- [STATE.md](./STATE.md) — `ModuleRulesService`, `ClinicalAttentionService`, `HistoriaClinicaStateService`.
- [UI_RULES.md](./UI_RULES.md) — manejo de errores HTTP, incluida la rama 403.
- [`bakend-proyecto-turnos/docs/PERMISOS.md`](../../bakend-proyecto-turnos/docs/PERMISOS.md) — diseño
  completo y fuente de verdad (catálogo real de capacidades, qué controller exige qué, tests que lo
  fijan).
