"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";

type SystemStatus = {
  nodeVersion?: string;
  platform?: string;
  pid?: number;
  uptime?: number;
  scheduler?: unknown;
  currentLock?: unknown;
  lastJob?: unknown;
  provider?: unknown;
  storage?: unknown;
};

export default function SystemPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null);

  async function load() {
    const res = await fetch("/api/admin/system/status", {
      cache: "no-store",
    });

    setStatus(await res.json());
  }

  useEffect(() => {
    load();

    const timer = setInterval(load, 5000);

    return () => clearInterval(timer);
  }, []);

  if (!status) return null;

  return (
    <div className="space-y-8">

      <div className="flex items-center justify-between">

        <PageHeader
          title="System Health"
          subtitle="Runtime diagnostics and infrastructure monitoring."
        />

        <div className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-600">
          Auto Refresh • 5 sec
        </div>

      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-6">

        <Card title="Node.js" value={status.nodeVersion ?? "-"} />
        <Card title="Platform" value={status.platform ?? "-"} />
        <Card title="Process ID" value={status.pid ?? "-"} />
        <Card title="Uptime (sec)" value={Math.floor(status.uptime ?? 0)} />

      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        <Panel title="Scheduler" data={status.scheduler} />
        <Panel title="Current Lock" data={status.currentLock} />
        <Panel title="Last Job" data={status.lastJob} />
        <Panel title="Provider Health" data={status.provider} />
        <Panel title="Storage" data={status.storage} />

      </div>

    </div>
  );
}

function Panel({
  title,
  data,
}: {
  title: string;
  data: unknown;
}) {
  return (
    <div className="rounded-xl border bg-white p-6">

      <h2 className="mb-4 text-lg font-semibold">
        {title}
      </h2>

      <pre className="overflow-auto rounded-lg bg-gray-50 p-4 text-xs">
        {JSON.stringify(data, null, 2)}
      </pre>

    </div>
  );
}
