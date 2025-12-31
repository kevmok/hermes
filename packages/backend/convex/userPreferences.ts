import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

const preferencesValidator = v.object({
  _id: v.id("userPreferences"),
  _creationTime: v.number(),
  userId: v.id("user"),
  emailAlerts: v.boolean(),
  alertThreshold: v.union(
    v.literal("high"),
    v.literal("medium"),
    v.literal("all"),
  ),
  categories: v.array(v.string()),
  digestFrequency: v.union(
    v.literal("instant"),
    v.literal("daily"),
    v.literal("weekly"),
  ),
  digestHourUTC: v.number(),
  timezone: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

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

export const getMyPreferences = query({
  args: {},
  returns: v.union(preferencesValidator, v.null()),
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) return null;

    return await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
  },
});

export const getMyPreferencesWithDefaults = query({
  args: {},
  returns: v.object({
    exists: v.boolean(),
    preferences: v.union(preferencesValidator, v.null()),
    defaults: v.object({
      emailAlerts: v.boolean(),
      alertThreshold: v.union(
        v.literal("high"),
        v.literal("medium"),
        v.literal("all"),
      ),
      categories: v.array(v.string()),
      digestFrequency: v.union(
        v.literal("instant"),
        v.literal("daily"),
        v.literal("weekly"),
      ),
      digestHourUTC: v.number(),
      timezone: v.string(),
    }),
  }),
  handler: async (ctx) => {
    const defaults = {
      emailAlerts: false,
      alertThreshold: "high" as const,
      categories: [] as string[],
      digestFrequency: "daily" as const,
      digestHourUTC: 9,
      timezone: "UTC",
    };

    const user = await getAuthenticatedUser(ctx);
    if (!user) {
      return { exists: false, preferences: null, defaults };
    }

    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    if (existing) {
      return { exists: true, preferences: existing, defaults };
    }

    return { exists: false, preferences: null, defaults };
  },
});

export const updateMyPreferences = mutation({
  args: {
    emailAlerts: v.optional(v.boolean()),
    alertThreshold: v.optional(
      v.union(v.literal("high"), v.literal("medium"), v.literal("all")),
    ),
    categories: v.optional(v.array(v.string())),
    digestFrequency: v.optional(
      v.union(v.literal("instant"), v.literal("daily"), v.literal("weekly")),
    ),
    digestHourUTC: v.optional(v.number()),
    timezone: v.optional(v.string()),
  },
  returns: v.id("userPreferences"),
  handler: async (ctx, args): Promise<Id<"userPreferences">> => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) throw new ConvexError("Not authenticated");

    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    if (!existing) {
      return await ctx.db.insert("userPreferences", {
        userId: user._id,
        emailAlerts: args.emailAlerts ?? false,
        alertThreshold: args.alertThreshold ?? "high",
        categories: args.categories ?? [],
        digestFrequency: args.digestFrequency ?? "daily",
        digestHourUTC: args.digestHourUTC ?? 9,
        timezone: args.timezone ?? "UTC",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    const updates: Partial<{
      emailAlerts: boolean;
      alertThreshold: "high" | "medium" | "all";
      categories: string[];
      digestFrequency: "instant" | "daily" | "weekly";
      digestHourUTC: number;
      timezone: string;
      updatedAt: number;
    }> = { updatedAt: Date.now() };

    if (args.emailAlerts !== undefined) updates.emailAlerts = args.emailAlerts;
    if (args.alertThreshold !== undefined)
      updates.alertThreshold = args.alertThreshold;
    if (args.categories !== undefined) updates.categories = args.categories;
    if (args.digestFrequency !== undefined)
      updates.digestFrequency = args.digestFrequency;
    if (args.digestHourUTC !== undefined)
      updates.digestHourUTC = args.digestHourUTC;
    if (args.timezone !== undefined) updates.timezone = args.timezone;

    await ctx.db.patch(existing._id, updates);
    return existing._id;
  },
});

export const deleteMyPreferences = mutation({
  args: {},
  returns: v.boolean(),
  handler: async (ctx): Promise<boolean> => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) throw new ConvexError("Not authenticated");

    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    if (!existing) return false;

    await ctx.db.delete(existing._id);
    return true;
  },
});
