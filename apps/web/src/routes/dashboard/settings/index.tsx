import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const Route = createFileRoute("/dashboard/settings/")({
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and preferences.
        </p>
      </div>

      <Card className="border-sidebar-border bg-sidebar/50">
        <CardHeader>
          <CardTitle>Account Settings</CardTitle>
          <CardDescription>
            Settings and preferences coming soon.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            This section will include notification preferences, theme settings, and account management options.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
