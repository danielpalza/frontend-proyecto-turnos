# Cómo Recrear Errores - Validación de DNI Duplicado al Crear Paciente

Este documento proporciona instrucciones paso a paso para verificar que la validación de DNI duplicado funciona correctamente.

**Referencia**: `8.Validación de DNI duplicado al crear paciente.md`

---

## 🔧 Métodos de Testing

### Método 1: Probar desde la Interfaz de Usuario
### Método 2: Probar con cURL o Postman
### Método 3: Verificar en Consola del Navegador

---

## 📋 Casos de Prueba - Verificación de Validación

### 1. Crear Paciente con DNI Duplicado

**Comportamiento esperado**: ✅ Backend retorna 409 Conflict, frontend muestra mensaje claro

**Pasos para recrear**:
1. Abrir la aplicación
2. Ir a la vista de turnos
3. Seleccionar una fecha
4. Hacer clic en "Agregar turno"
5. Completar el formulario con datos de un paciente nuevo
6. **Usar un DNI que ya existe** en la base de datos
7. Hacer clic en "Guardar"

**Resultado esperado**:
- ✅ El backend retorna error 409 Conflict
- ✅ Se muestra un toast de error con mensaje claro
- ✅ El mensaje debe decir: "Ya existe un paciente con DNI: {dni}"
- ✅ El paciente NO se crea
- ✅ El turno NO se crea
- ✅ El diálogo permanece abierto para que el usuario corrija el DNI

**Verificación en consola del navegador**:
```javascript
// Debe aparecer en consola:
// Error creating patient: HttpErrorResponse { status: 409, ... }
// Mensaje: "Ya existe un paciente con DNI: {dni}"
```

**Verificación en Network tab**:
- ✅ La petición POST a `/api/patients` debe retornar status 409
- ✅ El body de la respuesta debe contener:
  ```json
  {
    "timestamp": "...",
    "status": 409,
    "error": "Conflict",
    "message": "Ya existe un paciente con DNI: {dni}"
  }
  ```

---

### 2. Crear Paciente con DNI Nuevo

**Comportamiento esperado**: ✅ Paciente y turno se crean correctamente

**Pasos para recrear**:
1. Abrir la aplicación
2. Ir a la vista de turnos
3. Seleccionar una fecha
4. Hacer clic en "Agregar turno"
5. Completar el formulario con datos de un paciente nuevo
6. **Usar un DNI que NO existe** en la base de datos
7. Hacer clic en "Guardar"

**Resultado esperado**:
- ✅ El backend retorna 200 OK con el paciente creado
- ✅ Se muestra un toast de éxito: "Turno creado correctamente"
- ✅ El paciente se crea en la base de datos
- ✅ El turno se crea en la base de datos
- ✅ El diálogo se cierra
- ✅ El calendario se actualiza mostrando el nuevo turno

**Verificación en Network tab**:
- ✅ La petición POST a `/api/patients` debe retornar status 200
- ✅ El body de la respuesta debe contener el paciente creado con su ID

---

### 3. Actualizar Paciente con DNI Duplicado

**Comportamiento esperado**: ✅ Backend retorna 409 Conflict, frontend muestra mensaje claro

**Pasos para recrear** (requiere acceso a edición de pacientes):
1. Abrir la aplicación
2. Ir a la vista de pacientes (si existe) o usar API directamente
3. Seleccionar un paciente existente
4. Cambiar el DNI a uno que ya existe en otro paciente
5. Guardar los cambios

**Resultado esperado**:
- ✅ El backend retorna error 409 Conflict
- ✅ Se muestra un mensaje de error claro
- ✅ El paciente NO se actualiza
- ✅ El DNI original se mantiene

**Nota**: Este caso requiere acceso a la funcionalidad de edición de pacientes, que puede no estar disponible en la interfaz actual.

---

### 4. Actualizar Paciente sin Cambiar DNI

**Comportamiento esperado**: ✅ Actualización exitosa

**Pasos para recrear** (requiere acceso a edición de pacientes):
1. Abrir la aplicación
2. Ir a la vista de pacientes (si existe) o usar API directamente
3. Seleccionar un paciente existente
4. Cambiar otros campos (nombre, teléfono, etc.) pero mantener el mismo DNI
5. Guardar los cambios

**Resultado esperado**:
- ✅ El backend retorna 200 OK
- ✅ El paciente se actualiza correctamente
- ✅ No se valida duplicado porque el DNI no cambió

---

## 🔍 Testing con cURL

### Caso 1: Crear Paciente con DNI Duplicado

**Comando**:
```bash
curl -X POST http://localhost:8080/api/patients \
  -H "Content-Type: application/json" \
  -d '{
    "nombreApellido": "Juan Pérez",
    "dni": "30123456",
    "telefono": "1234567890",
    "email": "juan@example.com"
  }'
```

**Primera ejecución** (DNI no existe):
- ✅ Debe retornar 200 OK con el paciente creado

**Segunda ejecución** (mismo DNI):
- ✅ Debe retornar 409 Conflict
- ✅ Body debe contener:
  ```json
  {
    "timestamp": "...",
    "status": 409,
    "error": "Conflict",
    "message": "Ya existe un paciente con DNI: 30123456"
  }
  ```

### Caso 2: Verificar que el Mensaje es Claro

**Comando**:
```bash
curl -X POST http://localhost:8080/api/patients \
  -H "Content-Type: application/json" \
  -d '{
    "nombreApellido": "María García",
    "dni": "30123456",
    "telefono": "0987654321",
    "email": "maria@example.com"
  }' \
  -v
```

**Resultado esperado**:
- ✅ Status: 409 Conflict
- ✅ Mensaje en body: "Ya existe un paciente con DNI: 30123456"
- ✅ El mensaje debe ser claro y específico

---

## 🧪 Testing con Postman

### Colección de Pruebas

1. **Crear Paciente Nuevo**:
   - Método: POST
   - URL: `http://localhost:8080/api/patients`
   - Body (JSON):
     ```json
     {
       "nombreApellido": "Test Usuario",
       "dni": "99999999",
       "telefono": "1111111111",
       "email": "test@example.com"
     }
     ```
   - Resultado esperado: 200 OK

2. **Crear Paciente con DNI Duplicado**:
   - Método: POST
   - URL: `http://localhost:8080/api/patients`
   - Body (JSON):
     ```json
     {
       "nombreApellido": "Otro Usuario",
       "dni": "99999999",
       "telefono": "2222222222",
       "email": "otro@example.com"
     }
     ```
   - Resultado esperado: 409 Conflict con mensaje claro

---

## 🔍 Verificación de Código

### Verificar que el Backend Valida DNI

**En `PatientService.java`**:

```java
// Debe existir en create():
if (patientRepository.existsByDni(dto.getDni())) {
    throw new DuplicateResourceException("Ya existe un paciente con DNI: " + dto.getDni());
}

// Debe existir en update():
if (!patient.getDni().equals(dto.getDni()) && patientRepository.existsByDni(dto.getDni())) {
    throw new DuplicateResourceException("Ya existe un paciente con DNI: " + dto.getDni());
}
```

### Verificar que el Frontend Maneja el Error

**En `error-handler.service.ts`**:

```typescript
// Debe existir:
case 409:
  return this.getConflictMessage(backendMessage, context);

// Debe existir:
private getConflictMessage(backendMessage: string | null, context: string): string {
  if (backendMessage) {
    return backendMessage; // ✅ Usa el mensaje del backend
  }
  if (context.includes('paciente') || context.includes('crear el paciente')) {
    return 'Ya existe un paciente con este DNI. Por favor, verifique el número de documento.';
  }
  // ...
}
```

**En `turnos-view.component.ts`**:

```typescript
// Debe existir manejo de error:
error: (err) => {
  const message = this.errorHandler.getErrorMessage(err, 'crear el paciente');
  this.notification.showError(message);
  this.isLoading = false;
  console.error('Error creating patient:', err);
}
```

---

## 🧪 Casos de Prueba Detallados

### Caso 1: DNI Exacto Duplicado

**Escenario**: Intentar crear un paciente con un DNI que ya existe exactamente.

**Pasos**:
1. Crear un paciente con DNI "12345678"
2. Intentar crear otro paciente con DNI "12345678"

**Resultado esperado**:
- ✅ Error 409 Conflict
- ✅ Mensaje: "Ya existe un paciente con DNI: 12345678"

---

### Caso 2: DNI con Espacios o Formato Diferente

**Escenario**: Intentar crear un paciente con DNI que tiene espacios o formato diferente pero mismo número.

**Pasos**:
1. Crear un paciente con DNI "12345678"
2. Intentar crear otro paciente con DNI " 12345678 " (con espacios)

**Resultado esperado**:
- ⚠️ Depende de cómo se normalice el DNI en el backend
- ✅ Idealmente debería detectar el duplicado (si el backend normaliza espacios)
- ⚠️ Si no se normaliza, puede crear duplicado (mejora futura)

---

### Caso 3: Múltiples Intentos con Mismo DNI

**Escenario**: Intentar crear el mismo paciente múltiples veces rápidamente.

**Pasos**:
1. Hacer clic en "Guardar" múltiples veces rápidamente
2. Usar un DNI que ya existe

**Resultado esperado**:
- ✅ Todos los intentos deben retornar 409 Conflict
- ✅ Solo se muestra un mensaje de error (no múltiples)
- ✅ El diálogo no se cierra

---

### Caso 4: Crear Turno con Paciente Existente

**Escenario**: Crear un turno seleccionando un paciente existente (no crear nuevo paciente).

**Pasos**:
1. Abrir diálogo de crear turno
2. Seleccionar un paciente existente de la lista
3. Completar datos del turno
4. Guardar

**Resultado esperado**:
- ✅ No se intenta crear paciente nuevo
- ✅ Solo se crea el turno
- ✅ No hay validación de DNI (porque no se crea paciente)

---

## 🔍 Verificación en Base de Datos

### Verificar que No Hay Duplicados

**Query SQL**:
```sql
-- Buscar DNI duplicados
SELECT dni, COUNT(*) as cantidad
FROM patients
GROUP BY dni
HAVING COUNT(*) > 1;
```

**Resultado esperado**:
- ✅ No debe haber filas (no hay duplicados)
- ✅ Si hay filas, indica un problema en la validación

### Verificar Constraint UNIQUE

**Query SQL** (depende del motor de BD):
```sql
-- MySQL/MariaDB
SHOW CREATE TABLE patients;

-- PostgreSQL
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'patients' AND constraint_type = 'UNIQUE';
```

**Resultado esperado**:
- ✅ Debe existir constraint UNIQUE en columna `dni`
- ✅ Esto previene duplicados a nivel de base de datos

---

## 🧪 Checklist de Testing

### Casos que funcionan correctamente:

- [ ] Crear paciente con DNI duplicado → Error 409, mensaje claro
- [ ] Crear paciente con DNI nuevo → Paciente creado correctamente
- [ ] Mensaje de error es claro y específico
- [ ] El diálogo permanece abierto en caso de error
- [ ] El diálogo se cierra en caso de éxito
- [ ] Verificar código backend → Validación existe en create() y update()
- [ ] Verificar código frontend → Manejo de error 409 implementado
- [ ] Verificar base de datos → No hay DNI duplicados
- [ ] Verificar constraint UNIQUE → Existe en columna dni

---

## 🔍 Verificación Visual

Al probar cada caso, verificar:

1. ✅ El mensaje de error es claro y específico
2. ✅ El mensaje incluye el DNI que causó el conflicto
3. ✅ El toast de error se muestra correctamente
4. ✅ El diálogo permanece abierto para corrección
5. ✅ El estado `isLoading` se resetea correctamente
6. ✅ No hay errores en la consola del navegador (excepto el error esperado)

---

## ⚠️ Notas Importantes

1. **El backend previene duplicados**: La validación en el servicio es una capa adicional, pero el constraint UNIQUE en la base de datos es la protección final
2. **El mensaje del backend es más específico**: Siempre se prioriza el mensaje del backend sobre el genérico del frontend
3. **No hay validación previa**: El usuario solo se entera del duplicado después de intentar crear (mejora opcional)
4. **El DNI debe ser exacto**: Si el backend no normaliza espacios, "12345678" y " 12345678 " se consideran diferentes

---

## 🎯 Casos Especiales a Probar

### 1. Crear Paciente con DNI Vacío o Null

**Comportamiento esperado**: Error de validación (400 Bad Request) por DNI requerido

**Cómo probar**:
- Intentar crear paciente sin DNI
- Verificar que retorna 400 Bad Request
- Verificar mensaje de validación

---

### 2. Crear Paciente con DNI Muy Largo

**Comportamiento esperado**: Error de validación (400 Bad Request) si excede longitud máxima

**Cómo probar**:
- Intentar crear paciente con DNI de más de 50 caracteres (o el límite definido)
- Verificar que retorna 400 Bad Request
- Verificar mensaje de validación

---

### 3. Crear Paciente con DNI que Contiene Caracteres Especiales

**Comportamiento esperado**: Depende de la validación del backend

**Cómo probar**:
- Intentar crear paciente con DNI "12.345.678" o "12-345-678"
- Verificar si se acepta o rechaza
- Verificar mensaje de error si se rechaza

---

## 📝 Ejemplo de Testing Completo

### Flujo completo de verificación:

1. **Preparación**:
   - Abrir la aplicación
   - Abrir Chrome DevTools (F12)
   - Ir a la pestaña "Network"
   - Ir a la pestaña "Console"

2. **Operaciones**:
   - Ir a vista de turnos
   - Seleccionar una fecha
   - Hacer clic en "Agregar turno"
   - Completar formulario con DNI que ya existe
   - Hacer clic en "Guardar"

3. **Verificación**:
   - Verificar en Network tab: Status 409
   - Verificar en Console: Error logged
   - Verificar en UI: Toast de error visible
   - Verificar mensaje: Incluye el DNI duplicado

4. **Resultado esperado**:
   - ✅ Error 409 Conflict
   - ✅ Mensaje claro con DNI
   - ✅ Diálogo permanece abierto
   - ✅ No se crea paciente ni turno

---

## 🔧 Herramientas Recomendadas

1. **Chrome DevTools Network Tab**: Para ver peticiones HTTP y respuestas
2. **Chrome DevTools Console**: Para ver errores y logs
3. **Postman**: Para probar API directamente
4. **cURL**: Para scripts de testing automatizado
5. **Base de Datos**: Para verificar que no hay duplicados

---

## ✅ Resultados Esperados por Caso

| Caso | Status HTTP | Mensaje | Paciente Creado | Turno Creado |
|------|------------|---------|-----------------|--------------|
| DNI duplicado | 409 Conflict | "Ya existe un paciente con DNI: {dni}" | ❌ No | ❌ No |
| DNI nuevo | 200 OK | - | ✅ Sí | ✅ Sí |
| DNI vacío | 400 Bad Request | "El DNI es obligatorio" | ❌ No | ❌ No |
| Actualizar con DNI duplicado | 409 Conflict | "Ya existe un paciente con DNI: {dni}" | ❌ No actualizado | - |

---

## 📚 Referencias

- **Documento de implementación**: `8.Validación de DNI duplicado al crear paciente.md`
- **Análisis original**: `ANALISIS_ERRORES_TURNOS_VIEW.md` (Punto 8)
- **Backend**: `PatientService.java`, `GlobalExceptionHandler.java`
- **Frontend**: `error-handler.service.ts`, `turnos-view.component.ts`

---

## 💡 Nota Final

Este documento documenta el comportamiento **actual** del sistema, que previene duplicados de DNI correctamente a nivel de backend y maneja el error apropiadamente en el frontend. La implementación es funcional y robusta, aunque las mejoras opcionales (validación previa, validación en tiempo real) podrían mejorar la experiencia de usuario.

