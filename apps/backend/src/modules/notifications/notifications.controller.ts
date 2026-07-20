import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import {
  ListDeliveryLogsQueryDto,
  ListNotificationsQueryDto,
  RetryDeliveryDto,
  ScheduleNotificationDto,
  SendNotificationDto,
  UpdatePreferencesDto,
  UpsertTemplateDto,
} from './dto/notification.dto';
import { ScheduledNotificationStatus } from './notifications.constants';
import { NotificationsScheduler } from './notifications.scheduler';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly scheduler: NotificationsScheduler,
  ) {}

  @Get()
  @RequirePermissions('notification.view')
  @ApiOperation({ summary: 'List current user in-app notifications' })
  listInbox(
    @CurrentUser() actor: AuthUser,
    @Query() query: ListNotificationsQueryDto,
  ) {
    return this.notificationsService.listInbox(actor.id, query);
  }

  @Patch(':id/read')
  @RequirePermissions('notification.view')
  @ApiOperation({ summary: 'Mark a notification as read' })
  markRead(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.notificationsService.markRead(id, actor.id);
  }

  @Post('read-all')
  @RequirePermissions('notification.view')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllRead(@CurrentUser() actor: AuthUser) {
    return this.notificationsService.markAllRead(actor.id);
  }

  @Get('preferences')
  @RequirePermissions('notification.view')
  @ApiOperation({ summary: 'Get notification channel/event preferences' })
  getPreferences(@CurrentUser() actor: AuthUser) {
    return this.notificationsService.getPreferences(actor.id);
  }

  @Put('preferences')
  @RequirePermissions('notification.view')
  @ApiOperation({ summary: 'Update notification preferences' })
  updatePreferences(
    @CurrentUser() actor: AuthUser,
    @Body() dto: UpdatePreferencesDto,
  ) {
    return this.notificationsService.updatePreferences(actor.id, dto);
  }

  @Post('send')
  @RequirePermissions('notification.send')
  @ApiOperation({ summary: 'Send a notification now (queued via BullMQ when Redis enabled)' })
  send(@Body() dto: SendNotificationDto, @CurrentUser() actor: AuthUser) {
    return this.notificationsService.send(dto, actor.id);
  }

  @Post('schedule')
  @RequirePermissions('notification.send')
  @ApiOperation({ summary: 'Schedule a notification for later delivery' })
  schedule(
    @Body() dto: ScheduleNotificationDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.notificationsService.schedule(dto, actor.id);
  }

  @Get('scheduled')
  @RequirePermissions('notification.manage')
  @ApiOperation({ summary: 'List scheduled notifications' })
  listScheduled(@Query('status') status?: ScheduledNotificationStatus) {
    return this.notificationsService.listScheduled(status);
  }

  @Post('scheduled/process')
  @RequirePermissions('notification.manage')
  @ApiOperation({
    summary: 'Process due scheduled notifications now (queue or inline)',
  })
  processScheduled() {
    return this.scheduler.enqueueOrProcessScheduled();
  }

  @Get('templates')
  @RequirePermissions('notification.manage')
  @ApiOperation({ summary: 'List notification templates' })
  listTemplates() {
    return this.notificationsService.listTemplates();
  }

  @Put('templates')
  @RequirePermissions('notification.manage')
  @ApiOperation({ summary: 'Create or update a notification template' })
  upsertTemplate(@Body() dto: UpsertTemplateDto) {
    return this.notificationsService.upsertTemplate(dto);
  }

  @Get('delivery-logs')
  @RequirePermissions('notification.manage')
  @ApiOperation({ summary: 'List notification delivery logs' })
  listDeliveryLogs(@Query() query: ListDeliveryLogsQueryDto) {
    return this.notificationsService.listDeliveryLogs(query);
  }

  @Post('delivery-logs/:id/retry')
  @RequirePermissions('notification.manage')
  @ApiOperation({ summary: 'Retry a failed/skipped delivery' })
  retry(
    @Param('id') id: string,
    @Body() dto: RetryDeliveryDto,
  ) {
    return this.notificationsService.retryDelivery(id, dto.force);
  }
}
