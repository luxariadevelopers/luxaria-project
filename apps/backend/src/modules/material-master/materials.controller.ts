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
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import type { AuthUser } from '../auth/types/auth-user.type';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { MaterialsService } from './materials.service';
import { MaterialStatus, MaterialUnit } from './schemas/material.schema';

@ApiTags('Materials')
@ApiBearerAuth()
@Controller('materials')
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  @Get('units')
  @RequirePermissions('material.view')
  @ApiOperation({ summary: 'List supported material units' })
  listUnits() {
    return this.materialsService.listUnits();
  }

  @Post()
  @RequirePermissions('material.manage')
  @ApiOperation({ summary: 'Create material master record' })
  create(@Body() dto: CreateMaterialDto, @CurrentUser() actor: AuthUser) {
    return this.materialsService.create(dto, actor.id);
  }

  @Get()
  @RequirePermissions('material.view')
  @ApiOperation({ summary: 'List / search materials' })
  list(
    @Query()
    query: PaginationQueryDto & {
      search?: string;
      status?: MaterialStatus;
      category?: string;
      baseUnit?: MaterialUnit;
      brand?: string;
      ledgerAccountId?: string;
    },
  ) {
    return this.materialsService.list(query);
  }

  @Get(':id')
  @RequirePermissions('material.view')
  @ApiOperation({ summary: 'Get material by id' })
  getById(@Param('id') id: string) {
    return this.materialsService.getById(id);
  }

  @Patch(':id')
  @RequirePermissions('material.manage')
  @ApiOperation({
    summary:
      'Update material (base unit locked after stock transactions)',
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateMaterialDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.materialsService.update(id, dto, actor.id);
  }
}
