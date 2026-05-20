import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Attendance } from '../../database/entities/attendance.entity';
import { Enrollment } from '../../database/entities/enrollment.entity';
import { AttendanceService } from './attendance.service';
import { AttendanceResolver } from './attendance.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([Attendance, Enrollment])],
  providers: [AttendanceService, AttendanceResolver],
  exports: [AttendanceService],
})
export class AttendanceModule {}
