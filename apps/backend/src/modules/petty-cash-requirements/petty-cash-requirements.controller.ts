import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import {
  CreatePettyCashRequirementDto,
  FinanceApproveDto,
  FundRequirementDto,
  ListPettyCashRequirementsQueryDto,
  ReviewActionDto,
  UpdatePettyCashRequirementDto,
} from './dto/petty-cash-requirement.dto';
import { PettyCashRequirementsService } from './petty-cash-requirements.service';

@ApiTags('Petty Cash Requirements')
@ApiBearerAuth()
@Controller('petty-cash-requirements')
export class PettyCashRequirementsController {
  constructor(private readonly service: PettyCashRequirementsService) {}

  @Post()
  @RequirePermissions('petty_cash.request')
  @ApiOperation({ summary: 'Create weekly petty-cash requirement (draft)' })
  create(
    @Body() dto: CreatePettyCashRequirementDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.create(dto, actor.id);
  }

  @Get()
  @RequirePermissions('petty_cash.view')
  @ApiOperation({ summary: 'List weekly petty-cash requirements' })
  list(@Query() query: ListPettyCashRequirementsQueryDto) {
    return this.service.list(query);
  }

  @Get(':id')
  @RequirePermissions('petty_cash.view')
  @ApiOperation({ summary: 'Get weekly petty-cash requirement' })
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Patch(':id')
  @RequirePermissions('petty_cash.request')
  @ApiOperation({ summary: 'Update draft / returned requirement' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePettyCashRequirementDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.update(id, dto, actor.id);
  }

  @Post(':id/submit')
  @RequirePermissions('petty_cash.request')
  @ApiOperation({
    summary: 'Submit for approval (creates approval request + PM review)',
  })
  submit(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.submit(id, actor.id);
  }

  @Post(':id/project-manager-approve')
  @RequirePermissions('petty_cash.approve')
  @ApiOperation({ summary: 'Project manager review / approve step' })
  pmApprove(
    @Param('id') id: string,
    @Body() dto: ReviewActionDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.projectManagerApprove(id, actor.id, dto);
  }

  @Post(':id/finance-approve')
  @RequirePermissions('petty_cash.approve')
  @ApiOperation({
    summary: 'Finance review / approve (approved amount may differ)',
  })
  financeApprove(
    @Param('id') id: string,
    @Body() dto: FinanceApproveDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.financeApprove(id, actor.id, dto);
  }

  @Post(':id/reject')
  @RequirePermissions('petty_cash.approve')
  @ApiOperation({ summary: 'Reject requirement' })
  reject(
    @Param('id') id: string,
    @Body() dto: ReviewActionDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.reject(id, actor.id, dto);
  }

  @Post(':id/return')
  @RequirePermissions('petty_cash.approve')
  @ApiOperation({ summary: 'Return for correction' })
  returnForCorrection(
    @Param('id') id: string,
    @Body() dto: ReviewActionDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.returnForCorrection(id, actor.id, dto);
  }

  @Post(':id/fund')
  @RequirePermissions('petty_cash.fund')
  @ApiOperation({ summary: 'Mark requirement as funded' })
  fund(
    @Param('id') id: string,
    @Body() dto: FundRequirementDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.fund(id, actor.id, dto);
  }

  @Post(':id/close')
  @RequirePermissions('petty_cash.fund')
  @ApiOperation({ summary: 'Close funded requirement after settlement' })
  close(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.close(id, actor.id);
  }

  @Post(':id/cancel')
  @RequirePermissions('petty_cash.request')
  @ApiOperation({ summary: 'Cancel draft / returned requirement' })
  cancel(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.cancel(id, actor.id);
  }
}
