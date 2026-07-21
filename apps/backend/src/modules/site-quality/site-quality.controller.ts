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
  CreateSiteQualityDto,
  ListSiteQualityQueryDto,
  RaiseNcrDto,
  RecordRectificationDto,
  SetPunchListDto,
  UpdateSiteQualityDto,
} from './dto/site-quality.dto';
import { SiteQualityService } from './site-quality.service';

@ProjectScoped({
  mode: 'filter',
  resource: { resourceType: 'site-quality', idParam: 'id' },
  operation: 'read',
})
@ApiTags('Site Quality')
@ApiBearerAuth()
@Controller('site-quality')
export class SiteQualityController {
  constructor(private readonly service: SiteQualityService) {}

  @Post()
  @RequirePermissions('site_quality.manage')
  @ApiOperation({
    summary: 'Create site quality inspection (workmanship — not GRN QC)',
  })
  create(
    @Body() dto: CreateSiteQualityDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.create(dto, actor.id);
  }

  @Get()
  @RequirePermissions('site_quality.view')
  @ApiOperation({ summary: 'List site quality records' })
  list(@Query() query: ListSiteQualityQueryDto) {
    return this.service.list(query);
  }

  @Get(':id')
  @RequirePermissions('site_quality.view')
  @ApiOperation({ summary: 'Get site quality record' })
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Patch(':id')
  @RequirePermissions('site_quality.manage')
  @ApiOperation({ summary: 'Update open site quality record' })
  update(@Param('id') id: string, @Body() dto: UpdateSiteQualityDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/raise-ncr')
  @RequirePermissions('site_quality.manage')
  @ApiOperation({ summary: 'Raise NCR (inspection → ncr)' })
  raiseNcr(@Param('id') id: string, @Body() dto: RaiseNcrDto) {
    return this.service.raiseNcr(id, dto);
  }

  @Post(':id/punch-list')
  @RequirePermissions('site_quality.manage')
  @ApiOperation({ summary: 'Set punch list (ncr → punch_list)' })
  setPunchList(@Param('id') id: string, @Body() dto: SetPunchListDto) {
    return this.service.setPunchList(id, dto);
  }

  @Post(':id/rectify')
  @RequirePermissions('site_quality.manage')
  @ApiOperation({ summary: 'Record rectification (punch_list → rectification)' })
  recordRectification(
    @Param('id') id: string,
    @Body() dto: RecordRectificationDto,
  ) {
    return this.service.recordRectification(id, dto);
  }

  @Post(':id/reinspect')
  @RequirePermissions('site_quality.manage')
  @ApiOperation({
    summary: 'Record re-inspection (rectification → re_inspection)',
  })
  reinspect(@Param('id') id: string) {
    return this.service.reinspect(id);
  }

  @Post(':id/close')
  @RequirePermissions('site_quality.close')
  @ApiOperation({
    summary: 'Close after pass inspection or successful re-inspection',
  })
  close(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.close(id, actor.id);
  }

  @Post(':id/cancel')
  @RequirePermissions('site_quality.manage')
  @ApiOperation({ summary: 'Cancel open site quality record' })
  cancel(@Param('id') id: string) {
    return this.service.cancel(id);
  }
}
