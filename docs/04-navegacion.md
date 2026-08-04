# 04 · Mapa de navegación

## 1. Portal público

```
/                              Home
├─ /planes                     Catálogo
│  ├─ /planes/comparar         Comparador lado a lado
│  └─ /planes/[slug]           Detalle del plan  → CTA "Inscribirme"
├─ /nosotros                   El gimnasio, entrenadores, ubicación
├─ /horarios                   Franjas y disponibilidad (solo informativo)
├─ /contacto                   Formulario + WhatsApp + mapa
├─ /inscripcion                Flujo por pasos (5 pasos)
│  ├─ ?paso=plan               1 · Plan (si no venía preseleccionado)
│  ├─ ?paso=datos              2 · Datos personales
│  ├─ ?paso=fecha              3 · Fecha de inicio (+ horario si aplica)
│  ├─ ?paso=consentimientos    4 · T&C y tratamiento de datos
│  └─ ?paso=pago               5 · Método de pago
├─ /inscripcion/retomar/[token]  Recuperar inscripción incompleta (enlace firmado)
├─ /inscripcion/confirmacion/[ref]  Estado real (3 variantes: pagada / en proceso / presencial)
├─ /eventos                    Cartelera de eventos y clases especiales
│  ├─ /eventos/[slug]          Página pública del evento (compartible)
│  │  └─ /eventos/[slug]/inscripcion   Flujo de inscripción al evento
│  ├─ /eventos/[slug]/confirmacion/[ref]
│  └─ /e/[token]               Enlace corto para eventos no listados
├─ /legal/terminos
├─ /legal/privacidad
└─ /legal/tratamiento-datos
```

**Barra pública:** Logo · Planes · **Eventos** · Horarios · Nosotros · Contacto · **[Inscríbete]** · Iniciar sesión (→ `/admin`)

## 2. Portal administrativo

Navegación lateral en escritorio; barra inferior de 5 accesos + menú "Más" en móvil.

```
/admin                                   Dashboard
│
├─ /admin/clientes                       Listado (filtros, búsqueda, vista tarjeta en móvil)
│  ├─ /admin/clientes/nuevo
│  └─ /admin/clientes/[id]               Ficha 360°
│     ├─ ?tab=resumen                    Estado, membresía vigente, saldo, próximas acciones
│     ├─ ?tab=membresias                 Historial de contratos
│     ├─ ?tab=pagos                      Cargos, pagos, saldo, comprobantes
│     ├─ ?tab=asistencia                 Historial + gráfico de frecuencia
│     ├─ ?tab=documentos                 Documentos y consentimientos firmados
│     └─ ?tab=historial                  Bitácora de cambios de este cliente
│
├─ /admin/inscripciones                  Bandeja  [Nuevas · En revisión · Sin pago · Aprobadas]
│  └─ /admin/inscripciones/[id]          Detalle + panel de duplicados + aprobar/rechazar
│
├─ /admin/planes                         Catálogo interno
│  ├─ /admin/planes/nuevo                Constructor por pasos
│  └─ /admin/planes/[id]                 Editar · Duplicar · Promoción · Archivar
│
├─ /admin/membresias                     Listado global  [Activas · Por vencer · Vencidas · Pausadas]
│  ├─ /admin/membresias/nueva
│  └─ /admin/membresias/[id]             Detalle + acciones (renovar, extender, pausar…)
│
├─ /admin/pagos                          Movimientos  [Hoy · Semana · Mes · Rango]
│  ├─ /admin/pagos/nuevo                 Registrar pago presencial
│  ├─ /admin/pagos/[id]                  Detalle · Comprobante · Anular · Reembolsar
│  └─ /admin/pagos/conciliacion          Pagos en línea vs. proveedor  [OWNER]
│
├─ /admin/cartera                        [Vence hoy · Próximos · En mora · Compromisos]
│  └─ /admin/cartera/[clienteId]         Ficha de cobro + registrar gestión
│
├─ /admin/asistencia                     Pantalla de check-in (modo quiosco disponible)
│  └─ /admin/asistencia/historial
│
├─ /admin/horarios                       Vista semanal con ocupación
│  ├─ /admin/horarios/franjas            Configurar franjas y capacidad
│  └─ /admin/horarios/[slotId]           Inscritos, mover, bloquear, cancelar
│
├─ /admin/entrenadores
│  └─ /admin/entrenadores/[id]           Perfil, franjas, clientes asignados
│
├─ /admin/comunicaciones
│  ├─ /admin/comunicaciones/plantillas
│  ├─ /admin/comunicaciones/enviar       Segmento → plantilla → previsualizar → enviar
│  └─ /admin/comunicaciones/historial
│
├─ /admin/reportes
│  ├─ /admin/reportes/financieros        [OWNER]
│  ├─ /admin/reportes/comerciales
│  └─ /admin/reportes/operativos
│
├─ /admin/configuracion
│  ├─ ?s=negocio        Nombre, NIT, logo, colores, contacto, dirección, redes
│  ├─ ?s=horarios       Horario de atención, días no laborables
│  ├─ ?s=pagos          Métodos habilitados, tope de descuento, datos de transferencia
│  ├─ ?s=reglas         Vencimiento, gracia, "próximo a vencer", reglas de asistencia
│  ├─ ?s=legal          T&C, privacidad, tratamiento de datos (con versionado)
│  ├─ ?s=plantillas     Mensajes y correos
│  └─ ?s=integraciones  Proveedor de pagos, correo, almacenamiento  [OWNER]
│
├─ /admin/usuarios                       Usuarios · Roles · Permisos · Sesiones  [OWNER]
│  └─ /admin/usuarios/[id]
│
├─ /admin/auditoria                      Bitácora con filtros y diff antes/después  [OWNER]
│
├─ /admin/eventos                        Cartelera  [Borradores · Abiertos · En curso · Finalizados]
│  ├─ /admin/eventos/nuevo               Constructor por pasos
│  ├─ /admin/eventos/categorias
│  └─ /admin/eventos/[id]                ?tab= resumen · inscritos · espera · asistencia · finanzas · sesiones · difusion
│
├─ /admin/acceso                         ⭐ Tarjeta rápida del entrenador (buscar y consultar)
│  └─ /admin/autorizaciones              Solicitudes de excepción  [solicitar: todos · aprobar: OWNER]
│
├─ /admin/servicios                      Catálogo de servicios  [OWNER]
│
├─ /admin/finanzas                       [OWNER]
│  ├─ ?tab=resumen                       Flujo de caja del mes
│  ├─ ?tab=ingresos                      Pagos + ingresos manuales
│  ├─ ?tab=gastos                        Listado, aprobar, recurrentes
│  ├─ ?tab=periodos                      Cierre mensual
│  ├─ ?tab=rentabilidad                  Por plan · evento · entrenador · horario · servicio
│  └─ /admin/finanzas/gastos/nuevo
│
├─ /admin/liquidaciones                  [Borrador · Revisión · Aprobadas · Pagadas]  [OWNER]
│  └─ /admin/liquidaciones/[id]
│
└─ /admin/notificaciones                 Centro de notificaciones
   └─ /admin/notificaciones/preferencias  Preferencias del usuario actual
```

**Rutas añadidas dentro de módulos ya existentes**
`/admin/planes/[id]?tab=servicios` — qué incluye el plan (derechos) ·
`/admin/entrenadores/[id]?tab=finanzas` — tarifas, devengado y saldo `[OWNER]` ·
`/admin/entrenadores/[id]?tab=asignaciones` — las 6 formas de asignación ·
`/admin/clientes/[id]?tab=servicios` — derechos vigentes y consumo ·
`/admin/clientes/[id]?tab=eventos` — eventos a los que se ha inscrito.

## 3. Navegación según rol

| | OWNER | FRONT_DESK | TRAINER |
|---|---|---|---|
| **Barra inferior móvil** | Inicio · Clientes · Cobrar · Asistencia · Más | Inicio · Clientes · Cobrar · Asistencia · Más | **Inicio · 🔍 Acceso · Horarios · Eventos · Más** |
| **Módulos visibles** | 20 | 12 (sin Planes, Servicios, Finanzas, Liquidaciones, Reportes fin., Config. crítica, Usuarios, Auditoría) | 6 (Inicio, Acceso rápido, Clientes asignados, Asistencia, Horarios, Mis eventos + su liquidación) |
| **Pantalla de inicio** | Dashboard de negocio | Dashboard operativo | **Dashboard del entrenador** — otra pantalla, no una versión recortada. Ver [12](12-servicios-y-entrenadores.md#7-dashboard-del-entrenador) |

> Para el entrenador, **el buscador de acceso rápido es el acceso más importante de la aplicación** y por
> eso ocupa un lugar fijo en la barra inferior. Es lo que abre 20 veces al día.

La navegación **se genera desde los permisos**: un módulo sin permisos concedidos no se renderiza.

## 4. Búsqueda global (`Ctrl/⌘ + K`)

Disponible en todo `/admin`. Busca por nombre, documento, teléfono o correo y devuelve resultados
agrupados: **Clientes · Membresías · Pagos · Inscripciones**, más *acciones* (`"registrar pago"`,
`"nuevo cliente"`). Es el atajo principal en recepción: escribir la cédula y llegar a la ficha.

## 5. Portal del miembro (preparado, no activo en v1)

```
/mi                    Resumen: membresía, vencimiento, saldo
/mi/membresia          Detalle e historial
/mi/pagos              Historial + descarga de comprobantes
/mi/asistencia         Historial y sesiones restantes
/mi/reservas           Reservar / cancelar franja
/mi/renovar            Renovación con pago en línea
/mi/perfil             Datos y consentimientos
```
Rutas creadas tras el feature flag `features.memberPortal = false`. Devuelven 404 mientras esté apagado.

---

**Anterior:** [03-roles-y-permisos.md](03-roles-y-permisos.md) · **Siguiente:** [05-flujos-y-estados.md](05-flujos-y-estados.md)
