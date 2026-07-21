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
  CertifyWorkMeasurementDto,
  CreateWorkMeasurementDto,
  ListWorkMeasurementsQueryDto,
  RejectWorkMeasurementDto,
  UpdateWorkMeasurementDto,
  VerifyWorkMeasurementDto,
} from './dto/work-measurement.dto';
import { WorkMeasurementService } from './work-measurement.service';
import { ProjectScoped } from '../project-access/decorators/route-scope.decorator';

@ProjectScoped({
  mode: 'filter',
  resource: { resourceType: 'work-measurement', idParam: 'id' },
  operation: 'read',
})
@ApiTags('Work Measurements')
@ApiBearerAuth()
@Controller('work-measurements')
export class WorkMeasurementController {
  constructor(private readonly service: WorkMeasurementService) {}

  @Post()
  @RequirePermissions('measurement.create')
  @ApiOperation({
    summary: 'Create work measurement (draft). Pass submit=true to submit.',
  })
  create(
    @Body() dto: CreateWorkMeasurementDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.create(dto, actor.id);
  }

  @Get()
  @RequirePermissions('measurement.view')
  @ApiOperation({
    summary: 'List work measurements (filter by projectId, siteId, dprId, …)',
  })
  list(
    @Query() query: ListWorkMeasurementsQueryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.list(query, actor.id);
  }

  @Get(':id')
  @RequirePermissions('measurement.view')
  @ApiOperation({ summary: 'Get work measurement by id' })
  getById(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.getById(id, actor.id);
  }

  @Patch(':id')
  @RequirePermissions('measurement.create')
  @ApiOperation({ summary: 'Update draft or rejected work measurement' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateWorkMeasurementDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.update(id, dto, actor.id);
  }

  @Post(':id/submit')
  @RequirePermissions('measurement.create')
  @ApiOperation({
    summary: 'Submit measurement for engineer verification (Draft → Submitted)',
  })
  submit(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.submit(id, actor.id);
  }

  @Post(':id/verify')
  @RequirePermissions('measurement.certify')
  @ApiOperation({
    summary:
      'Engineer verification (Submitted → Verified). Verifier ≠ measuredBy. Does not update BOQ progress.',
  })
  verify(
    @Param('id') id: string,
    @Body() dto: VerifyWorkMeasurementDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.verify(id, dto, actor.id);
  }

  @Post(':id/certify')
  @RequirePermissions('measurement.certify')
  @ApiOperation({
    summary:
      'Certify verified measurement (Verified → Certified) and sync BOQ progressQuantity. Certifier ≠ measuredBy.',
  })
  certify(
    @Param('id') id: string,
    @Body() dto: CertifyWorkMeasurementDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.certify(id, dto, actor.id);
  }

  @Post(':id/approve')
  @RequirePermissions('measurement.certify')
  @ApiOperation({
    summary: 'Alias for certify (Verified → Certified + BOQ progress sync)',
  })
  approve(
    @Param('id') id: string,
    @Body() dto: CertifyWorkMeasurementDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.approve(id, dto, actor.id);
  }

  @Post(':id/reject')
  @RequirePermissions('measurement.certify')
  @ApiOperation({ summary: 'Reject submitted measurement (engineer)' })
  reject(
    @Param('id') id: string,
    @Body() dto: RejectWorkMeasurementDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.reject(id, dto, actor.id);
  }

  @Post(':id/cancel')
  @RequirePermissions('measurement.create')
  @ApiOperation({ summary: 'Cancel draft or rejected measurement' })
  cancel(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.cancel(id, actor.id);
  }
}
