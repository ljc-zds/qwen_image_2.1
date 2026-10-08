import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { ChartColumn, Eye, RefreshCw, Users } from 'lucide-react';

import { apiGet } from '@/lib/api-client';
import { trafficPaths, type TrafficReport } from '@/lib/traffic';
import { m } from '@/paraglide/messages.js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function AnalyticsPage() {
  const [days, setDays] = useState(7);
  const [path, setPath] = useState('');
  const query = useQuery({
    queryKey: ['admin-traffic', days, path],
    queryFn: () =>
      apiGet<TrafficReport>(
        `/api/admin/analytics?days=${days}&path=${encodeURIComponent(path)}`
      ),
    refetchInterval: 60000,
    retry: 1,
  });
  const data = query.data;
  const max = Math.max(1, ...(data?.daily.map((d) => d.views) || []));
  const cards = [
    {
      label: m['admin.analytics.visitors'](),
      value: data?.visitors,
      icon: Users,
    },
    { label: m['admin.analytics.views'](), value: data?.views, icon: Eye },
    {
      label: m['admin.analytics.average'](),
      value: data
        ? data.visitors
          ? (data.views / data.visitors).toFixed(1)
          : '0'
        : undefined,
      icon: ChartColumn,
    },
  ];
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {m['admin.analytics.title']()}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {m['admin.analytics.description']()}
          </p>
        </div>
        <Button
          variant="outline"
          disabled={query.isFetching}
          onClick={() => query.refetch()}
        >
          <RefreshCw className="size-4" />
          {m['admin.analytics.refresh']()}
        </Button>
      </div>
      <div className="flex flex-wrap gap-3">
        <select
          aria-label={m['admin.analytics.date']()}
          className="bg-background min-h-10 rounded-lg border px-3 text-sm"
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
        >
          {[
            [1, m['admin.analytics.today']()],
            [7, m['admin.analytics.week']()],
            [30, m['admin.analytics.month']()],
            [90, m['admin.analytics.quarter']()],
          ].map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          aria-label={m['admin.analytics.path']()}
          className="bg-background min-h-10 max-w-full rounded-lg border px-3 text-sm"
          value={path}
          onChange={(e) => setPath(e.target.value)}
        >
          <option value="">{m['admin.analytics.all']()}</option>
          {trafficPaths
            .flatMap((p) => [p, p === '/' ? '/zh' : '/zh' + p])
            .map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
        </select>
      </div>
      {query.isPending ? (
        <p role="status">{m['admin.analytics.loading']()}</p>
      ) : query.isError ? (
        <div
          role="alert"
          className="border-destructive text-destructive rounded-lg border p-4"
        >
          {m['admin.analytics.error']()}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {cards.map(({ label, value, icon: Icon }) => (
              <Card key={label}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-muted-foreground text-sm font-medium">
                    {label}
                  </CardTitle>
                  <Icon className="text-primary size-5" />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold tabular-nums">
                    {typeof value === 'number' ? value.toLocaleString() : value}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader>
              <CardTitle>{m['admin.analytics.trend']()}</CardTitle>
              <p className="text-muted-foreground text-xs">
                {m['admin.analytics.source']()}
              </p>
            </CardHeader>
            <CardContent>
              {data?.views === 0 ? (
                <p className="text-muted-foreground py-10 text-center">
                  {m['admin.analytics.empty']()}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <div
                    className="flex h-48 items-end gap-1 border-b"
                    style={{ minWidth: days > 30 ? 600 : undefined }}
                    aria-hidden="true"
                  >
                    {data?.daily.map((d) => (
                      <div
                        key={d.day}
                        className="flex h-full min-w-1 flex-1 items-end"
                        title={`${d.day}: ${d.views}`}
                      >
                        <div
                          className="bg-primary/80 w-full rounded-t"
                          style={{
                            height: `${(d.views / max) * 100}%`,
                            minHeight: d.views ? 2 : 0,
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="text-muted-foreground mt-2 flex justify-between text-xs">
                    <span>{data?.daily[0]?.day}</span>
                    <span>{data?.daily.at(-1)?.day}</span>
                  </div>
                </div>
              )}
              <details className="mt-4 text-sm">
                <summary className="cursor-pointer">
                  {m['admin.analytics.trend']()} · {m['admin.analytics.date']()}
                </summary>
                <div className="mt-3 max-h-64 overflow-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr>
                        <th>{m['admin.analytics.date']()}</th>
                        <th>{m['admin.analytics.visitors']()}</th>
                        <th>{m['admin.analytics.views']()}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.daily.map((d) => (
                        <tr key={d.day}>
                          <td className="py-1">{d.day}</td>
                          <td>{d.visitors}</td>
                          <td>{d.views}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{m['admin.analytics.pages']()}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-muted-foreground border-b">
                      <th className="pb-3">{m['admin.analytics.path']()}</th>
                      <th className="pb-3 text-right">
                        {m['admin.analytics.visitors']()}
                      </th>
                      <th className="pb-3 text-right">
                        {m['admin.analytics.views']()}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.pages.map((p) => (
                      <tr key={p.path} className="border-b last:border-0">
                        <td className="py-3 pr-4 break-all">{p.path}</td>
                        <td className="text-right tabular-nums">
                          {p.visitors.toLocaleString()}
                        </td>
                        <td className="text-right tabular-nums">
                          {p.views.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!data?.pages.length && (
                  <p className="text-muted-foreground py-6 text-center">
                    {m['admin.analytics.empty']()}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
      <p className="text-muted-foreground text-xs leading-6">
        {m['admin.analytics.note']()}
      </p>
    </div>
  );
}
export const Route = createFileRoute('/admin/analytics')({
  component: AnalyticsPage,
  head: () => ({
    meta: [
      { title: 'Traffic analytics | Prism Studio' },
      { name: 'robots', content: 'noindex,nofollow' },
    ],
  }),
});
