# 17 · Prompt de continuación

> Copia todo lo que sigue en un chat nuevo. Es autocontenido: describe el
> proyecto, lo construido, las decisiones tomadas y lo que falta.
> **No contiene contraseñas** — están en `.env`, que no se versiona.

---

Continúa el desarrollo de **Mind Fitness Club**, una plataforma de gestión para
un gimnasio pequeño en Colombia. El proyecto ya está avanzado: **lee primero
`docs/README.md` y los ADR en `docs/adr/`** antes de escribir código.

## Contexto

- **Repositorio:** `git@github.com:rafaellopezdur/mindfitness.git` (rama `main`)
- **Carpeta local:** `C:\Users\ragui\Desktop\MindFitness Club - WebAPP`
- **Base de datos:** Supabase PostgreSQL, ya migrada y sembrada. Las cadenas de
  conexión están en `.env` (no versionado). Si falta, usa `.env.example`.
- **Idioma:** todo en español — código comentado, interfaz, mensajes y commits.

## Stack

Next.js 15 (App Router) · TypeScript strict · Tailwind v4 · Prisma 6 ·
PostgreSQL · Zod · Vitest · Argon2id. Sin librerías de UI ni de animación:
los componentes son propios y el movimiento es CSS.

```
npm run dev        # servidor (Turbopack)
npm run build      # compilación
npm test           # 216 pruebas unitarias
npm run typecheck
npm run lint
npm run db:migrate
npm run db:seed
npm run shot       # capturas y verificación de scroll horizontal
```

## Estado actual

**Terminado**
- **Fase 1 · Fundaciones:** sesiones en base de datos, RBAC con 152 permisos y
  4 roles, auditoría inmutable, configuración, login, cambio de contraseña,
  usuarios, auditoría.
- **Fase 2 · Clientes y configuración:** ficha con 6 pestañas, búsqueda sin
  tildes, detección de duplicados, observaciones inmutables, configuración
  editable con reglas críticas separadas por permiso.
- **Rediseño visual completo:** sistema de tokens propio, navegación agrupada,
  componentes (`Select`, `FilterBar`, `DataView`, `Sheet`, `Toast`, `Skeleton`,
  `Badge`, `Tabs`, `MetricGroup`, `FormSection`), movimiento con tres escalas.
  Auditoría en `docs/16-auditoria-diseno.md`.
- **Fase 3 · parcial:** modelo completo (15 tablas), dominio con 74 pruebas,
  y los módulos de **Planes** y **Membresías** funcionando.

**Pendiente**
1. **Fase 3 · resto:** Horarios y franjas, Entrenadores, Autorizaciones de
   servicio. Sin franjas, un plan con `requiresSchedule` no se puede vender.
2. **Pendientes de diseño:** `CommandMenu` (⌘K), centro de notificaciones, y
   unificar Ficha de cliente, Usuarios, Auditoría y Configuración con
   `Tabs`/`DataView`/`Select` (funcionan y usan los tokens nuevos, pero aún no
   los componentes unificados). Falta auditar el modo oscuro caso por caso.
3. **Fases 4 a 12**, en `docs/10-fases-desarrollo.md`: pagos y asistencia,
   dashboard, portal público, pagos en línea, eventos, finanzas, cartera y
   comunicaciones, notificaciones, reportes y cierre.

## Decisiones ya tomadas — no volver a discutirlas

Están documentadas; respétalas.

1. **Plan ≠ Membresía.** Cada membresía guarda `planSnapshot`: cambiar un plan
   no altera ningún contrato vendido.
2. **Los planes son datos, no código.** No existe `plan_type` ni
   `if (plan === 'MENSUAL')`. Los tipos emergen de combinar reglas.
3. **Los derechos (`entitlements`) son la verdad operativa**, no `modality`.
   Es lo que permite decir «su plan no incluye acompañamiento» o «le quedan 3
   sesiones». Ver `docs/12-servicios-y-entrenadores.md`.
4. **Cargos ≠ pagos.** `charges` (obligación) + `payments` (movimiento) +
   `payment_allocations`. Ver `docs/06-modelo-datos.md`.
5. **El dinero no se borra.** Sin `DELETE` en pagos, cargos ni asistencia.
6. **Los estados que dependen del calendario se derivan**, no se almacenan
   (ADR-0003). Si `endDate` pasó, está vencida aunque ningún job haya corrido.
7. **La verdad del pago la da el proveedor**, nunca el navegador.
8. **Dinero como `BigInt`** en unidades menores, COP exponente 0 (ADR-0002).
9. **Fechas de negocio como `'YYYY-MM-DD'`** con aritmética UTC propia
   (ADR-0005). Nunca `new Date()` para lógica de negocio: usa `businessToday()`.
10. **Pooler de sesión (5432), no de transacciones** (ADR-0006). Máximo dos
    idas y vueltas por página; lo independiente en `Promise.all`.

## Datos reales confirmados

Catálogo en `docs/15-catalogo-planes.md`, ya sembrado:

| Plan | Precio | Frecuencia | Asesoría | Entrenador |
|---|---:|---|:---:|:---:|
| Básico | 175.000 | 6 días/semana | ❌ | ❌ |
| Semi-Pro ⭐ | 250.000 | 3 días/semana | ✅ | ✅ |
| Pro | 315.000 | 6 días/semana | ✅ | ✅ |
| Pase diario | 27.000 | 1 día | ✅ | ✅ |

Reglas decididas: mes **calendario** · semana **lunes a domingo** · límite
semanal **blando** (avisa y registra, no bloquea) · **sin acumular** días ·
autorizaciones en modo **operativo** (se presta y se aprueba después) ·
entrenador **de turno**, no fijo · sin matrícula.

## Preguntas todavía abiertas

- **P1 · Proveedor de pagos** — sin decidir. Se desarrolla contra
  `MockGateway`. Opciones: Wompi, Mercado Pago, ePayco.
- **P34** — cuántas sesiones de asesoría incluye cada plan. Se implementó «una
  por visita» como valor inicial; confirmar.
- **P5** — franjas horarias reales, capacidad y entrenador.
- **P6** — textos legales (T&C, privacidad, tratamiento de datos, Ley 1581).
- **P13** — proveedor de almacenamiento para documentos. Lo natural es Supabase
  Storage, que ya está disponible.

Ver `docs/09-preguntas-pendientes.md`.

## Cómo trabajar

Para cada fase: explica qué construirás → migración → dominio puro con pruebas
→ servicios con transacción, autorización y auditoría → API o Server Actions
con Zod compartido → interfaz mobile-first → pruebas → verificar permisos con
los tres roles → ADR si la decisión no es obvia.

**Reglas**
- Ningún dato comercial en el código: va a `src/config/placeholders.ts` o a
  `business_settings`.
- La auditoría se escribe **dentro** de la transacción que audita.
- Los permisos se verifican **siempre** en el servidor.
- Motivo obligatorio en anulaciones, descuentos sobre tope, extensiones,
  cortesías, cancelaciones y accesos excepcionales.
- Mensajes en español y sin jerga: nunca «Error 500» ni «EXPIRED».
- No inventes datos del gimnasio. Lo no confirmado va marcado `[TEMP]`.
- No rompas funcionalidad existente. Verifica typecheck, lint y las 216
  pruebas antes de dar algo por terminado.

## Trampas ya encontradas (no repetirlas)

- **Tailwind v4:** `ml-[--var]` **no** resuelve variables. Usa las utilidades
  que genera `@theme` (`bg-surface`, `text-ink`, `border-line`).
- **PowerShell 5.1** destroza los acentos al reescribir archivos. Si haces
  reemplazos masivos, usa `[System.IO.File]::ReadAllText/WriteAllText` con
  `UTF8Encoding($false)`.
- **No ejecutes `npm run build` con `npm run dev` activo:** comparten `.next` y
  se corrompen. Detén el servidor antes.
- **`prisma generate` falla** si el servidor de desarrollo tiene bloqueada la
  DLL del motor. Deténlo antes de migrar.
- **No modifiques `mustChangePassword`** ni otros datos reales para tomar
  capturas: eso ya causó que la contraseña del administrador se marcara como
  temporal en cada carga.
- **`Membership` no tiene relación inversa en `Client`** (solo `clientId`).
  Consulta las membresías vivas por separado, o añade la relación con una
  migración si lo prefieres.
- **Cookies:** Next solo permite modificarlas en Server Actions y Route
  Handlers, nunca durante el render de una página.

## Verificación visual

`npm run shot [url] [carpeta]` toma capturas por CDP en 360, 768 y 1280 px y
**falla si el body hace scroll horizontal**. `scripts/dev-session.mjs` genera
una sesión para capturar el panel autenticado (`MFC_COOKIE`), y `MFC_STORAGE`
permite fijar preferencias como la barra lateral plegada.

---

**Empieza preguntándome qué fase quieres abordar**, o propón el orden que
consideres mejor justificándolo.
