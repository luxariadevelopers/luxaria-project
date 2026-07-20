import { BadRequestException } from '@nestjs/common';
import {
  assertCoordinates,
  assertStatusTransition,
  assertValidProjectDates,
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

  it('validates status transitions', () => {
    expect(() =>
      assertStatusTransition(ProjectStatus.Planning, ProjectStatus.Approval),
    ).not.toThrow();

    expect(() =>
      assertStatusTransition(ProjectStatus.Planning, ProjectStatus.Completed),
    ).toThrow(BadRequestException);

    expect(() =>
      assertStatusTransition(ProjectStatus.Closed, ProjectStatus.Construction),
    ).toThrow(BadRequestException);
  });

  it('requires latitude and longitude together', () => {
    expect(() => assertCoordinates(13.0, 80.0)).not.toThrow();
    expect(() => assertCoordinates(13.0, null)).toThrow(BadRequestException);
    expect(() => assertCoordinates(null, null)).not.toThrow();
  });
});
