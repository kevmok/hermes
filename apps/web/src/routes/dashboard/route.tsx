import { createFileRoute, Outlet, redirect, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { Navbar } from "./-components/navbar";
import { StatsBar } from "./-components/stats-bar";
import { useCustomer } from "autumn-js/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Loading03Icon } from "@hugeicons/core-free-icons";

const ALLOWED_ROUTES_WITHOUT_SUBSCRIPTION = [
	"/dashboard/pricing",
	"/dashboard/checkout",
	"/dashboard/checkout/success",
	"/dashboard/settings",
];

export const Route = createFileRoute("/dashboard")({
	beforeLoad: ({ context }) => {
		if (!context.isAuthenticated) {
			throw redirect({ to: "/auth" });
		}
	},
	component: DashboardLayout,
});

function SubscriptionGate({ children }: { children: React.ReactNode }) {
	const { customer, isLoading } = useCustomer();
	const navigate = useNavigate();
	const location = useLocation();

	const hasActiveSubscription = customer?.products?.some(
		(p) => p.status === "active" || p.status === "trialing",
	);

	const isAllowedRoute = ALLOWED_ROUTES_WITHOUT_SUBSCRIPTION.some((route) =>
		location.pathname.startsWith(route),
	);

	useEffect(() => {
		if (!isLoading && !hasActiveSubscription && !isAllowedRoute) {
			navigate({ to: "/dashboard/pricing" });
		}
	}, [isLoading, hasActiveSubscription, isAllowedRoute, navigate]);

	if (isLoading) {
		return (
			<div className="min-h-[60vh] flex items-center justify-center">
				<HugeiconsIcon
					icon={Loading03Icon}
					size={32}
					className="animate-spin text-primary"
				/>
			</div>
		);
	}

	if (!hasActiveSubscription && !isAllowedRoute) {
		return (
			<div className="min-h-[60vh] flex items-center justify-center">
				<HugeiconsIcon
					icon={Loading03Icon}
					size={32}
					className="animate-spin text-primary"
				/>
			</div>
		);
	}

	return <>{children}</>;
}

function DashboardLayout() {
	return (
		<div className="min-h-screen flex flex-col bg-background">
			<Navbar />
			<StatsBar />
			<main className="flex-1">
				<SubscriptionGate>
					<Outlet />
				</SubscriptionGate>
			</main>
		</div>
	);
}
