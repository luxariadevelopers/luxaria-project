/** Mirrors Nest `BoqUnit` — local to avoid cross-module coupling on phase 084. */
export const BoqUnit = {
  Number: 'number',
  Bag: 'bag',
  Kilogram: 'kilogram',
  Ton: 'ton',
  Litre: 'litre',
  Metre: 'metre',
  SquareFoot: 'square_foot',
  CubicFoot: 'cubic_foot',
  SquareMetre: 'square_metre',
  CubicMetre: 'cubic_metre',
  RunningMetre: 'running_metre',
  Load: 'load',
  Box: 'box',
  Job: 'job',
  Day: 'day',
  LumpSum: 'lump_sum',
} as const;

export type BoqUnit = (typeof BoqUnit)[keyof typeof BoqUnit];
