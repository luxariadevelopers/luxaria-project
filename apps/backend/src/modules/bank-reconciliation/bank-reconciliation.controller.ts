import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { createSecureMulterOptions } from '../../common/security/file-upload.util';
import { STATEMENT_IMPORT_MIME_TYPES } from '../../common/security/security.constants';
import type { AuthUser } from '../auth/types/auth-user.type';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { BankStatementLineStatus } from './bank-reconciliation.constants';
import { BankReconciliationService } from './bank-reconciliation.service';
import {
  AutoMatchDto,
  CreateReconciliationSessionDto,
  ManualMatchDto,
  PostAdjustmentDto,
  StatementColumnMappingDto,
  UpdateColumnMappingDto,
} from './dto/bank-reconciliation.dto';

@ApiTags('Bank Reconciliation')
@ApiBearerAuth()
@Controller('bank-reconciliation')
export class BankReconciliationController {
  constructor(private readonly service: BankReconciliationService) {}

  @Post('sessions')
  @RequirePermissions('bank_reconciliation.manage')
  @ApiOperation({ summary: 'Create a bank reconciliation session' })
  createSession(
    @Body() dto: CreateReconciliationSessionDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.createSession(dto, actor.id);
  }

  @Get('sessions')
  @RequirePermissions('bank_reconciliation.view')
  @ApiOperation({ summary: 'List reconciliation sessions' })
  listSessions(@Query('bankAccountId') bankAccountId?: string) {
    return this.service.listSessions(bankAccountId);
  }

  @Get('sessions/:sessionId')
  @RequirePermissions('bank_reconciliation.view')
  @ApiOperation({ summary: 'Get reconciliation session summary' })
  getSession(@Param('sessionId') sessionId: string) {
    return this.service.getSession(sessionId);
  }

  @Post('sessions/:sessionId/import')
  @RequirePermissions('bank_reconciliation.import')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        columnMapping: { type: 'string', description: 'JSON column mapping' },
        replaceExisting: { type: 'boolean' },
      },
      required: ['file', 'columnMapping'],
    },
  })
  @UseInterceptors(
    FileInterceptor(
      'file',
      createSecureMulterOptions({
        maxBytes: 10 * 1024 * 1024,
        allowedMimeTypes: STATEMENT_IMPORT_MIME_TYPES,
        allowedExtensions: ['csv', 'txt', 'xls', 'xlsx'],
      }),
    ),
  )
  @ApiOperation({ summary: 'Import bank statement CSV or Excel' })
  importStatement(
    @Param('sessionId') sessionId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('columnMapping') columnMappingRaw: string,
    @Body('replaceExisting') replaceExistingRaw: string | boolean | undefined,
    @CurrentUser() actor: AuthUser,
  ) {
    const mapping = this.parseMapping(columnMappingRaw);
    const replaceExisting =
      replaceExistingRaw === true ||
      replaceExistingRaw === 'true' ||
      replaceExistingRaw === '1';
    return this.service.importStatement(
      sessionId,
      file,
      mapping,
      actor.id,
      replaceExisting,
    );
  }

  @Patch('sessions/:sessionId/column-mapping')
  @RequirePermissions('bank_reconciliation.manage')
  @ApiOperation({ summary: 'Update saved statement column mapping' })
  updateColumnMapping(
    @Param('sessionId') sessionId: string,
    @Body() dto: UpdateColumnMappingDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.updateColumnMapping(
      sessionId,
      dto.columnMapping,
      actor.id,
    );
  }

  @Get('sessions/:sessionId/lines')
  @RequirePermissions('bank_reconciliation.view')
  @ApiOperation({ summary: 'List imported statement lines' })
  listLines(
    @Param('sessionId') sessionId: string,
    @Query('status') status?: BankStatementLineStatus,
  ) {
    return this.service.listStatementLines(sessionId, status);
  }

  @Get('sessions/:sessionId/unmatched')
  @RequirePermissions('bank_reconciliation.view')
  @ApiOperation({ summary: 'List unmatched statement and book lines' })
  listUnmatched(@Param('sessionId') sessionId: string) {
    return this.service.listUnmatched(sessionId);
  }

  @Post('sessions/:sessionId/auto-match')
  @RequirePermissions('bank_reconciliation.match')
  @ApiOperation({
    summary: 'Auto-match by transaction ID, cheque, amount, and date',
  })
  autoMatch(
    @Param('sessionId') sessionId: string,
    @Body() dto: AutoMatchDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.autoMatch(sessionId, dto ?? {}, actor.id);
  }

  @Post('sessions/:sessionId/match')
  @RequirePermissions('bank_reconciliation.match')
  @ApiOperation({ summary: 'Manually match statement lines to book lines' })
  manualMatch(
    @Param('sessionId') sessionId: string,
    @Body() dto: ManualMatchDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.manualMatch(sessionId, dto, actor.id);
  }

  @Post('sessions/:sessionId/matches/:matchId/unmatch')
  @RequirePermissions('bank_reconciliation.match')
  @ApiOperation({
    summary: 'Undo a match (keeps match history for traceability)',
  })
  unmatch(
    @Param('sessionId') sessionId: string,
    @Param('matchId') matchId: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.unmatch(sessionId, matchId, actor.id);
  }

  @Get('sessions/:sessionId/matches')
  @RequirePermissions('bank_reconciliation.view')
  @ApiOperation({ summary: 'List matches (including undone) for audit trail' })
  listMatches(@Param('sessionId') sessionId: string) {
    return this.service.listMatches(sessionId);
  }

  @Post('sessions/:sessionId/adjustments')
  @RequirePermissions('bank_reconciliation.post')
  @ApiOperation({
    summary: 'Post bank charges or interest and optionally link a statement line',
  })
  postAdjustment(
    @Param('sessionId') sessionId: string,
    @Body() dto: PostAdjustmentDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.postAdjustment(sessionId, dto, actor.id);
  }

  @Get('sessions/:sessionId/statement')
  @RequirePermissions('bank_reconciliation.view')
  @ApiOperation({ summary: 'Build reconciliation statement' })
  getStatement(@Param('sessionId') sessionId: string) {
    return this.service.getReconciliationStatement(sessionId);
  }

  @Post('sessions/:sessionId/complete')
  @RequirePermissions('bank_reconciliation.manage')
  @ApiOperation({ summary: 'Mark reconciliation session completed' })
  complete(
    @Param('sessionId') sessionId: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.completeSession(sessionId, actor.id);
  }

  private parseMapping(raw: string | StatementColumnMappingDto) {
    if (raw && typeof raw === 'object') {
      return raw as StatementColumnMappingDto;
    }
    if (typeof raw !== 'string' || !raw.trim()) {
      throw new BadRequestException('columnMapping JSON is required');
    }
    try {
      return JSON.parse(raw) as StatementColumnMappingDto;
    } catch {
      throw new BadRequestException('columnMapping must be valid JSON');
    }
  }
}
