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
  ApproveMaterialConsumptionStandardDto,
  CreateMaterialConsumptionStandardDto,
  ListMaterialConsumptionStandardsQueryDto,
  RejectMaterialConsumptionStandardDto,
  ResolveMaterialConsumptionStandardQueryDto,
  UpdateMaterialConsumptionStandardDto,
} from './dto/material-consumption-standard.dto';
import { MaterialConsumptionStandardService } from './material-consumption-standard.service';

@ApiTags('Material Consumption Standards')
@ApiBearerAuth()
@Controller('material-consumption-standards')
export class MaterialConsumptionStandardController {
  constructor(private readonly service: MaterialConsumptionStandardService) {}

  @Post()
  @RequirePermissions('material_consumption.manage')
  @ApiOperation({
    summary:
      'Create material consumption standard (draft). Set projectId for project override.',
  })
  create(
    @Body() dto: CreateMaterialConsumptionStandardDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.create(dto, actor.id);
  }

  @Get()
  @RequirePermissions('material_consumption.view')
  @ApiOperation({ summary: 'List material consumption standards' })
  list(@Query() query: ListMaterialConsumptionStandardsQueryDto) {
    return this.service.list(query);
  }

  @Get('resolve')
  @RequirePermissions('material_consumption.view')
  @ApiOperation({
    summary:
      'Resolve applicable standard (project override wins over company-wide)',
  })
  resolve(@Query() query: ResolveMaterialConsumptionStandardQueryDto) {
    return this.service.resolve(query);
  }

  @Get(':id')
  @RequirePermissions('material_consumption.view')
  @ApiOperation({ summary: 'Get material consumption standard by id' })
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Patch(':id')
  @RequirePermissions('material_consumption.manage')
  @ApiOperation({ summary: 'Update draft or rejected standard' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateMaterialConsumptionStandardDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.update(id, dto, actor.id);
  }

  @Post(':id/versions')
  @RequirePermissions('material_consumption.manage')
  @ApiOperation({ summary: 'Create next draft version from an existing standard' })
  createVersion(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.createVersion(id, actor.id);
  }

  @Post(':id/submit')
  @RequirePermissions('material_consumption.manage')
  @ApiOperation({ summary: 'Submit for approval (Draft → PendingApproval)' })
  submit(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.submit(id, actor.id);
  }

  @Post(':id/approve')
  @RequirePermissions('material_consumption.approve')
  @ApiOperation({
    summary:
      'Approve and activate (PendingApproval → Active). Supersedes prior active version.',
  })
  approve(
    @Param('id') id: string,
    @Body() dto: ApproveMaterialConsumptionStandardDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.approve(id, dto, actor.id);
  }

  @Post(':id/reject')
  @RequirePermissions('material_consumption.approve')
  @ApiOperation({ summary: 'Reject pending standard' })
  reject(
    @Param('id') id: string,
    @Body() dto: RejectMaterialConsumptionStandardDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.reject(id, dto, actor.id);
  }
}
