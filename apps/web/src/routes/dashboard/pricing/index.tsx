import { createFileRoute } from "@tanstack/react-router";
import { useCustomer, CheckoutDialog } from "autumn-js/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckmarkCircle01Icon,
  Loading03Icon,
  Rocket01Icon,
  SparklesIcon,
  Diamond01Icon,
} from "@hugeicons/core-free-icons";

export const Route = createFileRoute("/dashboard/pricing/")({
  component: PricingPage,
});

const tiers = [
  {
    id: "starter",
    name: "Starter",
    price: 40,
    description: "Perfect for getting started",
    features: [
      "All AI signals",
      "Email alerts",
      "1 deep dive research/month",
      "Basic analytics",
    ],
    icon: Rocket01Icon,
  },
  {
    id: "pro",
    name: "Pro",
    price: 99,
    description: "For serious traders",
    features: [
      "Everything in Starter",
      "10 deep dives/month",
      "Portfolio sync",
      "Whale watch alerts",
      "Priority support",
    ],
    highlighted: true,
    icon: SparklesIcon,
  },
  {
    id: "unlimited",
    name: "Unlimited",
    price: 249,
    description: "For power users",
    features: ["Everything in Pro", "Unlimited deep dives", "Priority support"],
    icon: Diamond01Icon,
  },
];

function PricingPage() {
  const { customer, checkout, isLoading } = useCustomer();

  const currentProduct = customer?.products?.find(
    (p) => p.status === "active" || p.status === "trialing",
  );

  const isTrialing = currentProduct?.status === "trialing";
  const trialEndsAt = currentProduct?.current_period_end;
  const daysRemaining = trialEndsAt
    ? Math.max(
        0,
        Math.ceil((trialEndsAt * 1000 - Date.now()) / (1000 * 60 * 60 * 24)),
      )
    : 0;

  const handleCheckout = async (productId: string) => {
    await checkout({
      productId,
      dialog: CheckoutDialog,
      successUrl: `${window.location.origin}/dashboard?checkout=success`,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <HugeiconsIcon
          icon={Loading03Icon}
          size={32}
          className="animate-spin text-primary"
        />
      </div>
    );
  }

  return (
    <div className="min-h-full">
      <div className="border-b border-border bg-card/50">
        <div className="px-4 py-6 md:px-6 md:py-8">
          <div className="space-y-1 text-center max-w-2xl mx-auto">
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
              Choose Your Plan
            </h1>
            <p className="text-sm text-muted-foreground">
              {currentProduct ? (
                <>
                  You're currently on the{" "}
                  <span className="text-primary font-medium">
                    {currentProduct.name}
                  </span>{" "}
                  plan
                  {isTrialing && (
                    <span className="text-amber-500">
                      {" "}
                      (trial ends in {daysRemaining} days)
                    </span>
                  )}
                </>
              ) : (
                <>
                  Start with a{" "}
                  <span className="text-primary font-medium">
                    14-day free trial
                  </span>{" "}
                  — full access to all features.
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6">
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {tiers.map((tier) => {
            const isCurrentPlan = currentProduct?.id === tier.id;
            const isHigherTier =
              currentProduct &&
              tiers.findIndex((t) => t.id === tier.id) >
                tiers.findIndex((t) => t.id === currentProduct.id);

            return (
              <Card
                key={tier.id}
                className={`relative overflow-hidden transition-all ${
                  tier.highlighted
                    ? "border-primary shadow-lg md:-mt-4 md:mb-4"
                    : "border-border"
                } ${isCurrentPlan ? "ring-2 ring-primary" : ""}`}
              >
                {tier.highlighted && (
                  <div className="absolute top-0 left-0 right-0 bg-primary text-primary-foreground text-xs font-medium text-center py-1">
                    Most Popular
                  </div>
                )}

                {isCurrentPlan && (
                  <Badge className="absolute top-2 right-2" variant="secondary">
                    Current Plan
                  </Badge>
                )}

                <CardHeader className={tier.highlighted ? "pt-8" : ""}>
                  <div className="flex items-center gap-2 mb-2">
                    <HugeiconsIcon
                      icon={tier.icon}
                      size={20}
                      className={
                        tier.highlighted
                          ? "text-primary"
                          : "text-muted-foreground"
                      }
                    />
                    <CardTitle className="text-lg">{tier.name}</CardTitle>
                  </div>
                  <CardDescription>{tier.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-3xl font-bold">${tier.price}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {tier.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-center gap-2 text-sm text-muted-foreground"
                      >
                        <HugeiconsIcon
                          icon={CheckmarkCircle01Icon}
                          size={16}
                          className="text-primary shrink-0"
                        />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="w-full"
                    variant={tier.highlighted ? "default" : "outline"}
                    disabled={isCurrentPlan}
                    onClick={() => handleCheckout(tier.id)}
                  >
                    {isCurrentPlan
                      ? "Current Plan"
                      : isHigherTier
                        ? "Upgrade"
                        : currentProduct
                          ? "Change Plan"
                          : "Start Free Trial"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          All plans include a 14-day free trial. Cancel anytime.
        </p>
      </div>
    </div>
  );
}
