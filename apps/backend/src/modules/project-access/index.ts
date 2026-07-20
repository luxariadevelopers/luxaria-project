export { RequireProjectAccess } from './decorators/require-project-access.decorator';
export {
  GlobalScope,
  InvestorScoped,
  ProjectScoped,
  SystemInternal,
  WebhookRoute,
  ROUTE_SCOPE_KEY,
  DEFAULT_PROJECT_ID_LOCATORS,
} from './decorators/route-scope.decorator';
export type {
  RouteScopeKind,
  RouteScopeMetadata,
  ProjectIdLocator,
  ResourceOwnershipLocator,
} from './decorators/route-scope.decorator';
export { ProjectAccessGuard } from './guards/project-access.guard';
export { ProjectAccessModule } from './project-access.module';
export { ProjectAccessService } from './project-access.service';
export type {
  AssertCanAccessProjectInput,
  ProjectAccessDecision,
  AuditAccessContext,
} from './project-access.service';
export { ResourceOwnershipService } from './resource-ownership.service';
export { InvestorParticipationService } from './investor-participation.service';
export { ProjectScopedDataHelper } from './project-scoped-data.helper';
export { ActorContextService } from './actor-context.service';
export type {
  AuthenticatedActorContext,
  ProjectExecutionContext,
  ActorType,
} from './authenticated-actor.context';
export {
  isAuthenticatedActorContext,
  requireActorContext,
} from './authenticated-actor.context';
export {
  createSystemContext,
  isSystemExecutionContext,
} from './system-execution-context';
export type { SystemExecutionContext } from './system-execution-context';
export {
  ProjectAccessStatus,
  ProjectAssignment,
} from './schemas/project-assignment.schema';
export { RESOURCE_OWNERSHIP_REGISTRY } from './resource-ownership.registry';
