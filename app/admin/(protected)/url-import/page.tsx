"use client";

import { useState, type ChangeEvent } from "react";

type PreviewItem = {
  id: string;
  inputUrl: string;
  status: string;
  decision: string;
  failureCode?: string;
  failureReason?: string;
  product?: {
    platform: string;
    title: string;
    category: string;
    price: number;
    mrp: number;
    discountPercent: number;
    imageUrl: string;
    score: number;
  };
  categoryAction?: string;
  extractionStages?: Array<{ stage: string; status: string; message: string; durationMs?: number }>;
};

type Batch = {
  id: string;
  status: string;
  items: PreviewItem[];
  summary: { submitted: number; ready: number; updates: number; duplicates: number; failed: number; imported: number };
};

export default function SmartUrlImportPage() {
  const [urls, setUrls] = useState("");
  const [minimumDiscount, setMinimumDiscount] = useState(0);
  const [minimumScore, setMinimumScore] = useState(0);
  const [autoPublish, setAutoPublish] = useState(false);
  const [batch, setBatch] = useState<Batch | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [runId, setRunId] = useState<string | null>(null);

  async function analyze() {
    setBusy(true); setMessage(""); setBatch(null);
    const currentRunId = crypto.randomUUID();
    setRunId(currentRunId);
    try {
      const response = await fetch("/api/admin/url-import/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ runId: currentRunId, urls, minimumDiscount, minimumScore, autoPublish }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Analysis failed.");
      setBatch(data.batch);
      setSelected(new Set(data.batch.items.filter((item: PreviewItem) => ["NEW", "UPDATE_PRICE", "REACTIVATE"].includes(item.decision)).map((item: PreviewItem) => item.id)));
    } catch (error) { setMessage(error instanceof Error ? error.message : "Analysis failed."); }
    finally { setBusy(false); setRunId(null); }
  }

  async function stopAnalysis() {
    if (!runId) return;
    const response = await fetch("/api/admin/url-import/stop", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ runId }) });
    const data = await response.json();
    setMessage(data.message || "Stop requested.");
  }

  async function commit() {
    if (!batch) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/url-import/commit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ batchId: batch.id, selectedItemIds: [...selected] }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Import failed.");
      setBatch(data.batch); setMessage(`${data.batch.summary.imported} deal(s) imported successfully.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Import failed."); }
    finally { setBusy(false); }
  }

  function toggle(id: string) {
    setSelected((current: Set<string>) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Deal Management</div>
        <h1 className="mt-2 text-3xl font-black text-slate-950">Smart URL Deal Import</h1>
        <p className="mt-2 max-w-4xl text-sm text-slate-600">Paste product URLs from Zepto, Blinkit, Instamart, BigBasket, Amazon, Flipkart and other commerce platforms. Product image and duplicate validation are mandatory. New categories are created dynamically.</p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <label className="text-sm font-bold text-slate-800">Product URLs — one per line</label>
        <textarea value={urls} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setUrls(event.target.value)} rows={9} placeholder="https://www.zepto.com/...\nhttps://blinkit.com/...\nhttps://www.amazon.in/..." className="mt-3 w-full rounded-xl border border-slate-300 p-4 font-mono text-sm outline-none focus:border-blue-500" />
        <div className="mt-4 grid grid-cols-4 gap-4">
          <label className="text-sm font-semibold text-slate-700">Minimum discount %<input type="number" min="0" max="100" value={minimumDiscount} onChange={(event: ChangeEvent<HTMLInputElement>) => setMinimumDiscount(Number(event.target.value))} className="mt-2 w-full rounded-lg border border-slate-300 p-2" /></label>
          <label className="text-sm font-semibold text-slate-700">Minimum smart score<input type="number" min="0" max="100" value={minimumScore} onChange={(event: ChangeEvent<HTMLInputElement>) => setMinimumScore(Number(event.target.value))} className="mt-2 w-full rounded-lg border border-slate-300 p-2" /></label>
          <label className="flex items-end gap-2 pb-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={autoPublish} onChange={(event: ChangeEvent<HTMLInputElement>) => setAutoPublish(event.target.checked)} className="h-4 w-4" /> Publish directly</label>
          <div className="flex items-end gap-2"><button onClick={analyze} disabled={busy || !urls.trim()} className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 font-bold text-white disabled:opacity-50">{busy ? "Processing..." : "Analyse URLs"}</button>{busy && runId && <button onClick={stopAnalysis} className="rounded-xl bg-red-600 px-4 py-3 font-bold text-white">STOP</button>}</div>
        </div>
      </section>

      {message && <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-900">{message}</div>}

      {batch && (
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid grid-cols-6 gap-3">
            {Object.entries(batch.summary).map(([key, value]) => <div key={key} className="rounded-xl bg-slate-50 p-3"><div className="text-xs font-bold uppercase text-slate-500">{key}</div><div className="mt-1 text-2xl font-black text-slate-900">{value}</div></div>)}
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase text-slate-600"><tr><th className="p-3">Select</th><th className="p-3">Product</th><th className="p-3">Platform</th><th className="p-3">Price</th><th className="p-3">Category</th><th className="p-3">Decision / Failure</th></tr></thead>
              <tbody>
                {batch.items.map((item: PreviewItem) => {
                  const actionable = ["NEW", "UPDATE_PRICE", "REACTIVATE"].includes(item.decision);
                  return <tr key={item.id} className="border-t border-slate-100 align-top">
                    <td className="p-3"><input type="checkbox" disabled={!actionable || batch.status !== "preview"} checked={selected.has(item.id)} onChange={() => toggle(item.id)} /></td>
                    <td className="p-3"><div className="flex max-w-md gap-3">{item.product?.imageUrl && <img src={item.product.imageUrl} alt="" className="h-16 w-16 rounded-lg border object-contain" />}<div><div className="font-bold text-slate-900">{item.product?.title || "Extraction failed"}</div><div className="mt-1 break-all text-xs text-slate-500">{item.inputUrl}</div></div></div></td>
                    <td className="p-3 font-semibold">{item.product?.platform || "—"}</td>
                    <td className="p-3">{item.product ? <><div className="font-bold">₹{item.product.price}</div><div className="text-xs text-slate-500">MRP ₹{item.product.mrp} · {item.product.discountPercent}% off · Score {item.product.score}</div></> : "—"}</td>
                    <td className="p-3"><div className="font-semibold">{item.product?.category || "—"}</div>{item.categoryAction && <div className="text-xs text-slate-500">{item.categoryAction}</div>}</td>
                    <td className="p-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${item.decision === "FAILED" ? "bg-red-100 text-red-700" : item.decision.startsWith("DUPLICATE") ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-700"}`}>{item.decision}</span>{item.failureReason && <div className="mt-2 max-w-xs text-xs text-red-700">{item.failureCode}: {item.failureReason}</div>}{item.extractionStages?.length ? <details className="mt-3 max-w-sm"><summary className="cursor-pointer text-xs font-bold text-blue-700">Extraction timeline</summary><div className="mt-2 space-y-1">{item.extractionStages.map((stage, index) => <div key={`${stage.stage}-${index}`} className={`rounded-lg border px-2 py-1.5 text-xs ${stage.status === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : stage.status === "failed" ? "border-red-200 bg-red-50 text-red-800" : "border-slate-200 bg-slate-50 text-slate-700"}`}><div className="font-bold">{stage.status === "success" ? "✓" : stage.status === "failed" ? "✕" : "–"} {stage.stage.replaceAll("_", " ")}</div><div>{stage.message}{typeof stage.durationMs === "number" ? ` (${stage.durationMs} ms)` : ""}</div></div>)}</div></details> : null}</td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
          {batch.status === "preview" && <div className="flex justify-end"><button onClick={commit} disabled={busy || selected.size === 0} className="rounded-xl bg-emerald-600 px-6 py-3 font-bold text-white disabled:opacity-50">Import Selected Deals ({selected.size})</button></div>}
        </section>
      )}
    </div>
  );
}
