# Análisis de Errores y Bugs Potenciales - TurnosViewComponent

## 🔴 CRÍTICOS

### 1. **Falta de manejo de errores en suscripciones**
**Ubicación**: `turnos-view.component.ts:45-63`
**Problema**: Las suscripciones a los servicios no manejan errores. Si falla la carga inicial, el componente queda en estado inconsistente.
```typescript
this.appointmentsService.getAppointments().subscribe(appointments => {
  this.appointments = appointments;
});
```
**Impacto**: Si el backend no responde, la aplicación puede quedar sin datos sin notificar al usuario.

### 2. **Race condition al crear turno con paciente nuevo**
**Ubicación**: `turnos-view.component.ts:92-124`
**Problema**: Si el usuario hace clic múltiples veces en "Guardar", se pueden crear múltiples pacientes y turnos duplicados.
**Impacto**: Duplicación de datos, inconsistencias en la base de datos.

### 3. **No se valida que la fecha seleccionada sea válida antes de crear turno**
**Ubicación**: `turnos-view.component.ts:92`
**Problema**: Solo verifica `if (!this.selectedDate)`, pero no valida si la fecha es pasada o si es válida.
**Impacto**: Se pueden crear turnos en fechas pasadas o inválidas.

### 4. **Falta validación de horarios ocupados**
**Ubicación**: `turnos-view.component.ts:126-138`
**Problema**: No se verifica si el horario ya está ocupado por otro turno del mismo profesional.
**Impacto**: Superposición de turnos, conflictos de horarios.

### 5. **El diálogo se puede abrir sin fecha seleccionada**
**Ubicación**: `turnos-view.component.html:27`
**Problema**: El `*ngIf="selectedDate"` previene el renderizado, pero `isDialogOpen` puede ser `true` sin fecha.
**Impacto**: Estado inconsistente, el diálogo puede intentar crear turnos sin fecha.

---

## 🟠 IMPORTANTES

### 6. **Memory leak potencial en suscripciones**
**Ubicación**: `turnos-view.component.ts:35`
**Problema**: Aunque se usa `Subscription`, si los servicios emiten valores después de `ngOnDestroy`, puede haber memory leaks.
**Impacto**: Degradación de performance en sesiones largas.

### 7. **No se actualiza el cache después de crear turno**
**Ubicación**: `turnos-view.component.ts:127`
**Problema**: Se llama a `create()` que actualiza el cache, pero si hay múltiples instancias del servicio, puede haber inconsistencia.
**Impacto**: El calendario puede no reflejar el nuevo turno inmediatamente.

### 8. **Falta validación de DNI duplicado al crear paciente**
**Ubicación**: `turnos-view.component.ts:99`
**Problema**: No se verifica si el DNI ya existe antes de crear el paciente.
**Impacto**: Duplicación de pacientes con el mismo DNI.

### 9. **El estado `isLoading` no se resetea en todos los casos de error**
**Ubicación**: `turnos-view.component.ts:109-114, 132-136`
**Problema**: Si hay un error, `isLoading` se resetea, pero si el usuario cierra el diálogo durante la carga, puede quedar bloqueado.
**Impacto**: UI bloqueada, botones deshabilitados permanentemente.

### 10. **No hay feedback visual cuando se elimina un turno**
**Ubicación**: `turnos-view.component.ts:140-144`
**Problema**: Solo se maneja el error, pero no hay confirmación de éxito.
**Impacto**: El usuario no sabe si la eliminación fue exitosa.

### 11. **Problema de zona horaria en fechas**
**Ubicación**: `turnos-view.component.ts:71-73`
**Problema**: `toISOString()` puede cambiar la fecha según la zona horaria del cliente.
**Impacto**: Fechas incorrectas, especialmente cerca de medianoche.

### 12. **El método `getAppointmentsForDate` se pasa como función arrow pero puede causar problemas**
**Ubicación**: `turnos-view.component.ts:149-151`
**Problema**: Se pasa como arrow function al template, pero si cambia el contexto, puede no funcionar correctamente.
**Impacto**: El calendario puede no mostrar turnos correctamente.

---

## 🟡 MODERADOS

### 13. **Falta validación de email en el formulario**
**Ubicación**: `appointment-dialog.component.ts:61`
**Problema**: Aunque hay `Validators.email`, no se valida el formato antes de enviar.
**Impacto**: Emails inválidos pueden llegar al backend.

### 14. **No se limpia el formulario después de crear turno exitosamente**
**Ubicación**: `appointment-dialog.component.ts:332`
**Problema**: El formulario se limpia solo al cerrar, pero no después de un submit exitoso.
**Impacto**: Si se abre de nuevo, puede mostrar datos residuales.

### 15. **El cálculo de edad puede ser incorrecto en algunos casos**
**Ubicación**: `appointment-dialog.component.ts:95-106`
**Problema**: El cálculo de edad puede fallar si la fecha de nacimiento es inválida o futura.
**Impacto**: Edades negativas o incorrectas.

### 16. **No hay validación de que el profesional exista**
**Ubicación**: `turnos-view.component.ts:163-165`
**Problema**: Se filtran profesionales activos, pero si el ID enviado no existe, puede causar error.
**Impacto**: Errores en el backend al crear turnos con profesionales inexistentes.

### 17. **El formato de hora puede causar problemas**
**Ubicación**: `appointment-dialog.component.ts:321`
**Problema**: Se concatena `:00` sin validar que `raw.hora` tenga el formato correcto.
**Impacto**: Horas inválidas como `09:00:00:00` si ya tiene segundos.

### 18. **No se valida que los montos sean números válidos**
**Ubicación**: `appointment-dialog.component.ts:323-326`
**Problema**: Se usa `|| 0` pero si viene `null` o `undefined`, puede causar problemas.
**Impacto**: Valores NaN o incorrectos en cálculos.

### 19. **El estado inicial de `selectedDate` puede ser null**
**Ubicación**: `turnos-view.component.ts:31`
**Problema**: Aunque se inicializa en `ngOnInit`, hay un momento donde puede ser `null`.
**Impacto**: El panel de turnos puede mostrar estado vacío inicialmente.

### 20. **No hay manejo de casos donde no hay profesionales**
**Ubicación**: `turnos-view.component.ts:163-165`
**Problema**: Si `profesionales` está vacío, el dropdown estará vacío sin mensaje.
**Impacto**: Usuario confundido, no puede crear turnos.

---

## 🔵 MENORES / MEJORAS

### 21. **El método `getTodayAsString()` debería ser estático o moverse a un util**
**Ubicación**: `turnos-view.component.ts:71-74`
**Problema**: Es un método de instancia que no usa `this`.
**Impacto**: Código menos eficiente.

### 22. **Falta validación de formato de teléfono**
**Ubicación**: `appointment-dialog.component.ts:60`
**Problema**: Solo se valida que sea requerido, no el formato.
**Impacto**: Teléfonos inválidos pueden guardarse.

### 23. **No hay límite máximo en los inputs numéricos**
**Ubicación**: `appointments-panel.component.html:148-157`
**Problema**: Los inputs de precio no tienen `max`, pueden ingresarse valores negativos o muy grandes.
**Impacto**: Valores inválidos, errores en cálculos.

### 24. **El método `formatTime` puede fallar con formato incorrecto**
**Ubicación**: `appointments-panel.component.ts:92-96`
**Problema**: Si `time` no tiene el formato esperado, `substring(0, 5)` puede causar problemas.
**Impacto**: Horas mal formateadas o errores.

### 25. **No se valida que `anamnesis` sea JSON válido antes de parsear**
**Ubicación**: `appointment-dialog.component.ts:198-204`
**Problema**: Aunque hay try-catch, si el JSON está malformado, se pierde información.
**Impacto**: Pérdida de datos de anamnesis.

### 26. **El delay en `onSearchPatientBlur` es un hack**
**Ubicación**: `appointment-dialog.component.ts:166-170`
**Problema**: Usar `setTimeout` para manejar clicks es frágil.
**Impacto**: Puede fallar en dispositivos lentos o con alta latencia.

### 27. **No hay debounce en la búsqueda de pacientes**
**Ubicación**: `appointment-dialog.component.ts:132-147`
**Problema**: Cada tecla dispara un filtro, puede ser lento con muchos pacientes.
**Impacto**: Performance degradada con listas grandes.

### 28. **El estado `expandedCards` no se limpia al cambiar de fecha**
**Ubicación**: `appointments-panel.component.ts:22`
**Problema**: Las tarjetas expandidas permanecen expandidas al cambiar de fecha.
**Impacto**: UX confusa, estado inconsistente.

### 29. **No hay confirmación antes de eliminar turno**
**Ubicación**: `appointments-panel.component.html:106`
**Problema**: El botón de eliminar no pide confirmación.
**Impacto**: Eliminaciones accidentales.

### 30. **El método `goToToday` en el calendario puede tener bug de formato**
**Ubicación**: `month-calendar.component.ts:114-118`
**Problema**: `formatDate(today.getMonth(), today.getDate())` puede no coincidir con el formato esperado.
**Impacto**: Fecha incorrecta seleccionada.

### 31. **No hay validación de que `patientId` sea válido antes de crear turno**
**Ubicación**: `turnos-view.component.ts:104, 119`
**Problema**: Si `newPatient.id` es `undefined`, se crea turno con `patientId: undefined`.
**Impacto**: Error en backend, turno inválido.

### 32. **El estado `isDialogOpen` puede quedar `true` si hay error**
**Ubicación**: `turnos-view.component.ts:129`
**Problema**: Solo se resetea en éxito, pero si hay error, queda abierto.
**Impacto**: Diálogo bloqueado, usuario confundido.

### 33. **No se valida que los valores numéricos sean positivos**
**Ubicación**: `appointments-panel.component.ts:136-150`
**Problema**: Se puede agregar pago negativo.
**Impacto**: Cálculos incorrectos, deudas negativas.

### 34. **Falta manejo de casos donde el backend devuelve error 400/500**
**Ubicación**: Múltiples lugares
**Problema**: Solo se hace `console.error`, no se muestra mensaje al usuario.
**Impacto**: Usuario no sabe qué salió mal.

### 35. **El método `calcularResto` puede devolver valores incorrectos**
**Ubicación**: `appointment-dialog.component.ts:264-270`
**Problema**: No valida que los valores sean números válidos antes de calcular.
**Impacto**: NaN o Infinity en el cálculo.

---

## 📋 RESUMEN POR CATEGORÍA

### Manejo de Errores
- Errores 1, 9, 10, 34

### Validación
- Errores 3, 8, 13, 15, 16, 17, 18, 22, 23, 31, 33, 35

### Sincronización de Datos
- Errores 2, 7, 12

### UI/UX
- Errores 5, 10, 19, 20, 28, 29, 32

### Performance
- Errores 6, 27

### Lógica de Negocio
- Errores 4, 11, 14, 30

### Código/Arquitectura
- Errores 21, 24, 25, 26

---

## 🎯 PRIORIDAD DE CORRECCIÓN

1. **Alta**: Errores 1, 2, 3, 4, 5, 8, 9, 31
2. **Media**: Errores 6, 7, 10, 11, 12, 13, 16, 17, 19, 20, 29, 32, 34
3. **Baja**: Resto de errores




