import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useConvexMutation, convexQuery } from "@convex-dev/react-query";
import { api } from "backend/convex/_generated/api";
import { useCustomer } from "autumn-js/react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Sun01Icon,
  Moon01Icon,
  ComputerIcon,
  Settings01Icon,
  Notification01Icon,
  Mail01Icon,
  CreditCardIcon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";
import { useTheme } from "@/lib/theme";

export const Route = createFileRoute("/dashboard/settings/")({
  component: SettingsPage,
});

function SettingsPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-full">
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

      <div className="p-4 md:p-6 space-y-6 max-w-2xl">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <HugeiconsIcon
                icon={Settings01Icon}
                size={18}
                className="text-primary"
              />
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
                isSelected={theme === "light"}
                onClick={() => setTheme("light")}
              />
              <ThemeOption
                value="dark"
                label="Dark"
                icon={Moon01Icon}
                isSelected={theme === "dark"}
                onClick={() => setTheme("dark")}
              />
              <ThemeOption
                value="system"
                label="System"
                icon={ComputerIcon}
                isSelected={theme === "system"}
                onClick={() => setTheme("system")}
              />
            </div>
          </CardContent>
        </Card>

        <NotificationPreferencesCard />

        <BillingCard />

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

function BillingCard() {
  const { customer, openBillingPortal, isLoading } = useCustomer();
  const [isOpening, setIsOpening] = useState(false);

  const currentProduct = customer?.products?.find(
    (p) => p.status === "active" || p.status === "trialing",
  );

  const isTrialing = currentProduct?.status === "trialing";
  const trialEndsAt = currentProduct?.current_period_end;
  const daysRemaining = trialEndsAt
    ? Math.max(0, Math.ceil((trialEndsAt * 1000 - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const deepDives = customer?.features?.deep_dives;
  const deepDiveBalance = deepDives?.balance ?? 0;
  const isUnlimited = deepDives?.unlimited ?? false;

  const handleOpenPortal = async () => {
    setIsOpening(true);
    try {
      await openBillingPortal({ returnUrl: window.location.href });
    } finally {
      setIsOpening(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <HugeiconsIcon icon={CreditCardIcon} size={18} className="text-primary" />
            Billing
          </CardTitle>
          <CardDescription>Loading billing information...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-4">
            <HugeiconsIcon icon={Loading03Icon} size={24} className="animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <HugeiconsIcon icon={CreditCardIcon} size={18} className="text-primary" />
          Billing
        </CardTitle>
        <CardDescription>
          Manage your subscription and billing details.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Current Plan</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {currentProduct?.name ?? "No Plan"}
              </span>
              {currentProduct && (
                <Badge variant={isTrialing ? "secondary" : "default"} className="text-xs">
                  {isTrialing ? "Trial" : "Active"}
                </Badge>
              )}
            </div>
          </div>

          {isTrialing && daysRemaining > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Trial Ends</span>
              <span className="text-sm text-amber-500 font-medium">
                {daysRemaining} days remaining
              </span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Deep Dives</span>
            <span className="text-sm font-medium">
              {isUnlimited ? "Unlimited" : `${deepDiveBalance} remaining`}
            </span>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          {currentProduct ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenPortal}
              disabled={isOpening}
              className="flex-1"
            >
              {isOpening ? "Opening..." : "Manage Billing"}
            </Button>
          ) : (
            <Link
              to="/dashboard/pricing"
              className="flex-1 inline-flex items-center justify-center h-7 px-2.5 text-[0.8rem] font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Choose a Plan
            </Link>
          )}
          {currentProduct && (
            <Link
              to="/dashboard/pricing"
              className="inline-flex items-center justify-center text-sm text-primary hover:underline"
            >
              Change Plan
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function NotificationPreferencesCard() {
  const { data, isLoading } = useQuery(
    convexQuery(api.userPreferences.getMyPreferencesWithDefaults, {}),
  );

  const updateMutation = useConvexMutation(
    api.userPreferences.updateMyPreferences,
  );

  const [localEmailAlerts, setLocalEmailAlerts] = useState<boolean | null>(
    null,
  );
  const [localAlertThreshold, setLocalAlertThreshold] = useState<string | null>(
    null,
  );
  const [localDigestFrequency, setLocalDigestFrequency] = useState<
    string | null
  >(null);
  const [isSaving, setIsSaving] = useState(false);

  if (isLoading) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <HugeiconsIcon
              icon={Notification01Icon}
              size={18}
              className="text-primary"
            />
            Notifications
          </CardTitle>
          <CardDescription>Loading preferences...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const prefs = data?.preferences;
  const defaults = data?.defaults;

  const emailAlerts =
    localEmailAlerts ?? prefs?.emailAlerts ?? defaults?.emailAlerts ?? false;
  const alertThreshold =
    localAlertThreshold ??
    prefs?.alertThreshold ??
    defaults?.alertThreshold ??
    "high";
  const digestFrequency =
    localDigestFrequency ??
    prefs?.digestFrequency ??
    defaults?.digestFrequency ??
    "daily";

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateMutation({
        emailAlerts,
        alertThreshold: alertThreshold as "high" | "medium" | "all",
        digestFrequency: digestFrequency as "instant" | "daily" | "weekly",
      });
      setLocalEmailAlerts(null);
      setLocalAlertThreshold(null);
      setLocalDigestFrequency(null);
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges =
    localEmailAlerts !== null ||
    localAlertThreshold !== null ||
    localDigestFrequency !== null;

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <HugeiconsIcon
            icon={Notification01Icon}
            size={18}
            className="text-primary"
          />
          Notifications
        </CardTitle>
        <CardDescription>
          Configure how you want to receive signal alerts.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-sm font-medium flex items-center gap-2">
              <HugeiconsIcon
                icon={Mail01Icon}
                size={16}
                className="text-muted-foreground"
              />
              Email Alerts
            </div>
            <p className="text-xs text-muted-foreground">
              Receive email notifications for new signals
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={emailAlerts}
            onClick={() => setLocalEmailAlerts(!emailAlerts)}
            className={`
              relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent 
              transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
              ${emailAlerts ? "bg-primary" : "bg-muted"}
            `}
          >
            <span
              className={`
                pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-lg ring-0 
                transition-transform ${emailAlerts ? "translate-x-5" : "translate-x-0"}
              `}
            />
          </button>
        </div>

        {emailAlerts && (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">Alert Threshold</label>
              <p className="text-xs text-muted-foreground mb-2">
                Minimum confidence level for instant alerts
              </p>
              <Select
                value={alertThreshold}
                onValueChange={(value) => setLocalAlertThreshold(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">
                    High confidence only (80%+)
                  </SelectItem>
                  <SelectItem value="medium">
                    Medium and above (60%+)
                  </SelectItem>
                  <SelectItem value="all">All signals</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Digest Frequency</label>
              <p className="text-xs text-muted-foreground mb-2">
                How often to receive summary emails
              </p>
              <Select
                value={digestFrequency}
                onValueChange={(value) => setLocalDigestFrequency(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instant">Instant alerts only</SelectItem>
                  <SelectItem value="daily">Daily digest</SelectItem>
                  <SelectItem value="weekly">Weekly digest</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {hasChanges && (
          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ThemeOptionProps {
  value: string;
  label: string;
  icon: typeof Sun01Icon;
  isSelected: boolean;
  onClick: () => void;
}

function ThemeOption({
  label,
  icon: Icon,
  isSelected,
  onClick,
}: ThemeOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all
        ${
          isSelected
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-muted/50"
        }
      `}
    >
      <HugeiconsIcon
        icon={Icon}
        size={24}
        className={isSelected ? "text-primary" : "text-muted-foreground"}
      />
      <span
        className={`text-sm font-medium ${isSelected ? "text-primary" : "text-muted-foreground"}`}
      >
        {label}
      </span>
    </button>
  );
}
