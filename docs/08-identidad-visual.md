# 08 · Identidad visual y sistema de diseño

> **Origen:** paleta extraída por muestreo del logotipo y **confirmada** contra la tabla de precios real
> del sitio (agosto 2026). Estructura de pantalla inspirada en el referente de dashboard aportado.
> Falta el archivo vectorial y el nombre de la tipografía. Ver [09-preguntas-pendientes.md](09-preguntas-pendientes.md#p4).

---

## 1. Lectura del logo

El logotipo *MINDFITNESS NS CLUB* aporta tres señales que gobiernan todo el sistema visual:

1. **Paleta cálida cobre → ámbar.** Nada de azul corporativo. El sistema es cálido, cercano, con energía.
2. **Contraste tipográfico dentro de una misma familia** — `MIND` en peso sólido, `FITNESS` en tono claro.
   Se traslada a la interfaz: un mismo tipo de letra, jerarquía por peso y color, no por familias distintas.
3. **El trazo curvo** (la "swoosh" marrón) es el único elemento decorativo. Se usa con cuentagotas:
   cabecera del portal público y estados vacíos. **Nunca** dentro de tablas o formularios.

## 2. Paleta

### Marca

| Token | Hex | Uso | Contraste sobre blanco |
|---|---|---|---|
| `brand-50` | `#FDF6EE` | Fondos suaves, filas destacadas | — |
| `brand-100` | `#F9E7CE` | Chips, badges de fondo | — |
| `brand-300` | `#F5BC6D` | **Ámbar del logo.** Acento, gráficas, resaltados | 1.7:1 ⛔ nunca para texto |
| `brand-500` | `#C08551` | **Cobre del logo.** Botones primarios, iconos activos | 3.1:1 ✅ solo UI y texto ≥18 px |
| `brand-700` | `#8A5A2E` | **Texto de marca, enlaces, títulos de acento** | 5.9:1 ✅ AA texto normal |
| `brand-900` | `#3B2415` | Texto principal cálido, fondos oscuros | 14.7:1 ✅ AAA |

> **Regla de accesibilidad no negociable:** el ámbar `brand-300` es un color de *superficie*, jamás de texto.
> Sobre ámbar se escribe con `brand-900` (8.5:1 ✅). El cobre `brand-500` sirve para fondo de botón con
> texto blanco (3.1:1 — válido para componentes UI y texto grande); para texto normal en cobre se usa `brand-700`.

### Neutros — escala cálida (*stone*, no *slate*)

`#FAFAF9` fondo · `#FFFFFF` tarjetas · `#E7E5E4` bordes · `#78716C` texto secundario · `#292524` texto primario.
Se elige la escala cálida porque un gris azulado junto al cobre produce un choque de temperatura visible.

### Semánticos — un color = un significado

| Estado | Color | Dónde aparece |
|---|---|---|
| 🟢 Activo / Pagado / Al día | `#15803D` | Membresía activa, pago confirmado, check-in exitoso |
| 🟡 Por vencer / Pendiente / En gracia | `#B45309` | Vence en ≤5 días, pago parcial, acceso en gracia |
| 🔴 Vencido / En mora / Fallido | `#B91C1C` | Membresía vencida, cartera, pago rechazado |
| 🔵 Informativo / En proceso | `#1D4ED8` | Pago en proceso, inscripción en revisión |
| ⚪ Inactivo / Cancelado / Pausado | `#57534E` | Estados sin urgencia |

> El semáforo **no compite con la marca**: el cobre nunca significa "estado". Un badge cobre sería
> ambiguo junto al ámbar de alerta. La marca viste la interfaz; los semánticos informan.
> Todo estado lleva **icono + texto**, no solo color (daltonismo y lectura rápida en móvil).

### ✅ Confirmación contra la pieza real

La tabla de precios del sitio confirma la paleta extraída del logo y añade tres reglas que no estaban:

| Elemento observado | Token | Regla que se adopta |
|---|---|---|
| Fondo de la sección | `#111111` (casi negro) | **El portal público es oscuro por defecto**, no claro |
| Banda superior de las tarjetas | ámbar ≈ `brand-300` | Coincide con lo extraído del logo ✓ |
| Cuerpo de las tarjetas | blanco puro | Las tarjetas de contenido son islas claras sobre el negro |
| Botones de acción | negro con texto blanco | La marca **no** viste los botones: los enmarca |
| Titular *Atención Semipersonalizada Premium* | ámbar sobre negro | 8,7:1 ✅ — el ámbar **sí** funciona como texto, pero solo sobre fondo oscuro |
| Cinta "RECOMENDADO" | negro sobre ámbar, diagonal | Se convierte en el campo `plans.is_recommended` |

**Corrección respecto a la regla anterior:** el ámbar `brand-300` no era utilizable como texto *sobre
blanco* (1,7:1). Sobre el negro `#111111` alcanza **8,7:1** y es la elección correcta para titulares.
La regla completa queda:

```
ámbar sobre blanco  →  ⛔ nunca texto, solo superficie
ámbar sobre negro   →  ✅ titulares y acentos
cobre sobre blanco  →  ✅ botones y texto ≥18 px  (3,1:1)
brand-700 sobre blanco → ✅ texto normal          (5,9:1)
```

### Los dos modos del producto

Esto resuelve una pregunta que estaba abierta: **el portal público y el administrativo no se ven igual.**

| | Portal público | Portal administrativo |
|---|---|---|
| **Fondo** | Negro `#111111` | Claro `#FAFAF9` (oscuro opcional) |
| **Carácter** | Deportivo, de impacto, ámbar sobre negro | Sobrio, legible, para 8 horas de uso |
| **Por qué** | Vende. Se mira 40 segundos. | Se trabaja. Se mira todo el día. |

Un panel administrativo en negro con ámbar cansa la vista en la tercera hora. Una landing en blanco no
transmite la marca. Son dos aplicaciones del mismo sistema de tokens, no dos diseños distintos.

### Modo oscuro del admin

Superficie `#1C1917` · tarjeta `#292524` · borde `#44403C`. El cobre se aclara a `#D9A06B` para
mantener el contraste sobre fondo oscuro. Se implementa desde el día uno con tokens CSS, no como añadido.

## 3. Tipografía

| Rol | Familia | Notas |
|---|---|---|
| Interfaz y contenido | **Inter** (variable) | Legible a 14 px, buenos números tabulares |
| Cifras (importes, KPI) | Inter con `font-variant-numeric: tabular-nums` | Las columnas de dinero deben alinearse |
| Titulares del portal público | Geométrica **ancha y escuadrada**, mayúsculas | La pieza real usa una tipografía tipo *Eurostile / Michroma*, no una condensada. Candidatas libres: **Michroma**, **Chakra Petch**, **Saira**. `[TEMP]` hasta confirmar el tipo original |
| Nombres de plan y etiquetas | **Montserrat** SemiBold, mayúsculas, `letter-spacing: 0.08em` | Es lo que usa la tabla de precios actual |

> **Corrección respecto al borrador anterior:** había propuesto una condensada (Barlow Condensed)
> deduciéndola del trazo del logo. La pieza real usa lo contrario —una tipografía **ancha**— y eso manda.

Escala: `12 · 14 · 16 · 18 · 20 · 24 · 30 · 36 · 48`. Base **16 px**; el cuerpo mínimo en interfaz es
**14 px** (nada de 12 px para datos que se leen a diario).

## 4. Estructura de pantalla (admin)

Del referente aportado se conservan tres decisiones y se descarta una.

**Se conserva:** navegación lateral persistente con el módulo activo resaltado en color de marca ·
rejilla de tarjetas con esquinas generosas (`radius 16px`) y sombra muy sutil · fila superior de KPIs
con variación respecto al periodo anterior.

**Se descarta:** la densidad del referente. Aquel dashboard muestra ~12 bloques a la vez; aquí serían
demasiados. Se aplica una jerarquía de tres niveles: **4 KPIs → alertas accionables → una tabla**.

```
ESCRITORIO ≥1024px                          MÓVIL <768px
┌──────┬──────────────────────────────┐     ┌────────────────────┐
│      │ ⌕ Buscar (⌘K)      🔔  👤    │     │ ☰  Mind Fitness  🔔│
│ LOGO ├──────────────────────────────┤     ├────────────────────┤
│      │ Buen día, [nombre]           │     │ KPI  │ KPI         │
│ Inic │ ┌────┬────┬────┬────┐        │     │ KPI  │ KPI         │
│ Clie │ │KPI │KPI │KPI │KPI │        │     ├────────────────────┤
│ Insc │ └────┴────┴────┴────┘        │     │ ⚠ 3 vencen hoy   ›│
│ Plan │ ┌──────────────┬───────────┐ │     │ ⚠ 5 en mora      ›│
│ Memb │ │ ⚠ ALERTAS    │ ACCIONES  │ │     ├────────────────────┤
│ Pago │ │ vencen hoy 3 │ +Cliente  │ │     │ [Tarjeta cliente]  │
│ Cart │ │ en mora    5 │ +Pago     │ │     │ [Tarjeta cliente]  │
│ Asis │ │ sin pago   2 │ +Asistenc.│ │     ├────────────────────┤
│ Hora │ └──────────────┴───────────┘ │     │ 🏠  👥  💵  ✓   ⋯ │
│ ...  │ ┌──────────────────────────┐ │     └────────────────────┘
│      │ │ Tabla / actividad        │ │      barra inferior fija
└──────┴─┴──────────────────────────┴─┘
```

## 5. La regla de la tabla en móvil

El requisito "nada de tablas imposibles de usar en el móvil" se resuelve con **un solo componente**,
`DataView`, que recibe los mismos datos y decide la presentación:

| Ancho | Presentación |
|---|---|
| ≥1024 px | Tabla con columnas ordenables y selección múltiple |
| 768–1023 px | Tabla reducida: solo columnas marcadas `priority: 'high'` |
| <768 px | **Lista de tarjetas**: título, subtítulo, badge de estado, 2 datos clave, acción principal |

Cada columna se declara una vez con su prioridad. No hay dos implementaciones que mantener, ni
scroll horizontal, ni "ver en escritorio para más detalle".

## 6. Componentes reutilizables

**Primitivas** (shadcn/ui): `Button` `Input` `Select` `Combobox` `DatePicker` `Checkbox` `Radio`
`Switch` `Textarea` `Dialog` `Sheet` `Popover` `Tooltip` `Tabs` `Badge` `Avatar` `Toast` `Skeleton`
`Separator` `ScrollArea` `Command` (⌘K).

**Patrones** (propios del proyecto):

| Componente | Responsabilidad |
|---|---|
| `DataView` | Tabla ↔ tarjetas responsive, orden, paginación, selección |
| `FilterBar` | Filtros rápidos por chips + búsqueda + rango de fechas, sincronizados con la URL |
| `StatCard` | KPI con valor, etiqueta, variación y enlace al detalle |
| `AlertCard` | Alerta accionable: severidad, conteo, acción directa |
| `QuickActions` | Rejilla de accesos rápidos según permisos |
| `StepForm` | Formulario por pasos con validación por paso, progreso y autoguardado |
| `ConfirmDialog` | Confirmación con nivel de riesgo; en destructivas exige escribir un texto y un motivo |
| `MoneyInput` / `MoneyText` | Formato COP, sin decimales, `tabular-nums`, nunca `float` |
| `StatusBadge` | Único lugar donde estado → color + icono + etiqueta en español |
| `EmptyState` | Ilustración, explicación y **acción**; nunca "no hay datos" a secas |
| `ErrorState` | Mensaje comprensible, código de error copiable y botón de reintento |
| `AuditTrail` | Línea de tiempo antes/después con autor y motivo |
| `ClientSearch` | Buscador por documento/nombre/teléfono con resultados enriquecidos |
| `PermissionGate` | Oculta UI según permiso (**cosmético**: la seguridad está en el servidor) |
| `PageHeader` | Título, migas de pan, acciones primarias, responsive |

**De dominio:** `ClientCard` `MembershipCard` `MembershipTimeline` `PlanCard` `PlanComparison`
`PaymentRow` `ChargeSummary` `AttendanceCheckIn` `SlotCapacityBar` `CollectionCaseCard`.

## 7. Principios de interacción

1. **Una pantalla, una tarea.** Si hay más de una acción primaria, sobra una.
2. **Formularios por secciones**, nunca 20 campos seguidos. La creación rápida de cliente pide 3 campos.
3. **Confirmar solo lo irreversible.** Confirmar todo enseña a ignorar los diálogos.
4. **Optimista con reversa:** marcar asistencia responde al instante y revierte si falla, con aviso claro.
5. **Skeletons con la forma del contenido real**, no spinners centrados.
6. **Los errores dicen qué hacer:** "El documento 1.020.… ya está registrado a nombre de Ana P. ¿Abrir su ficha?"
7. **Objetivos táctiles de 44 px** en recepción: se usa de pie y con prisa.
8. **El teclado es primer ciudadano:** ⌘K, `Enter` para confirmar, `Esc` para cerrar, tabulación coherente.
9. **Cero jerga.** "Membresía vencida", no "estado EXPIRED". "Saldo por cobrar", no "balance".

## 8. Accesibilidad — mínimos exigidos

WCAG 2.1 **AA**: contraste 4.5:1 en texto normal y 3:1 en componentes · foco visible siempre ·
todo accionable alcanzable por teclado · etiquetas asociadas a cada campo · errores anunciados por
lector de pantalla · sin información transmitida solo por color · `prefers-reduced-motion` respetado.

---

**Anterior:** [07-reglas-negocio.md](07-reglas-negocio.md) · **Siguiente:** [09-preguntas-pendientes.md](09-preguntas-pendientes.md)
