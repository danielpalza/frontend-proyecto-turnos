# Testing — turnos-app (frontend)

> Estado al 2026-08-08: **839 tests** en **70 archivos `*.spec.ts`** — implementación completa de
> [PLAN_DE_TESTING.md](./PLAN_DE_TESTING.md) (70/70 archivos planificados, los 7 tiers). Arrancó el
> 2026-08-07 desde cero (antes de esa fecha el repo no tenía ningún test unitario ni target `test`
> configurado — ver historial de [ARCHITECTURE.md](./ARCHITECTURE.md) y
> [DEPENDENCIES.md](./DEPENDENCIES.md)). Cobertura del gate acotado (§ 6): 88.96 % instrucciones /
> 79.62 % branches / 86.66 % funciones / 89.9 % líneas, medida sobre los 70 archivos en
> `coverageInclude` — **no** es la cobertura de los ~11 archivos fuera de alcance (§ 6, § 8, y
> [PLAN_DE_TESTING.md § 13](./PLAN_DE_TESTING.md#13-fuera-de-alcance)). Se corre con `npm test`
> (rápido, sin cobertura) o `npm run test:coverage` (con el gate del 75 %).

## 1. Cómo se corre

| Comando | Qué ejecuta | Cobertura |
|---|---|---|
| `npm test` (= `ng test`) | Los 70 `*.spec.ts` actuales, sin instrumentar cobertura. | No |
| `npm run test:coverage` (= `ng test --configuration=ci`) | Lo mismo, con cobertura v8 y el gate del 75 % (§ 6). Falla el build si no se cumple. | Sí |
| `ng test --filter=ScrollLock` | Solo los specs cuyo nombre matchea. | Según config activa |
| `ng test --watch` | Modo watch de Vitest. | No |

Los tres corren sobre **Node + jsdom**, no un navegador real (`angular.json` no declara `browsers`
en el target `test` — ver § 2 sobre por qué jsdom).

## 2. Librerías

Ninguna vino con el `ng new` original salvo el tipo `vitest/globals` que ya dejaba
`tsconfig.spec.json` (rastro de que Angular 21 ya asume Vitest como runner del builder
`@angular/build:unit-test`, aunque el target `test` no existía en `angular.json` hasta esta ronda).

| Librería | Para qué |
|---|---|
| `vitest` | Runner. Lo invoca `@angular/build:unit-test` (`runner: "vitest"` es el default del builder, no hace falta declararlo en `angular.json`). |
| `jsdom` | Entorno DOM. Elegido sobre `happy-dom` porque `ScrollLockService` toca `document.documentElement.style`, `window.innerWidth` y `getComputedStyle` — jsdom los implementa más completos. |
| `@vitest/coverage-v8` | Proveedor de cobertura (motor V8 nativo de Node, no instrumentación tipo Istanbul). |
| `@testing-library/angular` | Render y queries de componentes orientadas a comportamiento de usuario (`getByTestId`, `getByRole`, etc.) en vez de inspeccionar el `DebugElement` a mano. |
| `@testing-library/dom` | Peer dependency de la anterior (motor de queries). |
| `@testing-library/user-event` | Simula interacción real (`type`, `click`) disparando la secuencia de eventos DOM completa, no un solo `dispatchEvent` sintético. |
| `@testing-library/jest-dom` | Matchers extra (`toBeVisible`, etc.) vía el subpath `@testing-library/jest-dom/vitest`, registrado en `src/test-setup.ts`. |
| `@angular/core/testing` + `@angular/common/http/testing` (nativos de Angular, sin instalar aparte) | `TestBed`, `HttpTestingController` — para los specs de servicio no se agregó nada de terceros para mockear HTTP. |

**Explícitamente no se usan**: `ng-mocks` (mocks manuales alcanzan por ahora; se evalúa agregarlo si
el boilerplate de proveer dependencias en specs de componentes con árboles grandes se vuelve doloroso),
`MSW` (`HttpTestingController` nativo cubre el caso y es lo idiomático en Angular), `rxjs-marbles`
(ningún spec de hoy tiene lógica de timing de streams lo bastante compleja para justificarlo),
Karma/Jasmine (Angular los da de baja como runner recomendado desde la v20).

## 3. Estructura

A diferencia del backend (que separa `src/test/java` del código de producción), los specs de Angular
**conviven con el código que testean** — convención estándar de la CLI (`ng generate` ya crea
`*.component.spec.ts` al lado de cada componente cuando `skipTests` no está seteado; acá está en
`true` para todos los schematics, así que los 3 specs de esta ronda se escribieron a mano):

```
src/
├── app/
│   ├── core/services/
│   │   ├── auth.service.ts
│   │   ├── auth.service.spec.ts
│   │   ├── scroll-lock.service.ts
│   │   └── scroll-lock.service.spec.ts
│   └── shared/components/search-input/
│       ├── search-input.component.ts
│       └── search-input.component.spec.ts
├── test-providers.ts   infraestructura compartida (§ 4)
└── test-setup.ts        infraestructura compartida (§ 4)
```

El árbol de arriba muestra los 3 primeros specs (2026-08-07); el patrón se repitió sin cambios para
los otros 67 archivos de [PLAN_DE_TESTING.md](./PLAN_DE_TESTING.md) — cada `*.spec.ts` vive junto al
archivo que testea, en su misma carpeta de feature.

### Convenciones (vigentes en los 70 archivos)

- Un `describe` por clase/componente, un `it` por comportamiento observable — no por método.
- Título del `it` en castellano describiendo la regla, no el nombre técnico: `"no libera el scroll
  mientras haya locks apilados (modales anidados)"`, no `"testUnlockCount"`.
- Cuando el componente/servicio tiene una peculiaridad no obvia (zoneless, doble handler en un botón,
  etc.), se documenta con un comentario en el spec, no solo en este archivo — ver el comentario en
  `search-input.component.spec.ts` sobre el botón de limpiar (§ 5).

## 4. Infraestructura compartida

| Archivo | Rol |
|---|---|
| `src/test-providers.ts` | Exporta por default `[provideZonelessChangeDetection()]`. Lo consume el builder vía la opción `providersFile` de `angular.json` — se aplica a **todos** los specs sin que cada uno tenga que repetirlo en su `TestBed.configureTestingModule`. |
| `src/test-setup.ts` | `import '@testing-library/jest-dom/vitest'` — registra los matchers extendidos una sola vez para toda la suite (opción `setupFiles` de `angular.json`). |

### Una decisión que no es obvia: por qué `@testing-library/angular` encaja bien con zoneless

La app corre con `provideZonelessChangeDetection()` (sin Zone.js — ver
[ARCHITECTURE.md](./ARCHITECTURE.md) y [STATE.md](./STATE.md)), lo que abre una clase entera de bugs
silenciosos ya documentada en [DEUDA_TECNICA.md § 4](./DEUDA_TECNICA.md#4-change-detection-zoneless-campo-plano-mutado-en-un-subscribe-sin-markforcheck):
una mutación de estado dentro de un `.subscribe()` que no dispara `markForCheck()` no se refleja en el
DOM, sin ninguna excepción.

`render()` de `@testing-library/angular` usa `autoDetectChanges: true` por default, que engancha el
fixture al scheduler zoneless de Angular (no a un `setInterval` externo) — por eso
`search-input.component.spec.ts` puede escribir en el input, esperar el dropdown con
`screen.findByTestId(...)` y leer el valor actualizado **sin llamar `fixture.detectChanges()` a mano
en ningún punto**, y sin embargo el efecto queda ejercido igual. Esto **no** protege contra el bug de
§ 4.2 de `DEUDA_TECNICA.md` (ese componente no tiene spec propio todavía) ni sustituye poner
`markForCheck()` donde falta — solo evita que el test mismo necesite parchear change detection a mano
para observar lo que sí está bien implementado.

### Nota de implementación: `fakeAsync`/`tick()` no aplican, usar timers falsos de Vitest

Como la app es zoneless, las utilidades `fakeAsync`/`tick()` de `@angular/core/testing` (que parchean
zone.js) no tienen nada que interceptar. El debounce de `SearchInputComponent`
(`rxjs/operators.debounceTime`) se testea con `vi.useFakeTimers()` / `vi.advanceTimersByTime()` —
ver el segundo `it` de `search-input.component.spec.ts`, que además verifica explícitamente que
`searchChange` **no** se llame antes de avanzar los timers (si se borra ese assert o el
`advanceTimersByTime`, el test debe fallar; es la prueba de que el debounce se ejerce de verdad y no
solo se le hace `flush` inmediato).

## 5. Inventario

El inventario completo, archivo por archivo (los 70 `*.spec.ts`, con ID estable `UT-NNN`, qué cubre
cada uno y su estado), vive en [PLAN_DE_TESTING.md](./PLAN_DE_TESTING.md) — no se duplica aquí para
no tener dos fuentes de verdad que se desincronicen. Este documento se queda con un resumen por tier
y con los 3 archivos originales (§ 5.1) como referencia de "forma" para specs nuevos.

### Resumen por tier (ver PLAN_DE_TESTING.md para el detalle)

| Tier | Contenido | Archivos | Estado |
|---|---|---:|---|
| 0 | Los 3 specs originales (§ 5.1) | 3 | ✅ Hecho |
| 1 (P0) | Seguridad/permisos: interceptors, guard, `CanDirective`, capabilities, home-route | 6 | ✅ Hecho |
| 2 (P1) | Servicios de estado sin `HttpClient` | 8 | ✅ Hecho |
| 3 (P1) | Utils/validators puros | 9 | ✅ Hecho |
| 4 (P2) | Servicios HTTP restantes | 12 | ✅ Hecho |
| 5 (P2) | Directivas/componentes compartidos | 7 | ✅ Hecho |
| 6 (P3) | Componentes de feature grandes | 22 | ✅ Hecho |
| 7 | Auditoría transversal `markForCheck`/OnPush (semi-manual, UT-070) | 1 | ✅ Hecho |
| **Total** | | **70/70** | **100 %** |

`angular.json` → `coverageInclude` tiene la lista completa de rutas incluidas en el gate (70 entradas,
una por archivo con spec); ver § 6 para cómo se lee ese bloque sin pegarlo entero acá.

### 5.1. Los 3 specs originales (referencia de forma)

| Archivo | Tests | Qué cubre |
|---|---:|---|
| `core/services/scroll-lock.service.spec.ts` | 4 | Servicio plano sin dependencias: `lock()`/`unlock()` con contador de referencias (modales apilados), restauración del `overflow-y` original, no-op de un `unlock()` de más. |
| `core/services/auth.service.spec.ts` | 15 | Servicio con `HttpClient`: los 4 métodos que pegan al backend (`login`, `register`, `verifyEmail`, `resetPassword`) vía `HttpTestingController`; `logout()`; `isAuthenticated()` con token vigente/expirado/inválido/ausente; `hasRole`, `hasCapability` (capabilities del backend y fallback derivado de `modules` vía `resolveCapabilities`), `grantedModules`, `hasModule` (deprecated). |
| `shared/components/search-input/search-input.component.spec.ts` | 7 | Componente con `@Input`/`@Output` clásicos (no signals) vía `@testing-library/angular`: placeholder/valor inicial, debounce real (con y sin), botón de limpiar, checkbox de saldo pendiente condicional, selección de un ítem del dropdown. |

`ScrollLockService` y `AuthService` se eligieron como ejemplo de "servicio sin dependencias" y
"servicio con `HttpClient`" respectivamente; `SearchInputComponent` como ejemplo de componente con
inputs/outputs e interacción de usuario real — el resto de la suite (Tiers 1-7) copió estas mismas
tres formas base, sumando los patrones nuevos documentados en § 2 y § 4 (`componentProviders`,
`fixture.detectChanges(false)`, `FakeResizeObserver`, etc. — ver el detalle en cada spec y en el
historial de [PLAN_DE_TESTING.md § 15](./PLAN_DE_TESTING.md#15-historial)).

## 6. Cobertura

El gate vive en la configuración `ci` del target `test` (`angular.json`), separado del target base
para que `npm test` (uso diario) siga rápido y sin instrumentar:

```json
"ci": {
  "coverage": true,
  "coverageInclude": [
    "src/app/core/services/scroll-lock.service.ts",
    "src/app/core/services/auth.service.ts",
    "src/app/shared/components/search-input/search-input.component.ts",
    "... 67 rutas más — una por cada archivo con spec, ver angular.json § architect.test.configurations.ci"
  ],
  "coverageThresholds": { "statements": 75, "branches": 75, "functions": 75, "lines": 75 }
}
```

(el bloque real en `angular.json` tiene las 70 rutas completas, no se pegan todas acá para no
duplicar una lista que cambia con cada spec nuevo — la fuente de verdad es el archivo mismo).

**Por qué sigue acotado por `coverageInclude` y no es el repo entero.** El criterio no cambió desde el
arranque de la suite: `coverageInclude` acota el gate a los archivos que sí tienen spec, para que sea
un piso **real** (falla ante una regresión en cualquiera de esos 70 archivos) en vez de un número
decorativo diluido por los ~11 archivos fuera de alcance ([PLAN_DE_TESTING.md § 13](./PLAN_DE_TESTING.md#13-fuera-de-alcance) —
wrappers triviales sin lógica propia, ya bien cubiertos por E2E). Mismo criterio que el backend aplicó
con `jacoco:check` al 75 % (ver `bakend-proyecto-turnos/docs/TESTING.md § 9`): el gate crece agregando
rutas a `coverageInclude` a medida que se agregan specs nuevos, no bajando el umbral.

Última medición (2026-08-08, `npm run test:coverage`, agregado de los 70 archivos en `coverageInclude`):

| Métrica | % | Cubierto / Total |
|---|---:|---:|
| Statements | 88.96 | 4154 / 4669 |
| Branches | 79.62 | 2462 / 3092 |
| Functions | 86.66 | 1209 / 1395 |
| Lines | 89.9 | 3713 / 4130 |

839 tests en 69 archivos de test (69 `Test Files`, 70 archivos de producción cubiertos — un mismo
spec, `configuraciones-view.component.spec.ts`, ejercita tanto `ConfiguracionesViewComponent` como
parte del árbol de `ProfesionalesPanelComponent` que ya tenía su propio spec). Todas las métricas
superan el piso del 75 % con margen; el hueco de branches (79.62 %, el más bajo de los cuatro) es
mayormente ramas de manejo de errores poco frecuentes y combinaciones de guards que no se
consideraron valiosas de perseguir hasta el 100 % — ver [DEUDA_TECNICA.md](./DEUDA_TECNICA.md) para
los casos donde ese hueco coincide con un bug real ya documentado, no solo con cobertura floja.

## 7. Relación con el suite E2E (`frontend-proyecto-tests`)

Este repo cubre **unit/component** (servicios y componentes aislados, con dependencias mockeadas).
El repo hermano `frontend-proyecto-tests` corre **Playwright** contra la app real levantada
(`ng serve`) más el backend real — flujos completos de usuario, con datos sembrados y autenticación
real. Los `data-testid` que ven ambos specs de componente y los Page Object Models de Playwright
apuntan a los mismos atributos en los templates (`testIdAttribute: 'data-testid'` en
`playwright.config.ts` del otro repo) — es intencional, pero son dos suites independientes que no se
ejecutan una a la otra. Ver [ARCHITECTURE.md § Testing e2e](./ARCHITECTURE.md#testing-e2e-poms).

## 8. Huecos conocidos

| Hueco | Por qué | Qué haría falta |
|---|---|---|
| **El Jenkinsfile no corre ningún test** | Se escribió cuando el repo no tenía target `test` ni specs (comentario explícito en el pipeline: *"el proyecto todavia no tiene target test configurado"*) — quedó desactualizado con esta ronda. | Agregar un stage `Test` con `npm test` (rápido, feedback en cada push) y decidir si `npm run test:coverage` corre siempre o solo en la rama principal (es más lento: recompila con instrumentación). |
| **El gate de cobertura sigue acotado a `coverageInclude` (70 archivos), no a `src/app/` completo** | Ver § 6 — es deliberado: los ~11 archivos fuera de alcance ([PLAN_DE_TESTING.md § 13](./PLAN_DE_TESTING.md#13-fuera-de-alcance)) son wrappers triviales ya bien cubiertos por E2E; forzarlos al gate no sumaría valor real. | Si alguno de esos archivos gana lógica propia en el futuro, sacarlo de "fuera de alcance", escribirle spec y sumarlo a `coverageInclude`. |
| **4 bugs de producción documentados durante Fases 6-7 siguen sin arreglar** | Convención del proyecto: "fijar el comportamiento actual con un test, documentar, no arreglar en silencio" — arreglarlos es una decisión de producto/negocio, no algo que un test deba forzar. Ver [DEUDA_TECNICA.md](./DEUDA_TECNICA.md) §§ 6, 7 y 4.3 reescrita. | Priorizar y arreglar cada uno con su propio PR: (1) toast de `ProfesionalesPanelComponent` siempre dice "creado"; (2) `AppointmentListOverflowComponent.ngAfterViewInit()` puede tirar `TypeError` con lista filtrada vacía; (3) el mismo componente deja un nodo de menú huérfano en `document.body` si se destruye con el dropdown abierto; (4) `ConfiguracionesViewComponent.saveWhatsappTemplate()` no llama `markForCheck()` en su rama de éxito. |
| **Sin ESLint** | El repo no tiene `.eslintrc`/`eslint.config.*` ni el paquete instalado (ver [DEPENDENCIES.md](./DEPENDENCIES.md)) — los specs nuevos no pasan por ningún lint, solo por el estilo de Prettier declarado en `package.json`. | Fuera de alcance de esta ronda; si se agrega ESLint al repo, sumar `eslint-plugin-testing-library` para reglas específicas de specs (evita antipatrones como `container.querySelector` en vez de `getByTestId`). |
| **`ng-mocks` y MSW evaluados y descartados por ahora** | Ver § 2. | Reconsiderar si un componente con árbol de dependencias grande hace doloroso el mock manual, o si se quiere compartir mocks de HTTP con Storybook/desarrollo local (hoy no existe Storybook en el repo). |
| **`@testing-library/angular` en un release muy reciente de Angular** | Se instaló `@testing-library/angular@^19.4.2` contra Angular `^21.0.0`; el peer range (`>= 21.0.0`) ya lo declara compatible y `npm install` no reportó conflictos, pero es una combinación con poco tiempo de rodaje en el ecosistema. | Ninguna acción — solo prestar atención a este punto si aparecen fallos de tipo raros al actualizar cualquiera de los dos paquetes. |

## 9. Historial

- **2026-08-07** — Arranque de la suite de unit/component testing, no existía ninguna hasta esta
  fecha (ver el estado que documentaban [ARCHITECTURE.md](./ARCHITECTURE.md) y
  [DEPENDENCIES.md](./DEPENDENCIES.md) antes de esta ronda). Se agregó el target `test`
  (`@angular/build:unit-test`, runner Vitest — ya era el default implícito del builder) con una
  configuración `ci` separada para el gate de cobertura, y 3 specs de ejemplo cubriendo los tres
  patrones del stack: servicio plano (`ScrollLockService`), servicio con `HttpClient`
  (`AuthService`, vía `HttpTestingController` nativo) y componente con inputs/outputs
  (`SearchInputComponent`, vía `@testing-library/angular` + `@testing-library/user-event`). Decisión
  explícita del desarrollador: el gate de cobertura del 75 % nace acotado (`coverageInclude`) a esos
  3 archivos en vez de aplicarse al repo entero, para que sea un piso real desde el día uno — se
  amplía agregando rutas a medida que se agreguen specs nuevos, mismo criterio incremental que usó el
  backend con `jacoco:check` (`bakend-proyecto-turnos/docs/TESTING.md § 9-10`). 26 tests, todos en
  verde; cobertura del alcance acotado: 90.28 % instrucciones / 80 % branches / 85.41 % funciones /
  90.06 % líneas (§ 6).
- **2026-08-08** — Implementación completa de [PLAN_DE_TESTING.md](./PLAN_DE_TESTING.md): los 70/70
  archivos planificados en los 7 tiers, siguiendo el criterio de priorización P0→P3 fijado el día
  anterior. Se agregaron 67 archivos `*.spec.ts` nuevos (836 tests nuevos sobre los 26 originales) en
  siete rondas (una por tier), verificando después de cada una que la suite completa siguiera en
  verde y el gate de cobertura (`npm run test:coverage`) siguiera pasando antes de avanzar a la
  siguiente. Resultado final: **839 tests en 69 archivos de test**, cobertura del alcance acotado
  (70 archivos en `coverageInclude`) de 88.96 % instrucciones / 79.62 % branches / 86.66 % funciones /
  89.9 % líneas — todas por encima del piso del 75 % (§ 6). Se encontraron y documentaron (sin
  arreglar, por convención del proyecto) 4 bugs de producción nuevos, ninguno detectado antes por
  ningún nivel de test existente: el toast de `ProfesionalesPanelComponent` que siempre dice "creado"
  aunque sea una edición; dos bugs distintos en `AppointmentListOverflowComponent` (`TypeError` en
  `ngAfterViewInit()` con lista filtrada vacía, y un nodo de menú huérfano en `document.body` si el
  componente se destruye con el dropdown abierto); y `ConfiguracionesViewComponent.saveWhatsappTemplate()`
  sin `markForCheck()` en su rama de éxito — ver [DEUDA_TECNICA.md](./DEUDA_TECNICA.md) §§ 6, 7 y la
  4.3 reescrita. Hallazgo metodológico importante de esta ronda: `vi.spyOn(cdr, 'markForCheck')` para
  asserts positivos ("sí se llamó") resultó no confiable — falló en un caso confirmado por lectura de
  código donde el método claramente se invoca. Se reemplazó por verificación directa en dos pasos vía
  `fixture.detectChanges(false)` antes/después de mutar estado, comparando contra el DOM
  (`screen.queryByText`/`queryByTestId`) — técnica que sí demostró ser confiable y quedó como el
  patrón recomendado para casos similares (ver § 4 de este documento y el historial en
  [PLAN_DE_TESTING.md § 15](./PLAN_DE_TESTING.md#15-historial) para el detalle completo por tier).

## Pendiente de completar por el desarrollador

- **Agregar el stage `Test` al [Jenkinsfile](../Jenkinsfile)** — sigue siendo el principal pendiente:
  hoy el pipeline solo hace `npm ci` + `npm run build`, sin ejecutar ningún test (§ 8). Ya no hay
  excusa de "no hay specs" — con 839 tests y un gate de cobertura funcionando localmente, este es el
  hueco de mayor impacto que queda abierto.
- Arreglar (o decidir explícitamente no arreglar todavía) los 4 bugs de producción documentados en
  [DEUDA_TECNICA.md](./DEUDA_TECNICA.md) §§ 6, 7 y 4.3 — ver § 8 de este documento para el resumen y
  el detalle de cada uno.
- Ampliar `coverageInclude`/[PLAN_DE_TESTING.md](./PLAN_DE_TESTING.md) si se agrega código nuevo
  testeable — el plan quedó en 70/70 (100 %) al cierre de esta ronda, pero no es un techo: cualquier
  archivo nuevo con lógica propia debería sumar su fila al plan y su ruta a `coverageInclude`.
- ~~Decidir un criterio de priorización para qué testear a continuación~~ — **RESUELTO 2026-08-07,
  ejecutado 2026-08-08.** [PLAN_DE_TESTING.md](./PLAN_DE_TESTING.md) está 100 % completo (70/70).
- Confirmar si el hueco de `@testing-library/angular`/Angular 21 (§ 8) sigue vigente cuando se
  actualice cualquiera de los dos paquetes.
- Evaluar subir el piso de `branches` en `coverageThresholds` por encima del 75 % actual — la medición
  real ya está en 79.62 % (§ 6), así que un piso de 78-79 % daría margen de regresión real sin
  requerir trabajo adicional inmediato.
