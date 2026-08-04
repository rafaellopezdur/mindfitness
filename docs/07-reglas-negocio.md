# 07 · Reglas de negocio y casos límite

Cada regla tiene un identificador estable (`RN-xx`) para citarla en el código y en las pruebas.
Las marcadas **[CFG]** son configurables desde el portal administrativo; las demás son invariantes del sistema.

---

## 1. Fechas y vigencia

| ID | Regla |
|---|---|
| RN-01 | Todo cálculo de fecha de negocio usa `America/Bogota`. Una función única `businessToday()`. Prohibido `new Date()` disperso. |
| RN-02 | `end_date` de un plan de N meses = `start_date + N meses − 1 día`. Un mes desde el 15 de enero vence el **14 de febrero**, no el 15. Con `date-fns/addMonths`, que ya resuelve el 31 de enero → 28/29 de febrero. |
| RN-03 | La membresía es **válida durante todo** el `end_date`. Vence al terminar ese día, no al empezarlo. |
| RN-04 | **[CFG]** `expiring_soon_days` (por defecto 5): umbral de "próximo a vencer". |
| RN-05 | **[CFG]** `grace_days` por plan (por defecto 0): días tras el vencimiento en los que aún se permite el acceso, marcados visualmente como gracia. |
| RN-06 | Una fecha de inicio futura crea la membresía en `PENDING`; se activa sola el día de inicio (job) si el pago está confirmado. |
| RN-07 | **[CFG]** Los días no laborables (`holidays`) no extienden automáticamente la vigencia, salvo que se active `rules.holidays_extend_membership`. |

## 2. Planes

| ID | Regla |
|---|---|
| RN-10 | Un plan `ARCHIVED` no se puede vender, pero **sus membresías vivas siguen intactas**. |
| RN-11 | Cambiar el precio de un plan **nunca** altera membresías existentes (`plan_snapshot`). |
| RN-12 | El precio promocional aplica solo si `hoy ∈ [promo_starts_at, promo_ends_at]`; si no, rige `price`. La UI muestra ambos tachados. |
| RN-13 | Si `requires_schedule = true`, no se puede crear la membresía sin `schedule_slot_id`. |
| RN-14 | Un plan sin `duration` y sin `session_limit` es inválido: debe tener al menos un mecanismo de agotamiento. |
| RN-15 | Un plan con `is_public = true` exige nombre, descripción, precio y beneficios completos. |
| RN-16 | Duplicar un plan copia todo excepto `slug`, `status` (queda `DRAFT`) y las promociones vigentes. |

## 3. Membresías

| ID | Regla |
|---|---|
| RN-20 | **[CFG]** Un cliente tiene como máximo **una** membresía en `PENDING/ACTIVE/PAUSED`. Constraint en base de datos. |
| RN-21 | Una membresía solo se activa con el cargo saldado, **o** con activación autorizada explícita (`membership.override_dates` + motivo). |
| RN-22 | **Pausa:** el reloj se detiene. Al reactivar, `end_date += días pausados`. Se registran los dos momentos. |
| RN-23 | **[CFG]** Máximo de días de pausa por membresía y de pausas por año `[TEMP: sin límite]`. |
| RN-24 | **Renovar** crea una membresía nueva encadenada (`previous_membership_id`); jamás modifica la anterior. |
| RN-25 | Renovación anticipada (aún vigente): la nueva inicia el día siguiente al vencimiento actual. No se pierden días. |
| RN-26 | Renovación tras vencer: inicia hoy. **[CFG]** `renewal_backdate_within_grace` puede hacerla continuar desde el vencimiento. |
| RN-27 | **Cambio de plan:** la actual pasa a `SUPERSEDED` y nace otra. La diferencia se prorratea: `crédito = final_price × (días restantes / días totales)`, redondeado hacia abajo. |
| RN-28 | Los días de cortesía requieren permiso, motivo y quedan en `membership_changes` **y** en `audit_logs`. |
| RN-29 | Cancelar exige motivo y una decisión explícita sobre el saldo: reembolsar, dejar a favor o anular el cargo. |
| RN-30 | En planes por sesiones, agotarlas pasa la membresía a `COMPLETED` aunque queden días. |
| RN-31 | `sessions_used` es un contador denormalizado; el job nocturno lo reconcilia contra `attendance` y reporta discrepancias. |

## 4. Pagos

| ID | Regla |
|---|---|
| RN-40 | **Nunca** se hace `DELETE` sobre `payments`, `charges`, `payment_allocations` ni `attendance`. |
| RN-41 | Anular un pago: conserva la fila, la marca `VOIDED`, revierte las asignaciones, reabre los cargos y exige motivo. |
| RN-42 | Un pago no puede aplicar más de su importe: `Σ allocations ≤ payment.amount`. El excedente queda como saldo a favor del cliente. |
| RN-43 | Un pago parcial deja el cargo en `PARTIAL` y la membresía sigue `PENDING`, salvo autorización expresa de activación. |
| RN-44 | **[CFG]** `max_discount_percent_front_desk` (por defecto 0). Por encima del tope se requiere aprobación de `OWNER`, registrada en la membresía. |
| RN-45 | Todo descuento exige motivo de un catálogo configurable + texto libre. |
| RN-46 | Los comprobantes llevan consecutivo **sin huecos**, generado dentro de la transacción. |
| RN-47 | Un reembolso no puede superar lo efectivamente pagado menos lo ya reembolsado. |
| RN-48 | Corregir un pago solo altera campos no financieros (observaciones, referencia). Cambiar el importe = anular + volver a registrar. |

## 5. Pagos en línea

| ID | Regla |
|---|---|
| RN-50 | **La confirmación del navegador no activa nada.** Solo webhook firmado o `verifyTransaction`. |
| RN-51 | La referencia interna la genera el sistema y es única. Nunca se confía en el identificador del proveedor como clave primaria. |
| RN-52 | Todo webhook se procesa una sola vez: `provider_event_id` único. Un evento repetido devuelve `200` sin efectos. |
| RN-53 | Firma inválida → `401`, se guarda el intento y se genera alerta interna. Nunca se procesa. |
| RN-54 | Ante discrepancia webhook vs. API, **manda la API**. |
| RN-55 | Un `payment_intent` sin resolver a los `[CFG: 20]` minutos se verifica activamente; si sigue sin respuesta, expira y libera el cupo reservado. |
| RN-56 | Si llega un pago aprobado de un intento ya expirado, **se acepta el dinero**: se reactiva el flujo y se avisa al admin. Nunca se rechaza dinero recibido. |
| RN-57 | Conciliación diaria: comparar pagos del proveedor contra `payments` y listar diferencias. |

## 6. Asistencia

| ID | Regla |
|---|---|
| RN-60 | Marcar asistencia exige membresía `ACTIVE`, **o** `EXPIRED` dentro de la gracia, **o** autorización excepcional. |
| RN-61 | **[CFG por plan]** Límites diario, semanal y mensual de visitas. Al alcanzarlos, se requiere autorización. |
| RN-62 | Con `requires_schedule`, se valida que la hora esté dentro de la franja ± `[CFG: 30]` minutos de tolerancia. |
| RN-63 | Cada asistencia de un plan por sesiones descuenta una sesión, **salvo** que sea excepción marcada como no consumible. |
| RN-64 | Toda excepción guarda quién autorizó, el motivo y notifica a `OWNER`. |
| RN-65 | Las asistencias no se borran; se corrigen con un registro de anulación que conserva el original. |
| RN-66 | La asistencia se registra contra la franja solo si el cliente está inscrito en ella o hay autorización. |

## 7. Horarios y cupos

| ID | Regla |
|---|---|
| RN-70 | Cupos disponibles = `capacity (o override) − inscritos ACTIVE − reservas vigentes`. |
| RN-71 | Sin cupo no hay inscripción, salvo `schedule.capacity_override` con motivo auditado. |
| RN-72 | El checkout retiene el cupo `[CFG: 15]` minutos. Al expirar se libera solo. |
| RN-73 | Cancelar una sesión concreta crea una `slot_occurrence` `CANCELLED`, notifica a los inscritos y **[CFG]** puede añadir un día de cortesía. |
| RN-74 | Mover un cliente de franja conserva la trazabilidad (`moved_to_slot_id`), no reescribe el registro anterior. |
| RN-75 | Reducir la capacidad por debajo de los ya inscritos no expulsa a nadie: se advierte y la franja queda sobrecupo hasta que se normalice. |

## 8. Clientes e inscripciones

| ID | Regla |
|---|---|
| RN-80 | `(document_type, document_number)` es único. Es la identidad real del cliente. |
| RN-81 | Detección de duplicados en la inscripción web por: documento exacto (bloquea), correo exacto (advierte), teléfono exacto (advierte), nombre muy similar + fecha de nacimiento (advierte). |
| RN-82 | Documento coincidente → **no** se crea un cliente nuevo: se vincula la inscripción al existente y se marca `UNDER_REVIEW`. |
| RN-83 | Fusionar duplicados es una operación exclusiva de `OWNER`, transaccional, que traslada membresías, pagos y asistencias, y conserva el registro absorbido con `merged_into_id`. |
| RN-84 | Los consentimientos son obligatorios para inscribirse: se guarda la **versión** del texto, fecha, IP y canal. |
| RN-85 | Menor de edad `[CFG: < 18]` → exige consentimiento de acudiente. Bloquea la inscripción 100 % en línea. |
| RN-86 | Los datos mínimos para crear un cliente son nombre, documento y teléfono. Todo lo demás es opcional y se completa después (evita fricción en recepción). |
| RN-87 | Una inscripción sin actividad expira **[CFG]** y libera el cupo, pero **no se borra**: alimenta el reporte de conversión. |

## 9. Seguridad y auditoría

| ID | Regla |
|---|---|
| RN-90 | Todo permiso se verifica en el servidor. Ocultar en la UI no es autorizar. |
| RN-91 | La auditoría se escribe **dentro de la misma transacción** que el cambio. Si falla la auditoría, falla la operación. |
| RN-92 | Motivo obligatorio en: anulación, reembolso, descuento sobre tope, extensión, cortesía, cambio manual de fechas, acceso excepcional, sobrecupo, override de estado. |
| RN-93 | Las exportaciones registran usuario, filtros y número de filas. |
| RN-94 | Nadie modifica sus propios roles. Siempre debe quedar al menos un `OWNER` activo. |
| RN-95 | Los datos personales solo se acceden con sesión válida; los documentos se sirven con URL firmada de vida corta `[CFG: 5 min]`. |

## 10. Eventos y clases especiales → [11](11-modulo-eventos.md)

| ID | Regla |
|---|---|
| RN-100 | El `slug` del evento es único e inmutable una vez publicado. Cambiarlo rompería los enlaces ya compartidos por WhatsApp e Instagram. Se permite añadir alias, no reemplazar. |
| RN-101 | `DRAFT → PUBLISHED` exige: nombre, categoría, al menos una sesión con fecha, cupo, un tipo de entrada, política de cancelación y responsable asignado. |
| RN-102 | Solo ocupan cupo `CONFIRMED`, `ATTENDED` y `PENDING_PAYMENT` con retención vigente. `WAITLISTED` **nunca** ocupa cupo. |
| RN-103 | El cupo se verifica y se reserva **dentro de la transacción** con bloqueo de fila. Dos personas simultáneas no pueden tomar el último cupo. |
| RN-104 | `SOLD_OUT` es derivado (`disponibles <= 0`), nunca almacenado. Al cancelar alguien, el evento vuelve a abrirse solo. |
| RN-105 | Al liberarse un cupo se **ofrece** al primero de la lista con vencimiento **[CFG: 12 h]**; no se confirma de oficio. Si no responde, pasa al siguiente. |
| RN-106 | Superar el cupo requiere permiso, motivo y queda auditado y notificado (misma regla que RN-71). |
| RN-107 | Cancelar un evento obliga a decidir sobre el dinero recibido según `refund_policy`, y notifica a inscritos **y** lista de espera. |
| RN-108 | Reprogramar conserva las fechas originales, notifica y **[CFG]** abre una ventana de cancelación sin penalidad. |
| RN-109 | El precio se congela en `price_snapshot` al inscribirse. Cambiar el precio del evento no afecta a quien ya se inscribió (mismo principio que RN-11). |
| RN-110 | El acceso gratuito o con descuento por plan se resuelve contra `event_eligible_plans` **y** se verifica que la membresía siga activa el día del evento. |
| RN-111 | Un evento `MEMBERS_ONLY` no aparece en la cartelera pública; solo es accesible por `public_token`. |
| RN-112 | La búsqueda de miembro en la inscripción pública devuelve datos **enmascarados** (`Ana P. · CC ***4567`). Nunca datos completos. |
| RN-113 | Al cerrar un evento, las inscripciones `CONFIRMED` sin check-in pasan a `NO_SHOW` automáticamente. |
| RN-114 | Un evento realizado genera el devengo de su staff (`trainer_services`) automáticamente. |

## 11. Servicios y derechos → [12](12-servicios-y-entrenadores.md)

| ID | Regla |
|---|---|
| RN-120 | Un plan **no se puede publicar sin al menos un derecho declarado**. `modality` es etiqueta pública; los derechos son la verdad operativa. |
| RN-121 | Los `membership_entitlements` se materializan **en la misma transacción** que crea la membresía, congelando la regla del plan. |
| RN-122 | Cambiar los derechos de un plan **no afecta** a las membresías ya vendidas. |
| RN-123 | `quantity_used + quantity_reserved` nunca supera `quantity_total`. Constraint en base de datos. |
| RN-124 | Al renovar, los contadores se reinician según `period` y `rollover`. Sin `rollover`, lo no usado se pierde y queda registrado. |
| RN-125 | Al pausar una membresía, sus derechos pasan a `SUSPENDED` y el periodo se desplaza al reactivar. |
| RN-126 | `resolveAccess()` es una función pura, sin I/O, con una prueba por cada código de resultado. Es la única fuente de las alertas del entrenador. |
| RN-127 | La tarjeta de acceso rápido **no serializa ningún importe**. La ausencia de dinero se verifica con una prueba sobre el DTO. |
| RN-128 | Quien solicita una autorización nunca puede aprobarla, aunque tuviera ambos permisos. |
| RN-129 | **[CFG] Modo operativo (por defecto):** el entrenador puede prestar el servicio con la solicitud enviada y aprobación posterior. Registrar tarde es mejor que no registrar. |
| RN-130 | Una autorización sin resolver en **[CFG: 48 h]** escala a notificación crítica y aparece en el dashboard. |
| RN-131 | Una autorización aprobada puede combinar efectos: generar cobro, descontar sesión, otorgar derecho o ninguno (cortesía). El efecto queda registrado. |
| RN-132 | El entrenador vigente se resuelve por precedencia `TEMPORARY > MEMBERSHIP > CLIENT > SLOT > PLAN`, y la tarjeta muestra **de dónde viene** la asignación. |
| RN-133 | Todo servicio prestado genera un `service_usage`, aunque sea gratuito o excepcional. Sin registro no hay rentabilidad ni liquidación. |

## 12. Finanzas → [13](13-finanzas.md)

| ID | Regla |
|---|---|
| RN-140 | **Un `income_entry` no puede tener `client_id`, `charge_id` ni `payment_id`.** El dinero de un cliente se registra como pago, jamás también como ingreso manual. Constraint en base de datos. |
| RN-141 | Todo reporte financiero declara visiblemente su criterio: **Caja** (por defecto) o Causación. Nunca se muestra una cifra sin decir cuál usa. |
| RN-142 | La rentabilidad por servicio, plan, evento, entrenador y horario es **margen de contribución** (ingresos − costos directos). Los costos fijos solo se restan a nivel global. |
| RN-143 | **[CFG, apagado por defecto]** El prorrateo de costos fijos, si se activa, rotula la cifra como *estimada*. |
| RN-144 | Los gastos no se eliminan: se anulan con motivo, conservando el original. |
| RN-145 | **[CFG]** Un gasto por encima del tope requiere aprobación de `OWNER` antes de marcarse como pagado. |
| RN-146 | Cada pago en línea confirmado genera automáticamente el gasto de comisión de pasarela, con la fórmula configurable del proveedor. |
| RN-147 | Cerrar un periodo bloquea el registro y la modificación de movimientos con fecha dentro de él, **para todos los roles**. Reabrir exige `OWNER`, motivo y notificación crítica. |
| RN-148 | Las tarifas de entrenador **nunca se editan**: se cierra la vigente y se crea otra. Lo ya devengado no cambia. |
| RN-149 | El importe de un servicio prestado se congela en `rate_snapshot` en el momento de prestarse. |
| RN-150 | **[CFG] `trainer_percent_basis = COLLECTED` (por defecto):** el porcentaje se devenga cuando el dinero entra. Anular un pago genera un ajuste negativo en el periodo siguiente, no un borrado. |
| RN-151 | Un `trainer_service` pertenece como máximo a **una** liquidación. Generar la liquidación lo congela (`SETTLED`). |
| RN-152 | Aprobar una liquidación exige `OWNER` y no puede hacerlo quien la generó si tiene otro rol. |
| RN-153 | Registrar el pago de una liquidación **crea el gasto automáticamente**. No se registra dos veces. |
| RN-154 | Anular una liquidación pagada exige motivo y devuelve sus servicios a `PENDING`. |
| RN-155 | El entrenador ve su propia liquidación y puede acusar recibo o marcarla `DISPUTED`; nunca puede editarla. |

## 13. Notificaciones → [14](14-notificaciones.md)

| ID | Regla |
|---|---|
| RN-160 | Las notificaciones se escriben en el `outbox` **dentro de la transacción** del hecho que las origina. Si la operación falla, no hay aviso; si tiene éxito, el aviso está garantizado. |
| RN-161 | `dedupe_key` impide generar dos veces el mismo aviso dentro de su ventana. Índice único en base de datos. |
| RN-162 | Un hecho es una fila en `notifications`; el estado de lectura es por persona en `notification_recipients`. Resolver marca resuelto **para todos**, con el nombre de quien resolvió. |
| RN-163 | Quien ejecuta una acción no recibe la notificación de su propia acción. |
| RN-164 | Solo `CRITICAL` ignora el horario silencioso y las preferencias del usuario. |
| RN-165 | Si el hecho deja de ser cierto (pagó, se liberó el cupo, se resolvió el error), la notificación se auto-resuelve con nota. |
| RN-166 | La insignia cuenta únicamente `URGENT` + `CRITICAL` sin resolver. |
| RN-167 | Una `CRITICAL` sin resolver en **[CFG: 24 h]** se re-notifica y entra al resumen semanal. |
| RN-168 | Las notificaciones internas y los mensajes a clientes **no comparten tabla ni destinatarios**. Un aviso interno no puede salir hacia un cliente. |

---

# Casos límite considerados

**Dinero**
- Pago mayor al cargo → se aplica el excedente como saldo a favor, visible en la ficha.
- Pago recibido de un cliente sin cargo abierto → cargo genérico `OTHER` o saldo a favor.
- Webhook que llega **antes** de que termine la transacción de creación del intento → reintento con backoff (el `SELECT ... FOR UPDATE` del intent resuelve la carrera).
- Webhook duplicado o desordenado (aprobado → rechazado) → gana el estado verificado contra la API.
- Anular un pago de un cliente que ya asistió → la asistencia queda, la membresía vuelve a `PENDING` y salta una alerta.
- Cambio de precio del plan entre el paso 1 y el paso 5 de la inscripción → **se respeta el precio mostrado**; el intent congela el importe al iniciar el checkout.

**Membresías**
- Renovar una membresía pausada → se prohíbe: primero reactivar.
- Pausar una membresía por vencer mañana → permitido; se conserva ese día para después.
- Cambio de plan a uno más barato → genera saldo a favor, no reembolso automático.
- Cliente que reaparece un año después → renovación normal; el histórico anterior se conserva íntegro.
- Membresía con inicio futuro y pago hecho → `PENDING` hasta el día de inicio.

**Asistencia y horarios**
- Cliente que llega justo al vencer a las 11 p. m. → válido: la membresía cubre todo el día.
- Doble check-in por error → aviso "ya registrado hace X minutos", requiere confirmar.
- Reducción de capacidad con inscritos → sobrecupo transitorio señalizado, sin expulsiones.
- Entrenador ausente → reasignación en `slot_occurrence` o cancelación con aviso.
- Cambio de horario de una franja con inscritos → se pregunta si migra a los inscritos o si se crea una franja nueva.

**Datos**
- Dos personas con el mismo nombre → el documento las distingue; la UI muestra documento y fecha de nacimiento en los resultados de búsqueda.
- Cliente sin correo → permitido; se desactivan las comunicaciones por correo para él.
- Cliente que ejerce supresión de datos (Ley 1581) → anonimización, **no** borrado: se conservan los registros financieros exigidos por ley con los datos personales sustituidos.
- Importación inicial desde Excel → módulo aparte con validación previa, informe de errores y modo simulación.

**Operación**
- Corte de internet en recepción → limitación conocida de la v1; se registra como riesgo y se evalúa modo offline en una fase posterior.
- Dos operadores registrando el mismo pago a la vez → `idempotency_key` por formulario evita el duplicado.
- Reloj del servidor en otra zona → todo pasa por `businessToday()`; hay una prueba que lo verifica.
- Job nocturno que falla → `job_runs` lo registra, alerta al `OWNER` y el siguiente ciclo recupera, porque los estados son **derivados** (RN-03) y no dependen del job.

**Eventos**
- Dos personas toman el último cupo en el mismo segundo → bloqueo de fila; la segunda va a lista de espera.
- Alguien cancela 5 minutos antes del evento → el cupo se libera pero ya no hay tiempo de ofrecerlo; **[CFG]** la oferta automática se desactiva N horas antes.
- Un miembro se inscribe gratis por su plan y su membresía vence antes del evento → se revalida el día del evento; si venció, se le cobra o se le da de baja según **[CFG]**.
- Evento cancelado con 18 pagos recibidos → reembolso masivo; se genera un lote y cada uno queda trazado.
- La misma persona se inscribe dos veces al mismo evento → bloqueado por constraint; se le muestra su inscripción existente.
- Alguien de la lista de espera paga justo cuando expira su oferta → se acepta el dinero (mismo criterio que RN-56) y se resuelve manualmente si ya no hay cupo.

**Servicios y autorizaciones**
- El entrenador presta la sesión y la admin **rechaza** la autorización → el `service_usage` queda marcado `was_within_entitlement = false` sin cobro, y genera notificación para revisión. El servicio prestado no se borra: ocurrió.
- Cliente con 0 sesiones que asiste a su franja habitual → la tarjeta muestra "sin sesiones restantes" y ofrece *cobrar sesión adicional* o *solicitar cortesía*.
- Membresía pausada a mitad de un periodo de derechos mensuales → el periodo se desplaza; las sesiones no usadas no se pierden por la pausa.
- Dos entrenadores asignados al mismo cliente con el mismo alcance → gana el de `role = PRIMARY`; si empatan, el más reciente, y se muestra una advertencia de configuración.

**Finanzas**
- Se anula un pago ya incluido en una liquidación **pagada** → ajuste negativo en el periodo siguiente (RN-150), nunca modificación retroactiva.
- Se registra un gasto con fecha de un periodo cerrado → bloqueado; se ofrece registrarlo en el periodo abierto o reabrir el cerrado (auditado).
- Un entrenador con pago mixto (fijo + porcentaje) en un mes sin clientes → cobra el fijo; el porcentaje es 0. Dos filas de tarifa, sin lógica especial.
- La comisión real del proveedor difiere de la fórmula configurada → la conciliación lo detecta y ajusta el gasto con trazabilidad.
- Evento con ingresos pero sin costos registrados → el reporte marca "sin costos registrados" en lugar de mostrar 100 % de margen.

**Notificaciones**
- 30 inscripciones a un evento en 10 minutos → una sola notificación agregada.
- Un usuario desactivado con notificaciones pendientes → se reasignan a `OWNER`.
- Fallo del proveedor de correo → la notificación permanece en el centro interno; el canal fallido se registra en `notification_logs` y se reintenta.

---

**Anterior:** [06-modelo-datos.md](06-modelo-datos.md) · **Siguiente:** [08-identidad-visual.md](08-identidad-visual.md)
