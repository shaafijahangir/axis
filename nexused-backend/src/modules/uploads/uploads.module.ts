import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileUpload } from './entities/file-upload.entity';
import { UploadsService } from './uploads.service';
import { UploadsResolver } from './uploads.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([FileUpload])],
  providers: [UploadsService, UploadsResolver],
  exports: [UploadsService],
})
export class UploadsModule {}
