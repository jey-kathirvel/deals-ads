"use client";

import { useCallback, useEffect, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";

type JobRun = {
  id: string;
  type: string;
  status: string;
  triggeredBy: string;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  progress: number;
  total: number;
  imported: number;
  updated: number;
  skipped: number;
  failed: number;
  message?: string;
  error?: string;
};

type OperationsData = {
  scheduler: {
    enabled: boolean;
    intervalMinutes: number;
    maxDeals: number;
    publishMode: string;
    retryCount: number;
    retryDelaySeconds: number;
    timeoutMinutes: number;
    lastRun: string | null;
    nextRun: string | null;
  };
  lock: {
    locked: boolean;
    jobId: string | null;
    lockedAt: string | null;
  };
  latestJob: JobRun | null;
  jobs: JobRun[];
  analytics: {
    totalVisits: number;
    uniqueVisitors: number;
    todayVisits: number;
  };
  summary: {
    totalJobs: number;
    successfulJobs: number;
    failedJobs: number;
    runningJobs: number;
  };
};

function formatDate(value?: string | null): string {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString();
}

function formatDuration(value?: number): string {
  if (!value || value < 1) {
    return "Not available";
  }

  if (value < 1000) {
    return `${value} ms`;
  }

  return `${Math.round(value / 1000)} sec`;
}

function statusClass(value: string): string {
  const status = value.toLowerCase();

  if (status === "success") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "failed" || status === "cancelled") {
    return "bg-red-100 text-red-700";
  }

  if (
    status === "running" ||
    status === "queued" ||
    status === "partial_success"
  ) {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-slate-100 text-slate-700";
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-4">
        <h2 className="text-base font-semibold text-slate-900">
          {title}
        </h2>
      </div>

      <div className="p-6">
        {children}
      </div>
    </section>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>

      <div className="mt-2 break-words text-sm font-semibold text-slate-900">
        {value}
      </div>
    </div>
  );
}

export default function OperationsDashboard() {
  const [data, setData] = useState<OperationsData | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch(
        "/api/admin/operations/dashboard",
        {
          cache: "no-store",
        },
      );

      if (!response.ok) {
        throw new Error(
          `Operations request failed with ${response.status}`,
        );
      }

      setData((await response.json()) as OperationsData);
      setError("");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load operations dashboard.",
      );
    }
  }, []);

  useEffect(() => {
    void load();

    const timer = window.setInterval(() => {
      void load();
    }, 5000);

    return () => window.clearInterval(timer);
  }, [load]);

  if (!data) {
    return (
      <div className="flex min-h-[420px] items-center justify-center text-sm font-medium text-slate-500">
        {error || "Loading operations dashboard..."}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-8">
      <PageHeader
        title="Operations Center"
        subtitle="Scheduler, jobs and visitor analytics"
        actions={
          <div className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600">
            Auto refresh · 5 seconds
          </div>
        }
      />

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-800">
          {error}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Scheduler"
          value={data.scheduler.enabled ? "Enabled" : "Disabled"}
          color={data.scheduler.enabled ? "green" : "red"}
        />

        <StatCard
          title="Running Jobs"
          value={data.summary.runningJobs}
          color="amber"
        />

        <StatCard
          title="Successful Jobs"
          value={data.summary.successfulJobs}
          color="green"
        />

        <StatCard
          title="Failed Jobs"
          value={data.summary.failedJobs}
          color="red"
        />

        <StatCard
          title="Total Visitors"
          value={data.analytics.totalVisits}
          color="blue"
        />

        <StatCard
          title="Visitors Today"
          value={data.analytics.todayVisits}
          color="amber"
        />

        <StatCard
          title="Unique Visitors"
          value={data.analytics.uniqueVisitors}
          color="green"
        />

        <StatCard
          title="Total Jobs"
          value={data.summary.totalJobs}
          color="blue"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Scheduler Configuration">
          <div className="grid gap-4 sm:grid-cols-2">
            <Detail
              label="Status"
              value={data.scheduler.enabled ? "Enabled" : "Disabled"}
            />

            <Detail
              label="Interval"
              value={`${data.scheduler.intervalMinutes} minutes`}
            />

            <Detail
              label="Maximum Deals"
              value={data.scheduler.maxDeals}
            />

            <Detail
              label="Publish Mode"
              value={data.scheduler.publishMode}
            />

            <Detail
              label="Retry Count"
              value={data.scheduler.retryCount}
            />

            <Detail
              label="Retry Delay"
              value={`${data.scheduler.retryDelaySeconds} seconds`}
            />

            <Detail
              label="Timeout"
              value={`${data.scheduler.timeoutMinutes} minutes`}
            />

            <Detail
              label="Next Run"
              value={formatDate(data.scheduler.nextRun)}
            />

            <Detail
              label="Last Run"
              value={formatDate(data.scheduler.lastRun)}
            />
          </div>
        </Panel>

        <Panel title="Current Job Lock">
          <div className="grid gap-4 sm:grid-cols-2">
            <Detail
              label="Locked"
              value={data.lock.locked ? "Yes" : "No"}
            />

            <Detail
              label="Job ID"
              value={data.lock.jobId ?? "Not available"}
            />

            <Detail
              label="Locked At"
              value={formatDate(data.lock.lockedAt)}
            />
          </div>
        </Panel>

        <Panel title="Latest Job">
          {data.latestJob ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-bold text-slate-900">
                    {data.latestJob.type}
                  </div>

                  <div className="mt-1 text-sm text-slate-500">
                    Triggered by {data.latestJob.triggeredBy}
                  </div>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(data.latestJob.status)}`}
                >
                  {data.latestJob.status}
                </span>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span>Progress</span>
                  <span>{data.latestJob.progress}%</span>
                </div>

                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all"
                    style={{
                      width: `${Math.min(
                        Math.max(data.latestJob.progress, 0),
                        100,
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Detail
                  label="Started"
                  value={formatDate(data.latestJob.startedAt)}
                />

                <Detail
                  label="Completed"
                  value={formatDate(data.latestJob.completedAt)}
                />

                <Detail
                  label="Duration"
                  value={formatDuration(data.latestJob.durationMs)}
                />

                <Detail
                  label="Total"
                  value={data.latestJob.total}
                />

                <Detail
                  label="Imported"
                  value={data.latestJob.imported}
                />

                <Detail
                  label="Updated"
                  value={data.latestJob.updated}
                />

                <Detail
                  label="Skipped"
                  value={data.latestJob.skipped}
                />

                <Detail
                  label="Failed"
                  value={data.latestJob.failed}
                />
              </div>

              {(data.latestJob.message || data.latestJob.error) && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  {data.latestJob.error ?? data.latestJob.message}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
              No jobs have run yet.
            </div>
          )}
        </Panel>

        <Panel title="Recent Job History">
          {data.jobs.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-3">Type</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Triggered By</th>
                    <th className="px-3 py-3">Started</th>
                    <th className="px-3 py-3">Imported</th>
                    <th className="px-3 py-3">Failed</th>
                  </tr>
                </thead>

                <tbody>
                  {data.jobs.slice(0, 10).map((job) => (
                    <tr
                      key={job.id}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="px-3 py-4 font-medium text-slate-900">
                        {job.type}
                      </td>

                      <td className="px-3 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(job.status)}`}
                        >
                          {job.status}
                        </span>
                      </td>

                      <td className="px-3 py-4 text-slate-600">
                        {job.triggeredBy}
                      </td>

                      <td className="px-3 py-4 text-slate-600">
                        {formatDate(job.startedAt)}
                      </td>

                      <td className="px-3 py-4 text-slate-600">
                        {job.imported}
                      </td>

                      <td className="px-3 py-4 text-slate-600">
                        {job.failed}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
              No job history is available.
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
