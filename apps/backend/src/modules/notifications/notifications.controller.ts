import {
  Body,
  Controller,
  Delete,
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
  ListPushTokensQueryDto,
  RegisterPushTokenDto,
  RetryDeliveryDto,
  ScheduleNotificationDto,
  SendNotificationDto,
  UnregisterPushTokenDto,
  UpdatePreferencesDto,
  UpsertTemplateDto,
} from './dto/notification.dto';
import { PushTokenService } from './push-token.service';
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
    private readonly pushTokenService: PushTokenService,
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

  @Post('push-tokens')
  @RequirePermissions('notification.view')
  @ApiOperation({ summary: 'Register an Expo push token for the current user' })
  registerPushToken(
    @CurrentUser() actor: AuthUser,
    @Body() dto: RegisterPushTokenDto,
  ) {
    return this.pushTokenService.register(actor.id, dto);
  }

  @Delete('push-tokens')
  @RequirePermissions('notification.view')
  @ApiOperation({ summary: 'Unregister an Expo push token for the current user' })
  unregisterPushToken(
    @CurrentUser() actor: AuthUser,
    @Body() dto: UnregisterPushTokenDto,
  ) {
    return this.pushTokenService.unregister(actor.id, dto);
  }

  @Get('push-tokens/mine')
  @RequirePermissions('notification.view')
  @ApiOperation({ summary: 'List active push tokens for the current user' })
  listMyPushTokens(@CurrentUser() actor: AuthUser) {
    return this.pushTokenService.listMine(actor.id);
  }

  @Get('push-tokens')
  @RequirePermissions('notification.manage')
  @ApiOperation({ summary: 'List push tokens (admin)' })
  listPushTokens(@Query() query: ListPushTokensQueryDto) {
    return this.pushTokenService.listAdmin(query);
  }

  @Delete('push-tokens/:id')
  @RequirePermissions('notification.manage')
  @ApiOperation({ summary: 'Revoke a push token by id (admin)' })
  revokePushToken(@Param('id') id: string) {
    return this.pushTokenService.revokeById(id);
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
