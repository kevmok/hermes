import { v } from 'convex/values';
import {
  internalAction,
  internalMutation,
  internalQuery,
} from '../_generated/server';
import { internal } from '../_generated/api';
import { Resend } from '@convex-dev/resend';
import { components } from '../_generated/api';
import type { Id } from '../_generated/dataModel';

const resend = new Resend(components.resend, {});

const FROM_EMAIL = 'Hermes <alerts@hermes.trading>';
const DASHBOARD_URL = 'https://hermes.trading/dashboard';

export const sendSignalAlert = internalAction({
  args: {
    signalId: v.id('signals'),
  },
  returns: v.object({ sent: v.number(), skipped: v.number() }),
  handler: async (ctx, args): Promise<{ sent: number; skipped: number }> => {
    const signal = await ctx.runQuery(internal.signals.getSignalWithPredictionsInternal, {
      signalId: args.signalId,
    });

    if (!signal) return { sent: 0, skipped: 0 };

    const eligibleUsers = await ctx.runQuery(
      internal.notifications.email.getEligibleUsersForAlert,
      {
        consensusPercentage: signal.consensusPercentage,
        category: signal.marketCategory ?? 'general',
      },
    );

    let sent = 0;
    let skipped = 0;

    for (const user of eligibleUsers) {
      const alreadySent = await ctx.runQuery(
        internal.notifications.email.hasAlertBeenSent,
        { userId: user.userId, signalId: args.signalId },
      );

      if (alreadySent) {
        skipped++;
        continue;
      }

      try {
        const html = buildSignalAlertHtml(signal);

        await resend.sendEmail(ctx, {
          from: FROM_EMAIL,
          to: [user.email],
          subject: `${signal.consensusDecision} Signal: ${signal.market?.title?.slice(0, 50)}...`,
          html,
        });

        await ctx.runMutation(internal.notifications.email.logAlert, {
          userId: user.userId,
          signalId: args.signalId,
          channel: 'email',
        });

        sent++;
      } catch (error) {
        console.error(`Failed to send alert to ${user.email}:`, error);
      }
    }

    return { sent, skipped };
  },
});

export const sendDailyDigest = internalAction({
  args: {},
  returns: v.object({ sent: v.number() }),
  handler: async (ctx): Promise<{ sent: number }> => {
    const currentHourUTC = new Date().getUTCHours();
    const users = await ctx.runQuery(
      internal.notifications.email.getUsersForDigest,
      { frequency: 'daily', hourUTC: currentHourUTC },
    );

    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const signals = await ctx.runQuery(internal.signals.getSignalsSinceInternal, {
      since: oneDayAgo,
      limit: 10,
    });

    if (signals.length === 0) return { sent: 0 };

    const stats = await ctx.runQuery(
      internal.performanceMetrics.getPerformanceStatsInternal,
      {},
    );

    let sent = 0;

    for (const user of users) {
      try {
        const html = buildDailyDigestHtml(signals, stats);

        await resend.sendEmail(ctx, {
          from: FROM_EMAIL,
          to: [user.email],
          subject: `Daily Signal Digest: ${signals.length} New Signals`,
          html,
        });

        sent++;
      } catch (error) {
        console.error(`Failed to send digest to ${user.email}:`, error);
      }
    }

    return { sent };
  },
});

export const sendWeeklyDigest = internalAction({
  args: {},
  returns: v.object({ sent: v.number() }),
  handler: async (ctx): Promise<{ sent: number }> => {
    const users = await ctx.runQuery(
      internal.notifications.email.getUsersForDigest,
      { frequency: 'weekly', hourUTC: 9 },
    );

    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const signals = await ctx.runQuery(internal.signals.getSignalsSinceInternal, {
      since: oneWeekAgo,
      limit: 20,
    });

    const stats = await ctx.runQuery(
      internal.performanceMetrics.getPerformanceStatsInternal,
      { sinceDays: 7 },
    );

    let sent = 0;

    for (const user of users) {
      try {
        const html = buildWeeklyDigestHtml(signals, stats);

        await resend.sendEmail(ctx, {
          from: FROM_EMAIL,
          to: [user.email],
          subject: `Weekly Wrap-Up: ${signals.length} Signals This Week`,
          html,
        });

        sent++;
      } catch (error) {
        console.error(`Failed to send weekly digest to ${user.email}:`, error);
      }
    }

    return { sent };
  },
});

export const getEligibleUsersForAlert = internalQuery({
  args: {
    consensusPercentage: v.number(),
    category: v.string(),
  },
  returns: v.array(
    v.object({
      userId: v.id('user'),
      email: v.string(),
    }),
  ),
  handler: async (
    ctx,
    args,
  ): Promise<Array<{ userId: Id<'user'>; email: string }>> => {
    const prefs = await ctx.db
      .query('userPreferences')
      .filter((q) =>
        q.and(
          q.eq(q.field('emailAlerts'), true),
          q.eq(q.field('digestFrequency'), 'instant'),
        ),
      )
      .collect();

    const eligiblePrefs = prefs.filter((pref) => {
      const meetsThreshold =
        pref.alertThreshold === 'all' ||
        (pref.alertThreshold === 'medium' && args.consensusPercentage >= 60) ||
        (pref.alertThreshold === 'high' && args.consensusPercentage >= 80);

      const meetsCategory =
        pref.categories.length === 0 || pref.categories.includes(args.category);

      return meetsThreshold && meetsCategory;
    });

    const users = await Promise.all(
      eligiblePrefs.map(async (pref) => {
        const user = await ctx.db.get(pref.userId);
        return user ? { userId: pref.userId, email: user.email } : null;
      }),
    );

    return users.filter(
      (u): u is { userId: Id<'user'>; email: string } => u !== null,
    );
  },
});

export const getUsersForDigest = internalQuery({
  args: {
    frequency: v.union(v.literal('daily'), v.literal('weekly')),
    hourUTC: v.number(),
  },
  returns: v.array(
    v.object({
      userId: v.id('user'),
      email: v.string(),
    }),
  ),
  handler: async (
    ctx,
    args,
  ): Promise<Array<{ userId: Id<'user'>; email: string }>> => {
    const prefs = await ctx.db
      .query('userPreferences')
      .withIndex('by_digest', (q) =>
        q.eq('digestFrequency', args.frequency).eq('digestHourUTC', args.hourUTC),
      )
      .filter((q) => q.eq(q.field('emailAlerts'), true))
      .collect();

    const users = await Promise.all(
      prefs.map(async (pref) => {
        const user = await ctx.db.get(pref.userId);
        return user ? { userId: pref.userId, email: user.email } : null;
      }),
    );

    return users.filter(
      (u): u is { userId: Id<'user'>; email: string } => u !== null,
    );
  },
});

export const hasAlertBeenSent = internalQuery({
  args: {
    userId: v.id('user'),
    signalId: v.id('signals'),
  },
  returns: v.boolean(),
  handler: async (ctx, args): Promise<boolean> => {
    const existing = await ctx.db
      .query('alertLog')
      .withIndex('by_user_signal', (q) =>
        q.eq('userId', args.userId).eq('signalId', args.signalId),
      )
      .first();
    return existing !== null;
  },
});

export const logAlert = internalMutation({
  args: {
    userId: v.id('user'),
    signalId: v.id('signals'),
    channel: v.union(v.literal('email'), v.literal('digest')),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    await ctx.db.insert('alertLog', {
      userId: args.userId,
      signalId: args.signalId,
      channel: args.channel,
      sentAt: Date.now(),
    });
    return null;
  },
});

function buildSignalAlertHtml(signal: {
  _id: Id<'signals'>;
  consensusDecision: string;
  consensusPercentage: number;
  confidenceLevel: string;
  aggregatedReasoning?: string;
  aggregatedKeyFactors?: string[];
  market?: { title: string } | null;
}): string {
  const decisionColor =
    signal.consensusDecision === 'YES'
      ? '#10b981'
      : signal.consensusDecision === 'NO'
        ? '#ef4444'
        : '#f59e0b';

  const keyFactorsHtml = signal.aggregatedKeyFactors?.length
    ? `
      <h4 style="margin-bottom: 8px; color: #1e293b;">Key Factors:</h4>
      <ul style="color: #475569; margin-top: 0; padding-left: 20px;">
        ${signal.aggregatedKeyFactors
          .slice(0, 3)
          .map((f) => `<li style="margin-bottom: 4px;">${f}</li>`)
          .join('')}
      </ul>
    `
    : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f1f5f9;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0d9488 0%, #059669 100%); padding: 24px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">New Signal Alert</h1>
        </div>
        <div style="background: white; padding: 24px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h2 style="margin-top: 0; color: #1e293b; font-size: 18px; line-height: 1.4;">
            ${signal.market?.title ?? 'Unknown Market'}
          </h2>
          
          <div style="margin: 16px 0;">
            <span style="display: inline-block; padding: 8px 16px; border-radius: 6px; font-weight: bold; color: white; background: ${decisionColor};">
              ${signal.consensusDecision}
            </span>
            <span style="margin-left: 12px; color: #64748b;">
              ${signal.consensusPercentage.toFixed(0)}% consensus (${signal.confidenceLevel})
            </span>
          </div>
          
          <p style="color: #475569; line-height: 1.6;">
            ${signal.aggregatedReasoning?.slice(0, 250) ?? ''}...
          </p>
          
          ${keyFactorsHtml}
          
          <a href="${DASHBOARD_URL}/trades/${signal._id}" 
             style="display: inline-block; background: #0d9488; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">
            View Full Analysis
          </a>
          
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
          
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">
            You're receiving this because you enabled instant alerts for ${signal.confidenceLevel} confidence signals.
            <a href="${DASHBOARD_URL}/settings" style="color: #0d9488;">Manage preferences</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function buildDailyDigestHtml(
  signals: Array<{
    _id: Id<'signals'>;
    consensusDecision: string;
    consensusPercentage: number;
    market?: { title: string } | null;
  }>,
  stats: { winRate: number; signalsLast24h: number } | null,
): string {
  const signalRows = signals
    .slice(0, 5)
    .map((s) => {
      const color =
        s.consensusDecision === 'YES'
          ? '#10b981'
          : s.consensusDecision === 'NO'
            ? '#ef4444'
            : '#f59e0b';
      return `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">
            <a href="${DASHBOARD_URL}/trades/${s._id}" style="color: #1e293b; text-decoration: none; font-weight: 500;">
              ${s.market?.title?.slice(0, 60) ?? 'Unknown'}...
            </a>
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">
            <span style="color: ${color}; font-weight: bold;">${s.consensusDecision}</span>
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #64748b;">
            ${s.consensusPercentage.toFixed(0)}%
          </td>
        </tr>
      `;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f1f5f9;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0d9488 0%, #059669 100%); padding: 24px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Daily Signal Digest</h1>
          <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0 0;">${signals.length} signals in the last 24 hours</p>
        </div>
        <div style="background: white; padding: 24px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          
          <div style="display: flex; gap: 16px; margin-bottom: 24px;">
            <div style="flex: 1; background: #f8fafc; padding: 16px; border-radius: 8px; text-align: center;">
              <div style="font-size: 28px; font-weight: bold; color: #10b981;">${stats?.winRate ?? 0}%</div>
              <div style="color: #64748b; font-size: 12px;">Win Rate</div>
            </div>
            <div style="flex: 1; background: #f8fafc; padding: 16px; border-radius: 8px; text-align: center;">
              <div style="font-size: 28px; font-weight: bold; color: #0d9488;">${stats?.signalsLast24h ?? signals.length}</div>
              <div style="color: #64748b; font-size: 12px;">Signals Today</div>
            </div>
          </div>

          <h3 style="margin: 0 0 16px 0; color: #1e293b;">Top Signals</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f8fafc;">
                <th style="padding: 12px; text-align: left; font-weight: 600; color: #64748b; font-size: 12px;">MARKET</th>
                <th style="padding: 12px; text-align: center; font-weight: 600; color: #64748b; font-size: 12px;">SIGNAL</th>
                <th style="padding: 12px; text-align: right; font-weight: 600; color: #64748b; font-size: 12px;">CONSENSUS</th>
              </tr>
            </thead>
            <tbody>
              ${signalRows}
            </tbody>
          </table>
          
          <a href="${DASHBOARD_URL}/trades" 
             style="display: block; text-align: center; background: #0d9488; color: white; padding: 14px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 24px;">
            View All Signals
          </a>
          
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
          
          <p style="color: #94a3b8; font-size: 12px; margin: 0; text-align: center;">
            <a href="${DASHBOARD_URL}/settings" style="color: #0d9488;">Manage email preferences</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function buildWeeklyDigestHtml(
  signals: Array<{
    _id: Id<'signals'>;
    consensusDecision: string;
    consensusPercentage: number;
    market?: { title: string } | null;
  }>,
  stats: {
    winRate: number;
    signalsLast7d: number;
    correctPredictions: number;
    incorrectPredictions: number;
  } | null,
): string {
  const topSignals = signals.slice(0, 5);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f1f5f9;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%); padding: 24px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Weekly Wrap-Up</h1>
          <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0 0;">Your week with Hermes</p>
        </div>
        <div style="background: white; padding: 24px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          
          <h3 style="margin: 0 0 16px 0; color: #1e293b;">This Week's Stats</h3>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 24px;">
            <div style="background: #f8fafc; padding: 16px; border-radius: 8px; text-align: center;">
              <div style="font-size: 24px; font-weight: bold; color: #10b981;">${stats?.winRate ?? 0}%</div>
              <div style="color: #64748b; font-size: 12px;">Win Rate</div>
            </div>
            <div style="background: #f8fafc; padding: 16px; border-radius: 8px; text-align: center;">
              <div style="font-size: 24px; font-weight: bold; color: #0d9488;">${stats?.signalsLast7d ?? signals.length}</div>
              <div style="color: #64748b; font-size: 12px;">Total Signals</div>
            </div>
            <div style="background: #f8fafc; padding: 16px; border-radius: 8px; text-align: center;">
              <div style="font-size: 24px; font-weight: bold; color: #10b981;">${stats?.correctPredictions ?? 0}</div>
              <div style="color: #64748b; font-size: 12px;">Correct</div>
            </div>
            <div style="background: #f8fafc; padding: 16px; border-radius: 8px; text-align: center;">
              <div style="font-size: 24px; font-weight: bold; color: #ef4444;">${stats?.incorrectPredictions ?? 0}</div>
              <div style="color: #64748b; font-size: 12px;">Incorrect</div>
            </div>
          </div>

          <h3 style="margin: 0 0 16px 0; color: #1e293b;">Highlighted Signals</h3>
          ${topSignals
            .map((s) => {
              const color =
                s.consensusDecision === 'YES'
                  ? '#10b981'
                  : s.consensusDecision === 'NO'
                    ? '#ef4444'
                    : '#f59e0b';
              return `
              <div style="padding: 12px; border-left: 3px solid ${color}; background: #f8fafc; margin-bottom: 8px; border-radius: 0 8px 8px 0;">
                <a href="${DASHBOARD_URL}/trades/${s._id}" style="color: #1e293b; text-decoration: none; font-weight: 500;">
                  ${s.market?.title?.slice(0, 50) ?? 'Unknown'}...
                </a>
                <div style="color: ${color}; font-size: 12px; margin-top: 4px;">
                  ${s.consensusDecision} (${s.consensusPercentage.toFixed(0)}%)
                </div>
              </div>
            `;
            })
            .join('')}
          
          <a href="${DASHBOARD_URL}" 
             style="display: block; text-align: center; background: #7c3aed; color: white; padding: 14px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 24px;">
            View Dashboard
          </a>
          
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
          
          <p style="color: #94a3b8; font-size: 12px; margin: 0; text-align: center;">
            <a href="${DASHBOARD_URL}/settings" style="color: #7c3aed;">Manage email preferences</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}
