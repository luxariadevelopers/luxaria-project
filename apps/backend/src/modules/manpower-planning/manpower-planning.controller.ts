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
  CreateManpowerDailyPlanDto,
  EvaluateShortfallQueryDto,
  ListManpowerPlansQueryDto,
  ListShortfallAlertsQueryDto,
  ManpowerComparisonQueryDto,
  UpdateManpowerDailyPlanDto,
} from './dto/manpower-planning.dto';
import { ManpowerPlanningService } from './manpower-planning.service';

@ApiTags('Manpower Planning')
@ApiBearerAuth()
@Controller('manpower-planning')
export class ManpowerPlanningController {
  constructor(private readonly manpowerService: ManpowerPlanningService) {}

  @Post('plans')
  @RequirePermissions('manpower_plan.manage')
  @ApiOperation({ summary: 'Create daily manpower plan' })
  createPlan(
    @Body() dto: CreateManpowerDailyPlanDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.manpowerService.createPlan(dto, actor.id);
  }

  @Get('plans')
  @RequirePermissions('manpower_plan.view')
  @ApiOperation({ summary: 'List daily manpower plans' })
  listPlans(@Query() query: ListManpowerPlansQueryDto) {
    return this.manpowerService.listPlans(query);
  }

  @Get('compare')
  @RequirePermissions('manpower_plan.view')
  @ApiOperation({
    summary:
      'Compare agreement manpower, daily plan, actual attendance, and skill mix',
  })
  compare(@Query() query: ManpowerComparisonQueryDto) {
    return this.manpowerService.compare(query);
  }

  @Get('plans/:id')
  @RequirePermissions('manpower_plan.view')
  @ApiOperation({ summary: 'Get manpower plan by id' })
  getPlan(@Param('id') id: string) {
    return this.manpowerService.getPlanById(id);
  }

  @Patch('plans/:id')
  @RequirePermissions('manpower_plan.manage')
  @ApiOperation({ summary: 'Update daily manpower plan' })
  updatePlan(
    @Param('id') id: string,
    @Body() dto: UpdateManpowerDailyPlanDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.manpowerService.updatePlan(id, dto, actor.id);
  }

  @Get('shortfall-alerts')
  @RequirePermissions('manpower_shortfall.view')
  @ApiOperation({ summary: 'List manpower shortfall alerts' })
  listAlerts(@Query() query: ListShortfallAlertsQueryDto) {
    return this.manpowerService.listShortfallAlerts(query);
  }

  @Post('shortfall-alerts/evaluate')
  @RequirePermissions('manpower_shortfall.acknowledge')
  @ApiOperation({ summary: 'Evaluate contractor manpower shortfall alerts' })
  evaluate(@Query() query: EvaluateShortfallQueryDto) {
    return this.manpowerService.evaluateShortfallAlerts(query);
  }

  @Post('shortfall-alerts/:id/acknowledge')
  @RequirePermissions('manpower_shortfall.acknowledge')
  @ApiOperation({ summary: 'Acknowledge a manpower shortfall alert' })
  acknowledge(
    @Param('id') id: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.manpowerService.acknowledgeShortfallAlert(id, actor.id);
  }
}
