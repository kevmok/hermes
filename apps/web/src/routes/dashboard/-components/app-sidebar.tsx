import { Link, useLocation, useRouter } from "@tanstack/react-router";
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
} from "@/components/ui/sidebar";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ChartLineData01Icon,
  SparklesIcon,
  StarIcon,
  Settings01Icon,
  Logout01Icon,
} from "@hugeicons/core-free-icons";
import { authClient } from "@/lib/auth/client";

const navItems = [
  {
    title: "Markets",
    href: "/dashboard/markets",
    icon: ChartLineData01Icon,
  },
  {
    title: "Insights",
    href: "/dashboard/insights",
    icon: SparklesIcon,
  },
  {
    title: "Watchlist",
    href: "/dashboard/watchlist",
    icon: StarIcon,
  },
];

export function AppSidebar() {
  const location = useLocation();
  const router = useRouter();

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.invalidate();
        },
      },
    });
    window.location.href = "/";
  };

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="h-14 justify-center border-b border-sidebar-border">
        <Link to="/dashboard" className="flex items-center gap-2 px-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{
              background:
                "linear-gradient(135deg, rgba(34, 211, 238, 0.2), rgba(168, 85, 247, 0.2))",
              border: "1px solid rgba(34, 211, 238, 0.3)",
            }}
          >
            <span className="text-lg font-bold text-cyan-400">H</span>
          </div>
          <span className="text-lg font-semibold group-data-[collapsible=icon]:hidden">
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
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.title}
                      render={
                        <Link to={item.href}>
                          <HugeiconsIcon icon={item.icon} size={18} />
                          <span>{item.title}</span>
                        </Link>
                      }
                    />
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Settings"
              render={
                <Link to="/dashboard/settings">
                  <HugeiconsIcon icon={Settings01Icon} size={18} />
                  <span>Settings</span>
                </Link>
              }
            />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Sign out" onClick={handleSignOut}>
              <HugeiconsIcon icon={Logout01Icon} size={18} />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
