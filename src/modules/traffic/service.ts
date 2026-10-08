import { createHmac } from 'node:crypto';
import { and, count, countDistinct, desc, eq, gte, lt } from 'drizzle-orm';

import { db } from '@/core/db';
import { envConfigs } from '@/config';
import { pageView } from '@/config/db/schema';
import type { TrafficReport } from '@/lib/traffic';

const dayMs = 86400000;
export function trafficDay(date = new Date()) {
  return new Date(date.getTime() + 8 * 3600000).toISOString().slice(0, 10);
}
export async function recordPageView(input: {
  id: string;
  visitor: string;
  path: string;
}) {
  if (!envConfigs.auth_secret) throw new Error('analytics_not_configured');
  const visitorHash = createHmac('sha256', envConfigs.auth_secret)
    .update('traffic:' + input.visitor)
    .digest('hex');
  await db()
    .insert(pageView)
    .values({ id: input.id, visitorHash, path: input.path, day: trafficDay() })
    .onConflictDoNothing();
}
export async function getTrafficReport(
  days: number,
  path: string
): Promise<TrafficReport> {
  const first = trafficDay(new Date(Date.now() - (days - 1) * dayMs));
  const end = trafficDay(new Date(Date.now() + dayMs));
  const where = and(
    gte(pageView.day, first),
    lt(pageView.day, end),
    path ? eq(pageView.path, path) : undefined
  );
  const metrics = {
    visitors: countDistinct(pageView.visitorHash),
    views: count(),
  };
  const [totals, daily, pages] = await Promise.all([
    db().select(metrics).from(pageView).where(where),
    db()
      .select({ day: pageView.day, ...metrics })
      .from(pageView)
      .where(where)
      .groupBy(pageView.day)
      .orderBy(pageView.day),
    db()
      .select({ path: pageView.path, ...metrics })
      .from(pageView)
      .where(where)
      .groupBy(pageView.path)
      .orderBy(desc(count()))
      .limit(30),
  ]);
  const filled = Array.from({ length: days }, (_, i) => {
    const day = trafficDay(new Date(Date.now() - (days - 1 - i) * dayMs));
    const row = daily.find((r: { day: string }) => r.day === day);
    return {
      day,
      visitors: Number(row?.visitors || 0),
      views: Number(row?.views || 0),
    };
  });
  return {
    days,
    path,
    visitors: Number(totals[0]?.visitors || 0),
    views: Number(totals[0]?.views || 0),
    daily: filled,
    pages: pages.map(
      (r: { path: string; visitors: number; views: number }) => ({
        path: r.path,
        visitors: Number(r.visitors),
        views: Number(r.views),
      })
    ),
  };
}
export async function pruneTraffic() {
  await db()
    .delete(pageView)
    .where(lt(pageView.createdAt, new Date(Date.now() - 90 * dayMs)));
}
