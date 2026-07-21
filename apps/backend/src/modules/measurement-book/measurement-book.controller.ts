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
  CreateMeasurementBookEntryDto,
  ListMeasurementBookQueryDto,
  RejectMeasurementBookDto,
  ReviseMeasurementBookDto,
  UpdateMeasurementBookEntryDto,
} from './dto/measurement-book.dto';
import { MeasurementBookService } from './measurement-book.service';

@ProjectScoped({
  mode: 'filter',
  resource: { resourceType: 'measurement-book', idParam: 'id' },
  operation: 'read',
})
@ApiTags('Measurement Book')
@ApiBearerAuth()
@Controller('measurement-book')
export class MeasurementBookController {
  constructor(private readonly service: MeasurementBookService) {}

  @Post()
  @RequirePermissions('measurement.create')
  @ApiOperation({ summary: 'Create measurement book entry (draft)' })
  create(
    @Body() dto: CreateMeasurementBookEntryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.create(dto, actor.id);
  }

  @Get()
  @RequirePermissions('measurement.view')
  @ApiOperation({
    summary: 'List measurement book entries (project / WO / DPR / period)',
  })
  list(@Query() query: ListMeasurementBookQueryDto) {
    return this.service.list(query);
  }

  @Get(':id')
  @RequirePermissions('measurement.view')
  @ApiOperation({ summary: 'Get measurement book entry' })
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Patch(':id')
  @RequirePermissions('measurement.create')
  @ApiOperation({
    summary: 'Update draft or rejected entry (certified = revise only)',
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateMeasurementBookEntryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.update(id, dto, actor.id);
  }

  @Post(':id/submit')
  @RequirePermissions('measurement.create')
  @ApiOperation({ summary: 'Engineer submit (Draft → Submitted)' })
  submit(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.submit(id, actor.id);
  }

  @Post(':id/acknowledge')
  @RequirePermissions('measurement.create')
  @ApiOperation({
    summary: 'Contractor acknowledgement (Submitted → Acknowledged)',
  })
  acknowledge(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.acknowledge(id, actor.id);
  }

  @Post(':id/verify')
  @RequirePermissions('measurement.certify')
  @ApiOperation({
    summary:
      'Engineer verify (Submitted|Acknowledged → Verified). Verifier ≠ measuredBy.',
  })
  verify(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.verify(id, actor.id);
  }

  @Post(':id/certify')
  @RequirePermissions('measurement.certify')
  @ApiOperation({
    summary:
      'Certify verified entry (Verified → Certified). Marks prior revision superseded.',
  })
  certify(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.certify(id, actor.id);
  }

  @Post(':id/reject')
  @RequirePermissions('measurement.certify')
  @ApiOperation({ summary: 'Reject submitted / acknowledged / verified entry' })
  reject(
    @Param('id') id: string,
    @Body() dto: RejectMeasurementBookDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.reject(id, dto, actor.id);
  }

  @Post(':id/cancel')
  @RequirePermissions('measurement.create')
  @ApiOperation({ summary: 'Cancel draft or rejected entry' })
  cancel(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.cancel(id, actor.id);
  }

  @Post(':id/revise')
  @RequirePermissions('measurement.create')
  @ApiOperation({
    summary:
      'Create revision draft from certified entry (no silent edit of certified qty)',
  })
  revise(
    @Param('id') id: string,
    @Body() dto: ReviseMeasurementBookDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.revise(id, dto, actor.id);
  }
}
