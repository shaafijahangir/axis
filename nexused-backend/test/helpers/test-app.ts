/**
 * Integration Test Application Helper
 *
 * WHY: Provides a reusable test application setup for integration tests.
 * Creates a real NestJS app with test database connection and utilities
 * for authentication testing.
 *
 * PATTERN: Test Fixture - shared setup code for consistent test environments.
 *
 * NOTE: These tests require a running PostgreSQL database. In CI, this is
 * provided by the GitHub Actions PostgreSQL service container. Locally,
 * tests will be skipped if no database is available.
 */

import { Client } from 'pg';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DataSource, Repository } from 'typeorm';
import { join } from 'path';
import cookieParser from 'cookie-parser';

import { entities } from '../../src/database/entities';
import { AuthModule } from '../../src/modules/auth/auth.module';
import { UsersModule } from '../../src/modules/users/users.module';
import { CoursesModule } from '../../src/modules/courses/courses.module';
import { AssignmentsModule } from '../../src/modules/assignments/assignments.module';
import { AnnouncementsModule } from '../../src/modules/announcements/announcements.module';
import { FeedModule } from '../../src/modules/feed/feed.module';
import { TenantModule } from '../../src/tenant/tenant.module';
import { TenantInterceptor } from '../../src/tenant/tenant.interceptor';
import { APP_INTERCEPTOR } from '@nestjs/core';
import {
  Tenant,
  User,
  Course,
  CourseSection,
  AcademicTerm,
  Enrollment,
  Assignment,
  Submission,
  Announcement,
  UserRole,
  UserStatus,
  EnrollmentStatus,
  SectionStatus,
  SubscriptionPlan,
  AssignmentType,
} from '../../src/database/entities';

// Test configuration
const TEST_JWT_SECRET = 'test-jwt-secret-for-integration-tests';

/**
 * Check if the test database is available.
 * Returns true if we can connect, false otherwise.
 */
export async function isDatabaseAvailable(): Promise<boolean> {
  const client = new Client({
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    user: process.env.DATABASE_USERNAME || 'test',
    password: process.env.DATABASE_PASSWORD || 'test',
    database: process.env.DATABASE_NAME || 'nexused_test',
    connectionTimeoutMillis: 3000,
  });

  try {
    await client.connect();
    await client.end();
    return true;
  } catch {
    return false;
  }
}

export interface TestUser {
  id: string;
  email: string;
  tenantId: string;
  roles: UserRole[];
  token: string;
}

export interface TestContext {
  app: INestApplication;
  dataSource: DataSource;
  jwtService: JwtService;

  // Repositories for direct database manipulation
  tenantRepo: Repository<Tenant>;
  userRepo: Repository<User>;
  courseRepo: Repository<Course>;
  sectionRepo: Repository<CourseSection>;
  termRepo: Repository<AcademicTerm>;
  enrollmentRepo: Repository<Enrollment>;
  assignmentRepo: Repository<Assignment>;
  submissionRepo: Repository<Submission>;
  announcementRepo: Repository<Announcement>;

  // Utility methods
  createTestTenant(name?: string): Promise<Tenant>;
  createTestUser(
    tenant: Tenant,
    roles: UserRole[],
    email?: string,
  ): Promise<TestUser>;
  createTestCourse(tenant: Tenant): Promise<Course>;
  createTestTerm(tenant: Tenant): Promise<AcademicTerm>;
  createTestSection(
    course: Course,
    instructor: User,
    term: AcademicTerm,
  ): Promise<CourseSection>;
  createTestEnrollment(
    tenant: Tenant,
    user: User,
    section: CourseSection,
  ): Promise<Enrollment>;
  createTestAssignment(
    tenant: Tenant,
    section: CourseSection,
  ): Promise<Assignment>;
  generateToken(user: TestUser): string;
  cleanDatabase(): Promise<void>;
}

/**
 * Creates a fully configured test application with database connection.
 * Uses environment variables for database config (set in CI via GitHub Actions).
 */
export async function createTestApp(): Promise<TestContext> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        // Use test environment variables
        envFilePath: '.env.test',
        load: [
          () => ({
            auth: {
              jwtSecret: TEST_JWT_SECRET,
              jwtExpiration: '1h',
            },
            database: {
              host: process.env.DATABASE_HOST || 'localhost',
              port: parseInt(process.env.DATABASE_PORT || '5432', 10),
              username: process.env.DATABASE_USERNAME || 'test',
              password: process.env.DATABASE_PASSWORD || 'test',
              database: process.env.DATABASE_NAME || 'nexused_test',
              synchronize: true,
              logging: false,
            },
            ai: {
              redis: {
                host: 'localhost',
                port: 6379,
                password: '',
              },
            },
          }),
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
          entities: entities,
          synchronize: true,
          logging: false,
          dropSchema: false, // Don't drop schema on each test - use cleanDatabase()
        }),
      }),
      JwtModule.register({
        secret: TEST_JWT_SECRET,
        signOptions: { expiresIn: '1h' },
      }),
      EventEmitterModule.forRoot(),
      GraphQLModule.forRoot<ApolloDriverConfig>({
        driver: ApolloDriver,
        autoSchemaFile: join(process.cwd(), 'test/schema.test.gql'),
        sortSchema: true,
        playground: false,
        path: '/api/graphql',
        context: ({ req }) => ({ req }),
      }),
      TypeOrmModule.forFeature(entities),
      AuthModule,
      UsersModule,
      TenantModule,
      CoursesModule,
      AssignmentsModule,
      AnnouncementsModule,
      FeedModule,
    ],
    providers: [
      {
        provide: APP_INTERCEPTOR,
        useClass: TenantInterceptor,
      },
    ],
  })
    // Override BullMQ to avoid Redis dependency in tests
    .overrideProvider('BullModule_nexus-ai-jobs_QUEUE')
    .useValue({
      add: jest.fn(),
    })
    .compile();

  const app = moduleFixture.createNestApplication();

  // Apply same middleware as production
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  await app.init();

  const dataSource = moduleFixture.get(DataSource);
  const jwtService = moduleFixture.get(JwtService);

  // Get repositories
  const tenantRepo = dataSource.getRepository(Tenant);
  const userRepo = dataSource.getRepository(User);
  const courseRepo = dataSource.getRepository(Course);
  const sectionRepo = dataSource.getRepository(CourseSection);
  const termRepo = dataSource.getRepository(AcademicTerm);
  const enrollmentRepo = dataSource.getRepository(Enrollment);
  const assignmentRepo = dataSource.getRepository(Assignment);
  const submissionRepo = dataSource.getRepository(Submission);
  const announcementRepo = dataSource.getRepository(Announcement);

  // Counter for unique values
  let counter = 0;
  const nextId = () => String(++counter);

  // Utility: Generate JWT token for test user
  const generateToken = (user: TestUser): string => {
    return jwtService.sign({
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      roles: user.roles,
    });
  };

  // Utility: Create a test tenant
  const createTestTenant = async (name?: string): Promise<Tenant> => {
    const id = nextId();
    const tenant = tenantRepo.create({
      name: name || `Test Tenant ${id}`,
      domain: `tenant${id}.test.com`,
      subdomain: `t${id}`,
      subscriptionPlan: SubscriptionPlan.BASIC,
      settings: {},
    });
    return tenantRepo.save(tenant) as Promise<Tenant>;
  };

  // Utility: Create a test user with JWT token
  const createTestUser = async (
    tenant: Tenant,
    roles: UserRole[],
    email?: string,
  ): Promise<TestUser> => {
    const id = nextId();
    const user = userRepo.create({
      tenantId: tenant.id,
      email: email || `user${id}@test.com`,
      firstName: 'Test',
      lastName: `User ${id}`,
      roles,
      status: UserStatus.ACTIVE,
      passwordHash: 'hashed',
    });
    const savedUser = (await userRepo.save(user)) as User;

    const testUser: TestUser = {
      id: savedUser.id,
      email: savedUser.email,
      tenantId: savedUser.tenantId,
      roles: savedUser.roles,
      token: '',
    };
    testUser.token = generateToken(testUser);

    return testUser;
  };

  // Utility: Create a test course
  const createTestCourse = async (tenant: Tenant): Promise<Course> => {
    const id = nextId();
    const course = courseRepo.create({
      tenantId: tenant.id,
      code: `CS${id}`,
      title: `Test Course ${id}`,
      description: 'A test course',
    });
    return courseRepo.save(course) as Promise<Course>;
  };

  // Utility: Create a test term
  const createTestTerm = async (tenant: Tenant): Promise<AcademicTerm> => {
    const id = nextId();
    const term = termRepo.create({
      tenantId: tenant.id,
      name: `Term ${id}`,
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-05-31'),
      isCurrent: true,
    });
    return termRepo.save(term);
  };

  // Utility: Create a test section
  const createTestSection = async (
    course: Course,
    instructor: User,
    term: AcademicTerm,
  ): Promise<CourseSection> => {
    const section = sectionRepo.create({
      courseId: course.id,
      instructorId: instructor.id,
      termId: term.id,
      status: SectionStatus.ACTIVE,
      capacity: 30,
    });
    return sectionRepo.save(section) as Promise<CourseSection>;
  };

  // Utility: Create a test enrollment
  const createTestEnrollment = async (
    tenant: Tenant,
    user: User,
    section: CourseSection,
  ): Promise<Enrollment> => {
    const enrollment = enrollmentRepo.create({
      tenantId: tenant.id,
      userId: user.id,
      sectionId: section.id,
      status: EnrollmentStatus.ACTIVE,
      enrolledAt: new Date(),
    });
    return enrollmentRepo.save(enrollment);
  };

  // Utility: Create a test assignment
  const createTestAssignment = async (
    tenant: Tenant,
    section: CourseSection,
  ): Promise<Assignment> => {
    const id = nextId();
    const assignment = assignmentRepo.create({
      tenantId: tenant.id,
      sectionId: section.id,
      title: `Assignment ${id}`,
      description: 'Test assignment',
      type: AssignmentType.ASSIGNMENT,
      pointsPossible: 100,
      dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    return assignmentRepo.save(assignment) as Promise<Assignment>;
  };

  // Utility: Clean all data from database
  const cleanDatabase = async (): Promise<void> => {
    // Delete in reverse order of foreign key dependencies
    await submissionRepo.delete({});
    await assignmentRepo.delete({});
    await announcementRepo.delete({});
    await enrollmentRepo.delete({});
    await sectionRepo.delete({});
    await courseRepo.delete({});
    await termRepo.delete({});
    await userRepo.delete({});
    await tenantRepo.delete({});
  };

  return {
    app,
    dataSource,
    jwtService,
    tenantRepo,
    userRepo,
    courseRepo,
    sectionRepo,
    termRepo,
    enrollmentRepo,
    assignmentRepo,
    submissionRepo,
    announcementRepo,
    createTestTenant,
    createTestUser,
    createTestCourse,
    createTestTerm,
    createTestSection,
    createTestEnrollment,
    createTestAssignment,
    generateToken,
    cleanDatabase,
  };
}

/**
 * Close test application and database connection.
 */
export async function closeTestApp(context: TestContext): Promise<void> {
  await context.dataSource.destroy();
  await context.app.close();
}
