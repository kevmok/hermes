import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { api } from "backend/convex/_generated/api";
import { HugeiconsIcon } from "@hugeicons/react";
import { Activity03Icon, Wifi01Icon } from "@hugeicons/core-free-icons";
import { SignalCard, type Signal } from "./signal-card";

interface SignalFeedProps {
  limit?: number;
  onlyHighConfidence?: boolean;
  decision?: "YES" | "NO" | "NO_TRADE";
  onSignalSelect?: (signalId: string) => void;
}

export function SignalFeed({
  limit = 20,
  onlyHighConfidence = false,
  decision,
  onSignalSelect,
}: SignalFeedProps) {
  const { data: paginatedData, isLoading } = useQuery(
    convexQuery(api.signals.getSignalsWithPagination, {
      limit,
      onlyHighConfidence,
      decision,
    })
  );

  const signals = paginatedData?.items;

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-gradient-to-br from-white/[0.03] to-transparent backdrop-blur-sm"
            style={{
              animationDelay: `${i * 100}ms`,
              animation: "fadeInUp 0.5s ease-out forwards",
              opacity: 0,
            }}
          >
            {/* Top accent line placeholder */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-500/30 to-purple-500/30 animate-shimmer" />

            <div className="p-5 space-y-4">
              {/* Title skeleton */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-3/4 bg-white/[0.06] rounded animate-pulse" />
                  <div className="h-3 w-1/3 bg-white/[0.04] rounded animate-pulse" />
                </div>
                <div className="h-11 w-11 bg-white/[0.06] rounded-xl animate-pulse" />
              </div>

              {/* Badge skeletons */}
              <div className="flex gap-2">
                <div className="h-6 w-20 bg-white/[0.04] rounded-full animate-pulse" />
                <div className="h-6 w-16 bg-white/[0.04] rounded-full animate-pulse" />
              </div>

              {/* Consensus bar skeleton */}
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <div className="h-3 w-20 bg-white/[0.04] rounded animate-pulse" />
                  <div className="h-3 w-8 bg-white/[0.04] rounded animate-pulse" />
                </div>
                <div className="h-1.5 w-full bg-white/[0.04] rounded-full overflow-hidden">
                  <div className="h-full w-2/3 bg-gradient-to-r from-cyan-500/30 to-purple-500/30 animate-shimmer" />
                </div>
              </div>

              {/* Content skeleton */}
              <div className="space-y-2">
                <div className="h-4 w-full bg-white/[0.04] rounded animate-pulse" />
                <div className="h-4 w-5/6 bg-white/[0.04] rounded animate-pulse" />
              </div>

              {/* Button skeleton */}
              <div className="h-9 w-full bg-white/[0.04] rounded-md animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!signals || signals.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.02] to-transparent">
        {/* Decorative background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-500/5 via-transparent to-transparent" />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(34, 211, 238, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 211, 238, 0.3) 1px, transparent 1px)`,
            backgroundSize: "32px 32px",
          }}
        />

        <div className="relative flex flex-col items-center justify-center py-16 px-6">
          {/* Icon with glow */}
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-cyan-500/20 blur-2xl rounded-full" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-cyan-500/20">
              <HugeiconsIcon
                icon={Activity03Icon}
                size={40}
                className="text-cyan-400/60"
              />
            </div>
          </div>

          <h3 className="text-lg font-semibold text-white/80 mb-2">
            No Signals Yet
          </h3>
          <p className="text-muted-foreground/70 text-center max-w-sm leading-relaxed">
            Signals will appear here when whale trades over{" "}
            <span className="text-cyan-400 font-semibold">$500</span> are
            detected and analyzed by the AI swarm.
          </p>

          {/* Waiting indicator */}
          <div className="flex items-center gap-2 mt-6 px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.06]">
            <HugeiconsIcon
              icon={Wifi01Icon}
              size={16}
              className="text-cyan-400 animate-pulse"
            />
            <span className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">
              Listening for whale activity
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {signals.map((signal, index) => (
        <SignalCard
          key={signal._id}
          signal={signal as Signal}
          index={index}
          onSelect={onSignalSelect}
        />
      ))}
    </div>
  );
}
