"use client";

import { useCallback, useEffect, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";

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

type CurrentResponse = {
  lock: {
    locked: boolean;
    jobId: string | null;
    lockedAt: string | null;
  };
  current: JobRun | null;
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

function Metric({
  title,
  value,
}: {
  title: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </div>

      <div className="mt-2 text-xl font-bold text-slate-900">
        {value}
      </div>
    </div>
  );
}

export default function JobsPage() {
  const [currentData, setCurrentData] =
    useState<CurrentResponse | null>(null);

  const [history, setHistory] = useState<JobRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const [currentResponse, historyResponse] = await Promise.all([
        fetch("/api/admin/jobs/current", {
          cache: "no-store",
        }),
        fetch("/api/admin/jobs/history", {
          cache: "no-store",
        }),
      ]);

      if (!currentResponse.ok || !historyResponse.ok) {
        throw new Error("Unable to load job monitor.");
      }

      setCurrentData(
        (await currentResponse.json()) as CurrentResponse,
      );

      setHistory((await historyResponse.json()) as JobRun[]);
      setMessage("");
    } catch (loadError) {
      setMessage(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load job monitor.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();

    const timer = window.setInterval(() => {
      void load();
    }, 5000);

    return () => window.clearInterval(timer);
  }, [load]);

  async function runJob(endpoint: string) {
    setActionLoading(true);
    setMessage("");

    try {
      const response = await fetch(endpoint, {
        method: "POST",
      });

      const payload = (await response.json()) as {
        success?: boolean;
        jobId?: string;
        error?: string;
        message?: string;
      };

      if (!response.ok) {
        throw new Error(
          payload.error ??
          payload.message ??
          "Job action failed.",
        );
      }

      setMessage(
        payload.jobId
          ? `Job started: ${payload.jobId}`
          : "Job action completed.",
      );

      await load();
    } catch (actionError) {
      setMessage(
        actionError instanceof Error
          ? actionError.message
          : "Job action failed.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  const current = currentData?.current ?? null;
  const canRetry =
    current?.status === "failed" && !currentData?.lock.locked;

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-8">
      <PageHeader
        title="Job Monitor"
        subtitle="Run, inspect and retry deal import jobs"
        actions={
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={
                actionLoading ||
                loading ||
                Boolean(currentData?.lock.locked)
              }
              onClick={() => void runJob("/api/admin/jobs/run")}
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {actionLoading ? "Processing..." : "Run Import"}
            </button>

            <button
              type="button"
              disabled={actionLoading || loading || !canRetry}
              onClick={() => void runJob("/api/admin/jobs/retry")}
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Retry Failed
            </button>
          </div>
        }
      />

      {message && (
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-700 shadow-sm">
          {message}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            Current Job
          </h2>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-sm text-slate-500">
              Loading current job...
            </div>
          ) : current ? (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-2xl font-bold text-slate-900">
                    {current.type}
                  </div>

                  <div className="mt-1 text-sm text-slate-500">
                    Triggered by {current.triggeredBy}
                  </div>
                </div>

                <span
                  className={`rounded-full px-4 py-2 text-xs font-semibold ${statusClass(current.status)}`}
                >
                  {current.status}
                </span>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between text-sm font-medium text-slate-600">
                  <span>Progress</span>
                  <span>{current.progress}%</span>
                </div>

                <div className="h-4 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all"
                    style={{
                      width: `${Math.min(
                        Math.max(current.progress, 0),
                        100,
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Metric
                  title="Total"
                  value={current.total}
                />

                <Metric
                  title="Imported"
                  value={current.imported}
                />

                <Metric
                  title="Updated"
                  value={current.updated}
                />

                <Metric
                  title="Skipped"
                  value={current.skipped}
                />

                <Metric
                  title="Failed"
                  value={current.failed}
                />

                <Metric
                  title="Started"
                  value={formatDate(current.startedAt)}
                />

                <Metric
                  title="Completed"
                  value={formatDate(current.completedAt)}
                />

                <Metric
                  title="Duration"
                  value={formatDuration(current.durationMs)}
                />
              </div>

              {(current.message || current.error) && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  {current.error ?? current.message}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
              <div className="text-base font-semibold text-slate-800">
                No jobs have run yet
              </div>

              <div className="mt-2 text-sm text-slate-500">
                Use Run Import to start the first job.
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            Job History
          </h2>
        </div>

        <div className="p-6">
          {history.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-3">Type</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Triggered By</th>
                    <th className="px-3 py-3">Started</th>
                    <th className="px-3 py-3">Completed</th>
                    <th className="px-3 py-3">Imported</th>
                    <th className="px-3 py-3">Updated</th>
                    <th className="px-3 py-3">Skipped</th>
                    <th className="px-3 py-3">Failed</th>
                  </tr>
                </thead>

                <tbody>
                  {history.map((job) => (
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
                        {formatDate(job.completedAt)}
                      </td>

                      <td className="px-3 py-4 text-slate-600">
                        {job.imported}
                      </td>

                      <td className="px-3 py-4 text-slate-600">
                        {job.updated}
                      </td>

                      <td className="px-3 py-4 text-slate-600">
                        {job.skipped}
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
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
              No job history is available.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
