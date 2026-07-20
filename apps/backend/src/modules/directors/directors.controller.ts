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
import { mkdirSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import type { AuthUser } from '../auth/types/auth-user.type';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { DirectorsService } from './directors.service';
import { ApproveShareholdingDto } from './dto/approve-shareholding.dto';
import { CreateDirectorDto } from './dto/create-director.dto';
import { ProposeShareholdingDto } from './dto/propose-shareholding.dto';
import { RejectShareholdingDto } from './dto/reject-shareholding.dto';
import { UpdateDirectorDto } from './dto/update-director.dto';
import { ShareholdingService } from './shareholding.service';
import { DirectorDocumentCategory } from './schemas/director-document.schema';
import { DirectorStatus } from './schemas/director.schema';
import { ShareholdingChangeStatus } from './schemas/shareholding-change-request.schema';

const DOC_UPLOAD_DIR = join(process.cwd(), 'uploads', 'directors');

type UploadedDoc = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
};

@ApiTags('Directors & Shareholding')
@ApiBearerAuth()
@Controller()
export class DirectorsController {
  constructor(
    private readonly directorsService: DirectorsService,
    private readonly shareholdingService: ShareholdingService,
  ) {}

  @Post('directors')
  @RequirePermissions('director.create')
  @ApiOperation({ summary: 'Create director' })
  createDirector(@Body() dto: CreateDirectorDto, @CurrentUser() actor: AuthUser) {
    return this.directorsService.create(dto, actor.id);
  }

  @Get('directors')
  @RequirePermissions('director.view')
  @ApiOperation({ summary: 'List directors' })
  listDirectors(
    @Query()
    query: PaginationQueryDto & {
      search?: string;
      status?: DirectorStatus;
      companyId?: string;
    },
  ) {
    return this.directorsService.list(query);
  }

  @Get('directors/:id')
  @RequirePermissions('director.view')
  @ApiOperation({ summary: 'View director' })
  getDirector(@Param('id') id: string) {
    return this.directorsService.getById(id);
  }

  @Patch('directors/:id')
  @RequirePermissions('director.update')
  @ApiOperation({ summary: 'Update director' })
  updateDirector(
    @Param('id') id: string,
    @Body() dto: UpdateDirectorDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.directorsService.update(id, dto, actor.id);
  }

  @Post('directors/:id/documents')
  @RequirePermissions('director.upload_document')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        category: { type: 'string', enum: Object.values(DirectorDocumentCategory) },
      },
      required: ['file'],
    },
  })
  @ApiOperation({ summary: 'Upload director document' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  uploadDocument(
    @Param('id') id: string,
    @UploadedFile() file: UploadedDoc | undefined,
    @Body('category') category: DirectorDocumentCategory | undefined,
    @CurrentUser() actor: AuthUser,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('Document file is required');
    }
    mkdirSync(join(DOC_UPLOAD_DIR, id), { recursive: true });
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filename = `${Date.now()}-${safeName || `file${extname(file.originalname) || '.bin'}`}`;
    const relativePath = `uploads/directors/${id}/${filename}`;
    writeFileSync(join(process.cwd(), relativePath), file.buffer);

    return this.directorsService.addDocument(
      id,
      {
        fileName: file.originalname,
        filePath: relativePath,
        mimeType: file.mimetype ?? null,
        sizeBytes: file.size ?? file.buffer.length,
        category,
      },
      actor.id,
    );
  }

  @Get('directors/:id/documents')
  @RequirePermissions('director.view')
  @ApiOperation({ summary: 'List director documents' })
  listDocuments(@Param('id') id: string, @Query() query: PaginationQueryDto) {
    return this.directorsService.listDocuments(id, query);
  }

  @Get('company-shareholding')
  @RequirePermissions('shareholding.view')
  @ApiOperation({
    summary: 'Active company shareholding (equity — not project investment)',
  })
  listActiveShareholding(@Query('companyId') companyId?: string) {
    return this.shareholdingService.listActive(companyId);
  }

  @Get('company-shareholding/history')
  @RequirePermissions('shareholding.view')
  @ApiOperation({ summary: 'Versioned company shareholding history (append-only)' })
  listShareholdingHistory(
    @Query()
    query: PaginationQueryDto & { companyId?: string; directorId?: string },
  ) {
    return this.shareholdingService.listHistory(query);
  }

  @Post('company-shareholding/change-requests')
  @RequirePermissions('shareholding.propose')
  @ApiOperation({
    summary: 'Propose shareholding change (requires approval; must total 100%)',
  })
  propose(
    @Body() dto: ProposeShareholdingDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.shareholdingService.propose(dto, actor.id);
  }

  @Get('company-shareholding/change-requests')
  @RequirePermissions('shareholding.view')
  @ApiOperation({ summary: 'List shareholding change requests' })
  listChangeRequests(
    @Query()
    query: PaginationQueryDto & {
      companyId?: string;
      status?: ShareholdingChangeStatus;
    },
  ) {
    return this.shareholdingService.listChangeRequests(query);
  }

  @Post('company-shareholding/change-requests/:requestId/approve')
  @RequirePermissions('shareholding.approve')
  @ApiOperation({
    summary: 'Approve change — closes prior versions and inserts a new version (no overwrite)',
  })
  approve(
    @Param('requestId') requestId: string,
    @Body() dto: ApproveShareholdingDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.shareholdingService.approve(requestId, dto, actor.id);
  }

  @Post('company-shareholding/change-requests/:requestId/reject')
  @RequirePermissions('shareholding.approve')
  @ApiOperation({ summary: 'Reject shareholding change request' })
  reject(
    @Param('requestId') requestId: string,
    @Body() dto: RejectShareholdingDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.shareholdingService.reject(requestId, dto, actor.id);
  }
}
