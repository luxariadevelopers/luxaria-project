import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import type { AuthUser } from '../auth/types/auth-user.type';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import {
  ApprovePaymentScheduleDto,
  GenerateDemandDto,
  GeneratePaymentScheduleDto,
  ListPaymentSchedulesQueryDto,
  MarkDueDto,
  RejectPaymentScheduleDto,
  RevisePaymentScheduleDto,
} from './dto/payment-schedule.dto';
import { PaymentSchedulesService } from './payment-schedules.service';

@ApiTags('Payment Schedules')
@ApiBearerAuth()
@Controller('payment-schedules')
export class PaymentSchedulesController {
  constructor(
    private readonly paymentSchedulesService: PaymentSchedulesService,
  ) {}

  @Post('generate')
  @RequirePermissions('collection.create')
  @ApiOperation({ summary: 'Generate customer payment schedule from booking' })
  generate(
    @Body() dto: GeneratePaymentScheduleDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.paymentSchedulesService.generate(dto, actor.id);
  }

  @Get()
  @RequirePermissions('collection.view')
  @ApiOperation({ summary: 'List payment schedules' })
  list(@Query() query: ListPaymentSchedulesQueryDto) {
    return this.paymentSchedulesService.list(query);
  }

  @Get('overdue')
  @RequirePermissions('collection.view')
  @ApiOperation({ summary: 'List overdue schedule lines' })
  listOverdue(@Query() query: PaginationQueryDto) {
    return this.paymentSchedulesService.listOverdue(query);
  }

  @Post('jobs/mark-overdue')
  @RequirePermissions('collection.approve')
  @ApiOperation({ summary: 'Manually run overdue marking job' })
  markOverdue() {
    return this.paymentSchedulesService.markOverdue();
  }

  @Get(':id')
  @RequirePermissions('collection.view')
  @ApiOperation({ summary: 'Get payment schedule by id' })
  getById(@Param('id') id: string) {
    return this.paymentSchedulesService.getById(id);
  }

  @Post(':id/submit-approval')
  @RequirePermissions('collection.create')
  @ApiOperation({ summary: 'Submit schedule for approval' })
  submitForApproval(
    @Param('id') id: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.paymentSchedulesService.submitForApproval(id, actor.id);
  }

  @Post(':id/approve')
  @RequirePermissions('collection.approve')
  @ApiOperation({ summary: 'Approve payment schedule (activates it)' })
  approve(
    @Param('id') id: string,
    @Body() dto: ApprovePaymentScheduleDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.paymentSchedulesService.approve(id, dto, actor.id);
  }

  @Post(':id/reject')
  @RequirePermissions('collection.approve')
  @ApiOperation({ summary: 'Reject payment schedule' })
  reject(
    @Param('id') id: string,
    @Body() dto: RejectPaymentScheduleDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.paymentSchedulesService.reject(id, dto, actor.id);
  }

  @Post(':id/revise')
  @RequirePermissions('collection.create')
  @ApiOperation({
    summary: 'Revise active schedule (new version; requires re-approval)',
  })
  revise(
    @Param('id') id: string,
    @Body() dto: RevisePaymentScheduleDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.paymentSchedulesService.revise(id, dto, actor.id);
  }

  @Post(':id/mark-due')
  @RequirePermissions('collection.create')
  @ApiOperation({ summary: 'Mark a schedule line as due' })
  markDue(
    @Param('id') id: string,
    @Body() dto: MarkDueDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.paymentSchedulesService.markDue(id, dto, actor.id);
  }

  @Post(':id/demands')
  @RequirePermissions('collection.create')
  @ApiOperation({ summary: 'Generate demand letter for a schedule line' })
  generateDemand(
    @Param('id') id: string,
    @Body() dto: GenerateDemandDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.paymentSchedulesService.generateDemand(id, dto, actor.id);
  }
}
