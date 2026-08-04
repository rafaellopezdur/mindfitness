# 09 · Preguntas pendientes

Organizadas por **cuándo bloquean**. Ninguna impide empezar: la Fase 1 (fundaciones) no depende de
ninguna respuesta. Cada pregunta indica el **valor temporal** que se usará mientras tanto y qué se rompe
si la respuesta llega tarde.

---

## 🔴🔴 Prioridad 0 — Necesaria antes de la Fase 3 (≈2,5 semanas de margen)

### P21 · Qué incluye exactamente cada plan
**La pregunta más urgente del proyecto.** Determina la estructura de `plan_entitlements` y
`membership_entitlements`, que no se puede añadir después sin migrar membresías ya vendidas
(ver [12-servicios-y-entrenadores.md](12-servicios-y-entrenadores.md)).

Para **cada plan**, hace falta saber:

| Pregunta | Ejemplo de respuesta útil |
|---|---|
| ¿Incluye acceso libre al gimnasio? | Sí, en todo el horario / solo en su franja / no |
| ¿Incluye acompañamiento de entrenador? | Sí, semipersonalizado / sí, personalizado / no |
| Si incluye, ¿cuántas sesiones y en qué periodo? | 8 al mes / 12 en total / ilimitadas |
| ¿Lo no usado pasa al mes siguiente? | Sí / no |
| ¿Incluye clases grupales? | Todas / solo yoga / ninguna |
| ¿Incluye eventos? | Ninguno / los internos / N al mes |
| ¿Tiene restricción de horario? | Solo 6–8 a. m. / cualquier hora |
| ¿Entrenador asignado fijo? | Sí, uno / el de la franja / ninguno |

**Y una pregunta transversal:** ¿existe hoy algo que se preste "por fuera" —una sesión suelta, un
acompañamiento puntual— y que no se cobre porque no hay dónde registrarlo? Esa es exactamente la fuga
que el módulo de servicios resuelve, y conviene diseñarlo con el caso real a la vista.

**Estado (4 ago 2026): 🟡 respondida en un 70 %.** La tabla de precios aporta la estructura
—acceso con límite semanal, asesoría y entrenador especializado como servicios separables— y ya está
modelada en [15-catalogo-planes.md](15-catalogo-planes.md). Faltan los detalles P30–P38, que son de
comportamiento, no de estructura: **el modelo de datos ya se puede construir.**

**Riesgo restante:** 🟢 bajo. Lo estructural quedó resuelto; lo pendiente son valores configurables.

### P28 · Autorización de excepciones: ¿estricta u operativa?
Cuando un entrenador va a prestar un servicio que el plan **no** incluye:
**(a)** ¿espera la aprobación de una administradora antes de prestarlo (estricto), o
**(b)** ¿lo presta y queda pendiente de aprobación (operativo)?

**Propuesta: (b) operativo**, porque el cliente está delante y en la práctica el servicio se presta
igual; la diferencia es si queda registrado o no. Es configurable, pero define el comportamiento por
defecto y las pruebas de la Fase 3. Ver [RN-129](07-reglas-negocio.md#11-servicios-y-derechos).

---

## 🔴 Prioridad 1 — Necesarias antes de la Fase 4 (2–3 semanas de margen)

### P1 · Proveedor de pagos en línea
**Pregunta:** ¿Con qué proveedor se cobrará en línea? ¿Ya hay cuenta o hay que abrirla?

| Opción | A favor | En contra |
|---|---|---|
| **Wompi** (Bancolombia) | Integración simple, PSE + tarjetas + Nequi, buena documentación, desembolso a Bancolombia | Comisión fija |
| **Mercado Pago** | Muy conocido, checkout probado, buena app de conciliación | Comisión más alta, menos "bancario" |
| **ePayco** | Muchos medios locales, precio competitivo | Documentación más irregular |
| **Solo transferencia + Nequi manual** | Cero comisión, cero integración | Alguien tiene que verificar cada pago a mano |

**Mientras tanto:** se desarrolla contra `MockGateway`. El flujo completo funciona en pruebas.
**Se necesita:** el nombre del proveedor y las llaves de *sandbox* antes de la Fase 7.

### ~~P2 · Planes reales~~ ✅ **RESPONDIDA (4 ago 2026)**
Recibidos Básico `$175.000`, Semi-Pro `$250.000`, Pro `$315.000` y pase diario `$27.000`, con su
frecuencia y sus servicios. Modelados en **[15-catalogo-planes.md](15-catalogo-planes.md)**.
Dejan de ser `[TEMP]`.

**Quedan abiertas 9 preguntas de detalle** (P30–P38) en
[15-catalogo-planes.md §7](15-catalogo-planes.md#7-preguntas-que-abren-estos-datos): límite duro o
blando, semana calendario o móvil, acumulación de días, entrenador fijo o de turno, asesoría contada o
continua, alcance del pase diario, si hay más planes, matrícula y definición de "mensual".
**Las tres primeras (P30, P31, P32) son las que bloquean las pruebas de la Fase 3.**

### P3 · Reglas de vencimiento y gracia
**Preguntas:** ¿Un plan mensual son 30 días exactos o un mes calendario? ¿Se permite entrar unos días
después de vencer (gracia)? ¿Cuántos? ¿Se puede pausar la membresía? ¿Con qué límite? ¿Qué pasa si
alguien se va de viaje dos semanas? ¿Se congela o se pierde?

**Mientras tanto:** mes calendario (RN-02), gracia = 0 días, pausa permitida sin límite.
**Riesgo si tarda:** medio. Son valores configurables, pero definen el comportamiento por defecto y
las pruebas de aceptación de Membresías (Fase 3).

### P4 · Identidad visual definitiva
**Preguntas:** ¿Existe el logo en vectorial (SVG/AI) y un manual de marca con los hexadecimales exactos?
¿Cuál es la tipografía del logotipo? ¿Hay versión horizontal, isotipo y versión sobre fondo oscuro
(para favicon y app móvil)?

**Mientras tanto:** la paleta de [08-identidad-visual.md](08-identidad-visual.md) extraída por muestreo.
**Riesgo si tarda:** bajo. Los colores son tokens CSS; cambiarlos es editar un archivo.

---

## 🟠 Prioridad 2 — Necesarias antes de la Fase 6 (4–6 semanas de margen)

### P5 · Horarios reales
Franjas actuales (día, hora inicio, hora fin), capacidad de cada una, entrenador a cargo, y si los
clientes quedan fijos en una franja o entran a la que quieran. Horario de atención del gimnasio y
días no laborables del año.
**Mientras tanto:** franjas `[TEMP]` de ejemplo.

### P6 · Textos legales
Términos y condiciones, política de privacidad y autorización de tratamiento de datos personales
(Ley 1581 de 2012 y Decreto 1074 de 2015). ¿Existen redactados? ¿Los revisa un abogado?
¿Se firma alguna declaración de salud o exoneración de responsabilidad al inscribirse?
**Mientras tanto:** textos `[TEMP]` marcados visiblemente como borrador.
**Nota:** el sistema versiona los consentimientos, así que actualizarlos después es seguro; pero
**no debe salir a producción** con textos de relleno.

### P7 · Datos del negocio
Razón social, NIT, dirección exacta, teléfonos, correo de contacto, WhatsApp de atención, redes
sociales, ¿una sede o varias?
**Mientras tanto:** `[TEMP]` en `business_settings`.

### P8 · Migración de datos existentes
¿Dónde están hoy los clientes: cuaderno, Excel, otro software? ¿Cuántos clientes activos hay
aproximadamente? ¿Se necesita cargar el histórico de pagos o basta con el estado actual?
¿Hay un Excel que se pueda ver para diseñar el importador?
**Impacto:** define si hace falta un módulo de importación (≈1 semana) y cuándo puede arrancar el uso real.

### P9 · Correo transaccional y dominio
¿Quién administra el DNS de `mindfitnessclub.com.co`? Hace falta configurar SPF, DKIM y DMARC para que
los correos no caigan en spam. ¿Existe ya un correo corporativo (`hola@mindfitnessclub.com.co`)?
**Riesgo si tarda:** alto para la experiencia — los correos de confirmación llegando a spam arruinan
la inscripción en línea. La propagación de DNS toma horas.

---

## 🟠 Prioridad 2b — Eventos y finanzas (antes de las Fases 8 y 9)

### P22 · Eventos reales
¿Qué actividades especiales hacen hoy o quieren hacer (yoga, kickboxing, talleres)? Para una típica:
¿cuánto cuesta?, ¿cuántos cupos?, ¿los miembros entran gratis o con descuento?, ¿qué planes?,
¿es una fecha o se repite?, ¿se cobra por anticipado o el mismo día?
¿Se permite cancelar y devolver el dinero? ¿Con cuánta antelación?
¿Cómo los difunden hoy: historias de Instagram, grupo de WhatsApp, cartelera en el gimnasio?

### P23 · Cómo se le paga hoy a cada entrenador
**La respuesta más importante del módulo financiero**, y la que suele estar solo en la cabeza de las
propietarias. Para cada entrenador: ¿fijo mensual, por hora, por clase, por sesión, por cliente,
porcentaje o una mezcla? ¿Cuál es la tarifa? ¿Qué día del mes se le paga? ¿Está por nómina o por
prestación de servicios?

**Y la pregunta que decide una regla del sistema:** si un entrenador cobra un porcentaje de las
membresías y un cliente **no paga**, ¿el entrenador cobra igual? La propuesta por defecto es que se
devenga **sobre el dinero recaudado** (`COLLECTED`), no sobre lo facturado. Ver
[RN-150](07-reglas-negocio.md#12-finanzas).

### P24 · Gastos
¿Cuáles son los gastos fijos mensuales y sus categorías reales? ¿Hay un contador o alguien que lleve la
contabilidad, y en qué formato la necesita? ¿Quién autoriza un gasto y a partir de qué monto?
¿Se guardan los recibos hoy? ¿Dónde?

### P25 · Cierre contable
¿Cierran el mes en alguna fecha concreta? ¿Alguien revisa las cifras antes de darlas por buenas?
El sistema propone bloquear el periodo una vez cerrado; ¿es compatible con cómo trabajan?

### P26 · Comisiones de la pasarela
Una vez elegido el proveedor (P1): ¿cuál es la comisión exacta (% + fijo, por medio de pago)?
Se registra como gasto automático; sin ese dato, el margen de los eventos pagos aparece inflado.

### P27 · Quién debe recibir qué notificación
Del catálogo de [14-notificaciones.md](14-notificaciones.md#3-catálogo-de-notificaciones):
¿ambas propietarias reciben todo o se reparten? ¿Recepción debe enterarse de los pagos fallidos?
¿A qué hora del día **no** se debe molestar a nadie (horario silencioso)?
¿Prefieren un resumen diario o avisos en el momento?

---

## 🟡 Prioridad 3 — Antes de salir a producción

### P10 · Comprobantes y facturación
¿Se entrega comprobante de pago o factura electrónica? Si es factura, ¿hay proveedor DIAN?
¿Se numeran los recibos con algún consecutivo existente que haya que continuar?
**Impacto:** si hace falta facturación electrónica, es un módulo aparte y un proveedor adicional.

### P11 · Operación diaria real
¿Cuántas personas atienden a la vez? ¿Con qué dispositivo trabaja recepción: computador, tablet o
teléfono? ¿Hay un equipo fijo en la entrada que pudiera funcionar en modo quiosco? ¿Cómo se controla
hoy el ingreso: hay torniquete, se firma una planilla, no se controla?
**Impacto:** ajusta la pantalla de asistencia y decide si vale la pena el modo quiosco y el QR.

### P29 · Los entrenadores y el teléfono
¿Cuántos entrenadores hay? ¿Todos usan teléfono inteligente durante la clase o lo dejan guardado?
¿Hay buena señal y wifi en toda la sala? ¿Estarían dispuestos a consultar la tarjeta antes de atender
a alguien, o hay que pensar la consulta desde una tablet fija?
**Impacto:** define si la tarjeta de acceso se diseña para el bolsillo del entrenador o para un punto
fijo, y si hace falta funcionamiento sin conexión.

### P12 · Comunicación con clientes
¿Se usa un número de WhatsApp personal o uno de empresa? ¿Interesa la API oficial (tiene costo por
conversación y requiere verificación de Meta) o basta con abrir el chat prellenado desde el sistema?
¿Con cuánta antelación se avisa hoy de un vencimiento?
**Mientras tanto:** `click-to-chat` con plantillas — sin costo y sin verificación.

### P13 · Alojamiento y presupuesto
¿Hay preferencia de proveedor? La propuesta por defecto es Vercel + Neon (PostgreSQL) + Cloudflare R2
+ Resend, con un costo mensual estimado bajo para este volumen. ¿Existe un tope de gasto mensual?
¿Quién será el dueño de las cuentas y de la facturación?

### P14 · Copias de seguridad y continuidad
¿Cada cuánto se respalda? ¿Cuánta pérdida de información sería tolerable en el peor caso (RPO) y
cuánto tiempo puede estar caído el sistema (RTO)? **Propuesta:** respaldo diario automático con
retención de 30 días + exportación semanal a un almacenamiento independiente.

---

## 🟢 Prioridad 4 — Definen el futuro, no bloquean la v1

- **P15 · Portal del miembro:** ¿es prioridad para la v2? ¿Los clientes pedirían reservar cupo en línea?
- **P16 · App móvil:** ¿PWA instalable (más barata, sin tiendas) o app nativa?
- **P17 · Check-in por QR:** ¿carné físico, QR en el teléfono del cliente o huella?
- **P18 · Multi-sede:** ¿está en los planes abrir otra sede? (Cambia la respuesta sobre `location_id`.)
- **P19 · Métricas de éxito:** ¿qué indicador diría, en tres meses, que el sistema funcionó?
  ¿Menos cartera? ¿Más renovaciones? ¿Menos tiempo en administración? Conviene medirlo desde el día uno.
- **P20 · Venta de productos:** ¿se venden suplementos, bebidas o mensualidades de otros servicios?
  El modelo de `charges` ya lo soporta con `concept = PRODUCT`, pero no hay inventario previsto.

---

## Cómo responder

No hace falta responder todo de una vez. Orden real de urgencia, actualizado al 4 de agosto:

1. ✅ ~~P2 / P21 estructural~~ — resuelto con la tabla de precios.
2. **P30, P31, P32** — tres respuestas de una línea cada una sobre el límite de días
   ([15 §7](15-catalogo-planes.md#7-preguntas-que-abren-estos-datos)). Bloquean las **pruebas** de la
   Fase 3, no su modelo.
3. **P28** — una sola decisión: ¿estricto u operativo? (propuesta: operativo).
4. **P33, P34** — entrenador fijo o de turno; asesoría contada o continua.
5. **P1 + P3** — proveedor de pagos y definición de "mensual".
6. **P23** — cómo se le paga a cada entrenador. Es la que más suele tardar porque nunca está escrita.

Todo lo demás puede llegar sobre la marcha sin frenar el desarrollo.

---

**Anterior:** [08-identidad-visual.md](08-identidad-visual.md) · **Siguiente:** [10-fases-desarrollo.md](10-fases-desarrollo.md)
