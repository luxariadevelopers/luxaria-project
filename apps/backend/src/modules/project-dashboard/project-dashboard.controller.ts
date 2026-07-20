import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequireProjectAccess } from '../project-access/decorators/require-project-access.decorator';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { ProjectDashboardQueryDto } from './dto/project-dashboard-query.dto';
import { ProjectDashboardService } from './project-dashboard.service';

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
  ) {
    return this.projectDashboardService.getDashboard(projectId, query);
  }
}
