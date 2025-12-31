import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowUp01Icon,
  ArrowDown01Icon,
  MinusSignIcon,
  CheckmarkCircle01Icon,
  CancelCircleIcon,
  LinkSquare01Icon,
} from "@hugeicons/core-free-icons";

export interface Signal {
  _id: string;
  _creationTime: number;
  consensusDecision: "YES" | "NO" | "NO_TRADE";
  consensusPercentage: number;
  confidenceLevel: "high" | "medium" | "low";
  isHighConfidence: boolean;
  aggregatedReasoning: string;
  priceAtTrigger: number;
  signalTimestamp: number;
  triggerTrade:
    | { size: number; price: number; side: "YES" | "NO" }
    | Array<{ size: number; price: number; side: "YES" | "NO" }>;
  market: {
    _id: string;
    title: string;
    eventSlug: string;
    outcome?: "YES" | "NO" | "INVALID" | null;
    resolvedAt?: number;
  } | null;
  voteDistribution?: { YES: number; NO: number; NO_TRADE: number };
  averageConfidence?: number;
  confidenceRange?: { min: number; max: number };
  aggregatedKeyFactors?: string[];
  aggregatedRisks?: string[];
}

interface SignalCardProps {
  signal: Signal;
  index?: number;
  onSelect?: (signalId: string) => void;
}

const decisionConfig = {
  YES: {
    icon: ArrowUp01Icon,
    color: "text-emerald-400",
    bgGradient: "from-emerald-500/20 to-emerald-600/10",
    borderColor: "border-emerald-500/30",
    accentLine: "from-emerald-400 to-emerald-600",
    label: "BUY YES",
  },
  NO: {
    icon: ArrowDown01Icon,
    color: "text-red-400",
    bgGradient: "from-red-500/20 to-red-600/10",
    borderColor: "border-red-500/30",
    accentLine: "from-red-400 to-red-600",
    label: "BUY NO",
  },
  NO_TRADE: {
    icon: MinusSignIcon,
    color: "text-amber-400",
    bgGradient: "from-amber-500/20 to-amber-600/10",
    borderColor: "border-amber-500/30",
    accentLine: "from-amber-400 to-amber-600",
    label: "NO TRADE",
  },
};

export function SignalCard({ signal, index = 0, onSelect }: SignalCardProps) {
  const config = decisionConfig[signal.consensusDecision];
  const outcome = signal.market?.outcome;
  const isResolved = outcome === "YES" || outcome === "NO";
  const isCorrect =
    isResolved && signal.consensusDecision !== "NO_TRADE"
      ? signal.consensusDecision === outcome
      : null;

  const tradeSize = getTotalTradeSize(signal.triggerTrade);
  const polymarketUrl = signal.market?.eventSlug
    ? `https://polymarket.com/event/${signal.market.eventSlug}`
    : null;

  return (
    <div
      onClick={() => onSelect?.(signal._id)}
      className="group relative overflow-hidden rounded-xl border border-white/[0.06] bg-gradient-to-br from-white/[0.03] to-transparent backdrop-blur-sm transition-all duration-300 hover:border-white/[0.12] hover:shadow-lg cursor-pointer"
      style={{
        animationDelay: `${index * 75}ms`,
        animation: "fadeInUp 0.5s ease-out forwards",
        opacity: 0,
      }}
    >
      {/* Top accent gradient line */}
      <div
        className={`absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r ${config.accentLine} opacity-60`}
      />

      {/* Hover glow effect */}
      <div
        className={`absolute inset-0 bg-linear-to-br ${config.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
      />

      {/* Content */}
      <div className="relative p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold leading-tight line-clamp-2 text-white/90 group-hover:text-white transition-colors">
              {signal.market?.title ?? "Unknown Market"}
            </h3>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] font-mono tracking-wider text-muted-foreground/70 uppercase">
                {formatTimeAgo(signal.signalTimestamp)}
              </span>
              <span className="text-muted-foreground/30">|</span>
              <span className="text-[10px] font-mono tracking-wider text-muted-foreground/70">
                {formatUSD(tradeSize)} TRADE
              </span>
            </div>
          </div>

          {/* Decision badge with glow */}
          <div className="flex items-center gap-2 shrink-0">
            {isCorrect !== null && (
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-all ${
                  isCorrect
                    ? "bg-emerald-500/10 border-emerald-500/30"
                    : "bg-red-500/10 border-red-500/30"
                }`}
              >
                <HugeiconsIcon
                  icon={isCorrect ? CheckmarkCircle01Icon : CancelCircleIcon}
                  size={18}
                  className={isCorrect ? "text-emerald-400" : "text-red-400"}
                />
              </div>
            )}
            <div className="relative">
              <div
                className={`absolute inset-0 bg-linear-to-br ${config.bgGradient} blur-lg opacity-50`}
              />
              <div
                className={`relative flex h-11 w-11 items-center justify-center rounded-xl bg-linear-to-br ${config.bgGradient} ${config.borderColor} border shadow-lg`}
              >
                <HugeiconsIcon
                  icon={config.icon}
                  size={22}
                  className={config.color}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Signal decision pill */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${config.bgGradient} ${config.borderColor} border bg-gradient-to-r`}
          >
            <HugeiconsIcon
              icon={config.icon}
              size={14}
              className={config.color}
            />
            <span className={`text-xs font-bold tracking-wide ${config.color}`}>
              {config.label}
            </span>
          </div>

          <Badge
            variant={
              signal.confidenceLevel === "high" ? "default" : "secondary"
            }
            className={`text-[10px] uppercase tracking-wider ${
              signal.confidenceLevel === "high"
                ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
                : signal.confidenceLevel === "medium"
                  ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                  : "bg-white/5 text-white/50 border-white/10"
            } border`}
          >
            {signal.confidenceLevel} confidence
          </Badge>

          {isResolved && (
            <Badge
              className={`text-[10px] uppercase tracking-wider ${
                isCorrect
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                  : "bg-red-500/20 text-red-300 border-red-500/30"
              } border`}
            >
              {isCorrect ? "CORRECT" : "INCORRECT"}
            </Badge>
          )}
        </div>

        {/* Consensus meter */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold tracking-widest text-muted-foreground/60 uppercase">
              AI Consensus
            </span>
            <span className="text-sm font-bold tabular-nums text-white">
              {signal.consensusPercentage.toFixed(0)}%
            </span>
          </div>
          <div className="relative h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${config.accentLine} transition-all duration-500`}
              style={{ width: `${Math.min(100, signal.consensusPercentage)}%` }}
            />
          </div>
          {signal.voteDistribution && (
            <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground/60">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500/60" />
                YES: {signal.voteDistribution.YES}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500/60" />
                NO: {signal.voteDistribution.NO}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500/60" />
                HOLD: {signal.voteDistribution.NO_TRADE}
              </span>
            </div>
          )}
        </div>

        {/* Price info */}
        <div className="flex items-center gap-4 mb-4 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
          <div className="flex-1">
            <span className="text-[10px] font-semibold tracking-widest text-muted-foreground/60 uppercase block mb-0.5">
              YES Price @ Signal
            </span>
            <span className="text-lg font-bold tabular-nums text-white">
              {(signal.priceAtTrigger * 100).toFixed(0)}%
            </span>
          </div>
          {signal.market?.outcome && (
            <>
              <div className="w-px h-8 bg-white/[0.08]" />
              <div className="flex-1">
                <span className="text-[10px] font-semibold tracking-widest text-muted-foreground/60 uppercase block mb-0.5">
                  Outcome
                </span>
                <span
                  className={`text-lg font-bold tabular-nums ${
                    signal.market.outcome === "YES"
                      ? "text-emerald-400"
                      : signal.market.outcome === "NO"
                        ? "text-red-400"
                        : "text-amber-400"
                  }`}
                >
                  {signal.market.outcome}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Reasoning */}
        <p className="text-sm text-muted-foreground/80 leading-relaxed line-clamp-2 mb-3">
          {signal.aggregatedReasoning}
        </p>

        {/* Action button */}
        {polymarketUrl && (
          <Button
            variant="outline"
            size="sm"
            className="w-full bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.15] transition-all group/btn"
            render={
              <a href={polymarketUrl} target="_blank" rel="noopener noreferrer">
                <span className="flex items-center justify-center gap-2">
                  <span>Trade on Polymarket</span>
                  <HugeiconsIcon
                    icon={LinkSquare01Icon}
                    size={14}
                    className="text-muted-foreground group-hover/btn:text-cyan-400 transition-colors"
                  />
                </span>
              </a>
            }
          />
        )}
      </div>
    </div>
  );
}

function getTotalTradeSize(
  trade: { size: number } | Array<{ size: number }>,
): number {
  return Array.isArray(trade)
    ? trade.reduce((sum, t) => sum + t.size, 0)
    : trade.size;
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function formatUSD(amount: number): string {
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}k`;
  return `$${amount.toFixed(0)}`;
}
