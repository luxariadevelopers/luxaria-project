import { BadRequestException } from '@nestjs/common';
import {
  assertCoordinates,
  assertStatusTransition,
  assertValidProjectDates,
  assertValidReraDates,
} from './projects.validation';
import { ProjectStatus } from './schemas/project.schema';

describe('projects.validation', () => {
  it('validates date order', () => {
    expect(() =>
      assertValidProjectDates({
        startDate: new Date('2026-01-01'),
        expectedCompletionDate: new Date('2026-12-31'),
      }),
    ).not.toThrow();

    expect(() =>
      assertValidProjectDates({
        startDate: new Date('2026-12-31'),
        expectedCompletionDate: new Date('2026-01-01'),
      }),
    ).toThrow(BadRequestException);
  });

  it('validates Phase 2 status transitions including Draft/Active/Archived', () => {
    expect(() =>
      assertStatusTransition(ProjectStatus.Draft, ProjectStatus.Planning),
    ).not.toThrow();
    expect(() =>
      assertStatusTransition(ProjectStatus.Draft, ProjectStatus.Approval),
    ).toThrow(BadRequestException);

    expect(() =>
      assertStatusTransition(ProjectStatus.Planning, ProjectStatus.Approval),
    ).not.toThrow();
    expect(() =>
      assertStatusTransition(ProjectStatus.Planning, ProjectStatus.Draft),
    ).not.toThrow();
    expect(() =>
      assertStatusTransition(ProjectStatus.Planning, ProjectStatus.Completed),
    ).toThrow(BadRequestException);

    expect(() =>
      assertStatusTransition(ProjectStatus.Approval, ProjectStatus.Active),
    ).not.toThrow();
    expect(() =>
      assertStatusTransition(
        ProjectStatus.Approval,
        ProjectStatus.PreConstruction,
      ),
    ).not.toThrow();

    expect(() =>
      assertStatusTransition(ProjectStatus.Active, ProjectStatus.OnHold),
    ).not.toThrow();
    expect(() =>
      assertStatusTransition(ProjectStatus.Active, ProjectStatus.Construction),
    ).not.toThrow();

    expect(() =>
      assertStatusTransition(ProjectStatus.OnHold, ProjectStatus.Active),
    ).not.toThrow();
    expect(() =>
      assertStatusTransition(ProjectStatus.OnHold, ProjectStatus.Planning),
    ).not.toThrow();

    expect(() =>
      assertStatusTransition(ProjectStatus.Completed, ProjectStatus.Closed),
    ).not.toThrow();
    expect(() =>
      assertStatusTransition(ProjectStatus.Closed, ProjectStatus.Archived),
    ).not.toThrow();
    expect(() =>
      assertStatusTransition(ProjectStatus.Archived, ProjectStatus.Closed),
    ).not.toThrow();
    expect(() =>
      assertStatusTransition(ProjectStatus.Archived, ProjectStatus.Active),
    ).toThrow(BadRequestException);

    expect(() =>
      assertStatusTransition(ProjectStatus.Cancelled, ProjectStatus.Planning),
    ).toThrow(BadRequestException);
    expect(() =>
      assertStatusTransition(ProjectStatus.Closed, ProjectStatus.Construction),
    ).toThrow(BadRequestException);
  });

  it('validates the RERA registration window', () => {
    expect(() =>
      assertValidReraDates({
        registrationDate: new Date('2026-01-01'),
        validUntil: new Date('2027-01-01'),
      }),
    ).not.toThrow();
    expect(() =>
      assertValidReraDates({
        registrationDate: new Date('2027-01-01'),
        validUntil: new Date('2026-01-01'),
      }),
    ).toThrow(BadRequestException);
  });

  it('requires latitude and longitude together', () => {
    expect(() => assertCoordinates(13.0, 80.0)).not.toThrow();
    expect(() => assertCoordinates(13.0, null)).toThrow(BadRequestException);
    expect(() => assertCoordinates(null, null)).not.toThrow();
  });
});
