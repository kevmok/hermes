---
status: pending
priority: p3
issue_id: "015"
tags: [code-review, patterns, error-handling]
dependencies: []
---

# No Custom Error Types for Domain Errors

## Problem Statement

All errors are generic. No custom error classes or tagged errors for better error handling and debugging.

## Findings

**Current State:** Errors are `unknown` or generic `Error` objects throughout the codebase.

**Missing Patterns:**

- No `DataLoadError` for file operations
- No `ApiError` for external API calls
- No `ValidationError` for input validation

## Proposed Solution

Define domain-specific error types using Effect.Data:

```typescript
import { Data } from "effect";

export class DataLoadError extends Data.TaggedError("DataLoadError")<{
  filename: string;
  cause: unknown;
}> {}

export class ApiError extends Data.TaggedError("ApiError")<{
  endpoint: string;
  status: number;
}> {}

export class ValidationError extends Data.TaggedError("ValidationError")<{
  field: string;
  message: string;
}> {}
```

Then use with `Effect.catchTag`:

```typescript
effect.pipe(
  Effect.catchTag("DataLoadError", (error) => {
    console.error(`Failed to load ${error.filename}`);
    return Effect.void;
  })
)
```

**Effort:** Medium (3-4 hours)
**Risk:** Low

## Acceptance Criteria

- [ ] Domain error types defined
- [ ] Services use tagged errors
- [ ] Error handling uses catchTag for specific errors
