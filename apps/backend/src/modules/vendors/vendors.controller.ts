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
import { AssignVendorProjectDto } from './dto/assign-vendor-project.dto';
import { BlockVendorDto } from './dto/block-vendor.dto';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { VerifyVendorDto } from './dto/verify-vendor.dto';
import { VendorDocumentCategory } from './schemas/vendor-document.schema';
import {
  VendorStatus,
  VendorVerificationStatus,
} from './schemas/vendor.schema';
import { VendorsService } from './vendors.service';
import { GlobalScope } from '../project-access/decorators/route-scope.decorator';

const DOC_UPLOAD_DIR = join(process.cwd(), 'uploads', 'vendors');

type UploadedDoc = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
};

@GlobalScope()
@ApiTags('Vendors')
@ApiBearerAuth()
@Controller('vendors')
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Post()
  @RequirePermissions('vendor.manage')
  @ApiOperation({ summary: 'Create vendor' })
  create(@Body() dto: CreateVendorDto, @CurrentUser() actor: AuthUser) {
    return this.vendorsService.create(dto, actor.id);
  }

  @Get()
  @RequirePermissions('vendor.view')
  @ApiOperation({ summary: 'List / search vendors' })
  list(
    @Query()
    query: PaginationQueryDto & {
      search?: string;
      status?: VendorStatus;
      verificationStatus?: VendorVerificationStatus;
      materialCategory?: string;
      companyId?: string;
      projectId?: string;
    },
  ) {
    return this.vendorsService.list(query);
  }

  @Get(':id')
  @RequirePermissions('vendor.view')
  @ApiOperation({ summary: 'Get vendor by id' })
  getById(@Param('id') id: string) {
    return this.vendorsService.getById(id);
  }

  @Patch(':id')
  @RequirePermissions('vendor.manage')
  @ApiOperation({ summary: 'Update vendor' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateVendorDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.vendorsService.update(id, dto, actor.id);
  }

  @Post(':id/verify')
  @RequirePermissions('vendor.manage')
  @ApiOperation({ summary: 'Verify or reject vendor' })
  verify(
    @Param('id') id: string,
    @Body() dto: VerifyVendorDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.vendorsService.verify(id, dto, actor.id);
  }

  @Post(':id/activate')
  @RequirePermissions('vendor.manage')
  @ApiOperation({ summary: 'Activate a verified vendor' })
  activate(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.vendorsService.activate(id, actor.id);
  }

  @Post(':id/block')
  @RequirePermissions('vendor.manage')
  @ApiOperation({ summary: 'Block vendor' })
  block(
    @Param('id') id: string,
    @Body() dto: BlockVendorDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.vendorsService.block(id, dto, actor.id);
  }

  @Post(':id/projects')
  @RequirePermissions('vendor.manage')
  @ApiOperation({ summary: 'Assign vendor to a project' })
  assignProject(
    @Param('id') id: string,
    @Body() dto: AssignVendorProjectDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.vendorsService.assignProject(id, dto, actor.id);
  }

  @Delete(':id/projects/:projectId')
  @RequirePermissions('vendor.manage')
  @ApiOperation({ summary: 'Unassign vendor from a project' })
  unassignProject(
    @Param('id') id: string,
    @Param('projectId') projectId: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.vendorsService.unassignProject(id, projectId, actor.id);
  }

  @Get(':id/projects')
  @RequirePermissions('vendor.view')
  @ApiOperation({ summary: 'List vendor project assignments' })
  listProjects(@Param('id') id: string, @Query() query: PaginationQueryDto) {
    return this.vendorsService.listProjects(id, query);
  }

  @Get(':id/ledger')
  @RequirePermissions('vendor.view')
  @ApiOperation({ summary: 'Vendor ledger placeholder' })
  ledger(@Param('id') id: string) {
    return this.vendorsService.getLedgerPlaceholder(id);
  }

  @Post(':id/documents')
  @RequirePermissions('vendor.manage')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        category: {
          type: 'string',
          enum: Object.values(VendorDocumentCategory),
        },
      },
      required: ['file'],
    },
  })
  @ApiOperation({ summary: 'Upload vendor / agreement document' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  uploadDocument(
    @Param('id') id: string,
    @UploadedFile() file: UploadedDoc | undefined,
    @Body('category') category: VendorDocumentCategory | undefined,
    @CurrentUser() actor: AuthUser,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('Document file is required');
    }
    mkdirSync(join(DOC_UPLOAD_DIR, id), { recursive: true });
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filename = `${Date.now()}-${safeName || `file${extname(file.originalname) || '.bin'}`}`;
    const relativePath = `uploads/vendors/${id}/${filename}`;
    writeFileSync(join(process.cwd(), relativePath), file.buffer);

    return this.vendorsService.addDocument(
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
  @RequirePermissions('vendor.view')
  @ApiOperation({ summary: 'List vendor documents' })
  listDocuments(
    @Param('id') id: string,
    @Query()
    query: PaginationQueryDto & { category?: VendorDocumentCategory },
  ) {
    return this.vendorsService.listDocuments(id, query);
  }
}
