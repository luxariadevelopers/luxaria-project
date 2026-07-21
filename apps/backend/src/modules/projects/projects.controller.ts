import {
  BadRequestException,
  Body,
  Controller,
  Delete,
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
import {
  CreateStructureNodeDto,
  CreateWarehouseDto,
} from '../sites/dto/site.dto';
import { SitesService } from '../sites/sites.service';
import { AssignDirectorsDto } from './dto/assign-directors.dto';
import { AssignProjectManagerDto } from './dto/assign-project-manager.dto';
import { AssignProjectTeamDto } from './dto/assign-project-team.dto';
import { CloneProjectDto } from './dto/clone-project.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { ListProjectsQueryDto } from './dto/list-projects-query.dto';
import { ProjectFinancialConfigDto } from './dto/project-financial-config.dto';
import { ProjectSettingsDto } from './dto/project-settings.dto';
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
    private readonly sitesService: SitesService,
  ) {}

  @Post()
  @GlobalScope()
  @RequirePermissions('project.create')
  @ApiOperation({ summary: 'Create project (default status Draft)' })
  async create(@Body() dto: CreateProjectDto, @CurrentUser() actor: AuthUser) {
    if (
      dto.status === ProjectStatus.Closed ||
      dto.status === ProjectStatus.Cancelled ||
      dto.status === ProjectStatus.Archived
    ) {
      const allowed = await this.permissionsService.hasAllPermissions(actor.id, [
        'project.close',
      ]);
      if (!allowed) {
        throw new ForbiddenException(
          'project.close permission is required to create a closed, archived, or cancelled project',
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

  @Patch(':id/settings')
  @RequirePermissions('project.update')
  @RequireProjectAccess({ source: 'params', key: 'id', operation: 'update' })
  @ApiOperation({ summary: 'Patch project module settings' })
  updateSettings(
    @Param('id') id: string,
    @Body() dto: ProjectSettingsDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.projectsService.updateSettings(id, dto, actor.id);
  }

  @Patch(':id/financial-config')
  @RequirePermissions('project.update')
  @RequireProjectAccess({ source: 'params', key: 'id', operation: 'update' })
  @ApiOperation({ summary: 'Patch project financial config' })
  updateFinancialConfig(
    @Param('id') id: string,
    @Body() dto: ProjectFinancialConfigDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.projectsService.updateFinancialConfig(id, dto, actor.id);
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
      dto.status === ProjectStatus.Cancelled ||
      dto.status === ProjectStatus.Archived
    ) {
      const allowed = await this.permissionsService.hasAllPermissions(actor.id, [
        'project.close',
      ]);
      if (!allowed) {
        throw new ForbiddenException(
          'project.close permission is required to close, archive, or cancel a project',
        );
      }
    }
    return this.projectsService.updateStatus(id, dto, actor.id);
  }

  /** Lifecycle: suspend → On Hold (project.update). */
  @Post(':id/suspend')
  @RequirePermissions('project.update')
  @RequireProjectAccess({ source: 'params', key: 'id', operation: 'update' })
  @ApiOperation({ summary: 'Suspend project (On Hold), store statusBeforeHold' })
  suspend(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.projectsService.suspend(id, actor.id);
  }

  /** Lifecycle: resume from On Hold (project.update). */
  @Post(':id/resume')
  @RequirePermissions('project.update')
  @RequireProjectAccess({ source: 'params', key: 'id', operation: 'update' })
  @ApiOperation({ summary: 'Resume project from On Hold' })
  resume(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.projectsService.resume(id, actor.id);
  }

  /** Lifecycle: Completed → Closed (project.close). */
  @Post(':id/close')
  @RequirePermissions('project.close')
  @RequireProjectAccess({ source: 'params', key: 'id', operation: 'update' })
  @ApiOperation({ summary: 'Close completed project' })
  close(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.projectsService.close(id, actor.id);
  }

  /**
   * Lifecycle: Closed → Archived.
   * Permission: reuses project.close (no separate project.archive code).
   */
  @Post(':id/archive')
  @RequirePermissions('project.close')
  @RequireProjectAccess({ source: 'params', key: 'id', operation: 'update' })
  @ApiOperation({ summary: 'Archive closed project (reuses project.close)' })
  archive(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.projectsService.archive(id, actor.id);
  }

  /** Lifecycle: Archived → Closed, or soft-delete restore via restore-deleted. */
  @Post(':id/restore')
  @RequirePermissions('project.update')
  @RequireProjectAccess({ source: 'params', key: 'id', operation: 'update' })
  @ApiOperation({ summary: 'Restore archived project to Closed' })
  restore(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.projectsService.restore(id, actor.id);
  }

  /**
   * Clone project as Draft.
   * Permission: reuses project.create (no separate project.clone code).
   */
  @Post(':id/clone')
  @RequirePermissions('project.create')
  @RequireProjectAccess({ source: 'params', key: 'id', operation: 'read' })
  @ApiOperation({ summary: 'Clone project (reuses project.create)' })
  clone(
    @Param('id') id: string,
    @Body() dto: CloneProjectDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.projectsService.clone(id, dto, actor.id);
  }

  @Delete(':id')
  @RequirePermissions('project.update')
  @RequireProjectAccess({ source: 'params', key: 'id', operation: 'update' })
  @ApiOperation({ summary: 'Soft-delete project' })
  softDelete(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.projectsService.softDelete(id, actor.id);
  }

  @Post(':id/restore-deleted')
  @RequirePermissions('project.update')
  @ApiOperation({ summary: 'Restore soft-deleted project' })
  restoreDeleted(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.projectsService.restoreDeleted(id, actor.id);
  }

  @Get(':id/structure')
  @RequirePermissions('site.view')
  @RequireProjectAccess({ source: 'params', key: 'id', operation: 'read' })
  @ApiOperation({ summary: 'Get project site structure tree' })
  getStructure(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    if (!actor.companyId) {
      throw new ForbiddenException('Authenticated company context required');
    }
    return this.sitesService.getStructure(id, actor.companyId);
  }

  @Post(':id/structure')
  @RequirePermissions('site.manage')
  @RequireProjectAccess({ source: 'params', key: 'id', operation: 'update' })
  @ApiOperation({ summary: 'Create a structure node under the project' })
  createStructureNode(
    @Param('id') id: string,
    @Body() dto: CreateStructureNodeDto,
    @CurrentUser() actor: AuthUser,
  ) {
    if (!actor.companyId) {
      throw new ForbiddenException('Authenticated company context required');
    }
    return this.sitesService.createStructureNode(
      id,
      dto,
      actor.companyId,
      actor.id,
    );
  }

  @Get(':id/warehouses')
  @RequirePermissions('site.view')
  @RequireProjectAccess({ source: 'params', key: 'id', operation: 'read' })
  @ApiOperation({ summary: 'List warehouse sites for a project' })
  listWarehouses(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    if (!actor.companyId) {
      throw new ForbiddenException('Authenticated company context required');
    }
    return this.sitesService.listWarehouses(id, actor.companyId);
  }

  @Post(':id/warehouses')
  @RequirePermissions('site.manage')
  @RequireProjectAccess({ source: 'params', key: 'id', operation: 'update' })
  @ApiOperation({ summary: 'Create a warehouse site for a project' })
  createWarehouse(
    @Param('id') id: string,
    @Body() dto: CreateWarehouseDto,
    @CurrentUser() actor: AuthUser,
  ) {
    if (!actor.companyId) {
      throw new ForbiddenException('Authenticated company context required');
    }
    return this.sitesService.createWarehouse(
      id,
      dto,
      actor.companyId,
      actor.id,
    );
  }

  @Get(':id/team')
  @RequirePermissions('project.view')
  @RequireProjectAccess({ source: 'params', key: 'id', operation: 'read' })
  @ApiOperation({ summary: 'List project team assignments' })
  listTeam(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.projectsService.listTeam(id, actor.id);
  }

  @Post(':id/team')
  @RequirePermissions('project_access.assign')
  @RequireProjectAccess({ source: 'params', key: 'id', operation: 'update' })
  @ApiOperation({ summary: 'Assign team member with teamRole' })
  assignTeam(
    @Param('id') id: string,
    @Body() dto: AssignProjectTeamDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.projectsService.assignTeam(id, dto, actor.id);
  }

  @Delete(':id/team/:assignmentId')
  @RequirePermissions('project_access.assign')
  @RequireProjectAccess({ source: 'params', key: 'id', operation: 'update' })
  @ApiOperation({ summary: 'Revoke team assignment' })
  revokeTeam(
    @Param('id') id: string,
    @Param('assignmentId') assignmentId: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.projectsService.revokeTeam(id, assignmentId, actor.id);
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
