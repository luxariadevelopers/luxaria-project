import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
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
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { BoqService } from './boq.service';
import { ProjectScoped } from '../project-access/decorators/route-scope.decorator';
import {
  CreateBoqBlockDto,
  CreateBoqFloorDto,
  CreateBoqItemDto,
  CreateBoqWorkCategoryDto,
  ListBoqItemsQueryDto,
  UpdateBoqBlockDto,
  UpdateBoqFloorDto,
  UpdateBoqItemDto,
  UpdateBoqWorkCategoryDto,
} from './dto/boq.dto';
import {
  ActivateBoqVersionDto,
  ApproveBoqVersionDto,
  CompareBoqVersionsQueryDto,
  CreateBoqVersionDto,
  RejectBoqVersionDto,
  UpdateBoqVersionDto,
} from './dto/boq-version.dto';

type UploadedExcel = {
  buffer: Buffer;
  mimetype?: string;
  originalname?: string;
};

@ProjectScoped({
  mode: 'filter',
  resource: { resourceType: 'boq', idParam: 'id' },
  operation: 'read',
})
@ApiTags('BOQ')
@ApiBearerAuth()
@Controller('boq')
export class BoqController {
  constructor(private readonly boqService: BoqService) {}

  // ── Hierarchy ──────────────────────────────────────────────────────

  @Post('projects/:projectId/blocks')
  @RequirePermissions('boq.manage')
  @ApiOperation({ summary: 'Create BOQ block under a project' })
  createBlock(
    @Param('projectId') projectId: string,
    @Body() dto: CreateBoqBlockDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.boqService.createBlock(projectId, dto, actor.id);
  }

  @Get('projects/:projectId/blocks')
  @RequirePermissions('boq.view')
  @ApiOperation({ summary: 'List blocks for a project' })
  listBlocks(
    @Param('projectId') projectId: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.boqService.listBlocks(projectId, actor.id);
  }

  @Patch('blocks/:id')
  @RequirePermissions('boq.manage')
  @ApiOperation({ summary: 'Update BOQ block' })
  updateBlock(
    @Param('id') id: string,
    @Body() dto: UpdateBoqBlockDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.boqService.updateBlock(id, dto, actor.id);
  }

  @Post('blocks/:blockId/floors')
  @RequirePermissions('boq.manage')
  @ApiOperation({ summary: 'Create floor under a block' })
  createFloor(
    @Param('blockId') blockId: string,
    @Body() dto: CreateBoqFloorDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.boqService.createFloor(blockId, dto, actor.id);
  }

  @Get('blocks/:blockId/floors')
  @RequirePermissions('boq.view')
  @ApiOperation({ summary: 'List floors for a block' })
  listFloors(@Param('blockId') blockId: string) {
    return this.boqService.listFloors(blockId);
  }

  @Patch('floors/:id')
  @RequirePermissions('boq.manage')
  @ApiOperation({ summary: 'Update BOQ floor' })
  updateFloor(
    @Param('id') id: string,
    @Body() dto: UpdateBoqFloorDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.boqService.updateFloor(id, dto, actor.id);
  }

  @Post('floors/:floorId/work-categories')
  @RequirePermissions('boq.manage')
  @ApiOperation({ summary: 'Create work category under a floor' })
  createWorkCategory(
    @Param('floorId') floorId: string,
    @Body() dto: CreateBoqWorkCategoryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.boqService.createWorkCategory(floorId, dto, actor.id);
  }

  @Get('floors/:floorId/work-categories')
  @RequirePermissions('boq.view')
  @ApiOperation({ summary: 'List work categories for a floor' })
  listWorkCategories(@Param('floorId') floorId: string) {
    return this.boqService.listWorkCategories(floorId);
  }

  @Patch('work-categories/:id')
  @RequirePermissions('boq.manage')
  @ApiOperation({ summary: 'Update work category' })
  updateWorkCategory(
    @Param('id') id: string,
    @Body() dto: UpdateBoqWorkCategoryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.boqService.updateWorkCategory(id, dto, actor.id);
  }

  @Get('projects/:projectId/hierarchy')
  @RequirePermissions('boq.view')
  @ApiOperation({
    summary: 'Full Project → Block → Floor → Work Category → Item tree',
  })
  getHierarchy(
    @Param('projectId') projectId: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.boqService.getHierarchy(projectId, actor.id);
  }


  // ── Versions ───────────────────────────────────────────────────────

  @Post('projects/:projectId/versions')
  @RequirePermissions('boq.manage')
  @ApiOperation({
    summary: 'Create BOQ version (Original / Revision / Variation / Change Order)',
  })
  createVersion(
    @Param('projectId') projectId: string,
    @Body() dto: CreateBoqVersionDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.boqService.createVersion(projectId, dto, actor.id);
  }

  @Get('projects/:projectId/versions')
  @RequirePermissions('boq.view')
  @ApiOperation({ summary: 'List BOQ versions for a project' })
  listVersions(
    @Param('projectId') projectId: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.boqService.listVersions(projectId, actor.id);
  }

  @Get('projects/:projectId/versions/active')
  @RequirePermissions('boq.view')
  @ApiOperation({ summary: 'Get the single active BOQ version' })
  getActiveVersion(
    @Param('projectId') projectId: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.boqService.getActiveVersion(projectId, actor.id);
  }

  @Get('projects/:projectId/versions/compare')
  @RequirePermissions('boq.view')
  @ApiOperation({ summary: 'Compare two BOQ versions (added / removed / changed)' })
  compareVersions(
    @Param('projectId') projectId: string,
    @Query() query: CompareBoqVersionsQueryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.boqService.compareVersions(
      projectId,
      query.fromVersionId,
      query.toVersionId,
      actor.id,
    );
  }

  @Get('versions/:id')
  @RequirePermissions('boq.view')
  @ApiOperation({ summary: 'Get BOQ version' })
  getVersion(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.boqService.getVersion(id, actor.id);
  }

  @Patch('versions/:id')
  @RequirePermissions('boq.manage')
  @ApiOperation({ summary: 'Update draft/rejected BOQ version metadata' })
  updateVersion(
    @Param('id') id: string,
    @Body() dto: UpdateBoqVersionDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.boqService.updateVersion(id, dto, actor.id);
  }

  @Post('versions/:id/submit')
  @RequirePermissions('boq.manage')
  @ApiOperation({ summary: 'Submit BOQ version for approval' })
  submitVersion(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.boqService.submitVersion(id, actor.id);
  }

  @Post('versions/:id/approve')
  @RequirePermissions('boq.approve')
  @ApiOperation({
    summary: 'Approve version (sets active; required path for Variation)',
  })
  approveVersion(
    @Param('id') id: string,
    @Body() dto: ApproveBoqVersionDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.boqService.approveVersion(id, dto, actor.id);
  }

  @Post('versions/:id/reject')
  @RequirePermissions('boq.approve')
  @ApiOperation({ summary: 'Reject pending BOQ version' })
  rejectVersion(
    @Param('id') id: string,
    @Body() dto: RejectBoqVersionDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.boqService.rejectVersion(id, dto, actor.id);
  }

  @Post('versions/:id/activate')
  @RequirePermissions('boq.manage')
  @ApiOperation({
    summary:
      'Activate draft version without approval (blocked for Variation)',
  })
  activateVersion(
    @Param('id') id: string,
    @Body() dto: ActivateBoqVersionDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.boqService.activateVersion(id, dto, actor.id);
  }

  // ── Items ──────────────────────────────────────────────────────────

  @Post('projects/:projectId/items')
  @RequirePermissions('boq.manage')
  @ApiOperation({ summary: 'Create BOQ item manually' })
  createItem(
    @Param('projectId') projectId: string,
    @Body() dto: CreateBoqItemDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.boqService.createItem(projectId, dto, actor.id);
  }

  @Get('projects/:projectId/items')
  @RequirePermissions('boq.view')
  @ApiOperation({ summary: 'List BOQ items for a project' })
  listItems(
    @Param('projectId') projectId: string,
    @Query() query: ListBoqItemsQueryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.boqService.listItems(projectId, query, actor.id);
  }

  @Get('items/:id')
  @RequirePermissions('boq.view')
  @ApiOperation({ summary: 'Get BOQ item' })
  getItem(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.boqService.getItem(id, actor.id);
  }

  @Patch('items/:id')
  @RequirePermissions('boq.manage')
  @ApiOperation({ summary: 'Update BOQ item' })
  updateItem(
    @Param('id') id: string,
    @Body() dto: UpdateBoqItemDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.boqService.updateItem(id, dto, actor.id);
  }

  @Post('projects/:projectId/validate-totals')
  @RequirePermissions('boq.view')
  @ApiOperation({
    summary:
      'Validate plannedRate = cost sum and plannedValue = qty × rate for all items',
  })
  validateTotals(@Param('projectId') projectId: string) {
    return this.boqService.validateTotals(projectId);
  }

  // ── Excel ──────────────────────────────────────────────────────────

  @Get('import-template')
  @RequirePermissions('boq.view')
  @ApiOperation({ summary: 'Download Excel import template' })
  async downloadTemplate(@Res() res: Response) {
    const { filename, buffer } = await this.boqService.downloadTemplate();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Post('projects/:projectId/import')
  @RequirePermissions('boq.manage')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  @ApiOperation({
    summary: 'Import BOQ from Excel (creates missing hierarchy nodes)',
  })
  importExcel(
    @Param('projectId') projectId: string,
    @UploadedFile() file: UploadedExcel | undefined,
    @CurrentUser() actor: AuthUser,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Excel file is required');
    }
    return this.boqService.importFromExcel(projectId, file.buffer, actor.id);
  }

  @Get('projects/:projectId/export')
  @RequirePermissions('boq.view')
  @ApiOperation({ summary: 'Export project BOQ to Excel' })
  async exportExcel(
    @Param('projectId') projectId: string,
    @Res() res: Response,
  ) {
    const { filename, buffer } = await this.boqService.exportToExcel(projectId);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }
}
