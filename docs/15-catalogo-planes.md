# 15 · Catálogo de planes real

> **Fuente:** tabla de precios aportada por el cliente + valor del pase diario (4 de agosto de 2026).
> **Estado:** ✅ datos reales — dejan de ser `[TEMP]`. Pendiente confirmar los puntos de §5.

---

## 1. Lo que hay hoy

**Sección comercial:** *Atención Semipersonalizada Premium*

| Plan | Precio/mes | Frecuencia | Asesoría | Entrenador especializado |
|---|---:|---|:---:|:---:|
| **Básico** | `$175.000` | 6 días/semana | ❌ | ❌ |
| **Semi-Pro** ⭐ *recomendado* | `$250.000` | 3 días/semana | ✅ | ✅ |
| **Pro** | `$315.000` | 6 días/semana | ✅ | ✅ |
| **Pase diario** | `$27.000` | 1 día | ❓ | ❓ |

## 2. Esta tabla es la prueba de que el modelo de derechos era necesario

Los tres planes viven bajo el mismo encabezado —*Atención Semipersonalizada Premium*— y sin embargo
**el Plan Básico no incluye ni asesoría ni entrenador**. Si el sistema guardara `modality =
'SEMI_PERSONAL'`, los tres serían idénticos para el entrenador, y la alerta *"su plan no incluye
acompañamiento"* sería imposible de calcular.

La etiqueta comercial y lo contratado **no coinciden**. Eso es exactamente lo que separa
`plans.modality` (marketing) de `plan_entitlements` (verdad operativa) en
[12-servicios-y-entrenadores.md](12-servicios-y-entrenadores.md#1-el-problema-y-la-decisión).

Segunda observación: **Semi-Pro cuesta más que Básico teniendo la mitad de días.** El precio no está
puesto sobre la frecuencia, sino sobre el acompañamiento. Un modelo basado en "días por semana" no
podría representar ese catálogo.

## 3. Catálogo de servicios que se deriva

`services` — el catálogo mínimo que estos planes exigen:

| `code` | Nombre | `kind` | `unit` | `requires_trainer` |
|---|---|---|---|:---:|
| `GYM_ACCESS` | Acceso al gimnasio | `ACCESS` | `SESSION` | no |
| `SEMI_PERSONAL_ADVICE` | Asesoría semipersonalizada | `TRAINING` | `UNLIMITED` | **sí** |
| `SPECIALIZED_TRAINER` | Entrenador especializado asignado | `TRAINING` | `UNLIMITED` | **sí** |

## 4. Los cuatro planes modelados

### `plans`

| Campo | Básico | Semi-Pro | Pro | Pase diario |
|---|---|---|---|---|
| `slug` | `basico` | `semi-pro` | `pro` | `pase-diario` |
| `name` | Plan Básico | Plan Semi-Pro | Plan Pro | Pase diario |
| `price` | `175000` | `250000` | `315000` | `27000` |
| `duration_value` / `unit` | `1 MONTH` | `1 MONTH` | `1 MONTH` | `1 DAY` |
| `weekly_visit_limit` | `6` | `3` | `6` | — |
| `session_limit` | — | — | — | `1` |
| `modality` | `GROUP` | `SEMI_PERSONAL` | `SEMI_PERSONAL` | `OPEN` |
| `requires_schedule` | ❓ §5.4 | ❓ §5.4 | ❓ §5.4 | no |
| `is_public` | sí | sí | sí | ❓ §5.6 |
| **`is_recommended`** | no | **sí** ⭐ | no | no |
| `sort_order` | 1 | 2 | 3 | 4 |

### `plan_entitlements`

```
PLAN BÁSICO · $175.000
  ✅ GYM_ACCESS ............ 6 por SEMANA, sin acumular
  ❌ SEMI_PERSONAL_ADVICE .. no incluido
  ❌ SPECIALIZED_TRAINER ... no incluido

PLAN SEMI-PRO · $250.000  ⭐ recomendado
  ✅ GYM_ACCESS ............ 3 por SEMANA, sin acumular
  ✅ SEMI_PERSONAL_ADVICE .. ilimitada durante sus visitas
  ✅ SPECIALIZED_TRAINER ... incluido

PLAN PRO · $315.000
  ✅ GYM_ACCESS ............ 6 por SEMANA, sin acumular
  ✅ SEMI_PERSONAL_ADVICE .. ilimitada durante sus visitas
  ✅ SPECIALIZED_TRAINER ... incluido

PASE DIARIO · $27.000
  ✅ GYM_ACCESS ............ 1 visita, vence el mismo día
  ❓ los otros dos servicios → §5.6
```

**Lo que esto habilita de inmediato:**
- El entrenador ve *"Plan Básico · ❌ Sin entrenador especializado"* y sabe que ese acompañamiento
  no está pagado → solicita autorización en lugar de regalarlo.
- El check-in de un Semi-Pro que ya fue 3 veces esta semana avisa antes de dejarlo entrar.
- La tabla de precios pública **se genera desde estos mismos datos**. Ver §6.

## 5. La lógica de precios, y por qué importa

Los precios son internamente consistentes. Descomponiéndolos:

```
acompañamiento (asesoría + entrenador)  =  Pro − Básico  =  315.000 − 175.000  =  $140.000
3 días adicionales por semana           =  Pro − SemiPro =  315.000 − 250.000  =  $ 65.000

Verificación:  Semi-Pro  =  acceso 3 días (110.000)  +  acompañamiento (140.000)  =  $250.000 ✓
```

Esto no es un dato decorativo: es lo que hace calculable el **prorrateo al cambiar de plan** (RN-27) y
lo que permite configurar promociones sin romper la escalera de precios.

**Punto de equilibrio del pase diario:** `175.000 ÷ 27.000 = 6,5 días`. A partir de la séptima visita
del mes, el Plan Básico sale más barato que comprar pases sueltos.

> 💡 **Función que se deriva de esto:** cuando alguien compra su tercer pase diario del mes, el sistema
> le sugiere a recepción *"esta persona lleva 3 pases este mes ($81.000). Con 4 más le convendría el
> Plan Básico"*. Es conversión automática a partir de datos que el sistema ya tiene. Queda anotado
> como candidato para la v1.1.

## 6. La tabla de precios pública se genera sola

La comparación del sitio —con sus ✓ y ✗— **no se escribe a mano**: se renderiza desde
`plan_entitlements`. Un servicio incluido es ✓; uno ausente es ✗.

```
plan_entitlements  ──┬──►  /planes  (tabla pública de comparación)
                     ├──►  tarjeta del entrenador (qué incluye)
                     └──►  motor de acceso (resolveAccess)
```

Consecuencia práctica: **cambiar un plan en el portal administrativo actualiza la página de precios,
la tarjeta del entrenador y las reglas de acceso a la vez.** Nunca puede pasar que la web prometa algo
que el sistema no reconoce, que es el error más caro de este tipo de plataformas.

## 7. Decisiones tomadas (P30–P38)

Estado al **4 de agosto de 2026**. ✅ = respondida por el cliente · 🔵 = decidida por defecto a
petición del cliente ("lo que sugieras"). **Todas las 🔵 son configurables y reversibles sin migración.**

### ✅ P33 · El entrenador especializado es **el que esté en turno**

Consecuencias en el modelo, y son varias:

- La asignación es `trainer_assignments.scope = 'SLOT'`, no `CLIENT`. No hay que mantener una lista de
  "clientes de Carolina": se deduce de quién cubre cada franja.
- La alerta **"Cliente asignado a otro entrenador"** casi desaparece: solo se dispara si existe una
  asignación explícita de alcance `CLIENT` (caso futuro de un plan personalizado). Se conserva el código
  en `resolveAccess`, pero en la práctica no se activará con el catálogo actual.
- La tarjeta muestra **"Entrenador: el de turno (tú)"** en lugar de un nombre fijo.
- **"Mis clientes" del entrenador cambia de significado**: no es una lista fija, son los inscritos en
  las franjas que cubre hoy. Es más simple de mantener y más fiel a la realidad.
- El permiso `client.read.assigned` se define como: *clientes inscritos en franjas que el entrenador
  cubre* ∪ *asignaciones explícitas de alcance `CLIENT`*.

### ✅ P34 · La asesoría son **sesiones contadas** → falta el número

`SEMI_PERSONAL_ADVICE` usa `unit = 'SESSION'` con contador propio, separado del acceso.
**Es el único dato que aún falta para cerrar el catálogo**, y admite dos lecturas:

| Lectura | Significado | Modelado |
|---|---|---|
| **(a)** Cada visita acompañada cuenta | Semi-Pro = 3/semana · Pro = 6/semana | `quantity` = igual al límite de acceso, `period = WEEK` |
| **(b)** Revisiones puntuales al mes | P. ej. 2 al mes: rutina y medición | `quantity` = N, `period = MONTH` |

🔵 **Se implementa (a) como valor inicial**, porque es coherente con "semipersonalizado" y con que el
entrenador esté en turno: si va, va acompañado. **Cambiarlo a (b) es editar dos números en
Configuración**, no tocar código. Basta con confirmar cuál es.

### ✅ P35 · El pase diario **incluye asesoría**

```
PASE DIARIO · $27.000
  ✅ GYM_ACCESS ............ 1 visita, vence el mismo día
  ✅ SEMI_PERSONAL_ADVICE .. 1 sesión
  ✅ SPECIALIZED_TRAINER ... el de turno (consecuencia de P33)
```
🔵 Se vende **solo presencial** en la v1 (`allows_online_registration = false`) y **no** aparece en la
tabla pública de comparación: es un producto de mostrador, no una opción que compita con las
mensualidades. Se activa para web con una casilla cuando lo pidan.

### 🔵 P30 · El límite semanal es **blando**

Si alguien del Básico llega el séptimo día: **se le deja entrar**, el operador ve un aviso amarillo
(*"supera su límite de 6 días esta semana"*) y el exceso queda registrado como `service_usage` fuera
de derecho.
**Por qué:** bloquear a un cliente que ya pagó, en la puerta y con gente detrás, cuesta más que el día
regalado. Y el registro convierte el exceso en un dato de venta —*"Ana supera su plan 3 veces al mes,
le conviene el Pro"*— en lugar de en una discusión.
**[CFG]** `rules.weekly_limit_enforcement = 'WARN'` · alternativa: `'BLOCK'`.

### 🔵 P31 · Semana **calendario, de lunes a domingo**

Es lo que entiende una persona cuando le dicen "3 días por semana". Una ventana móvil de 7 días es más
justa matemáticamente e imposible de explicar en el mostrador.
**[CFG]** `rules.week_starts_on = 'MONDAY'`.

### 🔵 P32 · Los días no usados **se pierden**

`rollover = false`. Acumular convierte un plan mensual en un bono de sesiones y rompe la previsibilidad
del cupo por franja. Lo no usado queda registrado y aparece en el reporte de baja asistencia, que es
donde sí sirve.

### 🔵 P36 · Se asume que **estos son todos los planes por ahora**

El catálogo queda con los 4. Añadir una sección nueva (personalizado, por sesiones, corporativo) es
crear planes desde el portal administrativo: **cero desarrollo**. Si existe otra sección hoy, basta con
enviarla y se carga igual.

### 🔵 P37 · **Sin matrícula ni cuota de inscripción**

No aparece en la tabla de precios. El concepto `ENROLLMENT_FEE` ya existe en `charges` por si algún día
se cobra; hoy no se emite.

### 🔵 P38 · "Mensual" = **mes calendario**

Inicia el 15 de agosto → vence el 14 de septiembre (RN-02). Es lo que entiende el cliente y lo que evita
la deriva de fechas que produce contar 30 días.
**[CFG]** `rules.month_mode = 'CALENDAR'` · alternativa: `'FIXED_30_DAYS'`.

---

## 8. Catálogo definitivo para el seed

```
services
  GYM_ACCESS ............... ACCESS   · unit SESSION   · requires_trainer no
  SEMI_PERSONAL_ADVICE ..... TRAINING · unit SESSION   · requires_trainer sí
  SPECIALIZED_TRAINER ...... TRAINING · unit UNLIMITED · requires_trainer sí

plans                            precio    acceso        asesoría      entrenador
  basico ....................... 175.000   6 / semana    —             —
  semi-pro ⭐ .................. 250.000   3 / semana    3 / semana    de turno
  pro .......................... 315.000   6 / semana    6 / semana    de turno
  pase-diario (no público) ......  27.000   1 total       1 total       de turno

reglas
  month_mode ................... CALENDAR
  week_starts_on ............... MONDAY
  weekly_limit_enforcement ..... WARN
  rollover ..................... false
  enrollment_fee ............... 0
```

**Pendiente único del catálogo:** confirmar la lectura (a) o (b) de la asesoría (P34).
Todo lo demás está cerrado y es suficiente para construir.

---

**Anterior:** [14-notificaciones.md](14-notificaciones.md) · **Volver al** [índice](README.md)
