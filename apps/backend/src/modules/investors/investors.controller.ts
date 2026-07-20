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
import { CreateInvestorDto } from './dto/create-investor.dto';
import { UpdateInvestorDto } from './dto/update-investor.dto';
import { VerifyKycDto } from './dto/verify-kyc.dto';
import { InvestorsService } from './investors.service';
import { InvestorDocumentCategory } from './schemas/investor-document.schema';
import {
  InvestorKycStatus,
  InvestorStatus,
  InvestorType,
} from './schemas/investor.schema';

const DOC_UPLOAD_DIR = join(process.cwd(), 'uploads', 'investors');

type UploadedDoc = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
};

@ApiTags('Investors')
@ApiBearerAuth()
@Controller('investors')
export class InvestorsController {
  constructor(private readonly investorsService: InvestorsService) {}

  @Post()
  @RequirePermissions('investor.create')
  @ApiOperation({ summary: 'Create investor' })
  async create(
    @Body() dto: CreateInvestorDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.investorsService.create(dto, actor.id);
  }

  @Get()
  @RequirePermissions('investor.view')
  @ApiOperation({
    summary:
      'List / search investors (own record only unless investor.view_all)',
  })
  async list(
    @Query()
    query: PaginationQueryDto & {
      search?: string;
      status?: InvestorStatus;
      investorType?: InvestorType;
      kycStatus?: InvestorKycStatus;
      companyId?: string;
    },
    @CurrentUser() actor: AuthUser,
  ) {
    const access = await this.investorsService.resolveAccess(actor.id);
    return this.investorsService.list(query, access);
  }

  @Get(':id')
  @RequirePermissions('investor.view')
  @ApiOperation({ summary: 'View investor (scoped)' })
  async getById(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    const access = await this.investorsService.resolveAccess(actor.id);
    return this.investorsService.getById(id, access);
  }

  @Patch(':id')
  @RequirePermissions('investor.update')
  @ApiOperation({ summary: 'Update investor' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateInvestorDto,
    @CurrentUser() actor: AuthUser,
  ) {
    const access = await this.investorsService.resolveAccess(actor.id);
    return this.investorsService.update(id, dto, access);
  }

  @Post(':id/verify-kyc')
  @RequirePermissions('investor.verify_kyc')
  @ApiOperation({ summary: 'Verify or reject investor KYC' })
  async verifyKyc(
    @Param('id') id: string,
    @Body() dto: VerifyKycDto,
    @CurrentUser() actor: AuthUser,
  ) {
    const access = await this.investorsService.resolveAccess(actor.id);
    return this.investorsService.verifyKyc(id, dto, access);
  }

  @Post(':id/activate')
  @RequirePermissions('investor.activate')
  @ApiOperation({ summary: 'Activate investor (KYC must be verified)' })
  async activate(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    const access = await this.investorsService.resolveAccess(actor.id);
    return this.investorsService.activate(id, access);
  }

  @Post(':id/deactivate')
  @RequirePermissions('investor.activate')
  @ApiOperation({ summary: 'Deactivate investor' })
  async deactivate(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    const access = await this.investorsService.resolveAccess(actor.id);
    return this.investorsService.deactivate(id, access);
  }

  @Post(':id/documents')
  @RequirePermissions('investor.upload_document')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        category: {
          type: 'string',
          enum: Object.values(InvestorDocumentCategory),
        },
      },
      required: ['file'],
    },
  })
  @ApiOperation({ summary: 'Upload KYC / investor document' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async uploadDocument(
    @Param('id') id: string,
    @UploadedFile() file: UploadedDoc | undefined,
    @Body('category') category: InvestorDocumentCategory | undefined,
    @CurrentUser() actor: AuthUser,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('Document file is required');
    }
    mkdirSync(join(DOC_UPLOAD_DIR, id), { recursive: true });
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filename = `${Date.now()}-${safeName || `file${extname(file.originalname) || '.bin'}`}`;
    const relativePath = `uploads/investors/${id}/${filename}`;
    writeFileSync(join(process.cwd(), relativePath), file.buffer);

    const access = await this.investorsService.resolveAccess(actor.id);
    return this.investorsService.addDocument(
      id,
      {
        fileName: file.originalname,
        filePath: relativePath,
        mimeType: file.mimetype ?? null,
        sizeBytes: file.size ?? file.buffer.length,
        category,
      },
      access,
    );
  }

  @Get(':id/documents')
  @RequirePermissions('investor.view')
  @ApiOperation({ summary: 'List investor documents' })
  async listDocuments(
    @Param('id') id: string,
    @Query() query: PaginationQueryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    const access = await this.investorsService.resolveAccess(actor.id);
    return this.investorsService.listDocuments(id, query, access);
  }
}
