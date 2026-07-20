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
import { ContractorAgreementsService } from './contractor-agreements.service';
import {
  AmendContractorAgreementDto,
  ApproveContractorAgreementDto,
  CreateContractorAgreementDto,
  ListContractorAgreementsQueryDto,
  ListExpiryAlertsQueryDto,
  RejectContractorAgreementDto,
  TerminateContractorAgreementDto,
  UpdateContractorAgreementDto,
} from './dto/contractor-agreement.dto';

@ApiTags('Contractor Agreements')
@ApiBearerAuth()
@Controller('contractor-agreements')
export class ContractorAgreementsController {
  constructor(
    private readonly agreementsService: ContractorAgreementsService,
  ) {}

  @Post()
  @RequirePermissions('contractor_agreement.manage')
  @ApiOperation({ summary: 'Create contractor agreement (draft)' })
  create(
    @Body() dto: CreateContractorAgreementDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.agreementsService.create(dto, actor.id);
  }

  @Get()
  @RequirePermissions('contractor_agreement.view')
  @ApiOperation({ summary: 'List contractor agreements' })
  list(@Query() query: ListContractorAgreementsQueryDto) {
    return this.agreementsService.list(query);
  }

  @Get('expiry-alerts')
  @RequirePermissions('contractor_agreement.view')
  @ApiOperation({ summary: 'List agreement expiry alerts' })
  listExpiryAlerts(@Query() query: ListExpiryAlertsQueryDto) {
    return this.agreementsService.listExpiryAlerts(query);
  }

  @Post('expiry-alerts/evaluate')
  @RequirePermissions('contractor_agreement.manage')
  @ApiOperation({ summary: 'Evaluate agreement expiry alerts (manual run)' })
  evaluateExpiry(@Query('asOf') asOf?: string) {
    return this.agreementsService.evaluateExpiryAlerts(asOf);
  }

  @Post('expiry-alerts/:alertId/acknowledge')
  @RequirePermissions('contractor_agreement.manage')
  @ApiOperation({ summary: 'Acknowledge an expiry alert' })
  acknowledgeAlert(
    @Param('alertId') alertId: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.agreementsService.acknowledgeExpiryAlert(alertId, actor.id);
  }

  @Get('by-number/:agreementNumber/versions')
  @RequirePermissions('contractor_agreement.view')
  @ApiOperation({ summary: 'List all versions for an agreement number' })
  listVersions(
    @Param('agreementNumber') agreementNumber: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.agreementsService.listVersions(agreementNumber, projectId);
  }

  @Get(':id')
  @RequirePermissions('contractor_agreement.view')
  @ApiOperation({ summary: 'Get contractor agreement' })
  getById(@Param('id') id: string) {
    return this.agreementsService.getById(id);
  }

  @Patch(':id')
  @RequirePermissions('contractor_agreement.manage')
  @ApiOperation({ summary: 'Update draft/rejected agreement' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateContractorAgreementDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.agreementsService.update(id, dto, actor.id);
  }

  @Post(':id/amend')
  @RequirePermissions('contractor_agreement.manage')
  @ApiOperation({
    summary: 'Amend active agreement (creates new draft version)',
  })
  amend(
    @Param('id') id: string,
    @Body() dto: AmendContractorAgreementDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.agreementsService.amend(id, dto, actor.id);
  }

  @Post(':id/submit')
  @RequirePermissions('contractor_agreement.manage')
  @ApiOperation({ summary: 'Submit agreement for approval workflow' })
  submit(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.agreementsService.submitForApproval(id, actor.id);
  }

  @Post(':id/approve')
  @RequirePermissions('contractor_agreement.approve')
  @ApiOperation({ summary: 'Approve pending agreement (via Approvals engine)' })
  approve(
    @Param('id') id: string,
    @Body() dto: ApproveContractorAgreementDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.agreementsService.approve(id, dto, actor.id);
  }

  @Post(':id/reject')
  @RequirePermissions('contractor_agreement.approve')
  @ApiOperation({ summary: 'Reject pending agreement' })
  reject(
    @Param('id') id: string,
    @Body() dto: RejectContractorAgreementDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.agreementsService.reject(id, dto, actor.id);
  }

  @Post(':id/terminate')
  @RequirePermissions('contractor_agreement.manage')
  @ApiOperation({ summary: 'Terminate an active agreement' })
  terminate(
    @Param('id') id: string,
    @Body() dto: TerminateContractorAgreementDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.agreementsService.terminate(id, dto, actor.id);
  }
}
