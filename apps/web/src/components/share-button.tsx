import { useMutation } from "convex/react";
import { api } from "backend/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { Share08Icon } from "@hugeicons/core-free-icons";

interface ShareButtonProps {
  signal: {
    consensusDecision: string;
    consensusPercentage: number;
    aggregatedKeyFactors?: string[];
    market?: { title: string } | null;
  };
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export function ShareButton({
  signal,
  variant = "outline",
  size = "sm",
}: ShareButtonProps) {
  const recordShare = useMutation(api.userActivity.recordShare);

  const handleShare = async () => {
    const keyFactors = signal.aggregatedKeyFactors?.slice(0, 2) ?? [];
    const factorsText =
      keyFactors.length > 0
        ? `\n\nKey factors:\n${keyFactors.map((f) => `• ${f}`).join("\n")}`
        : "";

    const text = `Hermes AI Consensus: ${signal.consensusPercentage.toFixed(0)}% say ${signal.consensusDecision} on "${signal.market?.title ?? "this market"}"${factorsText}\n\nTry Hermes: https://hermes.trading`;

    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(twitterUrl, "_blank", "noopener,noreferrer");

    try {
      await recordShare({});
    } catch (error) {
      console.error("Failed to record share:", error);
    }
  };

  return (
    <Button variant={variant} size={size} onClick={handleShare}>
      <HugeiconsIcon icon={Share08Icon} size={14} className="mr-2" />
      Share
    </Button>
  );
}
