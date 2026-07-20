import { applyDecorators, SetMetadata } from '@nestjs/common';
import type { ProjectAccessOperation } from '../schemas/unauthorized-project-access.schema';
import {
  ProjectScoped,
  type ProjectIdSource,
} from './route-scope.decorator';

export const REQUIRE_PROJECT_ACCESS_KEY = 'requireProjectAccess';

export type RequireProjectAccessOptions = {
  /** Request location of the project id */
  source?: ProjectIdSource;
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
 * Legacy decorator — also applies @ProjectScoped for R-003 default-deny.
 * Prefer @ProjectScoped directly on new routes.
 */
export const RequireProjectAccess = (
  options: RequireProjectAccessOptions = {},
) => {
  const source = options.source ?? 'params';
  const key = options.key ?? 'projectId';
  const operation = options.operation ?? 'read';
  const required = options.required ?? true;

  return applyDecorators(
    SetMetadata(REQUIRE_PROJECT_ACCESS_KEY, {
      source,
      key,
      operation,
      required,
    } satisfies Required<RequireProjectAccessOptions>),
    ProjectScoped({
      operation,
      required,
      mode: 'single',
      projectIdKeys: [{ source, key }],
    }),
  );
};