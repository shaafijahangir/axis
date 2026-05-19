import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course, CourseSection, Enrollment } from '../../database/entities';
import { DegreeProgram } from '../../database/entities/degree-program.entity';
import { StudentDegreeProfile } from '../../database/entities/student-degree-profile.entity';
import { User } from '../../database/entities/user.entity';
import { AcademicTerm } from '../../database/entities/academic-term.entity';
import { CoursesService } from './courses.service';
import { CoursesResolver } from './courses.resolver';
import { AdminCoursesResolver } from './admin-courses.resolver';
import { StudentCatalogResolver } from './student-catalog.resolver';
import { CsvImportService } from './csv-import.service';
import { EnrollmentPolicyService } from './enrollment-policy.service';
import { WaitlistService } from './waitlist.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Course,
      CourseSection,
      Enrollment,
      DegreeProgram,
      StudentDegreeProfile,
      User,
      AcademicTerm,
    ]),
  ],
  providers: [
    CoursesService,
    CoursesResolver,
    AdminCoursesResolver,
    StudentCatalogResolver,
    CsvImportService,
    EnrollmentPolicyService,
    WaitlistService,
  ],
  exports: [CoursesService, WaitlistService],
})
export class CoursesModule {}
