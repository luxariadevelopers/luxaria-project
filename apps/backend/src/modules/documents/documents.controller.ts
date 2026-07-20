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
import { DocumentsService } from './documents.service';
import {
  ConfirmUploadDto,
  PresignUploadDto,
} from './dto/presign-upload.dto';
import { DocumentStatus } from './schemas/document.schema';

@ApiTags('Documents (S3)')
@ApiBearerAuth()
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('presign-upload')
  @RequirePermissions('document.upload')
  @ApiOperation({
    summary: 'Generate private S3 presigned upload URL',
    description:
      'Validates MIME + size. File extension is derived from MIME, never from the client name.',
  })
  presignUpload(
    @Body() dto: PresignUploadDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.documentsService.createPresignedUpload(dto, actor.id);
  }

  @Post(':id/confirm-upload')
  @RequirePermissions('document.upload')
  @ApiOperation({ summary: 'Confirm upload after client PUT to S3' })
  confirmUpload(
    @Param('id') id: string,
    @Body() dto: ConfirmUploadDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.documentsService.confirmUpload(id, dto, actor.id);
  }

  @Get(':id/download-url')
  @RequirePermissions('document.download')
  @ApiOperation({ summary: 'Generate private S3 presigned download URL' })
  downloadUrl(@Param('id') id: string) {
    return this.documentsService.createPresignedDownload(id);
  }

  @Post(':id/replace')
  @RequirePermissions('document.replace')
  @ApiOperation({
    summary: 'Replace document (new version + new presigned upload URL)',
  })
  replace(
    @Param('id') id: string,
    @Body() dto: PresignUploadDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.documentsService.replaceDocument(id, dto, actor.id);
  }

  @Post(':id/archive')
  @RequirePermissions('document.archive')
  @ApiOperation({ summary: 'Archive document' })
  archive(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.documentsService.archiveDocument(id, actor.id);
  }

  @Get()
  @RequirePermissions('document.view')
  @ApiOperation({ summary: 'List documents for an entity' })
  list(
    @Query()
    query: PaginationQueryDto & {
      entityType: string;
      entityId: string;
      module?: string;
      projectId?: string;
      status?: DocumentStatus;
    },
  ) {
    return this.documentsService.listEntityDocuments(query);
  }

  @Get(':id')
  @RequirePermissions('document.view')
  @ApiOperation({ summary: 'View document metadata' })
  getById(@Param('id') id: string) {
    return this.documentsService.getById(id);
  }
}
