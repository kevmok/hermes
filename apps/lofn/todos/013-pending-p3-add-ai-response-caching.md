---
status: pending
priority: p3
issue_id: "013"
tags: [code-review, performance, cost]
dependencies: []
---

# No Caching of AI Model Responses

## Problem Statement

Same market might be analyzed multiple times with identical prompts, wasting API costs and time.

## Findings

**Location:** `src/services/ai/swarm.ts`

No caching mechanism exists. If analysis runs multiple times on same market data, each query goes to AI providers.

**Potential Savings:** 50-90% reduction in API costs if markets are re-analyzed.

## Proposed Solution

Implement response caching based on prompt hash:

```typescript
const responseCacheRef = yield* Ref.make(new Map<string, { response: SwarmResponse; timestamp: number }>());

const query = (systemPrompt: string, userPrompt: string) =>
  Effect.gen(function* () {
    const cacheKey = `${hash(systemPrompt)}-${hash(userPrompt)}`;
    const cache = yield* Ref.get(responseCacheRef);

    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 3600000) { // 1 hour TTL
      console.log("Cache hit for market analysis");
      return cached.response;
    }

    const response = yield* queryModels(systemPrompt, userPrompt);
    cache.set(cacheKey, { response, timestamp: Date.now() });
    return response;
  });
```

**Effort:** Small (2 hours)
**Risk:** Low

## Acceptance Criteria

- [ ] Responses cached with configurable TTL
- [ ] Cache hits logged for monitoring
- [ ] API costs reduced for repeat analyses
