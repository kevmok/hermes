import { ConvexError, v } from 'convex/values';
import { query, mutation, action } from './_generated/server';
import { internal } from './_generated/api';
import { api as polymarketApi } from './polymarket/client';
import type { Id } from './_generated/dataModel';

async function getAuthenticatedUser(ctx: {
  auth: { getUserIdentity: () => Promise<{ subject: string } | null> };
  db: any;
}) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  const user = await ctx.db
    .query('user')
    .withIndex('userId', (q: any) => q.eq('userId', identity.subject))
    .first();

  return user;
}

export const addPortfolio = mutation({
  args: {
    polymarketAddress: v.string(),
    nickname: v.optional(v.string()),
  },
  returns: v.id('userPortfolio'),
  handler: async (ctx, args): Promise<Id<'userPortfolio'>> => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) throw new ConvexError('Not authenticated');

    if (!/^0x[a-fA-F0-9]{40}$/.test(args.polymarketAddress)) {
      throw new ConvexError('Invalid Ethereum address format');
    }

    const normalizedAddress = args.polymarketAddress.toLowerCase();

    const existing = await ctx.db
      .query('userPortfolio')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .filter((q) => q.eq(q.field('polymarketAddress'), normalizedAddress))
      .first();

    if (existing) {
      throw new ConvexError('This address is already added to your portfolio');
    }

    return await ctx.db.insert('userPortfolio', {
      userId: user._id,
      polymarketAddress: normalizedAddress,
      nickname: args.nickname,
      addedAt: Date.now(),
    });
  },
});

export const updatePortfolioNickname = mutation({
  args: {
    portfolioId: v.id('userPortfolio'),
    nickname: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) throw new ConvexError('Not authenticated');

    const portfolio = await ctx.db.get(args.portfolioId);
    if (!portfolio) throw new ConvexError('Portfolio not found');

    if (portfolio.userId !== user._id) {
      throw new ConvexError('Not authorized');
    }

    await ctx.db.patch(args.portfolioId, { nickname: args.nickname });
    return null;
  },
});

export const removePortfolio = mutation({
  args: {
    portfolioId: v.id('userPortfolio'),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) throw new ConvexError('Not authenticated');

    const portfolio = await ctx.db.get(args.portfolioId);
    if (!portfolio) throw new ConvexError('Portfolio not found');

    if (portfolio.userId !== user._id) {
      throw new ConvexError('Not authorized');
    }

    await ctx.db.delete(args.portfolioId);
    return null;
  },
});

const portfolioValidator = v.object({
  _id: v.id('userPortfolio'),
  _creationTime: v.number(),
  userId: v.id('user'),
  polymarketAddress: v.string(),
  nickname: v.optional(v.string()),
  addedAt: v.number(),
  lastSyncedAt: v.optional(v.number()),
  lastSyncStatus: v.optional(
    v.union(
      v.literal('success'),
      v.literal('failed'),
      v.literal('no_positions'),
    ),
  ),
});

export const getMyPortfolios = query({
  args: {},
  returns: v.array(portfolioValidator),
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) return [];

    return await ctx.db
      .query('userPortfolio')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();
  },
});

export const fetchPositions = action({
  args: {
    address: v.string(),
  },
  returns: v.array(v.any()),
  handler: async (_ctx, args) => {
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

type PositionResult = {
  position: any;
  signal: any | undefined;
  alignment: 'aligned' | 'opposed' | 'no_signal';
};

export const syncPortfolioWithSignals = action({
  args: {
    address: v.string(),
  },
  returns: v.array(
    v.object({
      position: v.any(),
      signal: v.optional(v.any()),
      alignment: v.union(
        v.literal('aligned'),
        v.literal('opposed'),
        v.literal('no_signal'),
      ),
    }),
  ),
  handler: async (ctx, args): Promise<PositionResult[]> => {
    let positions: any[];
    try {
      positions = await polymarketApi.getUserPositions(args.address, {
        limit: 100,
      });
    } catch (error) {
      console.error('Failed to fetch positions:', error);
      return [];
    }

    if (positions.length === 0) return [];

    const conditionIds: string[] = positions
      .map((p) => p.conditionId)
      .filter((id): id is string => !!id);

    if (conditionIds.length === 0) return [];

    const markets: Array<{ _id: Id<'markets'>; conditionId?: string }> =
      await ctx.runQuery(internal.markets.getMarketsByConditionIdsInternal, {
        conditionIds,
      });

    const marketMap = new Map<
      string,
      { _id: Id<'markets'>; conditionId?: string }
    >(markets.map((m) => [m.conditionId ?? '', m]));

    const results: PositionResult[] = await Promise.all(
      positions.map(async (position): Promise<PositionResult> => {
        const market = marketMap.get(position.conditionId);
        if (!market) {
          return {
            position,
            signal: undefined,
            alignment: 'no_signal',
          };
        }

        const signal = await ctx.runQuery(
          internal.signals.getLatestSignalForMarketInternal,
          { marketId: market._id },
        );

        if (!signal) {
          return {
            position,
            signal: undefined,
            alignment: 'no_signal',
          };
        }

        const positionSide =
          position.outcome?.toUpperCase() === 'YES' ? 'YES' : 'NO';
        const alignment: 'aligned' | 'opposed' | 'no_signal' =
          signal.consensusDecision === positionSide
            ? 'aligned'
            : signal.consensusDecision === 'NO_TRADE'
              ? 'no_signal'
              : 'opposed';

        return { position, signal, alignment };
      }),
    );

    return results;
  },
});
