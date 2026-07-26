"use client";

import { useCallback, useEffect, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";

type DashboardData = {
  overview: {
    runningJobs: number;
    successfulJobs: number;
    failedJobs: number;
    totalCampaigns: number;
    activeCampaigns: number;
    manualDeals: number;
    totalVisits: number;
    uniqueVisitors: number;
    todayVisits: number;
  };
  scheduler: Record<string, unknown> | null;
  latestJob: Record<string, unknown> | null;
  providerHealth: unknown;
  campaigns: unknown[];
  manualDeals: unknown[];
  audit: unknown[];
};

function formatDate(value: unknown): string {
  if (!value || typeof value !== "string") {
    return "Not available";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString();
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "Not available";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function labelFromKey(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function statusClass(value: unknown): string {
  const status = String(value ?? "").toLowerCase();

  if (
    status.includes("success") ||
    status.includes("healthy") ||
    status.includes("enabled") ||
    status.includes("online") ||
    status === "true"
  ) {
    return "bg-emerald-100 text-emerald-700";
  }

  if (
    status.includes("fail") ||
    status.includes("error") ||
    status.includes("offline") ||
    status.includes("disabled") ||
    status === "false"
  ) {
    return "bg-red-100 text-red-700";
  }

  if (
    status.includes("running") ||
    status.includes("queued") ||
    status.includes("pending")
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

function KeyValueGrid({
  data,
}: {
  data: Record<string, unknown> | null;
}) {
  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
        No data available.
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {Object.entries(data).map(([key, value]) => (
        <div
          key={key}
          className="rounded-xl border border-slate-200 bg-slate-50 p-4"
        >
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {labelFromKey(key)}
          </div>

          <div className="mt-2 break-words text-sm font-semibold text-slate-900">
            {key.toLowerCase().includes("date") ||
            key.toLowerCase().includes("time") ||
            key.toLowerCase().includes("run")
              ? formatDate(value)
              : formatValue(value)}
          </div>
        </div>
      ))}
    </div>
  );
}

function CollectionList({
  items,
  emptyText,
}: {
  items: unknown[];
  emptyText: string;
}) {
  if (!items.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const record =
          item && typeof item === "object"
            ? (item as Record<string, unknown>)
            : { value: item };

        const primary =
          record.title ??
          record.name ??
          record.action ??
          record.type ??
          record.id ??
          `Record ${index + 1}`;

        const status =
          record.status ??
          record.enabled ??
          record.result ??
          record.active;

        return (
          <div
            key={String(record.id ?? `${primary}-${index}`)}
            className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3"
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-900">
                {formatValue(primary)}
              </div>

              <div className="mt-1 text-xs text-slate-500">
                {formatDate(
                  record.createdAt ??
                  record.updatedAt ??
                  record.timestamp ??
                  record.startedAt,
                )}
              </div>
            </div>

            {status !== undefined && (
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${statusClass(status)}`}
              >
                {formatValue(status)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ProviderGrid({
  value,
}: {
  value: unknown;
}) {
  if (!value) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
        Provider health is unavailable.
      </div>
    );
  }

  const entries = Array.isArray(value)
    ? value.map((item, index) => [
        String(
          item &&
          typeof item === "object" &&
          "name" in item
            ? (item as { name?: unknown }).name
            : `Provider ${index + 1}`,
        ),
        item,
      ])
    : typeof value === "object"
      ? Object.entries(value as Record<string, unknown>)
      : [["Provider", value]];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {entries.map(([name, provider]) => {
        const record: Record<string, unknown> =
          provider && typeof provider === "object"
            ? (provider as Record<string, unknown>)
            : { status: provider };

        const status =
          record["status"] ??
          record["healthy"] ??
          record["enabled"] ??
          record["available"] ??
          "Unknown";

        return (
          <div
            key={name}
            className="rounded-xl border border-slate-200 bg-slate-50 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-slate-900">
                {labelFromKey(name)}
              </div>

              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(status)}`}
              >
                {formatValue(status)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/dashboard", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Dashboard request failed with ${response.status}`);
      }

      const payload = (await response.json()) as DashboardData;

      setData(payload);
      setError("");
      setLastUpdated(new Date());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load dashboard.",
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
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="text-sm font-medium text-slate-500">
          {error || "Loading executive dashboard..."}
        </div>
      </div>
    );
  }

  const overview = data.overview;

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-8">
      <PageHeader
        title="Executive Dashboard"
        subtitle="Real-time monitoring of the Deals Ads platform"
        actions={
          <div className="text-right">
            <div className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600">
              Auto refresh · 5 seconds
            </div>

            {lastUpdated && (
              <div className="mt-1 text-xs text-slate-400">
                Updated {lastUpdated.toLocaleTimeString()}
              </div>
            )}
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
          title="Total Visitors"
          value={overview.totalVisits}
          color="blue"
        />

        <StatCard
          title="Visitors Today"
          value={overview.todayVisits}
          color="amber"
        />

        <StatCard
          title="Unique Visitors"
          value={overview.uniqueVisitors}
          color="green"
        />

        <StatCard
          title="Running Jobs"
          value={overview.runningJobs}
          color="amber"
        />

        <StatCard
          title="Successful Jobs"
          value={overview.successfulJobs}
          color="green"
        />

        <StatCard
          title="Failed Jobs"
          value={overview.failedJobs}
          color="red"
        />

        <StatCard
          title="Active Campaigns"
          value={`${overview.activeCampaigns}/${overview.totalCampaigns}`}
          color="blue"
        />

        <StatCard
          title="Manual Deals"
          value={overview.manualDeals}
          color="blue"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Latest Job">
          <KeyValueGrid data={data.latestJob} />
        </Panel>

        <Panel title="Scheduler">
          <KeyValueGrid data={data.scheduler} />
        </Panel>

        <Panel title="Provider Health">
          <ProviderGrid value={data.providerHealth} />
        </Panel>

        <Panel title="Recent Campaigns">
          <CollectionList
            items={data.campaigns}
            emptyText="No campaigns available."
          />
        </Panel>

        <Panel title="Recent Manual Deals">
          <CollectionList
            items={data.manualDeals}
            emptyText="No manual deals available."
          />
        </Panel>

        <Panel title="Recent Audit Activity">
          <CollectionList
            items={data.audit}
            emptyText="No audit events available."
          />
        </Panel>
      </div>
    </div>
  );
}
