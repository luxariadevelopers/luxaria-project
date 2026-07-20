import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';
import { RequireProjectAccess } from '../project-access/decorators/require-project-access.decorator';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { ProjectDashboardQueryDto } from './dto/project-dashboard-query.dto';
import { ProjectDashboardService } from './project-dashboard.service';
import { ProjectScoped } from '../project-access/decorators/route-scope.decorator';

@ProjectScoped({
  mode: 'filter',
  operation: 'read',
})
@ApiTags('Project Dashboard')
@ApiBearerAuth()
@Controller('projects/:projectId/dashboard')
export class ProjectDashboardController {
  constructor(private readonly projectDashboardService: ProjectDashboardService) {}

  @Get()
  @RequirePermissions('dashboard.view')
  @RequireProjectAccess({ source: 'params', key: 'projectId', operation: 'read' })
  @ApiOperation({
    summary:
      'Project-level dashboard (stage, completion, costs, funding, ops, alerts)',
  })
  getDashboard(
    @Param('projectId') projectId: string,
    @Query() query: ProjectDashboardQueryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.projectDashboardService.getDashboard(
      projectId,
      query,
      actor.id,
    );
  }
}
