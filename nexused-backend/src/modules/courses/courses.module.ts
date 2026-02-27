import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course, CourseSection, Enrollment } from '../../database/entities';
import { DegreeProgram } from '../../database/entities/degree-program.entity';
import { StudentDegreeProfile } from '../../database/entities/student-degree-profile.entity';
import { CoursesService } from './courses.service';
import { CoursesResolver } from './courses.resolver';
import { AdminCoursesResolver } from './admin-courses.resolver';
import { StudentCatalogResolver } from './student-catalog.resolver';
import { CsvImportService } from './csv-import.service';
import { EnrollmentPolicyService } from './enrollment-policy.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Course,
      CourseSection,
      Enrollment,
      DegreeProgram,
      StudentDegreeProfile,
    ]),
  ],
  providers: [
    CoursesService,
    CoursesResolver,
    AdminCoursesResolver,
    StudentCatalogResolver,
    CsvImportService,
    EnrollmentPolicyService,
  ],
  exports: [CoursesService],
})
export class CoursesModule {}
