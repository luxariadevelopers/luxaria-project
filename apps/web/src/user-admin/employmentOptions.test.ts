import { describe, expect, it } from 'vitest';
import {
  departmentSelectOptions,
  designationSelectOptions,
  previewEmployeeId,
  USER_DEPARTMENT_NAMES,
  USER_DESIGNATIONS_BY_DEPARTMENT,
} from './employmentOptions';

describe('employmentOptions', () => {
  it('covers every department with at least one designation', () => {
    for (const department of USER_DEPARTMENT_NAMES) {
      expect(
        USER_DESIGNATIONS_BY_DEPARTMENT[department]?.length ?? 0,
      ).toBeGreaterThan(0);
    }
  });

  it('keeps a legacy department value selectable', () => {
    const options = departmentSelectOptions('Legacy Ops');
    expect(options.some((option) => option.value === 'Legacy Ops')).toBe(
      true,
    );
  });

  it('lists designations for the selected department', () => {
    const options = designationSelectOptions('Engineering & Construction');
    expect(options.some((option) => option.value === 'Site Engineer')).toBe(
      true,
    );
    expect(
      designationSelectOptions('').every(
        (option) => option.value === '' || option.value === undefined,
      ),
    ).toBe(true);
  });

  it('previews employee id from department and designation', () => {
    expect(
      previewEmployeeId('Engineering & Construction', 'Site Engineer'),
    ).toBe('ENG-SE-······');
    expect(previewEmployeeId('Engineering & Construction', '')).toBe('');
    expect(
      previewEmployeeId('Board & Executive', 'Managing Director'),
    ).toBe('EXE-MD-······');
  });
});
