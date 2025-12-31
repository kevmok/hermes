import { ConvexError, v } from "convex/values";
import {
  query,
  mutation,
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

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

type DeepDiveResult = {
  newsItems: Array<{
    title: string;
    url: string;
    source: string;
    summary: string;
    sentiment: "positive" | "negative" | "neutral";
    publishedAt?: number;
  }>;
  socialSentiment: {
    score: number;
    volume: string;
    topOpinions: string[];
  };
  relatedMarkets: Array<{
    marketId: Id<"markets">;
    title: string;
    correlation: string;
  }>;
  historicalContext: string;
  updatedAnalysis: string;
  citations: string[];
};

export const getCredits = query({
  args: {},
  returns: v.union(
    v.object({
      deepDiveCredits: v.number(),
      monthlyAllocation: v.number(),
      totalUsed: v.number(),
      lastRefreshedAt: v.optional(v.number()),
    }),
    v.null(),
  ),
  handler: async (
    ctx,
  ): Promise<{
    deepDiveCredits: number;
    monthlyAllocation: number;
    totalUsed: number;
    lastRefreshedAt?: number;
  } | null> => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) return null;

    const credits = await ctx.db
      .query("userCredits")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    return (
      credits ?? {
        deepDiveCredits: 0,
        monthlyAllocation: 0,
        totalUsed: 0,
      }
    );
  },
});

export const initializeCredits = internalMutation({
  args: {
    userId: v.id("user"),
    initialCredits: v.number(),
    monthlyAllocation: v.number(),
  },
  returns: v.id("userCredits"),
  handler: async (ctx, args): Promise<Id<"userCredits">> => {
    const existing = await ctx.db
      .query("userCredits")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("userCredits", {
      userId: args.userId,
      deepDiveCredits: args.initialCredits,
      monthlyAllocation: args.monthlyAllocation,
      lastRefreshedAt: Date.now(),
      totalUsed: 0,
    });
  },
});

export const deductCredit = internalMutation({
  args: {
    userId: v.id("user"),
    amount: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const credits = await ctx.db
      .query("userCredits")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!credits || credits.deepDiveCredits < args.amount) {
      throw new ConvexError("Insufficient credits");
    }

    await ctx.db.patch(credits._id, {
      deepDiveCredits: credits.deepDiveCredits - args.amount,
      totalUsed: credits.totalUsed + args.amount,
    });

    return null;
  },
});

export const refundCredit = internalMutation({
  args: {
    userId: v.id("user"),
    amount: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const credits = await ctx.db
      .query("userCredits")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!credits) return null;

    await ctx.db.patch(credits._id, {
      deepDiveCredits: credits.deepDiveCredits + args.amount,
      totalUsed: Math.max(0, credits.totalUsed - args.amount),
    });

    return null;
  },
});

export const requestDeepDive = mutation({
  args: {
    marketId: v.id("markets"),
  },
  returns: v.id("deepDiveRequests"),
  handler: async (ctx, args): Promise<Id<"deepDiveRequests">> => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) throw new ConvexError("Not authenticated");

    const sixHoursAgo = Date.now() - 6 * 60 * 60 * 1000;
    const cachedRequest = await ctx.db
      .query("deepDiveRequests")
      .withIndex("by_market", (q) => q.eq("marketId", args.marketId))
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "completed"),
          q.gt(q.field("completedAt"), sixHoursAgo),
        ),
      )
      .first();

    if (cachedRequest) {
      return cachedRequest._id;
    }

    const credits = await ctx.db
      .query("userCredits")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!credits || credits.deepDiveCredits < 1) {
      throw new ConvexError(
        "Insufficient credits. Upgrade your plan for more deep dives.",
      );
    }

    const requestId = await ctx.db.insert("deepDiveRequests", {
      userId: user._id,
      marketId: args.marketId,
      status: "pending",
      requestedAt: Date.now(),
      creditsCharged: 1,
    });

    await ctx.db.patch(credits._id, {
      deepDiveCredits: credits.deepDiveCredits - 1,
      totalUsed: credits.totalUsed + 1,
    });

    await ctx.scheduler.runAfter(0, internal.deepDive.runDeepDiveAnalysis, {
      requestId,
    });

    return requestId;
  },
});

export const getDeepDiveResult = query({
  args: {
    requestId: v.id("deepDiveRequests"),
  },
  returns: v.union(
    v.object({
      _id: v.id("deepDiveRequests"),
      _creationTime: v.number(),
      userId: v.id("user"),
      marketId: v.id("markets"),
      status: v.union(
        v.literal("pending"),
        v.literal("processing"),
        v.literal("completed"),
        v.literal("failed"),
      ),
      requestedAt: v.number(),
      completedAt: v.optional(v.number()),
      creditsCharged: v.number(),
      result: v.optional(v.any()),
      errorMessage: v.optional(v.string()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.requestId);
  },
});

export const getMyDeepDives = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) return [];

    return await ctx.db
      .query("deepDiveRequests")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(args.limit ?? 20);
  },
});

export const getRequest = internalQuery({
  args: { requestId: v.id("deepDiveRequests") },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => ctx.db.get(args.requestId),
});

export const getMarket = internalQuery({
  args: { marketId: v.id("markets") },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => ctx.db.get(args.marketId),
});

export const updateRequestStatus = internalMutation({
  args: {
    requestId: v.id("deepDiveRequests"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    await ctx.db.patch(args.requestId, {
      status: args.status,
    });
    return null;
  },
});

export const completeRequest = internalMutation({
  args: {
    requestId: v.id("deepDiveRequests"),
    result: v.any(),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    await ctx.db.patch(args.requestId, {
      status: "completed",
      completedAt: Date.now(),
      result: args.result,
    });
    return null;
  },
});

export const failRequest = internalMutation({
  args: {
    requestId: v.id("deepDiveRequests"),
    errorMessage: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    await ctx.db.patch(args.requestId, {
      status: "failed",
      completedAt: Date.now(),
      errorMessage: args.errorMessage,
    });
    return null;
  },
});

function parseDeepDiveResponse(
  content: string,
  citations: string[],
): DeepDiveResult {
  return {
    newsItems: [],
    socialSentiment: {
      score: 0,
      volume: "Medium",
      topOpinions: [],
    },
    relatedMarkets: [],
    historicalContext: content.slice(0, 500),
    updatedAnalysis: content,
    citations,
  };
}

export const runDeepDiveAnalysis = internalAction({
  args: {
    requestId: v.id("deepDiveRequests"),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    await ctx.runMutation(internal.deepDive.updateRequestStatus, {
      requestId: args.requestId,
      status: "processing",
    });

    try {
      const request = await ctx.runQuery(internal.deepDive.getRequest, {
        requestId: args.requestId,
      });

      if (!request) throw new Error("Request not found");

      const market = await ctx.runQuery(internal.deepDive.getMarket, {
        marketId: request.marketId,
      });

      if (!market) throw new Error("Market not found");

      const apiKey = process.env.PERPLEXITY_API_KEY;
      if (!apiKey) throw new Error("Perplexity API key not configured");

      const response = await fetch(
        "https://api.perplexity.ai/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "sonar-reasoning-pro",
            messages: [
              {
                role: "system",
                content: `You are a prediction market research analyst. Provide comprehensive research on the given market question. Include:
1. Recent relevant news (last 7 days)
2. Social media sentiment and key opinions
3. Historical context and similar past events
4. Updated probability assessment with reasoning
5. Key factors that could change the outcome

Be factual, cite sources, and quantify sentiment where possible.`,
              },
              {
                role: "user",
                content: `Research this prediction market:

**Question:** ${market.title}
**Event:** ${market.eventSlug}

Provide a comprehensive analysis with recent news, sentiment, and updated probability assessment.`,
              },
            ],
            max_tokens: 2048,
            temperature: 0.3,
            return_citations: true,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.status}`);
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        citations?: string[];
      };
      const content = data.choices?.[0]?.message?.content ?? "";
      const citations = data.citations ?? [];

      const result = parseDeepDiveResponse(content, citations);

      await ctx.runMutation(internal.deepDive.completeRequest, {
        requestId: args.requestId,
        result,
      });
    } catch (error) {
      console.error("Deep dive failed:", error);

      const request = await ctx.runQuery(internal.deepDive.getRequest, {
        requestId: args.requestId,
      });

      if (request) {
        await ctx.runMutation(internal.deepDive.refundCredit, {
          userId: request.userId,
          amount: request.creditsCharged,
        });
      }

      await ctx.runMutation(internal.deepDive.failRequest, {
        requestId: args.requestId,
        errorMessage: String(error),
      });
    }

    return null;
  },
});
