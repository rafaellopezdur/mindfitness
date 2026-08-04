# 03 · Roles y matriz de permisos

## 1. Roles iniciales (seed)

| Rol | Código | Descripción | v1 |
|---|---|---|---|
| Propietaria / Administradora | `OWNER` | Acceso total, incluida la configuración crítica y los permisos. | ✅ |
| Recepción | `FRONT_DESK` | Operación diaria: clientes, pagos presenciales, asistencia, vencimientos. | ✅ |
| Entrenador | `TRAINER` | Solo sus clientes y franjas asignadas. Sin información financiera. | ✅ |
| Cliente | `CLIENT` | Portal del miembro. Creado en el seed, **sin permisos activos**. | 🔜 |

Los roles son **datos editables**. Los permisos son **constantes de código**. Se pueden crear roles nuevos
(p. ej. "Recepción senior") desde Configuración combinando permisos existentes.

## 2. Catálogo de permisos

Formato `recurso.acción`. Esta es la lista cerrada de la v1.

<details>
<summary><b>Ver los 78 permisos base</b></summary>

**Clientes** · `client.read` `client.read.assigned` `client.create` `client.update` `client.update.sensitive` `client.status.override` `client.note.create` `client.note.read.internal` `client.document.read` `client.document.upload` `client.delete` `client.export`

**Planes** · `plan.read` `plan.create` `plan.update` `plan.duplicate` `plan.publish` `plan.archive` `plan.price.update`

**Membresías** · `membership.read` `membership.read.assigned` `membership.create` `membership.renew` `membership.extend` `membership.pause` `membership.resume` `membership.change_plan` `membership.cancel` `membership.courtesy_days` `membership.transfer_balance` `membership.override_dates`

**Pagos** · `charge.read` `charge.create` `charge.update` `payment.read` `payment.create` `payment.create.cash` `payment.create.online` `payment.update` `payment.void` `payment.refund` `payment.discount.apply` `payment.discount.approve` `receipt.read` `receipt.send` `payment.reconcile`

**Cartera** · `collection.read` `collection.action.create` `collection.commitment.create` `reminder.send`

**Asistencia** · `attendance.read` `attendance.read.assigned` `attendance.create` `attendance.create.exception` `attendance.update` `attendance.delete`

**Horarios** · `schedule.read` `schedule.create` `schedule.update` `schedule.capacity.override` `schedule.block` `schedule.cancel_session` `enrollment.create` `enrollment.move` `enrollment.delete`

**Entrenadores** · `trainer.read` `trainer.create` `trainer.update` `trainer.assign_client`

**Inscripciones** · `registration.read` `registration.review` `registration.approve` `registration.reject` `registration.merge_duplicate`

**Comunicaciones** · `message.template.read` `message.template.manage` `message.send` `message.campaign.send`

**Reportes** · `report.operational.read` `report.commercial.read` `report.financial.read` `report.export`

**Configuración** · `settings.read` `settings.update` `settings.update.critical` `settings.integrations.manage`

**Usuarios** · `user.read` `user.create` `user.update` `user.deactivate` `role.manage` `permission.assign` `session.revoke`

**Auditoría** · `audit.read` `audit.export`

</details>

<details>
<summary><b>Ver los 56 permisos añadidos por la ampliación</b> (eventos, servicios, finanzas, notificaciones)</summary>

**Eventos** · `event.read` `event.read.assigned` `event.create` `event.update` `event.publish`
`event.cancel` `event.reschedule` `event.category.manage` `event.price.manage` `event.staff.manage`
`event.registration.read` `event.registration.create` `event.registration.cancel` `event.registration.refund`
`event.registration.override_capacity` `event.waitlist.manage` `event.attendance.create`
`event.finance.read` `event.export`

**Servicios y derechos** · `service.read` `service.manage` `entitlement.read` `entitlement.grant`
`entitlement.adjust` `access_card.read` `service_usage.create` `authorization.request`
`authorization.approve` `authorization.read`

**Finanzas** · `finance.dashboard.read` `expense.read` `expense.create` `expense.update` `expense.approve`
`expense.void` `income.create` `income.void` `period.read` `period.close` `period.reopen`
`profitability.read` `finance.export`

**Entrenadores (remuneración)** · `trainer.rate.read` `trainer.rate.manage` `trainer.service.read`
`trainer.service.create` `trainer.settlement.read` `trainer.settlement.read.own` `trainer.settlement.generate`
`trainer.settlement.approve` `trainer.settlement.pay`

**Notificaciones** · `notification.read` `notification.assign` `notification.resolve`
`notification.type.manage` `notification.preferences.manage`

</details>

## 3. Matriz de permisos

✅ concedido · 🟡 concedido con **alcance limitado** · ❌ denegado

| Capacidad | OWNER | FRONT_DESK | TRAINER | CLIENT (futuro) |
|---|:---:|:---:|:---:|:---:|
| **CLIENTES** ||||
| Ver listado completo de clientes | ✅ | ✅ | 🟡 solo asignados | ❌ |
| Crear cliente | ✅ | ✅ | ❌ | 🟡 auto-registro |
| Editar datos básicos (contacto, dirección) | ✅ | ✅ | ❌ | 🟡 propios |
| Editar datos sensibles (documento, fecha nac.) | ✅ | ❌ | ❌ | ❌ |
| Forzar estado del cliente (bloquear, reactivar) | ✅ | ❌ | ❌ | ❌ |
| Ver saldo y situación financiera del cliente | ✅ | ✅ | ❌ | 🟡 propia |
| Añadir observación interna | ✅ | ✅ | 🟡 solo asignados | ❌ |
| Subir documentos | ✅ | ✅ | ❌ | 🟡 propios |
| Exportar listado de clientes | ✅ | ❌ | ❌ | ❌ |
| **PLANES** ||||
| Ver planes | ✅ | ✅ | ✅ | ✅ públicos |
| Crear / editar / duplicar plan | ✅ | ❌ | ❌ | ❌ |
| Cambiar precio | ✅ | ❌ | ❌ | ❌ |
| Publicar / archivar plan | ✅ | ❌ | ❌ | ❌ |
| **MEMBRESÍAS** ||||
| Ver membresías | ✅ | ✅ | 🟡 solo asignadas, sin importes | 🟡 propia |
| Crear membresía | ✅ | ✅ | ❌ | ❌ |
| Renovar | ✅ | ✅ | ❌ | 🟡 propia |
| Extender / días de cortesía | ✅ | ❌ | ❌ | ❌ |
| Pausar / congelar / reactivar | ✅ | 🟡 pausar con motivo | ❌ | ❌ |
| Cambiar de plan | ✅ | ❌ | ❌ | ❌ |
| Cancelar | ✅ | ❌ | ❌ | ❌ |
| Modificar fechas manualmente | ✅ | ❌ | ❌ | ❌ |
| Transferir saldo | ✅ | ❌ | ❌ | ❌ |
| **PAGOS** ||||
| Ver pagos | ✅ | ✅ | ❌ | 🟡 propios |
| Registrar pago presencial (efectivo/transf./datáfono) | ✅ | ✅ | ❌ | ❌ |
| Corregir un pago (mismo día, sin cambiar valor) | ✅ | 🟡 solo observaciones | ❌ | ❌ |
| **Anular** un pago | ✅ | ❌ | ❌ | ❌ |
| Reembolsar | ✅ | ❌ | ❌ | ❌ |
| Aplicar descuento | ✅ | 🟡 hasta el tope configurado | ❌ | ❌ |
| Aprobar descuento por encima del tope | ✅ | ❌ | ❌ | ❌ |
| Conciliar pagos en línea | ✅ | ❌ | ❌ | ❌ |
| Emitir / reenviar comprobante | ✅ | ✅ | ❌ | 🟡 descargar |
| **CARTERA** ||||
| Ver cartera y mora | ✅ | ✅ | ❌ | ❌ |
| Registrar gestión de cobro | ✅ | ✅ | ❌ | ❌ |
| Registrar compromiso de pago | ✅ | ✅ | ❌ | ❌ |
| Enviar recordatorio | ✅ | ✅ | ❌ | ❌ |
| **ASISTENCIA** ||||
| Marcar asistencia | ✅ | ✅ | 🟡 solo su franja | 🟡 auto-check-in QR |
| Autorizar acceso excepcional (membresía vencida) | ✅ | 🟡 con motivo, notifica a OWNER | ❌ | ❌ |
| Ver historial de asistencia | ✅ | ✅ | 🟡 solo asignados | 🟡 propio |
| Corregir / eliminar registro de asistencia | ✅ | ❌ | ❌ | ❌ |
| **HORARIOS** ||||
| Ver horarios y ocupación | ✅ | ✅ | ✅ | ✅ |
| Crear / editar franjas y capacidad | ✅ | ❌ | ❌ | ❌ |
| Asignar o mover cliente de franja | ✅ | ✅ | ❌ | 🟡 reservar |
| Exceder cupo (con autorización registrada) | ✅ | ❌ | ❌ | ❌ |
| Bloquear fecha / cancelar sesión | ✅ | 🟡 cancelar sesión puntual | ❌ | ❌ |
| **INSCRIPCIONES** ||||
| Ver bandeja de inscripciones | ✅ | ✅ | ❌ | ❌ |
| Aprobar / rechazar | ✅ | 🟡 aprobar sin excepciones | ❌ | ❌ |
| Resolver duplicados (fusionar) | ✅ | ❌ | ❌ | ❌ |
| **COMUNICACIONES** ||||
| Usar plantillas y enviar mensaje individual | ✅ | ✅ | ❌ | ❌ |
| Crear / editar plantillas | ✅ | ❌ | ❌ | ❌ |
| Enviar campaña a un segmento | ✅ | ❌ | ❌ | ❌ |
| **REPORTES** ||||
| Reportes operativos (asistencia, ocupación) | ✅ | ✅ | 🟡 solo sus franjas | ❌ |
| Reportes comerciales (conversión, retención) | ✅ | 🟡 solo lectura | ❌ | ❌ |
| Reportes financieros (ingresos, cartera) | ✅ | ❌ | ❌ | ❌ |
| Exportar CSV | ✅ | 🟡 no financieros | ❌ | ❌ |
| **CONFIGURACIÓN** ||||
| Ver configuración | ✅ | ✅ | ❌ | ❌ |
| Editar información no crítica (contacto, redes) | ✅ | ❌ | ❌ | ❌ |
| Editar reglas críticas (vencimiento, gracia, métodos de pago, textos legales) | ✅ | ❌ | ❌ | ❌ |
| Gestionar integraciones y llaves | ✅ | ❌ | ❌ | ❌ |
| **USUARIOS** ||||
| Ver usuarios | ✅ | ❌ | ❌ | ❌ |
| Crear / desactivar usuario | ✅ | ❌ | ❌ | ❌ |
| Gestionar roles y permisos | ✅ | ❌ | ❌ | ❌ |
| Revocar sesiones | ✅ | ❌ | ❌ | ❌ |
| **AUDITORÍA** ||||
| Consultar bitácora | ✅ | ❌ | ❌ | ❌ |
| Exportar bitácora | ✅ | ❌ | ❌ | ❌ |
| **EVENTOS** ||||
| Ver eventos | ✅ | ✅ | 🟡 solo los suyos | ✅ públicos |
| Crear / editar evento | ✅ | ❌ | ❌ | ❌ |
| Publicar / cancelar / reprogramar | ✅ | ❌ | ❌ | ❌ |
| Gestionar tipos de entrada y precios | ✅ | ❌ | ❌ | ❌ |
| Ver lista de inscritos | ✅ | ✅ | 🟡 solo sus eventos, sin importes | ❌ |
| Inscribir a alguien manualmente | ✅ | ✅ | ❌ | 🟡 a sí mismo |
| Cancelar una inscripción | ✅ | ✅ | ❌ | 🟡 la propia |
| Reembolsar inscripción a evento | ✅ | ❌ | ❌ | ❌ |
| Aceptar por encima del cupo | ✅ | ❌ | ❌ | ❌ |
| Gestionar lista de espera | ✅ | ✅ | ❌ | ❌ |
| Marcar asistencia al evento | ✅ | ✅ | ✅ sus eventos | 🔜 QR |
| Ver finanzas del evento | ✅ | ❌ | ❌ | ❌ |
| **SERVICIOS Y DERECHOS** ||||
| Ver catálogo de servicios | ✅ | ✅ | ✅ | ❌ |
| Crear / editar servicios | ✅ | ❌ | ❌ | ❌ |
| **Tarjeta de acceso rápido** | ✅ | ✅ | ✅ | ❌ |
| Registrar servicio prestado | ✅ | ✅ | ✅ sus clientes | ❌ |
| Otorgar un derecho extra (sesión, cortesía) | ✅ | ❌ | ❌ | ❌ |
| Ajustar contadores de sesiones | ✅ | ❌ | ❌ | ❌ |
| **Solicitar** autorización de excepción | ✅ | ✅ | ✅ | ❌ |
| **Aprobar** autorización de excepción | ✅ | ❌ | ❌ | ❌ |
| **FINANZAS** ||||
| Ver panel financiero | ✅ | ❌ | ❌ | ❌ |
| Ver gastos | ✅ | ❌ | ❌ | ❌ |
| Registrar gasto | ✅ | 🟡 si se habilita, bajo tope y sujeto a aprobación | ❌ | ❌ |
| Aprobar gasto | ✅ | ❌ | ❌ | ❌ |
| Anular gasto | ✅ | ❌ | ❌ | ❌ |
| Registrar ingreso manual | ✅ | ❌ | ❌ | ❌ |
| Cerrar / reabrir periodo contable | ✅ | ❌ | ❌ | ❌ |
| Ver rentabilidad | ✅ | ❌ | ❌ | ❌ |
| **REMUNERACIÓN DE ENTRENADORES** ||||
| Ver / editar tarifas | ✅ | ❌ | ❌ | ❌ |
| Ver servicios prestados (devengo) | ✅ | ❌ | 🟡 **solo los propios** | ❌ |
| Generar liquidación | ✅ | ❌ | ❌ | ❌ |
| Aprobar liquidación | ✅ | ❌ | ❌ | ❌ |
| Registrar pago de liquidación | ✅ | ❌ | ❌ | ❌ |
| Ver la liquidación propia y acusar recibo | ✅ | ❌ | 🟡 **sí, la suya** | ❌ |
| Ver liquidaciones de otros entrenadores | ✅ | ❌ | ❌ | ❌ |
| **NOTIFICACIONES** ||||
| Ver el centro de notificaciones | ✅ | ✅ | ✅ | ❌ |
| Recibir avisos financieros y críticos | ✅ | 🟡 solo operativos | ❌ | ❌ |
| Asignar una notificación a alguien | ✅ | ❌ | ❌ | ❌ |
| Resolver una notificación | ✅ | 🟡 las operativas | 🟡 las suyas | ❌ |
| Configurar tipos y canales del sistema | ✅ | ❌ | ❌ | ❌ |
| Ajustar sus propias preferencias | ✅ | ✅ | ✅ | ❌ |

## 4. Reglas de autorización que no se ven en la matriz

1. **El alcance se aplica en la consulta.** Un entrenador que abre `/admin/clientes` no recibe la lista
   completa filtrada en el navegador: el repositorio añade `WHERE client_assignments.trainer_id = :me`.
2. **El entrenador nunca ve dinero.** Los campos de importe se omiten en la serialización para
   `TRAINER`, no se ocultan con CSS.
3. **Nadie puede editar su propio rol**, ni siquiera `OWNER`. Cambiar los permisos de la propia cuenta
   exige otro usuario `OWNER`. Evita el auto-bloqueo y el auto-ascenso.
4. **Siempre debe existir al menos un `OWNER` activo.** El sistema rechaza desactivar al último.
5. **Motivo obligatorio** en: anulación, reembolso, descuento sobre tope, extensión, cortesía, cambio
   manual de fechas, acceso excepcional, exceder cupo, cambio de estado forzado.
6. **Doble confirmación** (escribir el nombre del cliente o el valor) en: anular pago, cancelar membresía,
   desactivar usuario, archivar plan con membresías activas.
7. **Las exportaciones se auditan** con el filtro aplicado y el número de filas.
8. **Permiso ≠ visibilidad de menú, pero el menú se deriva del permiso.** Un módulo sin ningún permiso
   concedido no aparece en la navegación.
9. **El entrenador ve su propio dinero, nunca el ajeno.** `trainer.settlement.read.own` está acotado por
   `trainer_id = actor.trainerId` en el repositorio. Es la única excepción a "el entrenador no ve
   información financiera", y está justificada: es su remuneración. Ver
   [13-finanzas.md](13-finanzas.md#7-qué-ve-el-entrenador-de-su-propio-dinero).
10. **La tarjeta de acceso rápido se serializa sin importes.** No es que se oculten en la vista: el DTO
    que devuelve `access_card.read` **no contiene** campos de dinero. Un `curl` con el token del
    entrenador tampoco los ve.
11. **Solicitar ≠ aprobar.** El entrenador solicita autorizaciones; solo `OWNER` las aprueba. Quien
    solicita nunca puede aprobar su propia solicitud, aunque tuviera ambos permisos.
12. **Un periodo contable cerrado bloquea a todos**, incluido `OWNER`. Reabrirlo es una acción explícita,
    auditada y notificada como `CRITICAL`.

---

**Anterior:** [02-mapa-modulos.md](02-mapa-modulos.md) · **Siguiente:** [04-navegacion.md](04-navegacion.md)
