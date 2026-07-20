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
import {
  CreateParticipantDto,
  CreateParticipantVersionDto,
} from './dto/create-participant.dto';
import { RejectParticipantDto } from './dto/reject-participant.dto';
import { UpdateParticipantDto } from './dto/update-participant.dto';
import { ProjectParticipantsService } from './project-participants.service';
import { ParticipantDocumentCategory } from './schemas/project-participant-document.schema';
import { ParticipantApprovalStatus } from './schemas/project-participant.schema';
import { ProjectScoped } from '../project-access/decorators/route-scope.decorator';

const DOC_UPLOAD_DIR = join(process.cwd(), 'uploads', 'project-participants');

type UploadedDoc = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
};

@ProjectScoped({
  mode: 'filter',
  resource: { resourceType: 'project-participant', idParam: 'id' },
  operation: 'read',
})
@ApiTags('Project Participants')
@ApiBearerAuth()
@Controller('projects/:projectId/participants')
export class ProjectParticipantsController {
  constructor(private readonly service: ProjectParticipantsService) {}

  @Post()
  @RequirePermissions('project_participant.create')
  @ApiOperation({
    summary: 'Create project participant (draft)',
    description:
      'Project profit share is independent of company shareholding.',
  })
  create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateParticipantDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.create(projectId, dto, actor.id);
  }

  @Get()
  @RequirePermissions('project_participant.view')
  @ApiOperation({ summary: 'List active approved participants' })
  listActive(@Param('projectId') projectId: string) {
    return this.service.listActive(projectId);
  }

  @Get('history')
  @RequirePermissions('project_participant.view')
  @ApiOperation({ summary: 'Versioned participant history (append-only)' })
  listHistory(
    @Param('projectId') projectId: string,
    @Query()
    query: PaginationQueryDto & {
      participantKey?: string;
      status?: ParticipantApprovalStatus;
    },
  ) {
    return this.service.listHistory(projectId, query);
  }

  @Get('configuration')
  @RequirePermissions('project_participant.view')
  @ApiOperation({ summary: 'Profit-share configuration / finalisation status' })
  getConfiguration(@Param('projectId') projectId: string) {
    return this.service.getConfiguration(projectId);
  }

  @Post('finalize')
  @RequirePermissions('project_participant.finalize')
  @ApiOperation({
    summary: 'Finalise configuration (active profit shares must total 100%)',
  })
  finalize(
    @Param('projectId') projectId: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.finalize(projectId, actor.id);
  }

  @Post('unfinalize')
  @RequirePermissions('project_participant.finalize')
  @ApiOperation({ summary: 'Unfinalise configuration to allow new drafts' })
  unfinalize(
    @Param('projectId') projectId: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.unfinalize(projectId, actor.id);
  }

  @Get(':recordId')
  @RequirePermissions('project_participant.view')
  @ApiOperation({ summary: 'View participant record / version' })
  getById(
    @Param('projectId') projectId: string,
    @Param('recordId') recordId: string,
  ) {
    return this.service.getById(projectId, recordId);
  }

  @Patch(':recordId')
  @RequirePermissions('project_participant.update')
  @ApiOperation({ summary: 'Update draft participant only' })
  updateDraft(
    @Param('projectId') projectId: string,
    @Param('recordId') recordId: string,
    @Body() dto: UpdateParticipantDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.updateDraft(projectId, recordId, dto, actor.id);
  }

  @Post(':recordId/versions')
  @RequirePermissions('project_participant.create')
  @ApiOperation({
    summary: 'Create new version (profit-share changes; history preserved)',
  })
  createVersion(
    @Param('projectId') projectId: string,
    @Param('recordId') recordId: string,
    @Body() dto: CreateParticipantVersionDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.createVersion(projectId, recordId, dto, actor.id);
  }

  @Post(':recordId/submit')
  @RequirePermissions('project_participant.submit')
  @ApiOperation({ summary: 'Submit draft for approval' })
  submit(
    @Param('projectId') projectId: string,
    @Param('recordId') recordId: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.submit(projectId, recordId, actor.id);
  }

  @Post(':recordId/approve')
  @RequirePermissions('project_participant.approve')
  @ApiOperation({
    summary: 'Approve submitted version (closes prior version; no overwrite)',
  })
  approve(
    @Param('projectId') projectId: string,
    @Param('recordId') recordId: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.approve(projectId, recordId, actor.id);
  }

  @Post(':recordId/reject')
  @RequirePermissions('project_participant.approve')
  @ApiOperation({ summary: 'Reject submitted version' })
  reject(
    @Param('projectId') projectId: string,
    @Param('recordId') recordId: string,
    @Body() dto: RejectParticipantDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.reject(projectId, recordId, dto, actor.id);
  }

  @Post(':recordId/documents')
  @RequirePermissions('project_participant.upload_document')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        category: {
          type: 'string',
          enum: Object.values(ParticipantDocumentCategory),
        },
      },
      required: ['file'],
    },
  })
  @ApiOperation({ summary: 'Upload agreement document' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  uploadDocument(
    @Param('projectId') projectId: string,
    @Param('recordId') recordId: string,
    @UploadedFile() file: UploadedDoc | undefined,
    @Body('category') category: ParticipantDocumentCategory | undefined,
    @CurrentUser() actor: AuthUser,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('Document file is required');
    }
    mkdirSync(join(DOC_UPLOAD_DIR, projectId, recordId), { recursive: true });
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filename = `${Date.now()}-${safeName || `file${extname(file.originalname) || '.bin'}`}`;
    const relativePath = `uploads/project-participants/${projectId}/${recordId}/${filename}`;
    writeFileSync(join(process.cwd(), relativePath), file.buffer);

    return this.service.addDocument(
      projectId,
      recordId,
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

  @Get(':recordId/documents')
  @RequirePermissions('project_participant.view')
  @ApiOperation({ summary: 'List participant documents' })
  listDocuments(
    @Param('projectId') projectId: string,
    @Param('recordId') recordId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.service.listDocuments(projectId, recordId, query);
  }
}
