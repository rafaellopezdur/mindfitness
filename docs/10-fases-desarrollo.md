# 10 · Fases de desarrollo

> Las duraciones son **estimaciones para un desarrollador a tiempo completo** y sirven para ordenar, no
> para comprometer fechas. Cada fase termina con algo **usable y probado**, no con "código a medias".

## Efecto de la ampliación sobre el plan

La segunda ronda de requisitos (eventos, servicios contratados, finanzas completas y notificaciones)
**aumenta el alcance de la v1 en aproximadamente un 60 %**: de ~13 a ~20 semanas. Conviene decirlo con
números antes de empezar, no a mitad de camino.

El reparto no es uniforme, y esa es la parte importante:

| Bloque nuevo | Dónde encaja | Por qué ahí |
|---|---|---|
| **Servicios y derechos** ([12](12-servicios-y-entrenadores.md)) | **Dentro de la Fase 3** | Modifica `plans` y `memberships`. Añadirlo después obligaría a migrar todas las membresías vendidas. |
| **Tarjeta del entrenador** | Fase 4 | Solo necesita que existan los derechos y la asistencia. |
| **Eventos** ([11](11-modulo-eventos.md)) | Fase 8, **después del primer uso real** | Es un módulo aditivo: reutiliza clientes y pagos, no los cambia. |
| **Finanzas** ([13](13-finanzas.md)) | Fase 9 | Necesita que ya existan pagos, eventos y entrenadores para calcular algo real. |
| **Notificaciones** ([14](14-notificaciones.md)) | Fase 11 completa, **versión mínima en la Fase 5** | El centro interno básico se adelanta; las preferencias, canales y resúmenes van después. |

---

## Vista general

```
F0  Descubrimiento          ▓                                              (paralelo)
F1  Fundaciones             ▓▓▓▓
F2  Clientes + Config           ▓▓▓▓▓▓
F3  Planes·SERVICIOS·Membr.           ▓▓▓▓▓▓▓▓▓▓▓▓
F4  Pagos·Asist.·Tarjeta                          ▓▓▓▓▓▓▓▓▓▓
F5  Dashboards + avisos                                     ▓▓▓▓▓  ◄── PRIMER USO REAL
F6  Portal público                                               ▓▓▓▓▓▓▓
F7  Pagos en línea                                                      ▓▓▓▓▓
F8  EVENTOS                                                                  ▓▓▓▓▓▓▓▓▓▓
F9  FINANZAS                                                                           ▓▓▓▓▓▓▓▓▓▓
F10 Cartera + Comunicaciones                                                                     ▓▓▓▓▓
F11 NOTIFICACIONES completas                                                                          ▓▓▓▓▓
F12 Reportes + Rentabilidad + Cierre                                                                       ▓▓▓▓▓▓
```

**Hito clave: al terminar la F5 el gimnasio ya puede dejar el cuaderno.** Todo lo demás suma sobre un
sistema que ya está en uso y generando valor.

---

## F0 · Descubrimiento y datos reales — *continuo, en paralelo*
**Qué:** conseguir las respuestas de [09-preguntas-pendientes.md](09-preguntas-pendientes.md), ver el
Excel o cuaderno actual, observar media hora de operación en recepción y **media hora de un entrenador
atendiendo**, que es lo que valida el diseño de la tarjeta de acceso.
**No bloquea** el arranque de F1.

---

## F1 · Fundaciones — *≈1 semana*

| Aspecto | Detalle |
|---|---|
| **Dependencias** | Ninguna |
| **Migraciones** | `users` `roles` `permissions` `role_permissions` `user_roles` `sessions` `audit_logs` `business_settings` `idempotency_keys` `outbox` `job_runs` |
| **Rutas** | `/admin/login` · `/admin` (vacío) · `/admin/usuarios` · `/admin/auditoria` · `/api/health` |
| **Componentes** | Layout admin, `PageHeader`, `DataView`, `EmptyState`, `ErrorState`, `ConfirmDialog`, `StatusBadge`, tokens de color |
| **Pruebas** | `RbacService.can()` con la matriz completa · auditoría dentro de transacción · login, bloqueo, revocación |
| **Decisiones a documentar** | ADR-001 monolito Next.js · ADR-002 dinero en enteros · ADR-003 estados derivados · ADR-004 RBAC en base de datos |

**Criterios de aceptación**
- [ ] `OWNER` entra, crea un `FRONT_DESK` y le asigna rol.
- [ ] `FRONT_DESK` recibe 403 si escribe a mano la URL de Usuarios.
- [ ] Toda acción sensible aparece en `/admin/auditoria` con autor, antes/después e IP.
- [ ] La navegación funciona de verdad en 360 px.

---

## F2 · Clientes y Configuración — *≈1,5 semanas*

**Migraciones:** `clients` `emergency_contacts` `client_notes` `documents` `consents` `holidays`
**Rutas:** `/admin/clientes/*` · `/admin/configuracion` (7 secciones) · `/api/v1/clients/*`
**Componentes:** `ClientCard`, `ClientSearch`, `FilterBar`, `StepForm`, subida con URL firmada, ⌘K
**Pruebas:** duplicado rechazado · alcance del entrenador · búsqueda por documento/nombre/teléfono

**Criterios de aceptación**
- [ ] Crear un cliente completo desde el teléfono en menos de 2 minutos; uno rápido con 3 campos.
- [ ] Buscar por documento devuelve la ficha en <1 s con 1.000 clientes.
- [ ] Recepción no puede editar el número de documento.
- [ ] Los documentos solo se abren con URL firmada y expiran.

---

## F3 · Planes, **Servicios y derechos**, Membresías, Horarios, Entrenadores — *≈3 semanas*
**El corazón del sistema. Aquí está el mayor riesgo técnico del proyecto.**

**Migraciones:** `services` `plan_entitlements` `plans` `plan_slot_rules` `memberships`
**`membership_entitlements`** `membership_changes` `schedules` `schedule_slots` `slot_occurrences`
`slot_enrollments` `trainers` **`trainer_assignments`** `service_usages` `service_authorizations`

**Rutas:** `/admin/planes/*` (+ `?tab=servicios`) · `/admin/servicios` · `/admin/membresias/*` ·
`/admin/horarios/*` · `/admin/entrenadores/*` (+ `?tab=asignaciones`) · `/admin/autorizaciones`

**Dominio puro a implementar:** `calculateEndDate` · `applyPause/Resume` · `prorate` ·
`renewalStartDate` · `isExpiringSoon` · `isInGrace` · `availableCapacity` ·
**`resolveAccess`** · **`resolveTrainer`** · **`materializeEntitlements`** · `consumeEntitlement`

**Pruebas:** ⚠️ **la batería más grande del proyecto.** RN-01→RN-31, RN-70→RN-75 y RN-120→RN-133.
Una prueba por cada `AccessReasonCode` y por cada nivel de precedencia de entrenador. Casos de
calendario: 31 de enero + 1 mes, años bisiestos, pausas que cruzan el fin de mes.

**Criterios de aceptación**
- [ ] Se crean los 10 tipos de plan **sin escribir una línea de código**.
- [ ] Un plan sin derechos declarados **no se puede publicar**.
- [ ] Subir el precio o cambiar los derechos de un plan no altera ninguna membresía existente.
- [ ] Pausar 10 días y reactivar corre el vencimiento 10 días **y desplaza los periodos de derechos**.
- [ ] Renovar de forma anticipada encadena fechas y reinicia contadores según `rollover`.
- [ ] Una franja llena no admite inscripciones salvo sobrecupo autorizado y auditado.
- [ ] `resolveAccess` devuelve el código correcto en los 10 escenarios del catálogo de mensajes.
- [ ] `resolveTrainer` respeta la precedencia en los 6 niveles, incluidos los empates.
- [ ] Una autorización aprobada aplica sus efectos (cobro / sesión / derecho) de forma transaccional.

---

## F4 · Pagos, Asistencia y **Tarjeta del entrenador** — *≈2,5 semanas*

**Migraciones:** `payment_methods` `charges` `payments` `payment_allocations` `refunds` `receipts` `attendance`
**Rutas:** `/admin/pagos/*` · `/admin/asistencia` (+ quiosco) · **`/admin/acceso`** · `/api/v1/access-card`
**Componentes:** `MoneyInput`, `MoneyText`, `PaymentRow`, `ChargeSummary`, `AttendanceCheckIn`,
**`AccessCard`**, `EntitlementList`, comprobante imprimible
**Dominio puro:** `allocatePayment` · `chargeBalance` · `canCheckIn`

**Pruebas:** ⚠️ **críticas.** Pago parcial · pago que cubre dos cargos · anulación que reabre el cargo ·
excedente como saldo a favor · consecutivo de recibos sin huecos bajo concurrencia · las 7 reglas de
check-in · **prueba que verifica que el DTO de la tarjeta no contiene ningún campo monetario**

**Criterios de aceptación**
- [ ] Registrar un pago en efectivo en menos de 30 segundos desde la ficha.
- [ ] Un pago parcial deja el cargo `PARTIAL` y la membresía sin activar.
- [ ] Anular conserva el original, exige motivo y reabre el cargo. Ningún camino permite borrar un pago.
- [ ] 🎯 El entrenador busca por documento y **en menos de 3 segundos** sabe qué tiene contratado la persona.
- [ ] La tarjeta cabe en una pantalla de 360 px sin desplazamiento.
- [ ] Un `curl` con el token del entrenador no devuelve ni un importe.
- [ ] El check-in que consume sesión actualiza el contador y crea el `service_usage`.

---

## F5 · Dashboards + avisos mínimos — *≈1,25 semanas* ◄ **PRIMER USO REAL**

**Migraciones:** `notifications` `notification_recipients` (versión mínima, sin preferencias ni canales)
**Rutas:** `/admin` con **tres variantes según rol** · `/admin/notificaciones` (lista simple)
**Componentes:** `StatCard`, `AlertCard`, `QuickActions`, `NotificationList`
**Contenido:** los 13 indicadores, 8 alertas y 8 acciones rápidas + **dashboard del entrenador**
([12](12-servicios-y-entrenadores.md#7-dashboard-del-entrenador))

> **Por qué adelantar un centro de notificaciones mínimo:** desde la F3 ya existen autorizaciones
> pendientes que alguien debe aprobar. Sin un lugar donde verlas, ese flujo no funciona. Se construye
> el hecho + el estado de lectura; preferencias, canales, resúmenes y anti-ruido llegan en la F11.

**Criterios de aceptación**
- [ ] Carga en menos de 2 segundos con datos realistas.
- [ ] Cada alerta lleva a la lista filtrada con un toque.
- [ ] El entrenador ve **su** dashboard, no una versión recortada del de las propietarias.
- [ ] Las solicitudes de autorización llegan al centro y se aprueban desde ahí.
- [ ] 🎯 **Las propietarias pueden operar el gimnasio completo desde aquí.**

> **Aquí se recomienda pausar y usar el sistema una o dos semanas.** Lo que se aprenda reordenará las
> fases siguientes mejor que cualquier plan escrito hoy — en particular, si Eventos (F8) debe adelantarse.

---

## F6 · Portal público e Inscripciones — *≈1,75 semanas*
**[requiere P2, P5, P6, P7]**

**Migraciones:** `registrations` `registration_events`
**Rutas:** todo `(public)` + `/admin/inscripciones/*`
**Pruebas:** E2E del flujo completo · las 4 reglas de duplicados · retomar con enlace firmado y caducado

**Criterios de aceptación**
- [ ] Alguien se inscribe desde el teléfono sin ayuda.
- [ ] La inscripción llega al admin **sin volver a escribir un solo dato**.
- [ ] Abandonar en el paso 3 y volver al día siguiente conserva lo escrito.
- [ ] Lighthouse ≥ 90 en rendimiento y accesibilidad en móvil.

---

## F7 · Pagos en línea — *≈1,25 semanas*
**[requiere P1 + llaves de sandbox]**

**Migraciones:** `payment_intents` `payment_attempts`
**Rutas:** `/api/webhooks/payments/[provider]` · `/api/cron/verify-pending-payments` · `/admin/pagos/conciliacion`
**Pruebas:** ⚠️ webhook duplicado · firma inválida · webhook antes que el intent · pago aprobado tras
expirar · discrepancia webhook/API · doble clic en pagar

**Criterios de aceptación**
- [ ] Un pago aprobado activa la membresía **por webhook**, no por la pantalla de retorno.
- [ ] Reenviar el mismo webhook 5 veces produce exactamente un pago.
- [ ] Cerrar el navegador tras pagar igualmente activa la membresía.

---

## F8 · **Eventos y clases especiales** — *≈2,5 semanas*
**[requiere P21, P22]**

**Migraciones:** `event_categories` `events` `event_sessions` `event_prices` `event_eligible_plans`
`event_registrations` `event_waitlist` `event_attendance` `event_staff` `event_expenses`
(+ vacías: `event_promo_codes` `event_addons` `event_sponsors`)

**Rutas:** `/eventos` · `/eventos/[slug]` · `/eventos/[slug]/inscripcion` · `/e/[token]` ·
`/admin/eventos/*` · `/api/v1/events/*`

**Componentes:** `EventCard`, `EventHero`, `CapacityMeter`, `TicketSelector`, `WaitlistForm`,
`AttendeeList`, `EventCheckIn`, `ShareSheet`, constructor de eventos por pasos

**Dominio puro:** `availableSpots` · `canRegister` · `resolveTicketPrice` (miembro / plan / general) ·
`waitlistNext` · `eventStatus`

**Pruebas:** ⚠️ **concurrencia sobre el último cupo** (dos inscripciones simultáneas) · ciclo completo
de lista de espera con oferta que expira · cancelación de evento con 18 pagos → reembolsos ·
precio de miembro vs. general · RN-100→RN-114 · E2E: enlace compartido → inscripción → pago → check-in

**Criterios de aceptación**
- [ ] Crear un evento y obtener su enlace público en menos de 5 minutos.
- [ ] El enlace compartido por WhatsApp **muestra tarjeta con imagen** (`og:image` verificada).
- [ ] Dos personas simultáneas no pueden tomar el último cupo.
- [ ] Al cancelar alguien, el primero de la lista recibe una oferta con vencimiento.
- [ ] Un miembro cuyo plan incluye el evento se inscribe sin pagar; un externo paga.
- [ ] La búsqueda pública de miembro **no revela datos completos**.
- [ ] El responsable pasa lista desde el teléfono con la lista de asistentes.
- [ ] Cancelar el evento notifica a todos y deja el reembolso trazado.

---

## F9 · **Finanzas** — *≈2,5 semanas*
**[requiere P23, P24, P25]**

**Migraciones:** `expense_categories` `expenses` `income_entries` `financial_periods` `trainer_rates`
`trainer_services` `trainer_settlements` `trainer_settlement_items` `trainer_payments`
\+ vista `financial_movements`

**Rutas:** `/admin/finanzas/*` · `/admin/liquidaciones/*` · `/admin/entrenadores/[id]?tab=finanzas` ·
`/api/cron/generate-accruals`

**Dominio puro:** `computeAccrual` (los 9 modos de remuneración) · `buildSettlement` ·
`contributionMargin` · `periodTotals`

**Pruebas:** ⚠️ **las de mayor impacto en la confianza.** Un ingreso nunca se cuenta dos veces (RN-140) ·
los 9 modos de remuneración, incluido el mixto · anulación de un pago con porcentaje ya liquidado →
ajuste, no borrado · periodo cerrado rechaza escrituras · comisión de pasarela generada automáticamente ·
la suma de márgenes + costos fijos = resultado del periodo

**Criterios de aceptación**
- [ ] Registrar un gasto con foto del recibo desde el teléfono en menos de 30 segundos.
- [ ] Ningún ingreso aparece dos veces en el flujo de caja (prueba explícita).
- [ ] Generar la liquidación del mes de un entrenador con las 4 modalidades mezcladas.
- [ ] Aprobar y pagar la liquidación **crea el gasto automáticamente**.
- [ ] El entrenador ve solo su liquidación y puede acusar recibo.
- [ ] Cerrar octubre impide registrar movimientos con fecha de octubre, incluso a `OWNER`.
- [ ] Todo reporte declara visiblemente si es Caja o Causación.

---

## F10 · Cartera y Comunicaciones — *≈1,25 semanas*
**[requiere P9, P12]**

**Migraciones:** `collection_cases` `collection_actions` `reminders` `message_templates` `messages`
**Criterios de aceptación**
- [ ] La cartera lista a los morosos ordenados por días de mora.
- [ ] Un toque abre WhatsApp con el mensaje ya redactado.
- [ ] Cada gestión queda registrada con canal, resultado y responsable.
- [ ] Registrar el pago cierra el caso solo.

---

## F11 · **Centro de notificaciones completo** — *≈1,25 semanas*

**Migraciones:** `notification_types` `notification_preferences` `notification_logs`
(+ ampliación de `notifications`: prioridad, `dedupe_key`, asignación, resolución, caducidad)

**Qué se añade sobre la versión mínima de la F5:** las 4 prioridades y su comportamiento · los ~40 tipos
del catálogo · preferencias por usuario y tipo · horario silencioso · canal de correo · `dedupe_key` ·
agregación · resumen diario · auto-resolución · asignar y resolver con nota · posponer · adaptador de canal

**Pruebas:** el mismo hecho no genera dos notificaciones · resolver marca resuelto para todos ·
quien actúa no se autonotifica · `CRITICAL` ignora el horario silencioso · la auto-resolución cierra
avisos que dejaron de ser ciertos · un aviso interno **nunca** sale hacia un cliente

**Criterios de aceptación**
- [ ] La insignia cuenta solo urgentes y críticas sin resolver.
- [ ] Una autorización se aprueba **desde la propia notificación**, sin cambiar de pantalla.
- [ ] Silenciar un tipo deja de interrumpir pero sigue apareciendo en el centro.
- [ ] Tras una semana de uso real, el número de notificaciones diarias por usuario es manejable
      (se mide; si no lo es, se ajustan las prioridades por defecto).

---

## F12 · Reportes, Rentabilidad y cierre de la v1 — *≈1,5 semanas*

**Rutas:** `/admin/reportes/{financieros,comerciales,operativos}` · `/admin/finanzas?tab=rentabilidad`
**Contenido:** los tres bloques de reportes solicitados + rentabilidad por plan, evento, entrenador,
horario y servicio + costo e ingreso promedio por cliente
**Además:** endurecimiento de seguridad, copias de seguridad, monitoreo, manual de uso, formación,
carga de datos reales

**Criterios de aceptación**
- [ ] Los ingresos del mes cuadran con la suma manual de los pagos.
- [ ] La rentabilidad de un evento cuadra con el cálculo hecho a mano.
- [ ] Todo reporte exporta a CSV y la exportación queda auditada.
- [ ] Recepción no puede ver ni exportar reportes financieros; el entrenador tampoco.
- [ ] Copia de seguridad verificada con una restauración de prueba.
- [ ] Las propietarias completan las 8 tareas del manual sin ayuda.

---

## Si hay que recortar

Si 20 semanas es demasiado, estas son las palancas **en orden de menor daño**:

| Recorte | Ahorro | Qué se pierde |
|---|---|---|
| Notificaciones se quedan en la versión mínima de la F5 | ~1,25 sem | Preferencias, resúmenes y anti-ruido. Funciona, molesta más. |
| Rentabilidad solo por evento y plan (no por horario ni servicio) | ~0,5 sem | Análisis fino. Lo esencial queda. |
| Eventos sin lista de espera en la v1 | ~0,5 sem | Se gestiona por WhatsApp. Se añade después sin migración. |
| Liquidación de entrenadores manual (registrar el gasto a mano) | ~1 sem | Se pierde el devengo automático, que es el mayor valor del módulo. **No recomendado.** |
| Aplazar Eventos a la v1.1 | ~2,5 sem | Depende de si hay eventos programados. **Es la palanca grande.** |

**Lo que no se debe recortar:** Servicios y derechos (F3). Es la única pieza que, aplazada, obliga a
migrar datos ya vendidos.

---

## Después de la v1 (no comprometido)

| Orden | Qué |
|---|---|
| v1.1 | Importación desde Excel · exportación PDF |
| v1.2 | Eventos grandes: códigos promocionales, entradas por categoría, formularios personalizados, patrocinadores |
| v2.0 | **Portal del miembro** (renovar, pagar, reservar, inscribirse a eventos) |
| v2.1 | PWA instalable + notificaciones push |
| v2.2 | Check-in por QR (clientes y eventos) |
| v2.3 | WhatsApp Business API oficial |
| v3.0 | Multi-sede · nómina completa · facturación electrónica |

---

## Cómo se trabaja cada fase

1. **Explicar** qué se construye y por qué. 2. **Migración** revisada antes de aplicarse.
3. **Dominio puro** con sus pruebas, antes que la interfaz. 4. **Servicios** con transacción,
autorización y auditoría. 5. **API / Server Actions** con validación compartida. 6. **Interfaz**
mobile-first, desde el estado vacío. 7. **Pruebas** unitarias e integración. 8. **Verificación de
permisos** con los tres roles. 9. **ADR** de lo no obvio. 10. **Demostración** y ajuste de la fase siguiente.

Ninguna fase se da por terminada con pruebas en rojo, sin auditoría en las acciones sensibles o sin
haberla probado en un teléfono real.

---

**Anterior:** [09-preguntas-pendientes.md](09-preguntas-pendientes.md) · **Siguiente:** [11-modulo-eventos.md](11-modulo-eventos.md)
