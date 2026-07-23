import { describe, expect, it } from 'vitest';
import { formDrawerPaperSx } from './formDrawer';

describe('formDrawerPaperSx', () => {
  it('is full width on xs and fixed from sm', () => {
    expect(formDrawerPaperSx(460)).toEqual({
      width: { xs: '100%', sm: 460, md: 460 },
      maxWidth: '100vw',
    });
  });

  it('supports distinct sm/md widths', () => {
    expect(formDrawerPaperSx({ sm: 440, md: 720 })).toEqual({
      width: { xs: '100%', sm: 440, md: 720 },
      maxWidth: '100vw',
    });
  });
});
