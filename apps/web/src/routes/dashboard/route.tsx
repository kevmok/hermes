import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { Navbar } from "./-components/navbar";
import { StatsBar } from "./-components/stats-bar";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: ({ context }) => {
    if (!context.isAuthenticated) {
      throw redirect({ to: "/auth" });
    }
  },
  component: DashboardLayout,
});

function DashboardLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Fixed top navigation */}
      <Navbar />

      {/* Stats strip */}
      <StatsBar />

      {/* Main content */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
