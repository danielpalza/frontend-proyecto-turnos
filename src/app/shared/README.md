# Carpeta Shared - Elementos Reutilizables

Esta carpeta contiene componentes, directivas, pipes y otros elementos que se reutilizan en múltiples features de la aplicación.

## Estructura Recomendada

```
shared/
├── components/          # Componentes reutilizables
│   ├── search-input/   # Ejemplo: Input de búsqueda genérico
│   ├── loading-spinner/
│   ├── error-message/
│   └── ...
├── directives/         # Directivas personalizadas
│   └── ...
├── pipes/              # Pipes personalizados
│   └── ...
├── validators/         # Validadores de formularios reutilizables
│   └── ...
└── index.ts           # Barrel export para facilitar imports
```

## Convenciones

1. **Componentes**: Cada componente debe estar en su propia carpeta con:
   - `nombre.component.ts`
   - `nombre.component.html`
   - `nombre.component.scss`

2. **Standalone**: Todos los componentes deben ser standalone para facilitar su uso

3. **Exports**: Usar `index.ts` para exportar todos los elementos:
   ```typescript
   export * from './components/search-input/search-input.component';
   export * from './pipes/format-date.pipe';
   ```

## Ejemplo de Uso

```typescript
// En cualquier componente
import { SearchInputComponent } from '@shared';
// o
import { SearchInputComponent } from '../../shared/components/search-input/search-input.component';
```

## Cuándo usar Shared vs Features

- **Shared**: Componentes que se usan en 2+ features diferentes
- **Features**: Componentes específicos de una funcionalidad

## Directivas disponibles

Todas standalone, exportadas por el barrel `index.ts`:

| Directiva | Selector | Qué hace |
|---|---|---|
| `CanDirective` | `[appCan]` | Muestra/oculta contenido según las capacidades del usuario (permisos). |
| `ScrollLockDirective` | `[appScrollLock]` | Bloquea el scroll del `body` mientras el host esté en el DOM. Usa `ScrollLockService` con conteo de referencias (modales apilados) y compensa el ancho de la scrollbar. |
| `BodyPortalDirective` | `[appBodyPortal]` | Mueve el host a `document.body` mientras vive. Necesario para overlays `fixed` cuyo ancestro tiene `transform`/`zoom` y recortaría el backdrop. |

`ScrollLockDirective` y `BodyPortalDirective` son las que estabilizan los modales de la app — el detalle del patrón está en [docs/UI_RULES.md](../../../docs/UI_RULES.md#overlays-y-modales-scroll-lock--portal-al-body).
