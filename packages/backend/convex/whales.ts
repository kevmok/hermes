import { v } from "convex/values";
import { query, internalMutation } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

type WhaleProfile = Doc<"whaleProfiles">;

export const upsertWhaleProfile = internalMutation({
  args: {
    address: v.string(),
    tradeSize: v.number(),
    category: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const normalizedAddress = args.address.toLowerCase();

    const existing = await ctx.db
      .query("whaleProfiles")
      .withIndex("by_address", (q) => q.eq("address", normalizedAddress))
      .first();

    if (existing) {
      const newTotalTrades = existing.totalTrades + 1;
      const newTotalVolume = existing.totalVolume + args.tradeSize;
      const newAvgTradeSize = newTotalVolume / newTotalTrades;

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
      await ctx.db.insert("whaleProfiles", {
        address: normalizedAddress,
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

    return null;
  },
});

export const updateWhaleAccuracy = internalMutation({
  args: {
    address: v.string(),
    wasCorrect: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const profile = await ctx.db
      .query("whaleProfiles")
      .withIndex("by_address", (q) =>
        q.eq("address", args.address.toLowerCase()),
      )
      .first();

    if (!profile) return null;

    const newResolved = profile.resolvedTrades + 1;
    const newCorrect = profile.correctPredictions + (args.wasCorrect ? 1 : 0);
    const winRate =
      newResolved >= 10 ? (newCorrect / newResolved) * 100 : undefined;
    const isSmartMoney =
      winRate !== undefined && winRate > 60 && newResolved >= 10;

    await ctx.db.patch(profile._id, {
      resolvedTrades: newResolved,
      correctPredictions: newCorrect,
      winRate,
      isSmartMoney,
    });

    return null;
  },
});

const whaleProfileValidator = v.object({
  _id: v.id("whaleProfiles"),
  _creationTime: v.number(),
  address: v.string(),
  firstSeenAt: v.number(),
  lastSeenAt: v.number(),
  totalTrades: v.number(),
  totalVolume: v.number(),
  avgTradeSize: v.number(),
  resolvedTrades: v.number(),
  correctPredictions: v.number(),
  winRate: v.optional(v.number()),
  isSmartMoney: v.boolean(),
  preferredCategories: v.array(v.string()),
  username: v.optional(v.string()),
  profileImage: v.optional(v.string()),
});

export const getSmartMoneyWhales = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(whaleProfileValidator),
  handler: async (ctx, args): Promise<WhaleProfile[]> => {
    return await ctx.db
      .query("whaleProfiles")
      .withIndex("by_smart_money", (q) => q.eq("isSmartMoney", true))
      .order("desc")
      .take(args.limit ?? 20);
  },
});

export const getTopWhalesByVolume = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(whaleProfileValidator),
  handler: async (ctx, args): Promise<WhaleProfile[]> => {
    return await ctx.db
      .query("whaleProfiles")
      .withIndex("by_volume")
      .order("desc")
      .take(args.limit ?? 20);
  },
});

export const getWhaleProfile = query({
  args: {
    address: v.string(),
  },
  returns: v.union(whaleProfileValidator, v.null()),
  handler: async (ctx, args): Promise<WhaleProfile | null> => {
    return await ctx.db
      .query("whaleProfiles")
      .withIndex("by_address", (q) =>
        q.eq("address", args.address.toLowerCase()),
      )
      .first();
  },
});

export const getRecentSmartMoneyTrades = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const smartWhales = await ctx.db
      .query("whaleProfiles")
      .withIndex("by_smart_money", (q) => q.eq("isSmartMoney", true))
      .take(50);

    const smartAddresses = new Set(smartWhales.map((w) => w.address));

    const oneDayAgo = Date.now() / 1000 - 24 * 60 * 60;
    const trades = await ctx.db
      .query("trades")
      .withIndex("by_whale", (q) => q.eq("isWhale", true))
      .filter((q) => q.gt(q.field("timestamp"), oneDayAgo))
      .order("desc")
      .take(100);

    const smartTrades = trades
      .filter((t) => smartAddresses.has(t.proxyWallet.toLowerCase()))
      .slice(0, args.limit ?? 20);

    return smartTrades.map((trade) => {
      const profile = smartWhales.find(
        (w) => w.address === trade.proxyWallet.toLowerCase(),
      );
      return { ...trade, whaleProfile: profile };
    });
  },
});

export const getWhaleStats = query({
  args: {},
  returns: v.object({
    totalWhales: v.number(),
    smartMoneyCount: v.number(),
    totalVolume: v.number(),
    avgSmartMoneyWinRate: v.number(),
  }),
  handler: async (
    ctx,
  ): Promise<{
    totalWhales: number;
    smartMoneyCount: number;
    totalVolume: number;
    avgSmartMoneyWinRate: number;
  }> => {
    const allWhales = await ctx.db.query("whaleProfiles").collect();

    const smartMoney = allWhales.filter((w) => w.isSmartMoney);
    const totalVolume = allWhales.reduce((sum, w) => sum + w.totalVolume, 0);
    const avgWinRate =
      smartMoney.length > 0
        ? smartMoney.reduce((sum, w) => sum + (w.winRate ?? 0), 0) /
          smartMoney.length
        : 0;

    return {
      totalWhales: allWhales.length,
      smartMoneyCount: smartMoney.length,
      totalVolume,
      avgSmartMoneyWinRate: avgWinRate,
    };
  },
});

export const getAllWhales = query({
  args: {
    limit: v.optional(v.number()),
    onlySmartMoney: v.optional(v.boolean()),
  },
  returns: v.array(whaleProfileValidator),
  handler: async (ctx, args): Promise<WhaleProfile[]> => {
    if (args.onlySmartMoney) {
      return await ctx.db
        .query("whaleProfiles")
        .withIndex("by_smart_money", (q) => q.eq("isSmartMoney", true))
        .order("desc")
        .take(args.limit ?? 50);
    }

    return await ctx.db
      .query("whaleProfiles")
      .withIndex("by_volume")
      .order("desc")
      .take(args.limit ?? 50);
  },
});
