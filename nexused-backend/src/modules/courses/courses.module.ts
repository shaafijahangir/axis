import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course, CourseSection, Enrollment } from '../../database/entities';
import { DegreeProgram } from '../../database/entities/degree-program.entity';
import { CoursesService } from './courses.service';
import { CoursesResolver } from './courses.resolver';
import { AdminCoursesResolver } from './admin-courses.resolver';
import { CsvImportService } from './csv-import.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Course,
      CourseSection,
      Enrollment,
      DegreeProgram,
    ]),
  ],
  providers: [
    CoursesService,
    CoursesResolver,
    AdminCoursesResolver,
    CsvImportService,
  ],
  exports: [CoursesService],
})
export class CoursesModule {}
