import {
  Home,
  BookOpen,
  MessageSquare,
  Users,
  GraduationCap,
  Settings,
  Sparkles,
  BarChart3,
  type LucideIcon,
} from 'lucide-react';
import { UserRole } from '@/types/auth';

/**
 * WHY: Centralised nav config consumed by both Sidebar (desktop) and MobileNav (mobile).
 * A single source of truth prevents divergence between the two surfaces.
 *
 * PATTERN: Each role has an explicit ordered list. No generic "filter by role" —
 * the order matters (Home is always first) and admin has a different set of items.
 */

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badgeKey?: string;
}

const studentNav: NavItem[] = [
  { label: 'Home', href: '/home', icon: Home },
  { label: 'Courses', href: '/courses', icon: BookOpen },
  { label: 'Grades', href: '/grades', icon: GraduationCap },
  { label: 'AI', href: '/ai', icon: Sparkles },
  {
    label: 'Messages',
    href: '/messages',
    icon: MessageSquare,
    badgeKey: 'messages',
  },
];

const instructorNav: NavItem[] = [
  { label: 'Home', href: '/home', icon: Home },
  { label: 'Courses', href: '/courses', icon: BookOpen },
  { label: 'AI', href: '/ai', icon: Sparkles },
  {
    label: 'Messages',
    href: '/messages',
    icon: MessageSquare,
    badgeKey: 'messages',
  },
];

const adminNav: NavItem[] = [
  { label: 'Home', href: '/home', icon: Home },
  { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { label: 'People', href: '/people', icon: Users },
  { label: 'Academics', href: '/academics', icon: GraduationCap },
];

const parentNav: NavItem[] = [
  { label: 'Home', href: '/home', icon: Home },
  {
    label: 'Messages',
    href: '/messages',
    icon: MessageSquare,
    badgeKey: 'messages',
  },
];

const navByRole: Record<string, NavItem[]> = {
  [UserRole.STUDENT]: studentNav,
  [UserRole.INSTRUCTOR]: instructorNav,
  [UserRole.ADMIN]: adminNav,
  [UserRole.PARENT]: parentNav,
  [UserRole.TA]: studentNav, // TAs share the student nav layout
};

export function getNavForRole(roles: UserRole[]): NavItem[] {
  const primary = roles[0];
  return navByRole[primary] ?? studentNav;
}

/**
 * Admin uses a settings gear in the trailing position instead of profile avatar.
 */
export function getTrailingAction(roles: UserRole[]): 'profile' | 'settings' {
  return roles[0] === UserRole.ADMIN ? 'settings' : 'profile';
}
