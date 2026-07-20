import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { CommandCentreQueryDto } from './dto/command-centre-query.dto';
import { DirectorCommandCentreService } from './director-command-centre.service';
import { GlobalScope } from '../project-access/decorators/route-scope.decorator';

@GlobalScope()
@ApiTags('Director Command Centre')
@ApiBearerAuth()
@Controller('director-command-centre')
export class DirectorCommandCentreController {
  constructor(
    private readonly commandCentreService: DirectorCommandCentreService,
  ) {}

  @Get('summary')
  @RequirePermissions('dashboard.view')
  @ApiOperation({
    summary:
      'Director Command Centre dashboard summary (balances, payables, progress, exceptions)',
  })
  getSummary(
    @Query() query: CommandCentreQueryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.commandCentreService.getSummary(query, actor.id);
  }
}
