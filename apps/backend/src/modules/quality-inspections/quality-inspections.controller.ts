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
  CompleteQualityInspectionDto,
  CreateQualityInspectionDto,
  ListQualityInspectionsQueryDto,
  UpdateQualityInspectionDto,
} from './dto/quality-inspection.dto';
import { QualityInspectionsService } from './quality-inspections.service';
import { ProjectScoped } from '../project-access/decorators/route-scope.decorator';

@ProjectScoped({
  mode: 'filter',
  resource: { resourceType: 'quality-inspection', idParam: 'id' },
  operation: 'read',
})
@ApiTags('Quality Inspections')
@ApiBearerAuth()
@Controller()
export class QualityInspectionsController {
  constructor(
    private readonly qualityInspectionsService: QualityInspectionsService,
  ) {}

  @Post('quality-inspections')
  @RequirePermissions('quality.inspect')
  @ApiOperation({ summary: 'Create material quality inspection for a GRN' })
  create(
    @Body() dto: CreateQualityInspectionDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.qualityInspectionsService.create(dto, actor.id);
  }

  @Get('quality-inspections')
  @RequirePermissions('quality.view')
  @ApiOperation({ summary: 'List quality inspections' })
  list(@Query() query: ListQualityInspectionsQueryDto) {
    return this.qualityInspectionsService.list(query);
  }

  @Get('quality-inspections/:id')
  @RequirePermissions('quality.view')
  @ApiOperation({ summary: 'Get quality inspection' })
  getById(@Param('id') id: string) {
    return this.qualityInspectionsService.getById(id);
  }

  @Patch('quality-inspections/:id')
  @RequirePermissions('quality.inspect')
  @ApiOperation({ summary: 'Update draft / in-progress inspection' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateQualityInspectionDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.qualityInspectionsService.update(id, dto, actor.id);
  }

  @Post('quality-inspections/:id/complete')
  @RequirePermissions('quality.inspect')
  @ApiOperation({
    summary:
      'Complete inspection (Accepted / Partially Accepted / Rejected / Hold) and update vendor quality score',
  })
  complete(
    @Param('id') id: string,
    @Body() dto: CompleteQualityInspectionDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.qualityInspectionsService.complete(id, dto, actor.id);
  }

  @Post('quality-inspections/:id/cancel')
  @RequirePermissions('quality.inspect')
  @ApiOperation({ summary: 'Cancel open quality inspection' })
  cancel(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.qualityInspectionsService.cancel(id, actor.id);
  }

  @Get('vendors/:vendorId/quality-score')
  @RequirePermissions('quality.view')
  @ApiOperation({ summary: 'Get aggregated vendor quality score' })
  getVendorQualityScore(@Param('vendorId') vendorId: string) {
    return this.qualityInspectionsService.getVendorQualityScore(vendorId);
  }
}
