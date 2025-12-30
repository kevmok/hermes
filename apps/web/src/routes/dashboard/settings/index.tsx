import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { HugeiconsIcon } from '@hugeicons/react';
import { Sun01Icon, Moon01Icon, ComputerIcon, Settings01Icon } from '@hugeicons/core-free-icons';
import { useTheme } from '@/lib/theme';

export const Route = createFileRoute('/dashboard/settings/')({
  component: SettingsPage,
});

function SettingsPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-full">
      {/* Page Header */}
      <div className="border-b border-border bg-card/50">
        <div className="px-4 py-6 md:px-6 md:py-8">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
              Settings
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage your account and preferences.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 md:p-6 space-y-6 max-w-2xl">
        {/* Appearance */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <HugeiconsIcon icon={Settings01Icon} size={18} className="text-primary" />
              Appearance
            </CardTitle>
            <CardDescription>
              Choose how Hermes looks on your device.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              <ThemeOption
                value="light"
                label="Light"
                icon={Sun01Icon}
                isSelected={theme === 'light'}
                onClick={() => setTheme('light')}
              />
              <ThemeOption
                value="dark"
                label="Dark"
                icon={Moon01Icon}
                isSelected={theme === 'dark'}
                onClick={() => setTheme('dark')}
              />
              <ThemeOption
                value="system"
                label="System"
                icon={ComputerIcon}
                isSelected={theme === 'system'}
                onClick={() => setTheme('system')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Coming Soon */}
        <Card className="border-border bg-card opacity-60">
          <CardHeader>
            <CardTitle className="text-base">Notifications</CardTitle>
            <CardDescription>
              Configure how you want to receive alerts and updates.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Coming soon...</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card opacity-60">
          <CardHeader>
            <CardTitle className="text-base">Account</CardTitle>
            <CardDescription>
              Manage your account settings and data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Coming soon...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface ThemeOptionProps {
  value: string;
  label: string;
  icon: typeof Sun01Icon;
  isSelected: boolean;
  onClick: () => void;
}

function ThemeOption({ label, icon: Icon, isSelected, onClick }: ThemeOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all
        ${isSelected 
          ? 'border-primary bg-primary/5' 
          : 'border-border hover:border-primary/50 hover:bg-muted/50'
        }
      `}
    >
      <HugeiconsIcon 
        icon={Icon} 
        size={24} 
        className={isSelected ? 'text-primary' : 'text-muted-foreground'} 
      />
      <span className={`text-sm font-medium ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
        {label}
      </span>
    </button>
  );
}
