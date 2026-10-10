import type {
  EnrollmentRole,
  EnrollmentStatus,
  SectionStatus,
  UserRole,
  UserStatus,
} from '@/lib/graphql/__generated__/graphql';

/**
 * BUG-015: the API returns enum NAMES (`'ACTIVE'`, `'STUDENT'`), never the
 * lowercase DB values. Admin screens key their badge labels and variants on
 * the generated unions so a missing case is a type error, not a silently
 * unstyled badge showing the raw enum name.
 */

export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  STUDENT: 'Student',
  INSTRUCTOR: 'Instructor',
  ADMIN: 'Admin',
  TA: 'TA',
  PARENT: 'Parent',
};

export const USER_ROLE_OPTIONS = (
  Object.entries(USER_ROLE_LABELS) as [UserRole, string][]
).map(([value, label]) => ({ value, label }));

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  SUSPENDED: 'Suspended',
  PENDING: 'Pending',
};

export const USER_STATUS_OPTIONS = (
  Object.entries(USER_STATUS_LABELS) as [UserStatus, string][]
).map(([value, label]) => ({ value, label }));

export const USER_STATUS_VARIANT: Record<UserStatus, BadgeVariant> = {
  ACTIVE: 'default',
  INACTIVE: 'destructive',
  SUSPENDED: 'destructive',
  PENDING: 'outline',
};

export const ENROLLMENT_ROLE_LABELS: Record<EnrollmentRole, string> = {
  STUDENT: 'Student',
  TA: 'TA',
  OBSERVER: 'Observer',
};

export const ENROLLMENT_ROLE_OPTIONS = (
  Object.entries(ENROLLMENT_ROLE_LABELS) as [EnrollmentRole, string][]
).map(([value, label]) => ({ value, label }));

export const ENROLLMENT_STATUS_LABELS: Record<EnrollmentStatus, string> = {
  ACTIVE: 'Active',
  PENDING: 'Pending',
  WAITLISTED: 'Waitlisted',
  COMPLETED: 'Completed',
  DROPPED: 'Dropped',
  WITHDRAWN: 'Withdrawn',
  REJECTED: 'Rejected',
};

export const ENROLLMENT_STATUS_VARIANT: Record<EnrollmentStatus, BadgeVariant> =
  {
    ACTIVE: 'default',
    PENDING: 'outline',
    WAITLISTED: 'outline',
    COMPLETED: 'secondary',
    DROPPED: 'destructive',
    WITHDRAWN: 'outline',
    REJECTED: 'destructive',
  };

export const SECTION_STATUS_LABELS: Record<SectionStatus, string> = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const SECTION_STATUS_OPTIONS = (
  Object.entries(SECTION_STATUS_LABELS) as [SectionStatus, string][]
).map(([value, label]) => ({ value, label }));

export const SECTION_STATUS_VARIANT: Record<SectionStatus, BadgeVariant> = {
  ACTIVE: 'default',
  DRAFT: 'outline',
  COMPLETED: 'secondary',
  CANCELLED: 'destructive',
};
