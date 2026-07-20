/**
 * Explicit system / background-job execution context.
 * Prefer this over impersonating a Super Admin user.
 */
export type SystemExecutionContext = {
  readonly type: 'system';
  readonly jobName: string;
  readonly companyId?: string | null;
  readonly projectId?: string | null;
  readonly reason: string;
  readonly requestId?: string | null;
};

export function createSystemContext(input: {
  jobName: string;
  reason: string;
  companyId?: string | null;
  projectId?: string | null;
  requestId?: string | null;
}): SystemExecutionContext {
  return {
    type: 'system',
    jobName: input.jobName,
    reason: input.reason,
    companyId: input.companyId ?? null,
    projectId: input.projectId ?? null,
    requestId: input.requestId ?? null,
  };
}

export function isSystemExecutionContext(
  value: unknown,
): value is SystemExecutionContext {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as SystemExecutionContext).type === 'system' &&
    typeof (value as SystemExecutionContext).jobName === 'string'
  );
}
