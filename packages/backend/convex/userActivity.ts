import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import type { Id, Doc } from "./_generated/dataModel";

type Badge =
  | "early_adopter"
  | "research_pro"
  | "signal_hunter"
  | "streak_7"
  | "streak_30"
  | "social_butterfly";

const BADGE_THRESHOLDS: Record<
  Badge,
  (activity: Doc<"userActivity">) => boolean
> = {
  early_adopter: () => false,
  research_pro: (a) => a.deepDivesUsed >= 10,
  signal_hunter: (a) => a.signalsViewed >= 100,
  streak_7: (a) => a.currentStreak >= 7 || a.longestStreak >= 7,
  streak_30: (a) => a.currentStreak >= 30 || a.longestStreak >= 30,
  social_butterfly: (a) => a.sharesGenerated >= 5,
};

async function getAuthenticatedUser(ctx: {
  auth: { getUserIdentity: () => Promise<{ subject: string } | null> };
  db: any;
}) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  const user = await ctx.db
    .query("user")
    .withIndex("userId", (q: any) => q.eq("userId", identity.subject))
    .first();

  return user;
}

function checkAndAwardBadges(activity: Doc<"userActivity">): string[] {
  const newBadges: string[] = [];
  const currentBadges = new Set(activity.badges);

  for (const [badge, check] of Object.entries(BADGE_THRESHOLDS)) {
    if (!currentBadges.has(badge) && check(activity)) {
      newBadges.push(badge);
    }
  }

  return newBadges;
}

function isSameDay(ts1: number, ts2: number): boolean {
  const d1 = new Date(ts1);
  const d2 = new Date(ts2);
  return (
    d1.getUTCFullYear() === d2.getUTCFullYear() &&
    d1.getUTCMonth() === d2.getUTCMonth() &&
    d1.getUTCDate() === d2.getUTCDate()
  );
}

function isConsecutiveDay(lastTs: number, currentTs: number): boolean {
  const lastDate = new Date(lastTs);
  const currentDate = new Date(currentTs);

  lastDate.setUTCHours(0, 0, 0, 0);
  currentDate.setUTCHours(0, 0, 0, 0);

  const diffDays =
    (currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays === 1;
}

const activityValidator = v.object({
  _id: v.id("userActivity"),
  _creationTime: v.number(),
  userId: v.id("user"),
  signalsViewed: v.number(),
  deepDivesUsed: v.number(),
  sharesGenerated: v.number(),
  daysActive: v.number(),
  currentStreak: v.number(),
  longestStreak: v.number(),
  lastActiveAt: v.number(),
  badges: v.array(v.string()),
});

export const getMyActivity = query({
  args: {},
  returns: v.union(activityValidator, v.null()),
  handler: async (ctx): Promise<Doc<"userActivity"> | null> => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) return null;

    return await ctx.db
      .query("userActivity")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .first();
  },
});

export const initializeActivity = mutation({
  args: {},
  returns: v.id("userActivity"),
  handler: async (ctx): Promise<Id<"userActivity">> => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("userActivity")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .first();

    if (existing) return existing._id;

    const now = Date.now();
    const isBeta = now < new Date("2025-03-01").getTime();

    return await ctx.db.insert("userActivity", {
      userId: user._id,
      signalsViewed: 0,
      deepDivesUsed: 0,
      sharesGenerated: 0,
      daysActive: 1,
      currentStreak: 1,
      longestStreak: 1,
      lastActiveAt: now,
      badges: isBeta ? ["early_adopter"] : [],
    });
  },
});

export const recordSignalView = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx): Promise<null> => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) return null;

    const activity = await ctx.db
      .query("userActivity")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .first();

    if (!activity) return null;

    const now = Date.now();
    const updates: Partial<Doc<"userActivity">> = {
      signalsViewed: activity.signalsViewed + 1,
      lastActiveAt: now,
    };

    if (!isSameDay(activity.lastActiveAt, now)) {
      updates.daysActive = activity.daysActive + 1;

      if (isConsecutiveDay(activity.lastActiveAt, now)) {
        updates.currentStreak = activity.currentStreak + 1;
        if (updates.currentStreak > activity.longestStreak) {
          updates.longestStreak = updates.currentStreak;
        }
      } else {
        updates.currentStreak = 1;
      }
    }

    const updatedActivity = { ...activity, ...updates };
    const newBadges = checkAndAwardBadges(
      updatedActivity as Doc<"userActivity">,
    );

    if (newBadges.length > 0) {
      updates.badges = [...activity.badges, ...newBadges];
    }

    await ctx.db.patch(activity._id, updates);
    return null;
  },
});

export const recordDeepDive = internalMutation({
  args: {
    userId: v.id("user"),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const activity = await ctx.db
      .query("userActivity")
      .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
      .first();

    if (!activity) return null;

    const updates: Partial<Doc<"userActivity">> = {
      deepDivesUsed: activity.deepDivesUsed + 1,
      lastActiveAt: Date.now(),
    };

    const updatedActivity = { ...activity, ...updates };
    const newBadges = checkAndAwardBadges(
      updatedActivity as Doc<"userActivity">,
    );

    if (newBadges.length > 0) {
      updates.badges = [...activity.badges, ...newBadges];
    }

    await ctx.db.patch(activity._id, updates);
    return null;
  },
});

export const recordShare = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx): Promise<null> => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) return null;

    const activity = await ctx.db
      .query("userActivity")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .first();

    if (!activity) return null;

    const updates: Partial<Doc<"userActivity">> = {
      sharesGenerated: activity.sharesGenerated + 1,
      lastActiveAt: Date.now(),
    };

    const updatedActivity = { ...activity, ...updates };
    const newBadges = checkAndAwardBadges(
      updatedActivity as Doc<"userActivity">,
    );

    if (newBadges.length > 0) {
      updates.badges = [...activity.badges, ...newBadges];
    }

    await ctx.db.patch(activity._id, updates);
    return null;
  },
});

export const recordDailyLogin = mutation({
  args: {},
  returns: v.object({
    isNewDay: v.boolean(),
    currentStreak: v.number(),
    newBadges: v.array(v.string()),
  }),
  handler: async (
    ctx,
  ): Promise<{
    isNewDay: boolean;
    currentStreak: number;
    newBadges: string[];
  }> => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) return { isNewDay: false, currentStreak: 0, newBadges: [] };

    let activity = await ctx.db
      .query("userActivity")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .first();

    const now = Date.now();

    if (!activity) {
      const isBeta = now < new Date("2025-03-01").getTime();
      await ctx.db.insert("userActivity", {
        userId: user._id,
        signalsViewed: 0,
        deepDivesUsed: 0,
        sharesGenerated: 0,
        daysActive: 1,
        currentStreak: 1,
        longestStreak: 1,
        lastActiveAt: now,
        badges: isBeta ? ["early_adopter"] : [],
      });
      return {
        isNewDay: true,
        currentStreak: 1,
        newBadges: isBeta ? ["early_adopter"] : [],
      };
    }

    if (isSameDay(activity.lastActiveAt, now)) {
      return {
        isNewDay: false,
        currentStreak: activity.currentStreak,
        newBadges: [],
      };
    }

    const updates: Partial<Doc<"userActivity">> = {
      daysActive: activity.daysActive + 1,
      lastActiveAt: now,
    };

    if (isConsecutiveDay(activity.lastActiveAt, now)) {
      updates.currentStreak = activity.currentStreak + 1;
      if (updates.currentStreak > activity.longestStreak) {
        updates.longestStreak = updates.currentStreak;
      }
    } else {
      updates.currentStreak = 1;
    }

    const updatedActivity = { ...activity, ...updates };
    const newBadges = checkAndAwardBadges(
      updatedActivity as Doc<"userActivity">,
    );

    if (newBadges.length > 0) {
      updates.badges = [...activity.badges, ...newBadges];
    }

    await ctx.db.patch(activity._id, updates);

    return {
      isNewDay: true,
      currentStreak: updates.currentStreak ?? activity.currentStreak,
      newBadges,
    };
  },
});

export const getActivityStats = query({
  args: {
    userId: v.optional(v.id("user")),
  },
  returns: v.union(
    v.object({
      signalsViewed: v.number(),
      deepDivesUsed: v.number(),
      sharesGenerated: v.number(),
      daysActive: v.number(),
      currentStreak: v.number(),
      longestStreak: v.number(),
      badges: v.array(v.string()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    let userId = args.userId;

    if (!userId) {
      const user = await getAuthenticatedUser(ctx);
      if (!user) return null;
      userId = user._id;
    }

    const activity = await ctx.db
      .query("userActivity")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .first();

    if (!activity) return null;

    return {
      signalsViewed: activity.signalsViewed,
      deepDivesUsed: activity.deepDivesUsed,
      sharesGenerated: activity.sharesGenerated,
      daysActive: activity.daysActive,
      currentStreak: activity.currentStreak,
      longestStreak: activity.longestStreak,
      badges: activity.badges,
    };
  },
});
