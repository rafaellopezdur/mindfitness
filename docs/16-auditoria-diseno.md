# 16 · Auditoría de diseño y dirección visual

> Revisión de lo construido en las Fases 1 y 2 antes de continuar. Sin código
> nuevo de negocio: solo diseño, experiencia, componentes y movimiento.

---

## 1. Alcance real

Esto es lo que existe hoy y, por tanto, lo único auditable:

| Pantalla | Estado |
|---|---|
| Portal público (placeholder) | ✅ construida |
| Acceso y cambio de contraseña | ✅ construida |
| Panel · Inicio | ✅ construida |
| Panel · Clientes (listado, alta, ficha) | ✅ construida |
| Panel · Usuarios | ✅ construida |
| Panel · Auditoría | ✅ construida |
| Panel · Configuración | ✅ construida |
| Calendario, Eventos, Finanzas, Pagos, Membresías, Planes, Entrenadores | ❌ **no existen** — Fases 3 a 9 |

**Lo que no existe no se rediseña.** Lo que sí se hace es dejar el sistema de
diseño y los componentes listos para que esas pantallas nazcan ya coherentes.

---

## 2. Problemas visuales detectados

**P1 · Todo es la misma tarjeta.** El inicio son cuatro tarjetas idénticas más
dos bloques iguales. Es exactamente el patrón de «dashboard genérico»: mismo
borde, mismo radio, mismo peso visual para todo. Nada destaca porque todo
destaca igual.

**P2 · El color de marca casi no aparece.** El panel se ve gris. El cobre solo
sale en el botón primario y el ítem activo. Una plataforma de gimnasio no puede
verse igual que un panel de facturación.

**P3 · Tipografía plana.** Todo es Inter en dos pesos. No hay display, no hay
contraste tipográfico, y los números —que son el contenido más importante de
una herramienta operativa— se ven como texto corriente.

**P4 · Superficies sin profundidad.** Un único nivel (`surface-raised`) para
tarjetas, barra lateral, cabecera y desplegables. No se distingue lo que flota
de lo que está anclado.

**P5 · Cero movimiento.** Solo `transition-colors`. La interfaz aparece de
golpe, sin continuidad entre estados ni entre vistas.

**P6 · Estados vacíos calcados.** El mismo recuadro punteado en todos lados.

## 3. Problemas de experiencia

**E1 · El inicio no responde «¿qué requiere atención?».** Muestra *Usuarios 1,
Roles 4, Permisos 152, Acciones auditadas 0*: métricas del sistema, no del
negocio. Nadie abre el panel por la mañana para saber cuántos permisos hay.

**E2 · Navegación plana de 15 ítems**, la mitad deshabilitados en gris. La lista
larga de «pronto» ocupa el espacio sin aportar nada y empuja hacia abajo lo que
sí funciona.

**E3 · La barra inferior del móvil está casi muerta:** tres de sus cuatro
accesos son módulos que aún no existen.

**E4 · Filtros sin estado.** Son enlaces sueltos: no se acumulan, no se quitan
uno a uno, no hay contador de filtros activos y se pierden al navegar.

**E5 · Desplegables nativos del navegador** en el alta de cliente y en
configuración. Rompen el sistema visual y en móvil abren la rueda del sistema
operativo.

**E6 · Sin búsqueda global.** Estaba en el diseño (⌘K) y no se construyó. En
recepción es el atajo más importante: escribir la cédula y llegar.

**E7 · El feedback vive dentro del formulario.** No hay notificaciones flotantes,
así que al guardar algo desde la mitad de una página larga el aviso puede quedar
fuera de la vista.

**E8 · Sin estados de carga.** No hay `loading.tsx` en ninguna ruta: la
navegación se siente congelada mientras el servidor responde.

## 4. Inconsistencias

**I1 · Markup duplicado en tablas.** En Clientes y Usuarios escribí **dos veces**
el mismo listado: una lista para móvil y una tabla para escritorio. Es
precisamente lo que `DataView` debía evitar, y cada cambio hay que hacerlo dos
veces con riesgo de que se desincronicen.

**I2 · Tres implementaciones de «pestañas»** —ficha de cliente, configuración y
auditoría— con el mismo aspecto y código repetido.

**I3 · Los chips de filtro están escritos tres veces** (clientes, auditoría,
configuración) con estilos copiados.

**I4 · El `Card` de la ficha de cliente es local**, no un componente compartido.

**I5 · Mezcla de sintaxis de color:** unas veces `text-brand-700` (token de
Tailwind) y otras `text-[--color-text-muted]` (variable CSS cruda).

## 5. Componentes que deben rediseñarse

`Button` (variantes y estados) · `Input`/`Field` · **`Select` → Combobox propio**
· `StatusBadge` (unificar con estados no-cliente) · `EmptyState` (variantes) ·
`PageHeader` (con migas y acciones) · barra lateral y navegación móvil.

## 6. Componentes que faltan

`AppShell` · `CommandMenu` (⌘K) · `FilterBar` + `FilterChip` + `AdvancedFilters`
· `DataView` (tabla ↔ tarjetas, una sola fuente) · `MetricGroup` · `Sheet`
(drawer y bottom sheet) · `Modal` · `Toast` · `Skeleton` · `Tabs` · `Tooltip` ·
`FormSection` · `ConfirmAction` · `NotificationItem`.

## 7. Componentes reutilizables tal cual

La capa de servidor entera —permisos, acciones, validación, auditoría— no se
toca. Del frontend se conservan `cn`, `formatMoney`, `formatDateTime`,
`initials` y la lógica de `nav-items` (derivar el menú de los permisos), que es
correcta; solo cambia su presentación.

---

## 8. Dirección visual

### El concepto

> **El panel de control de un club, no el de un banco.**

Una herramienta que se usa de pie, con prisa y con gente delante. Debe leerse en
un vistazo, responder al toque y tener la temperatura de la marca: cálida,
deportiva, humana. La sofisticación viene del **ritmo tipográfico y del
movimiento**, no de sombras ni degradados.

### Tres decisiones que la definen

**1 · La tipografía hace el trabajo, no las cajas.**
Se incorpora una segunda familia para cifras y titulares. Los números —importes,
conteos, horas— pasan a display con `tabular-nums`, grandes y con tracking
cerrado. Eso da carácter deportivo inmediato y, de paso, hace la información
más legible de lejos, que es como se lee en recepción.

**2 · Menos cajas, más aire y jerarquía.**
Se abandona la rejilla de tarjetas iguales. La información se agrupa por
significado: un bloque «Hoy» con varias cifras en línea pesa más y ocupa menos
que cuatro tarjetas sueltas. El borde deja de ser el separador por defecto.

**3 · El cobre significa algo.**
El acento de marca se reserva para: el elemento activo, la acción primaria y el
dato destacado del momento. Nunca decorativo. Los estados siguen usando el
semáforo funcional, que no compite con la marca.

### El gesto propio

El logotipo tiene un **trazo curvo**. Se reinterpreta como una **línea de acento
de 3 px** que marca el ítem activo de la navegación y el borde superior del
bloque destacado. Un solo gesto, repetido, reconocible — y suficiente.

### Lo que se evita

Degradados sin motivo · sombras difusas grandes · vidrio esmerilado · iconos
decorativos · ilustraciones de banco de imágenes · seis tarjetas idénticas ·
gráficos que no se leen · rebotes.

---

## 9. Sistema de filtros propuesto

Un único patrón para toda la plataforma:

```
┌──────────────────────────────────────────────────────────┐
│  🔍 Buscar…                    [Estado ▾] [Filtros · 2]  │
├──────────────────────────────────────────────────────────┤
│  Activos ×   ·   Instagram ×   ·   Limpiar todo          │
└──────────────────────────────────────────────────────────┘
```

- **Búsqueda siempre visible**, con envío diferido de 300 ms: sin botón «aplicar».
- **Uno o dos filtros rápidos** en línea, los del 90 % de los casos.
- **«Filtros»** abre el resto: *popover* en escritorio, *bottom sheet* en móvil.
- **Contador** de filtros activos en el botón.
- **Filtros aplicados como etiquetas removibles** una a una, más «limpiar todo».
- **Estado en la URL**: se comparte, se recarga y el botón atrás funciona.
- **Carga discreta**: la lista se atenúa, no se vacía ni salta.

## 10. Sistema de movimiento propuesto

**Sin librería.** Framer Motion añadiría ~50 KB de JavaScript al cliente para
resolver transiciones que CSS moderno ya hace en el hilo de composición. Con
`transform`/`opacity`, `@starting-style` y `animation-timeline` se cubre todo lo
necesario sin coste de descarga ni de hidratación. Si más adelante el calendario
pide arrastrar y soltar con física, se reevalúa **solo para ese módulo**.

| Escala | Duración | Uso |
|---|---|---|
| Micro | 140 ms | Botones, chips, casillas, hover |
| Componente | 220 ms | Desplegables, popovers, pestañas, filas |
| Vista | 320 ms | Entrada de página, drawers, hojas inferiores |

Curvas: `--ease-out` `cubic-bezier(.16,1,.3,1)` para entradas (arranca rápido,
frena suave: se siente ágil) · `--ease-in-out` `cubic-bezier(.65,0,.35,1)` para
cambios de estado · `--ease-spring` `cubic-bezier(.34,1.4,.64,1)` **solo** en
confirmaciones puntuales, con rebote mínimo.

Animaciones previstas: entrada de página con desplazamiento de 8 px · aparición
escalonada de listas (30 ms por fila, máximo 10) · cifras que cuentan al
aparecer · desplegables con origen en el disparador · hojas con arrastre ·
notificaciones que entran desde el borde · barra de cupo que se llena ·
transición de estado en badges · pulso del indicador «ahora» en la agenda.

Todo bajo `prefers-reduced-motion: reduce`, que las desactiva sin romper nada.

---

## 11. Riesgos de implementación

| Riesgo | Mitigación |
|---|---|
| Romper una acción de servidor al reescribir un formulario | Las acciones no se tocan; solo cambia la presentación. Verificación ruta por ruta al final. |
| El Combobox propio pierde accesibilidad frente al `<select>` nativo | Se implementa con `role="listbox"`, navegación completa por teclado y `aria-activedescendant`. Se prueba con teclado. |
| Más JavaScript en el cliente por componentes interactivos | Todo lo que puede seguir siendo Server Component lo sigue siendo. Se mide el tamaño del bundle antes y después. |
| Las animaciones penalizan equipos modestos | Solo `transform` y `opacity`. Sin `box-shadow` ni `filter` animados. |
| Quedarse a medias y mezclar pantallas viejas y nuevas | Se migran **todas** las pantallas existentes en la misma pasada. Es criterio de aceptación. |

## 12. Orden de intervención

**A · Fundamentos** — tokens de color, tipografía, espaciado, radios, elevación
y movimiento. Primitivas: `Button`, `Field`, `Input`, `Badge`, `Skeleton`.

**B · Navegación** — `AppShell` con menú agrupado, cabecera con búsqueda y
notificaciones, navegación móvil con acción rápida, `CommandMenu`.

**C · Componentes operativos** — `Select`/`Combobox`, `FilterBar`, `DataView`,
`Sheet`, `Modal`, `Toast`, `Tabs`, `FormSection`.

**D · Pantallas** — Inicio (admin y entrenador diferenciados), Clientes, Alta,
Ficha, Usuarios, Auditoría, Configuración, Acceso.

**E · Refinamiento** — estados de carga, responsive, accesibilidad, rendimiento,
verificación funcional completa.

---

**Anterior:** [15-catalogo-planes.md](15-catalogo-planes.md) · **Volver al** [índice](README.md)
