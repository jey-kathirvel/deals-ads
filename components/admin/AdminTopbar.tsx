"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const pageNames: Record<string, string> = {
  "/admin": "Control Center",
  "/admin/dashboard": "Executive Dashboard",
  "/admin/review": "Deal Review",
  "/admin/review-queue": "Review Queue",
  "/admin/amazon-import": "Amazon Import",
  "/admin/manual-deals": "Manual Deals",
  "/admin/campaigns": "Campaigns",
  "/admin/jobs": "Job Monitor",
  "/admin/operations": "Operations Center",
  "/admin/quickcommerce": "QuickCommerce",
  "/admin/provider-health": "Provider Health",
  "/admin/system": "System Health",
  "/admin/audit": "Audit Log",
  "/admin/settings": "Settings",
  "/admin/profile": "Profile & Security",
};

function resolvePageName(pathname: string): string {
  if (pageNames[pathname]) {
    return pageNames[pathname];
  }

  const matchedPath = Object.keys(pageNames)
    .filter((path) => path !== "/admin")
    .sort((a, b) => b.length - a.length)
    .find((path) => pathname.startsWith(`${path}/`));

  return matchedPath
    ? pageNames[matchedPath]
    : "Administration";
}

export default function AdminTopbar() {
  const pathname = usePathname();
  const router = useRouter();
  const pageName = resolvePageName(pathname);

  async function logout() {
    await fetch("/api/admin/logout", {
      method: "POST",
    });

    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex h-[4.5rem] items-center justify-between border-b border-slate-200 bg-white/90 px-8 shadow-sm backdrop-blur-xl">
      <div>
        <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
          <Link
            href="/admin"
            className="transition hover:text-blue-600"
          >
            Administration
          </Link>

          <span>/</span>

          <span className="text-slate-600">
            {pageName}
          </span>
        </div>

        <h1 className="mt-1 text-lg font-bold tracking-tight text-slate-900">
          {pageName}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="mr-2 flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          System Online
        </div>

        <Link
          href="/admin/profile"
          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white">
            AD
          </span>

          Administrator
        </Link>

        <button
          type="button"
          onClick={logout}
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-100"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
