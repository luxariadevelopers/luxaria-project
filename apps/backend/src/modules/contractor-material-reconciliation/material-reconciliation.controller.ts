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
import {
  CreateMaterialReconciliationDto,
  ListMaterialReconciliationsQueryDto,
  PostMaterialReconciliationToBillDto,
  UpdateMaterialReconciliationDto,
} from './dto/material-reconciliation.dto';
import { MaterialReconciliationService } from './material-reconciliation.service';

@ProjectScoped({
  mode: 'filter',
  resource: {
    resourceType: 'contractor-material-reconciliation',
    idParam: 'id',
  },
  operation: 'read',
})
@ApiTags('Contractor Material Reconciliation')
@ApiBearerAuth()
@Controller('contractor-material-reconciliations')
export class MaterialReconciliationController {
  constructor(private readonly service: MaterialReconciliationService) {}

  @Post()
  @RequirePermissions('contractor_recovery.manage')
  @ApiOperation({ summary: 'Create material reconciliation (draft)' })
  create(
    @Body() dto: CreateMaterialReconciliationDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.create(dto, actor.id);
  }

  @Get()
  @RequirePermissions('contractor_recovery.view')
  @ApiOperation({ summary: 'List material reconciliations' })
  list(@Query() query: ListMaterialReconciliationsQueryDto) {
    return this.service.list(query);
  }

  @Get(':id')
  @RequirePermissions('contractor_recovery.view')
  @ApiOperation({ summary: 'Get material reconciliation' })
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Patch(':id')
  @RequirePermissions('contractor_recovery.manage')
  @ApiOperation({ summary: 'Update draft material reconciliation' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateMaterialReconciliationDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.update(id, dto, actor.id);
  }

  @Post(':id/approve')
  @RequirePermissions('contractor_recovery.manage')
  @ApiOperation({
    summary:
      'Approve reconciliation (draft → approved); creates material recovery when amount > 0',
  })
  approve(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.approve(id, actor.id);
  }

  @Post(':id/post-to-bill')
  @RequirePermissions('contractor_recovery.manage')
  @ApiOperation({
    summary: 'Post to bill (approved → posted_to_bill)',
  })
  postToBill(
    @Param('id') id: string,
    @Body() dto: PostMaterialReconciliationToBillDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.postToBill(id, dto, actor.id);
  }
}
