import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import {
  CreateContractorBillDto,
  ListContractorBillsQueryDto,
  PostContractorBillDto,
  RejectContractorBillDto,
  UpdateContractorBillDto,
  WorkflowNoteDto,
} from './dto/contractor-bill.dto';
import { ContractorBillsService } from './contractor-bills.service';
import { ProjectScoped } from '../project-access/decorators/route-scope.decorator';

@ProjectScoped({
  mode: 'filter',
  resource: { resourceType: 'contractor-bill', idParam: 'id' },
  operation: 'read',
})
@ApiTags('Contractor Running Bills')
@ApiBearerAuth()
@Controller('contractor-bills')
export class ContractorBillsController {
  constructor(private readonly billsService: ContractorBillsService) {}

  @Post()
  @RequirePermissions('running_bill.create')
  @ApiOperation({ summary: 'Create contractor running-account bill (draft)' })
  create(
    @Body() dto: CreateContractorBillDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.billsService.create(dto, actor.id);
  }

  @Get()
  @RequirePermissions('running_bill.view')
  @ApiOperation({ summary: 'List contractor running bills' })
  list(
    @Query() query: ListContractorBillsQueryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.billsService.list(query, actor.id);
  }

  @Get(':id')
  @RequirePermissions('running_bill.view')
  @ApiOperation({ summary: 'Get contractor running bill by id' })
  getById(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.billsService.getById(id, actor.id);
  }

  @Patch(':id')
  @RequirePermissions('running_bill.create')
  @ApiOperation({ summary: 'Update draft or rejected running bill' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateContractorBillDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.billsService.update(id, dto, actor.id);
  }

  @Post(':id/submit-claim')
  @RequirePermissions('running_bill.create')
  @ApiOperation({ summary: 'Submit contractor claim (Draft → Claimed)' })
  submitClaim(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.billsService.submitClaim(id, actor.id);
  }

  @Post(':id/engineer-verify')
  @RequirePermissions('running_bill.verify')
  @ApiOperation({
    summary: 'Engineer verification (Claimed → Engineer Verified)',
  })
  engineerVerify(
    @Param('id') id: string,
    @Body() dto: WorkflowNoteDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.billsService.engineerVerify(id, dto, actor.id);
  }

  @Post(':id/pm-certify')
  @RequirePermissions('running_bill.certify')
  @ApiOperation({
    summary: 'Project manager certification (Engineer Verified → PM Certified)',
  })
  pmCertify(
    @Param('id') id: string,
    @Body() dto: WorkflowNoteDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.billsService.pmCertify(id, dto, actor.id);
  }

  @Post(':id/finance-verify')
  @RequirePermissions('running_bill.finance_verify')
  @ApiOperation({
    summary: 'Finance verification (PM Certified → Finance Verified)',
  })
  financeVerify(
    @Param('id') id: string,
    @Body() dto: WorkflowNoteDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.billsService.financeVerify(id, dto, actor.id);
  }

  @Post(':id/director-approve')
  @RequirePermissions('running_bill.approve')
  @ApiOperation({
    summary: 'Director approval (Finance Verified → Director Approved)',
  })
  directorApprove(
    @Param('id') id: string,
    @Body() dto: WorkflowNoteDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.billsService.directorApprove(id, dto, actor.id);
  }

  @Post(':id/post')
  @RequirePermissions('running_bill.post')
  @ApiOperation({
    summary:
      'Post bill (Director Approved → Posted / payment-certified; balanced AP journal; idempotent)',
  })
  post(
    @Param('id') id: string,
    @Body() dto: PostContractorBillDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.billsService.post(id, actor.id, dto ?? {});
  }

  @Post(':id/mark-paid')
  @RequirePermissions('running_bill.pay')
  @ApiOperation({ summary: 'Mark bill paid (Posted / Partially Paid → Paid)' })
  markPaid(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.billsService.markPaid(id, actor.id);
  }

  @Post(':id/close')
  @RequirePermissions('running_bill.pay')
  @ApiOperation({ summary: 'Close bill (Paid → Closed)' })
  close(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.billsService.close(id, actor.id);
  }

  @Post(':id/reject')
  @RequirePermissions('running_bill.verify')
  @ApiOperation({ summary: 'Reject bill back for correction' })
  reject(
    @Param('id') id: string,
    @Body() dto: RejectContractorBillDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.billsService.reject(id, dto, actor.id);
  }

  @Post(':id/cancel')
  @RequirePermissions('running_bill.create')
  @ApiOperation({ summary: 'Cancel draft or rejected bill' })
  cancel(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.billsService.cancel(id, actor.id);
  }
}
