import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
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
import { createReadStream, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import type { AuthUser } from '../auth/types/auth-user.type';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { VerifyCustomerKycDto } from './dto/verify-kyc.dto';
import { CustomersService } from './customers.service';
import { assertAllowedCustomerDocumentMime } from './customers.validation';
import { CustomerDocumentCategory } from './schemas/customer-document.schema';
import {
  CustomerFundingType,
  CustomerKycStatus,
  CustomerStatus,
} from './schemas/customer.schema';

/** Private on-disk store — outside public static assets */
const DOC_UPLOAD_DIR = join(process.cwd(), 'uploads', 'private', 'customers');

type UploadedDoc = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
};

@ApiTags('Customers')
@ApiBearerAuth()
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @RequirePermissions('customer.manage')
  @ApiOperation({ summary: 'Create customer' })
  async create(
    @Body() dto: CreateCustomerDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.customersService.create(dto, actor.id);
  }

  @Get()
  @RequirePermissions('customer.view')
  @ApiOperation({ summary: 'List / search customers' })
  async list(
    @Query()
    query: PaginationQueryDto & {
      search?: string;
      status?: CustomerStatus;
      fundingType?: CustomerFundingType;
      kycStatus?: CustomerKycStatus;
      companyId?: string;
    },
    @CurrentUser() actor: AuthUser,
  ) {
    const access = await this.customersService.resolveAccess(actor.id);
    return this.customersService.list(query, access);
  }

  @Get(':id')
  @RequirePermissions('customer.view')
  @ApiOperation({
    summary:
      'View customer (full Aadhaar only when actor has customer.manage)',
  })
  async getById(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    const access = await this.customersService.resolveAccess(actor.id);
    return this.customersService.getById(id, access);
  }

  @Patch(':id')
  @RequirePermissions('customer.manage')
  @ApiOperation({ summary: 'Update customer' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
    @CurrentUser() actor: AuthUser,
  ) {
    const access = await this.customersService.resolveAccess(actor.id);
    return this.customersService.update(id, dto, access);
  }

  @Post(':id/verify-kyc')
  @RequirePermissions('customer.manage')
  @ApiOperation({ summary: 'Verify or reject customer KYC' })
  async verifyKyc(
    @Param('id') id: string,
    @Body() dto: VerifyCustomerKycDto,
    @CurrentUser() actor: AuthUser,
  ) {
    const access = await this.customersService.resolveAccess(actor.id);
    return this.customersService.verifyKyc(id, dto, access);
  }

  @Post(':id/activate')
  @RequirePermissions('customer.manage')
  @ApiOperation({ summary: 'Activate customer (KYC must be verified)' })
  async activate(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    const access = await this.customersService.resolveAccess(actor.id);
    return this.customersService.activate(id, access);
  }

  @Post(':id/deactivate')
  @RequirePermissions('customer.manage')
  @ApiOperation({ summary: 'Deactivate customer' })
  async deactivate(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    const access = await this.customersService.resolveAccess(actor.id);
    return this.customersService.deactivate(id, access);
  }

  @Post(':id/documents')
  @RequirePermissions('customer.manage')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        category: {
          type: 'string',
          enum: Object.values(CustomerDocumentCategory),
        },
      },
      required: ['file'],
    },
  })
  @ApiOperation({
    summary:
      'Upload KYC / customer document (MIME allowlisted; stored privately)',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async uploadDocument(
    @Param('id') id: string,
    @UploadedFile() file: UploadedDoc | undefined,
    @Body('category') category: CustomerDocumentCategory | undefined,
    @CurrentUser() actor: AuthUser,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('Document file is required');
    }
    assertAllowedCustomerDocumentMime(file.mimetype);

    mkdirSync(join(DOC_UPLOAD_DIR, id), { recursive: true });
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filename = `${Date.now()}-${safeName || `file${extname(file.originalname) || '.bin'}`}`;
    const storageKey = `uploads/private/customers/${id}/${filename}`;
    writeFileSync(join(process.cwd(), storageKey), file.buffer);

    const access = await this.customersService.resolveAccess(actor.id);
    return this.customersService.addDocument(
      id,
      {
        fileName: file.originalname,
        storageKey,
        mimeType: file.mimetype ?? null,
        sizeBytes: file.size ?? file.buffer.length,
        category,
      },
      access,
    );
  }

  @Get(':id/documents')
  @RequirePermissions('customer.view')
  @ApiOperation({
    summary:
      'List customer documents (metadata only — no storage paths exposed)',
  })
  async listDocuments(
    @Param('id') id: string,
    @Query() query: PaginationQueryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    const access = await this.customersService.resolveAccess(actor.id);
    return this.customersService.listDocuments(id, query, access);
  }

  @Get(':id/documents/:documentId/download')
  @RequirePermissions('customer.view')
  @ApiOperation({
    summary:
      'Download customer document (sensitive KYC requires customer.manage)',
  })
  async downloadDocument(
    @Param('id') id: string,
    @Param('documentId') documentId: string,
    @CurrentUser() actor: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const access = await this.customersService.resolveAccess(actor.id);
    const meta = await this.customersService.getDocumentForDownload(
      id,
      documentId,
      access,
    );

    const absolutePath = join(process.cwd(), meta.storageKey);
    if (!existsSync(absolutePath)) {
      throw new NotFoundException('Document file not found on disk');
    }

    res.set({
      'Content-Type': meta.mimeType ?? 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${meta.fileName.replace(/"/g, '')}"`,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });

    return new StreamableFile(createReadStream(absolutePath));
  }
}
