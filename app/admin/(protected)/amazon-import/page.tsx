"use client";

import Link from "next/link";
import {
  FormEvent,
  useMemo,
  useRef,
  useState,
} from "react";

type ProductDetails = {
  asin: string;
  sourceUrl: string;
  resolvedUrl: string;
  affiliateUrl: string;
  title: string;
  imageUrl: string;
  price: number;
  mrp: number;
  discountPercent: number;
  rating: number;
  reviewCount: number;
  availability: string;
  category: string;
};

type FetchResponse = {
  success?: boolean;
  partial?: boolean;
  product?: ProductDetails;
  error?: string;
  message?: string;
};

type ImportResponse = {
  success?: boolean;
  error?: string;
  message?: string;
  asin?: string;
  affiliateUrl?: string;
  discountPercent?: number;
  imported?: number;
  skipped?: number;
  status?: string;
  errors?: string[];
};

type FormState = {
  amazonUrl: string;
  title: string;
  category: string;
  price: string;
  mrp: string;
  rating: string;
  votes: string;
  imageUrl: string;
  expiryDate: string;
  couponCode: string;
  couponTerms: string;
  publish: boolean;
};

const initialForm: FormState = {
  amazonUrl: "",
  title: "",
  category: "Amazon Deals",
  price: "",
  mrp: "",
  rating: "",
  votes: "",
  imageUrl: "",
  expiryDate: "",
  couponCode: "",
  couponTerms: "",
  publish: false,
};

function amount(value: string): number {
  const parsed = Number(
    value.replace(/[₹,\s]/g, ""),
  );

  return Number.isFinite(parsed) ? parsed : 0;
}

function displayAmount(value: string): string {
  const number = amount(value);

  if (!number) {
    return "₹0";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(number);
}

export default function AmazonImportPage() {
  const [form, setForm] =
    useState<FormState>(initialForm);

  const [fetching, setFetching] = useState(false);
  const [importing, setImporting] = useState(false);
  const [fetchResult, setFetchResult] =
    useState<FetchResponse | null>(null);
  const [importResult, setImportResult] =
    useState<ImportResponse | null>(null);

  const urlInputRef =
    useRef<HTMLInputElement | null>(null);

  const discount = useMemo(() => {
    const price = amount(form.price);
    const mrp = amount(form.mrp);

    if (price <= 0 || mrp <= 0 || price >= mrp) {
      return 0;
    }

    return Math.round(
      ((mrp - price) / mrp) * 100,
    );
  }, [form.price, form.mrp]);

  function update<K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function fetchDetails() {
    setFetchResult(null);
    setImportResult(null);

    if (!form.amazonUrl.trim()) {
      setFetchResult({
        error: "Amazon URL is required.",
      });
      urlInputRef.current?.focus();
      return;
    }

    setFetching(true);

    try {
      const response = await fetch(
        "/api/admin/amazon-fetch",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            amazonUrl: form.amazonUrl,
          }),
        },
      );

      const payload =
        (await response.json()) as FetchResponse;

      setFetchResult(payload);

      if (
        response.ok &&
        payload.success &&
        payload.product
      ) {
        const product = payload.product;

        setForm((current) => ({
          ...current,
          amazonUrl:
            product.resolvedUrl ||
            current.amazonUrl,
          title:
            product.title ||
            current.title,
          category:
            product.category ||
            current.category,
          price:
            product.price > 0
              ? String(product.price)
              : current.price,
          mrp:
            product.mrp > 0
              ? String(product.mrp)
              : current.mrp,
          rating:
            product.rating > 0
              ? String(product.rating)
              : current.rating,
          votes:
            product.reviewCount > 0
              ? String(product.reviewCount)
              : current.votes,
          imageUrl:
            product.imageUrl ||
            current.imageUrl,
        }));
      }
    } catch (error) {
      setFetchResult({
        error: "Fetch request failed.",
        message:
          error instanceof Error
            ? error.message
            : String(error),
      });
    } finally {
      setFetching(false);
    }
  }

  async function submit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setImporting(true);
    setImportResult(null);

    try {
      const response = await fetch(
        "/api/admin/amazon-import",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            amazonUrl: form.amazonUrl,
            title: form.title,
            category: form.category,
            price: form.price,
            mrp: form.mrp,
            rating: form.rating,
            votes: form.votes,
            imageUrl: form.imageUrl,
            expiryDate: form.expiryDate,
            couponCode: form.couponCode,
            couponTerms: form.couponTerms,
            publish: form.publish,
          }),
        },
      );

      const payload =
        (await response.json()) as ImportResponse;

      setImportResult(payload);

      if (response.ok) {
        setForm({
          ...initialForm,
          category: form.category,
        });

        window.setTimeout(() => {
          urlInputRef.current?.focus();
        }, 50);
      }
    } catch (error) {
      setImportResult({
        error: "Import request failed.",
        message:
          error instanceof Error
            ? error.message
            : String(error),
      });
    } finally {
      setImporting(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";

  const labelClass =
    "mb-2 block text-sm font-semibold text-slate-700";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/admin"
          className="mb-5 inline-flex items-center gap-2 font-semibold text-slate-600 hover:text-emerald-700"
        >
          ← Back to Admin
        </Link>

        <header className="rounded-3xl bg-slate-950 p-7 text-white shadow-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">
            Deals ADS Admin
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Amazon Associate Deal Importer
          </h1>

          <p className="mt-3 max-w-3xl text-slate-300">
            Paste a normal Amazon product URL or a
            SiteStripe short link. Fetch the available
            product information, verify it and import
            the deal.
          </p>
        </header>

        <section className="mt-8 rounded-3xl bg-white p-6 shadow-xl md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1">
              <label className={labelClass}>
                Amazon product or SiteStripe URL
              </label>

              <input
                ref={urlInputRef}
                type="url"
                required
                value={form.amazonUrl}
                onChange={(event) =>
                  update(
                    "amazonUrl",
                    event.target.value,
                  )
                }
                className={inputClass}
                placeholder="https://www.amazon.in/dp/... or https://amzn.to/..."
              />
            </div>

            <button
              type="button"
              onClick={fetchDetails}
              disabled={
                fetching ||
                !form.amazonUrl.trim()
              }
              className="min-w-40 rounded-xl bg-amber-500 px-6 py-3 font-bold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {fetching
                ? "Fetching..."
                : "Fetch Details"}
            </button>
          </div>

          {fetchResult && (
            <div
              className={`mt-5 rounded-2xl border p-4 ${
                fetchResult.success && !fetchResult.partial
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : fetchResult.success && fetchResult.partial
                    ? "border-blue-200 bg-blue-50 text-blue-900"
                    : "border-amber-200 bg-amber-50 text-amber-900"
              }`}
            >
              <strong>
                {fetchResult.success && fetchResult.partial
                  ? "Amazon URL processed."
                  : fetchResult.success
                    ? "Product details fetched."
                    : fetchResult.error}
              </strong>

              {fetchResult.message && (
                <p className="mt-1">
                  {fetchResult.message}
                </p>
              )}

              {fetchResult.success &&
                fetchResult.product?.asin && (
                  <div className="mt-3 space-y-1 text-sm">
                    <p>
                      ASIN:{" "}
                      <strong>
                        {fetchResult.product.asin}
                      </strong>
                    </p>

                    <p className="break-all">
                      Affiliate URL:{" "}
                      <a
                        href={
                          fetchResult.product
                            .affiliateUrl
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold underline"
                      >
                        {
                          fetchResult.product
                            .affiliateUrl
                        }
                      </a>
                    </p>
                  </div>
                )}

              {!fetchResult.success && (
                <p className="mt-2 text-sm">
                  Verify the URL and try again.
                </p>
              )}
            </div>
          )}
        </section>

        <form
          onSubmit={submit}
          className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]"
        >
          <section className="rounded-3xl bg-white p-6 shadow-xl md:p-8">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className={labelClass}>
                  Product title
                </label>

                <input
                  required
                  minLength={5}
                  value={form.title}
                  onChange={(event) =>
                    update(
                      "title",
                      event.target.value,
                    )
                  }
                  className={inputClass}
                  placeholder="Amazon product title"
                />
              </div>

              <div>
                <label className={labelClass}>
                  Category
                </label>

                <input
                  required
                  value={form.category}
                  onChange={(event) =>
                    update(
                      "category",
                      event.target.value,
                    )
                  }
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>
                  Product image URL
                </label>

                <input
                  type="url"
                  value={form.imageUrl}
                  onChange={(event) =>
                    update(
                      "imageUrl",
                      event.target.value,
                    )
                  }
                  className={inputClass}
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className={labelClass}>
                  Selling price
                </label>

                <input
                  required
                  inputMode="decimal"
                  value={form.price}
                  onChange={(event) =>
                    update(
                      "price",
                      event.target.value,
                    )
                  }
                  className={inputClass}
                  placeholder="Example: 1999"
                />
              </div>

              <div>
                <label className={labelClass}>
                  MRP
                </label>

                <input
                  required
                  inputMode="decimal"
                  value={form.mrp}
                  onChange={(event) =>
                    update(
                      "mrp",
                      event.target.value,
                    )
                  }
                  className={inputClass}
                  placeholder="Example: 2999"
                />

                <p className="mt-2 font-bold text-emerald-700">
                  Calculated discount: {discount}% OFF
                </p>
              </div>

              <div>
                <label className={labelClass}>
                  Rating
                </label>

                <input
                  inputMode="decimal"
                  value={form.rating}
                  onChange={(event) =>
                    update(
                      "rating",
                      event.target.value,
                    )
                  }
                  className={inputClass}
                  placeholder="4.3"
                />
              </div>

              <div>
                <label className={labelClass}>
                  Review count
                </label>

                <input
                  inputMode="numeric"
                  value={form.votes}
                  onChange={(event) =>
                    update(
                      "votes",
                      event.target.value,
                    )
                  }
                  className={inputClass}
                  placeholder="1250"
                />
              </div>

              <div>
                <label className={labelClass}>
                  Coupon code
                </label>

                <input
                  value={form.couponCode}
                  onChange={(event) =>
                    update(
                      "couponCode",
                      event.target.value,
                    )
                  }
                  className={inputClass}
                  placeholder="Optional"
                />
              </div>

              <div>
                <label className={labelClass}>
                  Expiry date
                </label>

                <input
                  type="date"
                  value={form.expiryDate}
                  onChange={(event) =>
                    update(
                      "expiryDate",
                      event.target.value,
                    )
                  }
                  className={inputClass}
                />
              </div>

              <div className="md:col-span-2">
                <label className={labelClass}>
                  Coupon terms
                </label>

                <textarea
                  rows={4}
                  value={form.couponTerms}
                  onChange={(event) =>
                    update(
                      "couponTerms",
                      event.target.value,
                    )
                  }
                  className={inputClass}
                  placeholder="Optional coupon or offer terms"
                />
              </div>
            </div>

            <div className="mt-7 flex flex-col gap-4 rounded-2xl bg-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={form.publish}
                  onChange={(event) =>
                    update(
                      "publish",
                      event.target.checked,
                    )
                  }
                  className="h-5 w-5 rounded border-slate-300"
                />

                Publish immediately
              </label>

              <button
                type="submit"
                disabled={importing}
                className="rounded-xl bg-emerald-600 px-7 py-3 font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {importing
                  ? "Importing..."
                  : form.publish
                    ? "Import and publish"
                    : "Import for review"}
              </button>
            </div>

            {importResult && (
              <div
                className={`mt-6 rounded-2xl border p-5 ${
                  importResult.success
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                    : "border-red-200 bg-red-50 text-red-900"
                }`}
              >
                <h2 className="font-bold">
                  {importResult.success
                    ? "Amazon deal imported"
                    : importResult.error ||
                      "Import failed"}
                </h2>

                {importResult.message && (
                  <p className="mt-2">
                    {importResult.message}
                  </p>
                )}

                {importResult.asin && (
                  <p className="mt-2">
                    ASIN:{" "}
                    <strong>
                      {importResult.asin}
                    </strong>
                  </p>
                )}

                {importResult.status && (
                  <p>
                    Status:{" "}
                    <strong>
                      {importResult.status}
                    </strong>
                  </p>
                )}

                {importResult.affiliateUrl && (
                  <a
                    href={
                      importResult.affiliateUrl
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 block break-all font-semibold underline"
                  >
                    Open affiliate link
                  </a>
                )}
              </div>
            )}
          </section>

          <aside className="h-fit rounded-3xl bg-slate-950 p-6 text-white shadow-xl lg:sticky lg:top-6">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
              Deal Preview
            </p>

            <div className="mt-5 overflow-hidden rounded-2xl bg-white text-slate-950">
              <div className="flex aspect-square items-center justify-center bg-slate-100">
                {form.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.imageUrl}
                    alt={form.title || "Preview"}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <span className="text-sm font-semibold text-slate-400">
                    Product image
                  </span>
                )}
              </div>

              <div className="p-5">
                <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">
                  {discount}% OFF
                </span>

                <h2 className="mt-4 line-clamp-3 font-bold">
                  {form.title ||
                    "Amazon product title"}
                </h2>

                <p className="mt-3 text-sm text-amber-600">
                  ★{" "}
                  {form.rating || "0"}{" "}
                  <span className="text-slate-500">
                    (
                    {amount(
                      form.votes,
                    ).toLocaleString("en-IN")}
                    )
                  </span>
                </p>

                <div className="mt-4 flex flex-wrap items-baseline gap-2">
                  <strong className="text-2xl">
                    {displayAmount(form.price)}
                  </strong>

                  <span className="text-sm text-slate-400 line-through">
                    {displayAmount(form.mrp)}
                  </span>
                </div>

                <p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                  {form.category}
                </p>
              </div>
            </div>
          </aside>
        </form>
      </div>
    </main>
  );
}
