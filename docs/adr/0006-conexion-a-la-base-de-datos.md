# ADR-0006 · Pooler de sesión, no de transacciones

**Fecha:** 2026-08-04 · **Estado:** Aceptada · **Fase:** 2

## Contexto

Las páginas del panel tardaban ~3,6 s en responder. Antes de tocar nada se midió
dónde se iba el tiempo, y el resultado descartó la hipótesis intuitiva —consultas
mal escritas— y señaló otra cosa:

```
Ida y vuelta mínima (SELECT 1)                 410 ms
Sesión con roles y permisos (include anidado) 1258 ms   ← 3 viajes
5 consultas SECUENCIALES                      2100 ms
5 consultas EN PARALELO                        470 ms
```

**La latencia de red domina.** Con la base en Ohio y el equipo en Colombia, lo
único que importa es cuántas idas y vueltas hace cada página, no cuánto tarda
Postgres en resolver la consulta.

Pero 410 ms para un `SELECT 1` seguía siendo cuatro veces lo esperado para esa
distancia. Comparando las dos conexiones que ofrece Supabase:

```
pooler de transacciones (6543, ?pgbouncer=true)   474 ms
pooler de sesión        (5432)                     90 ms
```

**Cinco veces.** Con `pgbouncer=true` Prisma desactiva las sentencias preparadas
y cada consulta paga viajes adicionales; además el modo transacción reasigna la
conexión de fondo en cada operación.

## Decisión

1. **`DATABASE_URL` usa el pooler de sesión (puerto 5432)**, no el de
   transacciones. El de transacciones está pensado para entornos *serverless*
   con miles de conexiones efímeras; esta aplicación es un servidor de larga
   vida con un pool estable.
2. **`relationJoins`** activado en el generador de Prisma: resuelve los
   `include` anidados con LATERAL JOIN, en una sola ida y vuelta.
3. **`readSession()` memorizada por petición** con `cache()` de React. Antes
   `getActor()` y `getSessionUser()` la llamaban por separado y la consulta más
   cara de la aplicación se ejecutaba dos veces en cada carga.
4. **Las consultas independientes van en `Promise.all`**. Con esta latencia,
   paralelizar cinco consultas ahorra 1,6 s.

## Resultado

| | Antes | Después |
|---|---:|---:|
| `/admin` | ~3 600 ms | **664 ms** |
| `/admin/clientes` | — | **680 ms** |
| `/admin/usuarios` | — | **452 ms** |
| `/admin/configuracion` | ~3 600 ms | **476 ms** |

## Consecuencias

**A favor**
- Entre 5 y 7 veces más rápido, sin cambiar una sola consulta de negocio.
- La regla operativa queda clara: **el coste está en el número de viajes**.
  Toda página nueva debe apuntar a dos como máximo —autenticación y datos— y
  paralelizar lo independiente.

**En contra**
- El pooler de sesión mantiene una conexión por cliente del pool. Con un
  despliegue *serverless* que abra funciones sin límite se agotarían las
  conexiones disponibles.
- **Si algún día se despliega en Vercel u otro entorno serverless, hay que
  volver al pooler de transacciones** (puerto 6543 con `?pgbouncer=true`). En
  ese escenario el servidor estaría junto a la base y la latencia dejaría de
  ser el problema. `DIRECT_URL` se queda como está: las migraciones siempre
  necesitan conexión de sesión.

## Pendiente

La región de la base es `us-east-2` (Ohio), elegida al crear el proyecto. Si
más adelante Supabase ofrece una región más cercana, mover el proyecto bajaría
los ~90 ms actuales. No es urgente: con dos viajes por página, 90 ms no se nota.
