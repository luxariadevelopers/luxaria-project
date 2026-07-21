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
import { ProjectScoped } from '../project-access/decorators/route-scope.decorator';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import {
  ConvertUnitQuotationDto,
  CreateUnitQuotationDto,
  ListUnitQuotationsQueryDto,
  RejectUnitQuotationDto,
  ReviseUnitQuotationDto,
  UpdateUnitQuotationDto,
} from './dto/unit-quotation.dto';
import { UnitQuotationsService } from './unit-quotations.service';

@ProjectScoped({
  mode: 'filter',
  resource: { resourceType: 'unit-quotation', idParam: 'id' },
  operation: 'read',
})
@ApiTags('Unit Quotations')
@ApiBearerAuth()
@Controller('unit-quotations')
export class UnitQuotationsController {
  constructor(private readonly service: UnitQuotationsService) {}

  @Post()
  @RequirePermissions('quotation.manage')
  @ApiOperation({
    summary: 'Create draft unit sales quotation (seeds basePrice from unit)',
  })
  create(
    @Body() dto: CreateUnitQuotationDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.create(dto, actor.id);
  }

  @Get()
  @RequirePermissions('quotation.view')
  @ApiOperation({ summary: 'List unit sales quotations' })
  list(@Query() query: ListUnitQuotationsQueryDto) {
    return this.service.list(query);
  }

  @Get(':id')
  @RequirePermissions('quotation.view')
  @ApiOperation({ summary: 'Get unit sales quotation' })
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Patch(':id')
  @RequirePermissions('quotation.manage')
  @ApiOperation({ summary: 'Update draft unit sales quotation' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUnitQuotationDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.update(id, dto, actor.id);
  }

  @Post(':id/issue')
  @RequirePermissions('quotation.manage')
  @ApiOperation({
    summary: 'Issue draft quotation (soft unit availability check)',
  })
  issue(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.issue(id, actor.id);
  }

  @Post(':id/accept')
  @RequirePermissions('quotation.manage')
  @ApiOperation({ summary: 'Accept issued quotation' })
  accept(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.accept(id, actor.id);
  }

  @Post(':id/reject')
  @RequirePermissions('quotation.manage')
  @ApiOperation({ summary: 'Reject issued quotation' })
  reject(
    @Param('id') id: string,
    @Body() dto: RejectUnitQuotationDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.reject(id, dto, actor.id);
  }

  @Post(':id/revise')
  @RequirePermissions('quotation.manage')
  @ApiOperation({
    summary: 'Revise quotation — supersedes previous, creates new draft version',
  })
  revise(
    @Param('id') id: string,
    @Body() dto: ReviseUnitQuotationDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.revise(id, dto, actor.id);
  }

  @Post(':id/convert-to-booking')
  @RequirePermissions('quotation.manage')
  @ApiOperation({
    summary:
      'Mark accepted quotation converted (requires bookingId or reservationId)',
  })
  convertToBooking(
    @Param('id') id: string,
    @Body() dto: ConvertUnitQuotationDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.convertToBooking(id, dto, actor.id);
  }
}
