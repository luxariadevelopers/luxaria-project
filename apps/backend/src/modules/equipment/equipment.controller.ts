import {
  Body,
  Controller,
  Delete,
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
  CreateEquipmentAllocationDto,
  CreateEquipmentBreakdownLogDto,
  CreateEquipmentDto,
  CreateEquipmentFuelLogDto,
  CreateEquipmentMaintenanceLogDto,
  CreateEquipmentUtilizationDto,
  ListEquipmentQueryDto,
  ListEquipmentUtilizationQueryDto,
  UpdateEquipmentDto,
} from './dto/equipment.dto';
import { EquipmentService } from './equipment.service';

@ProjectScoped({ mode: 'filter', operation: 'read' })
@ApiTags('Equipment')
@ApiBearerAuth()
@Controller('equipment')
export class EquipmentController {
  constructor(private readonly service: EquipmentService) {}

  @Post()
  @RequirePermissions('equipment.manage')
  @ApiOperation({ summary: 'Create equipment master' })
  create(
    @Body() dto: CreateEquipmentDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.create(dto, actor.id);
  }

  @Get()
  @RequirePermissions('equipment.view')
  @ApiOperation({ summary: 'List equipment' })
  list(@Query() query: ListEquipmentQueryDto) {
    return this.service.list(query);
  }

  @Get('utilization')
  @RequirePermissions('equipment.view')
  @ApiOperation({
    summary: 'List utilization lines (filter by dprId / projectId)',
  })
  listUtilization(@Query() query: ListEquipmentUtilizationQueryDto) {
    return this.service.listUtilization(query);
  }

  @Post('utilization')
  @RequirePermissions('equipment.operate')
  @ApiOperation({
    summary:
      'Record utilization (hours worked/idle). Soft-gated by project settings.equipmentEnabled',
  })
  createUtilization(
    @Body() dto: CreateEquipmentUtilizationDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.createUtilization(dto, actor.id);
  }

  @Get(':id')
  @RequirePermissions('equipment.view')
  @ApiOperation({ summary: 'Get equipment by id' })
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Patch(':id')
  @RequirePermissions('equipment.manage')
  @ApiOperation({ summary: 'Update equipment master' })
  update(@Param('id') id: string, @Body() dto: UpdateEquipmentDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('equipment.manage')
  @ApiOperation({ summary: 'Delete equipment (soft)' })
  remove(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.remove(id, actor.id);
  }

  @Post(':id/allocations')
  @RequirePermissions('equipment.manage')
  @ApiOperation({ summary: 'Record allocation to project/site' })
  addAllocation(
    @Param('id') id: string,
    @Body() dto: CreateEquipmentAllocationDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.addAllocation(id, dto, actor.id);
  }

  @Post(':id/fuel')
  @RequirePermissions('equipment.operate')
  @ApiOperation({ summary: 'Record fuel log' })
  addFuelLog(
    @Param('id') id: string,
    @Body() dto: CreateEquipmentFuelLogDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.addFuelLog(id, dto, actor.id);
  }

  @Post(':id/maintenance')
  @RequirePermissions('equipment.manage')
  @ApiOperation({ summary: 'Record maintenance log' })
  addMaintenanceLog(
    @Param('id') id: string,
    @Body() dto: CreateEquipmentMaintenanceLogDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.addMaintenanceLog(id, dto, actor.id);
  }

  @Post(':id/breakdown')
  @RequirePermissions('equipment.manage')
  @ApiOperation({ summary: 'Record breakdown log' })
  addBreakdownLog(
    @Param('id') id: string,
    @Body() dto: CreateEquipmentBreakdownLogDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.addBreakdownLog(id, dto, actor.id);
  }
}
