import { createClient, GenericCtx } from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { components } from "./_generated/api";
import { DataModel, Id } from "./_generated/dataModel";
import { query, QueryCtx } from "./_generated/server";
import { betterAuth, type BetterAuthOptions } from "better-auth/minimal";
import authConfig from "./auth.config";
import { admin } from "better-auth/plugins";
import { autumn } from "autumn-js/better-auth";
import betterAuthSchema from "./better-auth/schema";
import { withoutSystemFields } from "convex-helpers";
import { ConvexError } from "convex/values";

const siteUrl = process.env.SITE_URL!;

export const authComponent = createClient<DataModel, typeof betterAuthSchema>(
  components.betterAuth,
  {
    local: {
      schema: betterAuthSchema,
    },
  },
);

export const createAuthOptions = (ctx: GenericCtx<DataModel>) => {
  return {
    trustedOrigins: [siteUrl],
    database: authComponent.adapter(ctx),
    // Configure simple, non-verified email/password to get started
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    plugins: [
      admin(),
      autumn(),
      // The cross domain plugin is required for client side frameworks
      crossDomain({ siteUrl }),
      // The Convex plugin is required for Convex compatibility
      convex({ authConfig }),
      // tanstackStartCookies(),
    ],
  } satisfies BetterAuthOptions;
};

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth(createAuthOptions(ctx));
};

export const safeGetUser = async (ctx: QueryCtx) => {
  const authUser = await authComponent.safeGetAuthUser(ctx);
  if (!authUser) {
    return;
  }
  const user = await ctx.db.get(authUser.userId as Id<"users">);
  if (!user) {
    return;
  }
  return { ...user, ...withoutSystemFields(authUser) };
};

export const getUser = async (ctx: QueryCtx) => {
  const user = await safeGetUser(ctx);
  if (!user) {
    throw new ConvexError("Unauthenticated");
  }
  return user;
};

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return await getUser(ctx);
  },
});
