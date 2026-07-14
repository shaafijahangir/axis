import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OfficeHourBlock } from './entities/office-hour-block.entity';
import { Booking } from './entities/booking.entity';
import { OfficeHoursService } from './office-hours.service';
import { OfficeHoursResolver } from './office-hours.resolver';

/**
 * FEAT-018: Office-hours booking module.
 * Exports OfficeHoursService so the AI module can wrap it as agent tools.
 */
@Module({
  imports: [TypeOrmModule.forFeature([OfficeHourBlock, Booking])],
  providers: [OfficeHoursService, OfficeHoursResolver],
  exports: [OfficeHoursService],
})
export class OfficeHoursModule {}
