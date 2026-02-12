import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import {
  LtiPlatform,
  LtiDeployment,
  LtiContext,
  LtiUser,
  LtiState,
} from './entities';
import { User } from '../../database/entities/user.entity';
import { LtiService } from './lti.service';
import { LtiController } from './lti.controller';
import { LtiResolver } from './lti.resolver';
import { LtiCleanupService } from './lti-cleanup.service';
import { AuthModule } from '../auth/auth.module';

/**
 * LTI Module
 *
 * Provides LTI 1.3 integration for NexusEd:
 * - Platform registration and management (admin UI)
 * - OIDC login flow (REST endpoints)
 * - User provisioning and role mapping
 * - Context (course) linking
 *
 * WHY separate module: LTI is a standard protocol that should be
 * self-contained and not tightly coupled to core business logic.
 * This module can be disabled for tenants that don't need LTI.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      LtiPlatform,
      LtiDeployment,
      LtiContext,
      LtiUser,
      LtiState,
      User,
    ]),
    ConfigModule,
    ScheduleModule.forRoot(),
    AuthModule,
  ],
  controllers: [LtiController],
  providers: [LtiService, LtiResolver, LtiCleanupService],
  exports: [LtiService],
})
export class LtiModule {}
