/**
 * Test Entity Factories
 *
 * WHY: Create valid entity instances with sensible defaults for testing.
 * Factory functions accept partial overrides for flexibility.
 *
 * PATTERN: Object Mother — pre-built test data with reasonable defaults.
 * Each factory returns a plain object (not saved to DB) for unit tests.
 *
 * NOTE: We define enums locally to avoid circular dependency issues.
 * TypeORM works with string values, so these are compatible.
 */

// ============================================================================
// Enums (defined locally to avoid circular dependency issues)
// ============================================================================

export enum UserRole {
  STUDENT = 'student',
  INSTRUCTOR = 'instructor',
  ADMIN = 'admin',
  PARENT = 'parent',
  TA = 'ta',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

export enum TenantStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

export enum SubscriptionPlan {
  FREE = 'free',
  BASIC = 'basic',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
}

export enum CourseStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  DRAFT = 'draft',
}

export enum SectionStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum EnrollmentStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  DROPPED = 'dropped',
  WITHDRAWN = 'withdrawn',
  WAITLISTED = 'waitlisted',
  REJECTED = 'rejected',
}

export enum AssignmentType {
  ASSIGNMENT = 'assignment',
  QUIZ = 'quiz',
  EXAM = 'exam',
  DISCUSSION = 'discussion',
  PROJECT = 'project',
}

export enum AssignmentStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  CLOSED = 'closed',
}

export enum SubmissionStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  GRADED = 'graded',
  RETURNED = 'returned',
}

// ============================================================================
// Type definitions (plain interfaces to avoid entity imports)
// ============================================================================

interface User {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: UserRole[];
  status: UserStatus;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
  tenant?: Tenant;
}

interface Tenant {
  id: string;
  name: string;
  domain: string;
  subdomain: string;
  subscriptionPlan: SubscriptionPlan;
  settings: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

interface Course {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  title: string;
  description: string;
  status: CourseStatus;
  createdAt: Date;
  updatedAt: Date;
}

interface CourseSection {
  id: string;
  courseId: string;
  instructorId: string;
  termId: string;
  sectionCode: string;
  status: SectionStatus;
  maxEnrollment: number;
  createdAt: Date;
  updatedAt: Date;
  course?: Course;
  instructor?: User;
  term?: AcademicTerm;
}

interface Enrollment {
  id: string;
  tenantId: string;
  userId: string;
  sectionId: string;
  status: EnrollmentStatus;
  enrolledAt: Date;
  createdAt: Date;
  updatedAt: Date;
  user?: User;
  section?: CourseSection;
}

interface Assignment {
  id: string;
  tenantId: string;
  sectionId: string;
  title: string;
  description: string;
  type: AssignmentType;
  status: AssignmentStatus;
  maxPoints: number;
  pointsPossible: number;
  dueAt: Date;
  unlockAt?: Date;
  lockAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  section?: CourseSection;
}

interface Submission {
  id: string;
  tenantId: string;
  assignmentId: string;
  userId: string;
  content: string;
  status: SubmissionStatus;
  score?: number;
  feedback?: string;
  submittedAt: Date;
  gradedAt?: Date;
  gradedById?: string;
  createdAt: Date;
  updatedAt: Date;
  assignment?: Assignment;
  user?: User;
}

interface AcademicTerm {
  id: string;
  tenantId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  isCurrent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Counter for generating unique IDs
let idCounter = 0;
function nextId(): string {
  idCounter++;
  return `00000000-0000-0000-0000-${String(idCounter).padStart(12, '0')}`;
}

/** Reset the ID counter between test runs */
export function resetIdCounter(): void {
  idCounter = 0;
}

// ============================================================================
// Tenant Factory
// ============================================================================

export interface TenantFactoryOptions {
  id?: string;
  name?: string;
  domain?: string;
  subdomain?: string;
  status?: TenantStatus;
  subscriptionPlan?: SubscriptionPlan;
  settings?: Record<string, unknown>;
}

export function createTenant(options: TenantFactoryOptions = {}): Tenant {
  const id = options.id ?? nextId();
  return {
    id,
    name: options.name ?? `Test Tenant ${id.slice(-4)}`,
    domain: options.domain ?? `tenant-${id.slice(-4)}.test.com`,
    subdomain: options.subdomain ?? `t${id.slice(-4)}`,
    subscriptionPlan: options.subscriptionPlan ?? SubscriptionPlan.BASIC,
    settings: options.settings ?? {},
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Tenant;
}

// ============================================================================
// User Factory
// ============================================================================

export interface UserFactoryOptions {
  id?: string;
  tenantId?: string;
  tenant?: Tenant;
  email?: string;
  firstName?: string;
  lastName?: string;
  roles?: UserRole[];
  status?: UserStatus;
  passwordHash?: string;
}

export function createUser(options: UserFactoryOptions = {}): User {
  const id = options.id ?? nextId();
  const tenantId = options.tenant?.id ?? options.tenantId ?? nextId();
  return {
    id,
    tenantId,
    email: options.email ?? `user-${id.slice(-4)}@test.com`,
    firstName: options.firstName ?? 'Test',
    lastName: options.lastName ?? `User ${id.slice(-4)}`,
    roles: options.roles ?? [UserRole.STUDENT],
    status: options.status ?? UserStatus.ACTIVE,
    passwordHash: options.passwordHash ?? 'hashed-password',
    createdAt: new Date(),
    updatedAt: new Date(),
    tenant: options.tenant,
  } as User;
}

export function createStudent(options: UserFactoryOptions = {}): User {
  return createUser({ ...options, roles: [UserRole.STUDENT] });
}

export function createInstructor(options: UserFactoryOptions = {}): User {
  return createUser({ ...options, roles: [UserRole.INSTRUCTOR] });
}

export function createAdmin(options: UserFactoryOptions = {}): User {
  return createUser({ ...options, roles: [UserRole.ADMIN] });
}

// ============================================================================
// Academic Term Factory
// ============================================================================

export interface AcademicTermFactoryOptions {
  id?: string;
  tenantId?: string;
  name?: string;
  startDate?: Date;
  endDate?: Date;
  isCurrent?: boolean;
}

export function createAcademicTerm(
  options: AcademicTermFactoryOptions = {},
): AcademicTerm {
  const id = options.id ?? nextId();
  return {
    id,
    tenantId: options.tenantId ?? nextId(),
    name: options.name ?? `Term ${id.slice(-4)}`,
    startDate: options.startDate ?? new Date('2025-01-01'),
    endDate: options.endDate ?? new Date('2025-05-31'),
    isCurrent: options.isCurrent ?? true,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as AcademicTerm;
}

// ============================================================================
// Course Factory
// ============================================================================

export interface CourseFactoryOptions {
  id?: string;
  tenantId?: string;
  code?: string;
  name?: string;
  description?: string;
  status?: CourseStatus;
}

export function createCourse(options: CourseFactoryOptions = {}): Course {
  const id = options.id ?? nextId();
  return {
    id,
    tenantId: options.tenantId ?? nextId(),
    code: options.code ?? `CS${id.slice(-4)}`,
    name: options.name ?? `Test Course ${id.slice(-4)}`,
    title: options.name ?? `Test Course ${id.slice(-4)}`, // Alias for name
    description: options.description ?? 'A test course for unit tests',
    status: options.status ?? CourseStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Course;
}

// ============================================================================
// Course Section Factory
// ============================================================================

export interface CourseSectionFactoryOptions {
  id?: string;
  courseId?: string;
  course?: Course;
  instructorId?: string;
  instructor?: User;
  termId?: string;
  term?: AcademicTerm;
  sectionCode?: string;
  status?: SectionStatus;
  maxEnrollment?: number;
}

export function createCourseSection(
  options: CourseSectionFactoryOptions = {},
): CourseSection {
  const id = options.id ?? nextId();
  return {
    id,
    courseId: options.courseId ?? options.course?.id ?? nextId(),
    instructorId: options.instructorId ?? options.instructor?.id ?? nextId(),
    termId: options.termId ?? options.term?.id ?? nextId(),
    sectionCode: options.sectionCode ?? '001',
    status: options.status ?? SectionStatus.ACTIVE,
    maxEnrollment: options.maxEnrollment ?? 30,
    createdAt: new Date(),
    updatedAt: new Date(),
    course: options.course,
    instructor: options.instructor,
    term: options.term,
  } as CourseSection;
}

// ============================================================================
// Enrollment Factory
// ============================================================================

export interface EnrollmentFactoryOptions {
  id?: string;
  tenantId?: string;
  userId?: string;
  user?: User;
  sectionId?: string;
  section?: CourseSection;
  status?: EnrollmentStatus;
  enrolledAt?: Date;
}

export function createEnrollment(
  options: EnrollmentFactoryOptions = {},
): Enrollment {
  const id = options.id ?? nextId();
  return {
    id,
    tenantId: options.tenantId ?? nextId(),
    userId: options.userId ?? options.user?.id ?? nextId(),
    sectionId: options.sectionId ?? options.section?.id ?? nextId(),
    status: options.status ?? EnrollmentStatus.ACTIVE,
    enrolledAt: options.enrolledAt ?? new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    user: options.user,
    section: options.section,
  } as Enrollment;
}

// ============================================================================
// Assignment Factory
// ============================================================================

export interface AssignmentFactoryOptions {
  id?: string;
  tenantId?: string;
  sectionId?: string;
  section?: CourseSection;
  title?: string;
  description?: string;
  type?: AssignmentType;
  status?: AssignmentStatus;
  maxPoints?: number;
  dueAt?: Date;
  unlockAt?: Date;
  lockAt?: Date;
}

export function createAssignment(
  options: AssignmentFactoryOptions = {},
): Assignment {
  const id = options.id ?? nextId();
  return {
    id,
    tenantId: options.tenantId ?? nextId(),
    sectionId: options.sectionId ?? options.section?.id ?? nextId(),
    title: options.title ?? `Assignment ${id.slice(-4)}`,
    description: options.description ?? 'Test assignment description',
    type: options.type ?? AssignmentType.ASSIGNMENT,
    status: options.status ?? AssignmentStatus.PUBLISHED,
    maxPoints: options.maxPoints ?? 100,
    pointsPossible: options.maxPoints ?? 100, // Alias
    dueAt: options.dueAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    unlockAt: options.unlockAt,
    lockAt: options.lockAt,
    createdAt: new Date(),
    updatedAt: new Date(),
    section: options.section,
  } as Assignment;
}

// ============================================================================
// Submission Factory
// ============================================================================

export interface SubmissionFactoryOptions {
  id?: string;
  tenantId?: string;
  assignmentId?: string;
  assignment?: Assignment;
  userId?: string;
  user?: User;
  content?: string;
  status?: SubmissionStatus;
  score?: number;
  feedback?: string;
  submittedAt?: Date;
  gradedAt?: Date;
  gradedById?: string;
}

export function createSubmission(
  options: SubmissionFactoryOptions = {},
): Submission {
  const id = options.id ?? nextId();
  return {
    id,
    tenantId: options.tenantId ?? nextId(),
    assignmentId: options.assignmentId ?? options.assignment?.id ?? nextId(),
    userId: options.userId ?? options.user?.id ?? nextId(),
    content: options.content ?? 'Test submission content',
    status: options.status ?? SubmissionStatus.SUBMITTED,
    score: options.score,
    feedback: options.feedback,
    submittedAt: options.submittedAt ?? new Date(),
    gradedAt: options.gradedAt,
    gradedById: options.gradedById,
    createdAt: new Date(),
    updatedAt: new Date(),
    assignment: options.assignment,
    user: options.user,
  } as Submission;
}
