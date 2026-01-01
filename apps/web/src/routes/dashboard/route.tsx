import { createFileRoute, Outlet, redirect, Link } from "@tanstack/react-router";
import { Navbar } from "./-components/navbar";
import { StatsBar } from "./-components/stats-bar";
import { useCustomer } from "autumn-js/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { SparklesIcon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { useState } from "react";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: ({ context }) => {
    if (!context.isAuthenticated) {
      throw redirect({ to: "/auth" });
    }
  },
  component: DashboardLayout,
});

function UpgradeBanner() {
  const [dismissed, setDismissed] = useState(false);
  const { customer, isLoading } = useCustomer();

  const hasActiveSubscription = customer?.products?.some(
    (p) => p.status === "active" || p.status === "trialing",
  );

  if (isLoading || hasActiveSubscription || dismissed) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-primary/20">
      <div className="px-4 py-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <HugeiconsIcon
            icon={SparklesIcon}
            size={18}
            className="text-primary shrink-0"
          />
          <p className="text-sm text-foreground truncate">
            <span className="font-medium">Upgrade to unlock all features</span>
            <span className="text-muted-foreground hidden sm:inline">
              {" "}— Get AI signals, deep dives, and more with a 14-day free trial
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/dashboard/pricing"
            className="inline-flex items-center justify-center h-7 px-2.5 text-[0.8rem] font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            View Plans
          </Link>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="p-1 hover:bg-muted rounded-md transition-colors"
            aria-label="Dismiss"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={16} className="text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}

function DashboardLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <UpgradeBanner />
      <StatsBar />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
