# Mind Fitness Club · Documentación de diseño

Diseño del sistema de gestión de Mind Fitness Club, previo a la implementación.
**Estado:** v0.2 — arquitectura base + ampliación (eventos, servicios, finanzas, notificaciones).
Sin código todavía.

## Índice

### Bloque A · Base del sistema

| # | Documento | Contenido |
|---|---|---|
| 00 | [Resumen ejecutivo](00-resumen-ejecutivo.md) | Qué es el sistema, alcance de la v1, las 8 decisiones estructurales |
| 01 | [Arquitectura](01-arquitectura.md) | Stack, capas, estructura de carpetas, RBAC, adaptador de pagos, convenciones |
| 02 | [Mapa de módulos](02-mapa-modulos.md) | 20 módulos admin + 6 públicos, dependencias, orden de construcción |
| 03 | [Roles y permisos](03-roles-y-permisos.md) | 134 permisos (78 base + 56 de la ampliación), matriz completa por rol |
| 04 | [Mapa de navegación](04-navegacion.md) | Todas las rutas públicas, admin y del futuro portal del miembro |
| 05 | [Flujos y estados](05-flujos-y-estados.md) | 6 flujos + diagramas de estado de inscripción, membresía, cargo, pago y cliente |
| 06 | [Modelo de datos](06-modelo-datos.md) | ERD, 70+ tablas con sus campos, constraints, seed |
| 07 | [Reglas de negocio](07-reglas-negocio.md) | 124 reglas identificadas (RN-xx) + casos límite |
| 08 | [Identidad visual](08-identidad-visual.md) | Paleta derivada del logo, tipografía, layout, componentes reutilizables |
| 09 | [Preguntas pendientes](09-preguntas-pendientes.md) | 38 preguntas por prioridad; P2 ya respondida |
| 10 | [Fases de desarrollo](10-fases-desarrollo.md) | 13 fases con migraciones, rutas, pruebas y criterios de aceptación |

### Bloque B · Módulos ampliados

| # | Documento | Contenido |
|---|---|---|
| 11 | [Módulo de eventos](11-modulo-eventos.md) | Clases especiales y eventos con página pública, cupos, lista de espera, check-in |
| 12 | [Servicios y entrenadores](12-servicios-y-entrenadores.md) | ⚠️ **Modifica el modelo de planes.** Derechos contratados, tarjeta de acceso rápido, asignación de entrenadores |
| 13 | [Finanzas](13-finanzas.md) | Ingresos, gastos, periodos, remuneración y liquidación de entrenadores, rentabilidad |
| 14 | [Centro de notificaciones](14-notificaciones.md) | Avisos internos con prioridad, responsable, resolución y anti-ruido |
| 15 | [Catálogo de planes real](15-catalogo-planes.md) | ✅ **Datos reales.** Los 4 planes con precios, modelados como derechos + lógica de precios |

## Pendientes de esta entrega de diseño

Se producen tras confirmar las preguntas de prioridad 0 y 1:

- Definición detallada de la API (`/api/v1`) endpoint por endpoint
- Wireframes escritos pantalla por pantalla
- Estrategia de seguridad ampliada (amenazas, mitigaciones, cumplimiento Ley 1581)
- Plan de pruebas detallado
- ADRs (registros de decisión de arquitectura)

## Convención de datos temporales

Todo dato comercial no confirmado aparece marcado como `[TEMP]` y vive centralizado en
`config/placeholders.ts` y en el seed. **No se inventa información de Mind Fitness Club.**

## Cómo leer esto

- **Si solo hay 10 minutos:** [00-resumen-ejecutivo.md](00-resumen-ejecutivo.md) y
  [09-preguntas-pendientes.md](09-preguntas-pendientes.md).
- **Para decidir si el plan es correcto:** [05-flujos-y-estados.md](05-flujos-y-estados.md) y
  [07-reglas-negocio.md](07-reglas-negocio.md) — ahí está el negocio real.
- **La decisión más importante que hay que validar:**
  [12-servicios-y-entrenadores.md §1](12-servicios-y-entrenadores.md#1-el-problema-y-la-decisión) —
  es la única que, si se aplaza, obliga a migrar datos.
- **Para empezar a construir:** [10-fases-desarrollo.md](10-fases-desarrollo.md).
