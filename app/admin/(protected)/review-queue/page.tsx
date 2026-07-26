"use client";

import { useCallback, useEffect, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import ActionButton from "@/components/ui/ActionButton";

type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED";

type ReviewItem = {
  id: string;
  source: string;
  productName: string;
  category: string;
  dealPrice: number;
  originalPrice: number;
  discount: number;
  coupon: string;
  dealUrl: string;
  imageUrl: string;
  status: ReviewStatus;
  reviewer?: string;
  reviewedAt?: string;
  remarks?: string;
  createdAt: string;
};

type ApiError = {
  success?: boolean;
  message?: string;
  error?: string;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function statusClass(status: ReviewStatus) {
  if (status === "APPROVED") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "REJECTED") {
    return "bg-red-100 text-red-700";
  }

  return "bg-amber-100 text-amber-700";
}

export default function ReviewQueuePage() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }

    try {
      const response = await fetch("/api/admin/review-queue", {
        cache: "no-store",
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const apiError = payload as ApiError | null;

        throw new Error(
          apiError?.message ||
            apiError?.error ||
            "Unable to load the review queue.",
        );
      }

      if (!Array.isArray(payload)) {
        throw new Error("Review Queue returned an invalid response.");
      }

      setItems(payload);
      setError("");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load the review queue.",
      );
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void load();

    const timer = window.setInterval(() => {
      void load(true);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [load]);

  async function performAction(
    item: ReviewItem,
    action: "approve" | "reject",
  ) {
    if (item.status !== "PENDING") {
      setError("This review item has already been processed.");
      return;
    }

    let remarks = "";

    if (action === "reject") {
      remarks =
        window.prompt("Enter rejection remarks:", item.remarks ?? "")?.trim() ??
        "";

      if (!remarks) {
        return;
      }
    }

    setBusyId(item.id);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/admin/review-queue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: item.id,
          action,
          remarks,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const apiError = payload as ApiError | null;

        throw new Error(
          apiError?.message ||
            apiError?.error ||
            `Unable to ${action} the review item.`,
        );
      }

      if (!payload?.id || !payload?.status) {
        throw new Error("Review Queue returned an invalid update response.");
      }

      setItems(current =>
        current.map(currentItem =>
          currentItem.id === payload.id ? payload : currentItem,
        ),
      );

      setMessage(
        action === "approve"
          ? "Deal approved successfully."
          : "Deal rejected successfully.",
      );
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : `Unable to ${action} the review item.`,
      );
    } finally {
      setBusyId(null);
    }
  }

  const pending = items.filter(item => item.status === "PENDING").length;
  const approved = items.filter(item => item.status === "APPROVED").length;
  const rejected = items.filter(item => item.status === "REJECTED").length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <PageHeader
          title="Review Queue"
          subtitle="Approve or reject incoming deals before publication."
        />

        <div className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-600">
          Auto Refresh • 5 sec
        </div>
      </div>

      {message ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-6 xl:grid-cols-4">
        <Card title="Pending" value={pending} />
        <Card title="Approved" value={approved} />
        <Card title="Rejected" value={rejected} />
        <Card title="Total" value={items.length} />
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="min-w-[1050px] w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-left">Product</th>
              <th className="px-4 py-3 text-left">Source</th>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-left">Price</th>
              <th className="px-4 py-3 text-left">Original</th>
              <th className="px-4 py-3 text-left">Discount</th>
              <th className="px-4 py-3 text-left">Coupon</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading && items.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-12 text-center text-gray-500"
                >
                  Loading review queue...
                </td>
              </tr>
            ) : null}

            {!loading && items.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-12 text-center text-gray-500"
                >
                  No deals are waiting for review.
                </td>
              </tr>
            ) : null}

            {items.map(item => {
              const processed = item.status !== "PENDING";
              const busy = busyId === item.id;

              return (
                <tr
                  key={item.id}
                  className="border-t align-top hover:bg-gray-50"
                >
                  <td className="max-w-[280px] px-4 py-3">
                    <div className="flex items-start gap-3">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt=""
                          className="h-12 w-12 rounded-lg border object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-xs font-semibold text-gray-500">
                          DEAL
                        </div>
                      )}

                      <div className="min-w-0">
                        <p className="font-medium text-gray-900">
                          {item.productName || "-"}
                        </p>

                        {item.dealUrl ? (
                          <a
                            href={item.dealUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-block text-xs text-blue-600 hover:underline"
                          >
                            Open deal
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3">{item.source || "-"}</td>
                  <td className="px-4 py-3">{item.category || "-"}</td>
                  <td className="px-4 py-3 font-medium">
                    {formatCurrency(item.dealPrice)}
                  </td>
                  <td className="px-4 py-3 text-gray-500 line-through">
                    {formatCurrency(item.originalPrice)}
                  </td>
                  <td className="px-4 py-3">
                    {Number(item.discount || 0)}%
                  </td>
                  <td className="px-4 py-3">{item.coupon || "-"}</td>

                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                        item.status,
                      )}`}
                    >
                      {item.status}
                    </span>

                    {item.reviewedAt ? (
                      <div className="mt-2 text-xs text-gray-500">
                        {new Date(item.reviewedAt).toLocaleString("en-IN")}
                      </div>
                    ) : null}

                    {item.remarks ? (
                      <div className="mt-1 max-w-[220px] text-xs text-gray-500">
                        {item.remarks}
                      </div>
                    ) : null}
                  </td>

                  <td className="px-4 py-3">
                    {processed ? (
                      <span className="text-xs font-medium text-gray-500">
                        Completed
                      </span>
                    ) : (
                      <div className="flex gap-2">
                        <ActionButton
                          disabled={busy}
                          onClick={() => performAction(item, "approve")}
                        >
                          {busy ? "Processing..." : "Approve"}
                        </ActionButton>

                        <ActionButton
                          disabled={busy}
                          onClick={() => performAction(item, "reject")}
                        >
                          Reject
                        </ActionButton>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
