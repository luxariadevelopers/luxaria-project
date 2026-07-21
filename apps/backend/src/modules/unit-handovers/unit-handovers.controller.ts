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
  AddSnagDto,
  CloseSnagDto,
  CreateUnitHandoverDto,
  ListUnitHandoverQueryDto,
  ScheduleUnitHandoverDto,
  UpdateUnitHandoverDto,
} from './dto/unit-handover.dto';
import { UnitHandoversService } from './unit-handovers.service';

@ProjectScoped({
  mode: 'filter',
  resource: { resourceType: 'unit-handover', idParam: 'id' },
  operation: 'read',
})
@ApiTags('Unit Handovers')
@ApiBearerAuth()
@Controller('unit-handovers')
export class UnitHandoversController {
  constructor(private readonly service: UnitHandoversService) {}

  @Post()
  @RequirePermissions('handover.manage')
  @ApiOperation({ summary: 'Create unit handover record' })
  create(@Body() dto: CreateUnitHandoverDto, @CurrentUser() actor: AuthUser) {
    return this.service.create(dto, actor.id);
  }

  @Get()
  @RequirePermissions('handover.view')
  @ApiOperation({ summary: 'List unit handovers' })
  list(@Query() query: ListUnitHandoverQueryDto) {
    return this.service.list(query);
  }

  @Get(':id')
  @RequirePermissions('handover.view')
  @ApiOperation({ summary: 'Get unit handover' })
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Patch(':id')
  @RequirePermissions('handover.manage')
  @ApiOperation({ summary: 'Update unit handover' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUnitHandoverDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.update(id, dto, actor.id);
  }

  @Post(':id/schedule')
  @RequirePermissions('handover.manage')
  @ApiOperation({ summary: 'Schedule handover' })
  schedule(
    @Param('id') id: string,
    @Body() dto: ScheduleUnitHandoverDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.schedule(id, dto, actor.id);
  }

  @Post(':id/start')
  @RequirePermissions('handover.manage')
  @ApiOperation({ summary: 'Start handover (scheduled → in_progress)' })
  start(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.start(id, actor.id);
  }

  @Post(':id/complete')
  @RequirePermissions('handover.manage')
  @ApiOperation({
    summary:
      'Complete handover (requires keysHandedOver + customerAcknowledged)',
  })
  complete(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.complete(id, actor.id);
  }

  @Post(':id/cancel')
  @RequirePermissions('handover.manage')
  @ApiOperation({ summary: 'Cancel handover' })
  cancel(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.cancel(id, actor.id);
  }

  @Post(':id/add-snag')
  @RequirePermissions('handover.manage')
  @ApiOperation({ summary: 'Add snag item' })
  addSnag(
    @Param('id') id: string,
    @Body() dto: AddSnagDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.addSnag(id, dto, actor.id);
  }

  @Post(':id/close-snag/:snagId')
  @RequirePermissions('handover.manage')
  @ApiOperation({ summary: 'Close snag item' })
  closeSnag(
    @Param('id') id: string,
    @Param('snagId') snagId: string,
    @Body() dto: CloseSnagDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.closeSnag(id, snagId, dto, actor.id);
  }
}
