import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
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
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { mkdirSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import type { AuthUser } from '../auth/types/auth-user.type';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { ContributionReceiptsService } from './contribution-receipts.service';
import {
  CancelContributionReceiptDto,
  CreateContributionReceiptDto,
} from './dto/create-contribution-receipt.dto';
import { ContributionReceiptStatus } from './schemas/contribution-receipt.schema';

const DOC_UPLOAD_DIR = join(process.cwd(), 'uploads', 'contribution-receipts');

type UploadedDoc = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
};

@ApiTags('Contribution Receipts')
@ApiBearerAuth()
@Controller('projects/:projectId/contribution-receipts')
export class ContributionReceiptsController {
  constructor(private readonly service: ContributionReceiptsService) {}

  @Post()
  @RequirePermissions('contribution_receipt.create')
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description: 'Stable client key for create retries',
  })
  @ApiOperation({ summary: 'Create contribution receipt (draft)' })
  create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateContributionReceiptDto,
    @CurrentUser() actor: AuthUser,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.service.create(projectId, dto, actor.id, idempotencyKey);
  }

  @Get()
  @RequirePermissions('contribution_receipt.view')
  @ApiOperation({ summary: 'List contribution receipts' })
  list(
    @Param('projectId') projectId: string,
    @Query()
    query: PaginationQueryDto & {
      participantId?: string;
      commitmentId?: string;
      status?: ContributionReceiptStatus;
    },
  ) {
    return this.service.list(projectId, query);
  }

  @Get('balances')
  @RequirePermissions('contribution_receipt.view')
  @ApiOperation({ summary: 'Project / participant contribution balances' })
  balances(
    @Param('projectId') projectId: string,
    @Query('participantId') participantId?: string,
  ) {
    return this.service.getBalances(projectId, participantId);
  }

  @Get(':id')
  @RequirePermissions('contribution_receipt.view')
  @ApiOperation({ summary: 'View contribution receipt' })
  getById(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    return this.service.getById(projectId, id);
  }

  @Post(':id/submit')
  @RequirePermissions('contribution_receipt.submit')
  @ApiOperation({ summary: 'Submit receipt' })
  submit(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.submit(projectId, id, actor.id);
  }

  @Post(':id/verify')
  @RequirePermissions('contribution_receipt.verify')
  @ApiOperation({ summary: 'Verify submitted receipt' })
  verify(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.verify(projectId, id, actor.id);
  }

  @Post(':id/post')
  @RequirePermissions('contribution_receipt.post')
  @ApiOperation({
    summary: 'Post verified receipt (balances + PDF; accounting later)',
  })
  post(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.post(projectId, id, actor.id);
  }

  @Post(':id/cancel')
  @RequirePermissions('contribution_receipt.cancel')
  @ApiOperation({ summary: 'Cancel draft/submitted/verified receipt' })
  cancel(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: CancelContributionReceiptDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.cancel(projectId, id, dto, actor.id);
  }

  @Post(':id/document')
  @RequirePermissions('contribution_receipt.upload_document')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @ApiOperation({ summary: 'Upload receipt supporting document' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  uploadDocument(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @UploadedFile() file: UploadedDoc | undefined,
    @CurrentUser() actor: AuthUser,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('Document file is required');
    }
    mkdirSync(join(DOC_UPLOAD_DIR, projectId, id), { recursive: true });
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filename = `${Date.now()}-${safeName || `file${extname(file.originalname) || '.bin'}`}`;
    const relativePath = `uploads/contribution-receipts/${projectId}/${id}/${filename}`;
    writeFileSync(join(process.cwd(), relativePath), file.buffer);
    return this.service.attachDocument(projectId, id, relativePath, actor.id);
  }
}
