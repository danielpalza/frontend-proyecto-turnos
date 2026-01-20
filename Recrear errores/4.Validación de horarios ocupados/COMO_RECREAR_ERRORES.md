# Cómo Recrear Errores - Validación de Horarios Ocupados

Este documento proporciona instrucciones paso a paso para recrear y probar todos los casos relacionados con la validación de horarios ocupados.

**Referencia**: `4.Validación de horarios ocupados.md`

---

## 🔧 Métodos de Testing

### Método 1: Crear Turnos Duplicados Manualmente
### Método 2: Usar Herramientas de Desarrollo (Postman, cURL)
### Método 3: Probar con Múltiples Usuarios Simultáneos

---

## 📋 Casos de Prueba - Validación de Horario Ocupado

### 1. Crear Turno con Horario Ocupado

**Comportamiento esperado**: ❌ Debe devolver error 409 Conflict

**Pasos para recrear**:
1. Crear un turno para:
   - Profesional: ID 1 (o cualquier profesional existente)
   - Fecha: "2024-01-15"
   - Hora: "10:00:00"
2. Intentar crear otro turno con los mismos datos:
   - Mismo profesional
   - Misma fecha
   - Misma hora

**Resultado esperado**:
- ✅ Backend devuelve `409 Conflict`
- ✅ Mensaje: "El horario seleccionado ya está ocupado. Por favor, elija otro horario."
- ✅ Frontend muestra notificación toast roja
- ✅ El turno NO se crea
- ✅ El diálogo permanece abierto (permite elegir otro horario)

**Verificación en consola del navegador**:
```javascript
// Debería aparecer en la consola:
Error creating appointment: HttpErrorResponse {
  status: 409,
  error: {
    message: "El horario seleccionado ya está ocupado. Por favor, elija otro horario."
  }
}
```

---

#### Usando Postman/cURL

**Comando cURL**:
```bash
# Crear primer turno
curl -X POST http://localhost:8080/api/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": 1,
    "profesionalId": 1,
    "fecha": "2024-01-15",
    "hora": "10:00:00",
    "estado": "PENDIENTE"
  }'

# Intentar crear segundo turno con mismo horario
curl -X POST http://localhost:8080/api/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": 2,
    "profesionalId": 1,
    "fecha": "2024-01-15",
    "hora": "10:00:00",
    "estado": "PENDIENTE"
  }'
```

**Resultado esperado del segundo comando**:
```json
{
  "timestamp": "2024-01-15T10:30:00",
  "status": 409,
  "error": "Conflict",
  "message": "El horario seleccionado ya está ocupado. Por favor, elija otro horario."
}
```

---

### 2. Actualizar Turno a Horario Ocupado

**Comportamiento esperado**: ❌ Debe devolver error 409 Conflict

**Pasos para recrear**:
1. Crear turno A:
   - Profesional: ID 1
   - Fecha: "2024-01-15"
   - Hora: "10:00:00"
2. Crear turno B:
   - Profesional: ID 1
   - Fecha: "2024-01-15"
   - Hora: "11:00:00"
3. Intentar actualizar turno B al horario del turno A (10:00:00)

**Comando cURL**:
```bash
# Actualizar turno B al horario de turno A
curl -X PUT http://localhost:8080/api/appointments/2 \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": 2,
    "profesionalId": 1,
    "fecha": "2024-01-15",
    "hora": "10:00:00",
    "estado": "PENDIENTE"
  }'
```

**Resultado esperado**:
- ✅ Backend devuelve `409 Conflict`
- ✅ Mensaje: "El horario seleccionado ya está ocupado. Por favor, elija otro horario."
- ✅ El turno B NO se actualiza
- ✅ El turno A mantiene su horario original

**Nota importante**: Si se actualiza el turno A a su mismo horario (10:00:00), debería funcionar correctamente porque se excluye el turno actual de la validación.

---

### 3. Cambiar Hora de Turno a Horario Ocupado

**Comportamiento esperado**: ❌ Debe devolver error 409 Conflict

**Pasos para recrear**:
1. Crear turno A:
   - Profesional: ID 1
   - Fecha: "2024-01-15"
   - Hora: "10:00:00"
2. Crear turno B:
   - Profesional: ID 1
   - Fecha: "2024-01-15"
   - Hora: "11:00:00"
3. Actualizar solo la hora del turno B a "10:00:00" (usando PATCH)

**Comando cURL**:
```bash
curl -X PATCH http://localhost:8080/api/appointments/2 \
  -H "Content-Type: application/json" \
  -d '{
    "hora": "10:00:00"
  }'
```

**Resultado esperado**:
- ✅ Backend devuelve `409 Conflict`
- ✅ Mensaje: "El horario seleccionado ya está ocupado. Por favor, elija otro horario."
- ✅ La hora del turno B NO se actualiza

---

### 4. Crear Turno con Horario Disponible

**Comportamiento esperado**: ✅ Debe crear correctamente

**Pasos para recrear**:
1. Crear turno para:
   - Profesional: ID 1
   - Fecha: "2024-01-15"
   - Hora: "10:00:00"
2. Crear otro turno para:
   - Mismo profesional: ID 1
   - Misma fecha: "2024-01-15"
   - Diferente hora: "11:00:00"

**Resultado esperado**:
- ✅ Ambos turnos se crean exitosamente
- ✅ No hay error 409 Conflict
- ✅ Ambos turnos aparecen en el calendario

---

### 5. Actualizar Turno a su Mismo Horario

**Comportamiento esperado**: ✅ Debe actualizar correctamente

**Pasos para recrear**:
1. Crear turno:
   - Profesional: ID 1
   - Fecha: "2024-01-15"
   - Hora: "10:00:00"
2. Actualizar el mismo turno manteniendo el mismo horario

**Comando cURL**:
```bash
curl -X PUT http://localhost:8080/api/appointments/1 \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": 1,
    "profesionalId": 1,
    "fecha": "2024-01-15",
    "hora": "10:00:00",
    "estado": "PENDIENTE"
  }'
```

**Resultado esperado**:
- ✅ Turno se actualiza sin error
- ✅ No hay error 409 Conflict (excluye el turno actual)
- ✅ El horario se mantiene igual

---

### 6. Crear Turno sin Profesional

**Comportamiento esperado**: ✅ Debe crear correctamente (validación no aplica)

**Pasos para recrear**:
1. Crear turno sin seleccionar profesional
2. Seleccionar fecha y hora
3. Guardar

**Resultado esperado**:
- ✅ Turno se crea exitosamente
- ✅ No se valida horario ocupado (profesional es NULL)
- ✅ No hay error 409 Conflict

---

### 7. Crear Turno sin Hora

**Comportamiento esperado**: ✅ Debe crear correctamente (validación no aplica)

**Pasos para recrear**:
1. Crear turno sin especificar hora
2. Seleccionar profesional y fecha
3. Guardar

**Resultado esperado**:
- ✅ Turno se crea exitosamente
- ✅ No se valida horario ocupado (hora es NULL)
- ✅ No hay error 409 Conflict

---

## 🧪 Testing con Scripts Automatizados

### Script de Prueba con cURL (Bash)

```bash
#!/bin/bash

BASE_URL="http://localhost:8080/api"
PROFESIONAL_ID=1
FECHA="2024-01-15"
HORA="10:00:00"

echo "Creando primer turno..."
RESPONSE1=$(curl -s -X POST "$BASE_URL/appointments" \
  -H "Content-Type: application/json" \
  -d "{
    \"patientId\": 1,
    \"profesionalId\": $PROFESIONAL_ID,
    \"fecha\": \"$FECHA\",
    \"hora\": \"$HORA\",
    \"estado\": \"PENDIENTE\"
  }")

echo "Respuesta 1: $RESPONSE1"

echo -e "\nIntentando crear segundo turno con mismo horario..."
RESPONSE2=$(curl -s -w "\nHTTP Status: %{http_code}\n" -X POST "$BASE_URL/appointments" \
  -H "Content-Type: application/json" \
  -d "{
    \"patientId\": 2,
    \"profesionalId\": $PROFESIONAL_ID,
    \"fecha\": \"$FECHA\",
    \"hora\": \"$HORA\",
    \"estado\": \"PENDIENTE\"
  }")

echo "Respuesta 2: $RESPONSE2"

# Verificar que el segundo request devuelve 409
if echo "$RESPONSE2" | grep -q "409"; then
  echo -e "\n✅ TEST PASADO: El segundo turno correctamente rechazado con 409"
else
  echo -e "\n❌ TEST FALLIDO: El segundo turno no fue rechazado"
fi
```

---

## 🔍 Verificación de Validación en Backend

### Verificar que el método existe en Repository

```java
// En AppointmentRepository.java
// Debe existir:
boolean existsByProfesionalIdAndFechaAndHora(
    Long profesionalId,
    LocalDate fecha,
    LocalTime hora
);
```

### Verificar que la validación está en el Service

```java
// En AppointmentService.create()
// Debe existir la validación antes de save():
if (dto.getProfesionalId() != null && dto.getFecha() != null && dto.getHora() != null) {
    boolean horarioOcupado = appointmentRepository.existsByProfesionalIdAndFechaAndHora(...);
    if (horarioOcupado) {
        throw new DuplicateResourceException(...);
    }
}
```

---

## 🧪 Checklist de Testing

### Validación de Horario Ocupado
- [ ] Crear turno con horario disponible → Debe crear correctamente
- [ ] Crear turno con horario ocupado → Debe devolver 409 Conflict
- [ ] Actualizar turno a horario disponible → Debe actualizar correctamente
- [ ] Actualizar turno a horario ocupado → Debe devolver 409 Conflict
- [ ] Actualizar hora de turno a horario ocupado → Debe devolver 409 Conflict
- [ ] Crear turno sin profesional → Debe crear (validación no aplica)
- [ ] Crear turno sin hora → Debe crear (validación no aplica)
- [ ] Actualizar turno a su mismo horario → Debe actualizar (excluye turno actual)

---

## 🔍 Verificación Visual

Al probar cada caso, verificar:

1. ✅ La notificación toast aparece centrada arriba
2. ✅ El color es rojo para errores
3. ✅ El mensaje es claro y específico:
   - "El horario seleccionado ya está ocupado. Por favor, elija otro horario."
4. ✅ El mensaje corresponde al código HTTP 409 Conflict
5. ✅ La notificación desaparece después de 5 segundos
6. ✅ Se puede cerrar manualmente con el botón X
7. ✅ No hay errores en la consola del navegador
8. ✅ El estado `isLoading` se resetea correctamente
9. ✅ Los diálogos permanecen abiertos en caso de error

---

## 🎯 Casos Especiales a Probar

### 1. Turno sin Profesional
**Comportamiento esperado**: La validación NO aplica (profesional_id es NULL)

**Cómo probar**:
- Crear turno sin seleccionar profesional
- Debe crear correctamente

### 2. Turno sin Hora
**Comportamiento esperado**: La validación NO aplica (hora es NULL)

**Cómo probar**:
- Crear turno sin especificar hora
- Debe crear correctamente

### 3. Actualizar Turno a su Mismo Horario
**Comportamiento esperado**: Debe actualizar correctamente (excluye turno actual)

**Cómo probar**:
- Crear turno con horario 10:00
- Actualizar el mismo turno manteniendo horario 10:00
- Debe actualizar sin error

### 4. Múltiples Turnos en Diferentes Horarios
**Comportamiento esperado**: Debe permitir crear múltiples turnos del mismo profesional en diferentes horarios

**Cómo probar**:
- Crear turno para Profesional 1, fecha 2024-01-15, hora 10:00
- Crear turno para Profesional 1, fecha 2024-01-15, hora 11:00
- Ambos deben crearse correctamente

---

## ⚠️ Notas Importantes

1. **Datos de prueba**: Asegurarse de tener profesionales y pacientes creados antes de probar
2. **Limpiar datos**: Después de las pruebas, eliminar los turnos de prueba creados
3. **Constraint de BD**: Si el constraint único está aplicado, los errores serán más robustos
4. **Logs del backend**: Revisar los logs del servidor para ver las validaciones ejecutándose

---

## 🚀 Testing Avanzado

### Simular Race Condition Real

Para probar race conditions reales, se puede usar un script que haga múltiples peticiones simultáneamente:

```bash
#!/bin/bash

# Crear 10 turnos simultáneamente con el mismo horario
for i in {1..10}; do
  curl -X POST http://localhost:8080/api/appointments \
    -H "Content-Type: application/json" \
    -d "{
      \"patientId\": $i,
      \"profesionalId\": 1,
      \"fecha\": \"2024-01-15\",
      \"hora\": \"10:00:00\",
      \"estado\": \"PENDIENTE\"
    }" &
done

wait

# Verificar cuántos turnos se crearon
curl -X GET "http://localhost:8080/api/appointments/date/2024-01-15"
```

**Resultado esperado**: Solo 1 turno debe crearse, los otros 9 deben fallar con 409 Conflict.

---

## 📝 Ejemplo de Testing Completo

### Flujo completo de creación con horario ocupado:

1. **Preparación**:
   - Asegurarse de tener al menos 1 profesional creado
   - Asegurarse de tener al menos 1 paciente creado

2. **Crear primer turno**:
   - Abrir aplicación → Vista de turnos
   - Seleccionar fecha en calendario
   - Clic en "Nuevo Turno"
   - Seleccionar paciente existente
   - Seleccionar profesional
   - Seleccionar hora: "10:00"
   - Clic en "Guardar"
   - ✅ Verificar: Turno creado exitosamente

3. **Intentar crear segundo turno con mismo horario**:
   - Seleccionar misma fecha
   - Clic en "Nuevo Turno"
   - Seleccionar otro paciente (o mismo)
   - Seleccionar mismo profesional
   - Seleccionar misma hora: "10:00"
   - Clic en "Guardar"
   - ✅ Verificar: 
     - Toast rojo aparece
     - Mensaje: "El horario seleccionado ya está ocupado..."
     - Diálogo permanece abierto
     - Turno NO se crea

4. **Verificar en base de datos**:
   ```sql
   SELECT id, profesional_id, fecha, hora 
   FROM appointments 
   WHERE fecha = '2024-01-15' 
     AND hora = '10:00:00' 
     AND profesional_id = 1;
   ```
   - ✅ Debe haber solo 1 turno

---

## 🔧 Herramientas Recomendadas

1. **Postman**: Para probar endpoints directamente
2. **cURL**: Para scripts automatizados
3. **Chrome DevTools**: Para ver peticiones HTTP y respuestas
4. **Apache JMeter**: Para pruebas de carga y race conditions reales
5. **SQL Client**: Para verificar datos en base de datos

---

## ✅ Resultados Esperados por Caso

| Caso | Código HTTP | Mensaje | Diálogo | Turno Creado |
|------|-------------|---------|---------|--------------|
| Horario disponible | 201 Created | "Turno creado correctamente" | Se cierra | ✅ Sí |
| Horario ocupado | 409 Conflict | "El horario seleccionado ya está ocupado..." | Permanece abierto | ❌ No |
| Sin profesional | 201 Created | "Turno creado correctamente" | Se cierra | ✅ Sí |
| Sin hora | 201 Created | "Turno creado correctamente" | Se cierra | ✅ Sí |
| Actualizar a horario ocupado | 409 Conflict | "El horario seleccionado ya está ocupado..." | Permanece abierto | ❌ No actualiza |

---

## 📚 Referencias

- **Documento de implementación**: `4.Validación de horarios ocupados.md`
- **Resumen de cambios**: `bakend-proyecto-turnos/RESUMEN_CAMBIOS_VALIDACION_HORARIO.md`
- **Análisis original**: `ANALISIS_ERRORES_TURNOS_VIEW.md` (Punto 4)
- **Documentación relacionada**: `2.Race condition y validación de horario ocupado/2.Race condition y validación de horario ocupado.md`

