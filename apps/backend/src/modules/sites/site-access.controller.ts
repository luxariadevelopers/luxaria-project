import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';
import { ActorContextService } from '../project-access/actor-context.service';
import { GlobalScope } from '../project-access/decorators/route-scope.decorator';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import {
  CreateSiteAssignmentDto,
  ListSiteAssignmentsQueryDto,
} from './dto/site-access.dto';
import { SiteAccessService } from './site-access.service';

@GlobalScope()
@ApiTags('Site Access')
@ApiBearerAuth()
@Controller('site-access')
export class SiteAccessController {
  constructor(
    private readonly siteAccessService: SiteAccessService,
    private readonly actorContextService: ActorContextService,
  ) {}

  @Post()
  @RequirePermissions('site_access.assign')
  @ApiOperation({ summary: 'Assign user to a site' })
  create(
    @Body() dto: CreateSiteAssignmentDto,
    @CurrentUser() actor: AuthUser,
  ) {
    if (!actor.companyId) {
      throw new ForbiddenException('Authenticated company context required');
    }
    return this.siteAccessService.createAssignment(
      dto,
      actor.companyId,
      actor.id,
    );
  }

  @Get()
  @RequirePermissions('site_access.view')
  @ApiOperation({ summary: 'List site assignments' })
  list(
    @Query() query: ListSiteAssignmentsQueryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    if (!actor.companyId) {
      throw new ForbiddenException('Authenticated company context required');
    }
    return this.siteAccessService.list(query, actor.companyId);
  }

  @Get('me')
  @RequirePermissions('site_access.view')
  @ApiOperation({ summary: 'List sites authorised for the current actor' })
  async me(
    @Query('projectId') projectId: string | undefined,
    @CurrentUser() actor: AuthUser,
  ) {
    if (!actor.companyId) {
      throw new ForbiddenException('Authenticated company context required');
    }
    const context = await this.actorContextService.resolveForUser(actor.id);
    return this.siteAccessService.listAuthorisedSitesForActor({
      userId: actor.id,
      companyId: actor.companyId,
      projectId,
      globalAccess: context.globalAccess,
      bypassPermissions: context.bypassPermissions,
    });
  }

  @Post(':id/revoke')
  @RequirePermissions('site_access.manage')
  @ApiOperation({ summary: 'Revoke site assignment' })
  revoke(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    if (!actor.companyId) {
      throw new ForbiddenException('Authenticated company context required');
    }
    return this.siteAccessService.revoke(id, actor.companyId, actor.id);
  }

  @Post(':id/activate')
  @RequirePermissions('site_access.manage')
  @ApiOperation({ summary: 'Activate site assignment' })
  activate(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    if (!actor.companyId) {
      throw new ForbiddenException('Authenticated company context required');
    }
    return this.siteAccessService.activate(id, actor.companyId, actor.id);
  }

  @Post(':id/deactivate')
  @RequirePermissions('site_access.manage')
  @ApiOperation({ summary: 'Deactivate site assignment' })
  deactivate(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    if (!actor.companyId) {
      throw new ForbiddenException('Authenticated company context required');
    }
    return this.siteAccessService.deactivate(id, actor.companyId, actor.id);
  }
}
