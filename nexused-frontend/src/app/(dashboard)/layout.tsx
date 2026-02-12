'use client';

import { Toaster } from 'sonner';
import { AuthGuard } from '@/components/auth/auth-guard';
import { GraphQLProvider } from '@/lib/graphql/provider';
import { Sidebar } from '@/components/layout/sidebar';
import { TopNav } from '@/components/layout/top-nav';
import { MobileNav } from '@/components/layout/mobile-nav';
import { InstallPrompt } from '@/components/pwa/install-prompt';
import { OfflineIndicator } from '@/components/pwa/offline-indicator';
import { RouteAnnouncer } from '@/components/a11y/route-announcer';
import { AccessibilityProvider } from '@/components/a11y/accessibility-provider';
import { FocusOnRouteChange } from '@/components/a11y/focus-on-route-change';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <GraphQLProvider>
      <AuthGuard>
        <AccessibilityProvider>
          {/* WCAG 2.1: Skip navigation link — first focusable element */}
          <a href="#main-content" className="skip-nav">
            Skip to main content
          </a>
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <div className="flex flex-1 flex-col overflow-hidden">
              <TopNav />
              <main
                id="main-content"
                role="main"
                aria-label="Page content"
                className="flex-1 overflow-y-auto p-6 pb-20 md:pb-6"
                tabIndex={-1}
              >
                {children}
              </main>
            </div>
            <MobileNav />
          </div>
          <Toaster position="bottom-right" richColors />
          <InstallPrompt />
          <OfflineIndicator />
          <RouteAnnouncer />
          <FocusOnRouteChange />
        </AccessibilityProvider>
      </AuthGuard>
    </GraphQLProvider>
  );
}
