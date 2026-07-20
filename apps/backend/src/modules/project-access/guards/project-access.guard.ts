import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';
import type { AuthUser } from '../../auth/types/auth-user.type';
import {
  REQUIRE_PROJECT_ACCESS_KEY,
  type RequireProjectAccessOptions,
} from '../decorators/require-project-access.decorator';
import { ProjectAccessService } from '../project-access.service';

type RequestWithUser = {
  user?: AuthUser;
  params?: Record<string, string>;
  body?: Record<string, unknown>;
  query?: Record<string, unknown>;
  method?: string;
  originalUrl?: string;
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
};

@Injectable()
export class ProjectAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly projectAccessService: ProjectAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const options = this.reflector.getAllAndOverride<RequireProjectAccessOptions>(
      REQUIRE_PROJECT_ACCESS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!options) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;
    if (!user?.id) {
      throw new BadRequestException('Authenticated user required for project access');
    }

    const projectId = this.extractProjectId(request, options);
    if (!projectId) {
      if (options.required === false) {
        return true;
      }
      throw new BadRequestException(
        `Missing project id (${options.source ?? 'params'}.${options.key ?? 'projectId'})`,
      );
    }

    const requestIdHeader = request.headers?.['x-request-id'];
    const requestId = Array.isArray(requestIdHeader)
      ? requestIdHeader[0]
      : requestIdHeader;

    await this.projectAccessService.assertCanAccessProject(
      user.id,
      projectId,
      options.operation ?? 'read',
      {
        path: request.originalUrl ?? null,
        method: request.method ?? null,
        requestId: requestId ?? null,
        ip: request.ip ?? null,
      },
    );

    return true;
  }

  private extractProjectId(
    request: RequestWithUser,
    options: RequireProjectAccessOptions,
  ): string | null {
    const key = options.key ?? 'projectId';
    const source = options.source ?? 'params';
    const container =
      source === 'body' ? request.body : source === 'query' ? request.query : request.params;
    const value = container?.[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
    return null;
  }
}
