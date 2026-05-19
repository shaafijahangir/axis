import {
  Home,
  BookOpen,
  MessageSquare,
  Users,
  GraduationCap,
  Sparkles,
  BarChart3,
  Link,
  Shield,
  Bot,
  Map,
  Library,
  AlertTriangle,
  ClipboardList,
  Calendar,
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
  { label: 'Schedule', href: '/schedule', icon: Calendar },
  { label: 'Grades', href: '/grades', icon: GraduationCap },
  { label: 'Planner', href: '/planner', icon: Map },
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
  { label: 'Schedule', href: '/schedule', icon: Calendar },
  { label: 'AI', href: '/ai', icon: Sparkles },
  { label: 'Agent Builder', href: '/ai/agents', icon: Bot },
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
  { label: 'Catalog', href: '/admin/catalog', icon: Library },
  { label: 'AI Governance', href: '/admin/ai-governance', icon: Shield },
  {
    label: 'Financial Aid',
    href: '/admin/financial-aid-config',
    icon: AlertTriangle,
  },
  { label: 'People', href: '/people', icon: Users },
  { label: 'Integrations', href: '/admin/integrations', icon: Link },
  {
    label: 'Enrollment Policy',
    href: '/admin/enrollment-policy',
    icon: ClipboardList,
  },
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
 * Mobile nav — max 5 items per role so they fit at 375px without overflow.
 * Long labels are shortened and low-priority items are dropped.
 * Dropped items remain accessible via desktop sidebar or deep links.
 */
const studentMobileNav: NavItem[] = [
  { label: 'Home', href: '/home', icon: Home },
  { label: 'Courses', href: '/courses', icon: BookOpen },
  { label: 'Schedule', href: '/schedule', icon: Calendar },
  { label: 'AI', href: '/ai', icon: Sparkles },
  { label: 'Grades', href: '/grades', icon: GraduationCap },
];

const instructorMobileNav: NavItem[] = [
  { label: 'Home', href: '/home', icon: Home },
  { label: 'Courses', href: '/courses', icon: BookOpen },
  { label: 'AI', href: '/ai', icon: Sparkles },
  { label: 'Agents', href: '/ai/agents', icon: Bot },
  {
    label: 'Messages',
    href: '/messages',
    icon: MessageSquare,
    badgeKey: 'messages',
  },
];

// Admin has 7 items; cap at 5 most actionable on mobile.
// Financial Aid config and Integrations are setup-only and better on desktop.
const adminMobileNav: NavItem[] = [
  { label: 'Home', href: '/home', icon: Home },
  { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { label: 'Catalog', href: '/admin/catalog', icon: Library },
  { label: 'People', href: '/people', icon: Users },
  { label: 'Governance', href: '/admin/ai-governance', icon: Shield },
];

const mobileNavByRole: Record<string, NavItem[]> = {
  [UserRole.STUDENT]: studentMobileNav,
  [UserRole.INSTRUCTOR]: instructorMobileNav,
  [UserRole.ADMIN]: adminMobileNav,
  [UserRole.PARENT]: parentNav,
  [UserRole.TA]: studentMobileNav,
};

export function getMobileNavForRole(roles: UserRole[]): NavItem[] {
  const primary = roles[0];
  return mobileNavByRole[primary] ?? studentMobileNav;
}

/**
 * Admin uses a settings gear in the trailing position instead of profile avatar.
 */
export function getTrailingAction(roles: UserRole[]): 'profile' | 'settings' {
  return roles[0] === UserRole.ADMIN ? 'settings' : 'profile';
}
