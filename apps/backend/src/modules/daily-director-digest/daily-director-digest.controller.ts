import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { DailyDirectorDigestScheduler } from './daily-director-digest.scheduler';
import { DailyDirectorDigestService } from './daily-director-digest.service';
import { GlobalScope } from '../project-access/decorators/route-scope.decorator';
import {
  PreviewDigestQueryDto,
  RunDigestDto,
  SendDigestDto,
} from './dto/digest.dto';

@GlobalScope()
@ApiTags('Director Digest')
@ApiBearerAuth()
@Controller('director-digest')
export class DailyDirectorDigestController {
  constructor(
    private readonly digestService: DailyDirectorDigestService,
    private readonly scheduler: DailyDirectorDigestScheduler,
  ) {}

  @Get('preview')
  @RequirePermissions('director_digest.view')
  @ApiOperation({
    summary: 'Preview daily director digest (defaults to yesterday / current user)',
  })
  preview(
    @Query() query: PreviewDigestQueryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.digestService.preview(query, actor.id);
  }

  @Get('preview-all')
  @RequirePermissions('director_digest.send')
  @ApiOperation({ summary: 'Preview digests for all director recipients' })
  previewAll(@Query('date') date?: string) {
    return this.digestService.previewAll(date);
  }

  @Post('send')
  @RequirePermissions('director_digest.send')
  @ApiOperation({
    summary: 'Manually generate and send digests (in-app, email, push)',
  })
  send(@Body() dto: SendDigestDto, @CurrentUser() actor: AuthUser) {
    return this.digestService.send(dto, actor.id);
  }

  @Post('run')
  @RequirePermissions('director_digest.send')
  @ApiOperation({
    summary: 'Trigger the morning digest job (queued via BullMQ when Redis enabled)',
  })
  run(@Body() dto: RunDigestDto) {
    return this.scheduler.enqueueOrRun(dto);
  }
}
