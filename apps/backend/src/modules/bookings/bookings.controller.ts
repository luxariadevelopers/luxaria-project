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
import { BookingsService } from './bookings.service';
import { ProjectScoped } from '../project-access/decorators/route-scope.decorator';
import {
  ApproveBookingDiscountDto,
  CancelBookingDto,
  CreateBookingDto,
  ListBookingsQueryDto,
  RejectBookingDiscountDto,
  TransitionBookingDto,
  UpdateBookingDto,
} from './dto/booking.dto';

@ProjectScoped({
  mode: 'filter',
  resource: { resourceType: 'booking', idParam: 'id' },
  operation: 'read',
})
@ApiTags('Bookings')
@ApiBearerAuth()
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @RequirePermissions('booking.create')
  @ApiOperation({ summary: 'Create unit booking (starts on Hold)' })
  create(@Body() dto: CreateBookingDto, @CurrentUser() actor: AuthUser) {
    return this.bookingsService.create(dto, actor.id);
  }

  @Get()
  @RequirePermissions('booking.view')
  @ApiOperation({ summary: 'List / search bookings' })
  list(
    @Query() query: ListBookingsQueryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.bookingsService.list(query, actor.id);
  }

  @Post('jobs/expire-holds')
  @RequirePermissions('booking.approve')
  @ApiOperation({ summary: 'Manually run hold-expiry job' })
  expireHolds(@CurrentUser() actor: AuthUser) {
    return this.bookingsService.expireHolds(actor.id);
  }

  @Get(':id')
  @RequirePermissions('booking.view')
  @ApiOperation({ summary: 'Get booking by id' })
  getById(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.bookingsService.getById(id, actor.id);
  }

  @Patch(':id')
  @RequirePermissions('booking.create')
  @ApiOperation({ summary: 'Update hold / pending_approval booking' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBookingDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.bookingsService.update(id, dto, actor.id);
  }

  @Post(':id/transition')
  @RequirePermissions('booking.create')
  @ApiOperation({
    summary: 'Advance workflow: Reserved → Booked → Agreement → Registered',
  })
  transition(
    @Param('id') id: string,
    @Body() dto: TransitionBookingDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.bookingsService.transition(id, dto, actor.id);
  }

  @Post(':id/approve-discount')
  @RequirePermissions('booking.approve')
  @ApiOperation({ summary: 'Approve discount that exceeds policy limit' })
  approveDiscount(
    @Param('id') id: string,
    @Body() dto: ApproveBookingDiscountDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.bookingsService.approveDiscount(id, dto, actor.id);
  }

  @Post(':id/reject-discount')
  @RequirePermissions('booking.approve')
  @ApiOperation({ summary: 'Reject over-limit discount and cancel booking' })
  rejectDiscount(
    @Param('id') id: string,
    @Body() dto: RejectBookingDiscountDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.bookingsService.rejectDiscount(id, dto, actor.id);
  }

  @Post(':id/cancel')
  @RequirePermissions('booking.create')
  @ApiOperation({ summary: 'Cancel booking and release unit' })
  cancel(
    @Param('id') id: string,
    @Body() dto: CancelBookingDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.bookingsService.cancel(id, dto, actor.id);
  }

  @Post(':id/booking-form')
  @RequirePermissions('booking.view')
  @ApiOperation({ summary: 'Generate booking form PDF' })
  generateBookingForm(
    @Param('id') id: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.bookingsService.generateBookingForm(id, actor.id);
  }
}
