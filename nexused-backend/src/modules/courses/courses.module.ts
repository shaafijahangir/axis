import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course, CourseSection, Enrollment } from '../../database/entities';
import { CoursesService } from './courses.service';
import { CoursesResolver } from './courses.resolver';
import { AdminCoursesResolver } from './admin-courses.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([Course, CourseSection, Enrollment])],
  providers: [CoursesService, CoursesResolver, AdminCoursesResolver],
  exports: [CoursesService],
})
export class CoursesModule {}
