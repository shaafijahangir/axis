import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../database/entities/user.entity';
import { Enrollment } from '../../database/entities/enrollment.entity';
import { Assignment } from '../../database/entities/assignment.entity';
import { CalendarService } from './calendar.service';
import { CalendarController } from './calendar.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, Enrollment, Assignment])],
  providers: [CalendarService],
  controllers: [CalendarController],
})
export class CalendarModule {}
