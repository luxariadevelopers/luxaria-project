import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import type { AuthUser } from '../auth/types/auth-user.type';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { ApproveUnlockDto } from './dto/approve-unlock.dto';
import { CreateFinancialYearDto } from './dto/create-financial-year.dto';
import { ListFinancialYearsQueryDto } from './dto/list-financial-years-query.dto';
import { RejectUnlockDto } from './dto/reject-unlock.dto';
import { RequestUnlockDto } from './dto/request-unlock.dto';
import { ValidateTransactionDateDto } from './dto/validate-transaction-date.dto';
import { FinancialYearService } from './financial-year.service';
import { UnlockRequestStatus } from './schemas/financial-year-unlock-request.schema';

@ApiTags('Financial Year')
@ApiBearerAuth()
@Controller('financial-years')
export class FinancialYearController {
  constructor(private readonly financialYearService: FinancialYearService) {}

  @Post()
  @RequirePermissions('financial_year.manage')
  @ApiOperation({ summary: 'Create financial year (no overlap allowed)' })
  create(@Body() dto: CreateFinancialYearDto, @CurrentUser() actor: AuthUser) {
    return this.financialYearService.create(dto, actor.id);
  }

  @Get()
  @RequirePermissions('financial_year.view')
  @ApiOperation({ summary: 'List financial years' })
  list(@Query() query: ListFinancialYearsQueryDto) {
    return this.financialYearService.list(query);
  }

  @Get('current')
  @RequirePermissions('financial_year.view')
  @ApiOperation({ summary: 'Get current financial year' })
  getCurrent(@Query('companyId') companyId?: string) {
    return this.financialYearService.getCurrent(companyId);
  }

  @Post('validate-date')
  @RequirePermissions('financial_year.view')
  @ApiOperation({
    summary: 'Validate a transaction date against financial years (locked years reject postings)',
  })
  validateDate(@Body() dto: ValidateTransactionDateDto) {
    return this.financialYearService.validateTransactionDate(dto);
  }

  @Get(':id')
  @RequirePermissions('financial_year.view')
  @ApiOperation({ summary: 'Get financial year by id' })
  getById(@Param('id') id: string) {
    return this.financialYearService.getById(id);
  }

  @Post(':id/set-current')
  @RequirePermissions('financial_year.manage')
  @ApiOperation({ summary: 'Set as the only current financial year' })
  setCurrent(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.financialYearService.setCurrent(id, actor.id);
  }

  @Post(':id/lock')
  @RequirePermissions('financial_year.manage')
  @ApiOperation({ summary: 'Lock financial year (rejects accounting postings)' })
  lock(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.financialYearService.lock(id, actor.id);
  }

  @Post(':id/unlock-requests')
  @RequirePermissions('financial_year.manage')
  @ApiOperation({ summary: 'Request unlock with a reason (requires later approval)' })
  requestUnlock(
    @Param('id') id: string,
    @Body() dto: RequestUnlockDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.financialYearService.requestUnlock(id, dto, actor.id);
  }

  @Get(':id/unlock-requests')
  @RequirePermissions('financial_year.view')
  @ApiOperation({ summary: 'List unlock requests for a financial year' })
  listUnlockRequests(
    @Param('id') id: string,
    @Query() query: PaginationQueryDto & { status?: UnlockRequestStatus },
  ) {
    return this.financialYearService.listUnlockRequests(id, query);
  }

  @Post(':id/unlock-requests/:requestId/approve')
  @RequirePermissions('financial_year.unlock')
  @ApiOperation({
    summary: 'Approve unlock (special permission; approver must differ from requester)',
  })
  approveUnlock(
    @Param('id') id: string,
    @Param('requestId') requestId: string,
    @Body() dto: ApproveUnlockDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.financialYearService.approveUnlock(id, requestId, dto, actor.id);
  }

  @Post(':id/unlock-requests/:requestId/reject')
  @RequirePermissions('financial_year.unlock')
  @ApiOperation({ summary: 'Reject unlock request' })
  rejectUnlock(
    @Param('id') id: string,
    @Param('requestId') requestId: string,
    @Body() dto: RejectUnlockDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.financialYearService.rejectUnlock(id, requestId, dto, actor.id);
  }
}
