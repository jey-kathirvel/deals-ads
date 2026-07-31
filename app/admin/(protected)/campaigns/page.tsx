"use client";

import PageHeader from "@/components/ui/PageHeader";
import { useCallback, useEffect, useState } from "react";

type Campaign = {
  id: string;
  name: string;
  placement: string;
  type: "iframe";
  title: string;
  subtitle: string;
  iframeUrl: string;
  redirectUrl: string;
  redirectLabel: string;
  enabled: boolean;
  priority: number;
  startDate: string;
  endDate: string;
  showOnce: boolean;
  delaySeconds: number;
};

type CampaignForm = Omit<Campaign, "id"> & { id?: string };

function toLocalInput(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function initialForm(): CampaignForm {
  return {
    name: "",
    placement: "lightning",
    type: "iframe",
    title: "",
    subtitle: "",
    iframeUrl: "",
    redirectUrl: "",
    redirectLabel: "View Deal",
    enabled: true,
    priority: 1,
    startDate: toLocalInput(new Date().toISOString()),
    endDate: toLocalInput(
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    ),
    showOnce: false,
    delaySeconds: 5,
  };
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [form, setForm] = useState<CampaignForm>(initialForm);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/campaigns", { cache: "no-store" });
    if (!response.ok) {
      setMessage("Unable to load campaigns.");
      return;
    }
    setCampaigns((await response.json()) as Campaign[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(payload: CampaignForm = form) {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          placement: "lightning",
          type: "iframe",
          startDate: new Date(payload.startDate).toISOString(),
          endDate: new Date(payload.endDate).toISOString(),
        }),
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(result.message || "Unable to save.");

      setMessage(payload.id ? "Lightning deal updated." : "Lightning deal created.");
      setForm(initialForm());
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save.");
    } finally {
      setSaving(false);
    }
  }

  function edit(campaign: Campaign) {
    setForm({
      ...campaign,
      placement: "lightning",
      startDate: toLocalInput(campaign.startDate),
      endDate: toLocalInput(campaign.endDate),
      delaySeconds: campaign.delaySeconds ?? 5,
      redirectUrl: campaign.redirectUrl ?? "",
      redirectLabel: campaign.redirectLabel ?? "View Deal",
      showOnce: false,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this lightning deal permanently?")) return;
    await fetch("/api/admin/campaigns", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setMessage("Lightning deal deleted.");
    if (form.id === id) setForm(initialForm());
    await load();
  }

  const inputClass =
    "mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100";

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-8">
      <PageHeader
        title="Lightning Deals"
        subtitle="Launch a scheduled deal popup across the public storefront"
      />

      {message && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-slate-800">
          {message}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-yellow-300 via-amber-300 to-yellow-200 px-6 py-5">
          <h2 className="text-xl font-black text-slate-950">
            {form.id ? "Edit lightning deal" : "Create lightning deal"}
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-700">
            The product creative opens after the configured delay when this
            campaign is active.
          </p>
        </div>

        <div className="grid gap-5 p-6 md:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">
            Internal campaign name
            <input
              required
              className={inputClass}
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Popup title
            <input
              className={inputClass}
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
            />
          </label>
          <label className="text-sm font-semibold text-slate-700 md:col-span-2">
            Subtitle
            <input
              className={inputClass}
              value={form.subtitle}
              onChange={(event) =>
                setForm({ ...form, subtitle: event.target.value })
              }
            />
          </label>
          <label className="text-sm font-semibold text-slate-700 md:col-span-2">
            Product image or HTTPS iframe URL
            <input
              required
              type="url"
              className={inputClass}
              placeholder="https://..."
              value={form.iframeUrl}
              onChange={(event) =>
                setForm({ ...form, iframeUrl: event.target.value })
              }
            />
            <span className="mt-1 block text-xs font-normal text-slate-500">
              Direct image URLs are fitted inside the popup automatically. Web
              pages must permit iframe embedding.
            </span>
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Redirect URL
            <input
              type="url"
              className={inputClass}
              placeholder="https://amazon.in/..."
              value={form.redirectUrl}
              onChange={(event) =>
                setForm({ ...form, redirectUrl: event.target.value })
              }
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Redirect button text
            <input
              className={inputClass}
              placeholder="View Deal"
              value={form.redirectLabel}
              onChange={(event) =>
                setForm({ ...form, redirectLabel: event.target.value })
              }
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Starts at
            <input
              required
              type="datetime-local"
              className={inputClass}
              value={form.startDate}
              onChange={(event) =>
                setForm({ ...form, startDate: event.target.value })
              }
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Ends at
            <input
              required
              type="datetime-local"
              className={inputClass}
              value={form.endDate}
              onChange={(event) =>
                setForm({ ...form, endDate: event.target.value })
              }
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Display delay (seconds)
            <input
              type="number"
              min={0}
              max={300}
              className={inputClass}
              value={form.delaySeconds}
              onChange={(event) =>
                setForm({ ...form, delaySeconds: Number(event.target.value) })
              }
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Priority
            <input
              type="number"
              min={1}
              className={inputClass}
              value={form.priority}
              onChange={(event) =>
                setForm({ ...form, priority: Number(event.target.value) })
              }
            />
          </label>

          <div className="flex flex-wrap gap-6 md:col-span-2">
            <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(event) =>
                  setForm({ ...form, enabled: event.target.checked })
                }
                className="h-5 w-5 accent-slate-950"
              />
              Enabled
            </label>
            <p className="text-sm text-slate-500">
              Active campaigns display on every full storefront refresh.
            </p>
          </div>

          <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5 md:col-span-2">
            {form.id && (
              <button
                type="button"
                onClick={() => setForm(initialForm())}
                className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700"
              >
                Cancel edit
              </button>
            )}
            <button
              type="button"
              disabled={saving || !form.name || !form.iframeUrl}
              onClick={() => void save()}
              className="rounded-xl bg-slate-950 px-6 py-3 text-sm font-bold text-yellow-300 disabled:opacity-50"
            >
              {saving ? "Saving..." : form.id ? "Update deal" : "Create deal"}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">Campaign history</h2>
        <div className="mt-5 grid gap-4">
          {campaigns.length ? (
            campaigns.map((campaign) => (
              <article
                key={campaign.id}
                className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 p-4 lg:flex-row lg:items-center"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-slate-950">{campaign.name}</h3>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                        campaign.enabled
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {campaign.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {new Date(campaign.startDate).toLocaleString()} –{" "}
                    {new Date(campaign.endDate).toLocaleString()} ·{" "}
                    {campaign.delaySeconds ?? 5}s delay · priority{" "}
                    {campaign.priority}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      void save({ ...campaign, enabled: !campaign.enabled })
                    }
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700"
                  >
                    {campaign.enabled ? "Disable" : "Enable"}
                  </button>
                  <button
                    type="button"
                    onClick={() => edit(campaign)}
                    className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-yellow-300"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(campaign.id)}
                    className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700"
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))
          ) : (
            <p className="rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500">
              No campaigns created yet.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
