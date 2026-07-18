'use client';

import { useCallback, useMemo } from 'react';
import { useMutation } from '@apollo/client/react';
import { useAuthStore } from '@/stores/auth.store';
import { UPDATE_PREFERENCES_MUTATION } from '@/lib/graphql/mutations/user';
import { ME_QUERY } from '@/lib/graphql/queries/user';

/**
 * Widget types for the student feed.
 * Maps to FeedItemType enum on the backend.
 */
export type StudentWidgetType =
  | 'deadlines'
  | 'grades'
  | 'announcements'
  | 'courseUpdates'
  | 'appointments';

/**
 * Widget types for the instructor feed.
 * Maps to InstructorFeedItemType enum on the backend.
 */
export type InstructorWidgetType =
  | 'ungraded'
  | 'upcomingDeadlines'
  | 'announcements';

/**
 * Dashboard preferences stored in user.preferences.dashboard
 */
export interface DashboardPreferences {
  widgets: {
    // Student widgets
    deadlines?: boolean;
    grades?: boolean;
    announcements?: boolean;
    courseUpdates?: boolean;
    appointments?: boolean;
    // Instructor widgets
    ungraded?: boolean;
    upcomingDeadlines?: boolean;
  };
  collapsed?: Record<string, boolean>; // Widget collapse state
}

/**
 * Full user preferences structure.
 */
export interface UserPreferences {
  dashboard?: DashboardPreferences;
}

/**
 * Default widget visibility (all enabled by default).
 */
const DEFAULT_STUDENT_WIDGETS: Record<StudentWidgetType, boolean> = {
  deadlines: true,
  grades: true,
  announcements: true,
  courseUpdates: true,
  appointments: true,
};

const DEFAULT_INSTRUCTOR_WIDGETS: Record<InstructorWidgetType, boolean> = {
  ungraded: true,
  upcomingDeadlines: true,
  announcements: true,
};

/**
 * Parse preferences from user object (may be string or object).
 */
function parsePreferences(
  preferences: string | Record<string, unknown> | null | undefined,
): UserPreferences {
  if (!preferences) return {};
  if (typeof preferences === 'string') {
    try {
      return JSON.parse(preferences);
    } catch {
      return {};
    }
  }
  return preferences as UserPreferences;
}

/**
 * Hook to manage dashboard widget preferences.
 *
 * Usage:
 *   const { isWidgetEnabled, toggleWidget, isWidgetCollapsed, toggleCollapse } = useWidgetPreferences();
 *
 *   // Check if deadlines widget is enabled
 *   if (isWidgetEnabled('deadlines')) { ... }
 *
 *   // Toggle grades widget
 *   await toggleWidget('grades');
 */
interface UpdatePreferencesResult {
  updateProfile: {
    id: string;
    preferences: string | null;
  };
}

export function useWidgetPreferences() {
  const { user, setUser } = useAuthStore();

  const [updatePreferences, { loading }] = useMutation<UpdatePreferencesResult>(
    UPDATE_PREFERENCES_MUTATION,
    {
      refetchQueries: [{ query: ME_QUERY }],
    },
  );

  // Parse current preferences
  const preferences = useMemo<UserPreferences>(() => {
    return parsePreferences(user?.preferences);
  }, [user?.preferences]);

  // Get dashboard preferences with defaults
  const dashboardPrefs = useMemo<DashboardPreferences>(() => {
    return preferences.dashboard ?? { widgets: {} };
  }, [preferences]);

  /**
   * Check if a widget is enabled (default: true).
   */
  const isWidgetEnabled = useCallback(
    (widget: StudentWidgetType | InstructorWidgetType): boolean => {
      const value = dashboardPrefs.widgets[widget];
      // If not explicitly set, check defaults
      if (value === undefined) {
        if (widget in DEFAULT_STUDENT_WIDGETS) {
          return DEFAULT_STUDENT_WIDGETS[widget as StudentWidgetType];
        }
        if (widget in DEFAULT_INSTRUCTOR_WIDGETS) {
          return DEFAULT_INSTRUCTOR_WIDGETS[widget as InstructorWidgetType];
        }
        return true;
      }
      return value;
    },
    [dashboardPrefs.widgets],
  );

  /**
   * Check if a widget is collapsed.
   */
  const isWidgetCollapsed = useCallback(
    (widget: string): boolean => {
      return dashboardPrefs.collapsed?.[widget] ?? false;
    },
    [dashboardPrefs.collapsed],
  );

  /**
   * Toggle a widget's enabled state.
   */
  const toggleWidget = useCallback(
    async (widget: StudentWidgetType | InstructorWidgetType): Promise<void> => {
      const currentValue = isWidgetEnabled(widget);
      const newWidgets = {
        ...dashboardPrefs.widgets,
        [widget]: !currentValue,
      };

      const newPreferences: UserPreferences = {
        ...preferences,
        dashboard: {
          ...dashboardPrefs,
          widgets: newWidgets,
        },
      };

      try {
        const result = await updatePreferences({
          variables: {
            preferences: JSON.stringify(newPreferences),
          },
        });

        // Update local user state
        if (result.data?.updateProfile && user) {
          setUser({
            ...user,
            preferences: result.data.updateProfile.preferences,
          });
        }
      } catch (error) {
        console.error('Failed to update widget preferences:', error);
        throw error;
      }
    },
    [
      isWidgetEnabled,
      dashboardPrefs,
      preferences,
      updatePreferences,
      user,
      setUser,
    ],
  );

  /**
   * Toggle a widget's collapsed state.
   */
  const toggleCollapse = useCallback(
    async (widget: string): Promise<void> => {
      const currentValue = isWidgetCollapsed(widget);
      const newCollapsed = {
        ...dashboardPrefs.collapsed,
        [widget]: !currentValue,
      };

      const newPreferences: UserPreferences = {
        ...preferences,
        dashboard: {
          ...dashboardPrefs,
          collapsed: newCollapsed,
        },
      };

      try {
        const result = await updatePreferences({
          variables: {
            preferences: JSON.stringify(newPreferences),
          },
        });

        if (result.data?.updateProfile && user) {
          setUser({
            ...user,
            preferences: result.data.updateProfile.preferences,
          });
        }
      } catch (error) {
        console.error('Failed to update collapse state:', error);
        throw error;
      }
    },
    [
      isWidgetCollapsed,
      dashboardPrefs,
      preferences,
      updatePreferences,
      user,
      setUser,
    ],
  );

  /**
   * Get all enabled student widgets.
   */
  const enabledStudentWidgets = useMemo<StudentWidgetType[]>(() => {
    return (Object.keys(DEFAULT_STUDENT_WIDGETS) as StudentWidgetType[]).filter(
      (w) => isWidgetEnabled(w),
    );
  }, [isWidgetEnabled]);

  /**
   * Get all enabled instructor widgets.
   */
  const enabledInstructorWidgets = useMemo<InstructorWidgetType[]>(() => {
    return (
      Object.keys(DEFAULT_INSTRUCTOR_WIDGETS) as InstructorWidgetType[]
    ).filter((w) => isWidgetEnabled(w));
  }, [isWidgetEnabled]);

  return {
    isWidgetEnabled,
    isWidgetCollapsed,
    toggleWidget,
    toggleCollapse,
    enabledStudentWidgets,
    enabledInstructorWidgets,
    loading,
  };
}

/**
 * Map frontend widget types to backend FeedItemType.
 */
export function studentWidgetToFeedType(widget: StudentWidgetType): string {
  const map: Record<StudentWidgetType, string> = {
    deadlines: 'DEADLINE',
    grades: 'GRADE_POSTED',
    announcements: 'ANNOUNCEMENT',
    courseUpdates: 'COURSE_UPDATE',
    appointments: 'APPOINTMENT',
  };
  return map[widget];
}

/**
 * Map backend FeedItemType to frontend widget type.
 */
export function feedTypeToStudentWidget(
  feedType: string,
): StudentWidgetType | null {
  const map: Record<string, StudentWidgetType> = {
    DEADLINE: 'deadlines',
    GRADE_POSTED: 'grades',
    ANNOUNCEMENT: 'announcements',
    COURSE_UPDATE: 'courseUpdates',
    APPOINTMENT: 'appointments',
  };
  return map[feedType] ?? null;
}

/**
 * Map frontend widget types to backend InstructorFeedItemType.
 */
export function instructorWidgetToFeedType(
  widget: InstructorWidgetType,
): string {
  const map: Record<InstructorWidgetType, string> = {
    ungraded: 'UNGRADED',
    upcomingDeadlines: 'UPCOMING_DEADLINE',
    announcements: 'ANNOUNCEMENT',
  };
  return map[widget];
}

/**
 * Map backend InstructorFeedItemType to frontend widget type.
 */
export function feedTypeToInstructorWidget(
  feedType: string,
): InstructorWidgetType | null {
  const map: Record<string, InstructorWidgetType> = {
    UNGRADED: 'ungraded',
    UPCOMING_DEADLINE: 'upcomingDeadlines',
    ANNOUNCEMENT: 'announcements',
  };
  return map[feedType] ?? null;
}
