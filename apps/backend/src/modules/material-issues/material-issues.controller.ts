import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import {
  AttachMaterialIssueSignaturesDto,
  CreateMaterialIssueDto,
  CreateMaterialReturnDto,
  ListMaterialIssuesQueryDto,
  UpdateMaterialIssueDto,
} from './dto/material-issue.dto';
import { MaterialIssuesService } from './material-issues.service';

@ApiTags('Material Issues')
@ApiBearerAuth()
@Controller('material-issues')
export class MaterialIssuesController {
  constructor(private readonly materialIssuesService: MaterialIssuesService) {}

  @Post()
  @RequirePermissions('stock.issue')
  @ApiOperation({ summary: 'Create material issue (draft)' })
  create(
    @Body() dto: CreateMaterialIssueDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.materialIssuesService.create(dto, actor.id);
  }

  @Get()
  @RequirePermissions('stock.view')
  @ApiOperation({ summary: 'List material issues' })
  list(@Query() query: ListMaterialIssuesQueryDto) {
    return this.materialIssuesService.list(query);
  }

  @Get(':id')
  @RequirePermissions('stock.view')
  @ApiOperation({ summary: 'Get material issue' })
  getById(@Param('id') id: string) {
    return this.materialIssuesService.getById(id);
  }

  @Patch(':id')
  @RequirePermissions('stock.issue')
  @ApiOperation({ summary: 'Update draft material issue' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateMaterialIssueDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.materialIssuesService.update(id, dto, actor.id);
  }

  @Post(':id/signatures')
  @RequirePermissions('stock.issue')
  @ApiOperation({ summary: 'Capture recipient (and optional issuer) signature' })
  attachSignatures(
    @Param('id') id: string,
    @Body() dto: AttachMaterialIssueSignaturesDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.materialIssuesService.attachSignatures(id, dto, actor.id);
  }

  @Post(':id/submit')
  @RequirePermissions('stock.issue')
  @ApiOperation({
    summary:
      'Submit material issue (requires recipient signature; does not reduce stock)',
  })
  submit(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.materialIssuesService.submit(id, actor.id);
  }

  @Post(':id/confirm')
  @RequirePermissions('stock.adjust')
  @ApiOperation({
    summary: 'Confirm material issue and post stock ledger MaterialIssue rows',
  })
  confirm(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.materialIssuesService.confirm(id, actor.id);
  }

  @Post(':id/returns')
  @RequirePermissions('stock.issue')
  @ApiOperation({
    summary: 'Post material return from work against a confirmed issue',
  })
  createReturn(
    @Param('id') id: string,
    @Body() dto: CreateMaterialReturnDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.materialIssuesService.createReturn(id, dto, actor.id);
  }

  @Post(':id/cancel')
  @RequirePermissions('stock.issue')
  @ApiOperation({ summary: 'Cancel draft or submitted material issue' })
  cancel(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.materialIssuesService.cancel(id, actor.id);
  }
}
