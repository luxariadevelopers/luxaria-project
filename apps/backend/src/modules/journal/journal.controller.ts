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
  CancelJournalDto,
  CreateJournalDto,
  ListJournalsQueryDto,
  ReverseJournalDto,
  UpdateJournalDto,
} from './dto/journal.dto';
import { JournalService } from './journal.service';
import { ProjectScoped } from '../project-access/decorators/route-scope.decorator';

@ProjectScoped({
  mode: 'filter',
  resource: { resourceType: 'journal', idParam: 'id' },
  operation: 'read',
})
@ApiTags('Journal')
@ApiBearerAuth()
@Controller('journals')
export class JournalController {
  constructor(private readonly journalService: JournalService) {}

  @Post()
  @RequirePermissions('journal.create')
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description: 'Prevents duplicate journal creation',
  })
  @ApiOperation({ summary: 'Create journal entry (draft; optional immediate post)' })
  create(
    @Body() dto: CreateJournalDto,
    @CurrentUser() actor: AuthUser,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.journalService.create(dto, actor.id, idempotencyKey);
  }

  @Get()
  @RequirePermissions('journal.view')
  @ApiOperation({ summary: 'List journal entries' })
  list(
    @Query() query: ListJournalsQueryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.journalService.list(query, actor.id);
  }

  @Get(':id')
  @RequirePermissions('journal.view')
  @ApiOperation({ summary: 'Get journal entry' })
  getById(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.journalService.getById(id, actor.id);
  }

  @Patch(':id')
  @RequirePermissions('journal.create')
  @ApiOperation({ summary: 'Update draft / pending-approval journal' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateJournalDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.journalService.update(id, dto, actor.id);
  }

  @Post(':id/submit')
  @RequirePermissions('journal.create')
  @ApiOperation({ summary: 'Submit journal for approval' })
  submit(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.journalService.submitForApproval(id, actor.id);
  }

  @Post(':id/post')
  @RequirePermissions('journal.post')
  @ApiOperation({ summary: 'Post journal (immutable thereafter)' })
  post(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.journalService.post(id, actor.id);
  }

  @Post(':id/reverse')
  @RequirePermissions('journal.reverse')
  @ApiOperation({ summary: 'Reverse a posted journal (creates balancing entry)' })
  reverse(
    @Param('id') id: string,
    @Body() dto: ReverseJournalDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.journalService.reverse(id, actor.id, dto);
  }

  @Post(':id/cancel')
  @RequirePermissions('journal.create')
  @ApiOperation({ summary: 'Cancel draft / pending-approval journal' })
  cancel(
    @Param('id') id: string,
    @Body() dto: CancelJournalDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.journalService.cancel(id, actor.id, dto);
  }
}
