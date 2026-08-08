# Plan de testeo (unit/component) — turnos-app

> Documento vivo: qué falta testear a nivel unit/component en `frontend-proyecto-turnos`, en qué orden
> y por qué. Responde el pendiente que dejó abierto [TESTING.md](./TESTING.md): *"decidir un criterio
> de priorización para qué testear a continuación"*. Estado al 2026-08-07: **3 de 81 archivos
> planificados tienen spec** (Tier 0). No se escribió ningún test nuevo al crear este documento — es
> la hoja de ruta, no la implementación.

## 1. Cómo usar este documento

- Cada archivo tiene un **ID estable** (`UT-NNN`). No reciclar IDs: si un archivo se elimina o se
  fusiona, marcarlo `DEPRECADO` y dejar la fila.
- Al escribir el spec de un archivo, cambiar su estado a **✅ HECHO** y completar la columna con el
  link al `*.spec.ts` (mismo criterio que usa `frontend-proyecto-tests/docs/PLAN_DE_PRUEBAS.md` para
  sus casos E2E).
- El orden de los IDs dentro de un tier es una sugerencia (el que primero aparece en el inventario),
  no una obligación estricta — dentro de un mismo tier todos los archivos comparten prioridad.
- Al agregar un archivo nuevo al repo, clasificarlo en el tier que corresponda por el criterio de § 2
  y agregarlo con el siguiente ID libre, no renumerar los existentes.

## 2. Criterio de priorización

| Tier | Prioridad | Qué agrupa |
|---|---|---|
| 1 | **P0** | Fragilidad **ya documentada** en [DEUDA_TECNICA.md](./DEUDA_TECNICA.md) (bug conocido o contrato que nada fuerza) en código de **seguridad/permisos**, sin cobertura barata en ningún nivel — ni unit ni E2E lo verifica hoy de forma directa. |
| 2 | **P1** | Servicios de **estado/dominio sin `HttpClient`**: sin red ni DOM, baratos de testear, y concentran la lógica de negocio más densa del repo (los archivos más grandes de `services/` que no son wrappers HTTP). |
| 3 | **P1** | **Utils y validators puros**: funciones sin clase, sin dependencias, el costo marginal de un spec es mínimo y la regresión que previenen es silenciosa por naturaleza (nadie nota un cálculo de fecha o un delta mal armado hasta que aparece en producción). |
| 4 | **P2** | **Servicios HTTP restantes**: mismo patrón que `auth.service.spec.ts` (Tier 0), wrappers delgados de `HttpClient` con algo de lógica alrededor (cache, sesión, side effects puntuales). |
| 5 | **P2** | **Directivas y componentes reutilizados en todo el repo** (`shared/`, `layout/`, y un par de `features/*` con el mismo rol): un bug ahí se multiplica por cada lugar que los usa. |
| 6 | **P3** | **Componentes de feature grandes con lógica propia** (no solo template): ya cubiertos por E2E a nivel de flujo completo, pero sin ningún test que aísle su lógica interna del DOM/red real. |
| 7 | **P1 (transversal)** | **Auditorías que no son un spec por archivo**: recorren el repo entero buscando un patrón de bug ya confirmado, en vez de fijar el comportamiento de un solo archivo. |
| — | **Fuera de alcance** | Wrappers delgados sin lógica propia, ya bien cubiertos por el flujo E2E que los ejercita. Forzar un unit test ahí sería redundante — revisar solo si ganan lógica propia o si el E2E que los cubre se retira. |

## 3. Alcance vs. `PLAN_DE_PRUEBAS.md` (E2E)

| | Este documento | `frontend-proyecto-tests/docs/PLAN_DE_PRUEBAS.md` |
|---|---|---|
| Nivel | Unit/component, aislado (mocks, sin app real) | End-to-end, contra la app y el backend reales |
| Unidad de trabajo | Un archivo (`UT-NNN`) | Un caso de usuario (`MOD-NNN`) |
| Pregunta que responde | "¿Esta función/componente hace lo que dice, aislado de todo lo demás?" | "¿Este flujo funciona de punta a punta como lo viviría un usuario?" |
| Corre en | Este repo, `npm test` / `npm run test:coverage` | `frontend-proyecto-tests`, Playwright |

No se duplica trabajo: cuando un archivo está bien cubierto por un flujo E2E y no tiene lógica propia
aislable, va a "Fuera de alcance" acá en vez de generar un spec redundante (§ 2).

## 4. Resumen de cobertura

| Tier | Prioridad | Archivos | ✅ Hecho | ⚪ Pendiente |
|---|---|---:|---:|---:|
| 0 | — (ya hecho) | 3 | 3 | 0 |
| 1 | P0 | 7 | 7 | 0 |
| 2 | P1 | 8 | 8 | 0 |
| 3 | P1 | 9 | 9 | 0 |
| 4 | P2 | 12 | 12 | 0 |
| 5 | P2 | 7 | 7 | 0 |
| 6 | P3 | 22 | 22 | 0 |
| 7 | P1 (transversal) | 2 | 2 | 0 |
| **Total planificado** | | **70** | **70** | **0** |
| Fuera de alcance | — | 11 | — | — |
| **Total inventariado** | | **81** | | |

No cuentan como archivos testeables (sin lógica propia, solo tipos): `coberturas.models.ts`,
`shared/components/patient-form/patient-form.config.ts`,
`shared/components/patient-wizard/patient-wizard.config.ts`.

## 5. Tier 0 — Ya hecho (referencia de forma)

| ID | Archivo | Spec |
|---|---|---|
| UT-001 | `core/services/scroll-lock.service.ts` | [scroll-lock.service.spec.ts](../src/app/core/services/scroll-lock.service.spec.ts) |
| UT-002 | `core/services/auth.service.ts` | [auth.service.spec.ts](../src/app/core/services/auth.service.spec.ts) |
| UT-003 | `shared/components/search-input/search-input.component.ts` | [search-input.component.spec.ts](../src/app/shared/components/search-input/search-input.component.spec.ts) |

## 6. Tier 1 (P0) — Seguridad, permisos y bugs documentados

| ID | Archivo | Qué testear | Estado |
|---|---|---|---|
| UT-004 | `core/interceptors/http-error.interceptor.ts` | 401 fuera de `/auth/*` → `logout()` + redirect; **la rama 403 hoy ignora `skipGlobalErrorHandler()`** ([DEUDA § 3.1](./DEUDA_TECNICA.md)) — fijar el comportamiento tal cual está, no arreglarlo en este spec; decisión notificar/no notificar para 404, error de red y `/auth/*`. | ✅ [Hecho](../src/app/core/interceptors/http-error.interceptor.spec.ts) |
| UT-005 | `core/interceptors/http-context.ts` | `skipGlobalErrorHandler()` devuelve un `HttpContext` con `SKIP_GLOBAL_ERROR_HANDLER` en `true`; base de UT-004. | ✅ [Hecho](../src/app/core/interceptors/http-context.spec.ts) |
| UT-006 | `core/interceptors/auth.interceptor.ts` | Agrega `Authorization: Bearer <token>` a toda request salvo `/auth/*`; no lo agrega dos veces. | ✅ [Hecho](../src/app/core/interceptors/auth.interceptor.spec.ts) |
| UT-007 | `core/guards/auth.guard.ts` | `CanActivateFn` redirige a `/login` sin sesión y deja pasar con sesión; `homeRedirect()` resuelve la ruta según rol/capacidad. | ✅ [Hecho](../src/app/core/guards/auth.guard.spec.ts) |
| UT-008 | `shared/directives/can.directive.ts` | `*appCan` muestra/oculta el nodo según `AuthService.hasCapability()`; reacciona a un cambio de sesión (login/logout) sin necesitar recrear el componente host. | ✅ [Hecho](../src/app/shared/directives/can.directive.spec.ts) |
| UT-009 | `core/auth/capabilities.ts` | `resolveCapabilities()` por cada entrada de `MODULE_CAPABILITIES`; las `MODULE_IMPLICATIONS` y que sean exactamente las documentadas; sin clausura transitiva — mismo tipo de test que `CapabilityCatalogTest`/`CapabilityResolverTest` del backend (ver `bakend-proyecto-turnos/docs/PERMISOS.md`, mismo diseño espejado acá). | ✅ [Hecho](../src/app/core/auth/capabilities.spec.ts) |
| UT-010 | `core/auth/home-route.ts` | `resolveHomeRoute()` para cada combinación de rol/capacidad relevante. | ✅ [Hecho](../src/app/core/auth/home-route.spec.ts) |

### 6.1 Detalle técnico del Tier 1

Los 7 archivos se leyeron completos para esta sección — a diferencia del resto del plan, acá no hace
falta releer el código antes de escribir el spec, solo seguir esto.

#### Mock de `AuthService` compartido (lo usan 5 de los 7 archivos)

`http-error.interceptor.ts`, `auth.interceptor.ts`, `auth.guard.ts` y las dos directivas de
`can.directive.ts` dependen de `AuthService`. Definir un solo mock y reusarlo evita escribirlo 5
veces con formas ligeramente distintas:

```ts
function mockAuthService(overrides: Partial<{
  isAuthenticated: boolean;
  hasCapability: (c: string) => boolean;
  token: string | null;
}> = {}) {
  return {
    currentUser$: new Subject<AuthResponse | null>(), // emitir manualmente en el test si hace falta
    isAuthenticated: vi.fn(() => overrides.isAuthenticated ?? true),
    hasCapability: vi.fn(overrides.hasCapability ?? (() => true)),
    getToken: vi.fn(() => overrides.token ?? 'fake-token'),
    logout: vi.fn()
  };
}
```

`currentUser$` como `Subject` (no `of(...)`) porque UT-008 necesita emitir un segundo valor a mitad
del test para probar la reactividad de las directivas — con un `Observable` ya completado no se puede.

#### Patrón para testear los interceptors funcionales (UT-004, UT-006)

Un `HttpInterceptorFn` se registra y se ejerce a través de una request real, no llamándolo como
función suelta (evita reconstruir `HttpRequest`/`HttpHandlerFn` a mano):

```ts
TestBed.configureTestingModule({
  providers: [
    provideHttpClient(withInterceptors([httpErrorInterceptor])),
    provideHttpClientTesting(),
    { provide: AuthService, useValue: mockAuthService() },
    { provide: Router, useValue: { navigate: vi.fn() } },
    { provide: ErrorHandlerService, useValue: { getErrorMessage: vi.fn(() => 'msg'), isNetworkError: vi.fn(() => false) } },
    { provide: NotificationService, useValue: { showError: vi.fn() } }
  ]
});
```

`ErrorHandlerService`/`NotificationService` van **mockeados, no reales**: su propia lógica tiene spec
dedicado en Tier 2 (UT-011, UT-012) — acá solo importa que el interceptor los llame con los argumentos
correctos, no qué devuelven. `Router` como objeto plano con `navigate: vi.fn()` alcanza, no hace falta
`provideRouter(...)`.

---

**UT-004 `http-error.interceptor.ts`** — el archivo con más ramas del Tier 1.

- Casos a cubrir (cada uno dispara `httpClient.get(url).subscribe({ error: ... })` y
  `httpMock.expectOne(url).flush(body, { status, statusText })`):
  1. 403 fuera de `/auth/` + `error.error.requiredCapability` presente + `hasCapability(...)` → `true`
     (sesión desactualizada) → `notification.showError('Tus permisos cambiaron...')` +
     `authService.logout()` + `router.navigate(['/login'])`.
  2. 403 fuera de `/auth/` + `requiredCapability` presente + `hasCapability(...)` → `false` → muestra
     `error.error.message` (o el default), **sin** logout ni navigate.
  3. 403 fuera de `/auth/` + `requiredCapability` **ausente** → mismo camino que el caso 1 (fallback
     conservador documentado en el comentario del archivo — es intencional, no un bug).
  4. 403 en una URL `/auth/*` → pasa de largo sin tocar nada (`isAuthEndpoint` corta antes).
  5. 401 fuera de `/auth/` → `logout()` + `navigate(['/login'])`.
  6. 401 en `/auth/*` (ej. login con password incorrecta) → **no** dispara logout global — differencia
     clave con el caso 5.
  7. Error no 401/403/404 con `skipGlobalErrorHandler()` en el contexto de la request →
     `notification.showError` **no** se llama.
  8. Error no 401/403/404 sin skip, `isNetworkError` → `true` → tampoco se llama (se deja al
     componente).
  9. Error no 401/403/404 sin skip, no es de red → `notification.showError(errorHandler.getErrorMessage(error, context))` **sí** se llama; probar 2-3 URLs contra `extractContextFromUrl` (`/appointments/x/addPayment`, `/patients/search`, una URL no mapeada → `'realizar la operación'`).
  10. 404 → nunca notifica, con o sin skip.
- Gotcha: `shouldHandleErrorGlobally` y `extractContextFromUrl` **no están exportadas** — no se pueden
  importar sueltas, solo se ejercitan a través del interceptor completo (por eso los casos de arriba
  pasan todos por una request real).
- No hace falta espiar `console.log`/`console.error` (el archivo los usa para debugging), pero si el
  output de test queda ruidoso, `vi.spyOn(console, 'error').mockImplementation(() => {})` es válido.

**UT-005 `http-context.ts`** — sin TestBed, es una función pura sobre `HttpContext`:
- `skipGlobalErrorHandler().get(SKIP_GLOBAL_ERROR_HANDLER)` → `true`.
- `new HttpContext().get(SKIP_GLOBAL_ERROR_HANDLER)` (sin setear nada) → `false` (el default del
  token).

**UT-006 `auth.interceptor.ts`** — mismo patrón de `HttpTestingController` que UT-004, sin Router:
- Token presente + URL que **no** empieza con `AUTH_URL_PREFIX` → el request capturado por
  `httpMock.expectOne(...)` tiene `Authorization: Bearer <token>`.
- Token presente + URL de `/auth/*` → sin header `Authorization`.
- Token `null` (`getToken()` devuelve `null`) → sin header, cualquier URL.
- Gotcha: `AUTH_URL_PREFIX` se arma en tiempo de import desde `API_CONFIG.baseUrl`, que depende de
  `window.location.hostname !== 'localhost'`. jsdom resuelve el hostname a `localhost` por defecto, así
  que en los tests siempre cae en la rama de desarrollo (`http://localhost:8080/api`) — no hace falta
  mockear `window.location`, pero si algún día el setup de jsdom cambia el origin por defecto, esta
  constante cambiaría de rama en silencio.

**UT-007 `auth.guard.ts`** — exporta **dos** funciones, ambas con `inject()` adentro, así que ambas
necesitan `TestBed.runInInjectionContext(() => ...)`, no se pueden llamar sueltas:

```ts
TestBed.configureTestingModule({
  providers: [
    { provide: AuthService, useValue: mockAuthService({ isAuthenticated: false }) },
    { provide: Router, useValue: { navigate: vi.fn() } }
  ]
});
const result = TestBed.runInInjectionContext(() =>
  authGuard({ data: { capability: 'TURNOS:VIEW' } } as any, {} as any)
);
```

- `authGuard`: sin sesión → `false` + `navigate(['/login'])`. Con sesión, sin `route.data.capability`
  → `true`, sin navigate. Con sesión y `route.data.capability` presente: `hasCapability` `true` →
  `true`; `hasCapability` `false` → `false` + `navigate(['/403'])`.
- `homeRedirect`: sin sesión → `'/login'`. Con sesión y una sola capacidad de aterrizaje concedida
  (ej. solo `SEGUIMIENTO:VIEW`) → `'/seguimiento'` (confirma que salta `/panel` y `/turnos` en orden).
  Con sesión y ninguna capacidad de aterrizaje → `'/403'`.
- El segundo parámetro de `CanActivateFn` (`state: RouterStateSnapshot`) no se usa — un `{} as any`
  alcanza.

**UT-008 `shared/directives/can.directive.ts`** — el archivo exporta **dos directivas
independientes**, cada una necesita su propio `describe`:

- `CanDirective` (`[appCan]`, atributo): usar `render()` de `@testing-library/angular` con un template
  string, no `TestBed.createComponent` a mano — más corto para host + directiva:
  ```ts
  await render('<button [appCan]="cap">X</button>', {
    imports: [CanDirective],
    componentProperties: { cap: 'TURNOS:MANAGE' },
    providers: [{ provide: AuthService, useValue: mockAuthService({ hasCapability: () => false }) }]
  });
  ```
  - `hasCapability` → `true`: sin clase `capability-locked`, sin `aria-disabled`, sin `disabled`, sin
    `title`.
  - `hasCapability` → `false` sobre un `<button>` (está en el set `DISABLEABLE`): clase
    `capability-locked` + `aria-disabled="true"` + `disabled="true"` + `title` =
    `capabilityDeniedMessage(cap)` (importar la función real para no hardcodear el string esperado).
  - Mismo caso `false` sobre un `<a>` (no disableable): clase + `aria-disabled` + `title`, **sin**
    `disabled` (el `<a>` no tiene ese atributo nativo).
  - Reactividad: emitir un segundo valor en el `Subject` de `currentUser$` del mock después del render
    (simula un login) y confirmar que el DOM se actualiza sin re-crear el componente — esto es lo que
    reemplaza a `ngOnChanges` cuando el input `appCan` no cambió pero sí cambió la sesión.
- `CanShowDirective` (`*appCanShow`, estructural): mismo patrón con
  `'<a *appCanShow="cap">Link</a>'` e `imports: [CanShowDirective]`.
  - `hasCapability` → `true`: `screen.getByText('Link')` existe.
  - `hasCapability` → `false`: `screen.queryByText('Link')` es `null` (nunca se creó la vista).
  - Toggle `false → true` vía el `Subject` de `currentUser$`: el link aparece (ejercita
    `createEmbeddedView` la primera vez que `allowed` pasa a `true`, y confirma que `rendered` evita
    crearlo dos veces si se emite `true` de nuevo).

**UT-009 `core/auth/capabilities.ts`** — sin `TestBed`, sin mocks: son funciones puras sobre datos
estáticos, el spec más rápido de escribir del Tier 1.

- `resolveCapabilities(['PANEL'])` → exactamente `{PANEL:VIEW}` (ningún extra).
- `resolveCapabilities(['ODONTOGRAMA'])` → `ODONTOGRAMA_VIEW` + `ODONTOGRAMA_EDIT` + `TURNOS_VIEW`
  (Regla A parcial) — **y explícitamente no** `SEGUIMIENTO_VIEW` (sin clausura transitiva; es el caso
  que `PERMISOS.md` marca como el más delicado del diseño).
- `resolveCapabilities(['HISTORIA_CLINICA_FREE'])` → mismo patrón que arriba (segunda instancia
  independiente de la Regla A parcial — vale la pena como caso separado, no solo por simetría: si
  algún día se factoriza mal la regla, un solo caso podría no detectarlo).
- `resolveCapabilities(['TURNOS'])` → todas las `TURNOS_*` **más** todas las de `SEGUIMIENTO` (Regla B,
  total) — confirma el spillover completo de `MODULE_IMPLICATIONS.TURNOS`.
- `resolveCapabilities([])` → set vacío. `resolveCapabilities(['CODIGO_INEXISTENTE'])` → set vacío,
  sin excepción (defensivo ante un módulo cacheado viejo que el backend ya no reconoce).
- `derivedModules(['TURNOS'])` → **no** incluye `'TURNOS'` a sí mismo (el `if (granted.includes(code)) continue` se salta el propio módulo concedido, aunque técnicamente cumple sus propias capacidades).
- `capabilityDeniedMessage(Capability.PROFESIONALES_DELETE)` → mensaje especial fijo ("Solo el dueño de la organización..."), no pasa por el lookup de `OWNING_MODULE`.
- `capabilityDeniedMessage('TURNOS:VIEW')` → `"Requiere acceso a <label>"` — el `<label>` sale de
  `MODULE_OPTIONS` (`../models/profesional.model`); leer ese archivo para no hardcodear un label
  adivinado.
- Test estructural (mismo espíritu que `CapabilityCatalogTest.onlyThreeRulesExist` del backend):
  `Object.keys(MODULE_IMPLICATIONS).length === 3` — fija que las implicaciones siguen siendo
  exactamente tres (`ODONTOGRAMA`, `HISTORIA_CLINICA_FREE`, `TURNOS`) y no crecieron en silencio.
- **Límite de este spec**: solo detecta inconsistencia *interna* (ej. una regla mal tipeada). No
  detecta que este archivo se desincronice del `CapabilityCatalog.java` real del backend — esa
  sincronización la cubre el proceso/skill de sync entre repos, no un test unitario acá.

**UT-010 `core/auth/home-route.ts`** — `resolveHomeRoute` recibe el `hasCapability` como parámetro,
sin `inject()` ni `AuthService`: se testea con una función fake común y corriente, sin `TestBed`.

- `hasCapability` que solo devuelve `true` para `SEGUIMIENTO:VIEW` → `'/seguimiento'` (saltea
  `/panel` y `/turnos`, confirma el orden de `LANDING_ROUTES`).
- `hasCapability` siempre `false` → `'/403'`.
- `hasCapability` `true` para `PANEL:VIEW` **y** otras → `'/panel'` (gana la primera coincidencia del
  array, no la "mejor"; vale la pena un caso que fuerce esto para que el orden de `LANDING_ROUTES` no
  se reordene sin querer en el futuro).

## 7. Tier 2 (P1) — Servicios de estado sin `HttpClient`

| ID | Archivo | Qué testear | Estado |
|---|---|---|---|
| UT-011 | `core/services/error-handler.service.ts` | Qué mensaje arma por tipo de error HTTP; es la pieza central de la historia de toasts duplicados ([DEUDA § 3](./DEUDA_TECNICA.md)). | ✅ [Hecho](../src/app/core/services/error-handler.service.spec.ts) |
| UT-012 | `core/services/notification.service.ts` | `show`/`clear` del motor de toasts (275 líneas, el servicio sin HTTP más grande del repo); base útil antes de implementar el dedupe que propone [DEUDA § 3.5](./DEUDA_TECNICA.md) (opción 1). | ✅ [Hecho](../src/app/core/services/notification.service.spec.ts) |
| UT-013 | `core/services/clinical-attention.service.ts` | `record()`/`getLast()` sobre `sessionStorage`, incluido el caso de JSON corrupto (ver detalle técnico § 7.1). | ✅ [Hecho](../src/app/core/services/clinical-attention.service.spec.ts) |
| UT-014 | `features/odontograma/services/odonto-state.service.ts` | El servicio de estado más grande del repo (357 líneas): mutaciones de estado del odontograma. | ✅ [Hecho](../src/app/features/odontograma/services/odonto-state.service.spec.ts) |
| UT-015 | `features/odontograma/services/odontograma-state.service.ts` | Estado agregado del odontograma completo. | ✅ [Hecho](../src/app/features/odontograma/services/odontograma-state.service.spec.ts) |
| UT-016 | `features/odontograma/services/perio-state.service.ts` | Estado del periodontograma. | ✅ [Hecho](../src/app/features/odontograma/services/perio-state.service.spec.ts) — encontró un bug real, ver [DEUDA § 5](./DEUDA_TECNICA.md) |
| UT-017 | `features/seguimiento/seguimiento-view/patient-data.service.ts` | Cache de datos de paciente en Seguimiento. | ✅ [Hecho](../src/app/features/seguimiento/seguimiento-view/patient-data.service.spec.ts) |
| UT-018 | `features/historia-clinica/services/historia-clinica-state.service.ts` | Estado de borrador/firma de historia clínica. | ✅ [Hecho](../src/app/features/historia-clinica/services/historia-clinica-state.service.spec.ts) |

### 7.1 Detalle técnico del Tier 2

Los 8 archivos se leyeron completos. A diferencia del Tier 1 (mucha seguridad, poca lógica de datos),
acá el patrón dominante es **BehaviorSubject + baseline/diff** — cuatro de los ocho archivos
(`OdontoStateService`, `PerioStateService`, y los dos "facade" `OdontogramaStateService`/
`HistoriaClinicaStateService`) repiten la misma forma: cargar, guardar un baseline, mutar, diffear
contra el baseline al guardar.

#### Setup compartido

- `ErrorHandlerService`, `OdontoStateService`, `PerioStateService` y `ClinicalAttentionService` **no
  inyectan nada** (constructores vacíos o sin parámetros) — son los specs más baratos del tier, ni
  siquiera hace falta `TestBed`: `new OdontoStateService()` alcanza, aunque por consistencia con el
  resto de la suite conviene seguir usando `TestBed.inject(...)`.
- `OdontogramaStateService` (UT-015) y `HistoriaClinicaStateService` (UT-018) deben **mockear**
  `OdontoStateService`/`PerioStateService` y `HistoriaClinicaService` respectivamente (`useValue` con
  `vi.fn()`), no usar las instancias reales — cada una tiene su propio spec en este mismo tier; acá
  solo importa que la orquestación llame lo que corresponde con los argumentos correctos.
- `NotificationService` es el único de los ocho con efectos de DOM/timers reales — ver su bloque abajo.

---

**UT-011 `error-handler.service.ts`** — cero DI, funciones puras sobre `error: any`. El spec más
simple de escribir de todo el tier junto con UT-013.

- Tabla de `getErrorMessage(error, context)` sin mensaje del backend, por status: 400/422 → mensaje
  genérico con `context`; 401 → "sesión expirada"; 403 → "sin permisos para `context`"; **404 → string
  vacío** (no hay mensaje default, a diferencia de todos los demás — fácil de asumir mal); 408/500/502/
  503/504 → mensajes fijos; cualquier otro código → genérico con `context`.
- Con `error.error` presente, todos los códigos (excepto que la extracción falle) devuelven
  `extractBackendMessage(error.error)` en vez del mensaje genérico — probar las 4 formas que entiende:
  string directo, `{message}`, `{error: string}}`, `{errors: {campo1, campo2}}` (se unen con `', '`).
- 409 (conflicto): con mensaje del backend, se devuelve **tal cual** — el `if` que chequea si contiene
  "El horario"/"está en uso" es cosmético, ambas ramas devuelven lo mismo (no hace falta un caso para
  cada rama, con uno que tenga mensaje del backend alcanza). Sin mensaje del backend: `context`
  conteniendo "paciente" → mensaje de duplicado de documento; conteniendo "turno" → mensaje de horario
  ocupado; ninguno → genérico con `context`.
- Gotcha de orden: la detección de red (`!error.status || error.status === 0`) se evalúa **antes** que
  el `switch` — un objeto `{ status: 0 }` cae en el mensaje de red aunque tenga otras propiedades.
- `isNetworkError`/`requiresReauth`/`isForbiddenError`: triviales, un caso `true`/`false` cada uno.

**UT-012 `notification.service.ts`** — el único con DOM/timers reales del tier; necesita jsdom (ya
disponible) y limpieza explícita entre tests.

- El constructor crea `#toast-container` en `document.body` apenas se instancia el servicio — limpiar
  `document.body.innerHTML = ''` en `afterEach`, si no los toasts de un test se acumulan en el DOM del
  siguiente y `getByTestId('toast-message')` empieza a fallar por match múltiple.
- **Test de mayor valor del archivo**: `escapeHtml` previene XSS — llamar `showError('<script>alert(1)</script>')` y confirmar que `[data-testid="toast-body"]` contiene el texto escapado (`&lt;script&gt;...`), no un `<script>` real insertado vía `innerHTML`.
- Timers en cadena, tres etapas — usar `vi.useFakeTimers()`:
  1. `+10ms`: transición de entrada (`opacity`/`transform`).
  2. `+duration` (default 5000, `0` = sin auto-cierre): dispara la salida.
  3. `+300ms` más: `removeToastElement` recién ahí saca el nodo del DOM.
  Para confirmar que el toast desaparece, avanzar `duration + 300`; para confirmar que **no**
  desaparece con `duration: 0`, avanzar bastante tiempo (ej. 60000ms) y verificar que el nodo sigue.
- `dismissible: false` solo oculta el botón `toast-close-btn` — **no** afecta el auto-cierre por
  `duration` (son dos mecanismos independientes, fácil de asumir que están acoplados).
- Ramas **no cubribles** en este entorno, aceptar el hueco en vez de forzarlas: la detección de
  Bootstrap JS real (`window.bootstrap`, no existe en jsdom) y el fallback SSR
  (`typeof document === 'undefined'`). No vale la pena stubear un `window.bootstrap` falso solo para
  pisar esa rama — el comportamiento real en producción ya lo cubre el E2E, que corre en un navegador
  de verdad.
- Sin dedupe: dos `showError()` seguidos con el mismo mensaje generan dos toasts. Vale la pena un test
  que fije **este** comportamiento actual explícitamente — si el día de mañana se implementa la opción
  1 de [DEUDA § 3.5](./DEUDA_TECNICA.md) (dedupe), este test es el que hay que actualizar, y su
  existencia deja registrado que el cambio es intencional.

**UT-013 `clinical-attention.service.ts`** — cero DI, wrapper de `sessionStorage` (36 líneas): el spec
más simple del tier.

- `record(id, ruta)` seguido de `getLast()` → `{ appointmentId: id, rutaClinica: ruta }`.
- `getLast()` sin nada guardado → `null`. Con JSON corrupto guardado a mano en `sessionStorage` → `null` (el `catch` silencioso), sin excepción.
- Gotcha: `sessionStorage` **persiste entre tests** dentro del mismo entorno jsdom — `sessionStorage.clear()` en `beforeEach`, si no un test deja un valor que ensucia el `getLast()` del siguiente.
- La rama `typeof sessionStorage === 'undefined'` (SSR) no es cubrible en jsdom — mismo criterio que
  UT-012, aceptar el hueco.

**UT-014 `features/odontograma/services/odonto-state.service.ts`** — el archivo más grande y con más
ramas de todo el plan. Cero DI (ni `TestBed` hace falta), pero el más caro de cubrir bien.

- **El test de mayor valor del archivo**: `loadOdonto()` resetea `historiaClinica$` a
  `EMPTY_ANAMNESIS` **siempre**, esté o no relacionado con el turno nuevo — es la protección explícita
  contra el bug de "se ven los antecedentes del paciente anterior" que el propio comentario del código
  describe (el servicio es singleton y sobrevive a la navegación). Secuencia del test: `setHistoriaClinica(x)` → `loadOdonto(otroTurno)` → `historiaClinica$` debe volver a `EMPTY_ANAMNESIS`.
- `editable: false` en la respuesta de `loadOdonto` vuelve no-op a 5 mutadores: `cycleFace`,
  `toggleItemForSelectedTooth`, `removeItemsByLabelsForSelectedTooth`, `setComentario`,
  `setPlanTratamiento`. **`setHistoriaClinica` es la única excepción** — el comentario del código lo
  dice explícitamente ("no respeta editable: es la ficha del paciente") — vale un test dedicado a esa
  asimetría, no asumir que todos los setters se comportan igual.
- `buildOdontogramDelta()` — el método con más lógica de negocio real:
  - Reversión a `'normal'` **sí** genera entrada en el delta si el baseline no era `'normal'` (comentario explícito en el código: si no, no se puede guardar una corrección). Es el caso más fácil de romper por asumir "normal = sin datos = ignorar".
  - `comentario`/`planTratamiento` solo entran al delta si cambiaron contra el baseline (no contra el valor por defecto).
  - Leyendas: diente nuevo sin baseline → entra solo si `leyendaHasData`; diente con baseline → entra solo si `leyendaChanged`.
  - `pago` solo aparece en el delta si se pasó como argumento.
- `applySaveResponse()` vs. `loadOdonto()` — tres diferencias deliberadas, vale un test que las
  confirme las tres a la vez: no toca `editable`, no toca `comentarioAnterior$`, **no** resetea
  `historiaClinica$` (a diferencia de `loadOdonto`).
- `applyOdontoState` (privado, solo alcanzable vía `loadOdonto`/`applySaveResponse`) pre-siembra los 52
  dientes (`ALL_ODONTO_TOOTH_IDS`, incluye deciduos) con caras `'normal'` **antes** de aplicar los
  datos reales — confirmar esto inspeccionando el `Map` emitido por `faces$` directamente (que tenga
  las 52 claves), no solo `getFaceState()`, porque ese getter ya hace fallback a `'normal'` y no
  distingue "diente sembrado vacío" de "diente ausente del mapa" (un regresión ahí pasaría
  desapercibida si solo se testea a través del getter).
- `toggleItemForSelectedTooth`/`removeItemsByLabelsForSelectedTooth` son no-op tanto si `!editable`
  como si no hay diente seleccionado (`selectedTooth === null`) — son dos causas distintas del mismo
  resultado, conviene un caso para cada una por separado.
- El ciclo exacto de `cycleFace` depende de `nextFaceState` (Tier 3, UT-024, sin leer todavía) — si se
  escribe este spec antes que ese util, alcanza con afirmar "cambia de estado" y "vuelve al estado
  inicial después de N ciclos" sin hardcodear las etiquetas intermedias.

**UT-015 `features/odontograma/services/odontograma-state.service.ts`** — facade con 7 dependencias
inyectadas; mockear las 7 (`OdontogramaService`, `PeriodontogramaService`, `AppointmentsService`,
`PatientService`, `OdontoStateService`, `PerioStateService`, `ClinicalAttentionService`).

- `loadForAppointment`: `forkJoin` de 3 llamadas con sustitución individual en 404
  (`emptyOdontoResponse`/`emptyPerioResponse`/`null` respectivamente, Tier 3 UT-024/UT-025 antes de
  asumir el valor de `editable` que traen esos empties) — cualquier otro status debe **propagar** el
  error (no solo el 404 está cubierto).
- `editable = odonto.editable !== false && perio.editable !== false` — las 4 combinaciones booleanas.
- El `appointmentsService.updateStatus(...)` de EN_CURSO es un `.subscribe()` interno "fire and forget"
  — su `error:` solo hace `console.error`, no rompe ni afecta el `Observable` que devuelve
  `loadForAppointment`. Mismo patrón, calcado, en UT-018 — vale la pena escribir el caso una vez y
  reusar la forma en el otro spec.
- La carga de antecedentes (`patientService.findById` → `parseAnamnesis`) ocurre en un `switchMap`
  **posterior** al `tap` principal, condicionada a `appointment?.patientId`; si falla, se traga con
  `catchError(() => of(null))` — el load completo debe resolver bien igual (panel con antecedentes
  vacíos, no un error global).
- `saveTurnoCompleto()` sin turno cargado **lanza síncronamente** (`throw`, no error de Observable) —
  `expect(() => service.saveTurnoCompleto()).toThrow()`, no `.subscribe({ error })`.
- Los pass-throughs (`cycleFace`, `selectTooth`, etc.) son delegación directa a los mocks — alcanza con
  confirmar que reenvían los argumentos tal cual, no hace falta un test por cada uno de los ~12 métodos
  si se agrupan en una tabla/`it.each`.

**UT-016 `features/odontograma/services/perio-state.service.ts`** — cero DI, misma forma que UT-014
pero sin la complejidad de leyendas/íconos.

- El constructor ya pre-siembra los 32 `PERIO_TOOTH_IDS` (dientes permanentes únicamente, sin
  deciduos) — confirmar que `getPerioTeethMap()` tiene 32 entradas antes de cualquier `loadPerio()`.
- **Contrato no obvio de `notifyPerioChange()`**: mutar una propiedad de un diente obtenido vía
  `getPerioTeethMap()` (mutación in-place del objeto) **no** dispara `perioTeeth$` por sí solo — recién
  lo hace `notifyPerioChange()`, que solo reempaqueta el mismo contenido en un `Map` nuevo para forzar
  la emisión. Vale un test explícito: mutar sin llamar `notifyPerioChange()` → sin nueva emisión;
  llamarlo → nueva emisión con el mismo contenido mutado.
- `updatePerioTooth(id, updater)`: no-op si `!editable`; no-op si `id` no está en el mapa (con los 32
  ids pre-sembrados, solo se puede forzar con un id inválido a propósito, ej. `99`).
- `buildPeriodontogramDelta()`: mismo patrón de diff que UT-014 (nuevo sin baseline → solo si
  `hasPerioData`; con baseline → solo si `!dienteDeltaEquals`) — confirmar contra UT-025
  (`perio-delta.util.ts`) si una reversión a "sin datos" con baseline con datos genera delta, igual que
  el caso de `buildOdontogramDelta` en UT-014.

**UT-017 `features/seguimiento/seguimiento-view/patient-data.service.ts`** — único del tier con
`@Injectable()` **sin** `providedIn: 'root'` (a propósito, comentario del código: se re-crea por
componente para resetear el cache al entrar a la vista) — quien escriba el spec de
`seguimiento-view.component` (Tier 6, UT-068) va a necesitar una instancia nueva por test también, no
compartida. Una dependencia inyectada: `AppointmentsService` (mockear `findByDateRange`,
`getSeguimientoResumen`).

- **El test de mayor valor del tier completo**: `getAvailableMonths`/`getFilteredAppointments` existen
  específicamente para no romper el modo zoneless — el comentario del código lo dice explícito: devolver
  un array/objeto **nuevo** desde un getter llamado en un `*ngFor` dispara `NG0103` (bucle infinito de
  refresco) bajo `provideZonelessChangeDetection()`. El test que lo fija: llamar
  `getAvailableMonths(id)` dos veces seguidas sin cambiar nada en el medio y afirmar **igualdad de
  referencia** (`toBe`, no `toEqual`); y que para un paciente sin meses cacheados devuelve exactamente
  la constante `EMPTY_MONTHS` (mismo objeto, no un `[]` nuevo). Es el único archivo del Tier 2 que
  protege directamente un bug de la clase que [DEUDA § 4.3](./DEUDA_TECNICA.md) señala como sistémico.
- `loadYear(year)` cachea por año: la segunda llamada con el mismo año **no** vuelve a llamar
  `findByDateRange` (verificar `toHaveBeenCalledTimes(1)` tras dos `loadYear` del mismo año).
- `ensureAllYearsLoaded`: si todos los años del resumen ya están cacheados, devuelve `of(null)` **sin**
  llamar a ningún HTTP — no solo "llama menos", llama cero veces.
- `setPatients`: un paciente sin `identificacion` queda **fuera** de `patientsMap` en silencio (la key
  del mapa es `identificacion`) — toda la lógica de agrupación/filtro depende de esa key, vale un test
  explícito de este caso borde.
- `onYearFilterChange` resetea el filtro de mes a `'all'` como efecto secundario del cambio de año —
  fácil de pasar por alto si solo se testea el propio filtro de año.
- `updateCachedAppointment`: no-op silencioso si el año del turno actualizado nunca se cargó (no está
  en `appointmentsByYear`) — probar ambas ramas (año cargado / año no cargado).

**UT-018 `features/historia-clinica/services/historia-clinica-state.service.ts`** — 3 dependencias
inyectadas (`HistoriaClinicaService`, `AppointmentsService`, `ClinicalAttentionService`), mismo patrón
de facade que UT-015 pero con un solo estado (`HistoriaClinicaResponse` plano, sin sub-servicios).

- Mismo patrón de 404→`emptyResponse` local y de `updateStatus` fire-and-forget que UT-015 — reusar la
  misma forma de test.
- `saveDraft`/`sign` sin turno cargado **lanzan síncronamente** (`throw`), igual que
  `saveTurnoCompleto` en UT-015 — mismo gotcha de no usar `.subscribe({ error })` para este caso.
- Un `sign()` puede **cerrar** el formulario: si la respuesta trae `editable: false`, `isEditable` pasa
  a `false` después de firmar — test explícito de esa transición true→false disparada por la respuesta,
  no por un input del usuario.
- `clinicalAttention.record(id, 'historia-clinica')` usa el literal `'historia-clinica'`, mientras que
  UT-015 usa `'odontograma'` — si algún día se escriben ambos specs copiando uno del otro, un
  copy-paste que deje el tag equivocado en uno de los dos **no lo detecta ningún E2E** (nadie más lee
  ese string) — vale la pena un `expect(mockClinicalAttention.record).toHaveBeenCalledWith(id, 'historia-clinica')` explícito y literal, no una variable compartida entre ambos specs.

## 8. Tier 3 (P1) — Utils y validators puros

| ID | Archivo | Qué testear | Estado |
|---|---|---|---|
| UT-019 | `core/utils/date.utils.ts` | Formateo de fecha timezone-safe con getters locales, no `toISOString()` (ver detalle técnico § 8.1). | ✅ [Hecho](../src/app/core/utils/date.utils.spec.ts) |
| UT-020 | `core/utils/currency.util.ts` | Formateo de moneda (trivial, 13 líneas, pero barato). | ✅ [Hecho](../src/app/core/utils/currency.util.spec.ts) |
| UT-021 | `core/utils/full-name.util.ts` | Ya ejercitado indirectamente por `search-input.component.spec.ts`; un spec directo igual vale por ser trivial (3 líneas) y aislar el caso de nombre/apellido vacíos. | ✅ [Hecho](../src/app/core/utils/full-name.util.spec.ts) |
| UT-022 | `core/utils/anamnesis.util.ts` | `parseAnamnesis()` sobre JSON legado/corrupto, incluido el caso de texto plano pre-JSON (ver detalle técnico § 8.1). | ✅ [Hecho](../src/app/core/utils/anamnesis.util.spec.ts) |
| UT-023 | `core/utils/profesional-assignability.util.ts` | `isProfesionalActive`/`Assignable`/`AssignableForReassign`, cada rama. | ✅ [Hecho](../src/app/core/utils/profesional-assignability.util.spec.ts) |
| UT-024 | `features/odontograma/services/odonto-delta.util.ts` | Lógica de diff entre estados de odontograma (122 líneas). | ✅ [Hecho](../src/app/features/odontograma/services/odonto-delta.util.spec.ts) |
| UT-025 | `features/odontograma/services/perio-delta.util.ts` | Diff de periodontograma (147 líneas). | ✅ [Hecho](../src/app/features/odontograma/services/perio-delta.util.spec.ts) — confirma el bug de [DEUDA § 5](./DEUDA_TECNICA.md) a nivel util |
| UT-026 | `features/seguimiento/utils/seguimiento-display.util.ts` | Su lógica de formateo para la vista de Seguimiento. | ✅ [Hecho](../src/app/features/seguimiento/utils/seguimiento-display.util.spec.ts) |
| UT-027 | `shared/validators/custom-validators.ts` | Cada `ValidatorFn` (DNI, teléfono, etc.) contra un `FormControl` real, caso válido e inválido. | ✅ [Hecho](../src/app/shared/validators/custom-validators.spec.ts) |

### 8.1 Detalle técnico del Tier 3

Los 9 archivos se leyeron completos. Todos son funciones puras sin `TestBed` ni mocks — el tier más
barato de todo el plan por archivo, pero dos de ellos (`odonto-delta.util.ts`, `perio-delta.util.ts`)
tienen más ramas de las que su tamaño sugiere, porque son el corazón de la lógica de diff que UT-014/
UT-016 (Tier 2) ya usaban sin que este documento las hubiera leído todavía.

**UT-019 `date.utils.ts`** — el propio comentario del archivo explica el porqué: evita
`toISOString()` porque en UTC-3 puede correr la fecha un día cerca de medianoche.

- `formatDateToYYYYMMDD(new Date(2024, 0, 5))` → `'2024-01-05'` (mes y día con cero a la izquierda).
- `getTodayAsYYYYMMDD()`: usar `vi.setSystemTime(...)` para fijar el reloj y comparar contra un
  string exacto, no recalcular `new Date()` de nuevo dentro del test (ahí sí se podría desincronizar
  por un tick).
- **Límite real de este test**: la función usa getters *locales* (`getFullYear`/`getMonth`/`getDate`),
  no UTC, así que el test prueba que **no** toca `toISOString()` — pero confirmar que efectivamente
  funciona bien bajo UTC-3 requeriría controlar el timezone de todo el proceso de Vitest (`TZ` de
  Node), no algo que se pueda variar por test. Aceptar esta limitación, no inventar un mock de
  timezone artificial.

**UT-020 `currency.util.ts`** — `formatCurrency`:

- `undefined`, `null` **y `0`** → los tres devuelven `''` (mismo chequeo `!amount`) — remarcar que `0`
  no es `"$0"`, es cadena vacía.
- Negativo → el signo va **antes** del `$` (`"-$1.234"`, no `"$-1.234"`).
- Gotcha de entorno: `Intl.NumberFormat('es-AR', ...)` depende de los datos ICU compilados en el
  binario de Node que corre los tests. Si algún día este test pasa en local y falla solo en Jenkins (o
  viceversa) sin que nadie tocó el archivo, sospechar primero de un build de Node con ICU reducido
  antes que de un bug de lógica.

**UT-021 `full-name.util.ts`** — ya conocido (3 líneas): nombre y apellido, ambos, solo uno, ninguno
(`''`), y `null`/`undefined` explícitos (la firma los acepta).

**UT-022 `anamnesis.util.ts`** — `parseAnamnesis` es la única de las 9 con manejo de errores real
(parseo de JSON de un campo de texto libre).

- `raw` falsy → `EMPTY_ANAMNESIS`.
- **Caso de mayor valor**: `raw` = texto plano no-JSON (ej. `"Alergia a la penicilina"`, el formato
  real de pacientes viejos según el comentario del código) → `EMPTY_ANAMNESIS`, sin excepción — es el
  caso de migración de datos legacy que el comentario documenta explícitamente, no un edge case
  inventado.
- `raw` = JSON válido pero array o primitivo (`"[1,2]"`, `"5"`) → también `EMPTY_ANAMNESIS` (guard de
  `typeof !== 'object'`).
- Campos con valores no-string en el JSON (ej. un número donde se esperaba texto) → se excluyen en
  silencio (`asText` solo acepta `typeof === 'string'`).
- El orden de `items` en la salida sigue el orden fijo de `ANAMNESIS_FIELDS`, **no** el orden de las
  claves en el JSON de entrada — armar un caso con las claves deliberadamente desordenadas en el JSON
  fuente para confirmarlo.
- La clave `otrosAntecedentes` del JSON se renombra a `otros` en la salida — fácil de tipear mal.

**UT-023 `profesional-assignability.util.ts`** — más simple de lo que sugiere tener 5 funciones
exportadas: **todas** delegan en la misma condición (`activo !== false`), es una cadena de
pass-throughs, no reglas independientes.

- `isProfesionalActive`/`isProfesionalAssignable`/`...ForReassign`/`...ForNewAppointment`: los 4
  devuelven lo mismo para el mismo `Profesional` — un solo caso con `activo: true`/`false` cubre los 4
  en espíritu (no hace falta inventar 4 escenarios distintos).
- **El parámetro `_fechaTurno` de `isProfesionalAssignableForNewAppointment` está completamente sin
  usar** (prefijo `_`, convención de TS para "a propósito sin usar") — hoy **no existe** ninguna regla
  de asignabilidad basada en fecha, pese a que la firma lo sugiere. No escribir un caso que pruebe algo
  con la fecha: no hay comportamiento que probar ahí todavía.
- `activo: undefined` (campo nunca seteado) → `isProfesionalActive` devuelve `true` (el check es
  `!== false`, no `=== true`) — caso fácil de escribir al revés por error.
- `filterProfesionalesForNewAppointment`/`filterProfesionalesForReassign`: un array con mezcla de
  activos/inactivos, confirmar que el filtro deja solo los activos.

**UT-024 `features/odontograma/services/odonto-delta.util.ts`** — alimenta a UT-014 (Tier 2); más
denso de lo que su lugar en "Tier 3" sugiere.

- `nextFaceState`: el ciclo exacto es `normal → caries → obturacion → ausente → normal` — esto es lo
  que UT-014 (§ 7.1) dejó pendiente de confirmar para no hardcodear las etiquetas intermedias; ya se
  puede escribir el caso completo en ambos specs.
- `mergeOdontoEstado`: **dos semánticas de merge distintas en la misma función** — `caras` es
  sobreescritura total por clave (`numeroDiente-cara`: lo último gana entero); `leyendas` es
  campo-por-campo con **OR para los flags booleanos** (`existing || incoming`, un flag en `true` nunca
  se puede "apagar" combinando con `cambiosTurno`) y **último-no-nulo para `movilidad`/`furca`**
  (numéricos sí se sobreescriben). El caso de mayor valor: armar un `estadoActual` con un flag en
  `true` y un `cambiosTurno` con ese mismo flag en `false`, confirmar que el resultado sigue en `true`
  — es el comportamiento menos intuitivo del archivo.
- `caraToFaceKey`: string en español → `FaceKey`; un valor no mapeado devuelve `null`. Como
  `OdontoStateService.applyOdontoState` hace `continue` en silencio ante un `null`, un valor nuevo que
  el backend empiece a mandar y que este mapa no conozca **desaparece de la UI sin ningún error** —
  vale la pena un test explícito con un string inventado para dejar esto fijado antes de que ocurra en
  producción.
- `leyendaHasData`: revisa `movilidad != null` (no truthy) — `movilidad: 0` cuenta como "con datos".
  Escribir ese caso específico (`0` es falsy pero acá debe dar `true`), es el clásico error de "cero
  parece vacío pero no lo es".

**UT-025 `features/odontograma/services/perio-delta.util.ts`** — alimenta a UT-016; misma familia que
UT-024 pero con una diferencia de semántica importante entre ambos.

- `mergePerioEstado` usa `{ ...existing, ...d }` — spread plano, **sobreescritura directa**, no el
  OR-de-booleanos de `mergeOdontoEstado`. Si se escriben ambos specs en la misma sesión, no asumir que
  se comportan igual solo porque el nombre y la forma del archivo son paralelos — es la diferencia de
  comportamiento más fácil de pasar por alto de todo el Tier 3.
- `toothToDelta`/`dienteDeltaToTooth`: reshape entre un DTO plano (36 campos `vestPsM`, `vestPsC`,
  ...) y un objeto anidado (`vestibular.probing[0..2]`, etc.) — un test de ida y vuelta
  (`dienteDeltaToTooth(toothToDelta(tooth))` debe dar el mismo `tooth`) cubre las 36 columnas de una
  sola vez, más barato que escribir 36 aserciones sueltas.
- `hasPerioData`/`dienteDeltaEquals`: a diferencia de `leyendaHasData` (UT-024), acá **no hay forma de
  distinguir un diente con `mobility: 0` puesto a propósito de un diente nunca tocado** — ambos
  comparan igual contra el diente vacío. No es un bug a arreglar en este tier, pero el spec debe
  documentar esta limitación con un test que confirme el comportamiento actual, no asumir paridad con
  el caso de UT-024 (son asimétricos a propósito o por descuido, pero hoy se comportan distinto).

**UT-026 `features/seguimiento/utils/seguimiento-display.util.ts`** — sin ningún import de Angular,
3 funciones puras.

- `getAppointmentColor`: reglas **con prioridad estricta**, hay que testear el orden, no solo cada
  condición por separado. La de mayor valor: un turno `COMPLETADO` **con deuda** debe dar rojo, no
  verde (la deuda gana sobre cualquier estado). La segunda, explícita en el comentario del código: un
  `PENDIENTE` vencido (fecha pasada, sin deuda) debe dar gris, **no** naranja — es el caso que el
  propio comentario dice que hay que chequear en ese orden.
- Límite día/pasado: comparación estricta (`<`, no `<=`) contra medianoche local — un turno de **hoy**
  no cuenta como pasado.
- `getStatusLabel` con un status no mapeado devuelve **el string crudo tal cual llegó** (si es
  truthy) — no un genérico; `getStatusBadgeClass` en el mismo caso sí devuelve un genérico
  (`'badge-sin-estado'`) — son dos fallbacks distintos, no asumir que se comportan igual.

**UT-027 `shared/validators/custom-validators.ts`** — 3 `ValidatorFn` sobre regex + un array que
reexporta `Validators.min(0)`.

- Los 3 validadores (documento, teléfono, nombre) **dejan pasar un control vacío** (`null` = válido) —
  no hacen de `required`; combinarlos con `Validators.required` es responsabilidad de quien arma el
  formulario. Testear esto explícitamente para los 3, es la fuente más común de confusión con este
  tipo de validador.
- `documentNumberValidator`: probar los límites exactos (4 caracteres inválido, 5 válido, 20 válido,
  21 inválido) y que acepta letras (RUT/CURP, no solo DNI numérico — el comentario lo dice a
  propósito).
- `personNameValidator`: los dos casos que el propio comentario usa como motivación —
  `"Jean-Pierre"` y `"O'Higgins"` — más un nombre con dígito, que debe fallar.
- La forma del error devuelto (`{ pattern: { requiredPattern, actualValue } }`) **coincide con la del
  `Validators.pattern` nativo de Angular** — no hace falta memorizar una forma nueva para las
  aserciones, es la misma que ya se usaría contra un validador built-in.

## 9. Tier 4 (P2) — Servicios HTTP restantes

| ID | Archivo | Qué testear | Estado |
|---|---|---|---|
| UT-028 | `core/services/patient.service.ts` | [DEUDA § 3.2](./DEUDA_TECNICA.md): el `GET /patients` eager del constructor duplica el toast del interceptor — fijar como test de regresión antes de decidir el arreglo. | ✅ [Hecho](../src/app/core/services/patient.service.spec.ts) |
| UT-029 | `core/services/profesional.service.ts` | [DEUDA § 3.2](./DEUDA_TECNICA.md): ya no dispara 403, pero sigue duplicando en 500/502/etc. | ✅ [Hecho](../src/app/core/services/profesional.service.spec.ts) |
| UT-030 | `core/services/appointments.service.ts` | El servicio HTTP más grande del repo (290 líneas); fijar como regresión los usos correctos de `skipGlobal` ([DEUDA § 3.4](./DEUDA_TECNICA.md)) antes de tocar el interceptor (UT-004). | ✅ [Hecho](../src/app/core/services/appointments.service.spec.ts) |
| UT-031 | `core/services/configuration.service.ts` | CRUD de configuración de la organización. | ✅ [Hecho](../src/app/core/services/configuration.service.spec.ts) |
| UT-032 | `core/services/dashboard.service.ts` | Agregaciones que alimentan el Panel (174 líneas). | ✅ [Hecho](../src/app/core/services/dashboard.service.spec.ts) |
| UT-033 | `core/services/historia-clinica.service.ts` | Wrapper delgado (28 líneas). | ✅ [Hecho](../src/app/core/services/historia-clinica.service.spec.ts) |
| UT-034 | `core/services/invitation.service.ts` | Wrapper delgado (24 líneas). | ✅ [Hecho](../src/app/core/services/invitation.service.spec.ts) |
| UT-035 | `core/services/module-rules.service.ts` | Memoiza manualmente con `shareReplay(1)`: una sola request HTTP en toda la vida del singleton (ver detalle técnico § 9.1). | ✅ [Hecho](../src/app/core/services/module-rules.service.spec.ts) |
| UT-036 | `core/services/odontograma.service.ts` | Wrapper delgado (37 líneas). | ✅ [Hecho](../src/app/core/services/odontograma.service.spec.ts) |
| UT-037 | `core/services/periodontograma.service.ts` | Wrapper delgado (29 líneas). | ✅ [Hecho](../src/app/core/services/periodontograma.service.spec.ts) |
| UT-038 | `features/coberturas/coberturas.service.ts` | CRUD de coberturas (69 líneas). | ✅ [Hecho](../src/app/features/coberturas/coberturas.service.spec.ts) |
| UT-039 | `features/coberturas/intermediarios.service.ts` | CRUD de intermediarios (56 líneas). | ✅ [Hecho](../src/app/features/coberturas/intermediarios.service.spec.ts) |

### 9.1 Detalle técnico del Tier 4

Los 12 archivos se leyeron completos.

#### Gotcha compartido: 3 de los 12 disparan HTTP desde el constructor

`PatientService`, `ProfesionalService` y `ConfigurationService` se suscriben a `auth.currentUser$` **en
el constructor** y disparan un `GET` apenas emite un usuario no nulo. Si el mock de `AuthService` en el
test ya tiene un valor no nulo en `currentUser$` en el momento de `TestBed.inject(...)`, ese `GET` sale
solo — hay que `httpMock.expectOne(...)` y `flush(...)` esa request **antes** de poder testear
cualquier otro método, o `httpMock.verify()` va a fallar al final del test por una request sin
resolver. Los tres también necesitan `auth.loggedOut$` como `Observable` real en el mock (no solo
`currentUser$`), porque también se suscriben a esa en el constructor — un mock que solo tenga
`currentUser$` rompe la construcción del servicio con un error de "undefined is not observable".

---

**UT-028 `patient.service.ts`** — el caso de [DEUDA § 3.2](./DEUDA_TECNICA.md).

- El `GET /patients` del constructor: éxito → `getPatients()` emite la lista; 404 → cache queda en
  `[]`, **sin** notificar; error de red → sin notificar; cualquier otro status (ej. 500) → **sí**
  notifica — es el test de regresión que ya pedía la tabla del Tier 4.
- `loadPatients()` (no la del constructor) tiene su **propio** `catchError`, que nunca notifica, solo
  loggea — tres rutas de manejo de error distintas en el mismo archivo (constructor / `loadPatients` /
  `findAll`, que ni siquiera atrapa el error y lo deja propagar al llamador) — no asumir que "ya
  testeé una, alcanza para las otras dos".
- `create`/`update`/`delete` disparan `loadPatients()` como efecto secundario al resolver — el test de
  `create()` tiene que esperar **dos** requests (el `POST` más el `GET` de refresco), no una; olvidar
  la segunda es la forma más fácil de que `httpMock.verify()` falle en silencio con "unmatched
  requests" al final del archivo de test.
- `findAll()` también actualiza el cache por `tap` aunque es nominalmente un método de lectura — un
  test que solo mire el valor de retorno se pierde ese efecto secundario.

**UT-029 `profesional.service.ts`** — mismo esqueleto que UT-028, con la bifurcación que **es** el fix
de DEUDA § 3.2.

- `fetchProfesionales()` (privado, solo alcanzable a través de los métodos públicos): con
  `hasCapability(PROFESIONALES_VIEW)` en `true` → pega a `/profesionales`; en `false` → pega a
  `/profesionales/active`. **Este es el test de mayor valor del archivo** — confirma el fix real, no
  solo "el servicio funciona". Reusar el mock de `AuthService` con `hasCapability` configurable del
  Tier 1 (§ 6.1).
- El refresco tras `create`/`update`/`delete`/`toggleActive` pasa por el mismo `fetchProfesionales()`
  — confirmar que, sin la capacidad, el refresco también pega a `/active` y no a la base.
- `getProfesionalesForDropdown()`: filtro síncrono `activo !== false` sobre el cache — mismo cuidado
  con `undefined` que UT-023 (Tier 3): un profesional sin el campo seteado cuenta como activo.

**UT-030 `appointments.service.ts`** — el servicio más grande del tier, pero **sin** el patrón de HTTP
en el constructor de UT-028/029 — solo se suscribe a `loggedOut$` y a su propio `Subject` interno de
carga por mes. Setup más simple de lo que su tamaño sugiere.

- `getFilteredAppointments()`: los 3 checkboxes (`pendingOnly`/`pendientesOnly`/`canceladosOnly`) se
  combinan con **OR** cuando hay más de uno activo, no AND — probar 2 activos a la vez y confirmar que
  el resultado es la unión. La búsqueda por texto (`type`/`term`) se aplica **después**, sobre ese
  resultado ya filtrado.
- `loadAppointmentsForMonth`: dos llamadas rápidas seguidas con meses distintos — por `switchMap`, la
  primera se cancela; solo la respuesta de la **segunda** debe terminar en el cache. Es un test de
  condición de carrera real, no cosmético.
- `loadError$` es un `Subject`, no `BehaviorSubject` — hay que suscribirse a él **antes** de llamar
  `loadAppointmentsForMonth()`, si no el error emitido no lo ve nadie. Después de un error, la
  suscripción interna sigue viva gracias a `EMPTY` — confirmar que una segunda llamada exitosa
  funciona igual (el pipeline no murió con el primer error).
- `create`/`update`/`delete`/`addPayment`/`updateStatus` mutan el array del cache **en memoria** con la
  respuesta del server — no hacen un refetch completo como UT-028/029. `delete()` en particular **no
  saca** el turno del array: lo deja con `estado: 'CANCELADO'` (cancelación lógica, espejo del
  backend) — confirmar que sigue presente en `appointmentsCache$`, no ausente.
- `addPaymentWithFeedback(id, 0)` (o negativo): corta en el guard del lado cliente, **cero** requests
  HTTP — confirmar con `httpMock.expectNone(...)` o equivalente, no solo que no lanza.
- `checkAvailability`: a diferencia de casi todo el resto del archivo, acá el error **no** se atrapa —
  el comentario del código lo dice explícito (red ≠ horario ocupado). Un `{available: false}` es una
  respuesta 200 exitosa, no un error — dos tests separados, no uno solo.
- `updateWithFeedback`/`addPaymentWithFeedback` son los usos "correctos" de [DEUDA § 3.4](./DEUDA_TECNICA.md)
  que hay que fijar antes de tocar el interceptor (UT-004): 404 → sin notificación propia (pero
  **relanza** el error); error de red → sin notificación (relanza); cualquier otro → notifica con el
  contexto dado (relanza). Los tres casos relanzan siempre — lo único que cambia es si notifican.

**UT-031 `configuration.service.ts`** — mismo patrón de constructor que UT-028/029, pero con manejo de
error mucho más simple: ante **cualquier** error del `GET` inicial, cae en un `DEFAULT_TEMPLATE` local
sin notificar nunca — no hay ninguna rama de "sí notifica" que buscar acá, a diferencia de Patient/
Profesional.

- `getMensajeWhatsapp()`: `config$.value?.mensajeWhatsapp || DEFAULT_TEMPLATE` — chequeo por falsy, no
  por `null` — un `Configuration` real con `mensajeWhatsapp: ''` también cae al default. Caso
  explícito, fácil de escribir mal como "solo si es null/undefined".
- `buildMessage`: reemplaza `{profesional}` **y** el alias legado `{doctor}` con el mismo valor —
  probar con un template que use `{doctor}` para no dar por hecho que solo el placeholder nuevo
  funciona.
- `buildWhatsAppLink`: dos caminos independientes a `null` — teléfono vacío/solo espacios, o teléfono
  que tras sacarle el formato (`\s\-()+`) queda vacío (ej. `"()"`, `"---"`) — dos casos, no uno.

**UT-032 `dashboard.service.ts`** — una sola dependencia (`AppointmentsService`), dos llamadas HTTP
encadenadas por `loadMonth`.

- `loadMonth` dispara el mes principal y, **solo si ese resuelve**, el mes anterior — si el mes
  anterior falla, `previousMonthAppointments$` queda en `[]` pero `error$` (que solo refleja el mes
  principal) sigue en `false`. Es un caso fácil de asumir como "un solo flag de error para todo".
- `applyDateFilter` no se resetea entre llamadas a `loadMonth`: un filtro de fechas activo sobrevive a
  un `refresh()`/recarga de mes — confirmar que persiste, no que se limpia.
- `computeSummary`: turnos `CANCELADO`/`NO_ASISTIO` con saldo pendiente **no** suman a
  `ingresosPendientes` (mismo criterio que el backend, comentado explícitamente en el código) — el
  caso puntual que hay que replicar, no una regla genérica de "excluir cancelados de todo".
- `computeProfessionalStats`: el grupo `'No asignado'` (turnos sin `profesionalId`) va siempre
  **primero**, fuera del orden alfabético que sí aplica a los profesionales reales — probar con al
  menos 2 profesionales + turnos sin asignar para que el orden esperado no sea ambiguo.
- `computeDailyIncome` antes de cualquier `loadMonth()` (o en una instancia recién creada): devuelve
  `[]` por el guard `currentYear === 0`, no error — es el estado inicial real de cualquier instancia
  nueva, vale como primer test del archivo.

**UT-033 `historia-clinica.service.ts`** / **UT-034 `invitation.service.ts`** — wrappers delgados sin
estado ni lógica de cache: un test por método confirmando verbo HTTP + URL alcanza. El comentario
"`sign()` no es idempotente" en UT-033 es una advertencia para quien lo *llama*, no algo que este
archivo deba defender por sí mismo — no hace falta un test de idempotencia acá.

**UT-035 `module-rules.service.ts`** — el más chico del tier con la trampa más fácil de pasar por
alto: memoiza manualmente (`if (!this.rules$) {...}`), no es solo un wrapper.

- **Test de mayor valor**: llamar `getRules()` (o `getClinicalModules()`, que delega en `getRules()`)
  dos o tres veces seguidas y confirmar con `httpMock.expectOne(...)` que hubo **una sola** request en
  total — el resto de las llamadas devuelven el mismo `Observable` cacheado (`shareReplay(1)`), sin
  importar que sea `getRules()` o `getClinicalModules()` la que se llame la segunda vez.
- No hay lógica de reintento: si la primera llamada falla, `rules$` queda seteado igual (ya no es
  `undefined`) y ninguna llamada futura vuelve a intentar el HTTP — no hace falta un test de esto (no
  hay comportamiento de recuperación que verificar), pero sí tenerlo en cuenta si algún día se agrega.

**UT-036 `odontograma.service.ts`** / **UT-037 `periodontograma.service.ts`** — los wrappers más
"aburridos" del plan, y por eso los más fáciles de sub-testear con un `httpMock.expectOne(() => true)`
demasiado laxo.

- Cada uno mezcla **dos bases de URL distintas** del mismo `API_CONFIG` (`endpoints.appointments` para
  `getByAppointment`/`saveDelta`/`saveTurnoCompleto`, `endpoints.patients` para `getEstadoActual`) — un
  copy-paste que apunte al endpoint equivocado no lo detecta un matcher laxo. Cada método necesita su
  propia aserción de **URL exacta**, no solo "algo respondió".

**UT-038 `coberturas.service.ts`** / **UT-039 `intermediarios.service.ts`** — CRUD estándar más una
pieza de efecto de DOM que no es HTTP puro.

- `listar(paises)` arma `HttpParams` **repitiendo la clave** `pais` por cada país (`params.append`),
  no un valor único separado por comas — verificar con `req.params.getAll('pais')` (devuelve el
  array completo), no `.get('pais')` (que solo trae el primero y haría pasar un bug de "solo llega el
  último país" sin que el test lo note).
- `subirArchivo`: el body es un `FormData`, no JSON — la aserción sobre `req.request.body` tiene que
  chequear `instanceof FormData` y leer con `.get('file')`/`.get('tipoDocumento')`, no tratarlo como
  objeto plano.
- `descargarArchivo` → `triggerBrowserDownload`: crea un `<a>`, le setea `href`/`download`, y llama
  `.click()` — esto **no** se puede confirmar solo con `HttpTestingController`, hace falta espiar
  `window.URL.createObjectURL`/`revokeObjectURL` y `HTMLAnchorElement.prototype.click` (jsdom los
  implementa sin navegar de verdad, así que espiar alcanza). Es el único caso de los 12 archivos del
  tier que necesita algo de DOM además de HTTP — fácil de pasar por alto porque "es un service, no un
  componente".

## 10. Tier 5 (P2) — Directivas y componentes reutilizados

| ID | Archivo | Qué testear | Estado |
|---|---|---|---|
| UT-040 | `shared/directives/body-portal.directive.ts` | Central a [DEUDA § 1](./DEUDA_TECNICA.md): confirmar que efectivamente mueve el nodo al `body`. | ✅ [Hecho](../src/app/shared/directives/body-portal.directive.spec.ts) |
| UT-041 | `shared/directives/scroll-lock.directive.ts` | Wrapper delgado sobre `ScrollLockService` (ya tiene spec, Tier 0): confirmar que llama `lock()`/`unlock()` en el ciclo de vida correcto (`ngOnInit`/`ngOnDestroy`). | ✅ [Hecho](../src/app/shared/directives/scroll-lock.directive.spec.ts) |
| UT-042 | `shared/components/mini-calendar-picker/mini-calendar-picker.component.ts` | 6 in/out, selección de fecha (166 líneas). | ✅ [Hecho](../src/app/shared/components/mini-calendar-picker/mini-calendar-picker.component.spec.ts) |
| UT-043 | `shared/components/patient-form/patient-form.component.ts` | 14 in/out, formulario reutilizado en varios features (230 líneas). | ✅ [Hecho](../src/app/shared/components/patient-form/patient-form.component.spec.ts) |
| UT-044 | `shared/components/patient-wizard/patient-wizard.component.ts` | 15 in/out, el componente compartido con más inputs/outputs del repo (166 líneas). | ✅ [Hecho](../src/app/shared/components/patient-wizard/patient-wizard.component.spec.ts) |
| UT-045 | `layout/navbar/navbar.component.ts` | Navegación condicionada por rol/capacidad (133 líneas). | ✅ [Hecho](../src/app/layout/navbar/navbar.component.spec.ts) |
| UT-046 | `features/patients/components/patient-combobox/patient-combobox.component.ts` | 4 in/out, combo reutilizado (55 líneas). | ✅ [Hecho](../src/app/features/patients/components/patient-combobox/patient-combobox.component.spec.ts) |

### 10.1 Detalle técnico del Tier 5

Los 7 archivos se leyeron completos.

#### Gotcha compartido: `PatientFormComponent`/`PatientWizardComponent` necesitan un `FormGroup` real

Ambos declaran `@Input() form!: FormGroup` (obligatorio, sin default) y llaman métodos reales de
`AbstractControl` (`.get()`, `.valueChanges`, `.setValidators()`, `.patchValue()`,
`.updateValueAndValidity()`) — un mock plano no alcanza, hace falta un `FormGroup` de verdad armado
con `FormBuilder` (o `new FormGroup({...})` a mano) que tenga como mínimo los controles que el
componente lee: `fechaNacimiento`, `edad`, `esTitular`, `coberturaNombre`, `coberturaId`,
`nombreTitular`, `identificacionTitular`, `parentesco`, `otrosAntecedentes`. Como
`PatientWizardComponent` envuelve a `PatientFormComponent`, conviene armar este fixture una sola vez y
reusarlo entre los dos specs.

---

**UT-040 `shared/directives/body-portal.directive.ts`** — el más simple de testear del tier pese a ser
"central" a [DEUDA § 1](./DEUDA_TECNICA.md).

- `ngOnInit`: el nodo host termina con `parentNode === document.body`, no en su posición original del
  árbol de test.
- `ngOnDestroy`: al destruir el fixture, el nodo desaparece de `document.body`.
- Mismo cuidado que UT-012 (`NotificationService`, Tier 2): como escribe directo a
  `document.body`, hay que destruir el fixture entre tests o los nodos se acumulan.

**UT-041 `shared/directives/scroll-lock.directive.ts`** — dos aserciones, nada más.

- Mockear `ScrollLockService` (no usar la instancia real de UT-001) con `lock`/`unlock` como
  `vi.fn()`: crear el host → `lock` llamado una vez; destruirlo → `unlock` llamado una vez.

**UT-042 `shared/components/mini-calendar-picker/`** — sin servicios inyectados (solo `ElementRef`),
el componente más barato de levantar del tier.

- `generateCalendar` (privado, vía `ngOnChanges`/`toggleOpen`) rellena con celdas vacías antes del día
  1 y después del último, hasta completar múltiplos de 7 — probar un mes que empiece un día distinto
  de domingo y contar las celdas vacías iniciales esperadas.
- `isDateDisabled`: comparación de **strings** `'YYYY-MM-DD'` (funciona porque el orden lexicográfico
  coincide con el cronológico) — un valor **igual** a `minDate`/`maxDate` no debe quedar deshabilitado
  (el chequeo es estrictamente `<`/`>`).
- `computePosition`: usa `getBoundingClientRect()` y `window.innerWidth`, pero **jsdom no hace layout
  real** — `getBoundingClientRect()` devuelve todo en cero por defecto. No confiar en el layout de
  jsdom: stubear `getBoundingClientRect` con un rect concreto (y `window.innerWidth` con
  `vi.stubGlobal` o asignación directa) para poder probar el clamp del lado derecho de la pantalla,
  si no el test termina probando "jsdom devuelve cero", no la lógica del componente.
- `@HostListener('window:resize')`: cierra el dropdown sin condición — disparar un evento `resize`
  sobre `window` con `isOpen = true` y confirmar que pasa a `false`.
- `@HostListener('document:click')`: mismo patrón que `search-input.component.spec.ts` (Tier 0) —
  reusar esa forma de test.

**UT-043 `shared/components/patient-form/`** — el archivo con más lógica de negocio pura del tier.

- `loadCoberturaOptions` (en `ngOnInit`): el país viene de
  `authService.getCurrentUser()?.organizationPais || 'AR'` — probar con un usuario con país explícito
  y con un usuario `null`/sin ese campo (cae a `'AR'`). Mockear `CoberturasService.listar()` (Tier 4,
  UT-038).
- **El bloque de mayor densidad del archivo**: auto-cálculo de `edad` desde `fechaNacimiento`. Casos:
  fecha válida con cumpleaños **ya ocurrido** este año vs. **todavía no ocurrido** (la resta de años
  cambia en uno); fecha inválida (`isNaN`) → `edad` se limpia; fecha **futura** → se limpia; fecha que
  implica más de 150 años → se limpia (guarda contra un año tipeado mal, ej. `1899` en vez de `1999`);
  campo vaciado → se limpia. Los `setValue` usan `{ emitEvent: false }` a propósito — no armar el test
  esperando que dispare la suscripción de `edad` (no la tiene).
- Validadores condicionales de titular: matriz 2×2 de `esTitular` (`'si'`/`'no'`) ×
  `coberturaNombre` (`'Particular'`/otra) — solo la combinación `'no'` + no-Particular exige
  `nombreTitular`/`identificacionTitular`/`parentesco`. Ojo: `identificacionTitular` **nunca** pierde
  el `documentNumberValidator()` (Tier 3, UT-027), solo el `Validators.required` entra y sale — un
  caso debe confirmar que sigue rechazando un formato inválido aunque no sea obligatorio.
- Elegir `COBERTURA_PARTICULAR`: dispara un `patchValue` con `{ emitEvent: false }` que limpia 7
  campos y fuerza `esTitular` a `'si'` — como no emite evento, no dispara la suscripción de
  `esTitular` de arriba, pero el método llama `updateTitularValidators()` a mano inmediatamente
  después — confirmar que los validadores quedan bien de todos modos (el efecto neto es correcto
  aunque el camino para llegar no sea el "normal").
- `filteredCoberturaOptions`: siempre antepone `Particular` como sintético antes de filtrar — sin
  texto de búsqueda, `Particular` aparece primero, no intercalado alfabéticamente con el resto.
- `onCoberturaBlur`: `setTimeout` real de 150ms (no RxJS) — mismo patrón de timers falsos que
  `search-input.component.spec.ts` (Tier 0, `vi.useFakeTimers()` + `advanceTimersByTime(150)`).

**UT-044 `shared/components/patient-wizard/`** — envuelve a `PatientFormComponent`, agrega una máquina
de estados de navegación por pasos.

- **Antes de escribir este spec**, leer `patient-wizard.config.ts` (no se leyó para este plan): hacen
  falta los `id`, `appointmentOnly` y sobre todo los `requiredControls` reales de
  `PATIENT_WIZARD_STEPS` para armar casos concretos de `isStepValid`.
- `isStepValid`: un control **deshabilitado** cuenta como válido automáticamente, sin importar su
  estado real (`!control || control.disabled || control.valid`) — deshabilitar un control requerido y
  vacío, confirmar que el paso igual da válido.
- `goToStep`: hacia atrás solo si el destino ya fue visitado; hacia adelante recorre los pasos
  intermedios y se detiene en el **primero inválido**, no salta directo al destino pedido — probar
  saltar 3 pasos adelante con el paso 2 inválido y confirmar que termina en el 2, no en el pedido.
- `setCurrentStep`: al llegar al **último** paso abre el primer grupo de repaso automáticamente; en
  **cualquier** cambio de paso agenda `setTimeout(() => stepHeadingRef?.nativeElement.focus())` para
  accesibilidad — el `@ViewChild` solo se resuelve con una vista real inicializada, así que este spec
  necesita `render()` de Testing Library (no un `new PatientWizardComponent()` a mano) más timers
  falsos/`await` para observar el foco.
- `isStepDone`: exige visitado **y** no-es-el-paso-actual **y** válido — volver a un paso ya visitado
  (que pasa a ser "el actual" de nuevo) lo saca de "done" aunque siga en `visitedSteps`.

**UT-045 `layout/navbar/navbar.component.ts`** — 5 dependencias inyectadas: `Router`, `AuthService`,
`ClinicalAttentionService`, `NotificationService`, `ModuleRulesService`.

- Gotcha de mock: acá el `Router` necesita la propiedad **`url`** (para `isAtencionActive()`), no solo
  `navigate` como alcanzaba en UT-007 (Tier 1) — un mock copiado tal cual de esa sección rompe en
  silencio con `undefined.startsWith is not a function`.
- `ngOnInit`: si `moduleRulesService.getClinicalModules()` falla, solo hace `console.error` y
  `clinicalModules` queda `[]` — no explota, y la pestaña "Atención" simplemente no aparece (depende
  de esa lista).
- `menuItems`: la pestaña "Atención" es visible si el usuario tiene `VIEW` en **cualquiera** de los
  módulos clínicos ya cargados (chequeo compuesto dinámico, no una `Capability` fija) — probar con 2
  módulos clínicos donde el usuario solo tiene capacidad sobre el segundo.
- `onNavClick` de "Atención": con último turno atendido (`clinicalAttention.getLast()` no nulo) →
  navega directo a ese turno; sin ninguno → toast informativo **y** redirige a `/turnos` — las dos
  ramas, la segunda es fácil de olvidar si solo se prueba el camino feliz.
- `navItemTestId`: la rama de fallback (`'clinico'`) es **inalcanzable** con los datos reales de hoy
  (todo item tiene `route` o `requiresAppointment`) — no forzar un `NavItem` sintético solo para
  cubrirla, es dead code con los datos actuales.

**UT-046 `features/patients/components/patient-combobox/`** — el más simple del tier, sin ningún
servicio inyectado.

- **El caso de mayor valor**: `uniquePatients` de-duplica por nombre completo en minúsculas usando un
  `Map` — si dos pacientes **distintos** (`id` distinto) comparten el mismo nombre completo, el
  **segundo** del array de entrada gana y el primero desaparece en silencio. Es un riesgo real de
  pérdida de datos con nombres comunes, no un edge case de laboratorio — vale un test explícito con
  dos `Patient` de igual nombre y `id` distinto.
- `updateValue`: cada tecleo emite `valueChange` **y** `selectPatient(null)` — confirmar que escribir
  después de haber elegido a alguien limpia la selección previa.

## 11. Tier 6 (P3) — Componentes de feature grandes

| ID | Archivo | Qué testear | Estado |
|---|---|---|---|
| UT-047 | `features/appointments/components/appointment-dialog/` | [DEUDA § 4.1](./DEUDA_TECNICA.md) — bug **resuelto**: test de regresión sobre el pipeline de validación de disponibilidad (`setupHoraAvailabilityValidation`). | ✅ [Hecho](../src/app/features/appointments/components/appointment-dialog/appointment-dialog.component.spec.ts) |
| UT-048 | `features/appointments/components/appointments-panel/` | El archivo más grande del repo (693 líneas), 6 in/out. | ✅ [Hecho](../src/app/features/appointments/components/appointments-panel/appointments-panel.component.spec.ts) |
| UT-049 | `features/appointments/components/confirm-dialog/` | 12 in/out, modal de confirmación genérico (75 líneas). | ✅ [Hecho](../src/app/features/appointments/components/confirm-dialog/confirm-dialog.component.spec.ts) |
| UT-050 | `features/appointments/pages/turnos-view/` | 2do archivo más grande (504 líneas); [DEUDA § 3.3](./DEUDA_TECNICA.md) — 3 handlers de error muertos que nunca ejecutan. | ✅ [Hecho](../src/app/features/appointments/pages/turnos-view/turnos-view.component.spec.ts) |
| UT-051 | `features/auth/login/login.component.ts` | Componente de ruta más grande de `auth/` (363 líneas). | ✅ [Hecho](../src/app/features/auth/login/login.component.spec.ts) |
| UT-052 | `features/calendar/components/month-calendar/` | 14 in/out (227 líneas). | ✅ [Hecho](../src/app/features/calendar/components/month-calendar/month-calendar.component.spec.ts) |
| UT-053 | `features/coberturas/coberturas-view/` | 3er archivo más grande (574 líneas); el que más sitios de [DEUDA § 3.2](./DEUDA_TECNICA.md) concentra (11). | ✅ [Hecho](../src/app/features/coberturas/coberturas-view/coberturas-view.component.spec.ts) |
| UT-054 | `features/configuraciones/configuraciones-view/` | Origen del `zoom: 0.88` ([DEUDA § 1.4](./DEUDA_TECNICA.md)); sitio de duplicación en `:135` (§ 3.2). | ✅ [Hecho](../src/app/features/configuraciones/configuraciones-view/configuraciones-view.component.spec.ts) |
| UT-055 | `features/configuraciones/components/invitation-dialog/` | 2 in/out; 3 sitios de [DEUDA § 3.2](./DEUDA_TECNICA.md). | ✅ [Hecho](../src/app/features/configuraciones/components/invitation-dialog/invitation-dialog.component.spec.ts) |
| UT-056 | `features/configuraciones/components/profesionales-panel/` | [DEUDA § 4.2](./DEUDA_TECNICA.md) — bug **sin resolver** (`onSaveProfesional`, rama de error sin `markForCheck()`); documentar el comportamiento actual tal como lo hace el E2E `test.fail()` ("PRO-008"), no arreglarlo en este spec. | ✅ [Hecho](../src/app/features/configuraciones/components/profesionales-panel/profesionales-panel.component.spec.ts) — de paso se encontró y documentó un 2do bug nuevo, ver [DEUDA § 6](./DEUDA_TECNICA.md) |
| UT-057 | `features/configuraciones/components/profesional-dialog/` | 7 in/out (242 líneas). | ✅ [Hecho](../src/app/features/configuraciones/components/profesional-dialog/profesional-dialog.component.spec.ts) |
| UT-058 | `features/historia-clinica/components/historia-clinica-form/` | Formulario de historia clínica (195 líneas). | ✅ [Hecho](../src/app/features/historia-clinica/components/historia-clinica-form/historia-clinica-form.component.spec.ts) |
| UT-059 | `features/odontograma/components/odontograma-form/` | Lógica de formulario del odontograma (83 líneas). | ✅ [Hecho](../src/app/features/odontograma/components/odontograma-form/odontograma-form.component.spec.ts) |
| UT-060 | `features/odontograma/components/perio-tooth-sparkline/` | 18 in/out, 343 líneas de lógica de render tipo SVG. | ✅ [Hecho](../src/app/features/odontograma/components/perio-tooth-sparkline/perio-tooth-sparkline.component.spec.ts) |
| UT-061 | `features/odontograma/components/periodontograma-form/` | 331 líneas, formulario más grande de Odontograma. | ✅ [Hecho](../src/app/features/odontograma/components/periodontograma-form/periodontograma-form.component.spec.ts) |
| UT-062 | `features/odontograma/components/save-odontograma-dialog/` | Uno de los 6 modales sin `appBodyPortal` ([DEUDA § 1.1](./DEUDA_TECNICA.md)). | ✅ [Hecho](../src/app/features/odontograma/components/save-odontograma-dialog/save-odontograma-dialog.component.spec.ts) |
| UT-063 | `features/panel/panel-view/` | Dashboard (358 líneas). | ✅ [Hecho](../src/app/features/panel/panel-view/panel-view.component.spec.ts) |
| UT-064 | `features/seguimiento/components/appointment-list-overflow/` | 4 in/out (214 líneas). | ✅ [Hecho](../src/app/features/seguimiento/components/appointment-list-overflow/appointment-list-overflow.component.spec.ts) — se encontraron y documentaron 2 bugs nuevos, ver [DEUDA § 7](./DEUDA_TECNICA.md) |
| UT-065 | `features/seguimiento/components/patient-wizard-panel/` | Uno de los 6 modales sin `appBodyPortal` (DEUDA § 1.1); sitio de § 3.2 (`:185`, duplica solo al editar). | ✅ [Hecho](../src/app/features/seguimiento/components/patient-wizard-panel/patient-wizard-panel.component.spec.ts) |
| UT-066 | `features/seguimiento/components/turn-clinical-modal/` | 3 in/out (287 líneas); séptimo modal sin `appBodyPortal`, encontrado al escribir este plan — agregado a [DEUDA § 1.1](./DEUDA_TECNICA.md). | ✅ [Hecho](../src/app/features/seguimiento/components/turn-clinical-modal/turn-clinical-modal.component.spec.ts) |
| UT-067 | `features/seguimiento/components/turn-payment-modal/` | Uno de los 6 modales sin `appBodyPortal` (DEUDA § 1.1); 5 in/out (296 líneas). | ✅ [Hecho](../src/app/features/seguimiento/components/turn-payment-modal/turn-payment-modal.component.spec.ts) |
| UT-068 | `features/seguimiento/seguimiento-view/` | [DEUDA § 3.2](./DEUDA_TECNICA.md) (`:85`) + [§ 3.3](./DEUDA_TECNICA.md) (`:85`, handler muerto de `getPatients()`). | ✅ [Hecho](../src/app/features/seguimiento/seguimiento-view/seguimiento-view.component.spec.ts) |

### 11.1 Detalle técnico del Tier 6

Los 22 archivos se leyeron completos. Es el tier más grande y de menor prioridad (P3): el detalle acá
es más compacto que en los tiers anteriores a propósito — alcanza para no releer el código antes de
escribir cada spec, sin la exhaustividad de, por ejemplo, § 6.1. Un patrón que se repite en casi todo
el tier: varios componentes reimplementan el mismo trío start/editar → guardar → cancelar para 3-6
campos distintos (precio, observaciones, hora, profesional...) — en esos casos alcanza con **un** test
profundo del patrón y specs livianos para el resto de los campos, no repetir la profundidad N veces.

**UT-047 `appointment-dialog/`** — mockear `AppointmentsService` (`checkAvailability`) y
`ModuleRulesService` (`getClinicalModules`); `FormBuilder` real.

- **Regresión de [DEUDA § 4.1](./DEUDA_TECNICA.md)** (ya resuelta): `setupHoraAvailabilityValidation`
  — debounce 300ms sobre `hora`, solo llama `checkAvailability` con profesional+fecha+hora presentes;
  `normalizeTime` inválido pone `availabilityError` sin llamar al servicio.
- `selectPatient`: parsea `anamnesis` (JSON o string, con `try/catch`), deshabilita los 17
  `PATIENT_FIELDS`; `clearPatientSelection` los rehabilita y hace `form.reset(initialFormValue)` —
  ese snapshot se capturó **una sola vez** en `initForm()` con `getRawValue()` (incluye deshabilitados).
- `ngOnChanges` limpia el paciente seleccionado solo en la transición `open` `true → false`, no en
  cualquier cambio de `open`.
- `MAX_MONTO` = `99999999.99` (columna `numeric(10,2)`) — caso de límite para los 4 campos de monto.

**UT-048 `appointments-panel/`** — mockear `AppointmentsService`, `ConfigurationService`,
`NotificationService`, `Router`, `ModuleRulesService`.

- El archivo más grande del repo, pero mayormente el patrón start/guardar/cancelar repetido ×4
  (precio, observaciones, observaciones del turno, hora, profesional) — un test profundo de uno
  (sugerido: `hora`, por el formato HH:mm↔HH:mm:ss) alcanza para el resto.
- `getClinicalModuleRuta`/`getClinicalModuleCapability`: misma lógica, calcada, en
  `turn-clinical-modal` (UT-066) — reusar la forma del test entre ambos.
- `getAvatarColorClass`: hash determinístico por `patientId`/`patientIdentificacion` — testear que el
  mismo paciente da siempre el mismo color, no un color específico.
- `getProfesionalesForReassignSelect`: incluye al profesional actualmente asignado aunque ya no sea
  reasignable, solo para no perder la asignación existente — `isCurrentAssignedProfesional` lo marca
  como no seleccionable de nuevo.

**UT-049 `confirm-dialog/`** — sin servicios inyectados.

- `isDangerVariant`/`isPrimaryVariant`/`headerIcon` derivan del contenido de `confirmButtonClass`
  (string) — 3 variantes.
- Los 4 handlers de click son no-op mientras `isLoading` es `true` — buen test de guard único que
  cubre los 4.

**UT-050 `pages/turnos-view/`** — mockear los 5 servicios inyectados + `ChangeDetectorRef`.

- `ngOnInit` arma 4 suscripciones con manejo de error casi idéntico (404 silencioso, red silenciosa,
  el resto notifica) — testear una a fondo, las otras 3 livianas.
- `onCreateAppointment`: si el paciente no tiene `id`, primero lo crea (`skipGlobal`) y encadena a
  `createAppointment()`; valida la asignabilidad del profesional **antes** de crear. El `finalize()`
  de la rama de creación de paciente es intencionalmente un no-op (comentado en el código: no hay que
  resetear `isLoading` ahí, lo hace recién `createAppointment()`) — no escribir un test que espere
  `isLoading` en `false` justo después de crear el paciente y antes de crear el turno.
- `deleteCandidateSummary`: arma un resumen con paciente+profesional+hora, cada parte condicional —
  probar con datos parciales (sin profesional asignado, sin hora).

**UT-051 `auth/login/login.component.ts`** — mockear `AuthService`, `Router`, `NotificationService`.

- El constructor redirige a `/turnos` **de inmediato** si ya hay sesión — se dispara al construir el
  componente, no en `ngOnInit`.
- `emailNotVerified` se calcula buscando la palabra `"verificar"` (case-insensitive) **dentro del
  texto** del mensaje de error — es una heurística de string frágil: si el backend cambia la
  redacción del mensaje, esto se rompe en silencio sin que ningún tipo lo detecte. Testear con el
  mensaje real que hoy devuelve el backend, no uno inventado.
- `onRegister` valida del lado cliente usuario/email/password/nombre/documento/teléfono reusando
  directamente los patterns de `custom-validators.ts` (Tier 3, UT-027) — buena matriz de casos.
- `selectedOrgMode` (`'new'`/`'join'`) decide qué campos se borran del DTO antes de enviar
  (`organizacionNombre`/`pais` vs. `invitationToken`) — probar ambas ramas.

**UT-052 `calendar/components/month-calendar/`** — sin servicios inyectados.

- Mismo patrón de grilla rellena en múltiplos de 7 que UT-042 (Tier 5), más conteos por día
  (`total`/`pendientes`/`cancelados`) filtrando `appointments` por fecha exacta.
- `onSearchClear`/`onSearchChange` siempre emiten `type: 'both'`, a diferencia de `onSearchSelect` que
  usa el `type` real del resultado — asimetría a propósito, no un bug, pero hay que testear las dos
  formas por separado.
- `goToToday` recalcula `today` de nuevo para el `dateClick` en vez de reusar `this.currentDate` (el
  comentario del código lo pide así a propósito) — confirmar que usa la fecha recién calculada.

**UT-053 `coberturas/coberturas-view/`** — Signals + `inject()` en inicialización de campo (no en
constructor) para `AuthService`; funciona igual con `TestBed.createComponent`/`render()`.

- `localStorage` por organización (`coberturas.paisesActivos.<orgId>`): JSON corrupto → cae a
  `[paisOrganizacion]` en silencio (`try/catch`).
- **Test de mayor valor**: `toggleFavorito` hace update optimista + guarda de respuestas fuera de
  orden vía un contador de secuencia por cobertura (`favoritoSeq`) — togglear dos veces rápido y
  dejar que la respuesta de la **primera** request llegue después de la segunda; confirmar que no
  pisa el estado optimista más reciente.
- `guardarNota`/`guardarWeb`/`guardarTelefono` son el mismo patrón tres veces — uno a fondo alcanza.
- Validación de archivos (extensión + 20MB) duplicada literal entre cobertura e intermediario — mismo
  test, dos veces.
- `onEliminarDocumento(Intermediario)` usa `confirm()` nativo del navegador —
  `vi.spyOn(window, 'confirm').mockReturnValue(true/false)` para cubrir ambas ramas.

**UT-054 `configuraciones/configuraciones-view/`** — mockear `ConfigurationService`,
`NotificationService`, `ErrorHandlerService`.

- `whatsappCharCount` mide el mensaje **interpolado** (con los tokens ya reemplazados por datos de
  muestra), no el largo de la plantilla cruda con `{tokens}` literales — un template corto con tokens
  que expanden a texto largo puede superar el límite visualmente sin que `.length` de la plantilla lo
  sugiera.
- `insertWhatsappPlaceholder`: inserta en la posición del cursor si el `<textarea>` está disponible, o
  al final si no; trunca a `whatsappMaxLength` (1024) en ambos caminos.
- `saveWhatsappTemplate`: éxito pone `whatsappSaved = true` y un `setTimeout` real de 3000ms lo vuelve
  a `false` — timers falsos.

**UT-055 `configuraciones/components/invitation-dialog/`** — mockear `InvitationService`,
`NotificationService`, `ErrorHandlerService`.

- `generate()` exige al menos un módulo seleccionado antes de llamar al servicio.
- `copyToken` envuelve `navigator.clipboard.writeText` — jsdom no implementa el Clipboard API por
  defecto, hay que stubearlo (`Object.defineProperty(navigator, 'clipboard', ...)`) para cubrir tanto
  el toast de éxito como el mensaje de fallback del `catch`.
- `revoke`: actualiza el item localmente (`revokedAt`/`usable`) sin refetch completo tras el éxito.

**UT-056 `configuraciones/components/profesionales-panel/`** — acá vive el bug **sin resolver** de
[DEUDA § 4.2](./DEUDA_TECNICA.md).

- `canInvite`/`canManage`/`canDelete`: getters puros de capacidad, matriz simple contra el mock de
  `AuthService`.
- **El bug exacto, ya localizado**: la rama `error:` de `onSaveProfesional` (la que setea
  `isSavingProfesional = false` y `saveProfesionalError = message`) **no llama `cdr.markForCheck()`**
  — a diferencia de `ngOnInit`, que sí lo hace en su propia suscripción. Mismo criterio que el
  backend y que el E2E `test.fail()` ("PRO-008"): documentar el comportamiento actual, no arreglarlo
  acá. El test debe afirmar dos cosas por separado: (1) el estado interno del componente **sí** se
  actualiza correctamente (`isSavingProfesional`/`saveProfesionalError`); (2) sin un
  `fixture.detectChanges()`/`markForCheck()` manual extra, el DOM **no** refleja ese cambio — esa
  brecha entre 1 y 2 es el bug en sí.

**UT-057 `configuraciones/components/profesional-dialog/`** — `FormBuilder` real, mockear
`AuthService` (`hasCapability`, `hasRole`, `grantedModules`).

- `canGrant(code)`: `OWNER` siempre puede; el resto solo si `grantedModules()` incluye ese código
  ([PERMISOS.md § 6.4](./PERMISOS.md)).
- `applyPreset`: filtra los módulos del preset por `canGrant` — un no-OWNER que aplica el preset
  "Todos" con solo 2 de 7 módulos propios termina con esos 2, no con los 7.
- `isDerived`/`derived` delegan en `derivedModules()` de `capabilities.ts` (Tier 1, UT-009) — reusar
  las expectativas de ese spec, no re-derivar la regla acá.
- `passwordStrength()`: la condición de "mayúscula + dígito" está **combinada en una sola regla**, no
  son dos puntos independientes — una contraseña con mayúscula pero sin dígito puntúa igual que una
  sin ninguna de las dos.

**UT-058 `historia-clinica/components/historia-clinica-form/`** — mockear
`HistoriaClinicaStateService` (Tier 2, UT-018) y `AuthService`.

- `canEditPatientData` es un OR de **dos** capacidades (`TURNOS_MANAGE` o `SEGUIMIENTO_PACIENTES`),
  independiente del `editable` general del formulario — matriz 2×2.
- **Contrato deliberado de mayor valor**: `buildDelta()` usa `.value`, no `.getRawValue()` — los
  controles deshabilitados (sin `canEditPatientData`) quedan **fuera** del payload a propósito, para
  que el backend no los vea como "cambiados" y no exija el permiso extra solo para guardar el resto
  de la ficha. Testear que esas claves están **ausentes** del delta, no solo vacías.
- `firmarYGuardar` tiene guarda explícita de re-entrancia (doble click antes del re-render) —
  simularlo con dos llamadas sincrónicas seguidas.

**UT-059 `odontograma/components/odontograma-form/`** — mockear `OdontogramaStateService` (solo
`selectedTooth$`, `selectTooth`, `getIconsForTooth`).

- `selectTooth`: clickear el diente ya seleccionado llama `selectTooth(null)` (deselecciona), no
  vuelve a seleccionar el mismo — fácil de escribir al revés.
- Los 3 getters de íconos (`getMovilidadIconForTooth`/`getFurcaIconForTooth`/
  `getToothIconsExcludingMovilidad`) parten del mismo array — un diente con ícono de movilidad y
  otros íconos sueltos no debe duplicarse ni perderse entre los 3.

**UT-060 `odontograma/components/perio-tooth-sparkline/`** — **cero** servicios inyectados, el
componente más "puro" del plan entero: se puede instanciar con `new` y setear los `@Input()` como
propiedades planas, sin `TestBed`.

- `yPx`: las dos orientaciones (`zeroAtBottom`) invierten el mismo mapeo lineal — un valor en
  `Y_AXIS_MIN` y otro en `Y_AXIS_MAX` deben dar posiciones de píxel simétricamente invertidas entre
  ambos modos.
- `clampMm`: `NaN`/`Infinity` → `0`; fuera de `[-7, 12]` → clampa al borde.
- **Regla de mayor valor**: los conectores hacia dientes vecinos (`hasPrevConnectorPS`, etc., 6
  getters casi idénticos) solo se activan si **ambos lados** (el valor propio del borde y el del
  vecino) son distintos de cero — un cero de cualquiera de los dos lados suprime la línea de conexión.
- `nicPath`: genera un path SVG cerrado — en jsdom no hay render real, así que lo verificable es la
  cantidad de puntos y sus coordenadas, no una comparación visual/pixel — no forzar una aserción de
  "se ve bien", esa parte queda fuera del alcance de un test unitario.

**UT-061 `odontograma/components/periodontograma-form/`** — mockear `OdontogramaStateService`
(`getPerioTeethMap`, `perioTeeth$`, `updatePerioTooth`, `notifyPerioChange`).

- Los 4 getters de porcentaje (`bleedingPercent`, etc.) comparten la misma fórmula y el mismo guard de
  `totalSites === 0` — un test parametrizado cubre los 4 con un solo fixture.
- `onNumberInput`: clampa `mg` a `[-10, 12]` pero `probing` a `[0, 12]` — límites distintos, fácil de
  confundir por copy-paste; probar un valor negativo contra los dos campos.
- `onFocusClearIfZero`/`onBlurRestoreZero`/`onPerioTabPath`: manipulan el DOM directamente
  (`event.target`, `dataset`, `closest`/`querySelector`) por fuera del data-binding de Angular — solo
  se pueden testear disparando eventos DOM reales sobre un template renderizado
  (`@testing-library/angular`), no llamando los métodos con un evento fabricado a mano.

**UT-062 `odontograma/components/save-odontograma-dialog/`** — mockear `OdontogramaStateService`
(Tier 2, UT-015), `NotificationService`, `AuthService`, `Router`.

- El setter de `@Input() open` dispara `prefillFromAppointment()` solo en la transición
  `false → true` (`wasClosed`) — reabrir estando ya abierto no hace nada.
- `puedeCobrar` no solo oculta UI: cambia la **forma** del payload — con la capacidad, `pago` lleva
  los 4 montos; sin ella, solo `observacionesTurno`. Dos formas distintas, no la misma con campos en
  `undefined`.
- La validación de montos negativos solo corre `if (puedeCobrar)` — sin esa capacidad, esa validación
  específica nunca puede dispararse (el payload nunca lleva montos).
- Usa `toSignal(...)` sobre los observables del mock — el mock necesita `Observable`s reales
  (`of(...)`/`Subject`), no un `vi.fn()` devolviendo un valor plano.
- Uno de los 6 modales sin `appBodyPortal` de [DEUDA § 1.1](./DEUDA_TECNICA.md) — no es responsabilidad
  de este spec arreglarlo, queda para la auditoría UT-069.

**UT-063 `panel/panel-view/`** — el único componente del tier con `ChangeDetectionStrategy.OnPush`
explícito; usa `ng2-charts`. Mockear `DashboardService` (Tier 4, UT-032) y `Router`.

- `provideCharts(withDefaultRegisterables())` es un provider a nivel de componente — necesario solo
  si el test renderiza la directiva del gráfico; para tests de getters/cálculos puros no hace falta.
- `sortedProfessionalStats`/`sortBy`: clickear la misma columna dos veces invierte la dirección;
  clickear una columna distinta resetea a su propio `defaultDirection`.
- `pctChange`: `previous === 0` es un caso especial (`100` si `current > 0`, si no `null` — nunca
  `Infinity`/`NaN` de una división real por cero); ese `null` es lo que oculta el badge de comparación
  en `comparisonClass`.
- Los datos de los gráficos se reemplazan con objetos **nuevos** (spread) en cada emisión, no se
  mutan in-place — es lo correcto bajo `OnPush`; una regresión que empiece a mutar in-place rompería
  el render sin ningún error visible.

**UT-064 `seguimiento/components/appointment-list-overflow/`** — el componente más cargado de APIs de
navegador del plan. `NgZone` real (no mockear), `ChangeDetectorRef`/`ElementRef` normales, sin
servicios externos.

- `ResizeObserver` **no existe en jsdom**: stubear `global.ResizeObserver` a mano (constructor que
  guarda el callback) e invocar ese callback manualmente para simular un resize — jsdom no puede
  producir uno real.
- `onResize` difiere a un `setTimeout` a propósito (evitar `NG0103` por reentrancia) — timers falsos
  para observar el cambio de `isOverflowing`.
- El setter de `@ViewChild('actionsMenu')` **cuelga el dropdown de `document.body`** como efecto
  secundario de que Angular resuelva la vista — mismo cuidado de limpieza entre tests que UT-040
  (`BodyPortalDirective`) y UT-012 (`NotificationService`).
- Los listeners de scroll/resize/Escape se registran fuera de la zona (`runOutsideAngular`) — probar
  disparando eventos DOM reales y confirmando que `openActionsAppointment` vuelve a `null`.

**UT-065 `seguimiento/components/patient-wizard-panel/`** — mockear `PatientService` (Tier 4,
UT-028), `NotificationService`, `ErrorHandlerService`; `FormBuilder` real.

- Mismo parseo de `anamnesis` (JSON o string, con `try/catch`) que `appointment-dialog` (UT-047) —
  reusar el mismo fixture de datos entre ambos specs.
- `close()` también limpia la selección (`onClearPatientForm`), no solo `isOpen` — confirmar ambas
  cosas, no solo la bandera de visibilidad.
- Uno de los 6 modales sin `appBodyPortal` de DEUDA § 1.1 (para UT-069).

**UT-066 `seguimiento/components/turn-clinical-modal/`** — mockear `OdontogramaService` (Tier 4,
UT-036), `PeriodontogramaService` (UT-037), `ModuleRulesService` (UT-035), `Router`.

- **Contrato de mayor valor**: la carga se dispara por `open`, no por el setter de `appointment` (el
  comentario del código explica por qué: comparte `selectedAppointment` con el modal de pagos). Setear
  solo `appointment` sin `open = true` no debe disparar ningún HTTP; y repetir `open = true` con el
  mismo `appointment.id` tampoco (`loadedAppointmentId` lo evita).
- `guarded()`: 404 en un lado del `forkJoin` (odontograma o periodontograma) es un vacío legítimo; un
  error real en el otro lado sí marca `loadError = true` — probar la combinación mixta.
- Este archivo **sí** llama `cdr.markForCheck()` después de la carga async — buen candidato de
  regresión "lo hace bien", en contraste directo con el bug de UT-056.

**UT-067 `seguimiento/components/turn-payment-modal/`** — mockear `AppointmentsService` (Tier 4,
UT-030), `ConfigurationService` (UT-031).

- El setter de `@Input() appointment` resetea **9** piezas de estado de edición cada vez que llega un
  turno — **sin** comparar si es el mismo turno de antes (a diferencia de `turn-clinical-modal`, que
  sí trackea `loadedAppointmentId`) — una edición en curso se pierde en silencio si el padre
  reemite el mismo turno. Vale un test que lo deje documentado.
- `isFullPaymentChecked`: tolerancia de centavos (`< 0.01`), no igualdad exacta — probar un valor a
  un centavo de diferencia (no debe contar como "pago completo") y uno dentro de la tolerancia.
- Mismo patrón start/cancelar/guardar ×5 (3 precios + 2 observaciones) — uno a fondo alcanza.

**UT-068 `seguimiento/seguimiento-view/`** — `PatientDataService` es **provider de componente**
(Tier 2, UT-017): mockearlo vía `providers` a nivel del propio test de este componente, no a nivel de
módulo compartido.

- `ngOnInit` encadena `combineLatest([resumen, pacientes])` → `loadYear` → `updatePatientGroups` — una
  suscripción anidada dentro de otra; probar que el camino feliz completo termina llamando
  `updatePatientGroups` una sola vez.
- Muta `document.documentElement.classList` directamente en `ngOnInit`/`ngOnDestroy` — efecto
  colateral global fuera de Angular; verificar antes/después de crear y destruir el fixture, con la
  misma limpieza entre tests que el resto de los archivos que tocan `document` en este tier.
- `onYearFilterChange`: mismo patrón de secuencia por-id que `toggleFavorito` en `coberturas-view`
  (UT-053) — acá la clave es el `identificacion` del paciente, así que una respuesta vieja del
  paciente A no debe pisar una más nueva del paciente B (contadores independientes).
- `editPatientFromGroup`/`openNewPatientWizard` dependen de un `@ViewChild(PatientWizardPanelComponent)`
  — mismo requisito de render real (`@testing-library/angular`) que `PatientWizardComponent` (Tier 5,
  UT-044).

## 12. Tier 7 — Auditorías transversales

No son specs de un archivo: recorren el repo buscando un patrón de bug ya confirmado.

| ID | Qué | Por qué | Estado |
|---|---|---|---|
| UT-069 | Test que recorra los templates y falle si un elemento con `appScrollLock` no lleva también `appBodyPortal` | Sugerencia de [DEUDA § 1.2](./DEUDA_TECNICA.md); cubriría de una los **7** casos de § 1.1 (UT-047, UT-049, UT-053, UT-062, UT-065, UT-066, UT-067) sin escribirlos uno por uno, y evita una 8va instancia futura. | ✅ [Hecho](../src/app/shared/directives/modal-contract.audit.spec.ts) — adelantada a la Fase 1.5, ver § 17.2 |
| UT-070 | Auditoría de componentes `ChangeDetectionStrategy.OnPush` con `.subscribe()` que muta un campo sin `markForCheck()` cerca | Forma sistemática de encontrar una 3ra instancia del bug de [DEUDA § 4.1/4.2](./DEUDA_TECNICA.md) antes de que aparezca en producción, en vez de encontrarlas una por una escribiendo E2E nuevos (como pasó con las dos instancias conocidas). | ✅ [Hecho](../src/app/features/configuraciones/configuraciones-view/configuraciones-view.component.spec.ts) (semi-manual) — encontró y confirmó una 3ra instancia real, ver [DEUDA § 4.3](./DEUDA_TECNICA.md) |

### 12.1 Detalle técnico del Tier 7

**UT-069 — auditoría del contrato de modal (`appScrollLock` + `appBodyPortal`)**

Al diseñar esta auditoría (para poder escribirla, no solo para completar la fila) se hizo el
relevamiento real contra los 22 templates de componentes que podían ser modales, y salieron dos
hallazgos que cambian cómo hay que implementarla — ya volcados en
[DEUDA_TECNICA.md § 1.1](./DEUDA_TECNICA.md):

- **No son 6 casos, son 7**: `turn-clinical-modal` (UT-066) tampoco lleva `appBodyPortal` y no estaba
  en el relevamiento original de DEUDA. Se encontró grepeando `appScrollLock` en todos los templates y
  comparando contra `appBodyPortal` en el mismo archivo — ese método es justamente la implementación
  que debería tener este test.
- **No todos usan las clases `.modal`/`.modal-backdrop` literales**: `confirm-dialog` (UT-049) usa
  nombres propios (`.confirm-modal-backdrop`, `.confirm-modal`). Un test que busque por **nombre de
  clase CSS** (la redacción original de DEUDA § 1.2) se pierde ese caso. La auditoría tiene que buscar
  por **la directiva**, no por la clase: cualquier template que use `appScrollLock` en algún elemento
  debe usar `appBodyPortal` en ese mismo archivo (no necesariamente el mismo elemento — en los que sí
  cumplen, a veces está en el nodo raíz del modal y a veces en el backdrop; alcanza con que ambas
  directivas aparezcan en el template).

**Implementación sugerida**: no es un test de Vitest sobre código en ejecución, es un chequeo estático
sobre archivos de texto (`.html`). Un `it()` que:
1. Liste todos los `*.component.html` bajo `src/app/` (Node `fs`/`glob`, no Angular/TestBed).
2. Para cada uno que contenga la palabra `appScrollLock`, confirme que también contiene
   `appBodyPortal`.
3. Falle listando los archivos que no cumplen (hoy: los 7 de § 1.1 de DEUDA — este test **debe fallar
   hoy** hasta que se corrija DEUDA § 1.1, o escribirse con una lista de excepciones conocidas que se
   va vaciando a medida que se arreglan, igual que un `test.fail()` documentando un bug conocido).
2 (alternativa). Si se prefiere que el test pase desde el día uno, invertirlo: afirmar que la lista de
   archivos sin `appBodyPortal` es **exactamente** la lista de 7 ya conocida — así el test pasa hoy pero
   falla en cuanto aparezca un 8vo caso nuevo, que es el objetivo real de la auditoría (prevenir, no
   exigir arreglar ya).

**UT-070 — auditoría de `OnPush`/zoneless + `.subscribe()` sin `markForCheck()`**

Con las 22 lecturas del Tier 6 más las de tiers anteriores, el panorama real es más matizado de lo que
sugiere el nombre "auditoría de `OnPush`": la app es zoneless (`provideZonelessChangeDetection()`), así
que el riesgo no se limita a los componentes con `ChangeDetectionStrategy.OnPush` **explícito** — en
zoneless, ningún componente recibe detección automática al resolver una promesa/observable, tenga o no
`OnPush` declarado. De los 22 componentes de Tier 6, **solo uno** (`panel-view`, UT-063) declara
`OnPush` explícitamente, pero prácticamente todos los demás llaman `cdr.markForCheck()`/
`cdr.detectChanges()` a mano en sus `.subscribe()` de todos modos — lo cual confirma que el equipo ya
trata a **todo** el árbol como si fuera `OnPush` en la práctica, aunque no lo declaren.

- **Redefinir el criterio de búsqueda**: no buscar `ChangeDetectionStrategy.OnPush` en el `@Component`
  (daría un solo resultado, `panel-view`, y ningún falso positivo real) — buscar, en cada componente,
  `.subscribe(` sin un `markForCheck()`/`detectChanges()` en el mismo callback o cerca. Este es
  exactamente el patrón que ya se ve bien resuelto en la mayoría de los archivos leídos (`turnos-view`,
  `profesionales-panel` en su `ngOnInit`, `turn-clinical-modal`, etc.) y mal resuelto en
  `profesionales-panel.onSaveProfesional` (UT-056, el caso ya confirmado de DEUDA § 4.2).
- Candidatos concretos ya identificados en las lecturas de este plan que convendría mirar primero (no
  confirmados como bugs, solo como puntos de partida para la auditoría, ya que no se leyeron los
  templates completos de todos):
  - `turn-payment-modal` (UT-067): varios `.subscribe()` de guardado (precio, observaciones) no
    llaman `markForCheck()` en su callback — a diferencia de sus pares en `appointments-panel`
    (UT-048), que tampoco lo hacen explícitamente pero delegan en el `async pipe`/estado compartido
    del padre (no confirmado sin leer el template; anotar como pendiente de revisar).
  - `save-odontograma-dialog` (UT-062): `handleSubmit()` no llama `markForCheck()` tras el `next`/
    `error` del guardado — mismo patrón de riesgo que UT-056, sin confirmar si el template depende de
    otro disparador (como pasa en UT-056 con el refetch de la lista).
- Como script de auditoría real (no solo grep) esto es más difícil de automatizar bien que UT-069: un
  grep de `.subscribe(` sin `markForCheck` cerca da muchos falsos positivos (subscripciones a
  observables que solo llaman a otro método, que sí llama `markForCheck` un nivel más abajo). Es
  razonable que esta auditoría termine siendo semi-manual: una lista de componentes a revisar a mano
  (empezando por los dos candidatos de arriba) en vez de un test 100% automático como UT-069.

## 13. Fuera de alcance

Wrappers delgados sin lógica propia, hoy bien cubiertos por el flujo E2E que los ejercita (§ 2). No
se planifica spec dedicado — revisar solo si ganan lógica propia o si el E2E que los cubre se retira.

| ID | Archivo | Por qué fuera de alcance |
|---|---|---|
| UT-071 | `features/auth/reset-password/` | 67 líneas; flujo cubierto por `recuperacion-password.spec.ts` (E2E). |
| UT-072 | `features/auth/verify-email/` | 71 líneas; cubierto por el E2E de `auth/`. |
| UT-073 | `features/errors/forbidden/` | 34 líneas, sin lógica. |
| UT-074 | `features/historia-clinica/components/historia-clinica-view/` | 66 líneas, display delgado; cubierto por E2E de `historia-clinica/`. |
| UT-075 | `features/odontograma/components/odonto-icon/` | 41 líneas, presentacional. |
| UT-076 | `features/odontograma/components/odontograma-actions/` | 55 líneas, botones que solo emiten outputs. |
| UT-077 | `features/odontograma/components/odontograma-comment/` | 74 líneas, presentacional. |
| UT-078 | `features/odontograma/components/odontograma-leyend/` | 110 líneas, leyenda estática. |
| UT-079 | `features/odontograma/components/odontograma-view/` | 84 líneas, orquestador de composición; cubierto por E2E de `odontograma/`. |
| UT-080 | `features/odontograma/components/tooth-faces/` | 83 líneas, render SVG presentacional. |
| UT-081 | `core/services/api.config.ts` | Objeto de configuración, sin lógica más allá de un `if`/`else` ya indirectamente cubierto por cualquier spec que use `API_CONFIG`. |

## 14. Vista por área funcional (para decidir por dónde empezar)

Los tiers de § 6-13 agrupan por costo/patrón de test. Esta vista re-agrupa los mismos 81 archivos por
**área funcional** — los 7 módulos del sistema de permisos (`PANEL`, `TURNOS`, `ODONTOGRAMA`,
`HISTORIA_CLINICA_FREE`, `SEGUIMIENTO`, `COBERTURA`, `CONFIGURACIONES`, ver
[PERMISOS.md](./PERMISOS.md)) más las áreas que no son un módulo formal (`Autenticación`, `Pacientes`,
y cuatro buckets transversales de infraestructura) — para decidir *por qué área* conviene empezar, no
solo por qué tipo de archivo.

### 14.1 Resumen por área (ordenado por la criticidad más alta que contiene)

| Área | P0 | P1 | P2 | P3 | Fuera | Pendiente | Ya hecho |
|---|---:|---:|---:|---:|---:|---:|---:|
| **Seguridad y Permisos** | 7 | 0 | 1 | 0 | 1 | 8 | 0 |
| **Odontograma** | 0 | 5 | 2 | 4 | 6 | 11 | 0 |
| **Utils transversales** | 0 | 4 | 0 | 0 | 0 | 4 | 0 |
| **Historia Clínica** | 0 | 2 | 1 | 1 | 1 | 4 | 0 |
| **Seguimiento** | 0 | 2 | 0 | 5 | 0 | 7 | 0 |
| **Notificaciones / HTTP** | 0 | 2 | 0 | 0 | 0 | 2 | 0 |
| **Compartidos / UI** | 0 | 2 | 4 | 0 | 0 | 6 | 2 |
| **Turnos** | 0 | 1 | 1 | 5 | 0 | 7 | 0 |
| **Atención clínica (transversal)** | 0 | 1 | 0 | 0 | 0 | 1 | 0 |
| **Pacientes** | 0 | 0 | 4 | 0 | 0 | 4 | 0 |
| **Configuraciones** | 0 | 0 | 3 | 4 | 0 | 7 | 0 |
| **Cobertura** | 0 | 0 | 2 | 1 | 0 | 3 | 0 |
| **Panel** | 0 | 0 | 1 | 1 | 0 | 2 | 0 |
| **Autenticación** | 0 | 0 | 0 | 1 | 2 | 1 | 1 |
| **Infraestructura** | 0 | 0 | 0 | 0 | 1 | 0 | 0 |
| **Total** | **7** | **19** | **19** | **22** | **11** | **67** | **3** |

**Lectura:** Seguridad y Permisos es la única área con P0 — es el punto de partida obvio (§ 14.2,
primer bloque). Después, Odontograma concentra el mayor volumen de P1 (5) *y* es el área más grande
del repo en total (11 pendientes) — segundo candidato natural. El resto de las áreas no tiene P0/P1
más allá de lo ya listado, así que el orden entre ellas importa menos: se pueden tomar en el orden que
convenga al roadmap de producto.

### 14.2 Detalle: todas las filas pendientes, agrupadas por área y ordenadas por criticidad dentro de cada una

| Área | Crit. | ID | Archivo | Motivo |
|---|---|---|---|---|
| Seguridad y Permisos | P0 | UT-004 | `core/interceptors/http-error.interceptor.ts` | Bug documentado, DEUDA § 3.1 |
| Seguridad y Permisos | P0 | UT-005 | `core/interceptors/http-context.ts` | Base del bug de UT-004 |
| Seguridad y Permisos | P0 | UT-006 | `core/interceptors/auth.interceptor.ts` | Token en cada request |
| Seguridad y Permisos | P0 | UT-007 | `core/guards/auth.guard.ts` | Puerta de entrada a rutas protegidas |
| Seguridad y Permisos | P0 | UT-008 | `shared/directives/can.directive.ts` | Gating de permisos en toda la UI |
| Seguridad y Permisos | P0 | UT-009 | `core/auth/capabilities.ts` | Espejo del `CapabilityCatalog.java` del backend |
| Seguridad y Permisos | P0 | UT-010 | `core/auth/home-route.ts` | Resolución de ruta según rol |
| Seguridad y Permisos | P2 | UT-035 | `core/services/module-rules.service.ts` | Reglas de módulos que consume el frontend |
| Odontograma | P1 | UT-014 | `features/odontograma/services/odonto-state.service.ts` | Servicio de estado más grande del repo |
| Odontograma | P1 | UT-015 | `features/odontograma/services/odontograma-state.service.ts` | Estado agregado |
| Odontograma | P1 | UT-016 | `features/odontograma/services/perio-state.service.ts` | Estado del periodontograma |
| Odontograma | P1 | UT-024 | `features/odontograma/services/odonto-delta.util.ts` | Lógica de diff |
| Odontograma | P1 | UT-025 | `features/odontograma/services/perio-delta.util.ts` | Diff de periodontograma |
| Odontograma | P2 | UT-036 | `core/services/odontograma.service.ts` | Wrapper HTTP |
| Odontograma | P2 | UT-037 | `core/services/periodontograma.service.ts` | Wrapper HTTP |
| Odontograma | P3 | UT-059 | `features/odontograma/components/odontograma-form/` | Formulario |
| Odontograma | P3 | UT-060 | `features/odontograma/components/perio-tooth-sparkline/` | 343 líneas, render SVG |
| Odontograma | P3 | UT-061 | `features/odontograma/components/periodontograma-form/` | 331 líneas |
| Odontograma | P3 | UT-062 | `features/odontograma/components/save-odontograma-dialog/` | Modal sin `appBodyPortal`, DEUDA § 1.1 |
| Utils transversales | P1 | UT-019 | `core/utils/date.utils.ts` | Formateo timezone-safe |
| Utils transversales | P1 | UT-020 | `core/utils/currency.util.ts` | Formateo de moneda |
| Utils transversales | P1 | UT-021 | `core/utils/full-name.util.ts` | Ya ejercitado indirecto, spec directo barato |
| Utils transversales | P1 | UT-027 | `shared/validators/custom-validators.ts` | Validadores de formulario (DNI, teléfono) |
| Historia Clínica | P1 | UT-018 | `features/historia-clinica/services/historia-clinica-state.service.ts` | Estado de borrador/firma |
| Historia Clínica | P1 | UT-022 | `core/utils/anamnesis.util.ts` | Lógica de anamnesis |
| Historia Clínica | P2 | UT-033 | `core/services/historia-clinica.service.ts` | Wrapper HTTP |
| Historia Clínica | P3 | UT-058 | `features/historia-clinica/components/historia-clinica-form/` | Formulario (195 líneas) |
| Seguimiento | P1 | UT-017 | `features/seguimiento/seguimiento-view/patient-data.service.ts` | Cache de datos de paciente |
| Seguimiento | P1 | UT-026 | `features/seguimiento/utils/seguimiento-display.util.ts` | Formateo de vista |
| Seguimiento | P3 | UT-064 | `features/seguimiento/components/appointment-list-overflow/` | 214 líneas |
| Seguimiento | P3 | UT-065 | `features/seguimiento/components/patient-wizard-panel/` | Modal sin `appBodyPortal`, DEUDA § 1.1 |
| Seguimiento | P3 | UT-066 | `features/seguimiento/components/turn-clinical-modal/` | Modal sin `appBodyPortal` (7mo caso, DEUDA § 1.1) |
| Seguimiento | P3 | UT-067 | `features/seguimiento/components/turn-payment-modal/` | Modal sin `appBodyPortal`, DEUDA § 1.1 |
| Seguimiento | P3 | UT-068 | `features/seguimiento/seguimiento-view/` | DEUDA § 3.2 y § 3.3 |
| Notificaciones / HTTP | P1 | UT-011 | `core/services/error-handler.service.ts` | Central a la duplicación de toasts, DEUDA § 3 |
| Notificaciones / HTTP | P1 | UT-012 | `core/services/notification.service.ts` | Motor de toasts (275 líneas) |
| Compartidos / UI | P1 | UT-069 | Auditoría: contrato de modal | Cubre de una los 6 casos de DEUDA § 1.1 |
| Compartidos / UI | P1 | UT-070 | Auditoría: `OnPush` + `subscribe` sin `markForCheck` | Previene una 3ra instancia de DEUDA § 4 |
| Compartidos / UI | P2 | UT-040 | `shared/directives/body-portal.directive.ts` | Central a DEUDA § 1 |
| Compartidos / UI | P2 | UT-041 | `shared/directives/scroll-lock.directive.ts` | Wrapper sobre servicio ya testeado |
| Compartidos / UI | P2 | UT-042 | `shared/components/mini-calendar-picker/` | 166 líneas |
| Compartidos / UI | P2 | UT-045 | `layout/navbar/navbar.component.ts` | Navegación condicionada por rol |
| Turnos | P1 | UT-023 | `core/utils/profesional-assignability.util.ts` | Reglas de asignabilidad |
| Turnos | P2 | UT-030 | `core/services/appointments.service.ts` | Servicio HTTP más grande (290 líneas) |
| Turnos | P3 | UT-047 | `features/appointments/components/appointment-dialog/` | Regresión del bug resuelto, DEUDA § 4.1 |
| Turnos | P3 | UT-048 | `features/appointments/components/appointments-panel/` | Archivo más grande del repo (693 líneas) |
| Turnos | P3 | UT-049 | `features/appointments/components/confirm-dialog/` | 75 líneas |
| Turnos | P3 | UT-050 | `features/appointments/pages/turnos-view/` | DEUDA § 3.3, handlers muertos |
| Turnos | P3 | UT-052 | `features/calendar/components/month-calendar/` | 227 líneas |
| Atención clínica (transversal) | P1 | UT-013 | `core/services/clinical-attention.service.ts` | Sin detallar — leer antes de escribir el spec |
| Pacientes | P2 | UT-028 | `core/services/patient.service.ts` | DEUDA § 3.2, duplica toast |
| Pacientes | P2 | UT-043 | `shared/components/patient-form/` | 230 líneas, 14 in/out |
| Pacientes | P2 | UT-044 | `shared/components/patient-wizard/` | 166 líneas, 15 in/out |
| Pacientes | P2 | UT-046 | `features/patients/components/patient-combobox/` | 55 líneas |
| Configuraciones | P2 | UT-029 | `core/services/profesional.service.ts` | DEUDA § 3.2 |
| Configuraciones | P2 | UT-031 | `core/services/configuration.service.ts` | CRUD de configuración |
| Configuraciones | P2 | UT-034 | `core/services/invitation.service.ts` | Wrapper HTTP |
| Configuraciones | P3 | UT-054 | `features/configuraciones/configuraciones-view/` | Origen del `zoom: 0.88`, DEUDA § 1.4 |
| Configuraciones | P3 | UT-055 | `features/configuraciones/components/invitation-dialog/` | DEUDA § 3.2 (3 sitios) |
| Configuraciones | P3 | UT-056 | `features/configuraciones/components/profesionales-panel/` | Bug **sin resolver**, DEUDA § 4.2 |
| Configuraciones | P3 | UT-057 | `features/configuraciones/components/profesional-dialog/` | 242 líneas |
| Cobertura | P2 | UT-038 | `features/coberturas/coberturas.service.ts` | CRUD de coberturas |
| Cobertura | P2 | UT-039 | `features/coberturas/intermediarios.service.ts` | CRUD de intermediarios |
| Cobertura | P3 | UT-053 | `features/coberturas/coberturas-view/` | El que más sitios de DEUDA § 3.2 concentra (11) |
| Panel | P2 | UT-032 | `core/services/dashboard.service.ts` | Agregaciones del dashboard |
| Panel | P3 | UT-063 | `features/panel/panel-view/` | 358 líneas |
| Autenticación | P3 | UT-051 | `features/auth/login/login.component.ts` | 363 líneas |

**Ya hecho** (excluidos de la tabla de arriba): `core/services/scroll-lock.service.ts` (UT-001,
Compartidos/UI), `core/services/auth.service.ts` (UT-002, Autenticación),
`shared/components/search-input/` (UT-003, Compartidos/UI). **Fuera de alcance** (11 archivos, § 13):
no aparecen acá — ver § 13 si el criterio para excluirlos deja de aplicar.

## 15. Historial

- **2026-08-07** — Creación de este documento. Inventario completo del repo (agente de exploración):
  81 archivos clasificados en 7 tiers + fuera de alcance, cruzados contra los ~60 specs E2E de
  `frontend-proyecto-tests` (para no duplicar cobertura) y contra los hallazgos de
  [DEUDA_TECNICA.md](./DEUDA_TECNICA.md) (para priorizar fragilidad ya confirmada por sobre
  conjetura). Decisión explícita del desarrollador: esta ronda entrega **solo el documento** de
  planificación, sin escribir specs nuevos — la implementación queda para rondas futuras, empezando
  por el Tier 1.
- **2026-08-07 (misma fecha, ronda 2)** — Se agregó § 14 (vista por área funcional) y § 6.1 (detalle
  técnico del Tier 1: mocks/providers necesarios, gotchas y casos borde por archivo, para los 7
  archivos de Seguridad y Permisos). Los 7 archivos se leyeron completos para escribir § 6.1; el resto
  del plan (Tiers 2-7) sigue sin ese nivel de detalle — se profundiza tier por tier a medida que se
  empieza a implementar cada uno, no todo de una vez.
- **2026-08-07 (misma fecha, ronda 3)** — Se agregó § 7.1 (detalle técnico del Tier 2: los 8 servicios
  de estado). Los 8 archivos se leyeron completos. Hallazgo notable: `patient-data.service.ts`
  (UT-017) protege directamente un bug de la clase que señala [DEUDA § 4.3](./DEUDA_TECNICA.md)
  (`NG0103` por devolver arrays nuevos en getters usados desde `*ngFor` bajo change detection
  zoneless) — es el único archivo de este tier con ese tipo de contrato, y quedó marcado como el test
  de mayor valor de los 8. También se detectó que `OdontogramaStateService` (UT-015) y
  `HistoriaClinicaStateService` (UT-018) duplican casi textual el mismo patrón de "marcar EN_CURSO al
  abrir un turno pendiente/confirmado" — no se propone unificarlos (fuera de alcance de este plan),
  pero se documentó para que ambos specs se escriban con la misma forma.
- **2026-08-07 (misma fecha, ronda 4)** — Se completó el detalle técnico de **todos** los tiers
  restantes: § 8.1 (Tier 3, 9 utils/validators — resolvió el ciclo exacto de `nextFaceState` que
  UT-014 había dejado pendiente), § 9.1 (Tier 4, 12 servicios HTTP — documentó el gotcha compartido de
  3 servicios que disparan HTTP desde el constructor), § 10.1 (Tier 5, 7 compartidos — fijó el mock de
  `FormGroup` real que necesitan `PatientFormComponent`/`PatientWizardComponent`), § 11.1 (Tier 6, los
  22 componentes grandes) y § 12.1 (Tier 7, las 2 auditorías). Los ~60 archivos restantes se leyeron
  completos.
  - **Hallazgo de mayor impacto de la ronda**: al diseñar la auditoría UT-069 se relevó
    `appScrollLock`/`appBodyPortal` contra los 22 templates de Tier 6 y aparecieron **dos correcciones
    a [DEUDA_TECNICA.md § 1.1](./DEUDA_TECNICA.md)**, ya aplicadas ahí: (1) `turn-clinical-modal` es un
    **séptimo** modal sin `appBodyPortal` que el relevamiento original no había listado; (2)
    `confirm-dialog` usa clases CSS propias (`.confirm-modal-backdrop`), no las literales
    `.modal-backdrop` que sugería la redacción original de DEUDA § 1.2 — la auditoría UT-069 tiene que
    buscar por la **directiva**, no por el nombre de clase, o se pierde ese caso igual que se perdió
    `turn-clinical-modal` a ojo.
  - Con esto, los 81 archivos del plan tienen detalle técnico completo — no queda ningún tier sin
    profundizar.
- **2026-08-08** — Implementación efectiva de las Fases 1 a 5 del § 17.2 (47 archivos: Tier 0-5
  completos más UT-069). 406 tests en verde, gate de cobertura en 79.13% de branches (piso 75%). Un
  hallazgo de esta ronda quedó documentado aparte, no arreglado en el código de producción (regla
  del proyecto: los specs fijan el comportamiento actual, no lo corrigen a ciegas):
  - Un bug real en `hasPerioData()` (`perio-delta.util.ts`): comparar un diente contra un baseline
    parcial hace que los campos booleanos falten y se comparen como `0` en vez de `false`, así que todo
    diente sin baseline previo entra igual al delta de guardado — ver
    [DEUDA_TECNICA.md § 5](./DEUDA_TECNICA.md).
  - Gotcha nuevo documentado para Tier 6 en adelante: cualquier componente cuyo template use
    `routerLink`/`routerLinkActive` (como `navbar.component.ts`, UT-045) necesita un `Router` real vía
    `provideRouter([])` — un mock plano (`useValue`) rompe esas directivas porque leen
    `router.routerState`/`router.events` internamente. Para controlar `router.url` en el test, se
    sobreescribe con `Object.defineProperty(router, 'url', { get: () => ..., configurable: true })`
    sobre la instancia real después de injectarla con `TestBed.inject(Router)`; `router.navigate` se
    reemplaza con `vi.spyOn(...).mockResolvedValue(true)` para no requerir rutas reales configuradas.
- **2026-08-08 (misma fecha, ronda 2)** — Implementación de las Fases 6a y 6b (11 archivos: Turnos,
  Auth, Calendar, Coberturas y Configuraciones). 643 tests en verde, gate de cobertura en 78.15% de
  branches (piso 75%). Un hallazgo nuevo, sin arreglar en producción (mismo criterio de siempre):
  - **Bug nuevo** en `ProfesionalesPanelComponent.onSaveProfesional()`: el toast de éxito dice
    "Profesional creado correctamente." **incluso al actualizar uno existente**, porque
    `closeAddProfesional()` (que limpia `editingProfesional`) se llama **antes** de que el `? :` del
    mensaje lea esa misma propiedad — ver [DEUDA_TECNICA.md § 6](./DEUDA_TECNICA.md). Se encontró
    escribiendo UT-056, al mismo tiempo que se confirmaba el bug ya documentado de DEUDA § 4.2
    (rama `error:` sin `cdr.markForCheck()`) — para ese caso, en vez de pelear con el timing de change
    detection zoneless sobre el DOM anidado (`ProfesionalDialogComponent` dentro del panel), el test
    verifica la causa raíz directamente con `vi.spyOn(cdr, 'markForCheck')`, más preciso y estable que
    inspeccionar el DOM después de un `detectChanges()` manual.
  - Confirmado en la práctica: `ComponentFixture.detectChanges()` sin argumentos corre además una
    verificación interna de "check no changes"; si se mutó estado por fuera del sistema de eventos de
    Angular (llamando un método del componente directo, como se hace en casi todos los specs de este
    plan) y curas la mutación recién en el mismo `detectChanges()`, esa verificación puede disparar
    `NG0100 ExpressionChangedAfterItHasBeenCheckedError` — se resuelve pasando `fixture.detectChanges(false)`
    cuando hace falta encadenar detección manual después de mutar estado a mano.
- **2026-08-08 (misma fecha, ronda 3)** — Implementación de las Fases 6c y 6d (11 archivos: Odontograma
  completo, Panel/Seguimiento completo). Con esto, **los 22 archivos del Tier 6 quedan hechos** — el
  plan entero está en 69/70 (falta solo UT-070, Fase 7). 838 tests en verde, cobertura en 79.62% de
  branches (piso 75%).
  - **Corrección a la nota de la ronda anterior**: `vi.spyOn(cdr, 'markForCheck')` sobre el
    `ChangeDetectorRef` obtenido con `fixture.debugElement.injector.get(ChangeDetectorRef)` **no es
    confiable para aserciones positivas** ("sí se llamó") — se probó en `TurnClinicalModalComponent`
    (que sí llama `cdr.markForCheck()` visiblemente en su código) y el spy no detectó la llamada. La
    aserción negativa de UT-056 ("no se llamó", ronda anterior) puede haber sido un falso positivo por
    la misma razón, no una confirmación real del bug — el bug en sí sigue siendo válido porque se lee
    directo del código fuente (falta la línea `cdr.markForCheck()` en la rama `error:`), pero el mecanismo
    de verificación no era el correcto. **Para la auditoría UT-070 (Fase 7, semi-manual) no usar esta
    técnica** — verificar por lectura de código (grep de `.subscribe(` sin `markForCheck()` cerca) o por
    efecto observable en el DOM con `fixture.detectChanges(false)` después de un delay real, no por spy
    sobre el `ChangeDetectorRef` inyectado.
  - **Dos bugs nuevos encontrados** escribiendo UT-064 (`AppointmentListOverflowComponent`), ninguno
    arreglado — ver [DEUDA_TECNICA.md § 7](./DEUDA_TECNICA.md):
    - `ngAfterViewInit` revienta con `TypeError` si el período filtrado no tiene turnos (el `ViewChild`
      del div queda `undefined` detrás de un `*ngIf`), y **sí es alcanzable en producción**: el padre
      solo evita instanciar el componente si el paciente no tiene turnos en NINGÚN período, no si el
      filtro de año/mes actual da cero resultados.
    - El dropdown de acciones, reubicado manualmente en `document.body`, queda huérfano si el
      componente se destruye mientras sigue abierto (navegar fuera de Seguimiento, por ejemplo) —
      Angular no lo limpia porque ya no es descendiente de la vista del componente al momento de
      destruirla.
- **2026-08-08 (misma fecha, ronda 4)** — Fase 7 (UT-070, la última pendiente): auditoría semi-manual de
  `.subscribe()` sin `markForCheck()` cerca. **Los 70 archivos planificados quedan hechos (70/70)**.
  - Se confirmó una **tercera instancia real** del patrón ya anticipado en
    [DEUDA_TECNICA.md § 4.3](./DEUDA_TECNICA.md): `ConfiguracionesViewComponent.saveWhatsappTemplate()`
    no llama `cdr.markForCheck()` en su rama de éxito, así que el mensaje "Configuración guardada" del
    template puede no aparecer tras guardar la plantilla de WhatsApp. Se fijó con un test que sí
    funcionó de forma confiable con el patrón de dos partes (estado interno vs. DOM tras
    `fixture.detectChanges(false)`) — a diferencia del intento con `vi.spyOn(cdr, 'markForCheck')` de la
    ronda 2, que resultó no ser confiable para aserciones positivas.
  - Tres candidatos más quedaron revisados pero **sin confirmar** (ninguno inyecta `ChangeDetectorRef`
    ni usa señales en sus métodos de guardado, mismo patrón de riesgo, pero no se pudo verificar el
    efecto real sin profundizar más): `TurnPaymentModalComponent`, `PatientWizardPanelComponent`,
    `SaveOdontogramaDialogComponent` (este último parcialmente mitigado porque `saveError` sí es una
    señal). Quedan anotados en DEUDA § 4.3 para una futura ronda, no se inventaron bugs sin poder
    observarlos.

## 16. Pendiente de completar por el desarrollador

- Seguir el orden de fases de [§ 17](#17-plan-de-implementación) al implementar — no es obligatorio,
  pero encapsula las dependencias entre archivos que este documento ya relevó (fixtures compartidos,
  mocks reusados entre specs).
- Actualizar el estado de cada fila (`⚪ Pendiente` → `✅ Hecho` + link al spec) a medida que se
  escriban los tests — igual que este documento reemplazó el pendiente equivalente de
  [TESTING.md](./TESTING.md), no dejar que este quede desactualizado.
- Ampliar `coverageInclude` en `angular.json` (ver [TESTING.md § 6](./TESTING.md#6-cobertura)) con
  cada archivo que pase a ✅, para que el gate de cobertura crezca al mismo ritmo que la suite — el
  ritmo sugerido de expansión está en § 17.4.
- UT-070 (auditoría de `markForCheck`) quedó marcada como semi-manual, no 100% automatizable como
  UT-069 — al tomarla, empezar por los dos candidatos ya anotados en § 12.1
  (`turn-payment-modal`/UT-067, `save-odontograma-dialog`/UT-062) en vez de auditar los 81 archivos
  desde cero.
- El campo `requiredControls` real de `PATIENT_WIZARD_STEPS` (usado por `isStepValid` en UT-044) no se
  leyó — `patient-wizard.config.ts` queda fuera del inventario de archivos con spec propio (es solo
  configuración), pero hay que abrirlo antes de escribir los casos concretos de UT-044.

## 17. Plan de implementación

Con el detalle técnico de los 7 tiers ya escrito (§ 6.1-12.1), lo que falta es organizarlo en tandas
ejecutables — del tamaño de un PR, en un orden que aproveche lo que este documento ya relevó (mocks y
fixtures que varios archivos comparten) en vez de reprocesarlo cada vez. Son **10 fases** sobre los
**67 archivos pendientes** (más las 2 auditorías del Tier 7).

### 17.1 Checklist por spec

Aplica a cada uno de los 67 archivos, sin importar la fase:

1. Leer la fila del tier **y** su detalle técnico (§ 6.1 a § 12.1) — si ya está ahí, no releer el
   código fuente de nuevo.
2. Escribir el spec con la forma de los 3 de Tier 0 (`scroll-lock.service.spec.ts`,
   `auth.service.spec.ts`, `search-input.component.spec.ts`) como referencia de estilo y convenciones
   (§ 3 de [TESTING.md](./TESTING.md)).
3. `npm test` en verde antes de seguir al siguiente archivo.
4. Agregar el archivo a `coverageInclude` en `angular.json` y correr `npm run test:coverage` —
   confirmar que el gate del 75% se sostiene.
5. Marcar la fila como `✅ Hecho` + link al spec, en la tabla del tier **y** en § 14.2 si el archivo
   aparece ahí también (son la misma fila vista desde dos ángulos distintos, hay que actualizar las
   dos para que no se desincronicen).
6. Si el archivo tiene una entrada en [DEUDA_TECNICA.md](./DEUDA_TECNICA.md), confirmar si sigue
   vigente o si el spec la dejó resuelta/documentada — actualizar ese documento si corresponde (como
   pasó con UT-066 en esta misma ronda de trabajo).

### 17.2 Fases

| Fase | Contenido | IDs | Archivos | Nota de secuencia |
|---|---:|---|---:|---|
| **1** | Tier 1 completo | UT-004 a UT-010 | 7 | Punto de partida: único tier con P0. Acá se define el mock compartido de `AuthService` (§ 6.1) que reusan casi todas las fases siguientes. |
| **2** | Tier 2 completo | UT-011 a UT-018 | 8 | Define los mocks de `OdontogramaStateService`/`PatientDataService` que reusan las fases 6c/6d. |
| **3** | Tier 3 completo | UT-019 a UT-027 | 9 | El más barato (funciones puras, sin `TestBed`) — se puede hacer en paralelo con la fase 2 si hay más de una persona disponible. |
| **4** | Tier 4 completo | UT-028 a UT-039 | 12 | Depende del mock de `AuthService` de la fase 1 (varios servicios lo inyectan). |
| **5** | Tier 5 completo | UT-040 a UT-046 | 7 | Acá se construye el fixture de `FormGroup` real para `PatientForm`/`PatientWizard` (§ 10.1) que reusan las fases 6a y 6d. |
| **6a** | Turnos, Auth, Calendar | UT-047, 048, 049, 050, 051, 052 | 6 | Reusa el fixture de la fase 5 (`appointment-dialog` comparte el parseo de anamnesis con `patient-wizard-panel`, fase 6d). |
| **6b** | Coberturas, Configuraciones | UT-053, 054, 055, 056, 057 | 5 | Agrupa los 3 diálogos de `profesionales-panel`/`profesional-dialog`/`invitation-dialog`, que comparten `MODULE_ICONS` y la lógica de `canGrant`. Incluye el bug sin resolver de DEUDA § 4.2 (UT-056). |
| **6c** | Odontograma | UT-058, 059, 060, 061, 062 | 5 | Todos salvo UT-060 (sparkline, sin DI) dependen del mock de `OdontogramaStateService` de la fase 2. `historia-clinica-form` (UT-058) no depende de odontograma pero comparte el patrón de formulario con firma/borrador — se agrupó acá por afinidad de dominio clínico, no por dependencia técnica. |
| **6d** | Panel, Seguimiento | UT-063, 064, 065, 066, 067, 068 | 6 | Depende del mock de `PatientDataService` de la fase 2. `panel-view` (UT-063) es independiente del resto del grupo — se puede adelantar si conviene, se agrupó acá solo por completar el tier. |
| **7** | Auditorías | UT-069, UT-070 | 2 | Ver nota de reordenamiento abajo. |

**Recomendación de reordenamiento:** UT-069 (auditoría de `appScrollLock`/`appBodyPortal`) conviene
adelantarla — moverla justo después de la fase 1, no dejarla última. Es barata (un test de archivos
estáticos, sin `TestBed`) y de las de mayor apalancamiento: cuanto antes esté corriendo, antes se
frena un octavo caso del patrón de [DEUDA § 1.1](./DEUDA_TECNICA.md) si alguien agrega un modal nuevo
mientras las fases 2-6 todavía están en curso. UT-070 (semi-manual) sí puede esperar al final, tal
como está.

### 17.3 Fixtures y mocks a construir una sola vez

Para no repetir el mismo mock con variaciones ligeras en cada spec:

| Fixture | Se define en | Se reusa en |
|---|---|---|
| Mock de `AuthService` (§ 6.1) | Fase 1 | Fases 4, 5, 6a, 6b, 6c |
| `FormGroup` real de paciente (§ 10.1) | Fase 5 | Fase 6a (`appointment-dialog`), fase 6d (`patient-wizard-panel`) |
| Mock de `OdontogramaStateService` (forma de UT-015) | Fase 2 | Fase 6c completa |
| Mock de `PatientDataService` (forma de UT-017) | Fase 2 | Fase 6d (`seguimiento-view`) |
| Stubs globales de `ResizeObserver`/`navigator.clipboard` | — | UT-012, UT-040, UT-055, UT-064 |

La última fila conviene resolverla distinto a las demás: en vez de repetir el stub por spec, agregarlo
una vez a `src/test-setup.ts` (el mismo archivo que ya registra los matchers de `jest-dom`, ver
[TESTING.md § 4](./TESTING.md#4-infraestructura-compartida)) apenas se llegue al primer spec que lo
necesite — así los siguientes tres no tienen que volver a pensarlo.

### 17.4 Ritmo del gate de cobertura

Cada fase termina con su propio `npm run test:coverage` en verde antes de pasar a la siguiente (paso 4
del checklist de § 17.1) — no acumular varias fases sin correrlo, para que un archivo que baja el
promedio se detecte en la fase en la que se agregó, no tres fases después. Al cerrar la fase 7, todo
archivo con lógica propia de este plan (los 67 más los 3 de Tier 0 = 70) debería estar en
`coverageInclude`; las 2 auditorías del Tier 7 no se agregan ahí — son tests estructurales propios, no
cobertura de un archivo puntual.

### 17.5 Qué queda fuera de este plan de implementación

- Los 11 archivos de [§ 13](#13-fuera-de-alcance) no se implementan salvo que ganen lógica propia.
- Agregar el stage `Test` al Jenkinsfile (hueco ya señalado en
  [TESTING.md § 8](./TESTING.md#8-huecos-conocidos)) no es parte de ninguna fase de arriba — es una
  decisión de infraestructura aparte, razonable de tomar después de la fase 1 o 2 (cuando ya haya
  suficiente masa crítica de specs corriendo) en vez de esperar a las 10 fases completas.
