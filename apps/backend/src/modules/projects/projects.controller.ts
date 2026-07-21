import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
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
import { RequireProjectAccess } from '../project-access/decorators/require-project-access.decorator';
import {
  GlobalScope,
  ProjectScoped,
} from '../project-access/decorators/route-scope.decorator';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { PermissionsService } from '../rbac/permissions.service';
import { AssignDirectorsDto } from './dto/assign-directors.dto';
import { AssignProjectManagerDto } from './dto/assign-project-manager.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { ListProjectsQueryDto } from './dto/list-projects-query.dto';
import { UpdateProjectStatusDto } from './dto/update-project-status.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsService } from './projects.service';
import {
  ProjectDocumentCategory,
} from './schemas/project-document.schema';
import { ProjectStatus } from './schemas/project.schema';

const DOC_UPLOAD_DIR = join(process.cwd(), 'uploads', 'projects');

type UploadedDoc = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
};

@ProjectScoped({
  mode: 'filter',
  resource: { resourceType: 'project', idParam: 'id' },
  operation: 'read',
})
@ApiTags('Projects')
@ApiBearerAuth()
@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly permissionsService: PermissionsService,
  ) {}

  @Post()
  @GlobalScope()
  @RequirePermissions('project.create')
  @ApiOperation({ summary: 'Create project' })
  async create(@Body() dto: CreateProjectDto, @CurrentUser() actor: AuthUser) {
    if (
      dto.status === ProjectStatus.Closed ||
      dto.status === ProjectStatus.Cancelled
    ) {
      const allowed = await this.permissionsService.hasAllPermissions(actor.id, [
        'project.close',
      ]);
      if (!allowed) {
        throw new ForbiddenException(
          'project.close permission is required to create a closed or cancelled project',
        );
      }
    }
    return this.projectsService.create(dto, actor.id);
  }

  @Get()
  @ProjectScoped({ mode: 'filter', operation: 'read', required: false })
  @RequirePermissions('project.view')
  @ApiOperation({ summary: 'List and filter projects (scoped by project access)' })
  list(@Query() query: ListProjectsQueryDto, @CurrentUser() actor: AuthUser) {
    return this.projectsService.list(query, actor.id);
  }

  @Get(':id')
  @RequirePermissions('project.view')
  @RequireProjectAccess({ source: 'params', key: 'id', operation: 'read' })
  @ApiOperation({ summary: 'View project' })
  getById(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.projectsService.getById(id, actor.id);
  }

  @Patch(':id')
  @RequirePermissions('project.update')
  @RequireProjectAccess({ source: 'params', key: 'id', operation: 'update' })
  @ApiOperation({ summary: 'Update project' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.projectsService.update(id, dto, actor.id);
  }

  @Post(':id/project-manager')
  @RequirePermissions('project.update')
  @RequireProjectAccess({ source: 'params', key: 'id', operation: 'update' })
  @ApiOperation({ summary: 'Assign project manager' })
  assignManager(
    @Param('id') id: string,
    @Body() dto: AssignProjectManagerDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.projectsService.assignProjectManager(id, dto, actor.id);
  }

  @Post(':id/directors')
  @RequirePermissions('project.update')
  @RequireProjectAccess({ source: 'params', key: 'id', operation: 'update' })
  @ApiOperation({ summary: 'Assign directors (full replace)' })
  assignDirectors(
    @Param('id') id: string,
    @Body() dto: AssignDirectorsDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.projectsService.assignDirectors(id, dto, actor.id);
  }

  @Post(':id/status')
  @RequirePermissions('project.update')
  @RequireProjectAccess({ source: 'params', key: 'id', operation: 'update' })
  @ApiOperation({ summary: 'Update project status' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateProjectStatusDto,
    @CurrentUser() actor: AuthUser,
  ) {
    if (
      dto.status === ProjectStatus.Closed ||
      dto.status === ProjectStatus.Cancelled
    ) {
      const allowed = await this.permissionsService.hasAllPermissions(actor.id, [
        'project.close',
      ]);
      if (!allowed) {
        throw new ForbiddenException(
          'project.close permission is required to close or cancel a project',
        );
      }
    }
    return this.projectsService.updateStatus(id, dto, actor.id);
  }

  @Post(':id/documents')
  @RequirePermissions('project.upload_document')
  @RequireProjectAccess({ source: 'params', key: 'id', operation: 'update' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        category: {
          type: 'string',
          enum: Object.values(ProjectDocumentCategory),
        },
        description: { type: 'string' },
      },
      required: ['file'],
    },
  })
  @ApiOperation({ summary: 'Upload project document' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  uploadDocument(
    @Param('id') id: string,
    @UploadedFile() file: UploadedDoc | undefined,
    @Body('category') category: ProjectDocumentCategory | undefined,
    @Body('description') description: string | undefined,
    @CurrentUser() actor: AuthUser,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('Document file is required');
    }

    mkdirSync(join(DOC_UPLOAD_DIR, id), { recursive: true });
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filename = `${Date.now()}-${safeName || `file${extname(file.originalname) || '.bin'}`}`;
    const relativePath = `uploads/projects/${id}/${filename}`;
    writeFileSync(join(process.cwd(), relativePath), file.buffer);

    return this.projectsService.addDocument(
      id,
      {
        fileName: file.originalname,
        filePath: relativePath,
        mimeType: file.mimetype ?? null,
        sizeBytes: file.size ?? file.buffer.length,
        category,
        description,
      },
      actor.id,
    );
  }

  @Get(':id/documents')
  @RequirePermissions('project.view')
  @RequireProjectAccess({ source: 'params', key: 'id', operation: 'read' })
  @ApiOperation({ summary: 'List project documents' })
  listDocuments(
    @Param('id') id: string,
    @Query() query: PaginationQueryDto & { category?: ProjectDocumentCategory },
    @CurrentUser() actor: AuthUser,
  ) {
    return this.projectsService.listDocuments(id, actor.id, query);
  }
}
