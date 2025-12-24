import { betterAuth, type BetterAuthOptions } from "better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { admin } from "better-auth/plugins"; // Optional plugins
import {
  type AuthFunctions,
  createClient,
  createApi,
} from "better-auth-convex";
import { internal } from "./_generated/api";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { DataModel } from "./_generated/dataModel";
import schema from "./schema";
import authConfig from "./auth.config";
import { autumn } from "autumn-js/better-auth";

// 1. Internal API functions for auth operations
const authFunctions: AuthFunctions = internal.auth;

const siteUrl = process.env.SITE_URL!;

// 2. Auth client with triggers that run in your app context
export const authClient = createClient<DataModel, typeof schema>({
  authFunctions,
  schema,
  triggers: {},
});

// 3. Auth options factory
export const createAuthOptions = (ctx: QueryCtx) =>
  ({
    baseURL: siteUrl,
    trustedOrigins: [
      "*",
      siteUrl,
      "http://localhost:3000",
      "http://127.0.0.1:3000",
    ],
    advanced: {
      //   // Use unique cookie prefix to avoid conflicts with other Better Auth apps
      cookiePrefix: "herm",
      // crossSubDomainCookies: {
      //   enabled: false,
      // },
      // defaultCookieAttributes: {
      //   sameSite: "none" as const,
      //   secure: true,
      //   httpOnly: true,
      //   path: "/",
      // },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30, // 30 days
      updateAge: 60 * 60 * 24 * 15, // 15 days
    },
    database: authClient.httpAdapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    plugins: [
      admin(),
      autumn(),
      // crossDomain({ siteUrl }),
      convex({
        authConfig,
        jwks: process.env.JWKS,
      }),
    ],
  }) satisfies BetterAuthOptions;

// 4. Create auth instance
export const createAuth = (ctx: QueryCtx) => betterAuth(createAuthOptions(ctx));

// 5. IMPORTANT: Use getAuth for queries/mutations (direct DB access)
export const getAuth = <Ctx extends QueryCtx | MutationCtx>(ctx: Ctx) => {
  return betterAuth({
    ...createAuthOptions({} as any),
    database: authClient.adapter(ctx, createAuthOptions),
  });
};

// 6. Export trigger handlers for Convex
export const {
  beforeCreate,
  beforeDelete,
  beforeUpdate,
  onCreate,
  onDelete,
  onUpdate,
} = authClient.triggersApi();

// 7. Export API functions for internal use
export const {
  create,
  deleteMany,
  deleteOne,
  findMany,
  findOne,
  updateMany,
  updateOne,
  getLatestJwks,
  rotateKeys,
} = createApi(schema, createAuth, {
  // Optional: Skip input validation for smaller generated types
  // Since these are internal functions, validation is optional
  skipValidation: true,
});

// Optional: If you need custom mutation builders (e.g., for custom context)
// Pass internalMutation to both createClient and createApi
// export const authClient = createClient<DataModel, typeof schema>({
//   authFunctions,
//   schema,
//   internalMutation: myCustomInternalMutation,
//   triggers: { ... }
// });
//
// export const { create, ... } = createApi(schema, createAuth, {
//   internalMutation: myCustomInternalMutation,
// });
