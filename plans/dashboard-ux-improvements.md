# feat: Dashboard UX Improvements

## Overview

Improve the Lofn dashboard user experience by:

1. Relocating distracting performance stats to a subtle marquee banner
2. Replacing trade/signal detail drawers with full dedicated pages
3. Adding breadcrumb navigation throughout the dashboard
4. Removing unnecessary/confusing trade statistics from the trades page

## Problem Statement / Motivation

The current dashboard has several UX issues:

- **Performance stats header is distracting**: Win rate, ROI, and signal counts displayed prominently at the top of every page pulls focus away from the primary content
- **Drawer pattern limits detail view**: The current Sheet/drawer for trade/signal details constrains the amount of information visible, especially AI reasoning from multiple models
- **No breadcrumb navigation**: Users can't easily see or navigate the route hierarchy
- **Confusing stats**: "Total Trades", "Whale Trades", and volume metrics on the trades page are not clearly relevant to the AI signals - users don't understand what defines a "whale trade" or why these stats matter

## Proposed Solution

### 1. Performance Stats Marquee Banner

Replace the `PerformanceHeader` component with a subtle news ticker that scrolls performance metrics without demanding attention.

**Location**: Below the top navbar, above page content (global across all dashboard routes)

**Metrics to Display**:

- Win Rate: `XX.X%` (X/Y correct)
- Total Signals: `XXX` (X high confidence)
- Simulated ROI: `+/-X.X%`
- Last 24h: `X new` (Y this week)

**Behavior**:

- Auto-scrolls continuously at readable pace
- Pauses on hover for inspection
- Click to navigate to dedicated `/dashboard/performance` page
- Optional: User can dismiss (stored in localStorage)

### 2. Trade/Signal Detail Pages (Replace Drawer)

Convert from drawer/Sheet pattern to full dedicated pages for viewing trade/signal details.

**URL Structure**: `/dashboard/trades/$signalId` (keep existing route structure)

**Page Sections**:

1. **Hero Section**
   - Market title
   - Consensus decision badge (YES/NO/NO_TRADE)
   - Confidence level badge
   - Timestamp

2. **Consensus Visualization**
   - Horizontal agreement bar showing model consensus %
   - Model voting grid (3 cards: Claude, GPT-4o, Gemini)
   - Each card shows: model name, decision badge, confidence

3. **AI Reasoning Section**
   - Stacked cards for each model's reasoning
   - Expandable/collapsible with all expanded by default
   - Markdown-formatted reasoning text
   - Response time metadata

4. **Market Metadata**
   - Price at analysis
   - Current price (live from Convex)
   - Volume metrics
   - Event slug/link to Polymarket

### 3. Breadcrumb Navigation

Add dynamic breadcrumbs to the top navbar.

**Structure**:

- `Home > Trades` (on trades list)
- `Home > Trades > [Market Title]` (on trade/signal detail)
- `Home > Events > [Event Name]` (on event detail)
- `Home > Performance` (on performance page)

**Implementation**:

- Truncate market titles > 50 characters with tooltip
- Use TanStack Router's `useMatches()` for dynamic breadcrumb data
- Add `staticData.breadcrumb` to route definitions

### 4. Remove/Relocate Unnecessary Stats

Remove from trades page header (or relocate to dedicated page):

- ~~Total Trades~~ (WebSocket trade count - not relevant to AI signals)
- ~~Whale Trades~~ (trades >= $500 - definition unclear to users)
- ~~Total Volume~~ (sum of trade sizes - not actionable)
- ~~Whale Volume~~ (whale trade sizes - not actionable)

Replace with signal-specific metrics:

- Total Signals
- High Confidence Signals
- Signals Last 24h
- Average Consensus %

## Technical Approach

### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Dashboard Layout                             │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  Top Navbar with Breadcrumbs                                    ││
│  └─────────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  Performance Stats Marquee Banner                               ││
│  └─────────────────────────────────────────────────────────────────┘│
│  ┌─────────────┐ ┌─────────────────────────────────────────────────┐│
│  │   Sidebar   │ │  Main Content (Outlet)                         ││
│  │             │ │                                                 ││
│  │  - Trades   │ │  /trades - Table with filters                  ││
│  │  - Events   │ │  /trades/:id - Full detail page                ││
│  │  - ...      │ │  /events - Table                               ││
│  │             │ │  /performance - Stats dashboard                 ││
│  └─────────────┘ └─────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

### File Changes

#### New Files

| File                                                               | Purpose                                         |
| ------------------------------------------------------------------ | ----------------------------------------------- |
| `dashboard/-components/stats-marquee.tsx`                          | Scrolling performance stats banner              |
| `dashboard/-components/breadcrumbs.tsx`                            | Dynamic breadcrumb component                    |
| `dashboard/trades/$signalId/index.tsx`                             | Full trade/signal detail page (replaces drawer) |
| `dashboard/trades/$signalId/-components/consensus-viz.tsx`         | Consensus visualization                         |
| `dashboard/trades/$signalId/-components/model-reasoning-cards.tsx` | AI reasoning display                            |
| `dashboard/trades/$signalId/-components/market-metadata.tsx`       | Market info section                             |
| `dashboard/performance/index.tsx`                                  | Dedicated performance stats page                |

#### Modified Files

| File                             | Changes                                             |
| -------------------------------- | --------------------------------------------------- |
| `dashboard/route.tsx:27-36`      | Add breadcrumbs to header, add marquee below navbar |
| `dashboard/trades/route.tsx`     | Remove Sheet/drawer, use full page navigation       |
| `dashboard/trades/$signalId.tsx` | Convert to directory with index.tsx for full page   |

#### Files to Delete

| File                                                     | Reason                     |
| -------------------------------------------------------- | -------------------------- |
| `dashboard/-components/performance-header.tsx`           | Replaced by marquee        |
| `dashboard/trades/-components/signal-detail-content.tsx` | Content moves to full page |

### Implementation Phases

#### Phase 1: Foundation (Breadcrumbs & Navigation)

- [ ] Implement breadcrumb component
- [ ] Add breadcrumbs to dashboard header (replace static "Dashboard" text)
- [ ] Add `staticData.breadcrumb` to route definitions

#### Phase 2: Trade/Signal Detail Page

- [ ] Convert `$signalId.tsx` to `$signalId/index.tsx` directory structure
- [ ] Create full page layout (hero, consensus, reasoning, metadata sections)
- [ ] Build consensus visualization component
- [ ] Build model reasoning cards component
- [ ] Build market metadata component
- [ ] Add loading skeletons
- [ ] Remove Sheet/drawer from trades/route.tsx

#### Phase 3: Performance Stats Marquee

- [ ] Create stats marquee component with CSS animation or motion
- [ ] Add to dashboard layout (global visibility below navbar)
- [ ] Implement hover-to-pause behavior
- [ ] Add click handler to navigate to performance page
- [ ] Create `/dashboard/performance` detailed stats page
- [ ] Remove old PerformanceHeader component from trades page

#### Phase 4: Cleanup & Polish

- [ ] Update trades page header with signal-specific metrics
- [ ] Remove old stats cards (trades/whale/volume)
- [ ] Add route transitions with motion
- [ ] Mobile responsive adjustments
- [ ] Verify all breadcrumb paths work correctly

## Acceptance Criteria

### Functional Requirements

- [ ] Performance stats display in subtle scrolling marquee below navbar
- [ ] Clicking marquee navigates to `/dashboard/performance`
- [ ] Marquee pauses on hover
- [ ] Trade table rows navigate to full detail pages (not drawer)
- [ ] Trade detail page shows all AI model reasoning expanded
- [ ] Trade detail page shows consensus visualization with bars/charts
- [ ] Breadcrumbs display current location in route hierarchy
- [ ] Breadcrumb links navigate to parent routes
- [ ] Trades page header shows signal-specific metrics only
- [ ] Old confusing stats (total trades/whale/volume) are removed or relocated

### Non-Functional Requirements

- [ ] Page transitions feel smooth (no jarring flashes)
- [ ] Detail page loads within 500ms on fast connection
- [ ] Marquee animation is 60fps smooth
- [ ] Mobile: Marquee is readable (single line, appropriate speed)
- [ ] Mobile: Detail page is scrollable with all content accessible
- [ ] Breadcrumbs truncate gracefully on mobile

### Quality Gates

- [ ] All existing routes continue to work
- [ ] Type checking passes (`bun run check-types`)
- [ ] No console errors in development
- [ ] Accessibility: Breadcrumbs have proper ARIA labels

## Success Metrics

- Users can find trade/signal details faster (full info on one page, no drawer constraints)
- Performance stats are visible without being distracting
- Navigation is clear with breadcrumb trail
- Trades page is cleaner without confusing WebSocket stats

## Dependencies & Prerequisites

- TanStack Router file-based routing (already in place)
- Convex queries for signal data (already in place)
- shadcn/ui components (already installed)
- Performance metrics query exists at `api.performanceMetrics.getPerformanceStats`

## Risk Analysis & Mitigation

| Risk                                 | Impact | Mitigation                                         |
| ------------------------------------ | ------ | -------------------------------------------------- |
| Mobile UX regression (drawer → page) | Medium | Test thoroughly, consider keeping drawer on mobile |
| Marquee animation jank               | Low    | Use CSS transforms, GPU acceleration               |
| Large reasoning text overflow        | Low    | Add max-height with "read more" expand             |

## Future Considerations

- Add performance history charts to `/dashboard/performance`
- Allow users to hide marquee permanently (localStorage preference)
- Add keyboard shortcuts for navigating trades (j/k for next/prev)
- Consider tabbed interface for model reasoning on mobile

## References & Research

### Internal References

- Current signal detail drawer: `dashboard/trades/$signalId.tsx`
- Current performance header: `dashboard/-components/performance-header.tsx`
- Sidebar navigation: `dashboard/-components/app-sidebar.tsx:35-46`
- Performance metrics query: `packages/backend/convex/performanceMetrics.ts:6-150`

### External References

- [TanStack Router File-Based Routing](https://tanstack.com/router/latest/docs/framework/react/guide/file-based-routing)
- [shadcn/ui Breadcrumb](https://ui.shadcn.com/docs/components/breadcrumb)
- [shadcn/ui Charts](https://ui.shadcn.com/docs/components/chart)
- [react-ticker for Marquee](https://www.npmjs.com/package/react-ticker)
- [Motion for Animations](https://motion.dev/docs/react)

### Best Practices Applied

- Progressive disclosure for AI reasoning (expandable cards)
- Subtle ambient information display (marquee vs prominent header)
- Consistent navigation patterns (breadcrumbs)
- Clear information hierarchy in detail pages

---

## Questions Requiring Clarification

Before implementation, these decisions need confirmation:

1. **Mobile Behavior**: Should mobile devices keep the drawer pattern for trade details, or also use full pages?

2. **Marquee Dismissibility**: Should users be able to permanently hide the performance stats marquee?

3. **Table State Persistence**: When navigating from trades list → detail → back, should filters/sort persist?

4. **Consensus Visualization Style**: Preferred style - horizontal bars, radial gauge, or model voting cards?

---

## MVP Implementation

### dashboard/-components/stats-marquee.tsx

```tsx
import { useQuery } from 'convex/react';
import { api } from '@lofn/backend/convex/_generated/api';
import { Link } from '@tanstack/react-router';
import { motion } from 'motion/react';

export function StatsMarquee() {
  const stats = useQuery(api.performanceMetrics.getPerformanceStats, {});

  if (!stats) return null;

  return (
    <Link to="/dashboard/performance" className="block">
      <div className="h-8 bg-muted/30 border-b overflow-hidden group">
        <motion.div
          className="flex gap-8 px-4 h-full items-center whitespace-nowrap"
          animate={{ x: ['0%', '-50%'] }}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
          whileHover={{ animationPlayState: 'paused' }}
        >
          {/* Content duplicated for seamless loop */}
          {[0, 1].map((i) => (
            <div key={i} className="flex gap-8">
              <StatItem label="Win Rate" value={`${stats.winRate.toFixed(1)}%`} />
              <StatItem label="Total Signals" value={stats.totalSignals} />
              <StatItem label="Simulated ROI" value={`${stats.simulatedROI > 0 ? '+' : ''}${stats.simulatedROI.toFixed(1)}%`} />
              <StatItem label="Last 24h" value={stats.signalsLast24h} />
            </div>
          ))}
        </motion.div>
      </div>
    </Link>
  );
}

function StatItem({ label, value }: { label: string; value: string | number }) {
  return (
    <span className="text-sm text-muted-foreground">
      {label}: <span className="text-foreground font-medium">{value}</span>
    </span>
  );
}
```

### dashboard/-components/breadcrumbs.tsx

```tsx
import { useMatches, Link } from '@tanstack/react-router';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

export function DashboardBreadcrumbs() {
  const matches = useMatches();

  // Filter to dashboard routes and build breadcrumb items
  const breadcrumbs = matches
    .filter((match) => match.pathname.startsWith('/dashboard'))
    .map((match) => ({
      path: match.pathname,
      label: match.staticData?.breadcrumb || getDefaultLabel(match.pathname),
    }));

  if (breadcrumbs.length <= 1) return null;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;
          return (
            <BreadcrumbItem key={crumb.path}>
              {isLast ? (
                <BreadcrumbPage className="max-w-[200px] truncate">
                  {crumb.label}
                </BreadcrumbPage>
              ) : (
                <>
                  <BreadcrumbLink asChild>
                    <Link to={crumb.path}>{crumb.label}</Link>
                  </BreadcrumbLink>
                  <BreadcrumbSeparator />
                </>
              )}
            </BreadcrumbItem>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

function getDefaultLabel(pathname: string): string {
  const segment = pathname.split('/').pop() || '';
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}
```

### dashboard/trades/$signalId/index.tsx

```tsx
import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { api } from '@lofn/backend/convex/_generated/api';
import { ConsensusViz } from './-components/consensus-viz';
import { ModelReasoningCards } from './-components/model-reasoning-cards';
import { MarketMetadata } from './-components/market-metadata';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/dashboard/trades/$signalId')({
  staticData: {
    breadcrumb: 'Trade Details',
  },
  component: TradeDetailPage,
});

function TradeDetailPage() {
  const { signalId } = Route.useParams();
  const signal = useQuery(api.signals.getById, { id: signalId as any });
  const predictions = useQuery(
    api.modelPredictions.getByInsight,
    signal ? { insightId: signal._id } : 'skip'
  );

  if (!signal) {
    return <TradeDetailSkeleton />;
  }

  return (
    <div className="container mx-auto py-6 space-y-8">
      {/* Back link */}
      <Button variant="ghost" asChild>
        <Link to="/dashboard/trades">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Trades
        </Link>
      </Button>

      {/* Hero Section */}
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">{signal.marketTitle}</h1>
        <div className="flex gap-2">
          <Badge variant={signal.consensusDecision === 'YES' ? 'default' : 'destructive'}>
            {signal.consensusDecision}
          </Badge>
          <Badge variant="outline">{signal.confidenceLevel} confidence</Badge>
          <Badge variant="secondary">{signal.consensusPercentage}% consensus</Badge>
        </div>
      </div>

      {/* Consensus Visualization */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Model Consensus</h2>
        <ConsensusViz
          decision={signal.consensusDecision}
          percentage={signal.consensusPercentage}
          predictions={predictions || []}
        />
      </section>

      {/* AI Reasoning */}
      <section>
        <h2 className="text-lg font-semibold mb-4">AI Analysis</h2>
        <ModelReasoningCards predictions={predictions || []} />
      </section>

      {/* Market Metadata */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Market Details</h2>
        <MarketMetadata
          priceAtAnalysis={signal.priceAtAnalysis}
          eventSlug={signal.eventSlug}
          analyzedAt={signal._creationTime}
        />
      </section>
    </div>
  );
}

function TradeDetailSkeleton() {
  return (
    <div className="container mx-auto py-6 space-y-8">
      <Skeleton className="h-10 w-32" />
      <div className="space-y-4">
        <Skeleton className="h-8 w-96" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-20" />
        </div>
      </div>
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
```

### dashboard/trades/$signalId/-components/consensus-viz.tsx

```tsx
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface Prediction {
  modelName: string;
  decision: 'YES' | 'NO' | 'NO_TRADE';
  confidence?: number;
}

interface ConsensusVizProps {
  decision: 'YES' | 'NO' | 'NO_TRADE';
  percentage: number;
  predictions: Prediction[];
}

export function ConsensusViz({ decision, percentage, predictions }: ConsensusVizProps) {
  return (
    <div className="space-y-6">
      {/* Agreement Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>
            {predictions.filter((p) => p.decision === decision).length}/{predictions.length} models
            agree: <span className="font-medium">{decision}</span>
          </span>
          <span>{percentage}%</span>
        </div>
        <Progress
          value={percentage}
          className={cn(
            'h-3',
            decision === 'YES' && '[&>div]:bg-green-500',
            decision === 'NO' && '[&>div]:bg-red-500',
            decision === 'NO_TRADE' && '[&>div]:bg-muted-foreground'
          )}
        />
      </div>

      {/* Model Voting Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {predictions.map((pred) => (
          <Card
            key={pred.modelName}
            className={cn(
              'border-2',
              pred.decision === 'YES' && 'border-green-500/50 bg-green-500/5',
              pred.decision === 'NO' && 'border-red-500/50 bg-red-500/5',
              pred.decision === 'NO_TRADE' && 'border-muted'
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{formatModelName(pred.modelName)}</span>
                <Badge
                  variant={
                    pred.decision === 'YES'
                      ? 'default'
                      : pred.decision === 'NO'
                        ? 'destructive'
                        : 'secondary'
                  }
                >
                  {pred.decision}
                </Badge>
              </div>
              {pred.confidence && (
                <span className="text-xs text-muted-foreground">
                  {pred.confidence}% confidence
                </span>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function formatModelName(name: string): string {
  const names: Record<string, string> = {
    'claude-sonnet-4': 'Claude',
    'gpt-4o': 'GPT-4o',
    'gemini-1.5-pro': 'Gemini',
  };
  return names[name] || name;
}
```

### dashboard/trades/$signalId/-components/model-reasoning-cards.tsx

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface Prediction {
  modelName: string;
  decision: 'YES' | 'NO' | 'NO_TRADE';
  reasoning: string;
  responseTimeMs?: number;
  confidence?: number;
}

interface ModelReasoningCardsProps {
  predictions: Prediction[];
}

export function ModelReasoningCards({ predictions }: ModelReasoningCardsProps) {
  return (
    <div className="space-y-4">
      {predictions.map((pred) => (
        <ReasoningCard key={pred.modelName} prediction={pred} />
      ))}
    </div>
  );
}

function ReasoningCard({ prediction }: { prediction: Prediction }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle className="text-base">
                  {formatModelName(prediction.modelName)}
                </CardTitle>
                <Badge
                  variant={
                    prediction.decision === 'YES'
                      ? 'default'
                      : prediction.decision === 'NO'
                        ? 'destructive'
                        : 'secondary'
                  }
                >
                  {prediction.decision}
                </Badge>
              </div>
              <ChevronDown
                className={cn(
                  'h-4 w-4 transition-transform',
                  isOpen && 'rotate-180'
                )}
              />
            </div>
            {prediction.responseTimeMs && (
              <p className="text-xs text-muted-foreground">
                Response time: {prediction.responseTimeMs}ms
              </p>
            )}
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="whitespace-pre-wrap">{prediction.reasoning}</p>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function formatModelName(name: string): string {
  const names: Record<string, string> = {
    'claude-sonnet-4': 'Claude Sonnet 4',
    'gpt-4o': 'GPT-4o',
    'gemini-1.5-pro': 'Gemini 1.5 Pro',
  };
  return names[name] || name;
}
```

### dashboard/trades/$signalId/-components/market-metadata.tsx

```tsx
import { Card, CardContent } from '@/components/ui/card';
import { ExternalLink } from 'lucide-react';

interface MarketMetadataProps {
  priceAtAnalysis: number;
  eventSlug: string;
  analyzedAt: number;
}

export function MarketMetadata({
  priceAtAnalysis,
  eventSlug,
  analyzedAt,
}: MarketMetadataProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <dt className="text-sm text-muted-foreground">Price at Analysis</dt>
            <dd className="text-2xl font-bold tabular-nums">
              {(priceAtAnalysis * 100).toFixed(1)}%
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Analyzed</dt>
            <dd className="text-lg font-medium">
              {new Date(analyzedAt).toLocaleDateString()}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-sm text-muted-foreground">Market Link</dt>
            <dd>
              <a
                href={`https://polymarket.com/event/${eventSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                View on Polymarket
                <ExternalLink className="h-3 w-3" />
              </a>
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
```
