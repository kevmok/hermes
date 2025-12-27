import { Link, useLocation, useRouter } from '@tanstack/react-router';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Settings01Icon,
  Logout01Icon,
  Sun01Icon,
  Moon01Icon,
  ComputerIcon,
  MoneyBag02Icon,
  Calendar03Icon,
} from '@hugeicons/core-free-icons';
import { authClient } from '@/lib/auth/client';
import { useTheme } from '@/lib/theme';

const navItems = [
  {
    title: 'Trades',
    href: '/dashboard/trades',
    icon: MoneyBag02Icon,
  },
  {
    title: 'Events',
    href: '/dashboard/events',
    icon: Calendar03Icon,
  },
];

export function AppSidebar() {
  const location = useLocation();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const themeLabel =
    theme === 'system' ? 'System' : theme === 'dark' ? 'Dark' : 'Light';

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.invalidate();
        },
      },
    });
  };

  return (
    <Sidebar collapsible='icon' variant='sidebar'>
      <SidebarHeader className='h-14 justify-center border-b border-sidebar-border'>
        <Link to='/dashboard' className='flex items-center gap-2 px-2'>
          <div
            className='flex h-8 w-8 items-center justify-center rounded-lg'
            style={{
              background:
                'linear-gradient(135deg, rgba(34, 211, 238, 0.2), rgba(168, 85, 247, 0.2))',
              border: '1px solid rgba(34, 211, 238, 0.3)',
            }}
          >
            <span className='text-lg font-bold text-cyan-400'>H</span>
          </div>
          <span className='text-lg font-semibold group-data-[collapsible=icon]:hidden'>
            Hermes
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = location.pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton isActive={isActive}>
                      <Link
                        to={item.href}
                        className='flex w-full items-center gap-3 rounded-md py-2 font-medium text-sm transition-colors'
                      >
                        <HugeiconsIcon icon={item.icon} size={18} />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator />
        <div className='flex items-center justify-between px-2 py-2 group-data-[collapsible=icon]:justify-center'>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type='button'
                  className='flex items-center justify-center size-8 rounded-md hover:bg-sidebar-accent transition-colors'
                  aria-label={`Theme: ${themeLabel}`}
                >
                  <span className='relative flex items-center justify-center size-4.5'>
                    <HugeiconsIcon
                      icon={Sun01Icon}
                      size={18}
                      className='absolute rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0'
                    />
                    <HugeiconsIcon
                      icon={Moon01Icon}
                      size={18}
                      className='absolute rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100'
                    />
                  </span>
                </button>
              }
            />
            <DropdownMenuContent side='top' align='start' sideOffset={8}>
              <DropdownMenuRadioGroup
                value={theme}
                onValueChange={(value) =>
                  setTheme(value as 'light' | 'dark' | 'system')
                }
              >
                <DropdownMenuRadioItem value='light'>
                  <HugeiconsIcon icon={Sun01Icon} size={16} className='mr-2' />
                  Light
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value='dark'>
                  <HugeiconsIcon icon={Moon01Icon} size={16} className='mr-2' />
                  Dark
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value='system'>
                  <HugeiconsIcon
                    icon={ComputerIcon}
                    size={16}
                    className='mr-2'
                  />
                  System
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className='flex items-center gap-1 group-data-[collapsible=icon]:hidden'>
            <Link
              to='/dashboard/settings'
              className='flex items-center justify-center size-8 rounded-md hover:bg-sidebar-accent transition-colors'
              aria-label='Settings'
            >
              <HugeiconsIcon icon={Settings01Icon} size={18} />
            </Link>
            <button
              type='button'
              onClick={handleSignOut}
              className='flex items-center justify-center size-8 rounded-md hover:bg-sidebar-accent transition-colors'
              aria-label='Sign out'
            >
              <HugeiconsIcon icon={Logout01Icon} size={18} />
            </button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
