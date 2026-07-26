"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";

type AuditRecord = {
  id?: string | number;
  createdAt?: string;
  module?: string;
  action?: string;
  status?: string;
  user?: string;
  details?: unknown;
};

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditRecord[]>([]);

  async function load() {
    const r = await fetch("/api/admin/audit", {
      cache: "no-store",
    });

    setLogs(await r.json());
  }

  useEffect(() => {
    load();

    const t = setInterval(load, 5000);

    return () => clearInterval(t);
  }, []);

  return (
    <div className="space-y-8">

      <div className="flex items-center justify-between">

        <PageHeader
          title="Audit Log"
          subtitle="Platform activity, security events and administrator actions."
        />

        <div className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-600">
          Auto Refresh • 5 sec
        </div>

      </div>

      <div className="grid grid-cols-4 gap-6">

        <Card title="Total Events" value={logs.length} />

        <Card
          title="Successful"
          value={logs.filter(x => x.status === "SUCCESS").length}
        />

        <Card
          title="Failed"
          value={logs.filter(x => x.status === "FAILED").length}
        />

        <Card
          title="Modules"
          value={new Set(logs.map(x => x.module)).size}
        />

      </div>

      <div className="overflow-x-auto rounded-xl border bg-white">

        <table className="min-w-full text-sm">

          <thead className="bg-gray-100">

            <tr>

              <th className="px-4 py-3 text-left">Time</th>
              <th className="px-4 py-3 text-left">Module</th>
              <th className="px-4 py-3 text-left">Action</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">User</th>

            </tr>

          </thead>

          <tbody>

            {logs.map((log, index) => (

              <tr
                key={log.id ?? index}
                className="border-t hover:bg-gray-50"
              >

                <td className="px-4 py-3">{log.createdAt ?? "-"}</td>
                <td className="px-4 py-3">{log.module ?? "-"}</td>
                <td className="px-4 py-3">{log.action ?? "-"}</td>
                <td className="px-4 py-3">{log.status ?? "-"}</td>
                <td className="px-4 py-3">{log.user ?? "-"}</td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </div>
  );
}
