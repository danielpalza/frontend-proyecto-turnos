---
name: http-error-handling
description: Use when adding a new HTTP call, or writing/editing an error handler (subscribe error callback, catchError) on an HTTP call. This repo's global interceptor already shows a toast for most errors — a new call site that also calls showError duplicates it, and the interceptor's 403 branch has a specific gap where skipGlobalErrorHandler() is silently ignored.
---

# Manejo de errores HTTP sin duplicar el toast

`docs/DEUDA_TECNICA.md` §3 documenta un bug real ya visto en producción: entrar con permisos de
profesional mostraba **dos toasts idénticos** para el mismo error. La causa de fondo sigue viva
aunque ese caso puntual se arregló.

## El contrato (`http-error.interceptor.ts`)

El interceptor global notifica por toast **todo** error salvo: `401`, `404`, errores de red,
endpoints `/auth/*`, y peticiones marcadas con `skipGlobalErrorHandler()` (el `HttpContext` de
`core/interceptors/http-context.ts`). Cualquier `showError` en un handler cuya petición **no**
esté marcada con `skipGlobal` duplica el toast del interceptor sobre el mismo error.

**El patrón que `UI_RULES.md` documenta como canónico no protege de esto.** `if (err.status !==
404) && !isNetworkError(err)` calca exactamente las exclusiones del interceptor — así que solo
deja pasar justo los casos en que el interceptor *ya* notificó. Se lee como un guard y funciona
como amplificador.

## La trampa del 403

`http-error.interceptor.ts` desvía el `403` a `handleCapabilityForbidden` y hace `return`
**antes** de leer `SKIP_GLOBAL_ERROR_HANDLER`. Consecuencia: `skipGlobalErrorHandler()` **no
silencia los 403**, sin importar si lo marcaste en la petición. No hay forma hoy de que un
componente se haga cargo de un 403 sin que el interceptor también lo notifique.

## Al agregar una llamada HTTP nueva

1. Si el componente **no** necesita mostrar el mensaje inline (en una propiedad de error del
   formulario, por ejemplo) — no llames `showError` en el handler. Dejá que el interceptor
   notifique. Es la opción correcta en la mayoría de los casos.
2. Si el componente **sí** necesita el mensaje para mostrarlo inline además del toast — marcá la
   petición con `skipGlobalErrorHandler()` usando el `HttpContext`, y mostrá el error vos mismo.
   Pero si la petición puede devolver `403`, sabé que el toast del interceptor va a aparecer
   igual (ver trampa arriba) — no asumas que el context flag te cubre ese caso.
3. No copies el patrón `if (err.status !== 404) && !isNetworkError(err)` pensando que evita la
   duplicación — no lo hace.

## Si estás corrigiendo uno de los 23 call sites ya identificados

`docs/DEUDA_TECNICA.md` §3.2 los lista por archivo:línea (`patient.service.ts:29`,
`profesional.service.ts:29`, 11 sitios en `coberturas-view`, 3 en `invitation-dialog`, 3 en
`profesionales-panel`, 1 en `patient-wizard-panel`). Por cada uno: si el mensaje ya se guarda en
una propiedad (`saveProfesionalError`, `patientFormError`, `errorMessage`), marcá
`skipGlobalErrorHandler()`; si no, borrá el `showError` y dejá que notifique el interceptor.
