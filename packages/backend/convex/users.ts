import { mutation, query } from './_generated/server';

// ============ USER QUERIES ============

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    // Get current user from auth context
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query('user')
      .withIndex('userId', (q) => q.eq('userId', identity.subject))
      .first();

    return user;
  },
});

// ============ NOTIFICATION TRACKING ============

export const updateLastSeenSignals = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const user = await ctx.db
      .query('user')
      .withIndex('userId', (q) => q.eq('userId', identity.subject))
      .first();

    if (!user) throw new Error('User not found');

    await ctx.db.patch(user._id, {
      lastSeenSignalsAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
