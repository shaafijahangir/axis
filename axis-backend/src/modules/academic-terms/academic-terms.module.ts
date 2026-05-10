import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademicTerm, CourseSection } from '../../database/entities';
import { AcademicTermsService } from './academic-terms.service';
import { AcademicTermsResolver } from './academic-terms.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([AcademicTerm, CourseSection])],
  providers: [AcademicTermsService, AcademicTermsResolver],
  exports: [AcademicTermsService],
})
export class AcademicTermsModule {}
