import Link from "next/link";
import {
  AppCard,
  PageHeader,
  StatusBadge,
} from "@/components/ui/v2";

const tools = [
  {
    title: "Review Queue",
    description:
      "Review imported deals, approve or reject products before publishing.",
    href: "/admin/review",
    icon: "📝",
    status: "Available",
    enabled: true,
  },
  {
    title: "Amazon Import",
    description:
      "Import Amazon affiliate products using product URLs.",
    href: "/admin/amazon-import",
    icon: "🛒",
    status: "Available",
    enabled: true,
  },
  {
    title: "QuickCommerce",
    description:
      "Manage QuickCommerce providers and synchronization.",
    href: "/admin/quickcommerce",
    icon: "⚡",
    status: "Available",
    enabled: true,
  },
  {
    title: "Operations",
    description:
      "Run jobs, monitor executions and provider status.",
    href: "/admin/operations",
    icon: "⚙️",
    status: "Available",
    enabled: true,
  },
  {
    title: "Provider Health",
    description:
      "Live health monitoring for all providers.",
    href: "/admin/provider-health",
    icon: "💚",
    status: "Available",
    enabled: true,
  },
  {
    title: "System Health",
    description:
      "Application runtime diagnostics and monitoring.",
    href: "/admin/system",
    icon: "🖥️",
    status: "Available",
    enabled: true,
  },
  {
    title: "Campaigns",
    description:
      "Manage campaigns and scheduled executions.",
    href: "/admin/campaigns",
    icon: "📢",
    status: "Available",
    enabled: true,
  },
  {
    title: "Manual Deals",
    description:
      "Create and publish deals manually.",
    href: "/admin/manual-deals",
    icon: "➕",
    status: "Available",
    enabled: true,
  },
  {
    title: "Audit Logs",
    description:
      "View administrator activity and system events.",
    href: "/admin/audit",
    icon: "📋",
    status: "Available",
    enabled: true,
  },
  {
    title: "Settings",
    description:
      "Manage application configuration.",
    href: "/admin/settings",
    icon: "🔧",
    status: "Available",
    enabled: true,
  },
];

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="mx-auto max-w-7xl px-6 py-10">

        <PageHeader
          title="Deals Ads Control Center"
          subtitle="Enterprise administration console for Deals Ads platform."
        />

        <div className="mb-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">

          <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white shadow-lg">
            <div className="text-sm opacity-80">
              Modules
            </div>

            <div className="mt-2 text-4xl font-bold">
              {tools.length}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm border">
            <div className="text-sm text-slate-500">
              Platform
            </div>

            <div className="mt-2 text-2xl font-bold">
              Deals Ads
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm border">
            <div className="text-sm text-slate-500">
              Environment
            </div>

            <div className="mt-2">
              <StatusBadge status="healthy" />
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm border">
            <div className="text-sm text-slate-500">
              Administration
            </div>

            <div className="mt-2 text-2xl font-bold">
              Online
            </div>
          </div>

        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">

          {tools.map((tool) => (

            <Link
              key={tool.title}
              href={tool.href}
              className="group"
            >

              <AppCard>

                <div className="flex items-start justify-between">

                  <div className="text-4xl">
                    {tool.icon}
                  </div>

                  <StatusBadge
                    status={tool.enabled ? "healthy" : "pending"}
                  />

                </div>

                <h2 className="mt-6 text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  {tool.title}
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {tool.description}
                </p>

                <div className="mt-6 flex items-center justify-between">

                  <span className="text-sm font-semibold text-blue-600">
                    Open Module →
                  </span>

                  <span className="text-xs text-slate-400">
                    {tool.status}
                  </span>

                </div>

              </AppCard>

            </Link>

          ))}

        </div>

      </div>
    </main>
  );
}
