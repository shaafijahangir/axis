import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { OfficeHoursService } from './office-hours.service';
import { OfficeHourBlock } from './entities/office-hour-block.entity';
import { Booking } from './entities/booking.entity';
import {
  CreateOfficeHourBlockInput,
  UpdateOfficeHourBlockInput,
  AvailableSlotsInput,
  BookSlotInput,
  AvailableSlot,
} from './dto/office-hours.types';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { User, UserRole } from '../../database/entities/user.entity';

/**
 * FEAT-018: Office-hours booking. Thin resolver — all logic lives in the
 * service, every call is scoped to the caller's tenant.
 */
@Resolver()
@UseGuards(JwtAuthGuard)
export class OfficeHoursResolver {
  constructor(private readonly officeHoursService: OfficeHoursService) {}

  // ─── Queries ─────────────────────────────────────────────────────────────

  /** Instructor's own blocks (management view — includes inactive). */
  @Query(() => [OfficeHourBlock])
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  async myOfficeHourBlocks(
    @CurrentUser() user: User,
  ): Promise<OfficeHourBlock[]> {
    return this.officeHoursService.listMyBlocks(user.tenantId, user.id);
  }

  /** Active blocks for a given instructor (student-facing). */
  @Query(() => [OfficeHourBlock])
  async officeHourBlocks(
    @CurrentUser() user: User,
    @Args('instructorId', ParseUUIDPipe) instructorId: string,
  ): Promise<OfficeHourBlock[]> {
    return this.officeHoursService.listActiveBlocks(
      user.tenantId,
      instructorId,
    );
  }

  /** Open slots for an instructor across a date range. */
  @Query(() => [AvailableSlot])
  async availableOfficeHourSlots(
    @CurrentUser() user: User,
    @Args('input') input: AvailableSlotsInput,
  ): Promise<AvailableSlot[]> {
    return this.officeHoursService.computeAvailableSlots(user.tenantId, input);
  }

  /** The current student's upcoming bookings. */
  @Query(() => [Booking])
  async myBookings(@CurrentUser() user: User): Promise<Booking[]> {
    return this.officeHoursService.listMyBookings(user.tenantId, user.id);
  }

  /** The current instructor's upcoming bookings. */
  @Query(() => [Booking])
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  async instructorBookings(@CurrentUser() user: User): Promise<Booking[]> {
    return this.officeHoursService.listInstructorBookings(
      user.tenantId,
      user.id,
    );
  }

  // ─── Mutations ───────────────────────────────────────────────────────────

  @Mutation(() => OfficeHourBlock)
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  async createOfficeHourBlock(
    @CurrentUser() user: User,
    @Args('input') input: CreateOfficeHourBlockInput,
  ): Promise<OfficeHourBlock> {
    return this.officeHoursService.createBlock(user.tenantId, user.id, input);
  }

  @Mutation(() => OfficeHourBlock)
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  async updateOfficeHourBlock(
    @CurrentUser() user: User,
    @Args('input') input: UpdateOfficeHourBlockInput,
  ): Promise<OfficeHourBlock> {
    return this.officeHoursService.updateBlock(user.tenantId, user.id, input);
  }

  @Mutation(() => OfficeHourBlock)
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  async deactivateOfficeHourBlock(
    @CurrentUser() user: User,
    @Args('id', ParseUUIDPipe) id: string,
  ): Promise<OfficeHourBlock> {
    return this.officeHoursService.deactivateBlock(user.tenantId, user.id, id);
  }

  @Mutation(() => Booking)
  @UseGuards(RolesGuard)
  @Roles(UserRole.STUDENT, UserRole.TA)
  async bookOfficeHourSlot(
    @CurrentUser() user: User,
    @Args('input') input: BookSlotInput,
  ): Promise<Booking> {
    return this.officeHoursService.bookSlot(user.tenantId, user.id, input);
  }

  /**
   * Cancel a booking. No @Roles — a student cancels their own, an instructor
   * cancels bookings on their blocks; the service enforces which.
   */
  @Mutation(() => Booking)
  async cancelBooking(
    @CurrentUser() user: User,
    @Args('bookingId', ParseUUIDPipe) bookingId: string,
  ): Promise<Booking> {
    return this.officeHoursService.cancelBooking(
      user.tenantId,
      user.id,
      bookingId,
    );
  }
}
