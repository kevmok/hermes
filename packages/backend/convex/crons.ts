import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

// Run automatic analysis every 30 minutes
crons.interval(
  'Automatic market analysis',
  { minutes: 30 },
  internal.scheduledJobs.runAutomaticAnalysis,
);

// Clean up old data daily at 4 AM UTC
crons.daily(
  'Clean up old snapshots',
  { hourUTC: 4, minuteUTC: 0 },
  internal.scheduledJobs.cleanupOldData,
);

export default crons;
