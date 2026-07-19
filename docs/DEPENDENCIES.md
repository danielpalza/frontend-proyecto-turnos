# Dependencias — OdontoLite (turnos-app)

Fuente: `package.json` (raíz del repo), contrastado contra usos reales en `src/`.

## dependencies (runtime)

| Paquete | Versión | Para qué se usa |
|---|---|---|
| `@angular/core` | ^21.0.0 | Framework Angular: componentes, DI, signals, `provideZonelessChangeDetection`. |
| `@angular/common` | ^21.0.0 | `CommonModule`, `HttpClient`/`HttpClientModule` (vía `@angular/common/http`), pipes comunes (`*ngIf`, `*ngFor` en la sintaxis clásica, además de la nueva `@if`/`@for`). |
| `@angular/compiler` | ^21.0.0 | Compilador de templates (JIT/soporte AOT). |
| `@angular/forms` | ^21.0.0 | Reactive Forms (`FormBuilder`, `FormGroup`, `Validators`) y template-driven forms (`FormsModule`, `[(ngModel)]`). Ver [FORMS.md](./FORMS.md). |
| `@angular/platform-browser` | ^21.0.0 | Bootstrap en navegador (`bootstrapApplication`), `provideBrowserGlobalErrorListeners`. |
| `@angular/router` | ^21.0.0 | Enrutamiento SPA, `loadComponent`, guards funcionales. Ver [ROUTES.md](./ROUTES.md). |
| `@angular/cdk` | ^21.0.0 | **Declarado pero sin uso detectado** en `src/` (ningún import de `@angular/cdk/*` en el código). Probablemente reservado para overlays/portales futuros. Ver "Pendiente" abajo. |
| `bootstrap` | ^5.3.8 | Sistema de UI: grid, utilidades, componentes base (`.card`, `.btn`, `.modal`, `.table`, `.form-control`, etc.). Importado en `src/styles.scss` (`@import "bootstrap/scss/bootstrap"`). Ver [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md). |
| `bootstrap-icons` | ^1.13.1 | Fuente de iconos (`<i class="bi bi-*">`), usada en toda la app. Importada en `src/styles.scss`. |
| `chart.js` | ^4.5.1 | Motor de gráficos (line/doughnut) del dashboard. |
| `ng2-charts` | ^10.0.0 | Wrapper Angular de Chart.js (`BaseChartDirective`, `provideCharts`). Usado solo en `features/panel/panel-view` (gráfico de evolución de ingresos y donut de estado de turnos). |
| `rxjs` | ~7.8.0 | Programación reactiva: `BehaviorSubject`/`Subject`/operadores, base del estado en casi todos los `core/services/*`. Ver [STATE.md](./STATE.md). |
| `tslib` | ^2.3.0 | Helpers de salida TypeScript (requerido por `"importHelpers": true` en `tsconfig.json`). |

## devDependencies

| Paquete | Versión | Para qué se usa |
|---|---|---|
| `@angular/build` | ^21.0.1 | Builder moderno de Angular (`@angular/build:application`, `@angular/build:dev-server`) usado por `angular.json` para build/serve (basado en esbuild/Vite, reemplaza a `@angular-devkit/build-angular`). |
| `@angular/cli` | ^21.0.1 | CLI (`ng serve`, `ng build`, `ng test`, `ng generate`). |
| `@angular/compiler-cli` | ^21.0.0 | Compilación AOT/type-checking de templates. |
| `typescript` | ~5.9.2 | Lenguaje. `tsconfig.json` fuerza `strict: true`, `strictTemplates: true`, `strictInjectionParameters: true`. |

## ¿Hay algo de servidor en este repo?

**No.** No hay `express`, `cors`, `mysql2`, `pg`, ni ningún paquete típico de backend/servidor en `package.json`. Tampoco hay Server-Side Rendering (SSR) configurado (`angular.json` no define `server`/`prerender`; el `build` solo tiene target `browser`). Este repo es una **SPA pura**: se compila a estático (`ng build` → `dist/turnos-app`) y todo el consumo de datos ocurre vía `fetch`/`XMLHttpRequest` del `HttpClient` contra la API Spring Boot del repo hermano (`bakend-proyecto-turnos`), cuya URL se resuelve en runtime (ver [ARCHITECTURE.md](./ARCHITECTURE.md#cómo-se-resuelve-la-url-del-backend)).

## Scripts (`package.json`)

| Script | Comando | Uso |
|---|---|---|
| `start` | `ng serve` | Servidor de desarrollo (`localhost:4200` por defecto), usa `API_CONFIG.baseUrl` local (`http://localhost:8080/api`). |
| `build` | `ng build` | Build de producción a `dist/turnos-app` (budgets: 500kB warning / 1MB error inicial). |
| `watch` | `ng build --watch --configuration development` | Build en modo desarrollo con watch. |
| `test` | `ng test` | Corre Vitest (`tsconfig.spec.json` referencia `vitest/globals`). **No hay archivos `*.spec.ts` en el repo hoy**, así que este script no ejecuta ningún test real todavía. |

`ng e2e` no está configurado (Angular CLI no trae runner e2e por defecto); ver la nota sobre `POMS/` y Playwright en [ARCHITECTURE.md](./ARCHITECTURE.md#testing-e2e-poms).

## Pendiente de completar por el desarrollador

- No se pudo determinar desde el código si `@angular/cdk` está pensado para algo específico (no tiene ningún import). Confirmar si es deuda técnica (dependencia sin usar) o si hay planes de usarlo (p. ej. `CdkOverlay` para los diálogos, que hoy están implementados a mano).
- No hay `package.json` con `engines` que fije la versión de Node requerida.
- La versión exacta de cada paquete resuelta (`package-lock.json`) no se documentó línea por línea aquí; para auditorías de seguridad conviene revisar `package-lock.json` directamente.
