import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantResolver } from './tenant.resolver';
import { TenantService } from './tenant.service';
import { TenantContext } from './tenant-context';
import { TenantInterceptor } from './tenant.interceptor';
import { Tenant } from '../database/entities/tenant.entity';

/**
 * ARCH-002: Made global so TenantContext is available throughout the app
 * without needing to import TenantModule everywhere.
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Tenant])],
  providers: [TenantResolver, TenantService, TenantContext, TenantInterceptor],
  exports: [TenantService, TenantContext, TenantInterceptor],
})
export class TenantModule {}
