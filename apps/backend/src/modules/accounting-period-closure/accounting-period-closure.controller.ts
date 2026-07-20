import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { AccountingPeriodClosureService } from './accounting-period-closure.service';
import {
  ApprovePeriodReopenDto,
  CreateAccountingPeriodDto,
  ListAccountingPeriodsQueryDto,
  RejectPeriodReopenDto,
  RequestPeriodReopenDto,
} from './dto/accounting-period-closure.dto';

@ApiTags('Accounting Period Closure')
@ApiBearerAuth()
@Controller('accounting-period-closure')
export class AccountingPeriodClosureController {
  constructor(private readonly service: AccountingPeriodClosureService) {}

  @Post('periods')
  @RequirePermissions('period_closure.manage')
  @ApiOperation({ summary: 'Create a monthly or financial-year accounting period' })
  create(
    @Body() dto: CreateAccountingPeriodDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.createPeriod(dto, actor.id);
  }

  @Get('periods')
  @RequirePermissions('period_closure.view')
  @ApiOperation({ summary: 'List accounting periods' })
  list(@Query() query: ListAccountingPeriodsQueryDto) {
    return this.service.listPeriods(query);
  }

  @Get('periods/:periodId')
  @RequirePermissions('period_closure.view')
  @ApiOperation({ summary: 'Get accounting period with checklist' })
  get(@Param('periodId') periodId: string) {
    return this.service.getPeriod(periodId);
  }

  @Get('periods/:periodId/checklist')
  @RequirePermissions('period_closure.view')
  @ApiOperation({ summary: 'Get closing checklist' })
  checklist(@Param('periodId') periodId: string) {
    return this.service.getChecklist(periodId);
  }

  @Post('periods/:periodId/validate')
  @RequirePermissions('period_closure.manage')
  @ApiOperation({ summary: 'Run pre-close validations and refresh checklist' })
  validate(
    @Param('periodId') periodId: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.runPreCloseValidation(periodId, actor.id);
  }

  @Post('periods/:periodId/lock')
  @RequirePermissions('period_closure.manage')
  @ApiOperation({ summary: 'Lock period after successful pre-close validation' })
  lock(
    @Param('periodId') periodId: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.lockPeriod(periodId, actor.id);
  }

  @Post('periods/:periodId/close')
  @RequirePermissions('period_closure.manage')
  @ApiOperation({ summary: 'Formally close a locked period' })
  close(
    @Param('periodId') periodId: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.closePeriod(periodId, actor.id);
  }

  @Post('periods/:periodId/reopen-requests')
  @RequirePermissions('period_closure.reopen')
  @ApiOperation({ summary: 'Request reopen of a locked/closed period' })
  requestReopen(
    @Param('periodId') periodId: string,
    @Body() dto: RequestPeriodReopenDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.requestReopen(periodId, dto, actor.id);
  }

  @Get('periods/:periodId/reopen-requests')
  @RequirePermissions('period_closure.view')
  @ApiOperation({ summary: 'List reopen requests for a period' })
  listReopenRequests(@Param('periodId') periodId: string) {
    return this.service.listReopenRequests(periodId);
  }

  @Post('periods/:periodId/reopen-requests/:requestId/approve')
  @RequirePermissions('period_closure.approve_reopen')
  @ApiOperation({ summary: 'Approve period reopen (approver ≠ requester)' })
  approveReopen(
    @Param('periodId') periodId: string,
    @Param('requestId') requestId: string,
    @Body() dto: ApprovePeriodReopenDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.approveReopen(periodId, requestId, dto, actor.id);
  }

  @Post('periods/:periodId/reopen-requests/:requestId/reject')
  @RequirePermissions('period_closure.approve_reopen')
  @ApiOperation({ summary: 'Reject period reopen request' })
  rejectReopen(
    @Param('periodId') periodId: string,
    @Param('requestId') requestId: string,
    @Body() dto: RejectPeriodReopenDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.rejectReopen(periodId, requestId, dto, actor.id);
  }
}
