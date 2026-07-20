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
import { join } from 'node:path';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import {
  assertMagicBytes,
  createSecureMulterOptions,
} from '../../common/security/file-upload.util';
import { SAFE_IMAGE_MIME_TYPES } from '../../common/security/security.constants';
import type { AuthUser } from '../auth/types/auth-user.type';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { CompanyService } from './company.service';
import { UpdateCapitalDto } from './dto/update-capital.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { UpdateStatutoryDto } from './dto/update-statutory.dto';
import { CompanyAddressType } from './schemas/company-address-history.schema';
import { CompanyCapitalType } from './schemas/company-capital-history.schema';

const LOGO_UPLOAD_DIR = join(process.cwd(), 'uploads', 'company');

type UploadedLogo = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
};

@ApiTags('Company')
@ApiBearerAuth()
@Controller('companies')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Get('primary')
  @RequirePermissions('company.view')
  @ApiOperation({ summary: 'View the primary company (single-tenant default)' })
  getPrimary() {
    return this.companyService.getPrimary();
  }

  @Get(':id')
  @RequirePermissions('company.view')
  @ApiOperation({ summary: 'View company by id' })
  getById(@Param('id') id: string) {
    return this.companyService.getById(id);
  }

  @Patch(':id')
  @RequirePermissions('company.update')
  @ApiOperation({ summary: 'Update company profile and addresses' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCompanyDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.companyService.update(id, dto, actor.id);
  }

  @Patch(':id/statutory')
  @RequirePermissions('company.update')
  @ApiOperation({ summary: 'Update statutory details (CIN, PAN, TAN, GSTIN, legal name)' })
  updateStatutory(
    @Param('id') id: string,
    @Body() dto: UpdateStatutoryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.companyService.updateStatutory(id, dto, actor.id);
  }

  @Post(':id/capital')
  @RequirePermissions('company.update')
  @ApiOperation({
    summary: 'Update capital (appends immutable history; never overwrites past entries)',
  })
  updateCapital(
    @Param('id') id: string,
    @Body() dto: UpdateCapitalDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.companyService.updateCapital(id, dto, actor.id);
  }

  @Post(':id/logo')
  @RequirePermissions('company.upload_logo')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @ApiOperation({ summary: 'Upload company logo' })
  @UseInterceptors(
    FileInterceptor(
      'file',
      createSecureMulterOptions({
        maxBytes: 2 * 1024 * 1024,
        allowedMimeTypes: SAFE_IMAGE_MIME_TYPES,
        allowedExtensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'],
      }),
    ),
  )
  uploadLogo(
    @Param('id') id: string,
    @UploadedFile() file: UploadedLogo | undefined,
    @CurrentUser() actor: AuthUser,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('Logo file is required');
    }

    assertMagicBytes(file.buffer, file.mimetype);
    mkdirSync(LOGO_UPLOAD_DIR, { recursive: true });
    const mimeExt =
      file.mimetype === 'image/png'
        ? '.png'
        : file.mimetype === 'image/webp'
          ? '.webp'
          : file.mimetype === 'image/gif'
            ? '.gif'
            : '.jpg';
    const filename = `logo-${Date.now()}${mimeExt}`;
    writeFileSync(join(LOGO_UPLOAD_DIR, filename), file.buffer);

    return this.companyService.setLogo(id, `uploads/company/${filename}`, actor.id);
  }

  @Get(':id/address-history')
  @RequirePermissions('company.view')
  @ApiOperation({ summary: 'List address history' })
  listAddressHistory(
    @Param('id') id: string,
    @Query() query: PaginationQueryDto & { addressType?: CompanyAddressType },
  ) {
    return this.companyService.listAddressHistory(id, query);
  }

  @Get(':id/capital-history')
  @RequirePermissions('company.view')
  @ApiOperation({ summary: 'List capital history (append-only)' })
  listCapitalHistory(
    @Param('id') id: string,
    @Query() query: PaginationQueryDto & { capitalType?: CompanyCapitalType },
  ) {
    return this.companyService.listCapitalHistory(id, query);
  }
}
