import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

export const env = createEnv({
  /**
   * The prefix that client-side variables must have. This is enforced both at
   * a type-level and at runtime.
   */
  clientPrefix: 'VITE_',

  client: {
    VITE_CONVEX_SITE_URL: z.string().min(1),
    VITE_CONVEX_URL: z.string().min(1),
  },

  runtimeEnv: import.meta.env,
  emptyStringAsUndefined: true,
});
