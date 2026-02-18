import { Resolver, Query, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { User } from '../../database/entities/user.entity';
import { CoursesService } from './courses.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';
import {
  StudentCatalogFilter,
  StudentCatalogPage,
} from './dto/catalog-student.types';

/**
 * ENROLL-001: Student-facing course catalog resolver.
 *
 * WHY separate from AdminCoursesResolver?
 * - Admin catalog returns raw Course entities (no section-level enrichment).
 * - Student catalog returns section-centric cards with live seat counts
 *   and instructor display names.
 * - Role scope is different: admin-only vs any authenticated user.
 *
 * No @Roles() guard here — any authenticated user (student, instructor,
 * admin, parent) should be able to browse the course catalog.
 */
@Resolver()
@UseGuards(JwtAuthGuard)
export class StudentCatalogResolver {
  constructor(private readonly coursesService: CoursesService) {}

  @Query(() => StudentCatalogPage, {
    description:
      'Browse the course catalog. Returns courses with active sections in the current (or specified) term, including live seat counts.',
  })
  async courseCatalog(
    @CurrentUser() user: User,
    @Args('filters', { nullable: true }) filters?: StudentCatalogFilter,
  ): Promise<StudentCatalogPage> {
    return this.coursesService.studentCatalog(user.tenantId, filters ?? {});
  }
}
