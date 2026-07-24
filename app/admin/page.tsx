import Link from "next/link";

const tools = [
  {
    title: "Review Queue",
    description:
      "Review imported deals, edit product details, publish approved offers or delete invalid records.",
    href: "/admin/review",
    icon: "R",
    enabled: true,
  },
  {
    title: "Amazon Import",
    description:
      "Paste a normal Amazon product URL or SiteStripe short link, fetch product details and import the deal.",
    href: "/admin/amazon-import",
    icon: "A",
    enabled: true,
  },
  {
    title: "Flipkart Import",
    description:
      "Import affiliate deals from Flipkart.",
    href: "#",
    icon: "F",
    enabled: false,
  },
  {
    title: "Bulk Import",
    description:
      "Import multiple deals through CSV or spreadsheet.",
    href: "#",
    icon: "B",
    enabled: false,
  },
];

export default function AdminDashboardPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <header className="rounded-3xl bg-slate-950 p-8 text-white shadow-xl">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-emerald-300">
            Deals ADS
          </p>

          <h1 className="mt-3 text-3xl font-bold md:text-4xl">
            Administration
          </h1>

          <p className="mt-3 max-w-2xl text-slate-300">
            Manage affiliate imports, deal review and publishing tools.
          </p>
        </header>

        <section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {tools.map((tool) => {
            const content = (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-xl font-black text-emerald-700">
                    {tool.icon}
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      tool.enabled
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {tool.enabled
                      ? "Available"
                      : "Coming soon"}
                  </span>
                </div>

                <h2 className="mt-6 text-xl font-bold text-slate-950">
                  {tool.title}
                </h2>

                <p className="mt-2 min-h-16 text-sm leading-6 text-slate-600">
                  {tool.description}
                </p>

                <div className="mt-6 font-bold text-emerald-700">
                  {tool.enabled
                    ? "Open tool →"
                    : "Not available"}
                </div>
              </>
            );

            if (!tool.enabled) {
              return (
                <div
                  key={tool.title}
                  className="rounded-3xl border border-slate-200 bg-white p-6 opacity-70 shadow-sm"
                >
                  {content}
                </div>
              );
            }

            return (
              <Link
                key={tool.title}
                href={tool.href}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-emerald-300 hover:shadow-xl"
              >
                {content}
              </Link>
            );
          })}
        </section>
      </div>
    </main>
  );
}
