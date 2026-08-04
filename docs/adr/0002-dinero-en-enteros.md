# ADR-0002 · El dinero se guarda como entero en unidades menores

**Fecha:** 2026-08-04 · **Estado:** Aceptada · **Fase:** 1

## Contexto

El sistema maneja pagos, cargos, descuentos, prorrateos, reembolsos, comisiones
de pasarela y liquidaciones de entrenadores. Un peso perdido en un redondeo
aparece como descuadre en el cierre del mes y destruye la confianza en el sistema.

La moneda es el peso colombiano, que **no usa decimales** en la práctica.

## Decisión

Los importes se guardan como **`BigInt` en unidades menores**, con exponente 0
para COP: `1` = `$1`.

- Nunca `float` ni `double`.
- El formateo a `$175.000` ocurre **solo en la vista**, con `Intl.NumberFormat('es-CO')`.
- Los importes se muestran con `font-variant-numeric: tabular-nums` para que las
  columnas se alineen.

## Consecuencias

**A favor**
- Exactitud absoluta: la suma de pagos siempre cuadra con el total.
- Se serializa sin pérdida a través de la frontera de React Server Components,
  cosa que `Prisma.Decimal` **no** hace (requiere conversión manual en cada borde).
- Las operaciones aritméticas son las nativas del lenguaje.

**En contra**
- `BigInt` no es serializable por `JSON.stringify` sin ayuda: hace falta un
  serializador en los bordes de la API.
- Si algún día se opera en una moneda con decimales, hay que introducir el
  exponente en los cálculos. Ya está previsto en `BUSINESS.currencyExponent`.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| `Decimal(14,2)` con `Prisma.Decimal` | Exacto en la base, pero el objeto `Decimal` no cruza el límite RSC y obliga a convertir en cada frontera. Fuente de errores silenciosos. |
| `number` (float) | `0.1 + 0.2 !== 0.3`. Descartado sin discusión para dinero. |
| Guardar en centavos (exponente 2) | COP no usa centavos. Multiplicar y dividir por 100 sin motivo añade una fuente de error sin ganar nada. |
