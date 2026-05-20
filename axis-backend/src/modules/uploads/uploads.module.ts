import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileUpload } from './entities/file-upload.entity';
import { User } from '../../database/entities/user.entity';
import { UploadsService } from './uploads.service';
import { UploadsResolver } from './uploads.resolver';
import { UploadsCleanupService } from './uploads-cleanup.service';

@Module({
  imports: [TypeOrmModule.forFeature([FileUpload, User])],
  providers: [UploadsService, UploadsResolver, UploadsCleanupService],
  exports: [UploadsService],
})
export class UploadsModule {}
