import { Link } from '@tanstack/react-router';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowUp01Icon,
  ArrowDown01Icon,
  MinusSignIcon,
  LinkSquare01Icon,
  Clock01Icon,
  Dollar01Icon,
  CheckmarkCircle01Icon,
  CancelCircleIcon,
  Calendar03Icon,
} from '@hugeicons/core-free-icons';

// Signal type from backend
interface SignalData {
  _id: string;
  _creationTime: number;
  consensusDecision: 'YES' | 'NO' | 'NO_TRADE';
  consensusPercentage: number;
  totalModels: number;
  agreeingModels: number;
  confidenceLevel: 'high' | 'medium' | 'low';
  isHighConfidence: boolean;
  aggregatedReasoning: string;
  priceAtTrigger: number;
  signalTimestamp: number;
  triggerTrade: {
    size: number;
    price: number;
    side: 'YES' | 'NO';
    timestamp: number;
  };
  market: {
    _id: string;
    title: string;
    eventSlug: string;
    outcome?: 'YES' | 'NO' | 'INVALID' | null;
    resolvedAt?: number;
  } | null;
  voteDistribution?: { YES: number; NO: number; NO_TRADE: number };
  averageConfidence?: number;
  confidenceRange?: { min: number; max: number };
  aggregatedKeyFactors?: string[];
  aggregatedRisks?: string[];
  predictions?: Array<{
    _id: string;
    modelName: string;
    decision: 'YES' | 'NO' | 'NO_TRADE';
    reasoning: string;
    responseTimeMs: number;
    confidence?: number;
  }>;
}

interface SignalDetailContentProps {
  signal: SignalData;
}

const decisionConfig = {
  YES: {
    icon: ArrowUp01Icon,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    accentLine: 'from-emerald-400 to-emerald-600',
    label: 'BUY YES',
  },
  NO: {
    icon: ArrowDown01Icon,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    accentLine: 'from-red-400 to-red-600',
    label: 'BUY NO',
  },
  NO_TRADE: {
    icon: MinusSignIcon,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    accentLine: 'from-amber-400 to-amber-600',
    label: 'NO TRADE',
  },
};

export function SignalDetailContent({ signal }: SignalDetailContentProps) {
  const config = decisionConfig[signal.consensusDecision];
  const outcome = signal.market?.outcome;
  const isResolved = outcome === 'YES' || outcome === 'NO';
  const isCorrect =
    isResolved && signal.consensusDecision !== 'NO_TRADE'
      ? signal.consensusDecision === outcome
      : null;

  const polymarketUrl = signal.market?.eventSlug
    ? `https://polymarket.com/event/${signal.market.eventSlug}`
    : null;

  return (
    <div className="flex flex-col h-full">
      {/* Header with accent line */}
      <div className={`h-1 bg-gradient-to-r ${config.accentLine}`} />

      <SheetHeader className="p-6 pb-4">
        <div className="flex items-start gap-4">
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-xl ${config.bgColor} ${config.borderColor} border shrink-0`}
          >
            <HugeiconsIcon icon={config.icon} size={28} className={config.color} />
          </div>
          <div className="flex-1 min-w-0">
            <SheetTitle className="text-lg leading-tight mb-2">
              {signal.market?.title ?? 'Unknown Market'}
            </SheetTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={`${config.bgColor} ${config.color} ${config.borderColor} border`}
              >
                {config.label}
              </Badge>
              <Badge
                variant="outline"
                className={`${
                  signal.confidenceLevel === 'high'
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                    : signal.confidenceLevel === 'medium'
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                      : 'bg-white/5 text-white/50 border-white/10'
                } border`}
              >
                {signal.confidenceLevel} confidence
              </Badge>
              {isCorrect !== null && (
                <Badge
                  variant="outline"
                  className={`${
                    isCorrect
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-red-500/20 text-red-300 border-red-500/30'
                  } border`}
                >
                  <HugeiconsIcon
                    icon={isCorrect ? CheckmarkCircle01Icon : CancelCircleIcon}
                    size={12}
                    className="mr-1"
                  />
                  {isCorrect ? 'CORRECT' : 'INCORRECT'}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <SheetDescription className="text-xs text-muted-foreground mt-2">
          Signal generated {formatRelativeTime(signal.signalTimestamp)}
        </SheetDescription>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6">
        {/* AI Consensus Section */}
        <section>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
            AI Consensus
          </h3>
          <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.06] space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Model Agreement</span>
              <span className="text-lg font-bold tabular-nums">
                {signal.consensusPercentage.toFixed(0)}%
              </span>
            </div>
            <div className="relative h-2 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${config.accentLine}`}
                style={{ width: `${Math.min(100, signal.consensusPercentage)}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {signal.agreeingModels} of {signal.totalModels} models agreed
            </p>

            {signal.voteDistribution && (
              <div className="flex items-center gap-4 pt-2 border-t border-white/[0.06]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-xs text-muted-foreground">
                    YES: {signal.voteDistribution.YES}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <span className="text-xs text-muted-foreground">
                    NO: {signal.voteDistribution.NO}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="text-xs text-muted-foreground">
                    HOLD: {signal.voteDistribution.NO_TRADE}
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>

        <Separator className="bg-white/[0.06]" />

        {/* Trigger Trade Details */}
        <section>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
            Trigger Trade
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <HugeiconsIcon icon={Dollar01Icon} size={14} />
                <span className="text-xs">Size</span>
              </div>
              <span className="text-lg font-bold tabular-nums">
                ${signal.triggerTrade.size.toLocaleString()}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <HugeiconsIcon
                  icon={signal.triggerTrade.side === 'YES' ? ArrowUp01Icon : ArrowDown01Icon}
                  size={14}
                />
                <span className="text-xs">Side @ Price</span>
              </div>
              <span className={`text-lg font-bold tabular-nums ${signal.triggerTrade.side === 'YES' ? 'text-emerald-400' : 'text-red-400'}`}>
                {signal.triggerTrade.side} @ {(signal.triggerTrade.price * 100).toFixed(1)}%
              </span>
            </div>
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <HugeiconsIcon icon={Clock01Icon} size={14} />
                <span className="text-xs">Trade Time</span>
              </div>
              <span className="text-sm">
                {new Date(signal.triggerTrade.timestamp).toLocaleString()}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <span className="text-xs">Price @ Trigger</span>
              </div>
              <span className="text-lg font-bold tabular-nums">
                {(signal.priceAtTrigger * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </section>

        {/* Market Outcome (if resolved) */}
        {isResolved && (
          <>
            <Separator className="bg-white/[0.06]" />
            <section>
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
                Market Outcome
              </h3>
              <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Resolved</span>
                  <Badge
                    variant="outline"
                    className={`${
                      outcome === 'YES'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : 'bg-red-500/20 text-red-400 border-red-500/30'
                    } border`}
                  >
                    {outcome}
                  </Badge>
                </div>
              </div>
            </section>
          </>
        )}

        {/* Model Predictions */}
        {signal.predictions && signal.predictions.length > 0 && (
          <>
            <Separator className="bg-white/[0.06]" />
            <section>
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
                Model Predictions
              </h3>
              <div className="space-y-3">
                {signal.predictions.map((prediction) => {
                  const predConfig = decisionConfig[prediction.decision];
                  return (
                    <div
                      key={prediction._id}
                      className={`p-4 rounded-lg ${predConfig.bgColor} border ${predConfig.borderColor}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{prediction.modelName}</span>
                        <div className="flex items-center gap-2">
                          <HugeiconsIcon
                            icon={predConfig.icon}
                            size={16}
                            className={predConfig.color}
                          />
                          <span className={`font-semibold ${predConfig.color}`}>
                            {prediction.decision}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {prediction.reasoning}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>{prediction.responseTimeMs}ms</span>
                        {prediction.confidence != null && (
                          <span>{prediction.confidence}% confidence</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}

        <Separator className="bg-white/[0.06]" />

        {/* Aggregated Reasoning */}
        <section>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
            Aggregated Reasoning
          </h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {signal.aggregatedReasoning}
          </p>
        </section>

        {/* Key Factors & Risks */}
        {(signal.aggregatedKeyFactors?.length || signal.aggregatedRisks?.length) && (
          <>
            <Separator className="bg-white/[0.06]" />
            <section className="grid grid-cols-2 gap-4">
              {signal.aggregatedKeyFactors && signal.aggregatedKeyFactors.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold mb-2 text-emerald-400 uppercase tracking-wider">
                    Key Factors
                  </h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {signal.aggregatedKeyFactors.map((factor, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-emerald-400">•</span>
                        {factor}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {signal.aggregatedRisks && signal.aggregatedRisks.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold mb-2 text-red-400 uppercase tracking-wider">
                    Risks
                  </h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {signal.aggregatedRisks.map((risk, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-red-400">•</span>
                        {risk}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          </>
        )}

        <Separator className="bg-white/[0.06]" />

        {/* Related Links */}
        <section>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
            Related
          </h3>
          <div className="space-y-2">
            {signal.market?.eventSlug && (
              <Link
                to="/dashboard/events/$eventId"
                params={{ eventId: signal.market.eventSlug }}
                className="flex items-center gap-2 p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1] transition-colors"
              >
                <HugeiconsIcon icon={Calendar03Icon} size={16} className="text-amber-400" />
                <span className="text-sm">View Event Details</span>
              </Link>
            )}
            {polymarketUrl && (
              <a
                href={polymarketUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1] transition-colors"
              >
                <HugeiconsIcon icon={LinkSquare01Icon} size={16} className="text-cyan-400" />
                <span className="text-sm">Trade on Polymarket</span>
              </a>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}
