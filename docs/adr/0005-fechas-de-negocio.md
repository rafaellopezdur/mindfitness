# ADR-0005 · Fechas de negocio como cadena con aritmética UTC propia

**Fecha:** 2026-08-04 · **Estado:** Aceptada · **Fase:** 1

## Contexto

Las fechas de negocio del sistema —inicio y fin de membresía, día de asistencia,
vencimiento de un cargo— **no son instantes**: son días del calendario en
`America/Bogota`. Una membresía que vence el 4 de agosto es válida durante todo
ese día, sin importar la hora ni dónde esté el servidor.

Al implementarlo con `date-fns` sobre objetos `Date` anclados a medianoche UTC
apareció un error real, detectado por `tests/unit/dates.test.ts`:

```
calculateEndDate('2026-01-31', 1, 'MONTH')
  esperado  2026-02-27
  obtenido  2026-02-28
```

**Causa:** `date-fns` opera en la zona horaria **local del proceso**. En un
servidor en UTC-5, `'2026-01-31T00:00:00Z'` es el 30 de enero local; el ajuste
de fin de mes se aplica sobre esa fecha equivocada y el resultado se desplaza un
día al volver a UTC.

Lo peligroso es el patrón del fallo: **solo se manifiesta en los días de
desbordamiento de mes y solo en algunas zonas horarias**. En una prueba con el
día 15 el error se cancela y todo parece correcto.

## Decisión

1. Una fecha de negocio se representa como **`'YYYY-MM-DD'`** (tipo `BusinessDate`,
   una cadena con marca de tipo), no como `Date`.
2. Toda la aritmética se implementa sobre **componentes UTC explícitos**
   (`Date.UTC`, `getUTCFullYear`…), sin `date-fns` ni ninguna función sensible a
   la zona horaria local.
3. El día actual se obtiene **siempre** con `businessToday()`, que usa
   `Intl.DateTimeFormat` con `timeZone: 'America/Bogota'`.
4. `new Date()` queda prohibido para cálculos de negocio (RN-01).

## Consecuencias

**A favor**
- El resultado es idéntico en el portátil del desarrollador, en CI y en producción.
- Las comparaciones son comparaciones de cadenas: `a < b` funciona y es ordenable en SQL.
- Se elimina una clase entera de errores en lugar de corregir casos sueltos.
- Menos dependencias en la ruta crítica.

**En contra**
- Hay que escribir la aritmética de meses a mano (~30 líneas), incluido el
  recorte de fin de mes.
- Convertir a `Date` para presentación exige una función explícita.

**Coste de no haberlo hecho:** una membresía vendida el 31 de enero habría
vencido un día tarde. En 12 meses, un cliente con renovaciones a fin de mes
acumula días regalados que nadie detecta.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| `date-fns-tz` | Resuelve el síntoma, mantiene `Date` como representación y deja la puerta abierta a repetir el error en cada función nueva. |
| Fijar `TZ=America/Bogota` en el proceso | Funciona hasta que alguien ejecuta las pruebas en otra máquina o el proveedor cambia el entorno. Depender de una variable de entorno para la corrección aritmética es frágil. |
| `Temporal` (TC39) | Es la respuesta correcta a futuro, pero aún no está disponible sin polyfill en Node 24. Migrar después será directo: la representación ya es un día de calendario. |

## Verificación

`tests/unit/dates.test.ts` cubre el cambio de día a las 05:00 UTC, el
desbordamiento de mes, los años bisiestos, los límites de semana y la mora.
