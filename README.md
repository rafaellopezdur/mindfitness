# Mind Fitness Club · Plataforma de gestión

Sistema administrativo y portal público de Mind Fitness Club.
**Estado:** Fase 1 · Fundaciones — en construcción.

📐 **El diseño completo está en [`docs/`](docs/README.md).** Empieza por
[el resumen ejecutivo](docs/00-resumen-ejecutivo.md) y las
[fases de desarrollo](docs/10-fases-desarrollo.md).

---

## Puesta en marcha

**Requisitos:** Node 20+, PostgreSQL 16+.

```bash
# 1 · Dependencias
npm install

# 2 · Variables de entorno
cp .env.example .env
#    Genera AUTH_SECRET:  openssl rand -base64 32
#    Ajusta DATABASE_URL con tu Postgres local.

# 3 · Base de datos
npm run db:migrate        # crea el esquema
npm run db:seed           # permisos, roles, configuración y usuario inicial

# 4 · Arrancar
npm run dev               # http://localhost:3000
```

El seed imprime **una sola vez** la contraseña temporal del usuario
administrador. Se pedirá cambiarla en el primer ingreso.

### PostgreSQL con Docker

```bash
docker run --name mindfitness-db -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=mindfitness -p 5432:5432 -d postgres:16
```

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compilación de producción |
| `npm test` | Pruebas unitarias (Vitest) |
| `npm run shot` | Captura en móvil/tablet/escritorio y **verifica que no haya scroll horizontal** |
| `npm run typecheck` | Verificación de tipos |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Aplica migraciones |
| `npm run db:seed` | Siembra datos iniciales |
| `npm run db:studio` | Explorador visual de la base |

## Estructura

```
src/
├─ app/                 Rutas: (public) · (admin) · api
├─ server/
│  ├─ domain/           ⬅ Lógica pura, sin I/O. Se prueba en milisegundos.
│  ├─ modules/          Casos de uso por módulo
│  ├─ auth/             Sesión, RBAC, contraseñas
│  ├─ audit/            Bitácora inmutable
│  └─ infra/            Prisma, pagos, correo, almacenamiento
├─ shared/              Esquemas Zod y constantes compartidos
├─ components/          ui · patterns · domain
└─ config/              placeholders.ts · env.ts
prisma/                 schema.prisma · migrations · seed.ts
tests/                  unit · integration · e2e
docs/                   Diseño del sistema
```

## Reglas del proyecto

1. **Ningún dato comercial en el código.** Planes, precios, horarios y reglas
   viven en [`src/config/placeholders.ts`](src/config/placeholders.ts) y, en
   producción, en `business_settings`.
2. **Los permisos se verifican en el servidor.** Ocultar un botón no es
   autorizar.
3. **La auditoría se escribe dentro de la transacción** que audita.
4. **El dinero no se borra.** Sin `DELETE` en pagos, cargos ni asistencia.
5. **Los estados que dependen del calendario se derivan**, no se almacenan.
6. **Las fechas de negocio pasan por `businessToday()`.** Nada de `new Date()`
   suelto — ver [ADR-005](docs/adr/0005-fechas-de-negocio.md).

## Decisiones técnicas

Los [ADR](docs/adr/) registran las decisiones no obvias y por qué se tomaron.
