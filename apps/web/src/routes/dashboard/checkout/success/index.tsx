import { createFileRoute, Link } from "@tanstack/react-router";
import { useCustomer } from "autumn-js/react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	CheckmarkCircle01Icon,
	Rocket01Icon,
	Loading03Icon,
} from "@hugeicons/core-free-icons";
import { motion } from "motion/react";

export const Route = createFileRoute("/dashboard/checkout/success/")({
	component: CheckoutSuccessPage,
});

function CheckoutSuccessPage() {
	const { customer, isLoading } = useCustomer();

	const currentProduct = customer?.products?.find(
		(p) => p.status === "active" || p.status === "trialing",
	);

	if (isLoading) {
		return (
			<div className="min-h-[80vh] flex items-center justify-center">
				<HugeiconsIcon
					icon={Loading03Icon}
					size={32}
					className="animate-spin text-primary"
				/>
			</div>
		);
	}

	return (
		<div className="min-h-[80vh] flex items-center justify-center p-6">
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5 }}
				className="max-w-md w-full text-center space-y-6"
			>
				<motion.div
					initial={{ scale: 0 }}
					animate={{ scale: 1 }}
					transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
					className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center"
				>
					<HugeiconsIcon
						icon={CheckmarkCircle01Icon}
						size={48}
						className="text-primary"
					/>
				</motion.div>

				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.4 }}
					className="space-y-2"
				>
					<h1 className="text-3xl font-bold text-foreground">
						Welcome to Hermes!
					</h1>
					<p className="text-lg text-muted-foreground">
						Your subscription is now active.
					</p>
				</motion.div>

				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.6 }}
					className="bg-card border border-border rounded-xl p-6 space-y-4"
				>
					<div className="flex items-center justify-center gap-2 text-primary">
						<HugeiconsIcon icon={Rocket01Icon} size={20} />
						<span className="font-semibold">
							{currentProduct?.name ?? "Pro"} Plan
						</span>
					</div>

					<p className="text-sm text-muted-foreground">
						You now have full access to AI-powered market signals, deep dive
						research, portfolio tracking, and whale alerts.
					</p>

					<ul className="text-sm text-left space-y-2 text-muted-foreground">
						<li className="flex items-center gap-2">
							<HugeiconsIcon
								icon={CheckmarkCircle01Icon}
								size={16}
								className="text-primary shrink-0"
							/>
							Real-time AI consensus signals
						</li>
						<li className="flex items-center gap-2">
							<HugeiconsIcon
								icon={CheckmarkCircle01Icon}
								size={16}
								className="text-primary shrink-0"
							/>
							Deep dive market research
						</li>
						<li className="flex items-center gap-2">
							<HugeiconsIcon
								icon={CheckmarkCircle01Icon}
								size={16}
								className="text-primary shrink-0"
							/>
							Whale activity tracking
						</li>
						<li className="flex items-center gap-2">
							<HugeiconsIcon
								icon={CheckmarkCircle01Icon}
								size={16}
								className="text-primary shrink-0"
							/>
							Email alerts for high-confidence signals
						</li>
					</ul>
				</motion.div>

				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.8 }}
				>
					<Link
						to="/dashboard/trades"
						className="inline-flex items-center justify-center w-full h-9 px-4 text-base font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
					>
						Go to Dashboard
					</Link>
				</motion.div>

				<motion.p
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 1 }}
					className="text-xs text-muted-foreground"
				>
					Questions? Reach out to support@hermes.ai
				</motion.p>
			</motion.div>
		</div>
	);
}
