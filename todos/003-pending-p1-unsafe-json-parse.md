---
status: completed
priority: p1
issue_id: "003"
tags: [code-review, security, input-validation]
dependencies: []
completed_date: 2025-12-18
resolution: "Added Effect Schema validation for WebSocket and Historical API messages. Invalid messages are now rejected."
---

# Unsafe JSON.parse Without Schema Validation on WebSocket Messages

## Problem Statement

WebSocket messages are parsed with `JSON.parse()` and cast directly to `TradeMessage` without any runtime validation. Malicious or malformed messages could cause crashes, data corruption, or potential prototype pollution attacks.

**Why it matters:** External untrusted data from Polymarket WebSocket is trusted implicitly. A MITM attack or API change could inject malicious data into the system.

## Findings

**Location:** `src/services/polymarket/WebSocketService.ts:80`

```typescript
ws.addEventListener("message", (event) => {
  try {
    if (!event.data) return;
    const data = JSON.parse(event.data) as TradeMessage;  // UNSAFE
    Effect.runSync(Queue.offer(messageQueue, data));
  } catch (e) {
    console.error("Failed to parse message:", e);
  }
});
```

**Security Risks:**
1. **Prototype Pollution:** Malicious JSON like `{"__proto__": {"isAdmin": true}}` could modify object prototypes
2. **Type Confusion:** Missing fields cause silent failures in downstream processing
3. **DoS:** Malformed JSON causes unhandled exceptions

**Similar Issue in HistoricalService:**
`src/services/polymarket/HistoricalService.ts:57`
```typescript
const trades = response as HistoricalTrade[];  // No validation
```

## Proposed Solutions

### Option A: Effect Schema Validation (Recommended)
Use `@effect/schema` for runtime validation.

**Pros:**
- Type-safe runtime validation
- Already have @effect/schema in dependencies
- Integrates with Effect error handling

**Cons:**
- Slight performance overhead
- Requires defining schemas

**Effort:** Small (2-3 hours)
**Risk:** Low

```typescript
import { Schema } from "@effect/schema";

const TradePayloadSchema = Schema.Struct({
  conditionId: Schema.String,
  title: Schema.String,
  size: Schema.Number,
  price: Schema.Number,
  outcome: Schema.String,
  eventSlug: Schema.optional(Schema.String),
  // ... other fields
});

const TradeMessageSchema = Schema.Struct({
  type: Schema.String,
  topic: Schema.String,
  timestamp: Schema.Number,
  connection_id: Schema.String,
  payload: Schema.optional(TradePayloadSchema),
});

// In message handler
const parseResult = Schema.decodeUnknownEither(TradeMessageSchema)(
  JSON.parse(event.data)
);
if (Either.isLeft(parseResult)) {
  console.error("Invalid message:", parseResult.left);
  return;
}
const data = parseResult.right;
```

### Option B: Zod Validation
Use Zod for schema validation.

**Pros:**
- Popular, well-documented
- Good error messages

**Cons:**
- Adds new dependency
- Doesn't integrate with Effect as well

**Effort:** Small (2-3 hours)
**Risk:** Low

### Option C: Manual Validation
Add explicit field checks before processing.

**Pros:**
- No new patterns
- Simple to understand

**Cons:**
- Verbose
- Easy to miss fields
- No type inference

**Effort:** Small (1-2 hours)
**Risk:** Medium - easy to miss edge cases

## Recommended Action

**Option A** - Effect Schema validation. Consistent with codebase patterns, provides best type safety.

## Technical Details

**Affected Files:**
- `src/services/polymarket/WebSocketService.ts` - Add schema validation
- `src/services/polymarket/HistoricalService.ts` - Add schema validation for API response
- `src/domain/market/types.ts` - Define schemas (or new file)

## Acceptance Criteria

- [ ] TradeMessage schema defined with all required fields
- [ ] WebSocket messages validated before processing
- [ ] HistoricalTrade responses validated before processing
- [ ] Invalid messages logged and skipped (not crash)
- [ ] Type check passes

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-12-18 | Created finding from security review | External data must always be validated |

## Resources

- Security sentinel analysis
- @effect/schema documentation
- OWASP Input Validation guidelines
