import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { AppSidebar } from './-components/app-sidebar';
import { NotificationsBell } from './-components/notifications-bell';
import { DashboardBreadcrumbs } from './-components/breadcrumbs';
import { StatsMarquee } from './-components/stats-marquee';

export const Route = createFileRoute('/dashboard')({
  beforeLoad: ({ context }) => {
    if (!context.isAuthenticated) {
      throw redirect({ to: '/auth' });
    }
  },
  component: DashboardLayout,
});

function DashboardLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Top bar with breadcrumbs */}
        <header className='flex h-14 items-center justify-between px-4 border-b border-sidebar-border'>
          <div className='flex items-center gap-2'>
            <SidebarTrigger className='-ml-1' />
            <Separator orientation='vertical' className='h-4' />
            <DashboardBreadcrumbs />
          </div>
          <div className='flex items-center gap-2'>
            <NotificationsBell />
          </div>
        </header>

        {/* Performance stats marquee */}
        <StatsMarquee />

        {/* Main content */}
        <main className='flex-1 overflow-auto'>
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
