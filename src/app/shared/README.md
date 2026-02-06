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
