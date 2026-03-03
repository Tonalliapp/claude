import type { IngredientUnit } from '@prisma/client';

type Dimension = 'mass' | 'volume' | 'count';

const dimensionMap: Record<IngredientUnit, Dimension> = {
  kg: 'mass',
  g: 'mass',
  lt: 'volume',
  ml: 'volume',
  piezas: 'count',
};

// Factor to convert a unit to the base unit of its dimension (g for mass, ml for volume)
const toBase: Record<IngredientUnit, number> = {
  g: 1,
  kg: 1000,
  ml: 1,
  lt: 1000,
  piezas: 1,
};

/**
 * Convert a value from one IngredientUnit to another.
 * Throws if the units are incompatible (e.g. kg -> ml).
 */
export function convertUnits(
  value: number,
  fromUnit: IngredientUnit,
  toUnit: IngredientUnit,
): number {
  if (fromUnit === toUnit) return value;

  const fromDim = dimensionMap[fromUnit];
  const toDim = dimensionMap[toUnit];

  if (fromDim !== toDim) {
    throw new Error(
      `No se pueden convertir unidades incompatibles: ${fromUnit} (${fromDim}) -> ${toUnit} (${toDim})`,
    );
  }

  // Convert: fromUnit -> base -> toUnit
  return (value * toBase[fromUnit]) / toBase[toUnit];
}
