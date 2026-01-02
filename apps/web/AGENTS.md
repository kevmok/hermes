# WEB - Dashboard

TanStack Start React 19 dashboard with real-time Convex data, subscription billing, and AI signal visualization.

## STRUCTURE

```
src/
├── router.tsx           # TanStack Router setup + SSR query integration
├── routeTree.gen.ts     # Auto-generated route tree (DO NOT EDIT)
├── styles.css           # Global styles (Tailwind v4)
├── components/
│   ├── ui/              # shadcn/ui primitives (25 components)
│   └── landing/         # Landing page (landing-page.tsx - 1649 lines)
├── routes/
│   ├── __root.tsx       # Root layout (providers, theme)
│   ├── index.tsx        # Landing page
│   ├── (auth)/          # Auth routes (login, callback)
│   ├── dashboard/       # Protected dashboard (see below)
│   └── api/             # API routes (auth, billing handlers)
├── hooks/               # Custom hooks (use-mobile)
└── lib/
    ├── auth/            # Better Auth client/server
    ├── queries/         # Convex query factories (6 files)
    ├── providers/       # QueryClient + ConvexQueryClient
    └── theme/           # ThemeProvider + useTheme
```

## WHERE TO LOOK

| Task                | Location                                     |
| ------------------- | -------------------------------------------- |
| Add dashboard page  | `src/routes/dashboard/[name]/index.tsx`      |
| Add page components | `src/routes/dashboard/[name]/-components/`   |
| Add UI component    | `src/components/ui/` (shadcn pattern)        |
| Add Convex query    | `src/lib/queries/` - query factory           |
| Modify auth         | `src/lib/auth/` - client.ts or server.ts     |
| Change theme        | `src/lib/theme/`                             |
| Modify billing      | `autumn.config.ts` (feature gates)           |

## DASHBOARD ROUTES

| Route                    | Purpose                     |
| ------------------------ | --------------------------- |
| `/dashboard`             | Overview with stats         |
| `/dashboard/trades`      | AI signal feed              |
| `/dashboard/trades/$id`  | Signal detail view          |
| `/dashboard/alerts`      | Smart trigger alerts        |
| `/dashboard/events`      | Event listings              |
| `/dashboard/events/$id`  | Event detail + markets      |
| `/dashboard/performance` | Signal accuracy metrics     |
| `/dashboard/portfolio`   | User tracked positions      |
| `/dashboard/whales`      | Smart money tracking        |
| `/dashboard/settings`    | User preferences            |
| `/dashboard/pricing`     | Subscription plans          |

## ROUTING PATTERNS

### File Conventions
```
dashboard/
├── route.tsx              # Layout + auth gate + navbar
├── index.tsx              # Dashboard home view
├── -components/           # Shared dashboard components
│   ├── navbar.tsx
│   ├── stats-bar.tsx
│   └── stat-card.tsx
├── trades/
│   ├── route.tsx          # Search params validation + loader
│   ├── index.tsx          # Signals list view
│   └── -components/       # Trade-specific components
│       ├── signals-table.tsx
│       └── signal-columns.tsx
└── trades/$signalId/
    ├── index.tsx          # Signal detail view
    └── -components/       # Detail-specific components
        └── consensus-viz.tsx
```

### Key Rules
- **`-components/`**: Route-local components. `-` prefix = ignored by router
- **`route.tsx`**: Defines loader, search params, layout with `<Outlet />`
- **`index.tsx`**: Default/leaf view for the route
- **Hoisting**: Move components UP the tree as they become more shared

### Route Definition
```typescript
// route.tsx - with search params and loader
export const Route = createFileRoute('/dashboard/trades')({
  validateSearch: z.object({
    page: z.number().optional().default(1),
    filter: z.enum(['all', 'high']).optional(),
  }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(signalsQueryOptions());
  },
  component: TradesLayout,
});
```

## CONVEX INTEGRATION

```typescript
// Query factory pattern (src/lib/queries/)
import { convexQuery } from "@convex-dev/react-query";
import { api } from "backend/convex/_generated/api";

export const signalsQueries = {
  list: (limit = 50) => convexQuery(api.signals.list, { limit }),
  byId: (id: Id<"signals">) => convexQuery(api.signals.getById, { id }),
};

// In component
const { data } = useQuery(signalsQueries.list(20));

// Mutation
const { mutate } = useMutation({
  mutationFn: useConvexMutation(api.analysis.requestQuickAnalysis),
});
```

## SUBSCRIPTION GATING

```typescript
// dashboard/route.tsx handles auth + subscription check
// Redirects to /dashboard/pricing if no active subscription

// Feature-specific gates use Autumn.js
import { check } from "autumn-js/server";
const hasFeature = await check("whale_watch", { userId });
```

## ICONS

Uses `@hugeicons/core-free-icons` + `@hugeicons/react`:
```typescript
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUp01Icon, FlashIcon } from "@hugeicons/core-free-icons";

<HugeiconsIcon icon={ArrowUp01Icon} size={18} />
```
