import { BadRequestException } from '@nestjs/common';
import { ProjectStatus } from './schemas/project.schema';

const ALLOWED_STATUS_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  [ProjectStatus.Planning]: [
    ProjectStatus.Approval,
    ProjectStatus.OnHold,
    ProjectStatus.Cancelled,
  ],
  [ProjectStatus.Approval]: [
    ProjectStatus.PreConstruction,
    ProjectStatus.Planning,
    ProjectStatus.OnHold,
    ProjectStatus.Cancelled,
  ],
  [ProjectStatus.PreConstruction]: [
    ProjectStatus.Construction,
    ProjectStatus.OnHold,
    ProjectStatus.Cancelled,
  ],
  [ProjectStatus.Construction]: [
    ProjectStatus.OnHold,
    ProjectStatus.Completed,
    ProjectStatus.Cancelled,
  ],
  [ProjectStatus.OnHold]: [
    ProjectStatus.Planning,
    ProjectStatus.Approval,
    ProjectStatus.PreConstruction,
    ProjectStatus.Construction,
    ProjectStatus.Cancelled,
  ],
  [ProjectStatus.Completed]: [ProjectStatus.Closed],
  [ProjectStatus.Closed]: [],
  [ProjectStatus.Cancelled]: [],
};

export function assertValidProjectDates(input: {
  startDate?: Date | null;
  expectedCompletionDate?: Date | null;
  actualCompletionDate?: Date | null;
}): void {
  const { startDate, expectedCompletionDate, actualCompletionDate } = input;

  if (startDate && expectedCompletionDate && expectedCompletionDate < startDate) {
    throw new BadRequestException('expectedCompletionDate must be on or after startDate');
  }

  if (startDate && actualCompletionDate && actualCompletionDate < startDate) {
    throw new BadRequestException('actualCompletionDate must be on or after startDate');
  }
}

export function assertStatusTransition(
  from: ProjectStatus,
  to: ProjectStatus,
): void {
  if (from === to) {
    return;
  }
  const allowed = ALLOWED_STATUS_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new BadRequestException(
      `Invalid status transition from "${from}" to "${to}"`,
    );
  }
}

export function assertCoordinates(
  latitude?: number | null,
  longitude?: number | null,
): void {
  const hasLat = latitude !== undefined && latitude !== null;
  const hasLng = longitude !== undefined && longitude !== null;
  if (hasLat !== hasLng) {
    throw new BadRequestException('latitude and longitude must be provided together');
  }
}
