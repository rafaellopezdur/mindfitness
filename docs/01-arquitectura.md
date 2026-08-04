# 01 · Arquitectura propuesta

## 1. Stack

| Capa | Elección | Por qué |
|---|---|---|
| Framework | **Next.js 15 (App Router) + TypeScript strict** | Un solo despliegue para portal público, admin y API. RSC reduce el JS enviado al móvil. |
| UI | **Tailwind CSS v4 + shadcn/ui (Radix)** | Componentes accesibles que se copian al repo (no dependencia opaca), tematizables con la paleta del logo. |
| Base de datos | **PostgreSQL 16** | Relacional, transacciones serias, `JSONB` para snapshots y payloads de proveedor. |
| ORM | **Prisma 6** | Migraciones versionadas, tipos generados, transacciones interactivas. |
| Validación | **Zod** (esquemas compartidos) | Un solo esquema valida el formulario, la Server Action y el endpoint público. |
| Autenticación | **Auth.js v5** con sesión en base de datos | Cookies `httpOnly`, revocación inmediata de sesión, sin JWT en cliente. |
| Estado servidor | RSC + Server Actions; **TanStack Query** solo en pantallas de alta interacción | Menos código, menos hidratación. |
| Archivos | **S3-compatible** (Cloudflare R2 / Supabase Storage) con URLs firmadas | Documentos y comprobantes nunca públicos. |
| Correo | **Resend** (adaptador `EmailProvider`) | Transaccional, cambiable. |
| Pagos | **Adaptador `PaymentGateway`** + implementación concreta `[TEMP]` | El negocio no conoce al proveedor. |
| Trabajos programados | Cron (Vercel Cron / `node-cron`) → endpoint firmado | Vencimientos, recordatorios, conciliación. |
| Errores | **Sentry** + logs estructurados (`pino`) | Trazabilidad de fallos, especialmente en webhooks. |
| Pruebas | **Vitest** (unitarias/integración) + **Playwright** (E2E) | Reglas de negocio y flujos críticos. |

> Alternativa evaluada y descartada para v1: backend separado (NestJS) + frontend. Añade un despliegue,
> un contrato y un equipo que este proyecto no necesita. El límite queda igualmente marcado (§3) para
> poder extraerlo después sin reescribir la lógica.

## 2. Arquitectura en capas

```
┌───────────────────────────────────────────────────────────────────┐
│  PRESENTACIÓN                                                     │
│  app/(public)/    app/(admin)/    app/(member)/ [preparado]       │
│  Server Components · Client Components · Server Actions           │
├───────────────────────────────────────────────────────────────────┤
│  API PÚBLICA / CONTRATO                                           │
│  app/api/v1/**   (REST, versionada — la consumirá la app móvil)   │
│  app/api/webhooks/payments/[provider]  (idempotente, firmado)     │
├───────────────────────────────────────────────────────────────────┤
│  APLICACIÓN — casos de uso  ◄── ÚNICO lugar con reglas de negocio │
│  server/modules/{clients,plans,memberships,payments,...}/service  │
│  Transacciones · Autorización · Auditoría · Eventos               │
├───────────────────────────────────────────────────────────────────┤
│  DOMINIO — lógica pura, sin I/O, 100 % testeable                  │
│  server/domain/  membership-rules · attendance-rules · pricing    │
│                  state-machines · date-math (America/Bogota)      │
├───────────────────────────────────────────────────────────────────┤
│  INFRAESTRUCTURA — adaptadores intercambiables                    │
│  prisma · payments/* · email/* · storage/* · messaging/* · jobs   │
└───────────────────────────────────────────────────────────────────┘
```

**Regla de dependencia:** las flechas apuntan solo hacia abajo. `domain/` no importa Prisma, ni Next, ni
nada con I/O. Es lo que hace que las reglas de negocio se puedan probar en milisegundos.

## 3. Estructura de carpetas

```
mindfitness/
├─ app/
│  ├─ (public)/           # portal público
│  ├─ (admin)/admin/      # portal administrativo
│  ├─ (member)/mi/        # [preparado, deshabilitado por feature flag]
│  └─ api/
│     ├─ v1/              # API REST versionada
│     ├─ webhooks/        # pagos, correo
│     └─ cron/            # jobs firmados
├─ server/
│  ├─ domain/             # ⬅ lógica pura
│  ├─ modules/            # ⬅ casos de uso por módulo
│  ├─ auth/               # sesión, RBAC, guards
│  ├─ audit/              # servicio de auditoría
│  └─ infra/              # prisma, payments, email, storage, messaging
├─ shared/
│  ├─ schemas/            # Zod compartido cliente/servidor
│  ├─ types/
│  └─ constants/          # enums, códigos de error
├─ components/
│  ├─ ui/                 # primitivas (shadcn)
│  ├─ patterns/           # DataView, StatCard, StepForm, ConfirmDialog…
│  └─ domain/             # ClientCard, MembershipBadge, PlanCard…
├─ config/
│  ├─ placeholders.ts     # ⬅ TODO dato [TEMP] vive aquí
│  └─ features.ts         # feature flags
├─ prisma/                # schema.prisma, migrations/, seed.ts
├─ tests/                 # unit / integration / e2e
└─ docs/                  # estos documentos
```

## 4. Cómo se escribe una operación crítica

Toda mutación sensible pasa por el mismo esqueleto. No hay excepciones.

```
1. Validar entrada         → Zod (esquema compartido)
2. Autenticar              → sesión válida
3. Autorizar               → can(user, 'payment.void') · verificar alcance
4. Idempotencia            → si trae idempotency_key, ¿ya se ejecutó?
5. TRANSACCIÓN
   ├─ leer con bloqueo (SELECT … FOR UPDATE donde importe)
   ├─ validar invariantes de dominio
   ├─ escribir entidades
   ├─ escribir audit_log (usuario, antes, después, motivo)
   └─ encolar efectos (outbox: correo, notificación)
6. Revalidar caché         → revalidateTag / revalidatePath
7. Responder               → resultado tipado, error legible
```

## 5. Modelo de autorización (RBAC + alcance)

Permiso = `recurso.acción` (`payment.create`, `membership.pause`, `report.financial.export`).
Roles agrupan permisos, **almacenados en base de datos** (editables desde Configuración, no en código).

Además del permiso hace falta el **alcance**: un entrenador tiene `attendance.create`, pero solo sobre
*sus* clientes asignados. Por eso todo servicio recibe un `ActorContext { userId, roles, permissions, scope }`
y los repositorios aplican el filtro de alcance en la consulta, no en la vista.

- Se verifica **en el servidor siempre**. La UI oculta botones; eso es cosmética, no seguridad.
- Un rol es un dato, un permiso es una constante de código. Se pueden crear roles nuevos; no se pueden
  inventar permisos nuevos sin desplegar.

## 6. Adaptador de pagos

```ts
interface PaymentGateway {
  readonly id: string
  createTransaction(input: CreateTxInput): Promise<GatewayTransaction>
  verifyTransaction(reference: string): Promise<GatewayTransactionStatus>  // fuente de verdad
  parseWebhook(raw: string, headers: Headers): Promise<WebhookEvent>       // valida firma
  refund?(txId: string, amountMinor: bigint): Promise<RefundResult>
}
```

Implementaciones previstas: `MockGateway` (desarrollo y pruebas, siempre presente),
`WompiGateway` / `MercadoPagoGateway` / `EpaycoGateway` — **una a elegir**, ver
[09-preguntas-pendientes.md](09-preguntas-pendientes.md#p1).

Reglas no negociables del adaptador:
- Referencia interna única (`payment_intents.reference`) generada por nosotros, nunca por el proveedor.
- Webhook: verificar firma → responder `200` rápido → procesar de forma idempotente por `event_id`.
- Ante cualquier duda, **`verifyTransaction`** contra la API manda sobre el contenido del webhook.
- Todo intento y toda respuesta cruda se guardan en `payment_attempts.raw_response` (JSONB).

## 7. Convenciones transversales

| Tema | Convención |
|---|---|
| **Dinero** | `BIGINT` en **unidades menores**. Para COP el exponente es `0` (1 unidad = $1). Nunca `float`. Formateo solo en la vista. |
| **Zona horaria** | Todo `TIMESTAMPTZ` en UTC. Las fechas de negocio (inicio/fin de membresía, día de asistencia) son `DATE` calculadas en `America/Bogota`. Una sola función `businessToday()`. |
| **IDs** | `uuid v7` (ordenable en el tiempo, sin filtrar volumen de negocio). |
| **Borrado** | `deleted_at` (soft delete) en catálogos. **Prohibido** en `payments`, `charges`, `attendance`, `audit_logs`. |
| **Errores** | `AppError` con `code` estable, mensaje para el usuario en español y detalle técnico solo en logs. |
| **Secretos** | Solo variables de entorno del servidor. Nada de `NEXT_PUBLIC_` para llaves. Validadas al arrancar con Zod. |
| **Migraciones** | Siempre `prisma migrate`. Prohibido cambiar la base a mano. |
| **Entornos** | `development` (Docker local) · `staging` (base separada, pagos en sandbox) · `production`. |

## 8. Preparación para el futuro (sin construirlo hoy)

- **App móvil / PWA:** la API `v1` es el contrato. Nada de lógica en el cliente web que la app tuviera que duplicar.
- **Portal del miembro:** `clients.user_id` ya existe (nullable) y el rol `CLIENTE` ya está en el seed, sin permisos activos.
- **QR de asistencia:** `clients.access_code` reservado; el servicio de asistencia recibe `source: 'manual' | 'qr'`.
- **Multi-sede:** todas las tablas operativas nacen con `location_id` **nullable**, apuntando a la sede única. Añadir sedes después no requiere migrar datos.
- **WhatsApp oficial:** `messaging/` ya es un adaptador; hoy la implementación es `click-to-chat`.

---

**Anterior:** [00-resumen-ejecutivo.md](00-resumen-ejecutivo.md) · **Siguiente:** [02-mapa-modulos.md](02-mapa-modulos.md)
