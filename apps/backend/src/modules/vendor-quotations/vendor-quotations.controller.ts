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
import type { AuthUser } from '../auth/types/auth-user.type';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import {
  CompareVendorQuotationsQueryDto,
  CreateVendorQuotationDto,
  ListVendorQuotationsQueryDto,
  ReviseVendorQuotationDto,
  UpdateVendorQuotationDto,
} from './dto/vendor-quotation.dto';
import { VendorQuotationsService } from './vendor-quotations.service';
import { ProjectScoped } from '../project-access/decorators/route-scope.decorator';

const DOC_UPLOAD_DIR = join(process.cwd(), 'uploads', 'vendor-quotations');

type UploadedDoc = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
};

@ProjectScoped({
  mode: 'filter',
  resource: { resourceType: 'vendor-quotation', idParam: 'id' },
  operation: 'read',
})
@ApiTags('Vendor Quotations')
@ApiBearerAuth()
@Controller('vendor-quotations')
export class VendorQuotationsController {
  constructor(
    private readonly vendorQuotationsService: VendorQuotationsService,
  ) {}

  @Post()
  @RequirePermissions('quotation.manage')
  @ApiOperation({ summary: 'Add vendor quotation (draft)' })
  create(
    @Body() dto: CreateVendorQuotationDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.vendorQuotationsService.create(dto, actor.id);
  }

  @Get('compare')
  @RequirePermissions('quotation.view')
  @ApiOperation({
    summary: 'Compare quotations for a purchase request (latest per vendor)',
  })
  compare(@Query() query: CompareVendorQuotationsQueryDto) {
    return this.vendorQuotationsService.compare(query);
  }

  @Get()
  @RequirePermissions('quotation.view')
  @ApiOperation({ summary: 'List / search vendor quotations' })
  list(@Query() query: ListVendorQuotationsQueryDto) {
    return this.vendorQuotationsService.list(query);
  }

  @Get(':id')
  @RequirePermissions('quotation.view')
  @ApiOperation({ summary: 'Get vendor quotation' })
  getById(@Param('id') id: string) {
    return this.vendorQuotationsService.getById(id);
  }

  @Patch(':id')
  @RequirePermissions('quotation.manage')
  @ApiOperation({ summary: 'Update draft vendor quotation' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateVendorQuotationDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.vendorQuotationsService.update(id, dto, actor.id);
  }

  @Post(':id/submit')
  @RequirePermissions('quotation.manage')
  @ApiOperation({ summary: 'Submit vendor quotation' })
  submit(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.vendorQuotationsService.submit(id, actor.id);
  }

  @Post(':id/revise')
  @RequirePermissions('quotation.manage')
  @ApiOperation({
    summary: 'Revise quotation (supersedes previous; creates new draft revision)',
  })
  revise(
    @Param('id') id: string,
    @Body() dto: ReviseVendorQuotationDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.vendorQuotationsService.revise(id, dto, actor.id);
  }

  @Post(':id/mark-final')
  @RequirePermissions('quotation.finalize')
  @ApiOperation({ summary: 'Mark quotation as final for the purchase request' })
  markFinal(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.vendorQuotationsService.markFinal(id, actor.id);
  }

  @Post(':id/cancel')
  @RequirePermissions('quotation.manage')
  @ApiOperation({ summary: 'Cancel draft/submitted quotation' })
  cancel(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.vendorQuotationsService.cancel(id, actor.id);
  }

  @Post(':id/document')
  @RequirePermissions('quotation.manage')
  @ApiOperation({ summary: 'Upload vendor quotation document' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
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
    @CurrentUser() actor: AuthUser,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('Quotation document file is required');
    }
    mkdirSync(join(DOC_UPLOAD_DIR, id), { recursive: true });
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filename = `${Date.now()}-${safeName || `file${extname(file.originalname) || '.bin'}`}`;
    const relativePath = `uploads/vendor-quotations/${id}/${filename}`;
    writeFileSync(join(process.cwd(), relativePath), file.buffer);

    return this.vendorQuotationsService.uploadDocument(
      id,
      {
        fileName: file.originalname,
        filePath: relativePath,
        mimeType: file.mimetype ?? null,
        sizeBytes: file.size ?? file.buffer.length,
      },
      actor.id,
    );
  }
}
