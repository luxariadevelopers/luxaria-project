import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';
import {
  GlobalScope,
  ProjectScoped,
} from '../project-access/decorators/route-scope.decorator';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import {
  CreateGstDocumentDto,
  CreateGstReturnDto,
  FileGstReturnDto,
  GstRegisterQueryDto,
  ListGstDocumentsQueryDto,
  ListGstReturnsQueryDto,
  SyncGstDocumentFromSourceDto,
} from './dto/gst.dto';
import { GstService } from './gst.service';

@ProjectScoped({
  mode: 'filter',
  resource: { resourceType: 'gst-document', idParam: 'id' },
  operation: 'read',
})
@ApiTags('GST')
@ApiBearerAuth()
@Controller('gst')
export class GstController {
  constructor(private readonly service: GstService) {}

  @Post('documents')
  @RequirePermissions('gst.manage')
  @ApiOperation({ summary: 'Create / register a GST document' })
  createDocument(
    @Body() dto: CreateGstDocumentDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.createDocument(dto, actor.id);
  }

  @Post('documents/sync-from-source')
  @RequirePermissions('gst.manage')
  @ApiOperation({
    summary: 'Idempotent upsert from source module (vendor/contractor/customer invoice)',
  })
  syncFromSource(
    @Body() dto: SyncGstDocumentFromSourceDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.syncFromSource(dto, actor.id);
  }

  @Get('documents')
  @RequirePermissions('gst.view')
  @ApiOperation({ summary: 'List GST documents with filters' })
  listDocuments(@Query() query: ListGstDocumentsQueryDto) {
    return this.service.listDocuments(query);
  }

  @Get('documents/:id')
  @RequirePermissions('gst.view')
  @ApiOperation({ summary: 'Get GST document by id' })
  getDocument(@Param('id') id: string) {
    return this.service.getDocumentById(id);
  }

  @Post('documents/:id/cancel')
  @RequirePermissions('gst.manage')
  @ApiOperation({ summary: 'Cancel a GST document' })
  cancelDocument(
    @Param('id') id: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.cancelDocument(id, actor.id);
  }

  @Get('register')
  @RequirePermissions('gst.view')
  @ApiOperation({ summary: 'Outward / inward GST register for a date range' })
  register(@Query() query: GstRegisterQueryDto) {
    return this.service.register(query);
  }

  @GlobalScope()
  @Post('returns')
  @RequirePermissions('gst.manage')
  @ApiOperation({ summary: 'Create a period GST return (GSTR-1 / 3B / 2B)' })
  createReturn(
    @Body() dto: CreateGstReturnDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.createReturn(dto, actor.id);
  }

  @GlobalScope()
  @Get('returns')
  @RequirePermissions('gst.view')
  @ApiOperation({ summary: 'List GST returns' })
  listReturns(@Query() query: ListGstReturnsQueryDto) {
    return this.service.listReturns(query);
  }

  @GlobalScope()
  @Get('returns/:id')
  @RequirePermissions('gst.view')
  @ApiOperation({ summary: 'Get GST return by id' })
  getReturn(@Param('id') id: string) {
    return this.service.getReturnById(id);
  }

  @GlobalScope()
  @Post('returns/:id/compute')
  @RequirePermissions('gst.manage')
  @ApiOperation({ summary: 'Aggregate posted documents into return totals' })
  computeReturn(
    @Param('id') id: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.computeReturn(id, actor.id);
  }

  @GlobalScope()
  @Post('returns/:id/file')
  @RequirePermissions('gst.file')
  @ApiOperation({ summary: 'Mark return as filed with acknowledgement' })
  fileReturn(
    @Param('id') id: string,
    @Body() dto: FileGstReturnDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.fileReturn(id, dto, actor.id);
  }

  @GlobalScope()
  @Post('returns/:id/cancel')
  @RequirePermissions('gst.manage')
  @ApiOperation({ summary: 'Cancel draft / computed GST return' })
  cancelReturn(
    @Param('id') id: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.cancelReturn(id, actor.id);
  }
}
