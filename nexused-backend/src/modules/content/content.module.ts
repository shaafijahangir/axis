import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseContent } from './course-content.entity';
import { ContentService } from './content.service';
import { ContentResolver } from './content.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([CourseContent])],
  providers: [ContentService, ContentResolver],
  exports: [ContentService],
})
export class ContentModule {}
