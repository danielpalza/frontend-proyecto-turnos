# Cómo Recrear Errores - Manejo de Errores en Suscripciones

Este documento proporciona instrucciones paso a paso para recrear y probar todos los casos de error relacionados con el manejo de errores en suscripciones del componente `TurnosViewComponent`.

**Referencia**: `1.Falta de manejo de errores en suscripciones.md`

---

## 🔧 Métodos de Testing

### Método 1: Usando DevTools del Navegador (Network Throttling)
### Método 2: Modificando el Backend Temporalmente
### Método 3: Desconectando el Servidor
### Método 4: Usando Extensiones del Navegador (ModHeader, Requestly)

---

## 📋 Errores de Carga Inicial (ngOnInit)

### 1. Error al Cargar Turnos Iniciales

**Ubicación del código**: `turnos-view.component.ts:57-72`  
**Endpoint afectado**: `GET /api/appointments`

#### Error 0 - Sin Conexión / Network Error
**Mensaje esperado**: "Verifique su conexión a internet e intente nuevamente."

**Cómo recrearlo**:
1. **Desconectar el servidor backend**: Detener el servidor Spring Boot
2. **Desconectar internet**: Desactivar WiFi/datos en el dispositivo
3. **Usar DevTools**: 
   - Abrir Chrome DevTools (F12)
   - Ir a Network tab
   - Seleccionar "Offline" en el dropdown de throttling
   - Recargar la página de turnos

**Resultado esperado**: 
- ✅ Notificación toast roja aparece en la parte superior central
- ✅ Mensaje: "Verifique su conexión a internet e intente nuevamente."
- ✅ El estado `hasError` se establece en `true`
- ✅ El estado `errorMessage` contiene el mensaje

---

#### Error 400 - Bad Request
**Mensaje esperado**: Mensaje del backend o "Ocurrió un error inesperado al cargar los turnos. Por favor, intente nuevamente."

**Cómo recrearlo**:
```java
// En AppointmentController.java, método findAll() - TEMPORALMENTE
@GetMapping
public ResponseEntity<List<AppointmentDTO>> findAll() {
    return ResponseEntity.badRequest().build(); // Forzar error 400
}
```

**Resultado esperado**: 
- ✅ Notificación toast roja
- ✅ Mensaje de error según ErrorHandlerService

---

#### Error 401 - Unauthorized
**Mensaje esperado**: "Su sesión ha expirado. Por favor, inicie sesión nuevamente."

**Cómo recrearlo**:
```java
// En AppointmentController.java - TEMPORALMENTE
@GetMapping
public ResponseEntity<List<AppointmentDTO>> findAll() {
    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
}
```

**Resultado esperado**: 
- ✅ Notificación toast roja
- ✅ Mensaje: "Su sesión ha expirado. Por favor, inicie sesión nuevamente."

---

#### Error 403 - Forbidden
**Mensaje esperado**: "No tiene permisos para cargar los turnos."

**Cómo recrearlo**:
```java
// En AppointmentController.java - TEMPORALMENTE
@GetMapping
public ResponseEntity<List<AppointmentDTO>> findAll() {
    return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
}
```

**Resultado esperado**: 
- ✅ Notificación toast roja
- ✅ Mensaje: "No tiene permisos para cargar los turnos."

---

#### Error 404 - Not Found
**Mensaje esperado**: Mensaje del backend o "No se encontró el servicio. Contacte al administrador."

**Cómo recrearlo**:
1. **Cambiar la URL del endpoint temporalmente**:
   ```typescript
   // En appointments.service.ts - TEMPORALMENTE
   private readonly apiUrl = `${API_CONFIG.baseUrl}/appointments-wrong`;
   ```

2. **O modificar el backend**:
   ```java
   // En AppointmentController.java - TEMPORALMENTE
   @GetMapping("/wrong")
   public ResponseEntity<List<AppointmentDTO>> findAll() {
       // Este endpoint no existe, devolverá 404
   }
   ```

**Resultado esperado**: 
- ✅ Notificación toast roja
- ✅ Mensaje de servicio no encontrado

---

#### Error 408 - Request Timeout
**Mensaje esperado**: "La solicitud tardó demasiado tiempo. Por favor, intente nuevamente."

**Cómo recrearlo**:
```java
// En AppointmentController.java - TEMPORALMENTE
@GetMapping
public ResponseEntity<List<AppointmentDTO>> findAll() throws InterruptedException {
    Thread.sleep(60000); // Esperar 60 segundos (más que el timeout)
    return ResponseEntity.ok(appointmentService.findAll());
}
```

**Resultado esperado**: 
- ✅ Notificación toast roja después del timeout
- ✅ Mensaje: "La solicitud tardó demasiado tiempo. Por favor, intente nuevamente."

---

#### Error 409 - Conflict
**Mensaje esperado**: Mensaje del backend o genérico según contexto

**Cómo recrearlo**:
```java
// En AppointmentController.java - TEMPORALMENTE
@GetMapping
public ResponseEntity<List<AppointmentDTO>> findAll() {
    return ResponseEntity.status(HttpStatus.CONFLICT).build();
}
```

**Resultado esperado**: 
- ✅ Notificación toast roja
- ✅ Mensaje de conflicto

---

#### Error 500 - Internal Server Error
**Mensaje esperado**: "Error interno del servidor. Por favor, intente más tarde."

**Cómo recrearlo**:
```java
// En AppointmentController.java - TEMPORALMENTE
@GetMapping
public ResponseEntity<List<AppointmentDTO>> findAll() {
    throw new RuntimeException("Error simulado del servidor");
    // O simplemente:
    // return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
}
```

**Resultado esperado**: 
- ✅ Notificación toast roja
- ✅ Mensaje: "Error interno del servidor. Por favor, intente más tarde."

---

#### Error 502 - Bad Gateway
**Mensaje esperado**: "El servidor no está disponible temporalmente. Intente nuevamente en unos momentos."

**Cómo recrearlo**:
```java
// En AppointmentController.java - TEMPORALMENTE
@GetMapping
public ResponseEntity<List<AppointmentDTO>> findAll() {
    return ResponseEntity.status(HttpStatus.BAD_GATEWAY).build();
}
```

**Resultado esperado**: 
- ✅ Notificación toast roja
- ✅ Mensaje: "El servidor no está disponible temporalmente. Intente nuevamente en unos momentos."

---

#### Error 503 - Service Unavailable
**Mensaje esperado**: "El servicio no está disponible en este momento. Intente más tarde."

**Cómo recrearlo**:
```java
// En AppointmentController.java - TEMPORALMENTE
@GetMapping
public ResponseEntity<List<AppointmentDTO>> findAll() {
    return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).build();
}
```

**Resultado esperado**: 
- ✅ Notificación toast roja
- ✅ Mensaje: "El servicio no está disponible en este momento. Intente más tarde."

---

#### Error 504 - Gateway Timeout
**Mensaje esperado**: "El servidor tardó demasiado en responder. Por favor, intente nuevamente."

**Cómo recrearlo**:
```java
// En AppointmentController.java - TEMPORALMENTE
@GetMapping
public ResponseEntity<List<AppointmentDTO>> findAll() {
    return ResponseEntity.status(HttpStatus.GATEWAY_TIMEOUT).build();
}
```

**Resultado esperado**: 
- ✅ Notificación toast roja
- ✅ Mensaje: "El servidor tardó demasiado en responder. Por favor, intente nuevamente."

---

### 2. Error al Cargar Pacientes Iniciales

**Ubicación del código**: `turnos-view.component.ts:77-88`  
**Endpoint afectado**: `GET /api/patients`

**Mensajes similares a los de turnos, pero con contexto "cargar los pacientes"**

**Ejemplo - Error 500**:
```java
// En PatientController.java - TEMPORALMENTE
@GetMapping
public ResponseEntity<List<PatientDTO>> findAll() {
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
}
```

**Mensaje esperado**: "Error interno del servidor. Por favor, intente más tarde."

---

### 3. Error al Cargar Profesionales Iniciales

**Ubicación del código**: `turnos-view.component.ts:93-104`  
**Endpoint afectado**: `GET /api/profesionales`

**Mensajes similares a los anteriores, pero con contexto "cargar los profesionales"**

**Ejemplo - Error 404**:
```java
// En ProfesionalController.java - TEMPORALMENTE
@GetMapping
public ResponseEntity<List<ProfesionalDTO>> findAll() {
    return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
}
```

**Mensaje esperado**: Mensaje del backend o "No se encontró el servicio. Contacte al administrador."

---

## 🟠 Errores al Crear/Modificar Recursos

### 4. Error al Crear Paciente Nuevo

**Ubicación del código**: `turnos-view.component.ts:150-173`  
**Endpoint afectado**: `POST /api/patients`  
**Nota**: Usa `skipGlobal: true` para evitar notificaciones duplicadas

#### Error 0 - Sin Conexión
**Mensaje esperado**: "No se pudo crear el paciente. Verifique su conexión e intente nuevamente."

**Cómo recrearlo**:
1. Desconectar el servidor backend
2. Abrir el diálogo de crear turno
3. Llenar datos de paciente nuevo
4. Hacer clic en "Guardar"

**Resultado esperado**: 
- ✅ Notificación toast roja
- ✅ Mensaje específico para crear paciente
- ✅ El diálogo NO se cierra (permite corregir)

---

#### Error 400 - Bad Request (Validación)
**Mensaje esperado**: Mensaje del backend o "Ocurrió un error inesperado al crear el paciente. Por favor, intente nuevamente."

**Cómo recrearlo**:
1. **Enviar datos inválidos desde el frontend**:
   - Dejar campos requeridos vacíos
   - Enviar email inválido
   - Enviar DNI con formato incorrecto

2. **O forzar en el backend**:
   ```java
   // En PatientController.java - TEMPORALMENTE
   @PostMapping
   public ResponseEntity<PatientDTO> create(@Valid @RequestBody PatientDTO dto) {
       return ResponseEntity.badRequest().build();
   }
   ```

**Resultado esperado**: 
- ✅ Notificación toast roja
- ✅ Mensaje de validación
- ✅ El diálogo permanece abierto

---

#### Error 409 - Conflict (DNI Duplicado)
**Mensaje esperado**: "Ya existe un paciente con este DNI. Por favor, verifique el número de documento."

**Cómo recrearlo**:
1. **Crear un paciente con DNI existente**:
   - Crear un paciente con DNI "12345678"
   - Intentar crear otro paciente con el mismo DNI desde el diálogo de turnos

2. **O forzar en el backend**:
   ```java
   // En PatientController.java - TEMPORALMENTE
   @PostMapping
   public ResponseEntity<PatientDTO> create(@Valid @RequestBody PatientDTO dto) {
       return ResponseEntity.status(HttpStatus.CONFLICT)
           .body(Map.of("message", "Ya existe un paciente con este DNI: " + dto.getDni()));
   }
   ```

**Resultado esperado**: 
- ✅ Notificación toast roja
- ✅ Mensaje específico de DNI duplicado
- ✅ El diálogo permanece abierto

---

#### Error 422 - Unprocessable Entity
**Mensaje esperado**: Mensaje del backend o "Los datos no son válidos. Verifique la información ingresada."

**Cómo recrearlo**:
```java
// En PatientController.java - TEMPORALMENTE
@PostMapping
public ResponseEntity<PatientDTO> create(@Valid @RequestBody PatientDTO dto) {
    return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).build();
}
```

**Resultado esperado**: 
- ✅ Notificación toast roja
- ✅ Mensaje de validación

---

### 5. Error al Crear Turno

**Ubicación del código**: `turnos-view.component.ts:194-207`  
**Endpoint afectado**: `POST /api/appointments`  
**Nota**: Usa `skipGlobal: true` para evitar notificaciones duplicadas

#### Error 0 - Sin Conexión
**Mensaje esperado**: "No se pudo crear el turno. Verifique su conexión e intente nuevamente."

**Cómo recrearlo**: Desconectar el servidor e intentar crear un turno.

**Resultado esperado**: 
- ✅ Notificación toast roja
- ✅ Mensaje específico para crear turno
- ✅ El diálogo NO se cierra (permite corregir)

---

#### Error 400 - Bad Request
**Mensaje esperado**: Mensaje del backend o "Ocurrió un error inesperado al crear el turno. Por favor, intente nuevamente."

**Cómo recrearlo**:
1. Intentar crear turno sin seleccionar profesional
2. Intentar crear turno sin fecha
3. O forzar en el backend:
   ```java
   // En AppointmentController.java - TEMPORALMENTE
   @PostMapping
   public ResponseEntity<AppointmentDTO> create(@Valid @RequestBody AppointmentDTO dto) {
       return ResponseEntity.badRequest().build();
   }
   ```

**Resultado esperado**: 
- ✅ Notificación toast roja
- ✅ El diálogo permanece abierto

---

#### Error 409 - Conflict (Horario Ocupado)
**Mensaje esperado**: "El horario seleccionado ya está ocupado. Por favor, elija otro horario."

**Cómo recrearlo**:
1. **Crear un turno con horario existente**:
   - Crear turno para Profesional ID 1, fecha "2024-01-15", hora "10:00"
   - Intentar crear otro turno con los mismos datos

2. **O forzar en el backend** (si la validación no está implementada):
   ```java
   // En AppointmentController.java - TEMPORALMENTE
   @PostMapping
   public ResponseEntity<AppointmentDTO> create(@Valid @RequestBody AppointmentDTO dto) {
       return ResponseEntity.status(HttpStatus.CONFLICT)
           .body(Map.of("message", "El horario seleccionado ya está ocupado"));
   }
   ```

**Resultado esperado**: 
- ✅ Notificación toast roja
- ✅ Mensaje específico de horario ocupado
- ✅ El diálogo permanece abierto

---

### 6. Error al Eliminar Turno

**Ubicación del código**: `turnos-view.component.ts:217-226`  
**Endpoint afectado**: `DELETE /api/appointments/{id}`  
**Nota**: Usa `skipGlobal: true` para evitar notificaciones duplicadas

#### Error 0 - Sin Conexión
**Mensaje esperado**: "No se pudo eliminar el turno. Verifique su conexión e intente nuevamente."

**Cómo recrearlo**: Desconectar el servidor e intentar eliminar un turno.

**Resultado esperado**: 
- ✅ Notificación toast roja
- ✅ Mensaje específico para eliminar

---

#### Error 404 - Not Found
**Mensaje esperado**: "El turno que intenta eliminar no existe o ya fue eliminado."

**Cómo recrearlo**:
1. **Eliminar un turno que ya no existe**:
   - Eliminar un turno
   - Intentar eliminarlo nuevamente (si el ID persiste en la UI)

2. **O forzar en el backend**:
   ```java
   // En AppointmentController.java - TEMPORALMENTE
   @DeleteMapping("/{id}")
   public ResponseEntity<Void> delete(@PathVariable Long id) {
       return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
   }
   ```

**Resultado esperado**: 
- ✅ Notificación toast roja
- ✅ Mensaje específico de turno no encontrado

---

#### Error 403 - Forbidden
**Mensaje esperado**: "No tiene permisos para eliminar el turno."

**Cómo recrearlo**:
```java
// En AppointmentController.java - TEMPORALMENTE
@DeleteMapping("/{id}")
public ResponseEntity<Void> delete(@PathVariable Long id) {
    return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
}
```

**Resultado esperado**: 
- ✅ Notificación toast roja
- ✅ Mensaje de permisos

---

## 🧪 Checklist de Testing

### Errores de Carga Inicial
- [ ] Error 0 - Sin conexión (turnos)
- [ ] Error 0 - Sin conexión (pacientes)
- [ ] Error 0 - Sin conexión (profesionales)
- [ ] Error 400 - Bad Request (cualquiera)
- [ ] Error 401 - Unauthorized
- [ ] Error 403 - Forbidden
- [ ] Error 404 - Not Found
- [ ] Error 408 - Timeout
- [ ] Error 409 - Conflict
- [ ] Error 500 - Internal Server Error
- [ ] Error 502 - Bad Gateway
- [ ] Error 503 - Service Unavailable
- [ ] Error 504 - Gateway Timeout

### Errores de Creación
- [ ] Error 0 - Crear paciente sin conexión
- [ ] Error 0 - Crear turno sin conexión
- [ ] Error 400 - Validación paciente
- [ ] Error 400 - Validación turno
- [ ] Error 409 - DNI duplicado
- [ ] Error 409 - Horario ocupado
- [ ] Error 422 - Unprocessable Entity

### Errores de Eliminación
- [ ] Error 0 - Eliminar sin conexión
- [ ] Error 404 - Turno no encontrado
- [ ] Error 403 - Sin permisos

---

## 🔍 Verificación Visual

Al probar cada error, verificar:

1. ✅ La notificación toast aparece centrada arriba
2. ✅ El color es rojo para errores
3. ✅ El mensaje es claro y en español
4. ✅ El mensaje corresponde al código HTTP correcto
5. ✅ La notificación desaparece después de 5 segundos
6. ✅ Se puede cerrar manualmente con el botón X
7. ✅ No hay errores en la consola del navegador
8. ✅ El estado del componente se actualiza correctamente (`hasError`, `isLoading`, etc.)
9. ✅ Los diálogos NO se cierran en caso de error (para crear paciente/turno)

---

## ⚠️ Notas Importantes

- **Después de testing**: Revertir todos los cambios temporales en el backend
- **No commitear**: Los cambios de testing no deben subirse al repositorio
- **Usar branch de testing**: Crear un branch separado para pruebas
- **Documentar**: Anotar qué errores funcionan correctamente y cuáles necesitan ajustes

---

## 🎯 Método Recomendado para Testing

1. **Para errores de red (0)**: Usar DevTools Network throttling → Offline
2. **Para errores HTTP específicos**: Modificar temporalmente el backend
3. **Para errores de validación**: Enviar datos inválidos desde el frontend
4. **Para errores de conflicto**: Crear recursos duplicados

---

## 📝 Ejemplo de Testing Rápido

### Test completo de flujo de creación con error:

1. Abrir la aplicación
2. Ir a la vista de turnos
3. Hacer clic en una fecha del calendario
4. Hacer clic en "Nuevo Turno"
5. Llenar datos de paciente nuevo con DNI existente
6. Hacer clic en "Guardar"
7. **Verificar**: 
   - ✅ Toast rojo aparece
   - ✅ Mensaje: "Ya existe un paciente con este DNI..."
   - ✅ Diálogo permanece abierto
   - ✅ `isLoading` se resetea a `false`

