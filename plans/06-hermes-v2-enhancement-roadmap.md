# Hermes V2 Enhancement Roadmap

**Created:** 2025-12-31
**Status:** Planning
**Target:** Award-Winning Prediction Market Intelligence SaaS

---

## Executive Summary

This document outlines the technical specifications for transforming Hermes from a functional MVP into a compelling, monetizable SaaS product. The plan is divided into 4 phases over 8 weeks, prioritizing features that deliver immediate user value while controlling AI costs.

### Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Email Provider | Resend via `@convex-dev/resend` | Official Convex component, exactly-once delivery |
| Deep Dive AI | Perplexity `sonar-reasoning-pro` | Best cost/quality for web research |
| Trial Length | 7 days | Creates urgency, sufficient to demonstrate value |
| Free Tier | None | AI costs prohibitive; trial-based model |
| Whale Addresses | Not anonymized | Full transparency for power users |

---

## Phase 1: Foundation Hardening (Weeks 1-2)

### 1.1 Email Alert System

#### Overview
Implement real-time email alerts for high-confidence signals using Resend with the official Convex component.

#### Schema Additions

```typescript
// packages/backend/convex/schema.ts

// User notification preferences
userPreferences: defineTable({
  userId: v.id('user'),
  
  // Email settings
  emailAlerts: v.boolean(),
  alertThreshold: v.union(
    v.literal('high'),      // 80%+ consensus only
    v.literal('medium'),    // 60%+ consensus
    v.literal('all')        // All signals
  ),
  categories: v.array(v.string()), // Empty = all categories
  
  // Digest settings
  digestFrequency: v.union(
    v.literal('instant'),   // Real-time alerts
    v.literal('daily'),     // Daily digest at preferred time
    v.literal('weekly')     // Weekly summary
  ),
  digestHourUTC: v.number(), // 0-23, hour to send daily digest
  timezone: v.string(),      // e.g., 'America/New_York'
  
  // Timestamps
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index('by_user', ['userId'])
  .index('by_digest', ['digestFrequency', 'digestHourUTC']),

// Track sent alerts to prevent duplicates
alertLog: defineTable({
  userId: v.id('user'),
  signalId: v.id('signals'),
  channel: v.union(v.literal('email'), v.literal('digest')),
  sentAt: v.number(),
  opened: v.optional(v.boolean()),
  clicked: v.optional(v.boolean()),
})
  .index('by_user', ['userId', 'sentAt'])
  .index('by_signal', ['signalId'])
  .index('by_user_signal', ['userId', 'signalId']),
```

#### Backend Implementation

**File: `packages/backend/convex/notifications/email.ts`**

```typescript
import { v } from 'convex/values';
import { internalAction, internalMutation, internalQuery } from '../_generated/server';
import { internal } from '../_generated/api';
import { Resend } from '@convex-dev/resend';
import { components } from '../_generated/api';

const resend = new Resend(components.resend);

// ============ SEND INSTANT ALERT ============

export const sendSignalAlert = internalAction({
  args: {
    signalId: v.id('signals'),
  },
  returns: v.object({ sent: v.number(), skipped: v.number() }),
  handler: async (ctx, args): Promise<{ sent: number; skipped: number }> => {
    // Get signal with market data
    const signal = await ctx.runQuery(internal.signals.getSignalWithPredictions, {
      signalId: args.signalId,
    });
    
    if (!signal) return { sent: 0, skipped: 0 };
    
    // Get users who want instant alerts for this signal type
    const eligibleUsers = await ctx.runQuery(
      internal.notifications.email.getEligibleUsersForAlert,
      {
        consensusPercentage: signal.consensusPercentage,
        category: signal.market?.eventSlug?.split('-')[0] ?? 'general',
      }
    );
    
    let sent = 0;
    let skipped = 0;
    
    for (const user of eligibleUsers) {
      // Check if already sent
      const alreadySent = await ctx.runQuery(
        internal.notifications.email.hasAlertBeenSent,
        { userId: user._id, signalId: args.signalId }
      );
      
      if (alreadySent) {
        skipped++;
        continue;
      }
      
      // Send email
      try {
        await resend.send(ctx, {
          from: 'Hermes Alerts <alerts@hermes.trading>',
          to: [user.email],
          subject: `${signal.consensusDecision} Signal: ${signal.market?.title?.slice(0, 50)}...`,
          html: buildSignalAlertHtml(signal),
        });
        
        // Log the alert
        await ctx.runMutation(internal.notifications.email.logAlert, {
          userId: user._id,
          signalId: args.signalId,
          channel: 'email',
        });
        
        sent++;
      } catch (error) {
        console.error(`Failed to send alert to ${user.email}:`, error);
      }
    }
    
    return { sent, skipped };
  },
});

// ============ DAILY DIGEST ============

export const sendDailyDigest = internalAction({
  args: {
    hourUTC: v.number(),
  },
  returns: v.object({ sent: v.number() }),
  handler: async (ctx, args): Promise<{ sent: number }> => {
    // Get users who want daily digest at this hour
    const users = await ctx.runQuery(
      internal.notifications.email.getUsersForDigest,
      { frequency: 'daily', hourUTC: args.hourUTC }
    );
    
    // Get signals from last 24 hours
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const signals = await ctx.runQuery(internal.signals.getSignalsSince, {
      since: oneDayAgo,
      limit: 10,
    });
    
    if (signals.length === 0) return { sent: 0 };
    
    // Get platform stats
    const stats = await ctx.runQuery(internal.performanceMetrics.getPerformanceStats, {});
    
    let sent = 0;
    
    for (const user of users) {
      try {
        await resend.send(ctx, {
          from: 'Hermes <digest@hermes.trading>',
          to: [user.email],
          subject: `Daily Signal Digest: ${signals.length} New Signals`,
          html: buildDailyDigestHtml(signals, stats, user),
        });
        sent++;
      } catch (error) {
        console.error(`Failed to send digest to ${user.email}:`, error);
      }
    }
    
    return { sent };
  },
});

// ============ HELPER QUERIES ============

export const getEligibleUsersForAlert = internalQuery({
  args: {
    consensusPercentage: v.number(),
    category: v.string(),
  },
  handler: async (ctx, args) => {
    const prefs = await ctx.db.query('userPreferences')
      .filter((q) => 
        q.and(
          q.eq(q.field('emailAlerts'), true),
          q.eq(q.field('digestFrequency'), 'instant')
        )
      )
      .collect();
    
    // Filter by threshold and category
    const eligiblePrefs = prefs.filter((pref) => {
      // Check threshold
      const meetsThreshold = 
        pref.alertThreshold === 'all' ||
        (pref.alertThreshold === 'medium' && args.consensusPercentage >= 60) ||
        (pref.alertThreshold === 'high' && args.consensusPercentage >= 80);
      
      // Check category (empty = all)
      const meetsCategory = 
        pref.categories.length === 0 ||
        pref.categories.includes(args.category);
      
      return meetsThreshold && meetsCategory;
    });
    
    // Get user emails
    const users = await Promise.all(
      eligiblePrefs.map(async (pref) => {
        const user = await ctx.db.get(pref.userId);
        return user ? { ...pref, email: user.email, _id: pref.userId } : null;
      })
    );
    
    return users.filter((u): u is NonNullable<typeof u> => u !== null);
  },
});

export const hasAlertBeenSent = internalQuery({
  args: {
    userId: v.id('user'),
    signalId: v.id('signals'),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query('alertLog')
      .withIndex('by_user_signal', (q) => 
        q.eq('userId', args.userId).eq('signalId', args.signalId)
      )
      .first();
    return existing !== null;
  },
});

export const logAlert = internalMutation({
  args: {
    userId: v.id('user'),
    signalId: v.id('signals'),
    channel: v.union(v.literal('email'), v.literal('digest')),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('alertLog', {
      userId: args.userId,
      signalId: args.signalId,
      channel: args.channel,
      sentAt: Date.now(),
    });
  },
});

// ============ HTML BUILDERS ============

function buildSignalAlertHtml(signal: any): string {
  const decisionColor = signal.consensusDecision === 'YES' ? '#10b981' : 
                        signal.consensusDecision === 'NO' ? '#ef4444' : '#f59e0b';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #0d9488 0%, #059669 100%); padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f8fafc; padding: 20px; border-radius: 0 0 8px 8px; }
        .decision { display: inline-block; padding: 8px 16px; border-radius: 6px; font-weight: bold; color: white; }
        .cta { display: inline-block; background: #0d9488; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="color: white; margin: 0;">New Signal Alert</h1>
        </div>
        <div class="content">
          <h2 style="margin-top: 0;">${signal.market?.title ?? 'Unknown Market'}</h2>
          
          <p>
            <span class="decision" style="background: ${decisionColor};">
              ${signal.consensusDecision}
            </span>
            <span style="margin-left: 12px; color: #64748b;">
              ${signal.consensusPercentage.toFixed(0)}% consensus
            </span>
          </p>
          
          <p style="color: #475569;">${signal.aggregatedReasoning?.slice(0, 200)}...</p>
          
          ${signal.aggregatedKeyFactors?.length ? `
            <h4 style="margin-bottom: 8px;">Key Factors:</h4>
            <ul style="color: #475569; margin-top: 0;">
              ${signal.aggregatedKeyFactors.slice(0, 3).map((f: string) => `<li>${f}</li>`).join('')}
            </ul>
          ` : ''}
          
          <a href="https://hermes.trading/dashboard/trades/${signal._id}" class="cta">
            View Full Analysis
          </a>
          
          <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">
            You're receiving this because you enabled instant alerts for ${signal.confidenceLevel} confidence signals.
            <a href="https://hermes.trading/dashboard/settings">Manage preferences</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function buildDailyDigestHtml(signals: any[], stats: any, user: any): string {
  // Implementation similar to above but for digest format
  return `<!DOCTYPE html>...`; // Abbreviated for space
}
```

**File: `packages/backend/convex/crons.ts` (additions)**

```typescript
// Add to existing crons.ts

// Send daily digests at each hour
for (let hour = 0; hour < 24; hour++) {
  crons.hourly(
    `Daily digest (${hour} UTC)`,
    { minuteUTC: 0 },
    internal.notifications.email.sendDailyDigest,
    { hourUTC: hour }
  );
}

// Weekly digest every Monday at 9 AM UTC
crons.weekly(
  'Weekly digest',
  { dayOfWeek: 'monday', hourUTC: 9, minuteUTC: 0 },
  internal.notifications.email.sendWeeklyDigest,
  {}
);
```

#### Frontend Implementation

**File: `apps/web/src/routes/dashboard/settings/index.tsx` (additions)**

Add notification preferences section:

```tsx
// Add to existing settings page

function NotificationSettings() {
  const preferences = useQuery(convexQuery(api.userPreferences.get, {}));
  const updatePreferences = useMutation(api.userPreferences.update);
  
  const [emailAlerts, setEmailAlerts] = useState(preferences?.emailAlerts ?? true);
  const [threshold, setThreshold] = useState(preferences?.alertThreshold ?? 'high');
  const [frequency, setFrequency] = useState(preferences?.digestFrequency ?? 'instant');
  
  const handleSave = async () => {
    await updatePreferences({
      emailAlerts,
      alertThreshold: threshold,
      digestFrequency: frequency,
    });
    toast.success('Preferences saved');
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Notifications</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Email toggle */}
        <div className="flex items-center justify-between">
          <div>
            <Label>Email Alerts</Label>
            <p className="text-sm text-muted-foreground">
              Receive email notifications for new signals
            </p>
          </div>
          <Switch checked={emailAlerts} onCheckedChange={setEmailAlerts} />
        </div>
        
        {/* Threshold selector */}
        <div className="space-y-2">
          <Label>Alert Threshold</Label>
          <Select value={threshold} onValueChange={setThreshold}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="high">High confidence only (80%+)</SelectItem>
              <SelectItem value="medium">Medium+ confidence (60%+)</SelectItem>
              <SelectItem value="all">All signals</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Frequency selector */}
        <div className="space-y-2">
          <Label>Notification Frequency</Label>
          <Select value={frequency} onValueChange={setFrequency}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="instant">Instant (real-time)</SelectItem>
              <SelectItem value="daily">Daily digest</SelectItem>
              <SelectItem value="weekly">Weekly summary</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Button onClick={handleSave}>Save Preferences</Button>
      </CardContent>
    </Card>
  );
}
```

#### Environment Variables

Add to Convex dashboard:
```
RESEND_API_KEY=re_xxxxxxxxxxxx
```

#### Package Installation

```bash
cd packages/backend
bun add @convex-dev/resend
```

Update `convex/convex.config.ts`:
```typescript
import { defineApp } from "convex/server";
import resend from "@convex-dev/resend/convex.config";

const app = defineApp();
app.use(resend);
export default app;
```

---

### 1.2 Signal Quality Enhancements

#### Schema Additions

```typescript
// Add to signals table in schema.ts

signals: defineTable({
  // ... existing fields ...
  
  // NEW: Quality metrics
  edgeScore: v.optional(v.number()),        // (AI_prob - market_price) * consensus%
  marketCategory: v.optional(v.string()),    // politics, crypto, sports, etc.
  estimatedResolutionDate: v.optional(v.number()), // Unix timestamp
  
  // NEW: Price movement tracking
  priceAtSignal: v.number(),                // Same as priceAtTrigger, renamed for clarity
  currentPrice: v.optional(v.number()),      // Updated periodically
  priceChange: v.optional(v.number()),       // Percentage change since signal
})
```

#### Edge Score Calculation

**File: `packages/backend/convex/signals.ts` (modify createSignal)**

```typescript
export const createSignal = internalMutation({
  args: {
    // ... existing args ...
  },
  handler: async (ctx, args): Promise<Id<'signals'>> => {
    // Calculate edge score
    // Edge = (predicted probability - market price) * consensus strength
    const predictedProbability = args.consensusDecision === 'YES' 
      ? (100 - args.priceAtTrigger * 100) / 100  // If YES, edge is how underpriced YES is
      : args.priceAtTrigger;                      // If NO, edge is how overpriced YES is
    
    const edgeScore = Math.abs(predictedProbability - args.priceAtTrigger) 
                      * (args.consensusPercentage / 100);
    
    // Derive category from event slug
    const marketCategory = deriveCategory(args.eventSlug);
    
    return await ctx.db.insert('signals', {
      // ... existing fields ...
      edgeScore,
      marketCategory,
    });
  },
});

function deriveCategory(eventSlug: string): string {
  const slug = eventSlug.toLowerCase();
  
  if (slug.includes('trump') || slug.includes('biden') || slug.includes('election') || 
      slug.includes('congress') || slug.includes('senate')) {
    return 'politics';
  }
  if (slug.includes('bitcoin') || slug.includes('eth') || slug.includes('crypto') ||
      slug.includes('token')) {
    return 'crypto';
  }
  if (slug.includes('nfl') || slug.includes('nba') || slug.includes('mlb') ||
      slug.includes('soccer') || slug.includes('sports')) {
    return 'sports';
  }
  if (slug.includes('fed') || slug.includes('rate') || slug.includes('inflation') ||
      slug.includes('gdp') || slug.includes('economy')) {
    return 'economics';
  }
  if (slug.includes('ai') || slug.includes('tech') || slug.includes('apple') ||
      slug.includes('google') || slug.includes('meta')) {
    return 'tech';
  }
  
  return 'general';
}
```

---

### 1.3 Performance Dashboard Upgrades

#### New Query: Equity Curve Data

**File: `packages/backend/convex/performanceMetrics.ts` (additions)**

```typescript
export const getEquityCurve = query({
  args: {
    startingCapital: v.optional(v.number()),
    betSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const startingCapital = args.startingCapital ?? 1000;
    const betSize = args.betSize ?? 100;
    
    // Get all signals with outcomes, ordered by time
    const signals = await ctx.db
      .query('signals')
      .withIndex('by_timestamp')
      .order('asc')
      .collect();
    
    // Get resolved markets
    const resolvedMarkets = await ctx.db
      .query('markets')
      .withIndex('by_resolved')
      .filter((q) => q.neq(q.field('outcome'), undefined))
      .collect();
    
    const resolvedMap = new Map<string, { outcome: string; resolvedAt: number }>();
    for (const market of resolvedMarkets) {
      if (market.outcome) {
        resolvedMap.set(market._id, { 
          outcome: market.outcome, 
          resolvedAt: market.resolvedAt ?? Date.now() 
        });
      }
    }
    
    // Build equity curve
    let balance = startingCapital;
    const curve: Array<{
      date: string;
      balance: number;
      signal: string;
      result: 'win' | 'loss' | 'pending';
    }> = [{ date: new Date().toISOString().split('T')[0], balance: startingCapital, signal: 'start', result: 'pending' }];
    
    for (const signal of signals) {
      if (signal.consensusDecision === 'NO_TRADE') continue;
      
      const resolved = resolvedMap.get(signal.marketId);
      if (!resolved || resolved.outcome === 'INVALID') continue;
      
      const isWin = signal.consensusDecision === resolved.outcome;
      const pnl = isWin ? betSize : -betSize;
      balance += pnl;
      
      curve.push({
        date: new Date(resolved.resolvedAt).toISOString().split('T')[0],
        balance,
        signal: signal._id,
        result: isWin ? 'win' : 'loss',
      });
    }
    
    return {
      curve,
      finalBalance: balance,
      totalReturn: ((balance - startingCapital) / startingCapital) * 100,
      maxDrawdown: calculateMaxDrawdown(curve.map(c => c.balance)),
    };
  },
});

function calculateMaxDrawdown(balances: number[]): number {
  let maxDrawdown = 0;
  let peak = balances[0];
  
  for (const balance of balances) {
    if (balance > peak) peak = balance;
    const drawdown = (peak - balance) / peak;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }
  
  return maxDrawdown * 100;
}

export const getCategoryAccuracy = query({
  args: {},
  handler: async (ctx) => {
    const signals = await ctx.db.query('signals').collect();
    
    const resolvedMarkets = await ctx.db
      .query('markets')
      .withIndex('by_resolved')
      .filter((q) => q.neq(q.field('outcome'), undefined))
      .collect();
    
    const resolvedMap = new Map<string, string>();
    for (const market of resolvedMarkets) {
      if (market.outcome && market.outcome !== 'INVALID') {
        resolvedMap.set(market._id, market.outcome);
      }
    }
    
    const categoryStats = new Map<string, { total: number; correct: number }>();
    
    for (const signal of signals) {
      if (signal.consensusDecision === 'NO_TRADE') continue;
      
      const category = signal.marketCategory ?? 'general';
      const outcome = resolvedMap.get(signal.marketId);
      
      if (!categoryStats.has(category)) {
        categoryStats.set(category, { total: 0, correct: 0 });
      }
      
      const stats = categoryStats.get(category)!;
      
      if (outcome) {
        stats.total++;
        if (signal.consensusDecision === outcome) {
          stats.correct++;
        }
      }
    }
    
    return Array.from(categoryStats.entries()).map(([category, stats]) => ({
      category,
      total: stats.total,
      correct: stats.correct,
      winRate: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
    })).sort((a, b) => b.total - a.total);
  },
});
```

---

## Phase 2: Portfolio Intelligence (Weeks 3-4)

### 2.1 Portfolio Connection

#### Schema Additions

```typescript
// packages/backend/convex/schema.ts

userPortfolio: defineTable({
  userId: v.id('user'),
  polymarketAddress: v.string(),    // 0x-prefixed wallet address
  nickname: v.optional(v.string()), // User-friendly name
  addedAt: v.number(),
  lastSyncedAt: v.optional(v.number()),
  lastSyncStatus: v.optional(v.union(
    v.literal('success'),
    v.literal('failed'),
    v.literal('no_positions')
  )),
})
  .index('by_user', ['userId'])
  .index('by_address', ['polymarketAddress']),
```

#### Backend Implementation

**File: `packages/backend/convex/portfolio.ts`**

```typescript
import { v } from 'convex/values';
import { query, mutation, internalAction } from './_generated/server';
import { internal } from './_generated/api';
import { api as polymarketApi } from './polymarket/client';
import type { Position } from './polymarket/schemas';

// ============ MUTATIONS ============

export const addPortfolio = mutation({
  args: {
    polymarketAddress: v.string(),
    nickname: v.optional(v.string()),
  },
  returns: v.id('userPortfolio'),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');
    
    const user = await ctx.db
      .query('user')
      .withIndex('userId', (q) => q.eq('userId', identity.subject))
      .first();
    
    if (!user) throw new Error('User not found');
    
    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(args.polymarketAddress)) {
      throw new Error('Invalid Ethereum address format');
    }
    
    // Check if already added
    const existing = await ctx.db
      .query('userPortfolio')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .filter((q) => q.eq(q.field('polymarketAddress'), args.polymarketAddress.toLowerCase()))
      .first();
    
    if (existing) {
      throw new Error('This address is already added to your portfolio');
    }
    
    return await ctx.db.insert('userPortfolio', {
      userId: user._id,
      polymarketAddress: args.polymarketAddress.toLowerCase(),
      nickname: args.nickname,
      addedAt: Date.now(),
    });
  },
});

export const removePortfolio = mutation({
  args: {
    portfolioId: v.id('userPortfolio'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');
    
    const portfolio = await ctx.db.get(args.portfolioId);
    if (!portfolio) throw new Error('Portfolio not found');
    
    const user = await ctx.db
      .query('user')
      .withIndex('userId', (q) => q.eq('userId', identity.subject))
      .first();
    
    if (!user || portfolio.userId !== user._id) {
      throw new Error('Not authorized');
    }
    
    await ctx.db.delete(args.portfolioId);
  },
});

// ============ QUERIES ============

export const getMyPortfolios = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    
    const user = await ctx.db
      .query('user')
      .withIndex('userId', (q) => q.eq('userId', identity.subject))
      .first();
    
    if (!user) return [];
    
    return await ctx.db
      .query('userPortfolio')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();
  },
});

// ============ ACTIONS (External API calls) ============

export const fetchPositions = internalAction({
  args: {
    address: v.string(),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args): Promise<Position[]> => {
    try {
      const positions = await polymarketApi.getUserPositions(args.address, {
        limit: 100,
        sortBy: 'CURRENT',
        sortDirection: 'DESC',
      });
      return positions;
    } catch (error) {
      console.error('Failed to fetch positions:', error);
      return [];
    }
  },
});

// ============ POSITION WITH SIGNAL ALIGNMENT ============

export const getPositionsWithSignalAlignment = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { positions: [], portfolios: [] };
    
    const user = await ctx.db
      .query('user')
      .withIndex('userId', (q) => q.eq('userId', identity.subject))
      .first();
    
    if (!user) return { positions: [], portfolios: [] };
    
    const portfolios = await ctx.db
      .query('userPortfolio')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();
    
    // Note: Actual position fetching must be done via action, not query
    // This query returns portfolio metadata; frontend calls action for live positions
    return { portfolios };
  },
});
```

**File: `packages/backend/convex/portfolio.ts` (continued - action for live data)**

```typescript
// This action fetches live positions and matches with our signals
export const syncPortfolioWithSignals = internalAction({
  args: {
    address: v.string(),
  },
  returns: v.array(v.object({
    position: v.any(),
    signal: v.optional(v.any()),
    alignment: v.union(
      v.literal('aligned'),
      v.literal('opposed'),
      v.literal('no_signal')
    ),
  })),
  handler: async (ctx, args) => {
    // Fetch live positions from Polymarket
    const positions = await polymarketApi.getUserPositions(args.address, {
      limit: 100,
    });
    
    // Get our signals for these markets
    const conditionIds = positions.map(p => p.conditionId);
    const markets = await ctx.runQuery(internal.markets.getMarketsByConditionIds, {
      conditionIds,
    });
    
    const marketMap = new Map(markets.map(m => [m.conditionId, m]));
    
    const results = await Promise.all(positions.map(async (position) => {
      const market = marketMap.get(position.conditionId);
      if (!market) {
        return { position, signal: undefined, alignment: 'no_signal' as const };
      }
      
      // Get latest signal for this market
      const signal = await ctx.runQuery(internal.signals.getLatestSignalForMarket, {
        marketId: market._id,
      });
      
      if (!signal) {
        return { position, signal: undefined, alignment: 'no_signal' as const };
      }
      
      // Determine alignment
      const positionSide = position.outcome.toUpperCase() === 'YES' ? 'YES' : 'NO';
      const alignment = signal.consensusDecision === positionSide 
        ? 'aligned' as const 
        : signal.consensusDecision === 'NO_TRADE'
          ? 'no_signal' as const
          : 'opposed' as const;
      
      return { position, signal, alignment };
    }));
    
    return results;
  },
});
```

#### Frontend Implementation

**File: `apps/web/src/routes/dashboard/portfolio/index.tsx`**

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAction } from 'convex/react';
import { convexQuery } from '@convex-dev/react-query';
import { api } from 'backend/convex/_generated/api';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { HugeiconsIcon } from '@hugeicons/react';
import { 
  Wallet01Icon, 
  Add01Icon, 
  RefreshIcon,
  CheckmarkCircle01Icon,
  AlertCircleIcon,
  MinusSignIcon,
} from '@hugeicons/core-free-icons';

export const Route = createFileRoute('/dashboard/portfolio/')({
  component: PortfolioPage,
});

function PortfolioPage() {
  const { data: portfolios, isLoading } = useQuery(
    convexQuery(api.portfolio.getMyPortfolios, {})
  );
  const addPortfolio = useMutation(api.portfolio.addPortfolio);
  const syncPositions = useAction(api.portfolio.syncPortfolioWithSignals);
  
  const [newAddress, setNewAddress] = useState('');
  const [positions, setPositions] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);
  
  const handleAddAddress = async () => {
    if (!newAddress) return;
    try {
      await addPortfolio({ polymarketAddress: newAddress });
      setNewAddress('');
    } catch (error) {
      console.error(error);
    }
  };
  
  const handleSync = async (address: string) => {
    setSyncing(true);
    try {
      const result = await syncPositions({ address });
      setPositions(result);
    } finally {
      setSyncing(false);
    }
  };
  
  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="border-b border-border bg-card/50">
        <div className="px-4 py-6 md:px-6 md:py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
                My Positions
              </h1>
              <p className="text-sm text-muted-foreground">
                Connect your Polymarket wallet to see how your positions align with AI signals
              </p>
            </div>
          </div>
          
          {/* Add wallet form */}
          <div className="flex gap-2 max-w-md">
            <Input
              placeholder="0x..."
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              className="font-mono"
            />
            <Button onClick={handleAddAddress}>
              <HugeiconsIcon icon={Add01Icon} size={16} className="mr-2" />
              Add Wallet
            </Button>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4 md:p-6 space-y-6">
        {/* Wallet selector */}
        {portfolios && portfolios.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {portfolios.map((p) => (
              <Button
                key={p._id}
                variant="outline"
                size="sm"
                onClick={() => handleSync(p.polymarketAddress)}
                disabled={syncing}
              >
                <HugeiconsIcon icon={Wallet01Icon} size={14} className="mr-2" />
                {p.nickname || `${p.polymarketAddress.slice(0, 6)}...${p.polymarketAddress.slice(-4)}`}
                {syncing && <RefreshIcon className="ml-2 animate-spin" size={14} />}
              </Button>
            ))}
          </div>
        )}
        
        {/* Positions */}
        {positions.length > 0 ? (
          <div className="space-y-4">
            {positions.map((item, i) => (
              <PositionCard key={i} {...item} />
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <HugeiconsIcon icon={Wallet01Icon} size={48} className="mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Add a Polymarket wallet address to see your positions
              </p>
            </CardContent>
          </Card>
        )}
        
        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground">
          Note: We can only see your current positions. We cannot track if you followed our signals 
          or calculate attributed P&L. Position alignment shows whether your holdings match our latest 
          AI consensus.
        </p>
      </div>
    </div>
  );
}

function PositionCard({ position, signal, alignment }: any) {
  const alignmentConfig = {
    aligned: { 
      icon: CheckmarkCircle01Icon, 
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-500/10',
      label: 'Aligned with Signal'
    },
    opposed: { 
      icon: AlertCircleIcon, 
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-500/10',
      label: 'Opposes Signal'
    },
    no_signal: { 
      icon: MinusSignIcon, 
      color: 'text-muted-foreground',
      bg: 'bg-muted',
      label: 'No Signal'
    },
  }[alignment];
  
  const pnlColor = position.percentPnl >= 0 
    ? 'text-green-600 dark:text-green-400' 
    : 'text-red-600 dark:text-red-400';
  
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium truncate">{position.title}</h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={position.outcome === 'Yes' ? 'default' : 'secondary'}>
                {position.outcome}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {position.size.toFixed(0)} shares @ ${position.avgPrice.toFixed(2)}
              </span>
            </div>
          </div>
          
          <div className="text-right">
            <div className={`font-mono font-bold ${pnlColor}`}>
              {position.percentPnl >= 0 ? '+' : ''}{position.percentPnl.toFixed(1)}%
            </div>
            <div className="text-sm text-muted-foreground">
              ${position.currentValue.toFixed(2)}
            </div>
          </div>
        </div>
        
        {/* Signal alignment */}
        <div className={`mt-3 p-2 rounded-md ${alignmentConfig.bg} flex items-center gap-2`}>
          <HugeiconsIcon icon={alignmentConfig.icon} size={16} className={alignmentConfig.color} />
          <span className={`text-sm ${alignmentConfig.color}`}>
            {alignmentConfig.label}
          </span>
          {signal && (
            <span className="text-xs text-muted-foreground ml-auto">
              Signal: {signal.consensusDecision} ({signal.consensusPercentage.toFixed(0)}%)
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## Phase 3: Market Intelligence (Weeks 5-6)

### 3.1 Deep Dive Analysis (Credit-Based)

#### Schema Additions

```typescript
// packages/backend/convex/schema.ts

// User credit tracking
userCredits: defineTable({
  userId: v.id('user'),
  deepDiveCredits: v.number(),
  monthlyAllocation: v.number(),    // Credits given per month based on plan
  lastRefreshedAt: v.number(),      // When credits were last refreshed
  totalUsed: v.number(),            // Lifetime usage
})
  .index('by_user', ['userId']),

// Deep dive requests and results
deepDiveRequests: defineTable({
  userId: v.id('user'),
  marketId: v.id('markets'),
  status: v.union(
    v.literal('pending'),
    v.literal('processing'),
    v.literal('completed'),
    v.literal('failed')
  ),
  requestedAt: v.number(),
  completedAt: v.optional(v.number()),
  creditsCharged: v.number(),
  
  // Result data (populated when completed)
  result: v.optional(v.object({
    newsItems: v.array(v.object({
      title: v.string(),
      url: v.string(),
      source: v.string(),
      summary: v.string(),
      sentiment: v.union(v.literal('positive'), v.literal('negative'), v.literal('neutral')),
      publishedAt: v.optional(v.number()),
    })),
    socialSentiment: v.object({
      score: v.number(),           // -1 to 1
      volume: v.string(),          // High, Medium, Low
      topOpinions: v.array(v.string()),
    }),
    relatedMarkets: v.array(v.object({
      marketId: v.id('markets'),
      title: v.string(),
      correlation: v.string(),     // Description of relationship
    })),
    historicalContext: v.string(),
    updatedAnalysis: v.string(),
    citations: v.array(v.string()),
  })),
  
  errorMessage: v.optional(v.string()),
})
  .index('by_user', ['userId', 'requestedAt'])
  .index('by_market', ['marketId', 'requestedAt'])
  .index('by_status', ['status']),
```

#### Backend Implementation

**File: `packages/backend/convex/deepDive.ts`**

```typescript
import { v } from 'convex/values';
import { query, mutation, internalAction, internalMutation } from './_generated/server';
import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';

// ============ CREDIT MANAGEMENT ============

export const getCredits = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    
    const user = await ctx.db
      .query('user')
      .withIndex('userId', (q) => q.eq('userId', identity.subject))
      .first();
    
    if (!user) return null;
    
    const credits = await ctx.db
      .query('userCredits')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .first();
    
    return credits ?? { 
      deepDiveCredits: 0, 
      monthlyAllocation: 0, 
      totalUsed: 0 
    };
  },
});

export const deductCredit = internalMutation({
  args: {
    userId: v.id('user'),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const credits = await ctx.db
      .query('userCredits')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first();
    
    if (!credits || credits.deepDiveCredits < args.amount) {
      throw new Error('Insufficient credits');
    }
    
    await ctx.db.patch(credits._id, {
      deepDiveCredits: credits.deepDiveCredits - args.amount,
      totalUsed: credits.totalUsed + args.amount,
    });
  },
});

// ============ DEEP DIVE REQUEST ============

export const requestDeepDive = mutation({
  args: {
    marketId: v.id('markets'),
  },
  returns: v.id('deepDiveRequests'),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');
    
    const user = await ctx.db
      .query('user')
      .withIndex('userId', (q) => q.eq('userId', identity.subject))
      .first();
    
    if (!user) throw new Error('User not found');
    
    // Check for recent cached result (within 6 hours)
    const sixHoursAgo = Date.now() - 6 * 60 * 60 * 1000;
    const cachedRequest = await ctx.db
      .query('deepDiveRequests')
      .withIndex('by_market', (q) => q.eq('marketId', args.marketId))
      .filter((q) => 
        q.and(
          q.eq(q.field('status'), 'completed'),
          q.gt(q.field('completedAt'), sixHoursAgo)
        )
      )
      .first();
    
    if (cachedRequest) {
      // Return cached result without charging credits
      return cachedRequest._id;
    }
    
    // Check credits
    const credits = await ctx.db
      .query('userCredits')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .first();
    
    if (!credits || credits.deepDiveCredits < 1) {
      throw new Error('Insufficient credits. Upgrade your plan for more deep dives.');
    }
    
    // Create request
    const requestId = await ctx.db.insert('deepDiveRequests', {
      userId: user._id,
      marketId: args.marketId,
      status: 'pending',
      requestedAt: Date.now(),
      creditsCharged: 1,
    });
    
    // Deduct credit
    await ctx.db.patch(credits._id, {
      deepDiveCredits: credits.deepDiveCredits - 1,
      totalUsed: credits.totalUsed + 1,
    });
    
    // Schedule the analysis
    await ctx.scheduler.runAfter(0, internal.deepDive.runDeepDiveAnalysis, {
      requestId,
    });
    
    return requestId;
  },
});

export const getDeepDiveResult = query({
  args: {
    requestId: v.id('deepDiveRequests'),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.requestId);
  },
});

// ============ DEEP DIVE ANALYSIS (Perplexity) ============

export const runDeepDiveAnalysis = internalAction({
  args: {
    requestId: v.id('deepDiveRequests'),
  },
  handler: async (ctx, args) => {
    // Update status to processing
    await ctx.runMutation(internal.deepDive.updateRequestStatus, {
      requestId: args.requestId,
      status: 'processing',
    });
    
    try {
      // Get market data
      const request = await ctx.runQuery(internal.deepDive.getRequest, {
        requestId: args.requestId,
      });
      
      if (!request) throw new Error('Request not found');
      
      const market = await ctx.runQuery(internal.markets.getMarket, {
        marketId: request.marketId,
      });
      
      if (!market) throw new Error('Market not found');
      
      // Call Perplexity API
      const apiKey = process.env.PERPLEXITY_API_KEY;
      if (!apiKey) throw new Error('Perplexity API key not configured');
      
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'sonar-reasoning-pro',
          messages: [
            {
              role: 'system',
              content: `You are a prediction market research analyst. Provide comprehensive research on the given market question. Include:
1. Recent relevant news (last 7 days)
2. Social media sentiment and key opinions
3. Historical context and similar past events
4. Updated probability assessment with reasoning
5. Key factors that could change the outcome

Be factual, cite sources, and quantify sentiment where possible.`,
            },
            {
              role: 'user',
              content: `Research this prediction market:

**Question:** ${market.title}
**Current YES Price:** ${((market as any).yesPrice ?? 0.5) * 100}%
**Event:** ${market.eventSlug}

Provide a comprehensive analysis with recent news, sentiment, and updated probability assessment.`,
            },
          ],
          max_tokens: 2048,
          temperature: 0.3,
          return_citations: true,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.status}`);
      }
      
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content ?? '';
      const citations = data.citations ?? [];
      
      // Parse the response into structured data
      const result = parseDeepDiveResponse(content, citations);
      
      // Update request with result
      await ctx.runMutation(internal.deepDive.completeRequest, {
        requestId: args.requestId,
        result,
      });
      
    } catch (error) {
      console.error('Deep dive failed:', error);
      await ctx.runMutation(internal.deepDive.failRequest, {
        requestId: args.requestId,
        errorMessage: String(error),
      });
    }
  },
});

function parseDeepDiveResponse(content: string, citations: string[]): any {
  // This is a simplified parser - in production, use structured output or more robust parsing
  return {
    newsItems: [], // Would parse from content
    socialSentiment: {
      score: 0,
      volume: 'Medium',
      topOpinions: [],
    },
    relatedMarkets: [],
    historicalContext: content.slice(0, 500),
    updatedAnalysis: content,
    citations,
  };
}

// ============ HELPER MUTATIONS ============

export const updateRequestStatus = internalMutation({
  args: {
    requestId: v.id('deepDiveRequests'),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.requestId, { 
      status: args.status as any,
    });
  },
});

export const completeRequest = internalMutation({
  args: {
    requestId: v.id('deepDiveRequests'),
    result: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.requestId, {
      status: 'completed',
      completedAt: Date.now(),
      result: args.result,
    });
  },
});

export const failRequest = internalMutation({
  args: {
    requestId: v.id('deepDiveRequests'),
    errorMessage: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.requestId, {
      status: 'failed',
      completedAt: Date.now(),
      errorMessage: args.errorMessage,
    });
  },
});

export const getRequest = internalQuery({
  args: { requestId: v.id('deepDiveRequests') },
  handler: async (ctx, args) => ctx.db.get(args.requestId),
});
```

---

### 3.2 Whale Intelligence

#### Schema Additions

```typescript
// packages/backend/convex/schema.ts

whaleProfiles: defineTable({
  address: v.string(),                    // Wallet address
  firstSeenAt: v.number(),
  lastSeenAt: v.number(),
  
  // Activity stats
  totalTrades: v.number(),
  totalVolume: v.number(),
  avgTradeSize: v.number(),
  
  // Performance (on resolved markets)
  resolvedTrades: v.number(),
  correctPredictions: v.number(),
  winRate: v.optional(v.number()),        // Only calculated with 10+ resolved
  
  // Classification
  isSmartMoney: v.boolean(),              // winRate > 60% with 10+ resolved
  preferredCategories: v.array(v.string()),
  
  // Metadata (from Polymarket if available)
  username: v.optional(v.string()),
  profileImage: v.optional(v.string()),
})
  .index('by_address', ['address'])
  .index('by_smart_money', ['isSmartMoney', 'totalVolume'])
  .index('by_volume', ['totalVolume']),
```

#### Backend Implementation

**File: `packages/backend/convex/whales.ts`**

```typescript
import { v } from 'convex/values';
import { query, internalMutation, internalQuery } from './_generated/server';
import { internal } from './_generated/api';

// ============ PROFILE MANAGEMENT ============

export const upsertWhaleProfile = internalMutation({
  args: {
    address: v.string(),
    tradeSize: v.number(),
    category: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('whaleProfiles')
      .withIndex('by_address', (q) => q.eq('address', args.address.toLowerCase()))
      .first();
    
    if (existing) {
      // Update existing profile
      const newTotalTrades = existing.totalTrades + 1;
      const newTotalVolume = existing.totalVolume + args.tradeSize;
      const newAvgTradeSize = newTotalVolume / newTotalTrades;
      
      // Update categories
      const categories = new Set(existing.preferredCategories);
      categories.add(args.category);
      
      await ctx.db.patch(existing._id, {
        lastSeenAt: Date.now(),
        totalTrades: newTotalTrades,
        totalVolume: newTotalVolume,
        avgTradeSize: newAvgTradeSize,
        preferredCategories: Array.from(categories).slice(0, 5),
      });
    } else {
      // Create new profile
      await ctx.db.insert('whaleProfiles', {
        address: args.address.toLowerCase(),
        firstSeenAt: Date.now(),
        lastSeenAt: Date.now(),
        totalTrades: 1,
        totalVolume: args.tradeSize,
        avgTradeSize: args.tradeSize,
        resolvedTrades: 0,
        correctPredictions: 0,
        isSmartMoney: false,
        preferredCategories: [args.category],
      });
    }
  },
});

// Called by resolution job to update whale accuracy
export const updateWhaleAccuracy = internalMutation({
  args: {
    address: v.string(),
    wasCorrect: v.boolean(),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query('whaleProfiles')
      .withIndex('by_address', (q) => q.eq('address', args.address.toLowerCase()))
      .first();
    
    if (!profile) return;
    
    const newResolved = profile.resolvedTrades + 1;
    const newCorrect = profile.correctPredictions + (args.wasCorrect ? 1 : 0);
    const winRate = newResolved >= 10 ? (newCorrect / newResolved) * 100 : undefined;
    const isSmartMoney = winRate !== undefined && winRate > 60 && newResolved >= 10;
    
    await ctx.db.patch(profile._id, {
      resolvedTrades: newResolved,
      correctPredictions: newCorrect,
      winRate,
      isSmartMoney,
    });
  },
});

// ============ QUERIES ============

export const getSmartMoneyWhales = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('whaleProfiles')
      .withIndex('by_smart_money', (q) => q.eq('isSmartMoney', true))
      .order('desc')
      .take(args.limit ?? 20);
  },
});

export const getWhaleProfile = query({
  args: {
    address: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('whaleProfiles')
      .withIndex('by_address', (q) => q.eq('address', args.address.toLowerCase()))
      .first();
  },
});

export const getRecentSmartMoneyTrades = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get smart money addresses
    const smartWhales = await ctx.db
      .query('whaleProfiles')
      .withIndex('by_smart_money', (q) => q.eq('isSmartMoney', true))
      .take(50);
    
    const smartAddresses = new Set(smartWhales.map(w => w.address));
    
    // Get recent whale trades
    const oneDayAgo = Date.now() / 1000 - 24 * 60 * 60;
    const trades = await ctx.db
      .query('trades')
      .withIndex('by_whale', (q) => q.eq('isWhale', true))
      .filter((q) => q.gt(q.field('timestamp'), oneDayAgo))
      .order('desc')
      .take(100);
    
    // Filter to smart money and enrich with profile
    const smartTrades = trades
      .filter(t => smartAddresses.has(t.proxyWallet.toLowerCase()))
      .slice(0, args.limit ?? 20);
    
    return Promise.all(smartTrades.map(async (trade) => {
      const profile = smartWhales.find(w => w.address === trade.proxyWallet.toLowerCase());
      return { ...trade, whaleProfile: profile };
    }));
  },
});

export const getWhaleStats = query({
  args: {},
  handler: async (ctx) => {
    const allWhales = await ctx.db.query('whaleProfiles').collect();
    
    const smartMoney = allWhales.filter(w => w.isSmartMoney);
    const totalVolume = allWhales.reduce((sum, w) => sum + w.totalVolume, 0);
    const avgWinRate = smartMoney.length > 0
      ? smartMoney.reduce((sum, w) => sum + (w.winRate ?? 0), 0) / smartMoney.length
      : 0;
    
    return {
      totalWhales: allWhales.length,
      smartMoneyCount: smartMoney.length,
      totalVolume,
      avgSmartMoneyWinRate: avgWinRate,
    };
  },
});
```

---

## Phase 4: Engagement & Polish (Weeks 7-8)

### 4.1 Weekly Digest Email

Add to cron jobs and implement weekly summary email with:
- Week's top signals
- Platform accuracy stats
- User's viewed signals
- Whale activity highlights

### 4.2 Social Sharing

**File: `apps/web/src/components/share-button.tsx`**

```tsx
import { Button } from '@/components/ui/button';
import { Share01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

interface ShareButtonProps {
  signal: {
    consensusDecision: string;
    consensusPercentage: number;
    aggregatedKeyFactors?: string[];
    market?: { title: string };
  };
}

export function ShareButton({ signal }: ShareButtonProps) {
  const handleShare = () => {
    const text = `Hermes AI Consensus: ${signal.consensusPercentage.toFixed(0)}% say ${signal.consensusDecision} on "${signal.market?.title}"

Key factors:
${signal.aggregatedKeyFactors?.slice(0, 2).map(f => `- ${f}`).join('\n') ?? ''}

Try Hermes: https://hermes.trading`;
    
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(twitterUrl, '_blank');
  };
  
  return (
    <Button variant="outline" size="sm" onClick={handleShare}>
      <HugeiconsIcon icon={Share01Icon} size={14} className="mr-2" />
      Share
    </Button>
  );
}
```

### 4.3 Activity Tracking & Badges

**Schema:**
```typescript
userActivity: defineTable({
  userId: v.id('user'),
  signalsViewed: v.number(),
  deepDivesUsed: v.number(),
  sharesGenerated: v.number(),
  daysActive: v.number(),
  currentStreak: v.number(),
  longestStreak: v.number(),
  lastActiveAt: v.number(),
  badges: v.array(v.string()),
})
  .index('by_user', ['userId']),
```

**Badges (engagement-based only):**
- `early_adopter` - Joined during beta
- `research_pro` - Used 10 deep dives
- `signal_hunter` - Viewed 100 signals
- `streak_7` - 7-day login streak
- `streak_30` - 30-day login streak
- `social_butterfly` - Shared 5 signals

---

## Landing Page Improvements

### Content Changes

1. **Hero headline:** "Stop Guessing. Start Seeing What Smart Money Sees."

2. **Sub-headline:** "Hermes monitors Polymarket 24/7, detects whale trades, and runs multi-AI consensus analysis in seconds."

3. **Features (specific):**
   - Whale Detection: "Know within 60 seconds when $10k+ trades hit any market"
   - Multi-AI Consensus: "Claude, GPT-4, and Gemini analyze independently. We only signal when they agree."
   - Transparent Track Record: "See our historical accuracy by category, confidence level, and time period."
   - Instant Alerts: "Email alerts for high-confidence signals. Never miss a trade while you sleep."

4. **Social proof section:** Display live stats from public performance dashboard

5. **Pricing tiers:**
   - Starter ($29/mo): All signals, email alerts, 1 deep dive/month
   - Pro ($79/mo): + 10 deep dives, portfolio sync, whale watch
   - Enterprise ($249/mo): + 50 deep dives, API, team seats

### Technical Implementation

Add public performance dashboard route that doesn't require auth:

**File: `apps/web/src/routes/performance.tsx`** (public route, no auth)

```tsx
// Publicly accessible performance stats
// Shows: win rate, total signals, accuracy by category, equity curve
```

---

## Environment Variables Summary

Add to Convex dashboard:
```
# Email
RESEND_API_KEY=re_xxxxxxxxxxxx

# Deep Dive AI
PERPLEXITY_API_KEY=pplx_xxxxxxxxxxxx

# Existing
OPENROUTER_API_KEY=...
ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...
GOOGLE_API_KEY=...
```

---

## Package Dependencies

```bash
# Backend
cd packages/backend
bun add @convex-dev/resend

# Frontend (if adding charts)
cd apps/web
bun add recharts
```

---

## Testing Checklist

### Phase 1
- [ ] Email alerts send for high-confidence signals
- [ ] Daily digest sends at correct time
- [ ] User preferences save and load correctly
- [ ] Edge score calculates correctly
- [ ] Category derivation works for major categories

### Phase 2
- [ ] Wallet addresses validate correctly
- [ ] Polymarket positions fetch successfully
- [ ] Signal alignment displays correctly
- [ ] Multiple wallets supported per user

### Phase 3
- [ ] Deep dive credits deduct correctly
- [ ] Cached results return without charging
- [ ] Perplexity API integration works
- [ ] Whale profiles update on trade
- [ ] Smart money classification triggers at 10+ resolved trades

### Phase 4
- [ ] Social share generates correct tweet
- [ ] Activity tracking increments correctly
- [ ] Badges award at correct thresholds
- [ ] Public performance page loads without auth

---

## Success Metrics

| Metric | Week 2 | Week 4 | Week 8 |
|--------|--------|--------|--------|
| Email open rate | 30%+ | 35%+ | 40%+ |
| Daily active users | 50 | 200 | 500 |
| Trial conversion | - | 10% | 15% |
| Deep dive usage | - | 30% of Pro | 50% of Pro |
| Signal accuracy | Baseline | Maintain | Maintain |

---

## Next Steps

1. Review and approve this plan
2. Set up Resend account and verify domain
3. Get Perplexity API key
4. Begin Phase 1 implementation
5. Schedule weekly check-ins for progress review
