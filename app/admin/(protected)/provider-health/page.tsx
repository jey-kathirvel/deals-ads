"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";

type ProviderHealth = {
  status?: string;
  lastHttpStatus?: number;
  lastResponseTimeMs?: number;
  totalRequests?: number;
  successfulRequests?: number;
  failedRequests?: number;
  lastSuccess?: string;
  lastFailure?: string;
};

export default function ProviderHealthPage() {
  const [provider, setProvider] = useState<ProviderHealth | null>(null);

  async function load() {
    const response = await fetch("/api/admin/provider-health", {
      cache: "no-store",
    });

    const data = await response.json();
    setProvider(data.quickcommerce ?? data);
  }

  useEffect(() => {
    load();

    const timer = setInterval(load, 5000);

    return () => clearInterval(timer);
  }, []);

  if (!provider) return null;

  return (
    <div className="space-y-8">

      <div className="flex items-center justify-between">

        <PageHeader
          title="Provider Health"
          subtitle="Monitor QuickCommerce provider availability and operational health."
        />

        <div className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-600">
          Auto Refresh • 5 sec
        </div>

      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-6">

        <Card title="Status" value={provider.status ?? "-"} />
        <Card title="HTTP Status" value={provider.lastHttpStatus ?? "-"} />
        <Card title="Response Time" value={`${provider.lastResponseTimeMs ?? 0} ms`} />
        <Card title="Requests" value={provider.totalRequests ?? 0} />

        <Card title="Successful" value={provider.successfulRequests ?? 0} />
        <Card title="Failed" value={provider.failedRequests ?? 0} />
        <Card title="Last Success" value={provider.lastSuccess ?? "-"} />
        <Card title="Last Failure" value={provider.lastFailure ?? "-"} />

      </div>

      <div className="rounded-xl border bg-white p-6">

        <h2 className="mb-4 text-lg font-semibold">
          Provider Details
        </h2>

        <pre className="overflow-auto rounded-lg bg-gray-50 p-4 text-xs">
{JSON.stringify(provider, null, 2)}
        </pre>

      </div>

    </div>
  );
}
