import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

crons.interval(
  'Update market resolutions',
  { hours: 1 },
  internal.resolution.runResolutionUpdater,
);

crons.daily(
  'Clean up old snapshots',
  { hourUTC: 4, minuteUTC: 0 },
  internal.scheduledJobs.cleanupOldData,
);

crons.hourly(
  'Send daily digest emails (check each hour)',
  { minuteUTC: 0 },
  internal.notifications.email.sendDailyDigest,
);

crons.weekly(
  'Send weekly digest emails',
  { dayOfWeek: 'sunday', hourUTC: 9, minuteUTC: 0 },
  internal.notifications.email.sendWeeklyDigest,
);

export default crons;
