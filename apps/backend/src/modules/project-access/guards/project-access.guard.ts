import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';
import type { AppConfig } from '../../../config/configuration';
import type { AuthUser } from '../../auth/types/auth-user.type';
import { PermissionsService } from '../../rbac/permissions.service';
import { SiteAccessService } from '../../sites/site-access.service';
import {
  REQUIRE_PROJECT_ACCESS_KEY,
  type RequireProjectAccessOptions,
} from '../decorators/require-project-access.decorator';
import {
  DEFAULT_PROJECT_ID_LOCATORS,
  ROUTE_SCOPE_KEY,
  type ProjectIdLocator,
  type RouteScopeMetadata,
} from '../decorators/route-scope.decorator';
import { InvestorParticipationService } from '../investor-participation.service';
import { ProjectAccessService } from '../project-access.service';
import { ResourceOwnershipService } from '../resource-ownership.service';

export type ProjectAccessRequestContext = {
  projectId?: string | null;
  siteId?: string | null;
  authorisedProjectIds?: string[];
  globalProjectAccess?: boolean;
  resourceType?: string | null;
  resourceId?: string | null;
  scopeKind?: string;
};

type RequestWithUser = {
  user?: AuthUser;
  params?: Record<string, string>;
  body?: Record<string, unknown>;
  query?: Record<string, unknown>;
  method?: string;
  originalUrl?: string;
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
  projectAccess?: ProjectAccessRequestContext;
};

@Injectable()
export class ProjectAccessGuard implements CanActivate {
  private readonly logger = new Logger(ProjectAccessGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly projectAccessService: ProjectAccessService,
    private readonly resourceOwnershipService: ResourceOwnershipService,
    private readonly investorParticipationService: InvestorParticipationService,
    private readonly permissionsService: PermissionsService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => SiteAccessService))
    private readonly siteAccessService: SiteAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const scope = this.resolveScopeMetadata(context);
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const enforcement = this.getEnforcementMode();

    if (!scope) {
      return this.handleMissingScope(request, enforcement);
    }

    if (
      scope.kind === 'global' ||
      scope.kind === 'system' ||
      scope.kind === 'webhook' ||
      scope.kind === 'public'
    ) {
      request.projectAccess = { scopeKind: scope.kind };
      return true;
    }

    const user = request.user;
    if (!user?.id) {
      throw new BadRequestException(
        'Authenticated user required for project access',
      );
    }

    const audit = this.buildAudit(request);

    if (scope.kind === 'investor') {
      return this.enforceInvestorScope(request, user, scope, audit, enforcement);
    }

    if (scope.kind === 'project') {
      return this.enforceProjectScope(request, user, scope, audit, enforcement);
    }

    return this.handleMissingScope(request, enforcement);
  }

  private resolveScopeMetadata(
    context: ExecutionContext,
  ): RouteScopeMetadata | null {
    const routeScope = this.reflector.getAllAndOverride<RouteScopeMetadata>(
      ROUTE_SCOPE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (routeScope) {
      return routeScope;
    }

    // Backward compatibility: @RequireProjectAccess → project scope
    const legacy = this.reflector.getAllAndOverride<RequireProjectAccessOptions>(
      REQUIRE_PROJECT_ACCESS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!legacy) {
      return null;
    }

    return {
      kind: 'project',
      operation: legacy.operation ?? 'read',
      mode: 'single',
      required: legacy.required ?? true,
      projectIdKeys: [
        {
          source: legacy.source ?? 'params',
          key: legacy.key ?? 'projectId',
        },
      ],
    };
  }

  private async enforceProjectScope(
    request: RequestWithUser,
    user: AuthUser,
    scope: RouteScopeMetadata,
    audit: ReturnType<ProjectAccessGuard['buildAudit']>,
    enforcement: 'enforce' | 'observe',
  ): Promise<boolean> {
    if (scope.elevatedPermission) {
      const access = await this.permissionsService.resolveUserAccess(user.id);
      if (
        !access.bypassPermissions &&
        !access.permissions.includes(scope.elevatedPermission)
      ) {
        await this.deny(
          user.id,
          null,
          scope.operation ?? 'read',
          'Elevated cross-project permission required',
          audit,
          enforcement,
        );
        return enforcement !== 'enforce';
      }
    }

    const resolved = await this.collectProjectIds(request, scope);
    if (resolved.mismatch) {
      await this.deny(
        user.id,
        resolved.ids[0] ?? null,
        scope.operation ?? 'read',
        'Project identifier mismatch across request sources',
        audit,
        enforcement,
        resolved.resourceType,
        resolved.resourceId,
      );
      return enforcement !== 'enforce';
    }

    const mode = scope.mode ?? 'single';

    if (mode === 'filter') {
      const access = await this.projectAccessService.listAccessibleProjectIds(
        user.id,
      );
      if (!access.globalAccess && access.projectIds.length === 0) {
        await this.deny(
          user.id,
          resolved.ids[0] ?? null,
          scope.operation ?? 'read',
          'No active project assignment',
          audit,
          enforcement,
        );
        return enforcement !== 'enforce';
      }

      if (resolved.ids.length === 1) {
        await this.projectAccessService.assertCanAccessProject({
          actor: user.id,
          projectId: resolved.ids[0]!,
          action: scope.operation ?? 'read',
          resourceType: resolved.resourceType,
          resourceId: resolved.resourceId,
          companyId: user.companyId,
          audit,
        });
      }

      request.projectAccess = {
        scopeKind: 'project',
        projectId: resolved.ids[0] ?? null,
        authorisedProjectIds: access.projectIds,
        globalProjectAccess: access.globalAccess,
        resourceType: resolved.resourceType,
        resourceId: resolved.resourceId,
      };
      return true;
    }

    // single mode
    if (resolved.ids.length === 0) {
      if (scope.required === false) {
        request.projectAccess = { scopeKind: 'project' };
        return true;
      }
      if (enforcement === 'observe') {
        this.logger.warn(
          `PROJECT_ACCESS_OBSERVE missing project id path=${audit.path}`,
        );
        return true;
      }
      throw new BadRequestException('Missing project context');
    }

    const projectId = resolved.ids[0]!;
    await this.projectAccessService.assertCanAccessProject({
      actor: user.id,
      projectId,
      action: scope.operation ?? 'read',
      resourceType: resolved.resourceType,
      resourceId: resolved.resourceId,
      companyId: user.companyId,
      audit,
    });

    const siteId = this.readSiteId(request);
    if (siteId) {
      try {
        await this.siteAccessService.assertSiteAccessIfScoped({
          userId: user.id,
          projectId,
          siteId,
        });
      } catch (error) {
        if (error instanceof ForbiddenException) {
          await this.deny(
            user.id,
            projectId,
            scope.operation ?? 'read',
            'Site access denied',
            audit,
            enforcement,
            resolved.resourceType,
            resolved.resourceId,
          );
          return enforcement !== 'enforce';
        }
        throw error;
      }
    }

    request.projectAccess = {
      scopeKind: 'project',
      projectId,
      siteId: siteId ?? null,
      resourceType: resolved.resourceType,
      resourceId: resolved.resourceId,
    };
    return true;
  }

  private async enforceInvestorScope(
    request: RequestWithUser,
    user: AuthUser,
    scope: RouteScopeMetadata,
    audit: ReturnType<ProjectAccessGuard['buildAudit']>,
    enforcement: 'enforce' | 'observe',
  ): Promise<boolean> {
    const resolved = await this.collectProjectIds(request, scope);
    if (resolved.mismatch) {
      await this.deny(
        user.id,
        resolved.ids[0] ?? null,
        scope.operation ?? 'read',
        'Project identifier mismatch across request sources',
        audit,
        enforcement,
      );
      return enforcement !== 'enforce';
    }

    const mode = scope.mode ?? 'single';

    if (mode === 'filter' && resolved.ids.length === 0) {
      const projectIds =
        await this.investorParticipationService.listAuthorisedProjectIds(
          user.id,
        );
      if (projectIds.length === 0) {
        const linked =
          await this.investorParticipationService.resolveLinkedInvestorId(
            user.id,
          );
        if (!linked) {
          await this.deny(
            user.id,
            null,
            scope.operation ?? 'read',
            'No investor profile linked',
            audit,
            enforcement,
          );
          return enforcement !== 'enforce';
        }
      }
      request.projectAccess = {
        scopeKind: 'investor',
        authorisedProjectIds: projectIds,
      };
      return true;
    }

    if (resolved.ids.length === 0) {
      if (scope.required === false) {
        request.projectAccess = { scopeKind: 'investor' };
        return true;
      }
      if (enforcement === 'observe') {
        this.logger.warn(
          `PROJECT_ACCESS_OBSERVE missing investor project path=${audit.path}`,
        );
        return true;
      }
      throw new BadRequestException('Missing project context');
    }

    const projectId = resolved.ids[0]!;
    try {
      await this.investorParticipationService.assertCanAccessInvestorProject(
        user.id,
        projectId,
      );
    } catch (error) {
      // Cross-company is never soft-allowed, even in observe mode.
      const companyDecision =
        await this.projectAccessService.assertProjectCompanyBoundary(
          user.id,
          projectId,
          user.companyId,
        );
      if (!companyDecision.allowed) {
        throw new ForbiddenException('Access denied');
      }
      if (enforcement === 'observe') {
        this.logger.warn(
          `PROJECT_ACCESS_OBSERVE investor deny project=${projectId} path=${audit.path}`,
        );
        return true;
      }
      throw error;
    }

    request.projectAccess = {
      scopeKind: 'investor',
      projectId,
    };
    return true;
  }

  private async collectProjectIds(
    request: RequestWithUser,
    scope: RouteScopeMetadata,
  ): Promise<{
    ids: string[];
    mismatch: boolean;
    resourceType: string | null;
    resourceId: string | null;
  }> {
    // Always cross-check default locators (incl. X-Project-Id) even when a
    // route narrows projectIdKeys — mismatches must still be denied.
    const locators: ProjectIdLocator[] = this.mergeProjectIdLocators(
      scope.projectIdKeys,
    );
    const found: string[] = [];

    for (const locator of locators) {
      const value = this.readLocator(request, locator);
      if (value) {
        found.push(value);
      }
    }

    let resourceType: string | null = null;
    let resourceId: string | null = null;

    if (scope.resource?.resourceType) {
      resourceType = scope.resource.resourceType;
      const idParam = scope.resource.idParam ?? 'id';
      const idSource = scope.resource.idSource ?? 'params';
      const rawId = this.readLocator(request, {
        source: idSource === 'params' ? 'params' : idSource,
        key: idParam,
      });
      if (rawId) {
        resourceId = rawId;
        const ownership =
          await this.resourceOwnershipService.resolveOwnership(
            resourceType,
            rawId,
          );
        if (ownership.found && ownership.projectId) {
          found.push(ownership.projectId);
        }
      }
    }

    const unique = [...new Set(found)];
    return {
      ids: unique,
      mismatch: unique.length > 1,
      resourceType,
      resourceId,
    };
  }

  private mergeProjectIdLocators(
    routeKeys?: ProjectIdLocator[] | null,
  ): ProjectIdLocator[] {
    const merged = [...(routeKeys ?? []), ...DEFAULT_PROJECT_ID_LOCATORS];
    const seen = new Set<string>();
    const unique: ProjectIdLocator[] = [];
    for (const locator of merged) {
      const key = `${locator.source}:${locator.key.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(locator);
    }
    return unique;
  }

  private readSiteId(request: RequestWithUser): string | null {
    const locators: ProjectIdLocator[] = [
      { source: 'params', key: 'siteId' },
      { source: 'query', key: 'siteId' },
      { source: 'body', key: 'siteId' },
    ];
    for (const locator of locators) {
      const value = this.readLocator(request, locator);
      if (value) return value;
    }
    return null;
  }

  private readLocator(
    request: RequestWithUser,
    locator: ProjectIdLocator,
  ): string | null {
    if (locator.source === 'header') {
      const headers = request.headers ?? {};
      const wanted = locator.key.toLowerCase();
      for (const [key, value] of Object.entries(headers)) {
        if (key.toLowerCase() !== wanted) continue;
        const raw = Array.isArray(value) ? value[0] : value;
        if (typeof raw === 'string' && raw.trim()) {
          return raw.trim();
        }
      }
      return null;
    }

    const container =
      locator.source === 'body'
        ? request.body
        : locator.source === 'query'
          ? request.query
          : request.params;
    const value = container?.[locator.key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
    return null;
  }

  private async handleMissingScope(
    request: RequestWithUser,
    enforcement: 'enforce' | 'observe',
  ): Promise<boolean> {
    const path = request.originalUrl ?? 'unknown';
    const userId = request.user?.id;

    if (enforcement === 'observe') {
      this.logger.warn(
        `PROJECT_ACCESS_OBSERVE unclassified route user=${userId ?? 'anonymous'} path=${path}`,
      );
      if (userId) {
        await this.projectAccessService.recordUnauthorizedAttempt({
          userId,
          projectId: null,
          operation: 'read',
          reason: 'Unclassified authenticated route (observe mode)',
          path,
          method: request.method ?? null,
          requestId: this.headerValue(request, 'x-request-id'),
          ip: request.ip ?? null,
        });
      }
      return true;
    }

    if (userId) {
      await this.projectAccessService.recordUnauthorizedAttempt({
        userId,
        projectId: null,
        operation: 'read',
        reason: 'Unclassified authenticated route (fail closed)',
        path,
        method: request.method ?? null,
        requestId: this.headerValue(request, 'x-request-id'),
        ip: request.ip ?? null,
      });
    }

    throw new ForbiddenException('Access denied');
  }

  private async deny(
    userId: string,
    projectId: string | null,
    operation: string,
    reason: string,
    audit: ReturnType<ProjectAccessGuard['buildAudit']>,
    enforcement: 'enforce' | 'observe',
    resourceType?: string | null,
    resourceId?: string | null,
  ): Promise<void> {
    const detail = [
      reason,
      resourceType ? `resourceType=${resourceType}` : null,
      resourceId ? `resourceId=${resourceId}` : null,
    ]
      .filter(Boolean)
      .join('; ');

    await this.projectAccessService.recordUnauthorizedAttempt({
      userId,
      projectId,
      operation,
      reason: detail,
      ...audit,
    });

    // Observe may soft-allow missing metadata / assignment gaps in staging,
    // but must never permit cross-company access.
    if (projectId) {
      const companyDecision =
        await this.projectAccessService.assertProjectCompanyBoundary(
          userId,
          projectId,
        );
      if (!companyDecision.allowed) {
        this.logger.warn(
          `PROJECT_ACCESS cross-company hard-deny user=${userId} project=${projectId} mode=${enforcement}`,
        );
        throw new ForbiddenException('Access denied');
      }
    }

    if (enforcement === 'observe') {
      this.logger.warn(
        `PROJECT_ACCESS_OBSERVE deny user=${userId} project=${projectId} reason=${reason}`,
      );
      return;
    }

    throw new ForbiddenException('Access denied');
  }

  private getEnforcementMode(): 'enforce' | 'observe' {
    const configured = this.configService.get<AppConfig['projectAccessEnforcement']>(
      'projectAccessEnforcement',
    );
    if (configured === 'observe') {
      return 'observe';
    }
    return 'enforce';
  }

  private buildAudit(request: RequestWithUser) {
    return {
      path: request.originalUrl ?? null,
      method: request.method ?? null,
      requestId: this.headerValue(request, 'x-request-id'),
      ip: request.ip ?? null,
    };
  }

  private headerValue(
    request: RequestWithUser,
    name: string,
  ): string | null {
    const value = request.headers?.[name] ?? request.headers?.[name.toLowerCase()];
    if (Array.isArray(value)) {
      return value[0] ?? null;
    }
    return typeof value === 'string' ? value : null;
  }
}
