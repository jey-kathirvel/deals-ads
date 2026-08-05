"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavigationItem = {
  href: string;
  title: string;
  icon: string;
};

type NavigationSection = {
  title: string;
  items: NavigationItem[];
};

const sections: NavigationSection[] = [
  {
    title: "Workspace",
    items: [
      {
        href: "/admin",
        title: "Control Center",
        icon: "⌂",
      },
      {
        href: "/admin/dashboard",
        title: "Executive Dashboard",
        icon: "◫",
      },
    ],
  },
  {
    title: "Deal Management",
    items: [
      {
        href: "/admin/review",
        title: "Deal Review",
        icon: "✓",
      },
      {
        href: "/admin/review-queue",
        title: "Review Queue",
        icon: "≡",
      },
      {
        href: "/admin/amazon-import",
        title: "Amazon Import",
        icon: "A",
      },
      {
        href: "/admin/manual-deals",
        title: "Manual Deals",
        icon: "+",
      },
      {
        href: "/admin/campaigns",
        title: "Campaigns",
        icon: "◉",
      },
    ],
  },
  {
    title: "Operations",
    items: [
      {
        href: "/admin/jobs",
        title: "Job Monitor",
        icon: "⚙",
      },
      {
        href: "/admin/operations",
        title: "Operations Center",
        icon: "⌁",
      },
      {
        href: "/admin/quickcommerce",
        title: "QuickCommerce",
        icon: "⚡",
      },
      {
        href: "/admin/provider-health",
        title: "Provider Health",
        icon: "♥",
      },
    ],
  },
  {
    title: "System",
    items: [
      {
        href: "/admin/system",
        title: "System Health",
        icon: "▣",
      },
      {
        href: "/admin/audit",
        title: "Audit Log",
        icon: "▤",
      },
      {
        href: "/admin/settings",
        title: "Settings",
        icon: "⚒",
      },
      {
        href: "/admin/profile",
        title: "Profile & Security",
        icon: "●",
      },
    ],
  },
];

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/admin") {
    return pathname === "/admin";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-800 bg-slate-950 text-white shadow-2xl">
      <div className="border-b border-slate-800 px-6 py-5">
        <Link
          href="/admin"
          className="group flex items-center gap-3"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-lg font-black shadow-lg shadow-blue-950/40 transition-transform group-hover:scale-105">
            DA
          </div>

          <div>
            <div className="text-lg font-bold tracking-tight text-white">
              Deals Ads
            </div>

            <div className="text-xs font-medium text-slate-400">
              Enterprise Console
            </div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-5">
        <div className="space-y-6">
          {sections.map((section) => (
            <section key={section.title}>
              <div className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                {section.title}
              </div>

              <div className="space-y-1">
                {section.items.map((item) => {
                  const active = isActivePath(pathname, item.href);

                  return (
                    <Link
                      key={`${section.title}-${item.href}`}
                      href={item.href}
                      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                        active
                          ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-950/30"
                          : "text-slate-300 hover:bg-slate-800 hover:text-white"
                      }`}
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold transition ${
                          active
                            ? "bg-white/15 text-white"
                            : "bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-white"
                        }`}
                      >
                        {item.icon}
                      </span>

                      <span className="flex-1">
                        {item.title}
                      </span>

                      {active && (
                        <span className="h-2 w-2 rounded-full bg-white shadow-sm" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </nav>

      <div className="border-t border-slate-800 p-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
            </span>

            <div>
              <div className="text-xs font-semibold text-slate-200">
                Platform Online
              </div>

              <div className="mt-0.5 text-[11px] text-slate-500">
                All systems operational
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
