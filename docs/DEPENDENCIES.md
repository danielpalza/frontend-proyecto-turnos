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
| `@angular/build` | ^21.0.1 | Builder moderno de Angular (`@angular/build:application`, `@angular/build:dev-server`, y desde esta ronda `@angular/build:unit-test`) usado por `angular.json` para build/serve/test (basado en esbuild/Vite, reemplaza a `@angular-devkit/build-angular`). |
| `@angular/cli` | ^21.0.1 | CLI (`ng serve`, `ng build`, `ng test`, `ng generate`). |
| `@angular/compiler-cli` | ^21.0.0 | Compilación AOT/type-checking de templates. |
| `typescript` | ~5.9.2 | Lenguaje. `tsconfig.json` fuerza `strict: true`, `strictTemplates: true`, `strictInjectionParameters: true`. |
| `vitest` | ^4.1.10 | Runner de tests, invocado por `@angular/build:unit-test`. Ver [TESTING.md](./TESTING.md). |
| `jsdom` | ^29.1.1 | Entorno DOM para correr los specs sin navegador real. |
| `@vitest/coverage-v8` | ^4.1.10 | Proveedor de cobertura del target `test` (configuración `ci`). |
| `@testing-library/angular` | ^19.4.2 | Render/queries de componentes orientadas a comportamiento de usuario. |
| `@testing-library/dom` | ^10.4.1 | Peer dependency de `@testing-library/angular`. |
| `@testing-library/user-event` | ^14.6.3 | Simulación de interacción de usuario (`type`, `click`) en los specs de componente. |
| `@testing-library/jest-dom` | ^7.0.0 | Matchers extra (`toBeVisible`, etc.), registrados vía `src/test-setup.ts`. |

## ¿Hay algo de servidor en este repo?

**No.** No hay `express`, `cors`, `mysql2`, `pg`, ni ningún paquete típico de backend/servidor en `package.json`. Tampoco hay Server-Side Rendering (SSR) configurado (`angular.json` no define `server`/`prerender`; el `build` solo tiene target `browser`). Este repo es una **SPA pura**: se compila a estático (`ng build` → `dist/turnos-app`) y todo el consumo de datos ocurre vía `fetch`/`XMLHttpRequest` del `HttpClient` contra la API Spring Boot del repo hermano (`bakend-proyecto-turnos`), cuya URL se resuelve en runtime (ver [ARCHITECTURE.md](./ARCHITECTURE.md#cómo-se-resuelve-la-url-del-backend)).

## Scripts (`package.json`)

| Script | Comando | Uso |
|---|---|---|
| `start` | `ng serve` | Servidor de desarrollo (`localhost:4200` por defecto), usa `API_CONFIG.baseUrl` local (`http://localhost:8080/api`). |
| `build` | `ng build` | Build de producción a `dist/turnos-app` (budgets: 500kB warning / 1MB error inicial). |
| `watch` | `ng build --watch --configuration development` | Build en modo desarrollo con watch. |
| `test` | `ng test` | Corre los 70 `*.spec.ts` del repo (839 tests, Vitest vía `@angular/build:unit-test`), sin cobertura. Ver [TESTING.md](./TESTING.md). |
| `test:coverage` | `ng test --configuration=ci` | Igual, con cobertura v8 y el gate del 75 % acotado a los archivos con spec. Ver [TESTING.md § 6](./TESTING.md#6-cobertura). |

`ng e2e` no está configurado (Angular CLI no trae runner e2e por defecto); ver la nota sobre `POMS/` y Playwright en [ARCHITECTURE.md](./ARCHITECTURE.md#testing-e2e-poms).

## Infraestructura de despliegue (no-npm, nueva 2026-08-26/28)

No son paquetes de `package.json`, pero desde esta ronda el repo depende de infraestructura de deploy
que antes no existía — detalle completo en [ARCHITECTURE.md § CI/CD y
despliegue](./ARCHITECTURE.md#cicd-y-despliegue):

| Archivo | Para qué |
|---|---|
| `.github/workflows/deploy.yml` | Pipeline de GitHub Actions: test (`npm run test:coverage`) + build (`npm run build`) + imagen Docker (Buildx) + push a GHCR + purga de versiones huérfanas + webhook de deploy a Coolify. Reemplaza al `Jenkinsfile` como vía real de deploy a producción (el `Jenkinsfile` sigue existiendo, sin cambios, solo build + disparo del job E2E). |
| `Dockerfile.ci` | Imagen `nginx:alpine` liviana que empaqueta el `dist/turnos-app/browser` ya compilado por el runner (no recompila Angular dentro del contenedor) + `nginx.conf`. |
| `Dockerfile.ci.dockerignore` | `.dockerignore` específico de `Dockerfile.ci` (BuildKit lo prioriza sobre el general) — a diferencia del general, no ignora `dist/`. |
| `nginx.conf` | Sirve la SPA (fallback a `index.html`), cachea assets con hash 1 año, gzip, y hace de **reverse proxy de `/api/`** hacia el contenedor `backend:8080` interno de Docker — es lo que le permite a `api.config.ts` usar una URL relativa en producción en vez de pegarle a un backend externo. |

## Pendiente de completar por el desarrollador

- No se pudo determinar desde el código si `@angular/cdk` está pensado para algo específico (no tiene ningún import). Confirmar si es deuda técnica (dependencia sin usar) o si hay planes de usarlo (p. ej. `CdkOverlay` para los diálogos, que hoy están implementados a mano).
- No hay `package.json` con `engines` que fije la versión de Node requerida.
- La versión exacta de cada paquete resuelta (`package-lock.json`) no se documentó línea por línea aquí; para auditorías de seguridad conviene revisar `package-lock.json` directamente.
