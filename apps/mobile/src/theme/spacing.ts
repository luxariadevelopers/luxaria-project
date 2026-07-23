/** 4pt grid spacing scale. Prefer these over magic numbers. */
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

/** Minimum interactive target size (iOS HIG / Material). */
export const hitSlopMin = 44;

export type SpacingKey = keyof typeof spacing;
