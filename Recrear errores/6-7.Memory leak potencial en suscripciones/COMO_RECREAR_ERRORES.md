# Cómo Recrear Errores - Memory Leak Potencial en Suscripciones

Este documento proporciona instrucciones paso a paso para verificar que la protección contra memory leaks en suscripciones funciona correctamente.

**Referencia**: `6.Memory leak potencial en suscripciones.md`

---

## 🔧 Métodos de Testing

### Método 1: Probar con Navegación Rápida
### Método 2: Usar Chrome DevTools Memory Profiler
### Método 3: Verificar en Consola del Navegador

---

## 📋 Casos de Prueba - Verificación de Protección

### 1. Navegar Durante Carga Inicial

**Comportamiento esperado**: ✅ Todas las suscripciones se cancelan automáticamente

**Pasos para recrear**:
1. Abrir la aplicación
2. Ir a la vista de turnos
3. **Inmediatamente** (antes de que terminen de cargar los datos) navegar a otra página
4. Verificar en consola que no hay errores

**Resultado esperado**:
- ✅ No hay errores en consola
- ✅ No hay advertencias sobre suscripciones no desuscritas
- ✅ Las suscripciones se cancelan automáticamente
- ✅ No hay memory leaks

**Verificación en consola del navegador**:
- ✅ No debe aparecer: "Warning: Subscription not unsubscribed"
- ✅ No debe aparecer: "Memory leak detected"
- ✅ No debe haber errores relacionados con componentes destruidos

---

### 2. Navegar Durante Creación de Turno

**Comportamiento esperado**: ✅ Suscripción se cancela automáticamente

**Pasos para recrear**:
1. Abrir la aplicación
2. Ir a la vista de turnos
3. Seleccionar una fecha
4. Hacer clic en "Agregar turno"
5. Llenar el formulario
6. Hacer clic en "Guardar"
7. **Inmediatamente** (antes de que termine la operación) navegar a otra página

**Resultado esperado**:
- ✅ No hay errores en consola
- ✅ La suscripción de creación se cancela automáticamente
- ✅ No hay intentos de actualizar el componente destruido
- ✅ No hay memory leaks

**Verificación en consola**:
```javascript
// No debe aparecer:
// - "Cannot read property 'appointments' of null"
// - "Cannot read property 'isLoading' of null"
// - Cualquier error relacionado con actualizar propiedades de componente destruido
```

---

### 3. Navegar Durante Eliminación de Turno

**Comportamiento esperado**: ✅ Suscripción se cancela automáticamente

**Pasos para recrear**:
1. Abrir la aplicación
2. Ir a la vista de turnos
3. Seleccionar una fecha con turnos
4. Hacer clic en eliminar un turno
5. Confirmar eliminación
6. **Inmediatamente** (antes de que termine la operación) navegar a otra página

**Resultado esperado**:
- ✅ No hay errores en consola
- ✅ La suscripción de eliminación se cancela automáticamente
- ✅ No hay intentos de actualizar el componente destruido
- ✅ No hay memory leaks

---

### 4. Múltiples Navegaciones Rápidas

**Comportamiento esperado**: ✅ No hay acumulación de suscripciones

**Pasos para recrear**:
1. Abrir la aplicación
2. Navegar rápidamente entre páginas (5-10 veces)
3. Volver a la vista de turnos
4. Verificar que todo funciona correctamente

**Resultado esperado**:
- ✅ No hay degradación de rendimiento
- ✅ No hay acumulación de suscripciones
- ✅ La aplicación funciona normalmente
- ✅ No hay memory leaks

**Verificación con Chrome DevTools**:
1. Abrir Chrome DevTools (F12)
2. Ir a la pestaña "Memory"
3. Tomar un "Heap Snapshot" antes de las navegaciones
4. Realizar múltiples navegaciones
5. Tomar otro "Heap Snapshot" después
6. Comparar: No debe haber crecimiento significativo de memoria

---

### 5. Sesión Larga

**Comportamiento esperado**: ✅ No hay degradación de rendimiento

**Pasos para recrear**:
1. Abrir la aplicación
2. Usar la aplicación durante 30-60 minutos
3. Realizar múltiples operaciones (crear, eliminar turnos)
4. Navegar entre páginas múltiples veces
5. Verificar rendimiento

**Resultado esperado**:
- ✅ No hay degradación de rendimiento
- ✅ La aplicación sigue siendo responsive
- ✅ No hay memory leaks acumulativos
- ✅ El uso de memoria se mantiene estable

**Verificación con Chrome DevTools**:
1. Abrir Chrome DevTools (F12)
2. Ir a la pestaña "Performance"
3. Iniciar grabación
4. Usar la aplicación durante varios minutos
5. Detener grabación
6. Verificar: No debe haber crecimiento constante de memoria

---

## 🔍 Verificación de Código

### Verificar que `takeUntil` está Implementado

**En `turnos-view.component.ts`**:

```typescript
// Debe existir:
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// Debe existir:
private destroy$ = new Subject<void>();

// Todas las suscripciones deben tener:
.pipe(takeUntil(this.destroy$))

// ngOnDestroy debe tener:
ngOnDestroy(): void {
  this.destroy$.next();
  this.destroy$.complete();
  this.subscriptions.unsubscribe();
}
```

### Verificar Todas las Suscripciones

**Comando para buscar**:
```bash
# Buscar todas las suscripciones
grep -n "\.subscribe" turnos-view.component.ts

# Verificar que todas tengan takeUntil
grep -n "takeUntil" turnos-view.component.ts
```

**Resultado esperado**: Todas las suscripciones deben tener `takeUntil(this.destroy$)` antes de `.subscribe()`.

---

## 🧪 Testing con Chrome DevTools

### 1. Memory Profiler

**Pasos**:
1. Abrir Chrome DevTools (F12)
2. Ir a la pestaña "Memory"
3. Seleccionar "Heap Snapshot"
4. Tomar snapshot inicial
5. Realizar operaciones (crear turnos, navegar, etc.)
6. Tomar snapshot después
7. Comparar snapshots

**Resultado esperado**:
- ✅ No debe haber crecimiento significativo de objetos `Subscription`
- ✅ No debe haber crecimiento de objetos `Subject`
- ✅ El uso de memoria debe ser estable

### 2. Performance Monitor

**Pasos**:
1. Abrir Chrome DevTools (F12)
2. Ir a la pestaña "Performance"
3. Hacer clic en "Record"
4. Realizar múltiples navegaciones y operaciones
5. Detener grabación
6. Analizar el gráfico de memoria

**Resultado esperado**:
- ✅ La línea de memoria no debe crecer constantemente
- ✅ Debe haber liberación de memoria cuando se navega
- ✅ No debe haber "sawtooth" pattern (crecimiento constante)

---

## 🔍 Verificación de Protección

### Verificar que las Suscripciones se Cancelan

**Método 1: Agregar Logs Temporales**

Agregar temporalmente en `ngOnDestroy()`:
```typescript
ngOnDestroy(): void {
  console.log('Componente destruyéndose, cancelando suscripciones...');
  this.destroy$.next();
  this.destroy$.complete();
  console.log('Suscripciones canceladas');
  this.subscriptions.unsubscribe();
}
```

**Resultado esperado**:
- ✅ Los logs aparecen cuando se navega
- ✅ No hay errores después de los logs

**Método 2: Verificar en Network Tab**

1. Abrir Chrome DevTools (F12)
2. Ir a la pestaña "Network"
3. Iniciar una operación (crear turno)
4. Navegar a otra página antes de que termine
5. Verificar que la petición se cancela (status: "canceled")

**Resultado esperado**:
- ✅ La petición HTTP aparece como "canceled" en Network tab
- ✅ No hay errores en consola relacionados

---

## 🧪 Checklist de Testing

### Casos que funcionan correctamente:

- [ ] Navegar durante carga inicial → Suscripciones se cancelan
- [ ] Navegar durante creación de turno → Suscripción se cancela
- [ ] Navegar durante eliminación de turno → Suscripción se cancela
- [ ] Múltiples navegaciones rápidas → No hay acumulación
- [ ] Sesión larga → No hay degradación de rendimiento
- [ ] Verificar código → Todas las suscripciones tienen takeUntil
- [ ] Memory profiler → No hay crecimiento de memoria
- [ ] Performance monitor → Memoria se libera correctamente

---

## 🔍 Verificación Visual

Al probar cada caso, verificar:

1. ✅ No hay errores en la consola del navegador
2. ✅ No hay advertencias sobre suscripciones no desuscritas
3. ✅ La aplicación funciona normalmente después de navegar
4. ✅ No hay degradación de rendimiento
5. ✅ El uso de memoria se mantiene estable

---

## ⚠️ Notas Importantes

1. **Memory leaks son difíciles de detectar visualmente**: Requieren herramientas como Chrome DevTools
2. **El patrón `takeUntil` es preventivo**: Cancela suscripciones antes de que causen problemas
3. **Las suscripciones de una sola vez**: Aunque completan rápido, aún pueden causar leaks si el componente se destruye durante la operación
4. **Sesiones largas**: Son el mejor test para verificar que no hay leaks acumulativos

---

## 🎯 Casos Especiales a Probar

### 1. Navegar Mientras Múltiples Operaciones Están en Curso
**Comportamiento esperado**: Todas las suscripciones se cancelan

**Cómo probar**:
- Iniciar creación de turno
- Iniciar eliminación de otro turno
- Navegar inmediatamente
- Verificar que ambas suscripciones se cancelan

---

### 2. Navegar Durante Error de Red
**Comportamiento esperado**: Suscripción se cancela incluso durante error

**Cómo probar**:
- Desconectar internet
- Iniciar operación (crear turno)
- Navegar a otra página
- Verificar que no hay errores adicionales

---

### 3. Múltiples Instancias del Componente
**Comportamiento esperado**: Cada instancia gestiona sus suscripciones independientemente

**Cómo probar**:
- Abrir la aplicación en múltiples pestañas
- Realizar operaciones en cada una
- Cerrar pestañas
- Verificar que no hay leaks

---

## 📝 Ejemplo de Testing Completo

### Flujo completo de verificación:

1. **Preparación**:
   - Abrir Chrome DevTools (F12)
   - Ir a la pestaña "Memory"
   - Tomar "Heap Snapshot" inicial

2. **Operaciones**:
   - Navegar a vista de turnos
   - Crear varios turnos
   - Eliminar algunos turnos
   - Navegar entre páginas múltiples veces

3. **Verificación**:
   - Tomar "Heap Snapshot" final
   - Comparar snapshots
   - Verificar que no hay crecimiento significativo

4. **Resultado esperado**:
   - ✅ No hay crecimiento de objetos Subscription
   - ✅ No hay crecimiento de objetos Subject
   - ✅ Memoria se libera correctamente

---

## 🔧 Herramientas Recomendadas

1. **Chrome DevTools Memory Profiler**: Para detectar memory leaks
2. **Chrome DevTools Performance Monitor**: Para ver uso de memoria en tiempo real
3. **Angular DevTools**: Para inspeccionar componentes y suscripciones
4. **RxJS DevTools** (si está disponible): Para ver suscripciones activas

---

## ✅ Resultados Esperados por Caso

| Caso | Errores en Consola | Memory Leak | Suscripciones Activas |
|------|-------------------|-------------|----------------------|
| Navegar durante carga | ❌ No | ❌ No | ✅ Todas canceladas |
| Navegar durante creación | ❌ No | ❌ No | ✅ Cancelada |
| Navegar durante eliminación | ❌ No | ❌ No | ✅ Cancelada |
| Múltiples navegaciones | ❌ No | ❌ No | ✅ Todas canceladas |
| Sesión larga | ❌ No | ❌ No | ✅ Estable |

---

## 📚 Referencias

- **Documento de implementación**: `6.Memory leak potencial en suscripciones.md`
- **Análisis original**: `ANALISIS_ERRORES_TURNOS_VIEW.md` (Punto 6)
- **RxJS Documentation**: [takeUntil operator](https://rxjs.dev/api/operators/takeUntil)
- **Angular Best Practices**: Gestión de suscripciones

---

## 💡 Nota Final

Este documento documenta el comportamiento **actual** del sistema, que previene completamente memory leaks usando el patrón `takeUntil` con `Subject`. La implementación es robusta y sigue las mejores prácticas de Angular moderno.

