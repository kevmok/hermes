import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useCustomer, CheckoutDialog } from "autumn-js/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Loading03Icon, AlertCircleIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";

const checkoutSearchSchema = z.object({
	plan: z.enum(["starter", "pro", "unlimited"]).optional(),
});

export const Route = createFileRoute("/dashboard/checkout/")({
	validateSearch: checkoutSearchSchema,
	component: CheckoutPage,
});

function CheckoutPage() {
	const { plan } = Route.useSearch();
	const navigate = useNavigate();
	const { checkout, isLoading: customerLoading } = useCustomer();
	const [error, setError] = useState<string | null>(null);
	const [isCheckingOut, setIsCheckingOut] = useState(false);

	useEffect(() => {
		if (!plan) {
			navigate({ to: "/dashboard/pricing" });
			return;
		}

		if (customerLoading || isCheckingOut) return;

		const initiateCheckout = async () => {
			setIsCheckingOut(true);
			try {
				await checkout({
					productId: plan,
					dialog: CheckoutDialog,
					successUrl: `${window.location.origin}/dashboard/checkout/success`,
				});
			} catch (err) {
				setError(err instanceof Error ? err.message : "Checkout failed");
			} finally {
				setIsCheckingOut(false);
			}
		};

		initiateCheckout();
	}, [plan, customerLoading, checkout, navigate, isCheckingOut]);

	if (error) {
		return (
			<div className="min-h-full flex flex-col items-center justify-center gap-4 p-6">
				<HugeiconsIcon
					icon={AlertCircleIcon}
					size={48}
					className="text-destructive"
				/>
				<h2 className="text-xl font-semibold">Checkout Failed</h2>
				<p className="text-muted-foreground text-center max-w-md">{error}</p>
				<div className="flex gap-3">
					<Button variant="outline" onClick={() => navigate({ to: "/dashboard/pricing" })}>
						View Plans
					</Button>
					<Button onClick={() => window.location.reload()}>Try Again</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-full flex flex-col items-center justify-center gap-4 p-6">
			<HugeiconsIcon
				icon={Loading03Icon}
				size={48}
				className="animate-spin text-primary"
			/>
			<h2 className="text-xl font-semibold">Setting up checkout...</h2>
			<p className="text-muted-foreground">
				{plan
					? `Preparing ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan checkout`
					: "Redirecting to pricing..."}
			</p>
		</div>
	);
}
