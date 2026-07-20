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
  ApproveMaterialConsumptionReportDto,
  GenerateMaterialConsumptionReportDto,
  ListMaterialConsumptionReportsQueryDto,
  PreviewMaterialConsumptionQueryDto,
  UpdateMaterialConsumptionReportDto,
} from './dto/material-consumption.dto';
import { MaterialConsumptionService } from './material-consumption.service';
import { ProjectScoped } from '../project-access/decorators/route-scope.decorator';

@ProjectScoped({
  mode: 'filter',
  resource: { resourceType: 'material-consumption', idParam: 'id' },
  operation: 'read',
})
@ApiTags('Material Consumption')
@ApiBearerAuth()
@Controller('material-consumption-reports')
export class MaterialConsumptionController {
  constructor(
    private readonly materialConsumptionService: MaterialConsumptionService,
  ) {}

  @Get('preview')
  @RequirePermissions('material_consumption.view')
  @ApiOperation({
    summary:
      'Preview actual-versus-theoretical material consumption without saving',
  })
  preview(@Query() query: PreviewMaterialConsumptionQueryDto) {
    return this.materialConsumptionService.preview(query);
  }

  @Post()
  @RequirePermissions('material_consumption.manage')
  @ApiOperation({
    summary: 'Generate actual-versus-theoretical material consumption report',
  })
  generate(
    @Body() dto: GenerateMaterialConsumptionReportDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.materialConsumptionService.generate(dto, actor.id);
  }

  @Get()
  @RequirePermissions('material_consumption.view')
  @ApiOperation({ summary: 'List material consumption reports' })
  list(@Query() query: ListMaterialConsumptionReportsQueryDto) {
    return this.materialConsumptionService.list(query);
  }

  @Get(':id')
  @RequirePermissions('material_consumption.view')
  @ApiOperation({ summary: 'Get material consumption report' })
  getById(@Param('id') id: string) {
    return this.materialConsumptionService.getById(id);
  }

  @Patch(':id')
  @RequirePermissions('material_consumption.manage')
  @ApiOperation({
    summary: 'Update draft report notes / variance explanations',
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateMaterialConsumptionReportDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.materialConsumptionService.update(id, dto, actor.id);
  }

  @Post(':id/submit')
  @RequirePermissions('material_consumption.manage')
  @ApiOperation({
    summary:
      'Submit report (material variances require explanation on each line)',
  })
  submit(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.materialConsumptionService.submit(id, actor.id);
  }

  @Post(':id/approve')
  @RequirePermissions('material_consumption.approve')
  @ApiOperation({
    summary: 'Approve report (variance lines require approval comment)',
  })
  approve(
    @Param('id') id: string,
    @Body() dto: ApproveMaterialConsumptionReportDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.materialConsumptionService.approve(id, actor.id, dto);
  }

  @Post(':id/cancel')
  @RequirePermissions('material_consumption.manage')
  @ApiOperation({ summary: 'Cancel open material consumption report' })
  cancel(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.materialConsumptionService.cancel(id, actor.id);
  }
}
