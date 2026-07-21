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
import { CustomerWarrantiesService } from './customer-warranties.service';
import {
  AddCompletionPhotoDto,
  AddMaterialUsageDto,
  AssignCustomerWarrantyDto,
  CreateCustomerWarrantyDto,
  ListCustomerWarrantyQueryDto,
  TransitionCustomerWarrantyDto,
  UpdateCustomerWarrantyDto,
} from './dto/customer-warranty.dto';

@ProjectScoped({
  mode: 'filter',
  resource: { resourceType: 'customer-warranty', idParam: 'id' },
  operation: 'read',
})
@ApiTags('Customer Warranties')
@ApiBearerAuth()
@Controller('customer-warranties')
export class CustomerWarrantiesController {
  constructor(private readonly service: CustomerWarrantiesService) {}

  @Post()
  @RequirePermissions('warranty.manage')
  @ApiOperation({ summary: 'Create warranty complaint ticket' })
  create(
    @Body() dto: CreateCustomerWarrantyDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.create(dto, actor.id);
  }

  @Get()
  @RequirePermissions('warranty.view')
  @ApiOperation({ summary: 'List warranty tickets' })
  list(@Query() query: ListCustomerWarrantyQueryDto) {
    return this.service.list(query);
  }

  @Get(':id')
  @RequirePermissions('warranty.view')
  @ApiOperation({ summary: 'Get warranty ticket' })
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Patch(':id')
  @RequirePermissions('warranty.manage')
  @ApiOperation({ summary: 'Update complaint-stage ticket' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCustomerWarrantyDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.update(id, dto, actor.id);
  }

  @Post(':id/transition')
  @RequirePermissions('warranty.manage')
  @ApiOperation({ summary: 'Transition warranty status (enforced sequence)' })
  transition(
    @Param('id') id: string,
    @Body() dto: TransitionCustomerWarrantyDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.transition(id, dto, actor.id);
  }

  @Post(':id/assign')
  @RequirePermissions('warranty.manage')
  @ApiOperation({ summary: 'Assign contractor or user' })
  assign(
    @Param('id') id: string,
    @Body() dto: AssignCustomerWarrantyDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.assign(id, dto, actor.id);
  }

  @Post(':id/add-material')
  @RequirePermissions('warranty.manage')
  @ApiOperation({ summary: 'Add material usage' })
  addMaterial(
    @Param('id') id: string,
    @Body() dto: AddMaterialUsageDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.addMaterial(id, dto, actor.id);
  }

  @Post(':id/add-photo')
  @RequirePermissions('warranty.manage')
  @ApiOperation({ summary: 'Add completion photo' })
  addPhoto(
    @Param('id') id: string,
    @Body() dto: AddCompletionPhotoDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.addPhoto(id, dto, actor.id);
  }
}
