export const radii = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  pill: 999,
} as const;

export type RadiiKey = keyof typeof radii;
