import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DegreeProgram } from '../../database/entities/degree-program.entity';
import { StudentDegreeProfile } from '../../database/entities/student-degree-profile.entity';
import { Course } from '../../database/entities/course.entity';
import { PlannerService } from './planner.service';
import { PlannerResolver } from './planner.resolver';

/**
 * Planner module — degree planning and progress tracking.
 *
 * WHY: Separates degree planning from the courses module because
 * it has distinct concerns (degree requirements, prerequisite chains,
 * graduation progress) that don't belong in course CRUD.
 *
 * PATTERN: Exports PlannerService so the AI module can create
 * planner tools that call these methods.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([DegreeProgram, StudentDegreeProfile, Course]),
  ],
  providers: [PlannerService, PlannerResolver],
  exports: [PlannerService],
})
export class PlannerModule {}
