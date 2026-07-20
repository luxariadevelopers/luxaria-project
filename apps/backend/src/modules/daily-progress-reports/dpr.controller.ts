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
import { DprService } from './dpr.service';
import {
  CreateDailyProgressReportDto,
  ListDailyProgressReportsQueryDto,
  ReopenDailyProgressReportDto,
  ReviewDailyProgressReportDto,
  UpdateDailyProgressReportDto,
} from './dto/dpr.dto';

@ApiTags('Daily Progress Reports')
@ApiBearerAuth()
@Controller('daily-progress-reports')
export class DprController {
  constructor(private readonly dprService: DprService) {}

  @Post()
  @RequirePermissions('dpr.create')
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description: 'Required for offline mobile retries',
  })
  @ApiOperation({
    summary: 'Create DPR (draft). Pass submit=true for offline create+submit.',
  })
  create(
    @Body() dto: CreateDailyProgressReportDto,
    @CurrentUser() actor: AuthUser,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.dprService.create(dto, actor.id, idempotencyKey);
  }

  @Get()
  @RequirePermissions('dpr.view')
  @ApiOperation({ summary: 'List daily progress reports' })
  list(@Query() query: ListDailyProgressReportsQueryDto) {
    return this.dprService.list(query);
  }

  @Get('missing-alerts')
  @RequirePermissions('dpr.view')
  @ApiOperation({ summary: 'List unacknowledged missing-DPR alerts' })
  listMissingAlerts(@Query('projectId') projectId?: string) {
    return this.dprService.listMissingAlerts(projectId);
  }

  @Post('missing-alerts/evaluate')
  @RequirePermissions('dpr.review')
  @ApiOperation({ summary: 'Manually evaluate missing-DPR alerts' })
  evaluateMissing(@Query('asOf') asOf?: string) {
    return this.dprService.evaluateMissingAlerts(
      asOf ? new Date(asOf) : undefined,
    );
  }

  @Post('missing-alerts/:id/acknowledge')
  @RequirePermissions('dpr.review')
  @ApiOperation({ summary: 'Acknowledge a missing-DPR alert' })
  acknowledgeAlert(
    @Param('id') id: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.dprService.acknowledgeAlert(id, actor.id);
  }

  @Get(':id')
  @RequirePermissions('dpr.view')
  @ApiOperation({ summary: 'Get DPR by id' })
  getById(@Param('id') id: string) {
    return this.dprService.getById(id);
  }

  @Patch(':id')
  @RequirePermissions('dpr.create')
  @ApiOperation({ summary: 'Update draft or reopened DPR' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDailyProgressReportDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.dprService.update(id, dto, actor.id);
  }

  @Post(':id/submit')
  @RequirePermissions('dpr.create')
  @ApiOperation({ summary: 'Submit DPR (Draft/Reopened → Submitted) + PDF' })
  submit(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.dprService.submit(id, actor.id);
  }

  @Post(':id/review')
  @RequirePermissions('dpr.review')
  @ApiOperation({ summary: 'Review submitted DPR (Submitted → Reviewed)' })
  review(
    @Param('id') id: string,
    @Body() dto: ReviewDailyProgressReportDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.dprService.review(id, dto, actor.id);
  }

  @Post(':id/reopen')
  @RequirePermissions('dpr.review')
  @ApiOperation({
    summary: 'Reopen submitted/reviewed DPR for corrections (one per date)',
  })
  reopen(
    @Param('id') id: string,
    @Body() dto: ReopenDailyProgressReportDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.dprService.reopen(id, dto, actor.id);
  }

  @Post(':id/regenerate-pdf')
  @RequirePermissions('dpr.review')
  @ApiOperation({ summary: 'Regenerate DPR PDF document' })
  regeneratePdf(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.dprService.regeneratePdf(id, actor.id);
  }
}
