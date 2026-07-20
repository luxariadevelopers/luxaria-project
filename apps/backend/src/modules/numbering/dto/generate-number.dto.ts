import type { Types } from 'mongoose';
import type { NumberEntityType } from '../numbering.constants';

export type GenerateNumberOptions = {
  /**
   * Explicit year segment (e.g. "2026").
   * When omitted and the entity uses FY numbering, calendar year of `asOf` is used.
   */
  financialYear?: string;

  /** Reference date for resolving the year segment. Defaults to now. */
  asOf?: Date;

  /**
   * When provided and the entity allows project scope, the counter is project-specific.
   * Force with `projectScoped: true`.
   */
  projectId?: Types.ObjectId | string;

  /**
   * Force project-scoped counter when the entity supports it.
   * If true, projectId is required.
   */
  projectScoped?: boolean;
};

export type GeneratedNumber = {
  code: string;
  sequence: number;
  prefix: string;
  financialYear: string | null;
  projectId: string | null;
  scopeKey: string;
  entityType: NumberEntityType;
};
