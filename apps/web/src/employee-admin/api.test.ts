import { describe, expect, it } from 'vitest';
import { normaliseAccessSummary, normaliseEmployee } from './api';
import { EmployeeStatus, type EmployeeAccessSummary, type PublicEmployee } from './types';

describe('employee administration API normalisation', () => {
  it('normalises nullable employee fields and dates', () => {
    const raw = {
      id: '507f1f77bcf86cd799439011',
      companyId: '507f1f77bcf86cd799439012',
      employeeCode: 'EMP-000001',
      firstName: 'Ada',
      lastName: 'Lovelace',
      displayName: 'Ada Lovelace',
      email: 'ada@example.com',
      mobile: undefined,
      departmentId: '507f1f77bcf86cd799439013',
      designationId: '507f1f77bcf86cd799439014',
      reportingManagerUserId: undefined,
      employmentType: 'full_time',
      joiningDate: new Date('2026-01-15T00:00:00.000Z'),
      relievingDate: undefined,
      status: EmployeeStatus.Active,
      primaryWorkLocation: undefined,
      profilePhoto: undefined,
      emergencyContact: undefined,
      userId: undefined,
    } as unknown as PublicEmployee;

    const normalised = normaliseEmployee(raw);
    expect(normalised.mobile).toBeNull();
    expect(normalised.reportingManagerUserId).toBeNull();
    expect(normalised.userId).toBeNull();
    expect(normalised.joiningDate).toBe('2026-01-15T00:00:00.000Z');
    expect(normalised.relievingDate).toBeNull();
  });

  it('normalises access summary arrays and nested project/site payloads', () => {
    const summary = {
      employee: {
        id: 'e1',
        companyId: 'c1',
        employeeCode: 'EMP-1',
        firstName: 'A',
        lastName: 'B',
        displayName: 'A B',
        email: 'a@example.com',
        mobile: null,
        departmentId: 'd1',
        designationId: 'g1',
        reportingManagerUserId: null,
        employmentType: 'full_time',
        joiningDate: null,
        relievingDate: null,
        status: EmployeeStatus.Active,
        primaryWorkLocation: null,
        profilePhoto: null,
        emergencyContact: null,
        userId: 'u1',
      },
      roles: undefined,
      projects: { globalAccess: false, projectIds: ['p1', 'p2'] },
      sites: { siteScoped: true, siteIds: ['s1'] },
      overrides: [
        {
          permission: 'running_bill.verify',
          effect: 'deny',
          projectId: undefined,
          siteId: undefined,
        },
      ],
    } as unknown as EmployeeAccessSummary;

    const normalised = normaliseAccessSummary(summary);
    expect(normalised.roles).toEqual([]);
    expect(normalised.projects).toEqual(['p1', 'p2']);
    expect(normalised.sites).toEqual(['s1']);
    expect(normalised.overrides[0]).toEqual({
      permission: 'running_bill.verify',
      effect: 'deny',
      projectId: null,
      siteId: null,
    });
  });
});
