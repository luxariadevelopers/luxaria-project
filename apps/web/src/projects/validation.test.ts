import { describe, expect, it } from 'vitest';
import {
  buildProjectFormDefaults,
  projectAssignmentFormSchema,
  projectFormSchema,
  toCreateProjectInput,
} from './validation';

function validValues() {
  const values = buildProjectFormDefaults();
  return {
    ...values,
    projectName: 'Luxaria Heights',
    address: {
      ...values.address,
      line1: '12 Main Road',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600001',
    },
  };
}

describe('project form validation', () => {
  it('requires core fields and a valid Indian PIN', () => {
    expect(
      projectFormSchema.safeParse({
        ...validValues(),
        projectName: '',
      }).success,
    ).toBe(false);
    expect(
      projectFormSchema.safeParse({
        ...validValues(),
        address: { ...validValues().address, pincode: '000001' },
      }).success,
    ).toBe(false);
    expect(projectFormSchema.safeParse(validValues()).success).toBe(true);
  });

  it('validates coordinate pairs and ranges', () => {
    expect(
      projectFormSchema.safeParse({
        ...validValues(),
        latitude: '13.08',
        longitude: '',
      }).success,
    ).toBe(false);
    expect(
      projectFormSchema.safeParse({
        ...validValues(),
        latitude: '91',
        longitude: '80',
      }).success,
    ).toBe(false);
    expect(
      projectFormSchema.safeParse({
        ...validValues(),
        latitude: '13.08',
        longitude: '80.27',
      }).success,
    ).toBe(true);
  });

  it('validates date order, RERA dates, and non-negative numeric fields', () => {
    expect(
      projectFormSchema.safeParse({
        ...validValues(),
        startDate: '2026-02-31',
      }).success,
    ).toBe(false);
    expect(
      projectFormSchema.safeParse({
        ...validValues(),
        startDate: '2026-08-01',
        expectedCompletionDate: '2026-07-31',
      }).success,
    ).toBe(false);
    expect(
      projectFormSchema.safeParse({
        ...validValues(),
        approvedBudget: '-1',
      }).success,
    ).toBe(false);
    expect(
      projectFormSchema.safeParse({
        ...validValues(),
        numberOfUnits: '1.5',
      }).success,
    ).toBe(false);
    expect(
      projectFormSchema.safeParse({
        ...validValues(),
        reraDetails: {
          ...validValues().reraDetails,
          registrationDate: '2026-08-01',
          validUntil: '2026-07-31',
        },
      }).success,
    ).toBe(false);
  });

  it('builds a company-restricted create DTO without projectCode', () => {
    const result = projectFormSchema.parse({
      ...validValues(),
      latitude: '13.08',
      longitude: '80.27',
      approvedBudget: '25000000',
    });
    const dto = toCreateProjectInput(
      result,
      '507f1f77bcf86cd799439012',
    );

    expect(dto.companyId).toBe('507f1f77bcf86cd799439012');
    expect(dto.latitude).toBe(13.08);
    expect(dto.approvedBudget).toBe(25_000_000);
    expect(dto).not.toHaveProperty('projectCode');
  });

  it('omits companyId so the backend can resolve the tenant', () => {
    const dto = toCreateProjectInput(projectFormSchema.parse(validValues()));
    expect(dto).not.toHaveProperty('companyId');
  });
});

describe('project assignment validation', () => {
  it('rejects an access end before the start date', () => {
    expect(
      projectAssignmentFormSchema.safeParse({
        userId: '507f1f77bcf86cd799439013',
        accessStartDate: '2026-07-21',
        accessEndDate: '2026-07-20',
        status: 'active',
        notes: '',
      }).success,
    ).toBe(false);
    expect(
      projectAssignmentFormSchema.safeParse({
        userId: '507f1f77bcf86cd799439013',
        accessStartDate: '2026-02-31',
        accessEndDate: '',
        status: 'active',
        notes: '',
      }).success,
    ).toBe(false);
  });
});
