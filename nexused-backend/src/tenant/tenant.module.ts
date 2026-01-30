import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantResolver } from './tenant.resolver';
import { TenantService } from './tenant.service';
import { Tenant } from '../database/entities/tenant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant])],
  providers: [TenantResolver, TenantService],
  exports: [TenantService],
})
export class TenantModule { }
