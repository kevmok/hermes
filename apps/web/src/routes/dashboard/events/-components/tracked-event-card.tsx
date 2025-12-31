import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Activity03Icon,
  ArrowRight01Icon,
  ChartLineData01Icon,
  LinkSquare01Icon,
  MoneyBag02Icon,
  Time01Icon,
} from "@hugeicons/core-free-icons";
import type { TrackedEvent } from "./event-columns";

interface TrackedEventCardProps {
  event: TrackedEvent;
  index: number;
  onEventSelect?: () => void;
  onMarketSelect?: (slug: string) => void;
}

export function TrackedEventCard({
  event,
  index,
  onEventSelect,
}: TrackedEventCardProps) {
  const polymarketUrl = `https://polymarket.com/event/${event.eventSlug}`;
  const hasSignals = event.signalCount > 0;

  return (
    <div
      className="group relative overflow-hidden rounded-xl border border-white/[0.06] bg-gradient-to-br from-white/[0.03] to-transparent backdrop-blur-sm transition-all duration-300 hover:border-white/[0.12] cursor-pointer"
      style={{
        animationDelay: `${index * 50}ms`,
        animation: "fadeInUp 0.4s ease-out forwards",
        opacity: 0,
      }}
      onClick={onEventSelect}
    >
      {/* Top accent line */}
      <div
        className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${
          hasSignals
            ? "from-cyan-400 to-blue-500"
            : "from-amber-400 to-orange-500"
        } opacity-60`}
      />

      {/* Hover glow */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${
          hasSignals
            ? "from-cyan-500/5 to-blue-500/5"
            : "from-amber-500/5 to-orange-500/5"
        } opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
      />

      {/* Content */}
      <div className="relative p-5">
        {/* Header with image */}
        <div className="flex items-start gap-4 mb-4">
          {event.imageUrl && (
            <img
              src={event.imageUrl}
              alt=""
              className="w-12 h-12 rounded-lg object-cover border border-white/[0.08]"
            />
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold leading-tight line-clamp-2 text-white/90 group-hover:text-white transition-colors">
              {event.title}
            </h3>
            <div className="flex items-center gap-2 mt-1.5">
              {event.isActive ? (
                <Badge className="text-[9px] bg-emerald-500/20 text-emerald-300 border-emerald-500/30 border">
                  ACTIVE
                </Badge>
              ) : (
                <Badge className="text-[9px] bg-red-500/20 text-red-300 border-red-500/30 border">
                  CLOSED
                </Badge>
              )}
              {hasSignals && (
                <Badge className="text-[9px] bg-cyan-500/20 text-cyan-300 border-cyan-500/30 border flex items-center gap-0.5">
                  <HugeiconsIcon icon={Activity03Icon} size={10} />
                  {event.signalCount} SIGNAL{event.signalCount !== 1 ? "S" : ""}
                </Badge>
              )}
            </div>
          </div>
          <HugeiconsIcon
            icon={ArrowRight01Icon}
            size={18}
            className="text-muted-foreground/40 group-hover:text-white/60 transition-colors mt-1"
          />
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {/* Trade count */}
          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
            <div className="flex items-center gap-1.5 mb-1">
              <HugeiconsIcon
                icon={ChartLineData01Icon}
                size={12}
                className="text-muted-foreground/60"
              />
              <span className="text-[9px] font-semibold tracking-widest text-muted-foreground/60 uppercase">
                Trades
              </span>
            </div>
            <span className="text-lg font-bold tabular-nums text-white">
              {event.tradeCount}
            </span>
          </div>

          {/* Volume */}
          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
            <div className="flex items-center gap-1.5 mb-1">
              <HugeiconsIcon
                icon={MoneyBag02Icon}
                size={12}
                className="text-muted-foreground/60"
              />
              <span className="text-[9px] font-semibold tracking-widest text-muted-foreground/60 uppercase">
                Volume
              </span>
            </div>
            <span className="text-lg font-bold tabular-nums text-emerald-400">
              {formatVolume(event.totalVolume)}
            </span>
          </div>

          {/* Markets */}
          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
            <div className="flex items-center gap-1.5 mb-1">
              <HugeiconsIcon
                icon={Activity03Icon}
                size={12}
                className="text-muted-foreground/60"
              />
              <span className="text-[9px] font-semibold tracking-widest text-muted-foreground/60 uppercase">
                Markets
              </span>
            </div>
            <span className="text-lg font-bold tabular-nums text-white">
              {event.marketCount}
            </span>
          </div>
        </div>

        {/* Last activity */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
          <HugeiconsIcon icon={Time01Icon} size={14} />
          <span>Last trade {formatTimeAgo(event.lastTradeAt)}</span>
        </div>

        {/* Action button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.15] transition-all group/btn"
          onClick={(e) => e.stopPropagation()}
          render={
            <a href={polymarketUrl} target="_blank" rel="noopener noreferrer">
              <span className="flex items-center justify-center gap-2">
                <span>View on Polymarket</span>
                <HugeiconsIcon
                  icon={LinkSquare01Icon}
                  size={14}
                  className="text-muted-foreground group-hover/btn:text-amber-400 transition-colors"
                />
              </span>
            </a>
          }
        />
      </div>
    </div>
  );
}

function formatVolume(volume: number | undefined | null): string {
  if (volume == null || isNaN(volume)) return "$0";
  if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `$${(volume / 1_000).toFixed(1)}K`;
  return `$${volume.toFixed(0)}`;
}

function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
}
