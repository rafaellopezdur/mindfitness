# Decisiones de arquitectura (ADR)

Registro de las decisiones **no obvias** y de por qué se tomaron. Un ADR no se
edita cuando cambia de opinión: se escribe otro que lo sustituya.

| # | Decisión | Estado |
|---|---|---|
| [0001](0001-monolito-nextjs.md) | Monolito Next.js en lugar de backend separado | Aceptada |
| [0002](0002-dinero-en-enteros.md) | El dinero se guarda como entero en unidades menores | Aceptada |
| [0003](0003-estados-derivados.md) | Los estados que dependen del calendario se derivan | Aceptada |
| [0004](0004-rbac-en-base-de-datos.md) | Roles en base de datos, permisos en código | Aceptada |
| [0005](0005-fechas-de-negocio.md) | Fechas de negocio como 'YYYY-MM-DD' con aritmética UTC propia | Aceptada |
| [0006](0006-conexion-a-la-base-de-datos.md) | Pooler de sesión, no de transacciones · 5–7× más rápido | Aceptada |
