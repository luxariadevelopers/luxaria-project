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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import {
  ChangeUnitStatusDto,
  CreateUnitDto,
  ListUnitsQueryDto,
  UpdateUnitDto,
} from './dto/unit.dto';
import { UnitsService } from './units.service';
import { ProjectScoped } from '../project-access/decorators/route-scope.decorator';

@ProjectScoped({
  mode: 'filter',
  resource: { resourceType: 'unit', idParam: 'id' },
  operation: 'read',
})
@ApiTags('Units')
@ApiBearerAuth()
@Controller('units')
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Post()
  @RequirePermissions('unit.manage')
  @ApiOperation({ summary: 'Create real-estate unit inventory record' })
  create(@Body() dto: CreateUnitDto, @CurrentUser() actor: AuthUser) {
    return this.unitsService.create(dto, actor.id);
  }

  @Get()
  @RequirePermissions('unit.view')
  @ApiOperation({ summary: 'List units' })
  list(@Query() query: ListUnitsQueryDto) {
    return this.unitsService.list(query);
  }

  @Get(':id')
  @RequirePermissions('unit.view')
  @ApiOperation({ summary: 'Get unit by id' })
  getById(@Param('id') id: string) {
    return this.unitsService.getById(id);
  }

  @Patch(':id')
  @RequirePermissions('unit.manage')
  @ApiOperation({ summary: 'Update unit master data' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUnitDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.unitsService.update(id, dto, actor.id);
  }

  @Post(':id/status')
  @RequirePermissions('unit.manage')
  @ApiOperation({
    summary:
      'Change unit status (atomic claim for hold/reserve/book — prevents double booking)',
  })
  changeStatus(
    @Param('id') id: string,
    @Body() dto: ChangeUnitStatusDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.unitsService.changeStatus(id, dto, actor.id);
  }

  @Delete(':id')
  @RequirePermissions('unit.manage')
  @ApiOperation({ summary: 'Soft-delete unit (not when occupied)' })
  remove(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.unitsService.softDelete(id, actor.id);
  }
}
