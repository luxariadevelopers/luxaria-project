import type { SxProps, Theme } from '@mui/material/styles';

export type FormDrawerWidth = number | { sm?: number; md?: number };

/**
 * Shared Drawer paper width: full-bleed on `xs`, fixed from `sm` up.
 * Use with MUI Drawer `slotProps.paper.sx`.
 *
 * @example
 * ```tsx
 * <Drawer
 *   anchor="right"
 *   slotProps={{ paper: { sx: formDrawerPaperSx(460) } }}
 * />
 * ```
 */
export function formDrawerPaperSx(
  width: FormDrawerWidth = 440,
): SxProps<Theme> {
  const sm = typeof width === 'number' ? width : (width.sm ?? 440);
  const md = typeof width === 'number' ? sm : (width.md ?? sm);
  return {
    width: { xs: '100%', sm, md },
    maxWidth: '100vw',
  };
}
