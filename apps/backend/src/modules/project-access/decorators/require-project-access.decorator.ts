import { SetMetadata } from '@nestjs/common';
import type { ProjectAccessOperation } from '../schemas/unauthorized-project-access.schema';

export const REQUIRE_PROJECT_ACCESS_KEY = 'requireProjectAccess';

export type RequireProjectAccessOptions = {
  /** Request location of the project id */
  source?: 'params' | 'body' | 'query';
  /** Field name containing the project id (default: projectId) */
  key?: string;
  /** Operation recorded in audit + denial message */
  operation?: ProjectAccessOperation;
  /**
   * When false, missing project id skips the check (useful for optional filters).
   * Default true — missing id is denied.
   */
  required?: boolean;
};

/**
 * Enforces project-level access for create / read / update / approve flows.
 * Deny unless the user has an effective assignment (or globalAccess / Super Admin bypass).
 */
export const RequireProjectAccess = (options: RequireProjectAccessOptions = {}) =>
  SetMetadata(REQUIRE_PROJECT_ACCESS_KEY, {
    source: options.source ?? 'params',
    key: options.key ?? 'projectId',
    operation: options.operation ?? 'read',
    required: options.required ?? true,
  } satisfies Required<RequireProjectAccessOptions>);
