import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { User, UserRole } from '../../database/entities/user.entity';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { Roles } from '../../decorators/roles.decorator';
import { AttendanceService } from './attendance.service';
import {
  MarkAttendanceInput,
  DayAttendance,
  StudentAttendanceSummary,
} from './dto/attendance.types';

@Resolver()
@UseGuards(JwtAuthGuard)
export class AttendanceResolver {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Mutation(() => DayAttendance)
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.TA, UserRole.ADMIN)
  async markAttendance(
    @CurrentUser() user: User,
    @Args('input') input: MarkAttendanceInput,
  ): Promise<DayAttendance> {
    return this.attendanceService.markAttendance(user.tenantId, input);
  }

  @Query(() => DayAttendance)
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.TA, UserRole.ADMIN)
  async sectionAttendance(
    @CurrentUser() user: User,
    @Args('sectionId') sectionId: string,
    @Args('date') date: string,
  ): Promise<DayAttendance> {
    return this.attendanceService.getSectionAttendance(
      sectionId,
      date,
      user.tenantId,
    );
  }

  @Query(() => [StudentAttendanceSummary])
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.TA, UserRole.ADMIN)
  async sectionAttendanceSummaries(
    @CurrentUser() user: User,
    @Args('sectionId') sectionId: string,
  ): Promise<StudentAttendanceSummary[]> {
    return this.attendanceService.getSectionAttendanceSummaries(
      sectionId,
      user.tenantId,
    );
  }

  @Query(() => [StudentAttendanceSummary])
  async myAttendanceSummaries(
    @CurrentUser() user: User,
  ): Promise<StudentAttendanceSummary[]> {
    return this.attendanceService.getMyAttendanceSummaries(
      user.id,
      user.tenantId,
    );
  }
}
