import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OfficeHourBlock } from './entities/office-hour-block.entity';
import { Booking } from './entities/booking.entity';
import { BusyBlock } from './entities/busy-block.entity';
import { CourseSection } from '../../database/entities/course-section.entity';
import { OfficeHoursService } from './office-hours.service';
import { OfficeHoursResolver } from './office-hours.resolver';

/**
 * FEAT-018/019: Office-hours booking + instructor schedule module.
 * CourseSection is registered read-only: conflict detection checks new blocks
 * against the instructor's lecture times.
 * Exports OfficeHoursService so the AI module can wrap it as agent tools.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      OfficeHourBlock,
      Booking,
      BusyBlock,
      CourseSection,
    ]),
  ],
  providers: [OfficeHoursService, OfficeHoursResolver],
  exports: [OfficeHoursService],
})
export class OfficeHoursModule {}
