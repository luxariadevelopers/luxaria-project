import {
  BadRequestException,
  Body,
  Controller,
  Delete,
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
import { AssignContractorProjectDto } from './dto/assign-contractor-project.dto';
import { BlockContractorDto } from './dto/block-contractor.dto';
import { CreateContractorDto } from './dto/create-contractor.dto';
import { UpdateContractorDto } from './dto/update-contractor.dto';
import { VerifyContractorDto } from './dto/verify-contractor.dto';
import { ContractorDocumentCategory } from './schemas/contractor-document.schema';
import {
  ContractorStatus,
  ContractorType,
  ContractorVerificationStatus,
} from './schemas/contractor.schema';
import { ContractorsService } from './contractors.service';

const DOC_UPLOAD_DIR = join(process.cwd(), 'uploads', 'contractors');

type UploadedDoc = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
};

@ApiTags('Contractors')
@ApiBearerAuth()
@Controller('contractors')
export class ContractorsController {
  constructor(private readonly contractorsService: ContractorsService) {}

  @Post()
  @RequirePermissions('contractor.manage')
  @ApiOperation({ summary: 'Create contractor' })
  create(@Body() dto: CreateContractorDto, @CurrentUser() actor: AuthUser) {
    return this.contractorsService.create(dto, actor.id);
  }

  @Get()
  @RequirePermissions('contractor.view')
  @ApiOperation({ summary: 'List / search contractors' })
  list(
    @Query()
    query: PaginationQueryDto & {
      search?: string;
      status?: ContractorStatus;
      verificationStatus?: ContractorVerificationStatus;
      contractorType?: ContractorType;
      workCategory?: string;
      companyId?: string;
      projectId?: string;
    },
  ) {
    return this.contractorsService.list(query);
  }

  @Get(':id')
  @RequirePermissions('contractor.view')
  @ApiOperation({ summary: 'Get contractor by id' })
  getById(@Param('id') id: string) {
    return this.contractorsService.getById(id);
  }

  @Patch(':id')
  @RequirePermissions('contractor.manage')
  @ApiOperation({ summary: 'Update contractor' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateContractorDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.contractorsService.update(id, dto, actor.id);
  }

  @Post(':id/verify')
  @RequirePermissions('contractor.manage')
  @ApiOperation({ summary: 'Verify or reject contractor' })
  verify(
    @Param('id') id: string,
    @Body() dto: VerifyContractorDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.contractorsService.verify(id, dto, actor.id);
  }

  @Post(':id/activate')
  @RequirePermissions('contractor.manage')
  @ApiOperation({ summary: 'Activate a verified contractor' })
  activate(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.contractorsService.activate(id, actor.id);
  }

  @Post(':id/block')
  @RequirePermissions('contractor.manage')
  @ApiOperation({ summary: 'Block contractor' })
  block(
    @Param('id') id: string,
    @Body() dto: BlockContractorDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.contractorsService.block(id, dto, actor.id);
  }

  @Post(':id/projects')
  @RequirePermissions('contractor.manage')
  @ApiOperation({ summary: 'Assign contractor to a project' })
  assignProject(
    @Param('id') id: string,
    @Body() dto: AssignContractorProjectDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.contractorsService.assignProject(id, dto, actor.id);
  }

  @Delete(':id/projects/:projectId')
  @RequirePermissions('contractor.manage')
  @ApiOperation({ summary: 'Unassign contractor from a project' })
  unassignProject(
    @Param('id') id: string,
    @Param('projectId') projectId: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.contractorsService.unassignProject(id, projectId, actor.id);
  }

  @Get(':id/projects')
  @RequirePermissions('contractor.view')
  @ApiOperation({ summary: 'List contractor project assignments' })
  listProjects(@Param('id') id: string, @Query() query: PaginationQueryDto) {
    return this.contractorsService.listProjects(id, query);
  }

  @Get(':id/performance')
  @RequirePermissions('contractor.view')
  @ApiOperation({
    summary:
      'View contractor performance (rating, projects, work measurements, docs)',
  })
  performance(@Param('id') id: string) {
    return this.contractorsService.getPerformance(id);
  }

  @Post(':id/documents')
  @RequirePermissions('contractor.manage')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        category: {
          type: 'string',
          enum: Object.values(ContractorDocumentCategory),
        },
      },
      required: ['file'],
    },
  })
  @ApiOperation({
    summary: 'Upload contractor document (licence, insurance, etc.)',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  uploadDocument(
    @Param('id') id: string,
    @UploadedFile() file: UploadedDoc | undefined,
    @Body('category') category: ContractorDocumentCategory | undefined,
    @CurrentUser() actor: AuthUser,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('Document file is required');
    }
    mkdirSync(join(DOC_UPLOAD_DIR, id), { recursive: true });
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filename = `${Date.now()}-${safeName || `file${extname(file.originalname) || '.bin'}`}`;
    const relativePath = `uploads/contractors/${id}/${filename}`;
    writeFileSync(join(process.cwd(), relativePath), file.buffer);

    return this.contractorsService.addDocument(
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

  @Get(':id/documents')
  @RequirePermissions('contractor.view')
  @ApiOperation({ summary: 'List contractor documents' })
  listDocuments(
    @Param('id') id: string,
    @Query()
    query: PaginationQueryDto & { category?: ContractorDocumentCategory },
  ) {
    return this.contractorsService.listDocuments(id, query);
  }
}
