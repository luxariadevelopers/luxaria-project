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
import { BookingCancellationsService } from './booking-cancellations.service';
import { ProjectScoped } from '../project-access/decorators/route-scope.decorator';
import {
  AddCancellationDocumentDto,
  ApproveBookingCancellationDto,
  ListBookingCancellationsQueryDto,
  ProcessRefundDto,
  RejectBookingCancellationDto,
  RequestBookingCancellationDto,
  ReviewBookingCancellationDto,
} from './dto/booking-cancellation.dto';

@ProjectScoped({
  mode: 'filter',
  resource: { resourceType: 'booking-cancellation', idParam: 'id' },
  operation: 'read',
})
@ApiTags('Booking Cancellations')
@ApiBearerAuth()
@Controller('booking-cancellations')
export class BookingCancellationsController {
  constructor(
    private readonly bookingCancellationsService: BookingCancellationsService,
  ) {}

  @Post()
  @RequirePermissions('booking.cancel')
  @ApiOperation({ summary: 'Request booking cancellation' })
  request(
    @Body() dto: RequestBookingCancellationDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.bookingCancellationsService.request(dto, actor.id);
  }

  @Get()
  @RequirePermissions('booking.view')
  @ApiOperation({ summary: 'List booking cancellations' })
  list(@Query() query: ListBookingCancellationsQueryDto) {
    return this.bookingCancellationsService.list(query);
  }

  @Get(':id')
  @RequirePermissions('booking.view')
  @ApiOperation({ summary: 'Get booking cancellation by id' })
  getById(@Param('id') id: string) {
    return this.bookingCancellationsService.getById(id);
  }

  @Post(':id/review')
  @RequirePermissions('booking.cancel')
  @ApiOperation({ summary: 'Review cancellation (Requested → Reviewed)' })
  review(
    @Param('id') id: string,
    @Body() dto: ReviewBookingCancellationDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.bookingCancellationsService.review(id, dto, actor.id);
  }

  @Post(':id/submit-approval')
  @RequirePermissions('booking.cancel')
  @ApiOperation({ summary: 'Submit reviewed cancellation for approval' })
  submitForApproval(
    @Param('id') id: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.bookingCancellationsService.submitForApproval(id, actor.id);
  }

  @Post(':id/approve')
  @RequirePermissions('booking.approve')
  @ApiOperation({ summary: 'Approve cancellation (Reviewed/Pending → Approved)' })
  approve(
    @Param('id') id: string,
    @Body() dto: ApproveBookingCancellationDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.bookingCancellationsService.approve(id, dto, actor.id);
  }

  @Post(':id/reject')
  @RequirePermissions('booking.approve')
  @ApiOperation({ summary: 'Reject booking cancellation' })
  reject(
    @Param('id') id: string,
    @Body() dto: RejectBookingCancellationDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.bookingCancellationsService.reject(id, dto, actor.id);
  }

  @Post(':id/process-refund')
  @RequirePermissions('collection.refund')
  @ApiOperation({
    summary: 'Process customer refund and post accounting entry',
  })
  processRefund(
    @Param('id') id: string,
    @Body() dto: ProcessRefundDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.bookingCancellationsService.processRefund(id, dto, actor.id);
  }

  @Post(':id/release-unit')
  @RequirePermissions('booking.cancel')
  @ApiOperation({
    summary:
      'Release unit (final step — only after approval and refund when due)',
  })
  releaseUnit(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.bookingCancellationsService.releaseUnit(id, actor.id);
  }

  @Post(':id/documents')
  @RequirePermissions('booking.cancel')
  @ApiOperation({ summary: 'Attach cancellation / refund document metadata' })
  addDocument(
    @Param('id') id: string,
    @Body() dto: AddCancellationDocumentDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.bookingCancellationsService.addDocument(id, dto, actor.id);
  }
}
