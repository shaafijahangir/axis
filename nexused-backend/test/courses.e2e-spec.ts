/**
 * Integration Tests: CoursesResolver
 *
 * WHY: Verify that guards, roles, and tenant scoping work correctly at the
 * resolver level with a real database and GraphQL endpoint.
 *
 * Tests three critical security properties:
 * 1. Unauthenticated requests are rejected
 * 2. Wrong-role requests are rejected
 * 3. Cross-tenant data is never returned
 *
 * NOTE: These tests require a running PostgreSQL database. They will be
 * skipped if no database is available (e.g., local development without docker).
 */

import request from 'supertest';
import { App } from 'supertest/types';
import {
  TestContext,
  TestUser,
  createTestApp,
  closeTestApp,
  isDatabaseAvailable,
} from './helpers/test-app';
import { UserRole } from '../src/database/entities';

// Check database availability before running tests
let dbAvailable = false;

beforeAll(async () => {
  dbAvailable = await isDatabaseAvailable();
  if (!dbAvailable) {
    console.warn(
      '\n⚠️  Skipping integration tests: PostgreSQL not available.\n' +
        '   These tests run in CI with the PostgreSQL service container.\n' +
        '   To run locally, start a PostgreSQL instance with:\n' +
        '   - Host: localhost:5432\n' +
        '   - User: test, Password: test, Database: nexused_test\n',
    );
  }
});

// Use conditional describe based on database availability
const describeIf = (condition: boolean) =>
  condition ? describe : describe.skip;

describeIf(true)('CoursesResolver (e2e)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    if (!dbAvailable) return;
    ctx = await createTestApp();
  });

  afterAll(async () => {
    if (ctx) {
      await closeTestApp(ctx);
    }
  });

  beforeEach(async () => {
    if (!dbAvailable || !ctx) return;
    await ctx.cleanDatabase();
  });

  // ==========================================================================
  // AUTHENTICATION TESTS: Unauthenticated requests are rejected
  // ==========================================================================

  describe('Authentication', () => {
    it('should reject unauthenticated requests to courses query', async () => {
      if (!dbAvailable) return;
      const query = `
        query {
          courses {
            id
            title
          }
        }
      `;

      const response = await request(ctx.app.getHttpServer() as App)
        .post('/api/graphql')
        .send({ query });

      expect(response.status).toBe(200); // GraphQL returns 200 with errors
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('Unauthorized');
    });

    it('should reject unauthenticated requests to course query', async () => {
      if (!dbAvailable) return;
      const query = `
        query {
          course(id: "some-id") {
            id
            title
          }
        }
      `;

      const response = await request(ctx.app.getHttpServer() as App)
        .post('/api/graphql')
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('Unauthorized');
    });

    it('should reject unauthenticated requests to myEnrollments query', async () => {
      if (!dbAvailable) return;
      const query = `
        query {
          myEnrollments {
            id
          }
        }
      `;

      const response = await request(ctx.app.getHttpServer() as App)
        .post('/api/graphql')
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('Unauthorized');
    });

    it('should reject unauthenticated requests to createCourse mutation', async () => {
      if (!dbAvailable) return;
      const mutation = `
        mutation {
          createCourse(input: { code: "CS101", title: "Test", description: "Test" }) {
            id
          }
        }
      `;

      const response = await request(ctx.app.getHttpServer() as App)
        .post('/api/graphql')
        .send({ query: mutation });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('Unauthorized');
    });

    it('should reject requests with invalid JWT token', async () => {
      if (!dbAvailable) return;
      const query = `
        query {
          courses {
            id
            title
          }
        }
      `;

      const response = await request(ctx.app.getHttpServer() as App)
        .post('/api/graphql')
        .set('Authorization', 'Bearer invalid-token')
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('Unauthorized');
    });
  });

  // ==========================================================================
  // AUTHORIZATION TESTS: Wrong-role requests are rejected
  // ==========================================================================

  describe('Authorization (Role-based)', () => {
    let tenant: any;
    let student: TestUser;
    let instructor: TestUser;
    let admin: TestUser;
    let course: any;
    let term: any;
    let section: any;

    beforeEach(async () => {
      if (!dbAvailable) return;
      // Set up test data
      tenant = await ctx.createTestTenant();
      student = await ctx.createTestUser(tenant, [UserRole.STUDENT]);
      instructor = await ctx.createTestUser(tenant, [UserRole.INSTRUCTOR]);
      admin = await ctx.createTestUser(tenant, [UserRole.ADMIN]);

      // Create a course and section
      course = await ctx.createTestCourse(tenant);
      term = await ctx.createTestTerm(tenant);

      // Need to get actual user entity for section creation
      const instructorUser = await ctx.userRepo.findOneBy({ id: instructor.id });
      section = await ctx.createTestSection(course, instructorUser!, term);
    });

    it('should reject createCourse mutation from student', async () => {
      if (!dbAvailable) return;
      const mutation = `
        mutation {
          createCourse(input: { code: "CS999", title: "Test", description: "Test" }) {
            id
          }
        }
      `;

      const response = await request(ctx.app.getHttpServer() as App)
        .post('/api/graphql')
        .set('Authorization', `Bearer ${student.token}`)
        .send({ query: mutation });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('Forbidden');
    });

    it('should allow createCourse mutation from instructor', async () => {
      if (!dbAvailable) return;
      const mutation = `
        mutation {
          createCourse(input: { code: "CS999", title: "New Course", description: "Test" }) {
            id
            title
          }
        }
      `;

      const response = await request(ctx.app.getHttpServer() as App)
        .post('/api/graphql')
        .set('Authorization', `Bearer ${instructor.token}`)
        .send({ query: mutation });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.createCourse.title).toBe('New Course');
    });

    it('should allow createCourse mutation from admin', async () => {
      if (!dbAvailable) return;
      const mutation = `
        mutation {
          createCourse(input: { code: "CS888", title: "Admin Course", description: "Test" }) {
            id
            title
          }
        }
      `;

      const response = await request(ctx.app.getHttpServer() as App)
        .post('/api/graphql')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ query: mutation });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.createCourse.title).toBe('Admin Course');
    });

    it('should reject sectionEnrollments query from student', async () => {
      if (!dbAvailable) return;
      const query = `
        query {
          sectionEnrollments(sectionId: "${section.id}") {
            id
          }
        }
      `;

      const response = await request(ctx.app.getHttpServer() as App)
        .post('/api/graphql')
        .set('Authorization', `Bearer ${student.token}`)
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('Forbidden');
    });

    it('should allow sectionEnrollments query from instructor', async () => {
      if (!dbAvailable) return;
      const query = `
        query {
          sectionEnrollments(sectionId: "${section.id}") {
            id
          }
        }
      `;

      const response = await request(ctx.app.getHttpServer() as App)
        .post('/api/graphql')
        .set('Authorization', `Bearer ${instructor.token}`)
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.sectionEnrollments).toBeDefined();
    });

    it('should reject createSection mutation from student', async () => {
      if (!dbAvailable) return;
      const mutation = `
        mutation {
          createSection(input: {
            courseId: "${course.id}",
            termId: "${term.id}",
            capacity: 25
          }) {
            id
          }
        }
      `;

      const response = await request(ctx.app.getHttpServer() as App)
        .post('/api/graphql')
        .set('Authorization', `Bearer ${student.token}`)
        .send({ query: mutation });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('Forbidden');
    });
  });

  // ==========================================================================
  // TENANT SCOPING TESTS: Cross-tenant data is never returned
  // ==========================================================================

  describe('Tenant Scoping', () => {
    let tenantA: any;
    let tenantB: any;
    let userA: TestUser;
    let userB: TestUser;
    let courseA: any;
    let courseB: any;

    beforeEach(async () => {
      if (!dbAvailable) return;
      // Create two separate tenants
      tenantA = await ctx.createTestTenant('Tenant A');
      tenantB = await ctx.createTestTenant('Tenant B');

      // Create users in each tenant
      userA = await ctx.createTestUser(tenantA, [UserRole.INSTRUCTOR]);
      userB = await ctx.createTestUser(tenantB, [UserRole.INSTRUCTOR]);

      // Create courses in each tenant
      courseA = await ctx.createTestCourse(tenantA);
      courseB = await ctx.createTestCourse(tenantB);
    });

    it('should only return courses from the user tenant', async () => {
      if (!dbAvailable) return;
      const query = `
        query {
          courses {
            id
            title
          }
        }
      `;

      // User A should only see courses from Tenant A
      const responseA = await request(ctx.app.getHttpServer() as App)
        .post('/api/graphql')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ query });

      expect(responseA.status).toBe(200);
      expect(responseA.body.errors).toBeUndefined();
      expect(responseA.body.data.courses).toHaveLength(1);
      expect(responseA.body.data.courses[0].id).toBe(courseA.id);

      // User B should only see courses from Tenant B
      const responseB = await request(ctx.app.getHttpServer() as App)
        .post('/api/graphql')
        .set('Authorization', `Bearer ${userB.token}`)
        .send({ query });

      expect(responseB.status).toBe(200);
      expect(responseB.body.errors).toBeUndefined();
      expect(responseB.body.data.courses).toHaveLength(1);
      expect(responseB.body.data.courses[0].id).toBe(courseB.id);
    });

    it('should not return course by id from different tenant', async () => {
      if (!dbAvailable) return;
      // User A tries to access Course B (from Tenant B)
      const query = `
        query {
          course(id: "${courseB.id}") {
            id
            title
          }
        }
      `;

      const response = await request(ctx.app.getHttpServer() as App)
        .post('/api/graphql')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
      // Should get a "not found" error because the course doesn't exist in user's tenant
    });

    it('should not return section by id from different tenant', async () => {
      if (!dbAvailable) return;
      // Create sections in each tenant
      const termA = await ctx.createTestTerm(tenantA);
      const termB = await ctx.createTestTerm(tenantB);

      const instructorAUser = await ctx.userRepo.findOneBy({ id: userA.id });
      const instructorBUser = await ctx.userRepo.findOneBy({ id: userB.id });

      await ctx.createTestSection(courseA, instructorAUser!, termA);
      const sectionB = await ctx.createTestSection(
        courseB,
        instructorBUser!,
        termB,
      );

      // User A tries to access Section B
      const query = `
        query {
          section(id: "${sectionB.id}") {
            id
          }
        }
      `;

      const response = await request(ctx.app.getHttpServer() as App)
        .post('/api/graphql')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
    });

    it('should only count courses from user tenant', async () => {
      if (!dbAvailable) return;
      // Add more courses to each tenant
      await ctx.createTestCourse(tenantA);
      await ctx.createTestCourse(tenantA);
      await ctx.createTestCourse(tenantB);

      const query = `
        query {
          courseCount
        }
      `;

      // User A should see 3 courses (1 original + 2 new)
      const responseA = await request(ctx.app.getHttpServer() as App)
        .post('/api/graphql')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ query });

      expect(responseA.status).toBe(200);
      expect(responseA.body.data.courseCount).toBe(3);

      // User B should see 2 courses (1 original + 1 new)
      const responseB = await request(ctx.app.getHttpServer() as App)
        .post('/api/graphql')
        .set('Authorization', `Bearer ${userB.token}`)
        .send({ query });

      expect(responseB.status).toBe(200);
      expect(responseB.body.data.courseCount).toBe(2);
    });

    it('should not allow enrollment in section from different tenant', async () => {
      if (!dbAvailable) return;
      // Create a section in Tenant B
      const termB = await ctx.createTestTerm(tenantB);
      const instructorBUser = await ctx.userRepo.findOneBy({ id: userB.id });
      const sectionB = await ctx.createTestSection(
        courseB,
        instructorBUser!,
        termB,
      );

      // Create a student in Tenant A
      const studentA = await ctx.createTestUser(tenantA, [UserRole.STUDENT]);

      // Student A tries to enroll in Section B
      const mutation = `
        mutation {
          enrollStudent(sectionId: "${sectionB.id}") {
            id
          }
        }
      `;

      const response = await request(ctx.app.getHttpServer() as App)
        .post('/api/graphql')
        .set('Authorization', `Bearer ${studentA.token}`)
        .send({ query: mutation });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
    });
  });

  // ==========================================================================
  // HAPPY PATH TESTS: Verify normal operations work correctly
  // ==========================================================================

  describe('Happy Path', () => {
    let tenant: any;
    let instructor: TestUser;
    let student: TestUser;
    let course: any;
    let term: any;
    let section: any;

    beforeEach(async () => {
      if (!dbAvailable) return;
      tenant = await ctx.createTestTenant();
      instructor = await ctx.createTestUser(tenant, [UserRole.INSTRUCTOR]);
      student = await ctx.createTestUser(tenant, [UserRole.STUDENT]);
      course = await ctx.createTestCourse(tenant);
      term = await ctx.createTestTerm(tenant);

      const instructorUser = await ctx.userRepo.findOneBy({ id: instructor.id });
      section = await ctx.createTestSection(course, instructorUser!, term);
    });

    it('should allow authenticated user to query courses', async () => {
      if (!dbAvailable) return;
      const query = `
        query {
          courses {
            id
            title
            code
          }
        }
      `;

      const response = await request(ctx.app.getHttpServer() as App)
        .post('/api/graphql')
        .set('Authorization', `Bearer ${student.token}`)
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.courses).toHaveLength(1);
      expect(response.body.data.courses[0].id).toBe(course.id);
    });

    it('should allow student to enroll in section', async () => {
      if (!dbAvailable) return;
      const mutation = `
        mutation {
          enrollStudent(sectionId: "${section.id}") {
            id
            status
          }
        }
      `;

      const response = await request(ctx.app.getHttpServer() as App)
        .post('/api/graphql')
        .set('Authorization', `Bearer ${student.token}`)
        .send({ query: mutation });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.enrollStudent.status).toBe('active');
    });

    it('should allow student to query their enrollments', async () => {
      if (!dbAvailable) return;
      // First enroll the student
      const studentUser = await ctx.userRepo.findOneBy({ id: student.id });
      await ctx.createTestEnrollment(tenant, studentUser!, section);

      const query = `
        query {
          myEnrollments {
            id
            status
          }
        }
      `;

      const response = await request(ctx.app.getHttpServer() as App)
        .post('/api/graphql')
        .set('Authorization', `Bearer ${student.token}`)
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.myEnrollments).toHaveLength(1);
    });

    it('should allow instructor to query their sections', async () => {
      if (!dbAvailable) return;
      const query = `
        query {
          mySections {
            id
            status
          }
        }
      `;

      const response = await request(ctx.app.getHttpServer() as App)
        .post('/api/graphql')
        .set('Authorization', `Bearer ${instructor.token}`)
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.mySections).toHaveLength(1);
      expect(response.body.data.mySections[0].id).toBe(section.id);
    });
  });
});
