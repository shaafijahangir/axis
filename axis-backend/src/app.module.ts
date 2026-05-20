import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { GqlThrottlerGuard } from './guards/gql-throttler.guard';
import { SentryModule, SentryGlobalFilter } from '@sentry/nestjs/setup';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BullModule } from '@nestjs/bullmq';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppResolver } from './app.resolver';
import { HealthController } from './health/health.controller';
import { TenantModule } from './tenant/tenant.module';
import { TenantInterceptor } from './tenant/tenant.interceptor';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import authConfig from './config/auth.config';
import aiConfig from './config/ai.config';
import ltiConfig from './config/lti.config';
import storageConfig from './config/storage.config';
import emailConfig from './config/email.config';
import notificationsConfig from './config/notifications.config';
import { entities } from './database/entities';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CoursesModule } from './modules/courses/courses.module';
import { AiModule } from './modules/ai/ai.module';
import { AssignmentsModule } from './modules/assignments/assignments.module';
import { AnnouncementsModule } from './modules/announcements/announcements.module';
import { FeedModule } from './modules/feed/feed.module';
import { AcademicTermsModule } from './modules/academic-terms/academic-terms.module';
import { ContentModule } from './modules/content/content.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { LtiModule } from './modules/lti/lti.module';
import { PlannerModule } from './modules/planner/planner.module';
import { CatalogExtractModule } from './modules/catalog-extract/catalog-extract.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { DiscussionsModule } from './modules/discussions/discussions.module';
import { QuizModule } from './modules/quiz/quiz.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { ReportCardsModule } from './modules/report-cards/report-cards.module';
import { ParentModule } from './modules/parent/parent.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfig,
        databaseConfig,
        authConfig,
        aiConfig,
        ltiConfig,
        storageConfig,
        emailConfig,
        notificationsConfig,
      ],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('database.host'),
        port: configService.get('database.port'),
        username: configService.get('database.username'),
        password: configService.get('database.password'),
        database: configService.get('database.database'),
        schema: configService.get('database.schema'),
        entities: entities,
        // SPRINT-7: synchronize is OFF in production (and any non-dev env)
        // to prevent schema-drift data loss. Dev can opt in via
        // DATABASE_SYNCHRONIZE=true. Run migrations otherwise:
        //   npm run migration:generate -- src/database/migrations/<Name>
        //   npm run migration:run
        synchronize:
          process.env.NODE_ENV !== 'production' &&
          process.env.DATABASE_SYNCHRONIZE !== 'false',
        migrationsRun: configService.get('database.migrationsRun'),
        migrations: ['dist/database/migrations/*.js'],
        logging: configService.get('database.logging'),
      }),
    }),
    // T3-003: Sentry error tracking (only active when SENTRY_DSN env var is set)
    SentryModule.forRoot(),
    // HTTP rate limiting — 100 req/min globally, stricter limits on auth endpoints
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 100,
      },
    ]),
    // In-process event system for AI reactions and audit logging
    EventEmitterModule.forRoot(),
    // Redis-backed job queue for heavy async AI tasks (feedback generation, etc.)
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('ai.redis.host'),
          port: configService.get('ai.redis.port'),
          password: configService.get('ai.redis.password'),
        },
      }),
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      playground: true,
      path: '/api/graphql',
      context: ({ req }: { req: unknown }) => ({ req }),
    }),
    AuthModule,
    UsersModule,
    TenantModule,
    CoursesModule,
    AssignmentsModule,
    AnnouncementsModule,
    FeedModule,
    AcademicTermsModule,
    ContentModule,
    AiModule,
    MessagingModule,
    AnalyticsModule,
    LtiModule,
    PlannerModule,
    CatalogExtractModule,
    UploadsModule,
    NotificationsModule,
    DiscussionsModule,
    QuizModule,
    CalendarModule,
    AttendanceModule,
    ReportCardsModule,
    ParentModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    AppResolver,
    // ARCH-002: Global tenant context interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantInterceptor,
    },
    // T3-003: Sentry global exception filter — captures unhandled errors
    {
      provide: APP_FILTER,
      useClass: SentryGlobalFilter,
    },
    // T3-005: Global rate limiting guard — GqlThrottlerGuard handles both REST and GraphQL contexts
    {
      provide: APP_GUARD,
      useClass: GqlThrottlerGuard,
    },
  ],
})
export class AppModule {}
