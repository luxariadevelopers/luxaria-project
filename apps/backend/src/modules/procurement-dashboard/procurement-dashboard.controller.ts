import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsMongoId, IsOptional } from 'class-validator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';
import { ProjectScoped } from '../project-access/decorators/route-scope.decorator';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { ProcurementDashboardService } from './procurement-dashboard.service';

class ProcurementDashboardQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;
}

@ProjectScoped({
  mode: 'filter',
  operation: 'read',
})
@ApiTags('Procurement Dashboard')
@ApiBearerAuth()
@Controller('procurement/dashboard')
export class ProcurementDashboardController {
  constructor(
    private readonly procurementDashboardService: ProcurementDashboardService,
  ) {}

  @Get()
  @RequirePermissions('dashboard.view', 'purchase.view')
  @ApiOperation({
    summary:
      'Procurement ops counts (pending PR/RFQ/quotations/approvals, open/delayed PO, GRN draft)',
  })
  getDashboard(
    @Query() query: ProcurementDashboardQueryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.procurementDashboardService.getDashboard(
      query.projectId,
      actor.id,
    );
  }
}
