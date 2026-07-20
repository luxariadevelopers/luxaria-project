import type { SystemExecutionContext } from './system-execution-context';

export type ActorType = 'user' | 'investor' | 'system';

/**
 * Canonical authenticated actor / execution context (R-003B).
 * Company membership is resolved server-side — never trusted from the client.
 */
export type AuthenticatedActorContext = {
  readonly actorId: string;
  readonly actorType: ActorType;
  /** Authoritative company/tenant boundary for this actor. */
  readonly companyId: string;
  readonly status: string;
  readonly roleIds: string[];
  readonly permissions: string[];
  readonly bypassPermissions: boolean;
  readonly globalAccess: boolean;
  /** Effective non-global project ids (empty when globalAccess). */
  readonly authorisedProjectIds: string[];
  readonly investorId: string | null;
  readonly systemContext: SystemExecutionContext | null;
};

export type ProjectExecutionContext = {
  readonly actor: AuthenticatedActorContext;
  readonly projectId: string;
  readonly action: string;
  readonly resourceType?: string | null;
  readonly resourceId?: string | null;
};

export function isAuthenticatedActorContext(
  value: unknown,
): value is AuthenticatedActorContext {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as AuthenticatedActorContext).actorId === 'string' &&
    typeof (value as AuthenticatedActorContext).companyId === 'string' &&
    (value as AuthenticatedActorContext).actorType !== 'system'
  );
}

export function requireActorContext(
  value: unknown,
): AuthenticatedActorContext {
  if (!isAuthenticatedActorContext(value)) {
    throw new Error('Missing AuthenticatedActorContext');
  }
  return value;
}
