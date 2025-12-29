# WEB - Dashboard

TanStack Start React 19 dashboard displaying real-time trades, signals, and AI insights.

## STRUCTURE

```
src/
├── router.tsx         # TanStack Router setup + SSR query integration
├── routeTree.gen.ts   # Auto-generated route tree (DO NOT EDIT)
├── styles.css         # Global styles (Tailwind v4)
├── components/
│   ├── ui/            # shadcn/ui primitives (button, card, table, etc.)
│   └── landing/       # Landing page components
├── routes/
│   ├── __root.tsx     # Root layout (providers, nav)
│   ├── index.tsx      # Landing page
│   ├── (auth)/        # Auth routes (login, callback)
│   ├── dashboard/     # Protected dashboard routes
│   └── api/           # API routes (auth handlers)
├── hooks/             # Custom hooks (use-mobile)
└── lib/
    ├── auth/          # Better Auth client/server
    ├── queries/       # Convex query factories
    ├── providers/     # QueryClient + ConvexQueryClient
    └── theme/         # ThemeProvider + useTheme
```

## WHERE TO LOOK

| Task | Location |
|------|----------|
| Add dashboard page | `src/routes/dashboard/` - create `pagename/route.tsx` |
| Add UI component | `src/components/ui/` - shadcn pattern |
| Add Convex query | `src/lib/queries/` - query factory |
| Modify auth | `src/lib/auth/` - client.ts or server.ts |
| Change theme | `src/lib/theme/` |
| Add route loader | In route file: `export const Route = createFileRoute(...)` |

## ROUTING (TanStack Router)

```typescript
// File-based routing: src/routes/dashboard/signals/route.tsx
// URL: /dashboard/signals

// Route with loader
export const Route = createFileRoute('/dashboard/signals')({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(signalsQueryOptions());
  },
  component: SignalsPage,
});

// Dynamic route: src/routes/dashboard/trades/$signalId/route.tsx
// Access params: const { signalId } = Route.useParams();
```

## CONVEX INTEGRATION

```typescript
// Query factory pattern (src/lib/queries/)
export const signalsQueryOptions = () =>
  convexQuery(api.signals.list, { limit: 50 });

// In component
const { data } = useSuspenseQuery(signalsQueryOptions());

// Mutation
const mutation = useMutation(api.signals.create);
await mutation({ marketId, ... });
```

## DASHBOARD PAGES

| Route | Purpose |
|-------|---------|
| `/dashboard` | Overview with stats |
| `/dashboard/signals` | AI signal feed |
| `/dashboard/trades` | Trade history |
| `/dashboard/markets` | Market browser |
| `/dashboard/events` | Event listings |
| `/dashboard/watchlist` | User watchlist |
| `/dashboard/settings` | User settings |
