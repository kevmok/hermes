---
status: completed
priority: p1
issue_id: "004"
tags: [code-review, security, performance, cost]
dependencies: []
completed_date: 2025-12-18
resolution: "Changed AI concurrency from unbounded to 3. Added exponential backoff retry schedule."
---

# No Rate Limiting on AI API Calls

## Problem Statement

The SwarmService calls multiple AI APIs with `concurrency: "unbounded"` and no rate limiting. This creates financial risk (unexpected API costs), availability risk (provider rate limits), and potential for runaway requests.

**Why it matters:** A bug in the analysis loop or misconfigured interval could trigger hundreds of API calls, resulting in significant unexpected costs and potential service denial from providers.

## Findings

**Location:** `src/services/ai/swarm.ts:189-194`

```typescript
const results = yield* Effect.all(
  models.map(({ name, layer }) =>
    queryWithLayer(name, layer, systemPrompt, userPrompt)
  ),
  { concurrency: "unbounded" }  // NO LIMIT
);
```

**Risk Analysis:**

- **Financial:** With 3 AI providers, each market analyzed costs ~$0.01-0.05. At 100 markets/hour = $1-5/hour. Misconfiguration could 100x this.
- **Availability:** OpenAI/Anthropic rate limits: ~60 requests/minute. Exceeding causes 429 errors and potential IP bans.
- **Operational:** No backpressure mechanism. Failed requests not tracked.

**Also Missing:**

- Retry with exponential backoff
- Request deduplication
- Cost tracking/alerts

## Proposed Solutions

### Option A: Bounded Concurrency + Rate Limiting (Recommended)

Add concurrency limits and rate limiting using Effect primitives.

**Pros:**

- Simple to implement
- Uses Effect.ts patterns
- Prevents most issues

**Cons:**

- Reduces throughput
- May need tuning

**Effort:** Small (2-3 hours)
**Risk:** Low

```typescript
import { Schedule, Duration, RateLimiter } from "effect";

// Limit concurrent AI calls
const results = yield* Effect.all(
  models.map(({ name, layer }) =>
    queryWithLayer(name, layer, systemPrompt, userPrompt).pipe(
      Effect.retry(
        Schedule.exponential(Duration.seconds(1)).pipe(
          Schedule.compose(Schedule.recurs(3))
        )
      )
    )
  ),
  { concurrency: 3 }  // Max 3 concurrent calls
);

// Add rate limiter (10 requests/second)
const rateLimiter = yield* RateLimiter.make({
  limit: 10,
  interval: Duration.seconds(1)
});
```

### Option B: Token Bucket Rate Limiter

Implement more sophisticated rate limiting per provider.

**Pros:**

- Allows bursts while preventing sustained overload
- Per-provider limits

**Cons:**

- More complex
- Requires tracking state per provider

**Effort:** Medium (4-6 hours)
**Risk:** Low

### Option C: Circuit Breaker Pattern

Add circuit breakers that trip on repeated failures.

**Pros:**

- Prevents cascade failures
- Auto-recovery

**Cons:**

- More complex setup
- Requires monitoring

**Effort:** Medium (4-6 hours)
**Risk:** Low

## Recommended Action

**Option A** - Bounded concurrency with retry. Quick win that prevents most issues. Add circuit breaker later if needed.

## Technical Details

**Affected Files:**

- `src/services/ai/swarm.ts` - Add concurrency limits and retry logic
- `src/config/constants.ts` - Add rate limit configuration

**New Configuration:**

```typescript
AI_MAX_CONCURRENT_REQUESTS: 3,
AI_RATE_LIMIT_PER_SECOND: 10,
AI_MAX_RETRIES: 3,
```

## Acceptance Criteria

- [ ] AI calls limited to max 3 concurrent
- [ ] Retry with exponential backoff on failures
- [ ] Rate limiting prevents >10 requests/second
- [ ] Failed requests logged with error details
- [ ] Type check passes

## Work Log

| Date       | Action                               | Learnings                                                    |
| ---------- | ------------------------------------ | ------------------------------------------------------------ |
| 2025-12-18 | Created finding from security review | Unbounded external API calls are financial/availability risk |

## Resources

- Security sentinel analysis
- Effect.ts Rate Limiter documentation
- OpenAI/Anthropic rate limit documentation
