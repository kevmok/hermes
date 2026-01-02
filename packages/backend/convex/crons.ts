import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "Process batch analysis queue",
  { minutes: 30 },
  internal.analysis.processBatchAnalysis,
);

crons.interval(
  "Update market resolutions",
  { hours: 1 },
  internal.resolution.runResolutionUpdater,
);

crons.daily(
  "Clean up old snapshots",
  { hourUTC: 4, minuteUTC: 0 },
  internal.scheduledJobs.cleanupOldData,
);

crons.hourly(
  "Send daily digest emails (check each hour)",
  { minuteUTC: 0 },
  internal.notifications.email.sendDailyDigest,
);

crons.weekly(
  "Send weekly digest emails",
  { dayOfWeek: "sunday", hourUTC: 9, minuteUTC: 0 },
  internal.notifications.email.sendWeeklyDigest,
);

crons.interval(
  "Expire old smart triggers",
  { hours: 1 },
  internal.smartTriggers.expireOldTriggers,
);

crons.daily(
  "Cleanup old price snapshots",
  { hourUTC: 3, minuteUTC: 30 },
  internal.smartTriggers.cleanupOldSnapshots,
);

export default crons;
