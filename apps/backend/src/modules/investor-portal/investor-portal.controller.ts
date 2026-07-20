import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';
import {
  InvestorScoped,
  ProjectScoped,
} from '../project-access/decorators/route-scope.decorator';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import {
  PublishInvestorReportDto,
  RecordInvestorProfitDto,
  UpdateDistributedProfitDto,
} from './dto/manage-investor-portal.dto';
import { InvestorPortalService } from './investor-portal.service';

@ApiTags('Investor Portal')
@ApiBearerAuth()
@Controller('investor-portal')
export class InvestorPortalController {
  constructor(private readonly investorPortalService: InvestorPortalService) {}

  @Get('me')
  @InvestorScoped({ mode: 'filter', required: false })
  @RequirePermissions('investor_portal.view')
  @ApiOperation({ summary: 'Linked investor profile for the current user' })
  getMe(@CurrentUser() actor: AuthUser) {
    return this.investorPortalService.getMe(actor.id);
  }

  @Get('projects')
  @InvestorScoped({ mode: 'filter', required: false })
  @RequirePermissions('investor_portal.view')
  @ApiOperation({
    summary: 'List projects authorised for the linked investor only',
  })
  listProjects(@CurrentUser() actor: AuthUser) {
    return this.investorPortalService.listProjects(actor.id);
  }

  @Get('projects/:projectId')
  @InvestorScoped({
    mode: 'single',
    operation: 'read',
    projectIdKeys: [{ source: 'params', key: 'projectId' }],
  })
  @RequirePermissions('investor_portal.view')
  @ApiOperation({
    summary:
      'Restricted project investment view (own commitment, progress, budget totals, own docs)',
  })
  getProject(
    @Param('projectId') projectId: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.investorPortalService.getProject(projectId, actor.id);
  }

  @Post('reports')
  @ProjectScoped({ mode: 'single', operation: 'create' })
  @RequirePermissions('investor_portal.manage')
  @ApiOperation({
    summary: 'Publish a project report visible to authorised investors',
  })
  publishReport(
    @Body() dto: PublishInvestorReportDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.investorPortalService.publishReport(dto, actor.id);
  }

  @Post('profit-allocations')
  @ProjectScoped({ mode: 'single', operation: 'create' })
  @RequirePermissions('investor_portal.manage')
  @ApiOperation({
    summary: 'Record approved profit allocation for an outside investor',
  })
  recordProfit(
    @Body() dto: RecordInvestorProfitDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.investorPortalService.recordProfitAllocation(dto, actor.id);
  }

  @Patch('profit-allocations/:id/distributed')
  @ProjectScoped({
    mode: 'single',
    operation: 'update',
    resource: {
      resourceType: 'investor-profit-allocation',
      idParam: 'id',
    },
  })
  @RequirePermissions('investor_portal.manage')
  @ApiOperation({ summary: 'Update cumulative distributed profit amount' })
  updateDistributed(
    @Param('id') id: string,
    @Body() dto: UpdateDistributedProfitDto,
  ) {
    return this.investorPortalService.updateDistributedProfit(id, dto);
  }
}
