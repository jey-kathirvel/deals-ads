"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import ActionButton from "@/components/ui/ActionButton";

type Provider = {
  status?: string;
  totalRequests?: number;
  successfulRequests?: number;
  failedRequests?: number;
  lastResponseTimeMs?: number;
};

export default function QuickCommercePage() {
  const [provider, setProvider] = useState<Provider | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/provider-health", {
      cache: "no-store",
    });

    const data = await res.json();
    setProvider(data.quickcommerce ?? data);
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  async function execute(url: string) {
    setBusy(true);

    try {
      await fetch(url, {
        method: "POST",
      });

      await load();
    } finally {
      setBusy(false);
    }
  }

  if (!provider) return null;

  return (
    <div className="space-y-8">

      <div className="flex items-center justify-between">

        <PageHeader
          title="QuickCommerce Operations"
          subtitle="Monitor provider connectivity and execute operational actions."
        />

        <div className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-600">
          Auto Refresh • 5 sec
        </div>

      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-6">

        <Card title="Status" value={provider.status ?? "-"} />
        <Card title="Requests" value={provider.totalRequests ?? 0} />
        <Card title="Successful" value={provider.successfulRequests ?? 0} />
        <Card title="Failed" value={provider.failedRequests ?? 0} />
        <Card
          title="Response Time"
          value={`${provider.lastResponseTimeMs ?? 0} ms`}
        />

      </div>

      <div className="rounded-xl border bg-white p-6 space-y-6">

        <h2 className="text-lg font-semibold">
          Operations
        </h2>

        <div className="flex flex-wrap gap-4">

          <ActionButton
            disabled={busy}
            onClick={() => execute("/api/admin/quickcommerce/test")}
          >
            Test Connection
          </ActionButton>

          <ActionButton
            disabled={busy}
            onClick={() => execute("/api/admin/quickcommerce/sync")}
          >
            Sync Deals
          </ActionButton>

          <ActionButton
            disabled={busy}
            onClick={() => execute("/api/admin/jobs/run")}
          >
            Run Fetch Job
          </ActionButton>

        </div>

      </div>

      <div className="rounded-xl border bg-white p-6">

        <h2 className="mb-4 text-lg font-semibold">
          Live Provider Snapshot
        </h2>

        <pre className="overflow-auto rounded-lg bg-gray-50 p-4 text-xs">
{JSON.stringify(provider, null, 2)}
        </pre>

      </div>

    </div>
  );
}
