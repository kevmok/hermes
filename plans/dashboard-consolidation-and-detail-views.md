# Dashboard Consolidation & Detail Views

**Type:** Enhancement
**Priority:** High
**Created:** 2025-12-24

---

## Overview

The current dashboard has 4 separate pages (Markets, Signals, Insights, Watchlist) that create a fragmented user experience. Users must navigate between pages to understand market opportunities, and there's no way to drill into detailed information about individual signals or markets.

This plan consolidates the dashboard experience and adds interactive detail views that let users explore signals, markets, and insights without losing context.

## Problem Statement

### Current Pain Points

1. **Navigation Confusion**: 4 pages with unclear distinctions
   - Markets: Table of Polymarket markets
   - Signals: AI consensus triggered by whale trades ($500+)
   - Insights: Scheduled AI analysis (every 30 min)
   - Watchlist: Placeholder (not implemented)

2. **No Detail Views**: Cannot click into items to see more information
   - Signal cards show summary but no way to expand
   - Market rows are not clickable
   - `SignalDetailModal` component exists but is NOT connected

3. **Limited Polymarket Integration**: Basic "Trade on Polymarket" button only
   - No detailed market stats
   - No price history visualization
   - No deep linking support

4. **Signal vs Insight Confusion**: Users don't understand the difference
   - Signals = event-driven (whale trades)
   - Insights = scheduled (every 30 min)
   - Both show AI consensus with similar UI

## Proposed Solution

### Page Structure: Keep 2 Primary Pages

After analysis, the current 4-page structure actually serves distinct purposes. However, we can simplify:

```
/dashboard/signals (PRIMARY - Home)
├── Hero stats + filters
├── Signal feed (whale-triggered AI consensus)
├── Click signal → Signal Detail Modal
│   ├── Full AI reasoning
│   ├── Model breakdown (Claude, GPT-4o, Gemini)
│   ├── Price comparison (at signal vs now)
│   ├── Related market info
│   └── Trade on Polymarket button

/dashboard/markets (SECONDARY - Browse)
├── Market table with sorting/filtering
├── Click market → Market Detail Modal
│   ├── Full market info
│   ├── Price chart (if snapshots exist)
│   ├── All signals for this market
│   ├── Volume/trading stats
│   └── Trade on Polymarket button
```

**Remove/Consolidate:**

- **Insights page**: Merge into Signals page as "Scheduled Analysis" section or tab
- **Watchlist page**: Remove from nav until implemented (schema ready, UI not)

### Core Features

#### 1. Signal Detail Modal (Wire up existing component)

Connect `SignalDetailModal` to `SignalCard` click handler:

```tsx
// signal-card.tsx
export function SignalCard({ signal, onSelect }: SignalCardProps) {
  return (
    <div
      onClick={() => onSelect?.(signal._id)}
      className="cursor-pointer ..."
    >
      {/* existing card content */}
    </div>
  )
}

// signals/index.tsx
function SignalsPage() {
  const [selectedSignalId, setSelectedSignalId] = useState<string | null>(null)

  return (
    <>
      <SignalFeed onSignalSelect={setSelectedSignalId} />
      <SignalDetailModal
        signalId={selectedSignalId}
        open={!!selectedSignalId}
        onOpenChange={(open) => !open && setSelectedSignalId(null)}
      />
    </>
  )
}
```

#### 2. Market Detail Modal (New component)

Create `/dashboard/-components/market-detail-modal.tsx`:

```tsx
interface MarketDetailModalProps {
  marketId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MarketDetailModal({ marketId, open, onOpenChange }: MarketDetailModalProps) {
  const { data: market } = useQuery(
    convexQuery(api.markets.getMarketDetail, { marketId: marketId! }),
    { enabled: !!marketId }
  )

  const { data: signals } = useQuery(
    convexQuery(api.signals.getSignalsForMarket, { marketId: marketId! }),
    { enabled: !!marketId }
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{market?.title}</DialogTitle>
          <DialogDescription>{market?.category}</DialogDescription>
        </DialogHeader>

        {/* Price & Volume Stats */}
        <div className="grid grid-cols-2 gap-4">
          <StatCard label="YES Price" value={`${(market?.currentYesPrice * 100).toFixed(0)}%`} />
          <StatCard label="24h Volume" value={formatUSD(market?.volume24h)} />
          <StatCard label="Total Volume" value={formatUSD(market?.totalVolume)} />
          <StatCard label="Status" value={market?.isActive ? 'Active' : 'Closed'} />
        </div>

        {/* Related Signals */}
        {signals?.length > 0 && (
          <div>
            <h4>AI Signals for this Market</h4>
            {signals.map(signal => (
              <MiniSignalCard key={signal._id} signal={signal} />
            ))}
          </div>
        )}

        {/* Actions */}
        <DialogFooter>
          <Button variant="outline" asChild>
            <a href={polymarketUrl} target="_blank" rel="noopener noreferrer">
              Trade on Polymarket
              <ExternalLinkIcon className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

#### 3. Make Market Table Rows Clickable

Update market-columns.tsx to support row click:

```tsx
// In markets/index.tsx
<DataTable
  columns={marketColumns}
  data={markets}
  onRowClick={(market) => setSelectedMarketId(market._id)}
/>
```

#### 4. Simplify Navigation

Update `app-sidebar.tsx`:

```tsx
const navItems = [
  { title: "Signals", url: "/dashboard/signals", icon: Activity03Icon },
  { title: "Markets", url: "/dashboard/markets", icon: ChartLineData01Icon },
  // Remove Insights and Watchlist for now
]
```

Change default redirect in `/dashboard/index.tsx`:

```tsx
redirect({ to: "/dashboard/signals" }) // Signals is now primary
```

## Technical Approach

### Backend Changes

#### New Query: `getSignalsForMarket`

```typescript
// packages/backend/convex/signals.ts
export const getSignalsForMarket = query({
  args: { marketId: v.id("markets") },
  handler: async (ctx, args) => {
    const signals = await ctx.db
      .query("signals")
      .withIndex("by_market", (q) => q.eq("marketId", args.marketId))
      .order("desc")
      .take(10)

    return signals
  },
})
```

#### New Query: `getMarketDetail`

```typescript
// packages/backend/convex/markets.ts
export const getMarketDetail = query({
  args: { marketId: v.id("markets") },
  handler: async (ctx, args) => {
    const market = await ctx.db.get(args.marketId)
    if (!market) return null

    // Get recent snapshots for mini chart
    const snapshots = await ctx.db
      .query("marketSnapshots")
      .withIndex("by_market", (q) => q.eq("marketId", args.marketId))
      .order("desc")
      .take(24) // Last 24 snapshots

    return { ...market, snapshots }
  },
})
```

### Frontend Changes

#### Files to Modify

1. **`/dashboard/signals/index.tsx`**
   - Add state for selected signal
   - Import and render `SignalDetailModal`
   - Pass `onSelect` callback to `SignalFeed`

2. **`/dashboard/signals/-components/signal-feed.tsx`**
   - Accept `onSignalSelect` prop
   - Pass to `SignalCard` components

3. **`/dashboard/signals/-components/signal-card.tsx`**
   - Add `onClick` handler
   - Accept `onSelect` prop
   - Add cursor-pointer class

4. **`/dashboard/markets/index.tsx`**
   - Add state for selected market
   - Import and render `MarketDetailModal`
   - Pass row click handler to DataTable

5. **`/dashboard/-components/app-sidebar.tsx`**
   - Remove Insights and Watchlist nav items
   - Reorder: Signals first, Markets second

6. **`/dashboard/index.tsx`**
   - Change redirect from `/dashboard/markets` to `/dashboard/signals`

#### Files to Create

1. **`/dashboard/-components/market-detail-modal.tsx`**
   - New component for market details
   - Shows stats, related signals, Polymarket link

### Migration Steps

1. Wire up existing `SignalDetailModal` (no new code needed)
2. Create `MarketDetailModal` component
3. Add backend queries (`getSignalsForMarket`, `getMarketDetail`)
4. Make signal cards and market rows clickable
5. Update sidebar navigation
6. Change default dashboard route to signals
7. Keep Insights page accessible via direct URL but remove from nav

## Acceptance Criteria

### Functional Requirements

- [ ] Clicking a signal card opens `SignalDetailModal` with full details
- [ ] Signal modal shows: AI reasoning, model breakdown, price comparison, trade button
- [ ] Clicking a market row opens `MarketDetailModal` with market info
- [ ] Market modal shows: prices, volumes, related signals, trade button
- [ ] "Trade on Polymarket" buttons open correct Polymarket URLs in new tab
- [ ] Sidebar shows Signals (primary) and Markets (secondary) only
- [ ] Default dashboard route goes to `/dashboard/signals`
- [ ] Insights page remains accessible via direct URL

### Non-Functional Requirements

- [ ] Modals open within 200ms (no visible loading delay)
- [ ] Modals are keyboard accessible (Escape to close)
- [ ] Modals work on mobile (full-screen or responsive)
- [ ] No console errors when opening/closing modals

## Success Metrics

1. **Reduced Navigation**: Users see primary content (signals) immediately
2. **Increased Engagement**: Users click into signal/market details
3. **Higher Conversion**: More clicks on "Trade on Polymarket"
4. **Clearer UX**: No confusion between Signals vs Insights

## Dependencies

- Existing `SignalDetailModal` component (needs wiring only)
- Existing `DataTable` component with row click support
- Convex backend for new queries
- shadcn/ui Dialog component (already installed)

## Risks & Mitigations

| Risk                    | Impact            | Mitigation                                     |
| ----------------------- | ----------------- | ---------------------------------------------- |
| Modal data fetch slow   | Poor UX           | Use React Query caching, show loading skeleton |
| Insights users confused | Complaints        | Keep Insights URL working, add redirect notice |
| Mobile modal issues     | Unusable on phone | Test on mobile, use Sheet for small screens    |

## Future Considerations

### Phase 2 (Not in Scope)

- **Price Charts**: Add lightweight-charts or recharts for price history
- **URL Routing**: Make modals deep-linkable (`/signals/:id`)
- **Watchlist**: Implement watchlist functionality with star icons
- **Performance Tracking**: Show signal accuracy over time
- **Global Search**: Cmd+K search across all markets/signals
- **Real-time Updates**: Auto-update modal data while open

## MVP Implementation

### signal-card.tsx (update)

```tsx
interface SignalCardProps {
  signal: Signal
  index?: number
  onSelect?: (signalId: string) => void
}

export function SignalCard({ signal, index = 0, onSelect }: SignalCardProps) {
  return (
    <div
      onClick={() => onSelect?.(signal._id)}
      className="group relative overflow-hidden rounded-xl border ... cursor-pointer"
      // ... existing styles
    >
      {/* existing card content */}
    </div>
  )
}
```

### signal-feed.tsx (update)

```tsx
interface SignalFeedProps {
  limit?: number
  onlyHighConfidence?: boolean
  decision?: "YES" | "NO" | "NO_TRADE"
  onSignalSelect?: (signalId: string) => void
}

export function SignalFeed({ ..., onSignalSelect }: SignalFeedProps) {
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
  )
}
```

### signals/index.tsx (update)

```tsx
import { useState } from "react"
import { SignalDetailModal } from "./-components/signal-detail-modal"

function SignalsPage() {
  const [selectedSignalId, setSelectedSignalId] = useState<string | null>(null)

  // ... existing code ...

  return (
    <div className="min-h-screen">
      {/* existing hero section */}

      <div className="p-6 space-y-6">
        <SignalFilters ... />
        <SignalFeed
          ...
          onSignalSelect={setSelectedSignalId}
        />
      </div>

      <SignalDetailModal
        signalId={selectedSignalId}
        open={!!selectedSignalId}
        onOpenChange={(open) => !open && setSelectedSignalId(null)}
      />
    </div>
  )
}
```

### market-detail-modal.tsx (new file)

```tsx
import { useQuery } from "@tanstack/react-query"
import { convexQuery } from "@convex-dev/react-query"
import { api } from "backend/convex/_generated/api"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { HugeiconsIcon } from "@hugeicons/react"
import { LinkSquare01Icon } from "@hugeicons/core-free-icons"

interface MarketDetailModalProps {
  marketId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MarketDetailModal({ marketId, open, onOpenChange }: MarketDetailModalProps) {
  const { data: market, isLoading } = useQuery({
    ...convexQuery(api.markets.getMarketById, { marketId: marketId! }),
    enabled: !!marketId && open,
  })

  const polymarketUrl = market?.eventSlug
    ? `https://polymarket.com/event/${market.eventSlug}`
    : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        {isLoading ? (
          <div className="space-y-4">
            <div className="h-6 w-3/4 bg-white/[0.06] rounded animate-pulse" />
            <div className="h-4 w-1/2 bg-white/[0.04] rounded animate-pulse" />
          </div>
        ) : market ? (
          <>
            <DialogHeader>
              <div className="flex items-start justify-between">
                <div>
                  <DialogTitle className="text-xl">{market.title}</DialogTitle>
                  {market.category && (
                    <DialogDescription className="mt-1">
                      <Badge variant="secondary">{market.category}</Badge>
                    </DialogDescription>
                  )}
                </div>
                <Badge variant={market.isActive ? "default" : "secondary"}>
                  {market.isActive ? "Active" : "Closed"}
                </Badge>
              </div>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">
                  YES Price
                </span>
                <p className="text-2xl font-bold text-emerald-400">
                  {(market.currentYesPrice * 100).toFixed(0)}%
                </p>
              </div>
              <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">
                  NO Price
                </span>
                <p className="text-2xl font-bold text-red-400">
                  {(market.currentNoPrice * 100).toFixed(0)}%
                </p>
              </div>
              <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">
                  24h Volume
                </span>
                <p className="text-xl font-semibold">
                  ${market.volume24h?.toLocaleString() ?? 0}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">
                  Total Volume
                </span>
                <p className="text-xl font-semibold">
                  ${market.totalVolume?.toLocaleString() ?? 0}
                </p>
              </div>
            </div>

            {market.outcome && (
              <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                <span className="text-xs text-emerald-400 uppercase tracking-wider">
                  Resolved
                </span>
                <p className="text-lg font-bold text-emerald-400">
                  Outcome: {market.outcome}
                </p>
              </div>
            )}

            <DialogFooter className="gap-2">
              {polymarketUrl && (
                <Button asChild className="flex-1">
                  <a href={polymarketUrl} target="_blank" rel="noopener noreferrer">
                    Trade on Polymarket
                    <HugeiconsIcon icon={LinkSquare01Icon} size={16} className="ml-2" />
                  </a>
                </Button>
              )}
            </DialogFooter>
          </>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            Market not found
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
```

## References

### Internal Files

- `apps/web/src/routes/dashboard/signals/-components/signal-detail-modal.tsx` - Existing modal (needs wiring)
- `apps/web/src/routes/dashboard/signals/-components/signal-card.tsx` - Card component to update
- `apps/web/src/routes/dashboard/-components/app-sidebar.tsx` - Navigation to simplify
- `packages/backend/convex/schema.ts` - Database schema reference

### External Resources

- [TanStack Router Modal Routes](https://tanstack.com/router/latest/docs/framework/react/guide/route-masking)
- [shadcn/ui Dialog](https://ui.shadcn.com/docs/components/dialog)
- [Polymarket URL Structure](https://polymarket.com/event/{eventSlug})

### Related Work

- Signal detail modal already built, just needs connection
- Frontend design skill already applied to signal cards
