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
  events?: Array<{
    timestamp: string;
    stage: string;
    message: string;
  }>;
};

type CurrentResponse = {
  lock: {
    locked: boolean;
    jobId: string | null;
    lockedAt: string | null;
  };
  current: JobRun | null;
};

type JobParameters = {
  limit: number;
  minimumDiscountPercent: number;
  keywords: string[];
  platforms: string[];
  latitude: number;
  longitude: number;
  pincode?: string;
};

type DefaultsResponse = {
  daily: JobParameters;
  grocery: JobParameters;
};

function formatDate(value?: string | null): string {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
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

function Metric({ title, value }: { title: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </div>

      <div className="mt-2 text-xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

function ParameterCard({
  title,
  description,
  parameters,
  grocery,
  disabled,
  onChange,
  onRun,
}: {
  title: string;
  description: string;
  parameters: JobParameters;
  grocery: boolean;
  disabled: boolean;
  onChange: (parameters: JobParameters) => void;
  onRun: () => void;
}) {
  const inputClass =
    "mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100";

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-amber-200 bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-200 px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-950">{title}</h2>
            <p className="mt-1 text-sm font-medium text-slate-700">
              {description}
            </p>
          </div>
          <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-bold uppercase tracking-wide text-yellow-300">
            Manual
          </span>
        </div>
      </div>

      <div className="grid gap-4 p-6 sm:grid-cols-2">
        <label className="text-sm font-semibold text-slate-700">
          Deal limit
          <input
            className={inputClass}
            type="number"
            min={grocery ? 20 : 1}
            max={50}
            value={parameters.limit}
            onChange={(event) =>
              onChange({
                ...parameters,
                limit: Number(event.target.value),
              })
            }
          />
          <span className="mt-1 block text-xs font-normal text-slate-500">
            {grocery ? "Allowed: 20–50" : "Allowed: 1–50"}
          </span>
        </label>

        <label className="text-sm font-semibold text-slate-700">
          Minimum discount %
          <input
            className={inputClass}
            type="number"
            min={0}
            max={100}
            value={parameters.minimumDiscountPercent}
            onChange={(event) =>
              onChange({
                ...parameters,
                minimumDiscountPercent: Number(event.target.value),
              })
            }
          />
        </label>

        <label className="text-sm font-semibold text-slate-700">
          Latitude
          <input
            className={inputClass}
            type="number"
            step="any"
            min={-90}
            max={90}
            value={parameters.latitude}
            onChange={(event) =>
              onChange({
                ...parameters,
                latitude: Number(event.target.value),
              })
            }
          />
        </label>

        <label className="text-sm font-semibold text-slate-700">
          Longitude
          <input
            className={inputClass}
            type="number"
            step="any"
            min={-180}
            max={180}
            value={parameters.longitude}
            onChange={(event) =>
              onChange({
                ...parameters,
                longitude: Number(event.target.value),
              })
            }
          />
        </label>

        <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
          Pincode
          <input
            className={inputClass}
            inputMode="numeric"
            value={parameters.pincode ?? ""}
            placeholder="Optional"
            onChange={(event) =>
              onChange({
                ...parameters,
                pincode: event.target.value,
              })
            }
          />
        </label>

        <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
          Platforms — one per line
          <textarea
            className={`${inputClass} min-h-28 resize-y`}
            value={parameters.platforms.join("\n")}
            onChange={(event) =>
              onChange({
                ...parameters,
                platforms: event.target.value.split("\n"),
              })
            }
          />
        </label>

        <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
          Search keywords — one per line
          <textarea
            className={`${inputClass} min-h-48 resize-y`}
            value={parameters.keywords.join("\n")}
            onChange={(event) =>
              onChange({
                ...parameters,
                keywords: event.target.value.split("\n"),
              })
            }
          />
        </label>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5 sm:col-span-2">
          <p className="max-w-md text-xs leading-5 text-slate-500">
            Existing deals are checked first. Provider outages retain existing
            deals; only confirmed inactive or expired deals are deleted.
          </p>
          <button
            type="button"
            disabled={disabled}
            onClick={onRun}
            className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-yellow-300 shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {disabled ? "Processing..." : `Run ${title}`}
          </button>
        </div>
      </div>
    </article>
  );
}

export default function JobsPage() {
  const [currentData, setCurrentData] = useState<CurrentResponse | null>(null);

  const [history, setHistory] = useState<JobRun[]>([]);
  const [dailyParameters, setDailyParameters] = useState<JobParameters | null>(
    null,
  );
  const [groceryParameters, setGroceryParameters] =
    useState<JobParameters | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const [currentResponse, historyResponse, defaultsResponse] =
        await Promise.all([
          fetch("/api/admin/jobs/current", {
            cache: "no-store",
          }),
          fetch("/api/admin/jobs/history", {
            cache: "no-store",
          }),
          fetch("/api/admin/jobs/run", {
            cache: "no-store",
          }),
        ]);

      if (!currentResponse.ok || !historyResponse.ok || !defaultsResponse.ok) {
        throw new Error("Unable to load job monitor.");
      }

      setCurrentData((await currentResponse.json()) as CurrentResponse);

      setHistory((await historyResponse.json()) as JobRun[]);
      const defaults = (await defaultsResponse.json()) as DefaultsResponse;
      setDailyParameters((current) => current ?? defaults.daily);
      setGroceryParameters((current) => current ?? defaults.grocery);
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

  async function runJob(
    jobType: "quickcommerce-import" | "grocery-import",
    parameters: JobParameters,
  ) {
    setActionLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/jobs/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobType,
          parameters: {
            ...parameters,
            keywords: parameters.keywords
              .map((item) => item.trim())
              .filter(Boolean),
            platforms: parameters.platforms
              .map((item) => item.trim())
              .filter(Boolean),
          },
        }),
      });

      const payload = (await response.json()) as {
        success?: boolean;
        jobId?: string;
        error?: string;
        message?: string;
      };

      if (!response.ok) {
        throw new Error(
          payload.error ?? payload.message ?? "Job action failed.",
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

  async function retryJob() {
    setActionLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/jobs/retry", {
        method: "POST",
      });
      const payload = (await response.json()) as {
        jobId?: string;
        error?: string;
        message?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? payload.message ?? "Retry failed.");
      }

      setMessage(
        payload.jobId
          ? `Job retried: ${payload.jobId}`
          : "Job retry completed.",
      );
      await load();
    } catch (retryError) {
      setMessage(
        retryError instanceof Error ? retryError.message : "Retry failed.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  const current = currentData?.current ?? null;
  const canRetry = current?.status === "failed" && !currentData?.lock.locked;

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-8">
      <PageHeader
        title="Job Monitor"
        subtitle="Run, inspect and retry deal import jobs"
        actions={
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={actionLoading || loading || !canRetry}
              onClick={() => void retryJob()}
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

      {dailyParameters && groceryParameters && (
        <section className="grid gap-6 xl:grid-cols-2">
          <ParameterCard
            title="Daily Deals"
            description="Discover and import general deals on demand."
            parameters={dailyParameters}
            grocery={false}
            disabled={
              actionLoading || loading || Boolean(currentData?.lock.locked)
            }
            onChange={setDailyParameters}
            onRun={() => void runJob("quickcommerce-import", dailyParameters)}
          />
          <ParameterCard
            title="Grocery Deals"
            description="Discover genuine grocery deals on demand."
            parameters={groceryParameters}
            grocery
            disabled={
              actionLoading || loading || Boolean(currentData?.lock.locked)
            }
            onChange={setGroceryParameters}
            onRun={() => void runJob("grocery-import", groceryParameters)}
          />
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            Current Job
          </h2>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-sm text-slate-500">Loading current job...</div>
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
                      width: `${Math.min(Math.max(current.progress, 0), 100)}%`,
                    }}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Metric title="Total" value={current.total} />

                <Metric title="Imported" value={current.imported} />

                <Metric title="Updated" value={current.updated} />

                <Metric title="Skipped" value={current.skipped} />

                <Metric title="Failed" value={current.failed} />

                <Metric title="Started" value={formatDate(current.startedAt)} />

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

              <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-5 py-4">
                  <div>
                    <h3 className="font-bold text-yellow-300">
                      Live Processing Details
                    </h3>
                    <p className="mt-1 text-xs text-slate-400">
                      Automatically refreshes every five seconds · newest event
                      first
                    </p>
                  </div>
                  {current.status === "running" && (
                    <span className="flex items-center gap-2 rounded-full bg-amber-400/10 px-3 py-1.5 text-xs font-bold text-amber-300">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-amber-300" />
                      Processing
                    </span>
                  )}
                </div>

                <div
                  className="max-h-[460px] overflow-y-auto p-4 font-mono text-xs"
                  aria-live="polite"
                  aria-label="Live job processing details"
                >
                  {current.events?.length ? (
                    <div className="space-y-2">
                      {[...current.events].reverse().map((event, index) => (
                        <div
                          key={`${event.timestamp}-${index}`}
                          className="grid gap-2 rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 sm:grid-cols-[86px_90px_1fr]"
                        >
                          <time className="text-slate-500">
                            {new Date(event.timestamp).toLocaleTimeString()}
                          </time>
                          <span
                            className={`w-fit rounded-md px-2 py-0.5 font-bold uppercase tracking-wide ${
                              event.stage === "error"
                                ? "bg-red-400/10 text-red-300"
                                : event.stage === "complete"
                                  ? "bg-emerald-400/10 text-emerald-300"
                                  : "bg-yellow-300/10 text-yellow-300"
                            }`}
                          >
                            {event.stage}
                          </span>
                          <span className="break-words leading-5 text-slate-200">
                            {event.message}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="px-2 py-8 text-center text-slate-500">
                      Detailed events will appear when the next job starts.
                    </p>
                  )}
                </div>
              </div>
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

                      <td className="px-3 py-4 text-slate-600">{job.failed}</td>
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
