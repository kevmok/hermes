# Framework Documentation Research: Building Scalable AI Analysis Services

**Research Date:** 2025-12-19
**Target Application:** Polymarket prediction analysis agent (AI workloads)

---

## Executive Summary

This document provides comprehensive research on four frameworks for building scalable AI analysis services: **Convex**, **Effect.ts**, **BullMQ**, and **Inngest**. Each framework offers different trade-offs for handling long-running AI operations, external API calls, and distributed workloads.

### Quick Comparison

| Feature              | Convex                   | Effect.ts                     | BullMQ                 | Inngest                    |
| -------------------- | ------------------------ | ----------------------------- | ---------------------- | -------------------------- |
| **Best For**         | Real-time + AI workflows | Type-safe service composition | Traditional job queues | Event-driven AI agents     |
| **Action Timeout**   | 10 minutes               | User-controlled               | User-controlled        | User-controlled            |
| **Retry Strategy**   | Built-in with Workpool   | Powerful Schedule API         | Customizable backoff   | Built-in durable execution |
| **Parallelism**      | Workpool component       | Effect.all + Fiber            | Worker concurrency     | Step.parallel              |
| **State Management** | Real-time database       | Layer-based DI                | Redis                  | Built-in durable state     |
| **Learning Curve**   | Low                      | High                          | Medium                 | Low-Medium                 |
| **Infrastructure**   | Managed (BaaS)           | Self-managed                  | Redis required         | Managed or self-hosted     |

---

## 1. Convex: Real-time Backend with AI Workflows

### Overview

Convex is a reactive database with TypeScript queries providing a complete backend platform. It excels at combining real-time subscriptions with AI workflows.

### Key Features for AI Workloads

#### Actions for External API Calls

- **Timeout:** 10 minutes (512MB memory for Node.js actions, 64MB for Convex runtime)
- **Use Case:** Call external AI APIs (OpenAI, Anthropic, etc.)
- **Best Practice:** Keep actions small - only non-deterministic code should be in actions

**Basic Action Example:**

```typescript
import { action } from "./_generated/server";

export const callOpenAI = action({
  args: { prompt: v.string() },
  handler: async (ctx, args) => {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [{ role: "user", content: args.prompt }],
      }),
    });

    const data = await response.json();
    return data.choices[0].message.content;
  },
});
```

#### Scheduled Functions and Crons

Convex supports flexible scheduling for recurring AI tasks.

**Cron Examples:**

```typescript
import * as crons from "convex/cron";
import { api } from "./generated/api";

// Hourly data sync
crons.hourly(
  "Hourly data sync",
  { minuteUTC: 0 },
  api.data.sync
);

// Daily analysis at specific time
crons.daily(
  "Daily market analysis",
  { hourUTC: 9, minuteUTC: 0 },
  api.analysis.runDaily
);

// Weekly report
crons.weekly(
  "Weekly reports",
  { hourUTC: 9, minuteUTC: 0, dayOfWeek: 1 }, // Monday
  api.reports.sendWeeklyReport
);

// Custom cron expression
crons.custom(
  "Custom schedule",
  "0 */6 * * *", // Every 6 hours
  api.tasks.customTask
);
```

#### Real-time Subscriptions

Perfect for live AI analysis updates.

**Subscription Pattern:**

```typescript
// Client-side (React)
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

function LivePredictions() {
  // Automatically updates when data changes
  const predictions = useQuery(api.predictions.list);

  return (
    <div>
      {predictions?.map(p => (
        <PredictionCard key={p._id} prediction={p} />
      ))}
    </div>
  );
}

// Server-side query
export const list = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("predictions")
      .order("desc")
      .take(10);
  },
});
```

#### Workpool Component for Long-Running Operations

**Critical for AI workloads** - manages parallelism and prevents resource exhaustion.

**Setup:**

```bash
npm install @convex-dev/workpool
```

```typescript
// convex/convex.config.ts
import { defineApp } from "convex/server";
import workpool from "@convex-dev/workpool/convex.config";

const app = defineApp();

// Separate pools for different priorities
app.use(workpool, { name: "aiWorkpool" });
app.use(workpool, { name: "analysisWorkpool" });

export default app;
```

**Usage Pattern:**

```typescript
import { Workpool } from "@convex-dev/workpool";
import { components } from "./_generated/api";

// Configure workpool
const aiPool = new Workpool(components.aiWorkpool, {
  maxParallelism: 5, // Max concurrent AI calls
  retryActionsByDefault: true,
  defaultRetryBehavior: {
    maxAttempts: 3,
    initialBackoffMs: 1000,
    base: 2, // Exponential: 1s, 2s, 4s
  },
  logLevel: "INFO",
});

// Enqueue action
export const analyzeMarket = mutation({
  args: { marketId: v.id("markets") },
  handler: async (ctx, args) => {
    // Enqueue AI analysis with retry logic
    const workId = await aiPool.enqueueAction(
      ctx,
      internal.ai.performAnalysis,
      { marketId: args.marketId },
      {
        retry: { maxAttempts: 5, initialBackoffMs: 500, base: 2 },
        runAfter: 0, // Run immediately
      }
    );

    return workId;
  },
});

// Batch enqueuing for efficiency
export const analyzeBatch = action({
  args: { marketIds: v.array(v.id("markets")) },
  handler: async (ctx, args) => {
    const workIds = await aiPool.enqueueActionBatch(
      ctx,
      internal.ai.performAnalysis,
      args.marketIds.map(id => ({ marketId: id })),
      { retry: true }
    );

    return { totalEnqueued: workIds.length };
  },
});
```

**Prevent OCC Errors with Serialized Mutations:**

```typescript
// Serialize mutations that update the same data
const counterPool = new Workpool(components.counterPool, {
  maxParallelism: 1, // Serialize to prevent conflicts
});

export const incrementCounter = internalMutation({
  handler: async (ctx) => {
    const counter = await ctx.db.query("globalCounter").unique();
    await ctx.db.patch(counter._id, { count: counter.count + 1 });
  },
});
```

### Best Practices for AI Workloads

1. **Action Timeouts:** 10-minute hard limit ([source](https://docs.convex.dev/functions/actions))
   - For longer operations, break into smaller steps or use continuation pattern
   - Schedule follow-up actions before timeout

2. **Use Workpool for Spiky Workloads** ([source](https://www.convex.dev/components/workpool))
   - Set `maxParallelism` based on rate limits and resources
   - Prevents overwhelming external APIs
   - Automatic retry with exponential backoff

3. **Keep Actions Idempotent** ([source](https://github.com/get-convex/convex-backend/issues/241))
   - Safe to retry without side effects
   - Critical for reliable AI workflows

4. **Rate Limiting** ([source](https://stack.convex.dev/rate-limiting))
   - Essential for AI workloads (costly LLM calls)
   - Use application-layer rate limiting
   - Prevent abuse in freemium models

5. **Agent Pattern for Long-Running Tasks** ([source](https://github.com/get-convex/agent/issues/199))
   - Stream agent responses
   - Track step completions
   - Schedule continuation actions before timeout

### Documentation URLs

- Actions: https://docs.convex.dev/functions/actions
- Crons: https://docs.convex.dev/scheduling/cron-jobs
- Workpool Component: https://www.convex.dev/components/workpool
- Rate Limiting: https://stack.convex.dev/rate-limiting
- AI Agents: https://docs.convex.dev/agents

---

## 2. Effect.ts: Functional Service Composition

### Overview

Effect.ts is a powerful TypeScript framework for building robust applications with a functional effect system. Excellent for complex service orchestration and type-safe error handling.

### Key Features

#### Service Composition with Layers

**Define Services:**

```typescript
import { Effect, Context, Layer } from "effect";

// Define service interfaces
class Logger extends Context.Tag("Logger")<
  Logger,
  { readonly log: (msg: string) => Effect.Effect<void> }
>() {}

class AIService extends Context.Tag("AIService")<
  AIService,
  {
    readonly analyze: (data: unknown) => Effect.Effect<Analysis, AIError>
    readonly predict: (input: PredictionInput) => Effect.Effect<Prediction, AIError>
  }
>() {}

class Database extends Context.Tag("Database")<
  Database,
  { readonly query: (sql: string) => Effect.Effect<unknown[]> }
>() {}
```

**Implement Layers:**

```typescript
// Logger implementation
const LoggerLive = Layer.succeed(Logger, {
  log: (msg) => Effect.sync(() => console.log(`[${new Date().toISOString()}] ${msg}`))
});

// Database with logger dependency
const DatabaseLive = Layer.effect(
  Database,
  Effect.gen(function* () {
    const logger = yield* Logger;
    yield* logger.log("Connecting to database...");

    return {
      query: (sql) =>
        Effect.gen(function* () {
          yield* logger.log(`Executing: ${sql}`);
          return [{ id: 1, name: "Alice" }];
        })
    };
  })
);

// AI service with dependencies
const AIServiceLive = Layer.effect(
  AIService,
  Effect.gen(function* () {
    const logger = yield* Logger;
    const db = yield* Database;

    return {
      analyze: (data) =>
        Effect.gen(function* () {
          yield* logger.log("Starting analysis...");
          // AI logic here
          return { score: 0.85, confidence: "high" };
        }),
      predict: (input) =>
        Effect.gen(function* () {
          yield* logger.log(`Predicting for input: ${JSON.stringify(input)}`);
          // Prediction logic
          return { outcome: "yes", probability: 0.75 };
        })
    };
  })
);

// Compose all layers
const AppLive = AIServiceLive.pipe(
  Layer.provide(DatabaseLive),
  Layer.provide(LoggerLive)
);
```

#### Parallel Execution with Effect.all

**Controlled Concurrency:**

```typescript
import { Effect } from "effect";

// Analyze multiple markets in parallel
const analyzeMarkets = (marketIds: string[]) => {
  return Effect.all(
    marketIds.map(id => analyzeMarket(id)),
    { concurrency: 5 } // Limit to 5 concurrent operations
  );
};

// Unbounded parallelism
const fetchAllData = Effect.all([
  Effect.succeed(1),
  Effect.succeed(2),
  Effect.succeed(3)
], { concurrency: "unbounded" });

// Race pattern - pick fastest result
const fastest = Effect.race(
  Effect.sleep("1 second").pipe(Effect.as("slow")),
  Effect.sleep("100 millis").pipe(Effect.as("fast"))
); // Returns "fast"
```

**Real-world AI Pattern:**

```typescript
const analyzeWithMultipleModels = (input: string) => {
  return Effect.all({
    gpt4: callGPT4(input),
    claude: callClaude(input),
    gemini: callGemini(input),
  }, {
    concurrency: 3,
    mode: "either" // Return first success or all errors
  });
};
```

#### Retry and Timeout Strategies

**Schedule-based Retries:**

```typescript
import { Effect, Schedule } from "effect";

// Exponential backoff
const withRetry = Effect.retry(
  callAIAPI(prompt),
  Schedule.exponential("100 millis").pipe(
    Schedule.compose(Schedule.recurs(5)) // Max 5 retries
  )
);

// Fibonacci backoff
const fibonacci = Effect.retry(
  callExternalAPI(),
  Schedule.fibonacci("1 second")
);

// Spaced with delay
const spaced = Effect.retry(
  operation,
  Schedule.spaced("1 second") // Fixed 1s between retries
);

// Custom schedule
const customRetry = Effect.retry(
  operation,
  Schedule.whileInput<Error>((err) => err.name !== "UnrecoverableError")
    .pipe(Schedule.compose(Schedule.exponential("500 millis")))
);
```

**Timeout Patterns:**

```typescript
// Simple timeout
const withTimeout = Effect.timeout(
  longRunningAICall(),
  "30 seconds"
);

// Timeout with fallback
const withFallback = Effect.timeout(
  primaryAIService(),
  "5 seconds"
).pipe(
  Effect.orElse(() => fallbackAIService())
);
```

**Combined Retry + Timeout:**

```typescript
const resilientAICall = (prompt: string) => {
  return Effect.gen(function* () {
    const result = yield* callAI(prompt).pipe(
      Effect.timeout("10 seconds"),
      Effect.retry(
        Schedule.exponential("500 millis").pipe(
          Schedule.compose(Schedule.recurs(3))
        )
      )
    );
    return result;
  });
};
```

#### Queue and Fiber Patterns

**Queue for Work Distribution:**

```typescript
import { Effect, Queue } from "effect";

// Create bounded queue
const taskQueue = Effect.gen(function* () {
  const queue = yield* Queue.bounded<Task>(100);

  // Producer
  const producer = Effect.gen(function* () {
    for (let i = 0; i < 1000; i++) {
      yield* Queue.offer(queue, { id: i, data: `task-${i}` });
    }
  });

  // Consumer (worker)
  const consumer = Effect.gen(function* () {
    while (true) {
      const task = yield* Queue.take(queue);
      yield* processTask(task);
    }
  }).pipe(Effect.forever);

  // Run multiple workers in parallel
  const workers = Effect.all([
    consumer,
    consumer,
    consumer,
    consumer,
    consumer
  ], { concurrency: "unbounded" });

  yield* Effect.all([producer, workers], { concurrency: "unbounded" });
});
```

**Fiber-based Concurrency:**

```typescript
import { Effect, Fiber } from "effect";

// Fork work into separate fiber
const backgroundWork = Effect.gen(function* () {
  const fiber = yield* Effect.fork(longRunningTask());

  // Do other work
  yield* otherWork();

  // Join back to get result
  const result = yield* Fiber.join(fiber);
  return result;
});

// Fork multiple fibers
const parallelWork = Effect.gen(function* () {
  const fiber1 = yield* Effect.fork(task1());
  const fiber2 = yield* Effect.fork(task2());
  const fiber3 = yield* Effect.fork(task3());

  // Wait for all to complete
  const results = yield* Fiber.awaitAll([fiber1, fiber2, fiber3]);
  return results;
});

// Race fibers - first one wins
const raceWork = Effect.gen(function* () {
  const fiber1 = yield* Effect.fork(slowService());
  const fiber2 = yield* Effect.fork(fastService());

  const winner = yield* Fiber.race(fiber1, fiber2);
  return winner;
});
```

### Integration Patterns for External Systems

**HTTP Client with Retry:**

```typescript
import { HttpClient } from "@effect/platform";
import { Effect } from "effect";

const callAIAPI = Effect.gen(function* () {
  const client = yield* HttpClient.HttpClient;

  const response = yield* client.post("https://api.openai.com/v1/chat/completions", {
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4",
      messages: [{ role: "user", content: "Hello" }],
    }),
  }).pipe(
    HttpClient.retry({
      times: 3,
      schedule: Schedule.exponential("1 second")
    }),
    HttpClient.timeout("30 seconds")
  );

  const json = yield* response.json;
  return json;
});
```

**SQL Database Integration:**

```typescript
import { PgClient } from "@effect/sql-pg";
import { SqlClient } from "@effect/sql";
import { Effect } from "effect";

// Configure connection
const SqlLive = PgClient.layer({
  database: "predictions_db",
  host: "localhost",
  port: 5432,
  username: "user",
  password: "password"
});

// Query with automatic resource management
const getPredictions = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  const predictions = yield* sql<{
    readonly id: number
    readonly market_id: string
    readonly prediction: number
    readonly confidence: number
  }>`
    SELECT id, market_id, prediction, confidence
    FROM predictions
    WHERE created_at > NOW() - INTERVAL '24 hours'
    ORDER BY confidence DESC
  `;

  return predictions;
});

// Run with connection pool
Effect.runPromise(
  getPredictions.pipe(Effect.provide(SqlLive))
);
```

### Best Practices

1. **Use Layers for Dependency Injection** ([source](https://effect-ts.github.io/effect/))
   - Modular, testable architecture
   - Automatic dependency resolution
   - Easy to swap implementations (test vs production)

2. **Leverage Effect.all for Parallelism** ([source](https://effect-ts.github.io/effect/effect/Effect.ts.html))
   - Control concurrency with `concurrency` option
   - Use for independent AI model calls
   - Better than Promise.all for error handling

3. **Schedule API for Sophisticated Retries** ([source](https://effect-ts.github.io/effect/effect/Schedule.ts.html))
   - Exponential backoff for transient failures
   - Fibonacci for gradually increasing delays
   - Custom schedules for specific needs

4. **Queue + Fiber for Worker Pools**
   - Bounded queues prevent memory exhaustion
   - Multiple fibers for parallel processing
   - Better control than thread pools

5. **Type Safety Throughout**
   - Compile-time guarantees for service dependencies
   - Type-safe error handling
   - IDE autocomplete for entire workflow

### Documentation URLs

- Effect Website: https://effect-ts.github.io/effect/
- Effect GitHub: https://github.com/effect-ts/effect
- Effect Platform: https://github.com/effect-ts/effect/blob/main/packages/platform/README.md
- SQL Module: https://github.com/effect-ts/effect/blob/main/packages/sql/README.md

---

## 3. BullMQ: Redis-Based Job Queues

### Overview

BullMQ is a fast, reliable Redis-based distributed queue for Node.js. Battle-tested for high-volume job processing with excellent observability.

### Why BullMQ for AI Workloads

From [Kyle Rush's real-world experience](https://www.kylerush.org/posts/qwik-bullmq-postgres/):

- Handle LLM API latency with background jobs
- Retry failed LLM jobs automatically
- Rate limit jobs for OpenAI API limits
- Parallelize LLM calls to reduce latency

### Basic Setup

**Installation:**

```bash
npm install bullmq ioredis
```

**Queue Configuration:**

```typescript
import { Queue, Worker, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null, // Required for BullMQ
});

// Create queue
const aiQueue = new Queue('ai-analysis', { connection });
```

### Worker Patterns for AI

**Basic Worker:**

```typescript
import { Worker, Job } from 'bullmq';

const worker = new Worker(
  'ai-analysis',
  async (job: Job) => {
    console.log(`Processing job ${job.id} with data:`, job.data);

    // Call AI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [{ role: 'user', content: job.data.prompt }],
      }),
    });

    const result = await response.json();

    // Update progress
    await job.updateProgress(100);

    return result.choices[0].message.content;
  },
  {
    connection,
    concurrency: 5, // Process 5 jobs in parallel
  }
);

// Handle worker events
worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err);
});
```

**Sandboxed Processor (Separate Process):**

```typescript
// For CPU-intensive or isolated work
const worker = new Worker(
  'ai-analysis',
  path.join(__dirname, 'processor.js'), // Separate file
  {
    connection,
    useWorkerThreads: true, // Use worker threads instead of fork
  }
);

// processor.js
module.exports = async (job) => {
  // Job processing logic
  return await processAI(job.data);
};
```

### Retry Strategies for AI APIs

**Exponential Backoff:**

```typescript
await aiQueue.add(
  'analyze-market',
  { marketId: '123', prompt: 'Analyze this market...' },
  {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 1000, // Start with 1s, then 2s, 4s, 8s, 16s
    },
  }
);
```

**Fixed Backoff with Jitter:**

```typescript
await aiQueue.add(
  'ai-task',
  { data: 'task data' },
  {
    attempts: 8,
    backoff: {
      type: 'fixed',
      delay: 5000,
      jitter: 0.5, // ±50% randomness to prevent thundering herd
    },
  }
);
```

**Custom Backoff Strategy:**

```typescript
const worker = new Worker(
  'ai-queue',
  async (job) => {
    // Process job
  },
  {
    connection,
    settings: {
      backoffStrategy: (attemptsMade: number) => {
        // Custom logic
        if (attemptsMade < 3) return 1000 * attemptsMade;
        if (attemptsMade < 5) return 5000;
        return -1; // Give up
      },
    },
  }
);
```

**Rate Limit-Aware Retries:**

```typescript
import { Worker, RateLimitError, UnrecoverableError } from 'bullmq';

const worker = new Worker(
  'openai-calls',
  async (job) => {
    const [isRateLimited, duration] = await callOpenAI(job.data);

    if (isRateLimited) {
      await aiQueue.rateLimit(duration);

      // Check if we've exhausted retries
      if (job.attemptsStarted >= job.opts.attempts) {
        throw new UnrecoverableError('Rate limited and out of retries');
      }

      // Move back to wait status
      throw new RateLimitError();
    }

    return result;
  },
  {
    connection,
    limiter: {
      max: 10, // 10 jobs
      duration: 1000, // per second
    },
  }
);
```

### Rate Limiting for AI APIs

**Global Rate Limiting:**

```typescript
const aiQueue = new Queue('ai-analysis', {
  connection,
  limiter: {
    max: 50, // Max 50 jobs
    duration: 60000, // per minute (60,000ms)
  },
});
```

**Per-User Rate Limiting:**

```typescript
// Add job with rate limit key
await aiQueue.add(
  'user-analysis',
  { userId: 'user123', prompt: 'Analyze...' },
  {
    limiter: {
      max: 10,
      duration: 60000,
      groupKey: 'userId', // Rate limit per userId
    },
  }
);
```

**Remove Rate Limit:**

```typescript
// Clear rate limit immediately (e.g., after purchasing credits)
await aiQueue.removeRateLimitKey();
```

### Concurrency and Scaling

**Worker Concurrency:**

```typescript
const worker = new Worker(
  'ai-queue',
  async (job) => { /* process */ },
  {
    connection,
    concurrency: 10, // Process up to 10 jobs simultaneously
  }
);
```

**Multiple Workers (Recommended for Scale):**

```typescript
// Start multiple worker processes/containers
// Worker 1 (server-1)
const worker1 = new Worker('ai-queue', processor, { connection });

// Worker 2 (server-2)
const worker2 = new Worker('ai-queue', processor, { connection });

// Worker 3 (server-3)
const worker3 = new Worker('ai-queue', processor, { connection });
```

**Node.js Cluster Pattern:**

```javascript
const cluster = require('cluster');
const numWorkers = 8;

if (cluster.isMaster) {
  for (let i = 0; i < numWorkers; i++) {
    cluster.fork();
  }

  // Add jobs from master
  for (let i = 0; i < 500; i++) {
    await aiQueue.add('task', { data: i });
  }
} else {
  // Workers process jobs
  const worker = new Worker('ai-queue', processor, { connection });
}
```

### Monitoring and Observability

**Queue Events:**

```typescript
import { QueueEvents } from 'bullmq';

const queueEvents = new QueueEvents('ai-analysis', { connection });

queueEvents.on('completed', ({ jobId, returnvalue }) => {
  console.log(`Job ${jobId} completed with result:`, returnvalue);
});

queueEvents.on('failed', ({ jobId, failedReason }) => {
  console.error(`Job ${jobId} failed:`, failedReason);
});

queueEvents.on('progress', ({ jobId, data }) => {
  console.log(`Job ${jobId} progress:`, data);
});
```

**Job Status Queries:**

```typescript
// Get job by ID
const job = await aiQueue.getJob('job-123');
console.log(job.progress); // Current progress
console.log(job.attemptsStarted); // Retry count

// Get counts
const counts = await aiQueue.getJobCounts();
console.log(counts); // { waiting: 10, active: 5, completed: 100, failed: 2 }

// Get waiting jobs
const waitingJobs = await aiQueue.getWaiting();
const activeJobs = await aiQueue.getActive();
const failedJobs = await aiQueue.getFailed();
```

### Best Practices for AI Workloads

From [BullMQ at Scale guide](https://medium.com/@kaushalsinh73/bullmq-at-scale-queueing-millions-of-jobs-without-breaking-ba4c24ddf104) and [AI workflow observability](https://dev.to/lbd/using-bullmq-to-power-ai-workflows-with-observability-in-mind-1ieh):

1. **Monitor Queues Actively**
   - Worker failures can leave queues silently stuck
   - Set up alerts for failed jobs
   - Monitor queue depth and processing rate

2. **Prevent OOM with Concurrency Limits**
   - GPU-intensive workloads can exhaust memory
   - Start with low concurrency, scale up carefully
   - Use separate queues for different priority levels

3. **Implement Circuit Breakers**
   - Don't retry indefinitely on external API failures
   - Use `UnrecoverableError` for permanent failures
   - Implement backoff with max attempts

4. **Priority Queues for Critical Tasks**

   ```typescript
   await aiQueue.add('critical-analysis', data, { priority: 1 });
   await aiQueue.add('normal-analysis', data, { priority: 5 });
   await aiQueue.add('background-task', data, { priority: 10 });
   ```

5. **Dead Letter Queues**

   ```typescript
   const dlq = new Queue('failed-ai-tasks', { connection });

   worker.on('failed', async (job, err) => {
     if (job.attemptsMade >= job.opts.attempts) {
       await dlq.add('failed-task', {
         originalJob: job.data,
         error: err.message,
         attempts: job.attemptsMade,
       });
     }
   });
   ```

6. **Redis Connection Resilience**
   ```typescript
   const connection = new IORedis({
     host: 'localhost',
     port: 6379,
     maxRetriesPerRequest: null,
     retryStrategy: (times: number) => {
       return Math.max(Math.min(Math.exp(times), 20000), 1000);
     },
   });
   ```

### Documentation URLs

- BullMQ Official Docs: https://docs.bullmq.io
- BullMQ Guide: https://www.dragonflydb.io/guides/bullmq
- AI Workflows with BullMQ: https://dev.to/lbd/using-bullmq-to-power-ai-workflows-with-observability-in-mind-1ieh
- BullMQ at Scale: https://medium.com/@kaushalsinh73/bullmq-at-scale-queueing-millions-of-jobs-without-breaking-ba4c24ddf104

---

## 4. Inngest: Event-Driven Durable Functions

### Overview

Inngest provides durable execution that replaces queues, state management, and scheduling. Built specifically for reliable, multi-step AI workflows with automatic retries and observability.

### Why Inngest for AI Agents (2025)

From [Inngest's blog](https://www.inngest.com/blog/queues-are-no-longer-the-right-abstraction) and [comparison analysis](https://dev.to/yigit-konur/serverless-workflow-engines-40-tools-ranked-by-latency-cost-and-developer-experience-19h2):

**Key Differentiators:**

- **Durable Execution:** Code runs to completion even with failures/restarts
- **No Infrastructure:** Serverless-native, no Redis or queue management
- **Built-in Observability:** Full trace of every workflow step
- **AI-First Design:** RAG, multi-model chains, agentic flows with native support
- **Flow Control:** Concurrency, rate limiting, batching without extra code

### Basic Setup

**Installation:**

```bash
npm install inngest
```

**Define Client:**

```typescript
import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "polymarket-analyzer",
  eventKey: process.env.INNGEST_EVENT_KEY,
});
```

### Step Functions for AI Workflows

**Multi-Step Durable Workflow:**

```typescript
import { inngest } from "./client";

export const analyzeMarket = inngest.createFunction(
  { id: "analyze-market" },
  { event: "market/analysis.requested" },
  async ({ event, step }) => {
    // Step 1: Fetch market data (auto-retried on failure)
    const marketData = await step.run("fetch-market-data", async () => {
      const response = await fetch(`https://api.polymarket.com/markets/${event.data.marketId}`);
      return await response.json();
    });

    // Step 2: Call GPT-4 for analysis
    const analysis = await step.run("gpt4-analysis", async () => {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [{
            role: "user",
            content: `Analyze this prediction market: ${JSON.stringify(marketData)}`
          }],
        }),
      });
      return await response.json();
    });

    // Step 3: Call Claude for second opinion
    const secondOpinion = await step.run("claude-analysis", async () => {
      // Call Anthropic API
      return await callClaude(marketData);
    });

    // Step 4: Aggregate results
    const aggregated = await step.run("aggregate-analysis", async () => {
      return {
        marketId: event.data.marketId,
        gpt4Score: extractScore(analysis),
        claudeScore: extractScore(secondOpinion),
        consensus: calculateConsensus([analysis, secondOpinion]),
        timestamp: Date.now(),
      };
    });

    // Step 5: Save to database
    await step.run("save-to-db", async () => {
      return await db.predictions.insert(aggregated);
    });

    return aggregated;
  }
);
```

**Why This Works:**

- Each `step.run()` is idempotent - only runs once, even if function crashes
- Automatic retries with exponential backoff
- State persisted between steps
- Full observability in Inngest dashboard

### Parallel Execution

**Parallel Steps with Promise.all:**

```typescript
export const multiModelAnalysis = inngest.createFunction(
  { id: "multi-model-analysis" },
  { event: "analysis/multi-model" },
  async ({ event, step }) => {
    // Run multiple AI models in parallel
    const [gpt4, claude, gemini] = await Promise.all([
      step.run("gpt4", () => callGPT4(event.data.prompt)),
      step.run("claude", () => callClaude(event.data.prompt)),
      step.run("gemini", () => callGemini(event.data.prompt)),
    ]);

    // Aggregate results
    const consensus = await step.run("aggregate", () => {
      return calculateConsensus([gpt4, claude, gemini]);
    });

    return consensus;
  }
);
```

**Built-in Parallel Helper:**

```typescript
const results = await step.parallel(
  () => step.run("task-1", async () => await task1()),
  () => step.run("task-2", async () => await task2()),
  () => step.run("task-3", async () => await task3())
);
```

### AI-Specific Features

#### step.ai.infer() - Native AI Calls with Observability

**OpenAI Integration:**

```typescript
export const generateContent = inngest.createFunction(
  { id: "generate-content" },
  { event: "content/generate" },
  async ({ event, step }) => {
    const response = await step.ai.infer("call-openai", {
      model: step.ai.models.openai({ model: "gpt-4o" }),
      body: {
        messages: [{
          role: "user",
          content: event.data.prompt,
        }],
        temperature: 0.7,
      },
    });

    return response.choices[0].message.content;
  }
);
```

**Benefits:**

- Automatic AI observability and metrics
- Request/response logged for debugging
- Function execution paused during AI call (saves serverless costs)
- Strongly typed responses

#### step.ai.wrap() - Wrap Existing AI SDKs

**Vercel AI SDK Integration:**

```typescript
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

export const wrappedAI = inngest.createFunction(
  { id: "wrapped-ai" },
  { event: "ai/wrapped" },
  async ({ event, step }) => {
    const { text } = await step.ai.wrap(
      "generate-text",
      generateText,
      {
        model: openai("gpt-4o"),
        prompt: event.data.prompt,
      }
    );

    return text;
  }
);
```

### Wait for Events Pattern (Perfect for AI Agents)

**Interactive AI Workflow:**

```typescript
export const interactiveAgent = inngest.createFunction(
  { id: "interactive-agent" },
  { event: "agent/start" },
  async ({ event, step }) => {
    // Generate suggestions
    const suggestions = await step.run("generate-suggestions", async () => {
      const completion = await openai.createCompletion({
        model: "gpt-4",
        prompt: buildPrompt(event.data.input),
        n: 3,
      });
      return {
        completionId: completion.data.id,
        suggestions: completion.data.choices,
      };
    });

    // Send to user via WebSocket
    await step.run("send-suggestions", () => {
      return websocket.send(event.data.userId, {
        type: "suggestions",
        data: suggestions,
      });
    });

    // Wait up to 5 minutes for user selection
    const selection = await step.waitForEvent("wait-for-selection", {
      event: "agent/user.selected",
      timeout: "5m",
      if: `async.data.completionId == "${suggestions.completionId}"`,
    });

    if (!selection) {
      // Timeout - handle gracefully
      await step.run("handle-timeout", () => {
        return websocket.send(event.data.userId, {
          type: "timeout",
          message: "Selection timed out",
        });
      });
      return;
    }

    // Process user selection
    const result = await step.run("process-selection", async () => {
      return await generateFullResponse(selection.data.choice);
    });

    return result;
  }
);
```

### Retry Strategies

**Default Behavior:**

- Automatic retries with exponential backoff
- Up to 4 retries by default
- Can be customized per function or per step

**Custom Retry Configuration:**

```typescript
export const resilientFunction = inngest.createFunction(
  {
    id: "resilient-function",
    retries: 5, // Function-level retry config
  },
  { event: "task/execute" },
  async ({ event, step }) => {
    // This step inherits function-level retry config
    const result = await step.run("api-call", async () => {
      return await callExternalAPI();
    });

    return result;
  }
);
```

**Conditional Retries:**

```typescript
// Retry only on specific errors
export const conditionalRetry = inngest.createFunction(
  { id: "conditional-retry" },
  { event: "task/conditional" },
  async ({ event, step }) => {
    try {
      return await step.run("risky-operation", async () => {
        return await riskyAPI();
      });
    } catch (error) {
      if (error.name === "UnrecoverableError") {
        // Don't retry, fail immediately
        throw error;
      }
      // Other errors will be retried automatically
      throw error;
    }
  }
);
```

### Scheduling and Delays

**Sleep Between Steps:**

```typescript
export const delayedWorkflow = inngest.createFunction(
  { id: "delayed-workflow" },
  { event: "workflow/delayed" },
  async ({ event, step }) => {
    await step.run("initial-task", async () => {
      return await initialProcessing();
    });

    // Wait 5 minutes before next step
    await step.sleep("wait-5-minutes", "5m");

    await step.run("delayed-task", async () => {
      return await delayedProcessing();
    });
  }
);
```

**Sleep Durations:**

- `"5s"` - 5 seconds
- `"10m"` - 10 minutes
- `"2h"` - 2 hours
- `"1d"` - 1 day
- `"7d"` - 7 days

### Function Invocation (Composition)

**Call Other Functions:**

```typescript
// Reusable function
export const sendEmail = inngest.createFunction(
  { id: "send-email" },
  { event: "email/send" },
  async ({ event, step }) => {
    return await step.run("send", async () => {
      return await emailService.send(event.data);
    });
  }
);

// Orchestrator function
export const processOrder = inngest.createFunction(
  { id: "process-order" },
  { event: "order/created" },
  async ({ event, step }) => {
    const order = await step.run("create-order", async () => {
      return await db.orders.create(event.data);
    });

    // Invoke email function
    await step.invoke("send-confirmation", {
      function: sendEmail,
      data: {
        to: event.data.email,
        subject: "Order confirmed",
        orderId: order.id,
      },
    });

    return order;
  }
);
```

### Concurrency and Rate Limiting

**Concurrency Control:**

```typescript
export const rateLimitedFunction = inngest.createFunction(
  {
    id: "rate-limited-function",
    concurrency: {
      key: "event.data.userId",
      limit: 10, // Max 10 concurrent executions per user
    },
  },
  { event: "task/execute" },
  async ({ event, step }) => {
    // Your logic here
  }
);
```

**Rate Limiting:**

```typescript
export const apiCalls = inngest.createFunction(
  {
    id: "api-calls",
    rateLimit: {
      limit: 100,
      period: "1m", // 100 calls per minute
      key: "event.data.apiKey",
    },
  },
  { event: "api/call" },
  async ({ event, step }) => {
    return await step.run("call-api", async () => {
      return await externalAPI.call(event.data);
    });
  }
);
```

### Real-World AI Agent Example

```typescript
export const marketAnalysisAgent = inngest.createFunction(
  {
    id: "market-analysis-agent",
    concurrency: {
      key: "event.data.userId",
      limit: 5, // Max 5 concurrent analyses per user
    },
  },
  { event: "market/analyze" },
  async ({ event, step }) => {
    // 1. Fetch market data
    const markets = await step.run("fetch-markets", async () => {
      return await polymarket.getMarkets(event.data.query);
    });

    // 2. Analyze each market in parallel (with limit)
    const analyses = await Promise.all(
      markets.slice(0, 10).map((market, idx) =>
        step.run(`analyze-market-${idx}`, async () => {
          const response = await step.ai.infer(`gpt4-${idx}`, {
            model: step.ai.models.openai({ model: "gpt-4o" }),
            body: {
              messages: [{
                role: "system",
                content: "You are a prediction market analyst."
              }, {
                role: "user",
                content: `Analyze: ${JSON.stringify(market)}`
              }],
            },
          });
          return {
            marketId: market.id,
            analysis: response.choices[0].message.content,
          };
        })
      )
    );

    // 3. Send results to user
    await step.run("notify-user", async () => {
      return await notifications.send({
        userId: event.data.userId,
        type: "analysis-complete",
        data: analyses,
      });
    });

    // 4. Wait for user feedback (optional)
    const feedback = await step.waitForEvent("wait-for-feedback", {
      event: "user/feedback",
      timeout: "24h",
      if: `async.data.userId == "${event.data.userId}"`,
    });

    if (feedback) {
      // 5. Refine analysis based on feedback
      await step.run("refine-analysis", async () => {
        return await refineWithFeedback(analyses, feedback.data);
      });
    }

    return { analyses, feedback };
  }
);
```

### Best Practices

From [Inngest documentation](https://www.inngest.com/docs) and [comparison analyses](https://akka.io/blog/inngest-vs-temporal):

1. **Use Steps for Everything**
   - Each `step.run()` is automatically retried
   - State persisted between steps
   - Full observability for debugging

2. **Leverage step.ai Features**
   - Use `step.ai.infer()` for observability
   - Wrap existing SDKs with `step.ai.wrap()`
   - Get automatic metrics and logging

3. **Composition Over Monoliths**
   - Use `step.invoke()` to call other functions
   - Build reusable function libraries
   - Better than one massive workflow

4. **Handle Timeouts Gracefully**
   - Use `step.waitForEvent()` with timeouts
   - Provide fallback paths
   - Don't leave users hanging

5. **Concurrency Control**
   - Set per-user limits with `concurrency.key`
   - Prevent API rate limit violations
   - Protect external services

6. **Monitor Everything**
   - Inngest dashboard shows full execution trace
   - Set up alerts for failures
   - Review slow steps

7. **Test with Dev Server**
   - Local development mode
   - Replay executions
   - Edit prompts and rerun steps

### Documentation URLs

- Inngest Docs: https://www.inngest.com/docs
- AI Features: https://www.inngest.com/docs/features/inngest-functions/steps-workflows/step-ai-orchestration
- Step Functions: https://www.inngest.com/learn/inngest-steps
- AgentKit: https://www.inngest.com/docs/features/inngest-functions/steps-workflows/step-ai-orchestration
- GitHub: https://github.com/inngest/inngest

---

## Framework Comparison Matrix

### Use Case Recommendations

| Use Case                          | Best Framework    | Reason                                                   |
| --------------------------------- | ----------------- | -------------------------------------------------------- |
| **Real-time predictions + AI**    | Convex            | Native real-time subscriptions + Workpool for AI         |
| **Complex service orchestration** | Effect.ts         | Best-in-class dependency injection and type safety       |
| **High-volume job processing**    | BullMQ            | Battle-tested, excellent scaling, Redis-backed           |
| **Multi-step AI agents**          | Inngest           | Durable execution, native AI features, no infrastructure |
| **Event-driven workflows**        | Inngest           | Built for event-driven architecture                      |
| **Existing Redis infrastructure** | BullMQ            | Leverage existing investment                             |
| **Type-safe everything**          | Effect.ts         | Compile-time guarantees throughout                       |
| **Serverless deployment**         | Inngest or Convex | No infrastructure management                             |

### Technical Comparison

#### Retry Mechanisms

- **Convex:** Workpool retry with exponential backoff
- **Effect.ts:** Powerful Schedule API with multiple strategies
- **BullMQ:** Configurable backoff (exponential, fixed, custom, jitter)
- **Inngest:** Automatic retry with exponential backoff (simplest)

#### Parallelism

- **Convex:** Workpool with `maxParallelism` setting
- **Effect.ts:** `Effect.all` with `concurrency` option + Fiber pools
- **BullMQ:** Worker `concurrency` + multiple workers
- **Inngest:** `step.parallel` + concurrency keys

#### State Management

- **Convex:** Built-in reactive database
- **Effect.ts:** Layer-based dependency injection
- **BullMQ:** Redis (external state store)
- **Inngest:** Built-in durable state per workflow

#### Observability

- **Convex:** Logs + real-time dashboard
- **Effect.ts:** Custom logging via services
- **BullMQ:** QueueEvents + external tools (Bull Board)
- **Inngest:** Best-in-class built-in dashboard with full traces

#### Cost Structure

- **Convex:** Managed service pricing (pay per operation)
- **Effect.ts:** Self-hosted (compute + infrastructure costs)
- **BullMQ:** Redis hosting + compute costs
- **Inngest:** Managed service pricing (pay per step) or self-hosted

### Integration Complexity

**Easiest to Hardest:**

1. **Inngest** - Drop-in durable functions, minimal config
2. **Convex** - Simple BaaS, requires learning Convex patterns
3. **BullMQ** - Needs Redis setup, standard queue patterns
4. **Effect.ts** - Steep learning curve, functional programming paradigm

---

## Recommendations for Polymarket Prediction Agent

Based on the research, here are recommendations for different scenarios:

### Scenario 1: MVP with Real-time Updates

**Framework:** Convex + Workpool

**Why:**

- Real-time subscriptions for live prediction updates
- Workpool handles AI API calls with retry
- Simple setup, managed infrastructure
- Built-in scheduling for periodic analysis

**Sample Architecture:**

```typescript
// Convex schema
predictions: defineTable({
  marketId: v.string(),
  analysis: v.string(),
  confidence: v.number(),
  model: v.string(),
  createdAt: v.number(),
})

// Action with Workpool
export const analyzeMarket = mutation({
  handler: async (ctx, args) => {
    await aiPool.enqueueAction(
      ctx,
      internal.ai.runAnalysis,
      { marketId: args.marketId }
    );
  },
});

// Real-time subscription
const predictions = useQuery(api.predictions.list);
```

### Scenario 2: Complex Multi-Model Analysis

**Framework:** Effect.ts

**Why:**

- Compose multiple AI services (GPT-4, Claude, Gemini)
- Type-safe error handling across service boundaries
- Powerful retry strategies for different providers
- Parallel execution with controlled concurrency

**Sample Architecture:**

```typescript
// Service composition
const AnalysisLive = Layer.merge(
  GPT4ServiceLive,
  ClaudeServiceLive,
  GeminiServiceLive
).pipe(
  Layer.provide(HttpClientLive),
  Layer.provide(DatabaseLive)
);

// Multi-model analysis
const analyze = Effect.gen(function* () {
  const [gpt4, claude, gemini] = yield* Effect.all([
    GPT4Service.pipe(Effect.flatMap(s => s.analyze(input))),
    ClaudeService.pipe(Effect.flatMap(s => s.analyze(input))),
    GeminiService.pipe(Effect.flatMap(s => s.analyze(input))),
  ], { concurrency: 3 });

  return aggregateResults([gpt4, claude, gemini]);
});
```

### Scenario 3: High-Volume Background Jobs

**Framework:** BullMQ

**Why:**

- Battle-tested for millions of jobs
- Excellent observability and monitoring
- Fine-grained control over retries and rate limiting
- Works with existing Redis infrastructure

**Sample Architecture:**

```typescript
// Queue setup
const analysisQueue = new Queue('market-analysis', { connection });

// Worker with retry logic
const worker = new Worker(
  'market-analysis',
  async (job) => {
    return await analyzeMarket(job.data);
  },
  {
    connection,
    concurrency: 10,
    limiter: {
      max: 50,
      duration: 60000, // 50 per minute
    },
  }
);

// Add jobs
await analysisQueue.add(
  'analyze',
  { marketId: '123' },
  {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  }
);
```

### Scenario 4: Event-Driven AI Agent

**Framework:** Inngest

**Why:**

- Built for multi-step AI workflows
- Native AI observability with `step.ai`
- Durable execution without infrastructure
- Perfect for interactive agents with `step.waitForEvent`

**Sample Architecture:**

```typescript
export const agentWorkflow = inngest.createFunction(
  {
    id: "prediction-agent",
    concurrency: { key: "event.data.userId", limit: 3 },
  },
  { event: "agent/query" },
  async ({ event, step }) => {
    // Step 1: Analyze markets
    const analysis = await step.ai.infer("analyze", {
      model: step.ai.models.openai({ model: "gpt-4o" }),
      body: {
        messages: [{
          role: "user",
          content: `Analyze: ${event.data.query}`
        }],
      },
    });

    // Step 2: Send suggestions
    await step.run("send-suggestions", () => {
      return sendToUser(event.data.userId, analysis);
    });

    // Step 3: Wait for user action
    const userAction = await step.waitForEvent("wait-for-action", {
      event: "agent/user.action",
      timeout: "1h",
      if: `async.data.userId == "${event.data.userId}"`,
    });

    // Step 4: Process action
    if (userAction) {
      return await step.run("process-action", () => {
        return processUserAction(userAction.data);
      });
    }
  }
);
```

---

## Hybrid Approach

For maximum flexibility, consider combining frameworks:

### Convex + BullMQ

- **Convex:** Real-time UI updates, lightweight tasks
- **BullMQ:** Heavy AI processing, batch operations
- **Connection:** Convex actions enqueue BullMQ jobs, write results back

### Effect.ts + Any Queue

- **Effect.ts:** Core business logic, service composition
- **Queue:** Job distribution layer
- **Benefit:** Type-safe services with scalable job processing

### Inngest + Convex

- **Inngest:** Durable AI workflows
- **Convex:** Real-time data layer
- **Connection:** Inngest sends events to trigger Convex mutations

---

## Additional Resources

### Research Sources

#### Convex

- [Actions Documentation](https://docs.convex.dev/functions/actions)
- [Workpool Component](https://www.convex.dev/components/workpool)
- [Long-Running Agents Issue](https://github.com/get-convex/agent/issues/199)
- [Rate Limiting Guide](https://stack.convex.dev/rate-limiting)
- [Action Timeout Issue](https://github.com/get-convex/convex-backend/issues/241)

#### Effect.ts

- [Effect.ts Website](https://effect-ts.github.io/effect/)
- [Effect GitHub Repository](https://github.com/effect-ts/effect)
- [Effect Platform Docs](https://github.com/effect-ts/effect/blob/main/packages/platform/README.md)
- [Message Queue Patterns for AI](https://sparkco.ai/blog/message-queue-patterns-for-ai-task-distribution)

#### BullMQ

- [BullMQ Official Documentation](https://docs.bullmq.io)
- [BullMQ Ultimate Guide](https://www.dragonflydb.io/guides/bullmq)
- [BullMQ at Scale](https://medium.com/@kaushalsinh73/bullmq-at-scale-queueing-millions-of-jobs-without-breaking-ba4c24ddf104)
- [Using BullMQ for AI Workflows](https://dev.to/lbd/using-bullmq-to-power-ai-workflows-with-observability-in-mind-1ieh)
- [JavaScript Stack for LLM Workloads](https://www.kylerush.org/posts/qwik-bullmq-postgres/)
- [Async Prompt Queue for LLMs](https://dev.co/ai/async-prompt-queue-for-llms)

#### Inngest

- [Inngest Documentation](https://www.inngest.com/docs)
- [Inngest vs Temporal Comparison](https://akka.io/blog/inngest-vs-temporal)
- [Queues Abstraction Blog](https://www.inngest.com/blog/queues-are-no-longer-the-right-abstraction)
- [Simplifying Queues](https://www.inngest.com/blog/simplifying-queues-modern-kafka-alternative)
- [Serverless Workflow Engines Comparison](https://dev.to/yigit-konur/serverless-workflow-engines-40-tools-ranked-by-latency-cost-and-developer-experience-19h2)
- [Inngest GitHub](https://github.com/inngest/inngest)

### Community Insights

- [AI Workload Management Best Practices](https://www.mirantis.com/blog/ai-workloads-management-and-best-practices/)
- [Worker Pool Design Pattern](https://dev.to/zeedu_dev/worker-pool-design-pattern-explanation-3kil)

---

## Conclusion

Each framework has distinct strengths:

- **Convex:** Best for real-time + AI hybrid apps (easiest setup)
- **Effect.ts:** Best for complex, type-safe service composition (highest quality)
- **BullMQ:** Best for high-volume, proven job processing (most battle-tested)
- **Inngest:** Best for event-driven AI agents (most AI-native)

For the Polymarket prediction agent, **I recommend starting with Inngest** if building an interactive agent with multi-step workflows, or **Convex + Workpool** if real-time updates are critical to the UX.

For maximum scale and control, consider **Effect.ts** or **BullMQ**, but be prepared for more infrastructure management.

---

**Last Updated:** 2025-12-19
**Next Review:** As frameworks release major updates or new AI-specific features
