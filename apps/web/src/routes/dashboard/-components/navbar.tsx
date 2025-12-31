import { useState } from 'react';
import { Link, useLocation, useRouter } from '@tanstack/react-router';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Activity03Icon,
  Calendar03Icon,
  Award01Icon,
  Wallet01Icon,
  Settings01Icon,
  Logout01Icon,
  Sun01Icon,
  Moon01Icon,
  Menu01Icon,
} from '@hugeicons/core-free-icons';
import { authClient } from '@/lib/auth/client';
import { useTheme } from '@/lib/theme';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

const navItems = [
  {
    title: 'Signals',
    href: '/dashboard/trades',
    icon: Activity03Icon,
    description: 'Trade-triggered signals',
  },
  {
    title: 'Events',
    href: '/dashboard/events',
    icon: Calendar03Icon,
    description: 'Tracked market events',
  },
  {
    title: 'Performance',
    href: '/dashboard/performance',
    icon: Award01Icon,
    description: 'Signal accuracy metrics',
  },
  {
    title: 'Portfolio',
    href: '/dashboard/portfolio',
    icon: Wallet01Icon,
    description: 'Your tracked positions',
  },
];

export function Navbar() {
  const location = useLocation();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4 md:px-6">
        {/* Logo */}
        <Link 
          to="/dashboard" 
          className="flex items-center gap-2 mr-6 shrink-0"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
            <span className="text-lg font-bold text-primary">H</span>
          </div>
          <span className="text-lg font-semibold hidden sm:inline-block">
            Hermes
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium
                  transition-colors relative
                  ${isActive 
                    ? 'text-foreground bg-muted' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }
                `}
              >
                <HugeiconsIcon icon={item.icon} size={18} />
                <span>{item.title}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-primary rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-2">
          {/* Theme Toggle */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <HugeiconsIcon
                    icon={Sun01Icon}
                    size={18}
                    className="rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0"
                  />
                  <HugeiconsIcon
                    icon={Moon01Icon}
                    size={18}
                    className="absolute rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100"
                  />
                  <span className="sr-only">Toggle theme</span>
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuRadioGroup
                value={theme}
                onValueChange={(value) => setTheme(value as 'light' | 'dark' | 'system')}
              >
                <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="system">System</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Settings */}
          <Link 
            to="/dashboard/settings"
            className="inline-flex items-center justify-center h-9 w-9 rounded-md text-sm font-medium transition-colors hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <HugeiconsIcon icon={Settings01Icon} size={18} />
            <span className="sr-only">Settings</span>
          </Link>

          {/* Sign Out */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 text-muted-foreground hover:text-foreground"
            onClick={handleSignOut}
          >
            <HugeiconsIcon icon={Logout01Icon} size={18} />
            <span className="sr-only">Sign out</span>
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-9 w-9"
          onClick={() => setMobileMenuOpen(true)}
        >
          <HugeiconsIcon icon={Menu01Icon} size={20} />
          <span className="sr-only">Open menu</span>
        </Button>
      </div>

      {/* Mobile Menu Sheet */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="right" className="w-[280px] p-0">
          <SheetHeader className="p-4 border-b border-border">
            <SheetTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                <span className="text-lg font-bold text-primary">H</span>
              </div>
              Hermes
            </SheetTitle>
          </SheetHeader>
          
          <nav className="flex flex-col p-4 gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`
                    flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium
                    transition-colors
                    ${isActive 
                      ? 'text-foreground bg-muted' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }
                  `}
                >
                  <HugeiconsIcon icon={item.icon} size={20} />
                  <div className="flex flex-col">
                    <span>{item.title}</span>
                    <span className="text-xs text-muted-foreground font-normal">
                      {item.description}
                    </span>
                  </div>
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-border p-4 space-y-3">
            {/* Theme Selector */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Theme</span>
              <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                <button
                  onClick={() => setTheme('light')}
                  className={`p-2 rounded-md transition-colors ${
                    theme === 'light' ? 'bg-background shadow-sm' : 'hover:bg-background/50'
                  }`}
                >
                  <HugeiconsIcon icon={Sun01Icon} size={16} />
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={`p-2 rounded-md transition-colors ${
                    theme === 'dark' ? 'bg-background shadow-sm' : 'hover:bg-background/50'
                  }`}
                >
                  <HugeiconsIcon icon={Moon01Icon} size={16} />
                </button>
              </div>
            </div>

            {/* Settings Link */}
            <Link
              to="/dashboard/settings"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <HugeiconsIcon icon={Settings01Icon} size={18} />
              Settings
            </Link>

            {/* Sign Out */}
            <button
              onClick={() => {
                handleSignOut();
                setMobileMenuOpen(false);
              }}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors w-full"
            >
              <HugeiconsIcon icon={Logout01Icon} size={18} />
              Sign out
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
