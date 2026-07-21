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
import { ContractorRecoveriesService } from './contractor-recoveries.service';
import {
  CreateContractorRecoveryDto,
  ListContractorRecoveriesQueryDto,
  PostContractorRecoveryDto,
  UpdateContractorRecoveryDto,
} from './dto/contractor-recovery.dto';

@ProjectScoped({
  mode: 'filter',
  resource: { resourceType: 'contractor-recovery', idParam: 'id' },
  operation: 'read',
})
@ApiTags('Contractor Recoveries')
@ApiBearerAuth()
@Controller('contractor-recoveries')
export class ContractorRecoveriesController {
  constructor(private readonly service: ContractorRecoveriesService) {}

  @Post()
  @RequirePermissions('contractor_recovery.manage')
  @ApiOperation({ summary: 'Create contractor recovery (draft)' })
  create(
    @Body() dto: CreateContractorRecoveryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.create(dto, actor.id);
  }

  @Get()
  @RequirePermissions('contractor_recovery.view')
  @ApiOperation({ summary: 'List contractor recoveries' })
  list(@Query() query: ListContractorRecoveriesQueryDto) {
    return this.service.list(query);
  }

  @Get(':id')
  @RequirePermissions('contractor_recovery.view')
  @ApiOperation({ summary: 'Get contractor recovery' })
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Patch(':id')
  @RequirePermissions('contractor_recovery.manage')
  @ApiOperation({ summary: 'Update draft contractor recovery' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateContractorRecoveryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.update(id, dto, actor.id);
  }

  @Post(':id/approve')
  @RequirePermissions('contractor_recovery.manage')
  @ApiOperation({ summary: 'Approve recovery (draft → approved)' })
  approve(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.approve(id, actor.id);
  }

  @Post(':id/post')
  @RequirePermissions('contractor_recovery.manage')
  @ApiOperation({ summary: 'Post recovery (approved → posted)' })
  post(
    @Param('id') id: string,
    @Body() dto: PostContractorRecoveryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.post(id, dto, actor.id);
  }
}
