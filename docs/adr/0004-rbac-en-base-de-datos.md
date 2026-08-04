# ADR-0004 · Roles en base de datos, permisos en código

**Fecha:** 2026-08-04 · **Estado:** Aceptada · **Fase:** 1

## Contexto

El requisito pide que las propietarias puedan "gestionar permisos" y "definir
permisos adicionales". A la vez, el código necesita poder escribir
`assertCan(actor, 'payment.void')` y que ese identificador exista de verdad.

Son dos necesidades opuestas: flexibilidad para el usuario, certeza para el código.

## Decisión

Se separan los dos conceptos:

- **Los permisos son constantes de código** (`src/shared/constants/permissions.ts`).
  Se siembran en la tabla `permissions`. **No se crean desde la interfaz**: un
  permiso sin código que lo verifique no protege nada.
- **Los roles son datos** (`roles` + `role_permissions`). Se pueden crear,
  editar y combinar desde Configuración sin desplegar.

Además, el permiso responde *"¿puede hacer esto?"* y el **alcance** responde
*"¿sobre qué?"*. El alcance se aplica **en la consulta del repositorio**, nunca
filtrando en la vista.

## Consecuencias

**A favor**
- Las propietarias pueden crear un rol "Recepción senior" combinando permisos
  existentes, sin tocar el código.
- Es imposible inventar un permiso que nada verifica: el catálogo es finito y
  hay una prueba que comprueba que todo permiso sembrado existe en el código.
- El autocompletado y el compilador atrapan un permiso mal escrito.

**En contra**
- Añadir una capacidad nueva exige desplegar. Es correcto: una capacidad nueva
  necesita código que la implemente de todos modos.
- Hay que sincronizar el catálogo con la base en cada despliegue. Lo hace el seed,
  que es idempotente.

## Salvaguardas

Se implementan como funciones, no como convención:

- `canModifyUserRoles()` — nadie modifica sus propios roles, ni siquiera `OWNER`
  (evita el auto-ascenso y el auto-bloqueo).
- `canApproveAuthorization()` — quien solicita una autorización nunca puede aprobarla.
- Debe existir siempre al menos un `OWNER` activo.

Las tres tienen prueba en `tests/unit/rbac.test.ts`.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Permisos también editables desde la interfaz | Permite crear permisos que ningún código verifica: seguridad aparente, que es peor que ninguna. |
| Roles fijos en código (enum) | Incumple el requisito de gestionar permisos, y obliga a desplegar para un cambio organizativo. |
| ABAC / políticas tipo Casbin | Potencia que este dominio no necesita, a cambio de que nadie sepa explicar por qué alguien puede o no puede hacer algo. |
