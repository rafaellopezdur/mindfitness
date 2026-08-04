# ADR-0001 · Monolito Next.js en lugar de backend separado

**Fecha:** 2026-08-04 · **Estado:** Aceptada · **Fase:** 1

## Contexto

El sistema tiene tres consumidores: portal público, portal administrativo y —más
adelante— una app móvil o PWA. El requisito pide "una estructura de API
reutilizable". La lectura fácil es separar backend (NestJS) y frontend.

El equipo es pequeño y el gimnasio también: cientos de clientes, no cientos de miles.

## Decisión

Un único despliegue Next.js 15 con App Router, organizado en cuatro capas con
una **regla de dependencia estricta**: `app/ → modules/ → domain/`, y `domain/`
sin ninguna importación con I/O.

La API reutilizable existe igual, en `app/api/v1/`, pero es **una capa delgada
sobre los mismos casos de uso** que consumen las Server Actions. La app móvil
consumirá ese contrato sin que haya que duplicar lógica.

## Consecuencias

**A favor**
- Un despliegue, un `package.json`, un pipeline, un lugar donde mirar los logs.
- Los tipos se comparten sin generar clientes ni mantener un contrato aparte.
- Los RSC reducen el JavaScript que llega al móvil, que es donde más importa.
- La validación Zod es literalmente el mismo objeto en el formulario y en el servidor.

**En contra**
- No se puede escalar el backend independientemente del frontend. Irrelevante a este volumen.
- Acopla la versión de Next a la del backend.
- Requiere disciplina: nada impide técnicamente importar Prisma desde un componente.
  Se contiene con la estructura de carpetas y con la revisión de código.

**Salida si hiciera falta:** como la lógica vive en `server/modules/` y
`server/domain/` sin dependencias de Next, extraer un servicio aparte sería mover
carpetas y añadir un transporte, no reescribir.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| NestJS + Next separados | Dos despliegues, dos CI, un contrato que mantener y tipos duplicados. Coste real desde el día uno; beneficio hipotético. |
| Supabase / BaaS | La lógica de negocio (derechos, prorrateo, liquidaciones) no cabe en políticas RLS sin volverse ilegible. |
| Remix / SvelteKit | Equivalentes técnicamente; Next tiene mejor ecosistema de componentes accesibles y más profesionales disponibles para dar continuidad. |
