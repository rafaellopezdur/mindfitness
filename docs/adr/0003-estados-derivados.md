# ADR-0003 · Los estados que dependen del calendario se derivan, no se almacenan

**Fecha:** 2026-08-04 · **Estado:** Aceptada · **Fase:** 1

## Contexto

El sistema tiene estados que cambian **solos con el paso del tiempo**: una
membresía "próxima a vencer", una "vencida", un cargo "en mora", un evento con
"cupos agotados".

El patrón habitual es almacenarlos y actualizarlos con un proceso nocturno. Ese
patrón tiene un fallo conocido: **la noche que el proceso no corre, el sistema
miente**. Y miente de la peor forma posible —dejando entrar a gente cuya
membresía venció, o cobrando mora que no existe— sin que nadie se entere.

## Decisión

**Se almacena** lo que solo cambia por una acción explícita de una persona:
`ACTIVE`, `PAUSED`, `CANCELLED`, `SUPERSEDED`.

**Se deriva** lo que solo depende del calendario:
`PRÓXIMA A VENCER`, `VENCIDA`, `EN GRACIA`, `EN MORA`, `CUPOS AGOTADOS`.

Una membresía con `end_date = ayer` **está vencida** aunque ningún proceso haya
corrido nunca. El job nocturno existe, pero solo para **materializar el cambio a
efectos de historial y notificaciones**: nunca es la fuente de verdad.

## Consecuencias

**A favor**
- El sistema no puede desincronizarse. La respuesta a "¿está vencida?" se calcula
  en el momento de preguntarla.
- Un job caído retrasa notificaciones, no corrompe datos. Degradación elegante.
- Se evitan miles de escrituras nocturnas sin valor.
- Las funciones que lo deciden (`isExpired`, `isInGrace`, `isExpiringSoon`) son
  puras y se prueban en milisegundos.

**En contra**
- Las consultas que filtran por estado derivado necesitan índices adecuados
  (`(status, end_date)`) en lugar de un simple `WHERE status = 'EXPIRED'`.
- El umbral de "próximo a vencer" es configurable, así que la consulta debe leer
  la configuración. Se resuelve con caché en `SettingsService`.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Estado almacenado + cron nocturno | Es el origen del problema: una noche sin ejecutar y los datos mienten en silencio. |
| Vista materializada refrescada por hora | Sigue teniendo ventana de desfase, y añade una pieza de infraestructura que hay que vigilar. |
| Columna generada en PostgreSQL | No puede depender de `now()` — PostgreSQL exige que las columnas generadas sean inmutables. |
