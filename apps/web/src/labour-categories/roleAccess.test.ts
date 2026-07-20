import { describe, expect, it } from 'vitest';
import { resolveLabourCategoryCapabilities } from './roleAccess';

describe('resolveLabourCategoryCapabilities', () => {
  it('maps Nest labour_category.view / manage', () => {
    const viewOnly = resolveLabourCategoryCapabilities(
      (code) => code === 'labour_category.view',
    );
    expect(viewOnly.canView).toBe(true);
    expect(viewOnly.canManage).toBe(false);

    const manage = resolveLabourCategoryCapabilities((code) =>
      ['labour_category.view', 'labour_category.manage'].includes(code),
    );
    expect(manage.canView).toBe(true);
    expect(manage.canManage).toBe(true);
  });
});
