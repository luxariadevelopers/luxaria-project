import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
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
  CreateTdsDeductionDto,
  CreateTdsReturnDto,
  CreateTdsSectionDto,
  FileTdsReturnDto,
  ListTdsDeductionsQueryDto,
  ListTdsReturnsQueryDto,
  ListTdsSectionsQueryDto,
  MarkTdsCertifiedDto,
  MarkTdsDepositedDto,
  TdsRegisterQueryDto,
  UpdateTdsSectionDto,
} from './dto/tds.dto';
import { TdsService } from './tds.service';

@ProjectScoped({
  mode: 'filter',
  resource: { resourceType: 'tds-deduction', idParam: 'id' },
  operation: 'read',
})
@ApiTags('TDS')
@ApiBearerAuth()
@Controller('tds')
export class TdsController {
  constructor(private readonly service: TdsService) {}

  @GlobalScope()
  @Post('sections')
  @RequirePermissions('tds.manage')
  @ApiOperation({ summary: 'Create TDS section master' })
  createSection(
    @Body() dto: CreateTdsSectionDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.createSection(dto, actor.id);
  }

  @GlobalScope()
  @Post('sections/seed-defaults')
  @RequirePermissions('tds.manage')
  @ApiOperation({ summary: 'Seed common sections (194C, 194J, 194Q)' })
  seedSections() {
    return this.service.seedDefaultSections();
  }

  @GlobalScope()
  @Get('sections')
  @RequirePermissions('tds.view')
  @ApiOperation({ summary: 'List TDS sections' })
  listSections(@Query() query: ListTdsSectionsQueryDto) {
    return this.service.listSections(query);
  }

  @GlobalScope()
  @Get('sections/:id')
  @RequirePermissions('tds.view')
  @ApiOperation({ summary: 'Get TDS section by id' })
  getSection(@Param('id') id: string) {
    return this.service.getSectionById(id);
  }

  @GlobalScope()
  @Patch('sections/:id')
  @RequirePermissions('tds.manage')
  @ApiOperation({ summary: 'Update TDS section' })
  updateSection(
    @Param('id') id: string,
    @Body() dto: UpdateTdsSectionDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.updateSection(id, dto, actor.id);
  }

  @GlobalScope()
  @Delete('sections/:id')
  @RequirePermissions('tds.manage')
  @ApiOperation({ summary: 'Deactivate TDS section' })
  removeSection(
    @Param('id') id: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.removeSection(id, actor.id);
  }

  @Post('deductions')
  @RequirePermissions('tds.manage')
  @ApiOperation({ summary: 'Record a TDS deduction' })
  createDeduction(
    @Body() dto: CreateTdsDeductionDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.createDeduction(dto, actor.id);
  }

  @Get('deductions')
  @RequirePermissions('tds.view')
  @ApiOperation({ summary: 'List TDS deductions' })
  listDeductions(@Query() query: ListTdsDeductionsQueryDto) {
    return this.service.listDeductions(query);
  }

  @Get('deductions/:id')
  @RequirePermissions('tds.view')
  @ApiOperation({ summary: 'Get TDS deduction by id' })
  getDeduction(@Param('id') id: string) {
    return this.service.getDeductionById(id);
  }

  @Post('deductions/:id/cancel')
  @RequirePermissions('tds.manage')
  @ApiOperation({ summary: 'Cancel a TDS deduction' })
  cancelDeduction(
    @Param('id') id: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.cancelDeduction(id, actor.id);
  }

  @Post('deductions/:id/mark-deposited')
  @RequirePermissions('tds.manage')
  @ApiOperation({ summary: 'Mark deduction deposited with challan details' })
  markDeposited(
    @Param('id') id: string,
    @Body() dto: MarkTdsDepositedDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.markDeposited(id, dto, actor.id);
  }

  @Post('deductions/:id/mark-certified')
  @RequirePermissions('tds.manage')
  @ApiOperation({ summary: 'Issue Form 16A / certificate for deposited TDS' })
  markCertified(
    @Param('id') id: string,
    @Body() dto: MarkTdsCertifiedDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.markCertified(id, dto, actor.id);
  }

  @Get('register')
  @RequirePermissions('tds.view')
  @ApiOperation({ summary: 'TDS deduction register for a date range' })
  register(@Query() query: TdsRegisterQueryDto) {
    return this.service.register(query);
  }

  @GlobalScope()
  @Post('returns')
  @RequirePermissions('tds.manage')
  @ApiOperation({ summary: 'Create quarterly TDS return (26Q / 24Q / 27Q)' })
  createReturn(
    @Body() dto: CreateTdsReturnDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.createReturn(dto, actor.id);
  }

  @GlobalScope()
  @Get('returns')
  @RequirePermissions('tds.view')
  @ApiOperation({ summary: 'List TDS returns' })
  listReturns(@Query() query: ListTdsReturnsQueryDto) {
    return this.service.listReturns(query);
  }

  @GlobalScope()
  @Get('returns/:id')
  @RequirePermissions('tds.view')
  @ApiOperation({ summary: 'Get TDS return by id' })
  getReturn(@Param('id') id: string) {
    return this.service.getReturnById(id);
  }

  @GlobalScope()
  @Post('returns/:id/compute')
  @RequirePermissions('tds.manage')
  @ApiOperation({ summary: 'Aggregate quarter deductions into return totals' })
  computeReturn(
    @Param('id') id: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.computeReturn(id, actor.id);
  }

  @GlobalScope()
  @Post('returns/:id/file')
  @RequirePermissions('tds.file')
  @ApiOperation({ summary: 'Mark TDS return as filed' })
  fileReturn(
    @Param('id') id: string,
    @Body() dto: FileTdsReturnDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.fileReturn(id, dto, actor.id);
  }

  @GlobalScope()
  @Post('returns/:id/cancel')
  @RequirePermissions('tds.manage')
  @ApiOperation({ summary: 'Cancel draft / computed TDS return' })
  cancelReturn(
    @Param('id') id: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.cancelReturn(id, actor.id);
  }
}
