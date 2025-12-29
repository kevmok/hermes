import { Link, useLocation } from '@tanstack/react-router';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

// Map route paths to readable labels
const routeLabels: Record<string, string> = {
  '/dashboard': 'Home',
  '/dashboard/trades': 'Trades',
  '/dashboard/events': 'Events',
  '/dashboard/performance': 'Performance',
  '/dashboard/insights': 'Insights',
  '/dashboard/markets': 'Markets',
  '/dashboard/watchlist': 'Watchlist',
  '/dashboard/settings': 'Settings',
  '/dashboard/signals': 'Signals',
};

export function DashboardBreadcrumbs() {
  const location = useLocation();
  const pathname = location.pathname;

  // Build breadcrumb items from the current path
  const pathSegments = pathname.split('/').filter(Boolean);
  const breadcrumbs: Array<{ path: string; label: string; isLast: boolean }> =
    [];

  let currentPath = '';
  for (let i = 0; i < pathSegments.length; i++) {
    currentPath += `/${pathSegments[i]}`;
    const isLast = i === pathSegments.length - 1;

    // Skip the root dashboard breadcrumb if we're on a child route
    if (currentPath === '/dashboard' && pathSegments.length > 1) {
      breadcrumbs.push({
        path: currentPath,
        label: 'Home',
        isLast: false,
      });
      continue;
    }

    // Get label from map or capitalize the segment
    let label = routeLabels[currentPath];
    if (!label) {
      // For dynamic routes like /dashboard/trades/$signalId
      // Show a truncated version or "Details"
      const segment = pathSegments[i];
      if (segment.startsWith('$') || segment.length > 20) {
        label = 'Details';
      } else {
        label = segment.charAt(0).toUpperCase() + segment.slice(1);
      }
    }

    breadcrumbs.push({
      path: currentPath,
      label,
      isLast,
    });
  }

  // Don't show breadcrumbs if we're at the dashboard root or only one level deep
  if (breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbs.map((crumb) => (
          <BreadcrumbItem key={crumb.path}>
            {crumb.isLast ? (
              <BreadcrumbPage className='max-w-[200px] truncate'>
                {crumb.label}
              </BreadcrumbPage>
            ) : (
              <>
                <BreadcrumbLink
                  render={<Link to={crumb.path} />}
                  className='text-muted-foreground hover:text-foreground'
                >
                  {crumb.label}
                </BreadcrumbLink>
                <BreadcrumbSeparator />
              </>
            )}
          </BreadcrumbItem>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
