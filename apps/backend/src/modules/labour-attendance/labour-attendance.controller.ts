import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import {
  ConfirmLabourAttendanceDto,
  CreateLabourAttendanceDto,
  DailyAttendanceReportQueryDto,
  ListLabourAttendanceQueryDto,
  UpdateLabourAttendanceDto,
} from './dto/labour-attendance.dto';
import { LabourAttendanceService } from './labour-attendance.service';
import { ProjectScoped } from '../project-access/decorators/route-scope.decorator';

@ProjectScoped({
  mode: 'filter',
  resource: { resourceType: 'labour-attendance', idParam: 'id' },
  operation: 'read',
})
@ApiTags('Labour Attendance')
@ApiBearerAuth()
@Controller('labour-attendance')
export class LabourAttendanceController {
  constructor(private readonly attendanceService: LabourAttendanceService) {}

  @Post()
  @RequirePermissions('attendance.create')
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description: 'Required for offline mobile retries',
  })
  @ApiOperation({
    summary:
      'Create labour attendance (draft). Pass submit=true for offline create+submit.',
  })
  create(
    @Body() dto: CreateLabourAttendanceDto,
    @CurrentUser() actor: AuthUser,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.attendanceService.create(dto, actor.id, idempotencyKey);
  }

  @Get()
  @RequirePermissions('attendance.view')
  @ApiOperation({ summary: 'List labour attendance sheets' })
  list(@Query() query: ListLabourAttendanceQueryDto) {
    return this.attendanceService.list(query);
  }

  @Get('daily-report')
  @RequirePermissions('attendance.view')
  @ApiOperation({
    summary:
      'Daily attendance report for a project (optional site/shift/contractor filter)',
  })
  dailyReport(
    @Query() query: DailyAttendanceReportQueryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.attendanceService.dailyReport(query, actor.id);
  }

  @Get('daily-deployment')
  @RequirePermissions('attendance.view')
  @ApiOperation({
    summary:
      'Daily labour deployment for DPR rollup (project + date, optional site/shift)',
  })
  dailyDeployment(
    @Query() query: DailyAttendanceReportQueryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.attendanceService.dailyDeployment(query, actor.id);
  }

  @Get(':id')
  @RequirePermissions('attendance.view')
  @ApiOperation({ summary: 'Get labour attendance by id' })
  getById(@Param('id') id: string) {
    return this.attendanceService.getById(id);
  }

  @Patch(':id')
  @RequirePermissions('attendance.create')
  @ApiOperation({ summary: 'Update draft labour attendance' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLabourAttendanceDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.attendanceService.update(id, dto, actor.id);
  }

  @Post(':id/submit')
  @RequirePermissions('attendance.create')
  @ApiOperation({ summary: 'Submit draft attendance (Draft → Submitted)' })
  submit(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.attendanceService.submit(id, actor.id);
  }

  @Post(':id/confirm')
  @RequirePermissions('attendance.confirm')
  @ApiOperation({
    summary: 'Supervisor confirmation (Submitted → Confirmed)',
  })
  confirm(
    @Param('id') id: string,
    @Body() dto: ConfirmLabourAttendanceDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.attendanceService.confirm(id, dto, actor.id);
  }
}
