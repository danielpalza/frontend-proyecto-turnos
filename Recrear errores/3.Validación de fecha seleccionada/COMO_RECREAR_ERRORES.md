# Cómo Recrear Errores - Validación de Fecha Seleccionada

Este documento proporciona instrucciones para probar el comportamiento actual del sistema respecto a la validación de fechas.

**Referencia**: `3.Validación de fecha seleccionada.md`

**Nota importante**: El sistema **NO restringe** fechas pasadas por diseño. Este documento documenta cómo probar el comportamiento actual.

---

## 🔧 Métodos de Testing

### Método 1: Probar con el Calendario
### Método 2: Probar con Fechas Específicas
### Método 3: Probar con API Directa (Postman/cURL)

---

## 📋 Casos de Prueba - Comportamiento Actual

### 1. Crear Turno con Fecha de Hoy

**Comportamiento esperado**: ✅ Debe crear correctamente

**Pasos para recrear**:
1. Abrir la aplicación
2. Ir a la vista de turnos
3. Hacer clic en la fecha de hoy en el calendario
4. Hacer clic en "Nuevo Turno"
5. Llenar los datos del turno
6. Hacer clic en "Guardar"

**Resultado esperado**:
- ✅ Turno creado exitosamente
- ✅ Notificación de éxito
- ✅ Turno aparece en el calendario

---

### 2. Crear Turno con Fecha Pasada

**Comportamiento esperado**: ✅ Debe crear correctamente (por diseño)

**Pasos para recrear**:
1. Abrir la aplicación
2. Ir a la vista de turnos
3. Navegar al mes anterior usando las flechas del calendario
4. Seleccionar una fecha pasada (ej: ayer o hace una semana)
5. Hacer clic en "Nuevo Turno"
6. Llenar los datos del turno
7. Hacer clic en "Guardar"

**Resultado esperado**:
- ✅ Turno creado exitosamente (NO debe dar error)
- ✅ Notificación de éxito
- ✅ Turno aparece en el calendario en la fecha pasada seleccionada

**Nota**: Este comportamiento es intencional. El sistema permite crear turnos en fechas pasadas por diseño.

---

### 3. Crear Turno con Fecha Futura

**Comportamiento esperado**: ✅ Debe crear correctamente

**Pasos para recrear**:
1. Abrir la aplicación
2. Ir a la vista de turnos
3. Navegar a un mes futuro usando las flechas del calendario
4. Seleccionar una fecha futura
5. Hacer clic en "Nuevo Turno"
6. Llenar los datos del turno
7. Hacer clic en "Guardar"

**Resultado esperado**:
- ✅ Turno creado exitosamente
- ✅ Notificación de éxito
- ✅ Turno aparece en el calendario en la fecha futura seleccionada

---

### 4. Crear Turno con Fecha Muy Futura

**Comportamiento esperado**: ✅ Debe crear correctamente (sin límite)

**Pasos para recrear**:
1. Abrir la aplicación
2. Ir a la vista de turnos
3. Navegar a un año futuro usando las flechas del calendario
4. Seleccionar una fecha muy futura (ej: 1 año en el futuro)
5. Hacer clic en "Nuevo Turno"
6. Llenar los datos del turno
7. Hacer clic en "Guardar"

**Resultado esperado**:
- ✅ Turno creado exitosamente
- ✅ No hay límite de fecha futura
- ✅ Turno aparece en el calendario

---

### 5. Intentar Crear Turno Sin Fecha

**Comportamiento esperado**: ❌ Debe mostrar error

**Pasos para recrear**:
1. Abrir la aplicación
2. Ir a la vista de turnos
3. Hacer clic en "Nuevo Turno" sin seleccionar fecha primero
4. Llenar los datos del turno
5. Hacer clic en "Guardar"

**Resultado esperado**:
- ❌ Notificación de advertencia: "Por favor, seleccione una fecha para el turno."
- ❌ El turno NO se crea
- ✅ El diálogo permanece abierto

**Código que valida esto**:
```typescript
// En turnos-view.component.ts
if (!this.selectedDate) {
  this.notification.showWarning('Por favor, seleccione una fecha para el turno.');
  return;
}
```

---

## 🧪 Testing con API Directa

### Crear Turno con Fecha Pasada (cURL)

**Comando**:
```bash
curl -X POST http://localhost:8080/api/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": 1,
    "profesionalId": 1,
    "fecha": "2024-01-01",
    "hora": "10:00:00",
    "estado": "PENDIENTE"
  }'
```

**Resultado esperado**:
- ✅ Debe crear el turno exitosamente (201 Created)
- ✅ NO debe devolver error 400 Bad Request
- ✅ La fecha pasada es aceptada

**Respuesta esperada**:
```json
{
  "id": 123,
  "patientId": 1,
  "profesionalId": 1,
  "fecha": "2024-01-01",
  "hora": "10:00:00",
  "estado": "PENDIENTE"
}
```

---

### Crear Turno con Fecha Futura (cURL)

**Comando**:
```bash
curl -X POST http://localhost:8080/api/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": 1,
    "profesionalId": 1,
    "fecha": "2026-12-31",
    "hora": "10:00:00",
    "estado": "PENDIENTE"
  }'
```

**Resultado esperado**:
- ✅ Debe crear el turno exitosamente
- ✅ No hay límite de fecha futura

---

### Crear Turno Sin Fecha (cURL)

**Comando**:
```bash
curl -X POST http://localhost:8080/api/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": 1,
    "profesionalId": 1,
    "hora": "10:00:00",
    "estado": "PENDIENTE"
  }'
```

**Resultado esperado**:
- ❌ Debe devolver error 400 Bad Request
- ❌ Mensaje: "La fecha es obligatoria"

**Respuesta esperada**:
```json
{
  "timestamp": "2025-01-15T10:30:00",
  "status": 400,
  "error": "Validation Error",
  "message": "La fecha es obligatoria",
  "errors": {
    "fecha": "La fecha es obligatoria"
  }
}
```

---

## 🔍 Verificación de Validaciones

### Validaciones que SÍ existen:

1. ✅ **Fecha no nula**:
   - Backend: `@NotNull` en `AppointmentDTO.fecha`
   - Frontend: Validación en `onCreateAppointment()`

### Validaciones que NO existen (por diseño):

1. ❌ **Fecha no pasada**: NO implementada
2. ❌ **Límite de fecha futura**: NO implementada
3. ❌ **Deshabilitar fechas pasadas en calendario**: NO implementada

---

## 🧪 Checklist de Testing

### Casos que funcionan correctamente:

- [ ] Crear turno con fecha de hoy → Debe crear correctamente
- [ ] Crear turno con fecha pasada → Debe crear correctamente (por diseño)
- [ ] Crear turno con fecha futura → Debe crear correctamente
- [ ] Crear turno con fecha muy futura → Debe crear correctamente
- [ ] Seleccionar fecha pasada en calendario → Debe ser posible
- [ ] Navegar a meses pasados → Debe ser posible
- [ ] Intentar crear turno sin fecha → Debe mostrar error

---

## 🔍 Verificación Visual

Al probar cada caso, verificar:

1. ✅ El calendario permite seleccionar cualquier fecha
2. ✅ No hay fechas deshabilitadas visualmente
3. ✅ Todas las fechas son clickeables
4. ✅ No hay mensajes de error al seleccionar fechas pasadas
5. ✅ Los turnos se crean correctamente en cualquier fecha
6. ✅ El único error es cuando no se selecciona fecha

---

## ⚠️ Notas Importantes

1. **Comportamiento intencional**: El sistema permite fechas pasadas por diseño
2. **No es un bug**: La falta de restricción de fechas pasadas es una decisión de diseño
3. **Validación básica**: Solo se valida que la fecha no sea `null`
4. **Flexibilidad**: El sistema se adapta a diferentes casos de uso

---

## 🎯 Casos Especiales a Probar

### 1. Crear Turno en Fecha Pasada para Registro Retroactivo
**Comportamiento esperado**: ✅ Debe funcionar

**Escenario**: Un usuario necesita registrar un turno que ocurrió ayer pero no se registró en su momento.

**Cómo probar**:
- Seleccionar fecha de ayer
- Crear turno normalmente
- Verificar que se crea exitosamente

---

### 2. Crear Múltiples Turnos en Fechas Pasadas
**Comportamiento esperado**: ✅ Debe funcionar

**Escenario**: Registrar varios turnos que ya ocurrieron.

**Cómo probar**:
- Crear varios turnos en diferentes fechas pasadas
- Verificar que todos se crean correctamente
- Verificar que aparecen en el calendario

---

### 3. Navegar Entre Meses Pasados y Futuros
**Comportamiento esperado**: ✅ Debe funcionar sin restricciones

**Escenario**: Usuario navega libremente por el calendario.

**Cómo probar**:
- Navegar a meses pasados
- Navegar a meses futuros
- Seleccionar fechas en cualquier mes
- Verificar que no hay restricciones

---

## 📝 Ejemplo de Testing Completo

### Flujo completo de creación con fecha pasada:

1. **Preparación**:
   - Asegurarse de tener al menos 1 profesional creado
   - Asegurarse de tener al menos 1 paciente creado

2. **Navegar a fecha pasada**:
   - Abrir aplicación → Vista de turnos
   - Hacer clic en flecha izquierda del calendario (mes anterior)
   - Seleccionar una fecha pasada (ej: hace 1 semana)

3. **Crear turno**:
   - Clic en "Nuevo Turno"
   - Seleccionar paciente existente
   - Seleccionar profesional
   - Seleccionar hora
   - Clic en "Guardar"

4. **Verificar resultado**:
   - ✅ Toast de éxito aparece
   - ✅ Turno creado exitosamente
   - ✅ Turno aparece en el calendario en la fecha pasada
   - ✅ NO hay error de fecha pasada

---

## 🔧 Herramientas Recomendadas

1. **Navegador**: Para probar la UI del calendario
2. **Postman**: Para probar endpoints directamente
3. **cURL**: Para scripts automatizados
4. **Chrome DevTools**: Para ver peticiones HTTP y respuestas

---

## ✅ Resultados Esperados por Caso

| Caso | Código HTTP | Mensaje | Turno Creado |
|------|-------------|---------|--------------|
| Fecha de hoy | 201 Created | "Turno creado correctamente" | ✅ Sí |
| Fecha pasada | 201 Created | "Turno creado correctamente" | ✅ Sí |
| Fecha futura | 201 Created | "Turno creado correctamente" | ✅ Sí |
| Fecha muy futura | 201 Created | "Turno creado correctamente" | ✅ Sí |
| Sin fecha | 400 Bad Request | "La fecha es obligatoria" | ❌ No |

---

## 📚 Referencias

- **Documento de decisión**: `3.Validación de fecha seleccionada.md`
- **Análisis original**: `ANALISIS_ERRORES_TURNOS_VIEW.md` (Punto 3)

---

## 💡 Nota Final

Este documento documenta el comportamiento **actual** del sistema, que permite crear turnos en cualquier fecha (pasada, presente o futura). Si en el futuro se requiere restringir fechas pasadas, se puede implementar siguiendo las referencias del documento principal.

