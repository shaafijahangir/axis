import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DegreeProgram } from '../../database/entities/degree-program.entity';
import { StudentDegreeProfile } from '../../database/entities/student-degree-profile.entity';
import { Course } from '../../database/entities/course.entity';
import { CourseSection } from '../../database/entities/course-section.entity';
import { Enrollment } from '../../database/entities/enrollment.entity';
import { Tenant } from '../../database/entities/tenant.entity';
import { PlannerService } from './planner.service';
import { PlannerResolver } from './planner.resolver';
import { GraduationPlan } from './entities/graduation-plan.entity';
import { GraduationPlannerService } from './graduation-planner.service';
import { GraduationPlannerResolver } from './graduation-planner.resolver';
import { FinancialProjectionService } from './financial-projection.service';
import { FinancialProjectionResolver } from './financial-projection.resolver';

/**
 * Planner module — degree planning, progress tracking, and graduation planning.
 *
 * WHY: Separates degree planning from the courses module because
 * it has distinct concerns (degree requirements, prerequisite chains,
 * graduation progress) that don't belong in course CRUD.
 *
 * PATTERN: Exports PlannerService, GraduationPlannerService, and
 * FinancialProjectionService so the AI module can create tools that
 * call these methods (GRAD-002, GRAD-003).
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      DegreeProgram,
      StudentDegreeProfile,
      Course,
      CourseSection,
      Enrollment,
      GraduationPlan,
      Tenant,
    ]),
  ],
  providers: [
    PlannerService,
    PlannerResolver,
    GraduationPlannerService,
    GraduationPlannerResolver,
    FinancialProjectionService,
    FinancialProjectionResolver,
  ],
  exports: [
    PlannerService,
    GraduationPlannerService,
    FinancialProjectionService,
  ],
})
export class PlannerModule {}
