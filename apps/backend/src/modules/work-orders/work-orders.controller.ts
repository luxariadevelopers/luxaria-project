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
  CancelWorkOrderDto,
  CreateWorkOrderAmendmentDto,
  CreateWorkOrderDto,
  ListWorkOrderAmendmentsQueryDto,
  ListWorkOrdersQueryDto,
  RejectWorkOrderAmendmentDto,
  UpdateWorkOrderDto,
} from './dto/work-order.dto';
import { WorkOrdersService } from './work-orders.service';

@ProjectScoped({
  mode: 'filter',
  resource: { resourceType: 'work-order', idParam: 'id' },
  operation: 'read',
})
@ApiTags('Work Orders')
@ApiBearerAuth()
@Controller('work-orders')
export class WorkOrdersController {
  constructor(private readonly service: WorkOrdersService) {}

  @Post()
  @RequirePermissions('work_order.create')
  @ApiOperation({ summary: 'Create work order (draft)' })
  create(@Body() dto: CreateWorkOrderDto, @CurrentUser() actor: AuthUser) {
    return this.service.create(dto, actor.id);
  }

  @Get()
  @RequirePermissions('work_order.view')
  @ApiOperation({ summary: 'List work orders' })
  list(@Query() query: ListWorkOrdersQueryDto) {
    return this.service.list(query);
  }

  // Static amendment routes before `:id` to avoid param shadowing.
  @Get('amendments/:amendmentId')
  @RequirePermissions('work_order.view')
  @ApiOperation({ summary: 'Get amendment by id' })
  getAmendment(@Param('amendmentId') amendmentId: string) {
    return this.service.getAmendment(amendmentId);
  }

  @Post('amendments/:amendmentId/approve')
  @RequirePermissions('work_order.approve')
  @ApiOperation({
    summary:
      'Approve amendment — appends frozen revision; never overwrites prior approved snapshots',
  })
  approveAmendment(
    @Param('amendmentId') amendmentId: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.approveAmendment(amendmentId, actor.id);
  }

  @Post('amendments/:amendmentId/reject')
  @RequirePermissions('work_order.approve')
  @ApiOperation({ summary: 'Reject amendment (commercial snapshot unchanged)' })
  rejectAmendment(
    @Param('amendmentId') amendmentId: string,
    @Body() dto: RejectWorkOrderAmendmentDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.rejectAmendment(amendmentId, dto, actor.id);
  }

  @Get(':id')
  @RequirePermissions('work_order.view')
  @ApiOperation({ summary: 'Get work order (includes revision history)' })
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Patch(':id')
  @RequirePermissions('work_order.create')
  @ApiOperation({
    summary: 'Update draft work order (blocked after approval)',
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateWorkOrderDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.update(id, dto, actor.id);
  }

  @Post(':id/submit')
  @RequirePermissions('work_order.create')
  @ApiOperation({ summary: 'Submit for approval (draft → pending_approval)' })
  submit(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.submit(id, actor.id);
  }

  @Post(':id/approve')
  @RequirePermissions('work_order.approve')
  @ApiOperation({
    summary: 'Approve work order and freeze commercial revision 1',
  })
  approve(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.approve(id, actor.id);
  }

  @Post(':id/issue')
  @RequirePermissions('work_order.issue')
  @ApiOperation({ summary: 'Issue work order (approved → issued)' })
  issue(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.issue(id, actor.id);
  }

  @Post(':id/accept')
  @RequirePermissions('work_order.create')
  @ApiOperation({ summary: 'Accept work order (issued → accepted)' })
  accept(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.accept(id, actor.id);
  }

  @Post(':id/start')
  @RequirePermissions('work_order.create')
  @ApiOperation({ summary: 'Start progress (accepted → in_progress)' })
  start(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.startProgress(id, actor.id);
  }

  @Post(':id/partially-complete')
  @RequirePermissions('work_order.create')
  @ApiOperation({
    summary: 'Mark partially completed (in_progress → partially_completed)',
  })
  partiallyComplete(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.markPartiallyCompleted(id, actor.id);
  }

  @Post(':id/complete')
  @RequirePermissions('work_order.create')
  @ApiOperation({
    summary:
      'Complete work order (in_progress|partially_completed → completed)',
  })
  complete(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.complete(id, actor.id);
  }

  @Post(':id/close')
  @RequirePermissions('work_order.close')
  @ApiOperation({ summary: 'Close work order (completed → closed)' })
  close(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.close(id, actor.id);
  }

  @Post(':id/cancel')
  @RequirePermissions('work_order.close')
  @ApiOperation({ summary: 'Cancel work order (pre-acceptance statuses)' })
  cancel(
    @Param('id') id: string,
    @Body() dto: CancelWorkOrderDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.cancel(id, dto, actor.id);
  }

  @Post(':id/amendments')
  @RequirePermissions('work_order.create')
  @ApiOperation({
    summary:
      'Create amendment (quantity/rate/scope/time/value) — does not overwrite active commercial snapshot',
  })
  createAmendment(
    @Param('id') id: string,
    @Body() dto: CreateWorkOrderAmendmentDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.createAmendment(id, dto, actor.id);
  }

  @Get(':id/amendments')
  @RequirePermissions('work_order.view')
  @ApiOperation({ summary: 'List amendments for a work order' })
  listAmendments(
    @Param('id') id: string,
    @Query() query: ListWorkOrderAmendmentsQueryDto,
  ) {
    return this.service.listAmendments(id, query);
  }
}
