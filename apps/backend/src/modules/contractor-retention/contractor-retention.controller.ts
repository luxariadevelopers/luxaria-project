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
import { ProjectScoped } from '../project-access/decorators/route-scope.decorator';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { ContractorRetentionService } from './contractor-retention.service';
import {
  CreateContractorRetentionDto,
  ListContractorRetentionQueryDto,
  RejectContractorRetentionDto,
  RetentionRegisterQueryDto,
  UpdateContractorRetentionDto,
} from './dto/contractor-retention.dto';

@ProjectScoped({
  mode: 'filter',
  resource: { resourceType: 'contractor-retention', idParam: 'id' },
  operation: 'read',
})
@ApiTags('Contractor Retention')
@ApiBearerAuth()
@Controller('contractor-retention')
export class ContractorRetentionController {
  constructor(private readonly service: ContractorRetentionService) {}

  @Post()
  @RequirePermissions('contractor_retention.manage')
  @ApiOperation({
    summary:
      'Create retention deduction (from posted bill) or staged release request',
  })
  create(
    @Body() dto: CreateContractorRetentionDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.create(dto, actor.id);
  }

  @Get('register')
  @RequirePermissions('contractor_retention.view')
  @ApiOperation({
    summary: 'Contractor-wise retention register (held / released / ceiling)',
  })
  register(@Query() query: RetentionRegisterQueryDto) {
    return this.service.register(query);
  }

  @Get()
  @RequirePermissions('contractor_retention.view')
  @ApiOperation({ summary: 'List retention deduction / release records' })
  list(@Query() query: ListContractorRetentionQueryDto) {
    return this.service.list(query);
  }

  @Get(':id')
  @RequirePermissions('contractor_retention.view')
  @ApiOperation({ summary: 'Get retention record' })
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Patch(':id')
  @RequirePermissions('contractor_retention.manage')
  @ApiOperation({ summary: 'Update draft retention record' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateContractorRetentionDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.update(id, dto, actor.id);
  }

  @Post(':id/submit')
  @RequirePermissions('contractor_retention.manage')
  @ApiOperation({ summary: 'Submit draft → pending_approval' })
  submit(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.submit(id, actor.id);
  }

  @Post(':id/approve')
  @RequirePermissions('contractor_retention.manage')
  @ApiOperation({ summary: 'Approve pending retention record' })
  approve(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.approve(id, actor.id);
  }

  @Post(':id/reject')
  @RequirePermissions('contractor_retention.manage')
  @ApiOperation({ summary: 'Reject pending retention record' })
  reject(
    @Param('id') id: string,
    @Body() dto: RejectContractorRetentionDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.reject(id, dto, actor.id);
  }

  @Post(':id/release')
  @RequirePermissions('contractor_retention.release')
  @ApiOperation({
    summary:
      'Finalise approved release (practical_completion / defect_liability / bg_replacement)',
  })
  release(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.release(id, actor.id);
  }

  @Post(':id/cancel')
  @RequirePermissions('contractor_retention.manage')
  @ApiOperation({ summary: 'Cancel draft / pending / rejected record' })
  cancel(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.cancel(id, actor.id);
  }
}
