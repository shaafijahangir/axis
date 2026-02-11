'use client';

import { Toaster } from 'sonner';
import { AuthGuard } from '@/components/auth/auth-guard';
import { GraphQLProvider } from '@/lib/graphql/provider';
import { Sidebar } from '@/components/layout/sidebar';
import { TopNav } from '@/components/layout/top-nav';
import { MobileNav } from '@/components/layout/mobile-nav';
import { InstallPrompt } from '@/components/pwa/install-prompt';
import { OfflineIndicator } from '@/components/pwa/offline-indicator';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <GraphQLProvider>
      <AuthGuard>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <TopNav />
            <main className="flex-1 overflow-y-auto p-6 pb-20 md:pb-6">
              {children}
            </main>
          </div>
          <MobileNav />
        </div>
        <Toaster position="bottom-right" richColors />
        <InstallPrompt />
        <OfflineIndicator />
      </AuthGuard>
    </GraphQLProvider>
  );
}
