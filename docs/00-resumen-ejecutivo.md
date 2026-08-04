# 00 · Resumen ejecutivo

> **Estado del documento:** Borrador v0.1 · Entrega de diseño previa a desarrollo
> **Proyecto:** Mind Fitness Club — Plataforma de gestión
> **Dominio:** www.mindfitnessclub.com.co

---

## 1. Qué es el sistema

Mind Fitness Club WebApp es el **sistema operativo administrativo** del gimnasio: un único lugar donde
las propietarias y el personal gestionan clientes, inscripciones, planes, membresías, pagos, cartera,
asistencia, horarios y reportes.

El sistema tiene dos espacios y una tercera puerta ya prevista:

| Espacio | Usuarios | Estado v1 |
|---|---|---|
| **Portal público** (`/`) | Personas interesadas, prospectos | ✅ En v1 (catálogo + inscripción + pago) |
| **Portal administrativo** (`/admin`) | Propietaria, Recepción, Entrenador | ✅ En v1 (foco principal) |
| **Portal del miembro** (`/mi`) | Clientes | 🔜 Arquitectura preparada, no activado en v1 |

## 2. El problema que resuelve

Hoy la operación de un gimnasio pequeño vive repartida entre cuadernos, WhatsApp y hojas de cálculo.
Eso produce cuatro pérdidas concretas:

1. **Fuga de ingresos:** vencimientos que nadie vio, cartera que nadie cobró, renovaciones que no se pidieron.
2. **Doble digitación:** el cliente escribe sus datos en la web y alguien los vuelve a escribir en la planilla.
3. **Cero trazabilidad:** no se sabe quién anuló un pago, quién dio un descuento ni por qué.
4. **Decisiones a ciegas:** no hay ingresos por plan, retención, ocupación de horarios ni conversión.

## 3. Las cinco decisiones estructurales del diseño

Estas son las decisiones que definen el sistema. Todo lo demás se deriva de ellas.

### 3.1 Plan ≠ Membresía
El **plan** es el producto (catálogo, cambia en el tiempo). La **membresía** es la aplicación de un plan a
una persona (contrato, es inmutable en sus condiciones económicas). Cuando un plan sube de precio,
**ninguna** membresía anterior cambia: cada membresía guarda una *fotografía congelada* (`plan_snapshot`)
de las reglas y precios con los que se vendió.

### 3.2 Los planes son datos, no código
No existe `if (plan === 'MENSUAL')` en ninguna parte. Un plan es un conjunto de **reglas configurables**
(duración, sesiones, frecuencia, horarios permitidos, cupos, gracia, descuentos). Los diez tipos de plan
solicitados —mensual, por sesiones, semipersonalizado, personalizado, con horario, con cupo, promocional,
corporativo, de prueba, de cortesía— son *combinaciones* de esas reglas, no clases separadas.

### 3.3 Obligación ≠ Movimiento de dinero
Se separa **`charges`** (lo que el cliente debe: valor esperado, fecha límite) de **`payments`**
(el dinero que efectivamente entró: efectivo, transferencia, datáfono, en línea), unidos por
**`payment_allocations`**. Sin esta separación son imposibles los pagos parciales, los abonos a varias
obligaciones, la cartera con días de mora y los reembolsos correctos. *(Ver justificación completa en
[06-modelo-datos.md](06-modelo-datos.md), sección "Decisión: cargos vs. pagos").*

### 3.4 El dinero nunca se borra
No hay `DELETE` sobre información financiera. Una anulación conserva el movimiento original, crea un
movimiento inverso y exige un motivo. El histórico financiero es *append-only* y auditado.

### 3.5 La verdad del pago la dice el proveedor, no el navegador
Una membresía **jamás** se activa porque el usuario volvió a la página de confirmación. Se activa cuando
el webhook firmado —o la verificación directa contra la API del proveedor— confirma el pago. Toda la
capa de pagos en línea es un **adaptador** intercambiable: cambiar de proveedor no toca la lógica de negocio.

### 3.6 Un plan no es una etiqueta: es una lista de derechos
"Cliente activo" no dice nada útil a un entrenador. Lo que necesita saber es **qué tiene contratado
exactamente esta persona**: si incluye acompañamiento, cuántas sesiones le quedan, en qué horarios,
con quién. Por eso existe un catálogo de `services` y unos `entitlements` que el plan otorga y la
membresía **congela con sus propios contadores**. De ahí sale, calculada y no interpretada, cada una de
las alertas del entrenador. → [12](12-servicios-y-entrenadores.md)

### 3.7 Un evento reutiliza todo; no crea un universo paralelo
Un evento es un producto y una inscripción a evento es una venta. Usan los **mismos** clientes, cargos,
pagos, comprobantes y auditoría que las membresías. Quien se inscribe a una clase de yoga y tres meses
después compra una mensualidad es **una sola persona con un solo historial** — que es lo que convierte
los eventos en un canal de captación medible. → [11](11-modulo-eventos.md)

### 3.8 Ningún peso se cuenta dos veces
El módulo financiero tiene un solo riesgo real: registrar el mismo ingreso como pago de cliente **y**
como ingreso manual. Se impide en la base de datos, no en la interfaz. Y la rentabilidad se muestra como
**margen de contribución** (ingresos − costos directos), nunca como una "utilidad" obtenida repartiendo
el arriendo con una fórmula inventada. → [13](13-finanzas.md)

## 4. Estados derivados vs. estados almacenados

Decisión transversal que evita miles de escrituras nocturnas y estados desincronizados:

- **Se almacena** lo que solo cambia por una acción explícita: `ACTIVA`, `PAUSADA`, `CANCELADA`.
- **Se deriva** lo que solo depende del calendario: `PRÓXIMA A VENCER`, `VENCIDA`, `EN MORA`.

Una membresía con `end_date = ayer` **está vencida** aunque ningún proceso haya corrido. Un job nocturno
solo materializa el cambio para efectos de historial y notificaciones, nunca es la fuente de verdad.

## 5. Alcance de la v1

**Dentro:**
Portal público con catálogo e inscripción · Pago en línea con un proveedor · **20 módulos
administrativos** · 3 roles activos (Propietaria, Recepción, Entrenador) · Auditoría · Reportes con
exportación CSV · Comunicaciones vía plantillas + WhatsApp `click-to-chat` + correos transaccionales ·
**Eventos y clases especiales con página pública propia** · **Servicios contratados y tarjeta de acceso
para entrenadores** · **Finanzas completas: gastos, liquidación de entrenadores y rentabilidad** ·
**Centro de notificaciones interno**.

**Fuera (arquitectura preparada, no construido):**
Portal del miembro · App móvil / PWA instalable · WhatsApp Business API oficial · Notificaciones push ·
Check-in por QR · Exportación PDF · Multi-sede · Facturación electrónica DIAN · Eventos grandes
(códigos promocionales, entradas por categoría, patrocinadores, formularios personalizados) ·
Inventario de productos.

> **Coste de la ampliación:** los cuatro bloques nuevos llevan la v1 de ~13 a ~20 semanas de un
> desarrollador a tiempo completo. El desglose y las palancas de recorte están en
> [10-fases-desarrollo.md](10-fases-desarrollo.md#si-hay-que-recortar).

## 6. Datos temporales

No se inventa información comercial. Todo dato no confirmado vive **en un único archivo de placeholders**
(`config/placeholders.ts` + seed de base de datos), marcado como `[TEMP]`, y se reemplaza sin tocar código:

| Dato | Estado |
|---|---|
| Nombres, precios y duración de planes | ✅ **confirmado** (4 ago 2026) → [15-catalogo-planes.md](15-catalogo-planes.md) |
| Franjas horarias y capacidad | `[TEMP]` — pendiente |
| Proveedor de pagos | `[TEMP]` — pendiente de decisión |
| Textos legales (T&C, tratamiento de datos) | `[TEMP]` — requiere revisión legal |
| NIT, dirección, teléfonos, redes | `[TEMP]` — pendiente |
| Paleta de color | ✅ **confirmada** contra la pieza real; falta el vectorial y el nombre del tipo |

---

**Siguiente documento:** [01-arquitectura.md](01-arquitectura.md)
