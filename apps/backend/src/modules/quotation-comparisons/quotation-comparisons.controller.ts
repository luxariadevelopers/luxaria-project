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
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import {
  GenerateQuotationComparisonDto,
  ListQuotationComparisonsQueryDto,
  RecommendQuotationComparisonDto,
} from './dto/quotation-comparison.dto';
import { QuotationComparisonsService } from './quotation-comparisons.service';
import { ProjectScoped } from '../project-access/decorators/route-scope.decorator';

@ProjectScoped({
  mode: 'filter',
  resource: { resourceType: 'quotation-comparison', idParam: 'id' },
  operation: 'read',
})
@ApiTags('Quotation Comparisons')
@ApiBearerAuth()
@Controller('quotation-comparisons')
export class QuotationComparisonsController {
  constructor(
    private readonly quotationComparisonsService: QuotationComparisonsService,
  ) {}

  @Post('generate')
  @RequirePermissions('quotation.compare')
  @ApiOperation({ summary: 'Generate quotation comparison statement' })
  generate(
    @Body() dto: GenerateQuotationComparisonDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.quotationComparisonsService.generate(dto, actor.id);
  }

  @Get()
  @RequirePermissions('quotation.compare')
  @ApiOperation({ summary: 'List quotation comparisons' })
  list(@Query() query: ListQuotationComparisonsQueryDto) {
    return this.quotationComparisonsService.list(query);
  }

  @Get(':id')
  @RequirePermissions('quotation.compare')
  @ApiOperation({ summary: 'Get quotation comparison' })
  getById(@Param('id') id: string) {
    return this.quotationComparisonsService.getById(id);
  }

  @Post(':id/recommend')
  @RequirePermissions('quotation.recommend')
  @ApiOperation({
    summary:
      'Recommend a vendor quotation (reason required if not lowest landed cost)',
  })
  recommend(
    @Param('id') id: string,
    @Body() dto: RecommendQuotationComparisonDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.quotationComparisonsService.recommend(id, dto, actor.id);
  }

  @Post(':id/submit-approval')
  @RequirePermissions('quotation.recommend')
  @ApiOperation({ summary: 'Submit recommendation for approval' })
  submitForApproval(
    @Param('id') id: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.quotationComparisonsService.submitForApproval(id, actor.id);
  }

  @Post(':id/export-pdf')
  @RequirePermissions('quotation.compare')
  @ApiOperation({ summary: 'Export comparison statement to PDF' })
  exportPdf(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.quotationComparisonsService.exportPdf(id, actor.id);
  }

  @Post(':id/cancel')
  @RequirePermissions('quotation.compare')
  @ApiOperation({ summary: 'Cancel quotation comparison' })
  cancel(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.quotationComparisonsService.cancel(id, actor.id);
  }
}
