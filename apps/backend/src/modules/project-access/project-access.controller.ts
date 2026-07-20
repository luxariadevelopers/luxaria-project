import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import type { AuthUser } from '../auth/types/auth-user.type';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { SkipPermissions } from '../rbac/decorators/skip-permissions.decorator';
import { RequireProjectAccess } from './decorators/require-project-access.decorator';
import { CreateProjectAssignmentDto } from './dto/create-project-assignment.dto';
import { ListProjectAssignmentsQueryDto } from './dto/list-project-assignments-query.dto';
import { UpdateProjectAssignmentDto } from './dto/update-project-assignment.dto';
import { ProjectAccessService } from './project-access.service';

@ApiTags('Project Access')
@ApiBearerAuth()
@Controller('project-access')
export class ProjectAccessController {
  constructor(private readonly projectAccessService: ProjectAccessService) {}

  @Get('me')
  @SkipPermissions()
  @ApiOperation({ summary: 'Current user accessible projects / global flag' })
  async myAccess(@CurrentUser() user: AuthUser) {
    const access = await this.projectAccessService.listAccessibleProjectIds(user.id);
    return createSuccessResponse(access, 'Accessible projects fetched successfully');
  }

  @Get('assignments')
  @RequirePermissions('project_access.view')
  @ApiOperation({ summary: 'List project assignments' })
  list(@Query() query: ListProjectAssignmentsQueryDto) {
    return this.projectAccessService.list(query);
  }

  @Get('assignments/:id')
  @RequirePermissions('project_access.view')
  @ApiOperation({ summary: 'Get project assignment' })
  getById(@Param('id') id: string) {
    return this.projectAccessService.getById(id);
  }

  @Post('assignments')
  @RequirePermissions('project_access.assign')
  @ApiOperation({
    summary: 'Create project assignment (selected projects or globalAccess)',
  })
  create(@Body() dto: CreateProjectAssignmentDto, @CurrentUser() actor: AuthUser) {
    return this.projectAccessService.create(dto, actor.id);
  }

  @Patch('assignments/:id')
  @RequirePermissions('project_access.manage')
  @ApiOperation({ summary: 'Update assignment dates / status / notes' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProjectAssignmentDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.projectAccessService.update(id, dto, actor.id);
  }

  @Post('assignments/:id/activate')
  @RequirePermissions('project_access.manage')
  @ApiOperation({ summary: 'Activate assignment' })
  activate(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.projectAccessService.activate(id, actor.id);
  }

  @Post('assignments/:id/deactivate')
  @RequirePermissions('project_access.manage')
  @ApiOperation({ summary: 'Deactivate assignment' })
  deactivate(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.projectAccessService.deactivate(id, actor.id);
  }

  @Get('unauthorized-attempts')
  @RequirePermissions('project_access.audit_view')
  @ApiOperation({ summary: 'Audit log of denied project access attempts' })
  listUnauthorized(
    @Query() query: PaginationQueryDto & { userId?: string; projectId?: string },
  ) {
    return this.projectAccessService.listUnauthorizedAttempts(query);
  }

  /**
   * Reference endpoints demonstrating create/read/update/approve project checks.
   * Real project modules should apply the same @RequireProjectAccess decorator.
   */
  @Get('check/:projectId')
  @SkipPermissions()
  @RequireProjectAccess({ source: 'params', key: 'projectId', operation: 'read' })
  @ApiOperation({ summary: 'Validate read access for a project (self-check)' })
  checkRead(@Param('projectId') projectId: string, @CurrentUser() user: AuthUser) {
    return createSuccessResponse(
      { userId: user.id, projectId, operation: 'read', allowed: true },
      'Project read access granted',
    );
  }

  @Post('check/:projectId/create')
  @SkipPermissions()
  @RequireProjectAccess({ source: 'params', key: 'projectId', operation: 'create' })
  @ApiOperation({ summary: 'Validate create-scoped project access' })
  checkCreate(@Param('projectId') projectId: string) {
    return createSuccessResponse({ projectId, operation: 'create', allowed: true });
  }

  @Post('check/:projectId/update')
  @SkipPermissions()
  @RequireProjectAccess({ source: 'params', key: 'projectId', operation: 'update' })
  @ApiOperation({ summary: 'Validate update-scoped project access' })
  checkUpdate(@Param('projectId') projectId: string) {
    return createSuccessResponse({ projectId, operation: 'update', allowed: true });
  }

  @Post('check/:projectId/approve')
  @SkipPermissions()
  @RequireProjectAccess({ source: 'params', key: 'projectId', operation: 'approve' })
  @ApiOperation({ summary: 'Validate approval-scoped project access' })
  checkApprove(@Param('projectId') projectId: string) {
    return createSuccessResponse({ projectId, operation: 'approve', allowed: true });
  }
}
