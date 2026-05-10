import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersResolver } from './users.resolver';
import { AdminUsersResolver } from './admin-users.resolver';
import { User } from '../../database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UsersService, UsersResolver, AdminUsersResolver],
  exports: [UsersService],
})
export class UsersModule {}
