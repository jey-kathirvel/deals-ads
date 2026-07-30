"use client";

import { useEffect, useMemo, useState } from "react";
import type { Deal } from "@/lib/deal-types";
import { slugify } from "@/lib/slug";
/* PATCH-004.1H: HOMEPAGE PREMIUM GROCERY EXPERIENCE */
const inr = new Intl.NumberFormat("en-IN");

const formatRating = (rating: number) => {
  if (!Number.isFinite(rating) || rating <= 0) {
    return "New";
  }

  return rating.toFixed(1);
};

type DealCollection = "daily" | "under99" | "under999";

/* PATCH-004.1F-A */
type GroceryProvider =
  | "All"
  | "Blinkit"
  | "Zepto"
  | "Flipkart Minutes"
  | "Amazon Now";

const groceryProviders: GroceryProvider[] = [
  "All",
  "Blinkit",
  "Zepto",
  "Flipkart Minutes",
  "Amazon Now",
];

const normalizeProviderValue = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const getGroceryProvider = (
  deal: Deal,
): Exclude<GroceryProvider, "All"> | null => {
  const provider = normalizeProviderValue(
    deal.providerPlatform || deal.platform,
  );

  if (provider === "blinkit" || provider.includes("blinkit")) {
    return "Blinkit";
  }

  if (provider === "zepto" || provider.includes("zepto")) {
    return "Zepto";
  }

  if (
    provider === "flipkart minutes" ||
    provider.includes("flipkart minutes") ||
    provider.includes("flipkart minute")
  ) {
    return "Flipkart Minutes";
  }

  /*
   * Do not classify ordinary Amazon deals as Amazon Now.
   * Amazon Now is shown only when the provider value explicitly
   * identifies the quick-commerce service.
   */
  if (provider === "amazon now" || provider.includes("amazon now")) {
    return "Amazon Now";
  }

  return null;
};

const collectionDetails: Record<
  DealCollection,
  {
    eyebrow: string;
    title: string;
    description: string;
    action: string;
  }
> = {
  daily: {
    eyebrow: "Fresh deals today",
    title: "Daily Deals",
    description:
      "Explore today’s active offers selected from our latest deal feed.",
    action: "Explore daily deals",
  },
  under99: {
    eyebrow: "Pocket-friendly finds",
    title: "Under ₹99 Deals",
    description:
      "Useful everyday products and exciting small-price discoveries.",
    action: "Explore under ₹99",
  },
  under999: {
    eyebrow: "Big value, smaller price",
    title: "Under ₹999 Deals",
    description:
      "Electronics, fashion, home products and essentials below ₹999.",
    action: "Explore under ₹999",
  },
};
const scoreDeal = (deal: Deal) =>
  Math.min(
    98,
    Math.round(
      38 +
        Math.max(0, (1 - deal.price / deal.mrp) * 100) * 0.55 +
        deal.rating * 4 +
        Math.min(deal.votes, 250) * 0.04,
    ),
  );
type IconName =
  | "search"
  | "heart"
  | "sparkles"
  | "arrow"
  | "scan"
  | "chart"
  | "shield"
  | "tag"
  | "star"
  | "check"
  | "trending"
  | "clock";
const paths: Record<IconName, React.ReactNode> = {
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </>
  ),
  heart: (
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
  ),
  sparkles: (
    <>
      <path d="m12 3-1.4 3.6L7 8l3.6 1.4L12 13l1.4-3.6L17 8l-3.6-1.4L12 3Z" />
      <path d="m5 15-.8 2.2L2 18l2.2.8L5 21l.8-2.2L8 18l-2.2-.8L5 15Z" />
      <path d="m19 13-.7 1.7-1.8.8 1.8.7L19 18l.7-1.8 1.8-.7-1.8-.8L19 13Z" />
    </>
  ),
  arrow: (
    <>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </>
  ),
  scan: (
    <>
      <path d="M4 7V4h3M17 4h3v3M20 17v3h-3M7 20H4v-3" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  chart: (
    <>
      <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 4.5 6v5.5c0 4.8 3.2 8 7.5 9.5 4.3-1.5 7.5-4.7 7.5-9.5V6L12 3Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  tag: (
    <>
      <path d="M20 13 13 20l-9-9V4h7l9 9Z" />
      <circle cx="8.5" cy="8.5" r="1" />
    </>
  ),
  star: (
    <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z" />
  ),
  check: <path d="m5 12 4 4L19 6" />,
  trending: (
    <>
      <path d="m3 17 6-6 4 4 7-8" />
      <path d="M15 7h5v5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
};
function Icon({ name, filled = false }: { name: IconName; filled?: boolean }) {
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

/* PATCH-004.1F-B */
type GroceryAvailability = "available" | "unavailable" | "checking";

type GroceryFreshnessLevel = "fresh" | "recent" | "stale" | "unknown";

type GroceryFreshness = {
  label: string;
  level: GroceryFreshnessLevel;
};

const parseDealDate = (value: string): Date | null => {
  if (!value || !value.trim()) {
    return null;
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getGroceryAvailability = (deal: Deal): GroceryAvailability => {
  if (!deal.active || deal.status === "expired") {
    return "unavailable";
  }

  const expiryDate = parseDealDate(deal.expiryDate);

  if (expiryDate && expiryDate.getTime() < Date.now()) {
    return "unavailable";
  }

  if (deal.status === "published") {
    return "available";
  }

  return "checking";
};

const groceryAvailabilityLabels: Record<GroceryAvailability, string> = {
  available: "Available",
  unavailable: "Unavailable",
  checking: "Verification pending",
};

const formatCachedTimestamp = (value: string): string => {
  const date = parseDealDate(value);

  if (!date) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(date);
};

const getFreshnessLabel = (value: string): GroceryFreshness => {
  const checkedAt = parseDealDate(value);

  if (!checkedAt) {
    return {
      label: "Check time unavailable",
      level: "unknown",
    };
  }

  const ageMilliseconds = Math.max(0, Date.now() - checkedAt.getTime());

  const ageMinutes = Math.floor(ageMilliseconds / 60_000);

  if (ageMinutes < 60) {
    return {
      label:
        ageMinutes <= 1
          ? "Checked just now"
          : `Checked ${ageMinutes} minutes ago`,
      level: "fresh",
    };
  }

  const ageHours = Math.floor(ageMinutes / 60);

  if (ageHours < 24) {
    return {
      label:
        ageHours === 1 ? "Checked 1 hour ago" : `Checked ${ageHours} hours ago`,
      level: "fresh",
    };
  }

  const ageDays = Math.floor(ageHours / 24);

  if (ageDays <= 2) {
    return {
      label:
        ageDays === 1 ? "Checked yesterday" : `Checked ${ageDays} days ago`,
      level: "recent",
    };
  }

  return {
    label: `Checked ${ageDays} days ago`,
    level: "stale",
  };
};

const getProviderClassName = (provider: string | null): string => {
  if (!provider) {
    return "other";
  }

  return normalizeProviderValue(provider).replace(/\s+/g, "-");
};

const newestDealFirst = (a: Deal, b: Deal): number => {
  const aImportedAt = Date.parse(a.importedAt || a.updatedAt || "");
  const bImportedAt = Date.parse(b.importedAt || b.updatedAt || "");
  const timestampDifference =
    (Number.isFinite(bImportedAt) ? bImportedAt : 0) -
    (Number.isFinite(aImportedAt) ? aImportedAt : 0);

  return timestampDifference !== 0 ? timestampDifference : b.id - a.id;
};

export default function DealsApp({
  initialDeals = [],
  initialCategory = "All",
}: {
  initialDeals?: Deal[];
  initialCategory?: string;
}) {
  const [category, setCategory] = useState(initialCategory);
  const [query, setQuery] = useState("");
  const [groceryOnlyProvider, setGroceryOnlyProvider] = useState("All");
  const [deliveryPincode, setDeliveryPincode] = useState("");
  const [savedDeliveryPincode, setSavedDeliveryPincode] = useState("");
  const [pincodeStatus, setPincodeStatus] = useState<
    "idle" | "valid" | "invalid"
  >("idle");
  const [sort, setSort] = useState("Latest");
  const [groceryProvider, setGroceryProvider] =
    useState<GroceryProvider>("All");
  const [saved, setSaved] = useState<number[]>([]);
  const [copied, setCopied] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<
    "categories" | "stores" | "grocery" | null
  >(null);
  const [contactStatus, setContactStatus] = useState<
    "idle" | "sending" | "success" | "error"
  >("idle");
  const [lightningTime, setLightningTime] = useState({
    hours: "00",
    minutes: "00",
    seconds: "00",
  });
  const [collection, setCollection] = useState<DealCollection>("daily");

  const isGroceryPage = initialCategory.trim().toLowerCase() === "grocery";

  const marketplaceDeals = useMemo(
    () =>
      isGroceryPage
        ? initialDeals
        : initialDeals.filter(
            (deal) => deal.category.trim().toLowerCase() !== "grocery",
          ),
    [initialDeals, isGroceryPage],
  );

  const dynamicCategories = useMemo(
    () => [
      "All",
      ...Array.from(
        new Set(
          marketplaceDeals.map((deal) => deal.category.trim()).filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    ],
    [marketplaceDeals],
  );

  const collectionDeals = useMemo(() => {
    if (collection === "under99") {
      return marketplaceDeals.filter(
        (deal) => deal.price > 0 && deal.price <= 99,
      );
    }

    if (collection === "under999") {
      return marketplaceDeals.filter(
        (deal) => deal.price > 0 && deal.price <= 999,
      );
    }

    return marketplaceDeals;
  }, [collection, marketplaceDeals]);

  const groceryProviderCounts = useMemo(() => {
    const groceryDeals = initialDeals.filter(
      (deal) => deal.category.trim().toLowerCase() === "grocery",
    );

    const counts: Record<GroceryProvider, number> = {
      All: groceryDeals.length,
      Blinkit: 0,
      Zepto: 0,
      "Flipkart Minutes": 0,
      "Amazon Now": 0,
    };

    groceryDeals.forEach((deal) => {
      const provider = getGroceryProvider(deal);

      if (provider) {
        counts[provider] += 1;
      }
    });

    return counts;
  }, [initialDeals]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const result = collectionDeals.filter((deal) => {
      const matchesCategory =
        category === "All" ||
        deal.category.toLowerCase() === category.toLowerCase();

      const matchesQuery = `${deal.title} ${deal.platform} ${
        deal.providerPlatform || ""
      } ${deal.category}`
        .toLowerCase()
        .includes(normalizedQuery);

      const matchesGroceryProvider =
        !isGroceryPage ||
        groceryProvider === "All" ||
        getGroceryProvider(deal) === groceryProvider;

      return matchesCategory && matchesQuery && matchesGroceryProvider;
    });

    return [...result].sort((a, b) => {
      if (sort === "Latest") {
        return newestDealFirst(a, b);
      }

      if (sort === "Discount") {
        const aDiscount = a.mrp > 0 ? 1 - a.price / a.mrp : 0;
        const bDiscount = b.mrp > 0 ? 1 - b.price / b.mrp : 0;

        return bDiscount - aDiscount;
      }

      if (sort === "Price: Low") {
        return a.price - b.price;
      }

      return b.votes - a.votes;
    });
  }, [category, query, sort, collectionDeals, groceryProvider, isGroceryPage]);

  const collectionCounts = useMemo(
    () => ({
      daily: marketplaceDeals.length,
      under99: marketplaceDeals.filter(
        (deal) => deal.price > 0 && deal.price <= 99,
      ).length,
      under999: marketplaceDeals.filter(
        (deal) => deal.price > 0 && deal.price <= 999,
      ).length,
    }),
    [marketplaceDeals],
  );
  useEffect(() => {
    const INDIA_OFFSET_MS = 5.5 * 60 * 60 * 1000;
    const LIGHTNING_INTERVAL_MS = 6 * 60 * 60 * 1000;

    const updateLightningTimer = () => {
      const now = Date.now();
      const indiaNow = now + INDIA_OFFSET_MS;

      const nextIndiaSlot =
        Math.ceil(indiaNow / LIGHTNING_INTERVAL_MS) * LIGHTNING_INTERVAL_MS;

      const nextSlotUtc = nextIndiaSlot - INDIA_OFFSET_MS;

      const remainingSeconds = Math.max(
        0,
        Math.floor((nextSlotUtc - now) / 1000),
      );

      const hours = Math.floor(remainingSeconds / 3600);

      const minutes = Math.floor((remainingSeconds % 3600) / 60);

      const seconds = remainingSeconds % 60;

      setLightningTime({
        hours: String(hours).padStart(2, "0"),
        minutes: String(minutes).padStart(2, "0"),
        seconds: String(seconds).padStart(2, "0"),
      });
    };

    updateLightningTimer();

    const interval = window.setInterval(updateLightningTimer, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const stores = useMemo(
    () =>
      Array.from(
        new Set(
          marketplaceDeals.map((deal) => deal.platform.trim()).filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [marketplaceDeals],
  );

  const chooseCategory = (value: string) => {
    setCategory(value);
    setMenuOpen(false);
    setActiveMenu(null);

    window.requestAnimationFrame(() => {
      document.querySelector("#deals")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const chooseStore = (value: string) => {
    setQuery(value);
    setCategory("All");
    setMenuOpen(false);
    setActiveMenu(null);

    window.requestAnimationFrame(() => {
      document.querySelector("#deals")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const submitFeedback = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    setContactStatus("sending");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Feedback submission failed");
      }

      form.reset();
      setContactStatus("success");
    } catch {
      setContactStatus("error");
    }
  };

  const groceryOnlyDeals = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const deals = initialDeals.filter((deal) => {
      const isGrocery = deal.category.trim().toLowerCase() === "grocery";

      const matchesProvider =
        groceryOnlyProvider === "All" ||
        deal.platform.trim().toLowerCase() ===
          groceryOnlyProvider.trim().toLowerCase();

      const searchable =
        `${deal.title} ${deal.platform} ${deal.category}`.toLowerCase();

      return (
        isGrocery && matchesProvider && searchable.includes(normalizedQuery)
      );
    });

    return [...deals].sort((a, b) => {
      if (sort === "Latest") {
        return newestDealFirst(a, b);
      }

      if (sort === "Discount") {
        const aDiscount = a.mrp > 0 ? 1 - a.price / a.mrp : 0;
        const bDiscount = b.mrp > 0 ? 1 - b.price / b.mrp : 0;

        return bDiscount - aDiscount;
      }

      if (sort === "Price: Low") {
        return a.price - b.price;
      }

      return b.votes - a.votes;
    });
  }, [initialDeals, groceryOnlyProvider, query, sort]);

  const groceryOnlyProviders = useMemo(
    () => [
      "All",
      ...Array.from(
        new Set(
          initialDeals
            .filter((deal) => deal.category.trim().toLowerCase() === "grocery")
            .map((deal) => deal.platform.trim())
            .filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    ],
    [initialDeals],
  );

  useEffect(() => {
    try {
      const storedPincode = window.localStorage.getItem(
        "deals-ai-grocery-pincode",
      );

      if (storedPincode && /^[1-9][0-9]{5}$/.test(storedPincode)) {
        setDeliveryPincode(storedPincode);
        setSavedDeliveryPincode(storedPincode);
        setPincodeStatus("valid");
      }
    } catch {
      // Local storage can be unavailable in private browsing.
    }
  }, []);

  const saveDeliveryPincode = () => {
    const normalizedPincode = deliveryPincode.replace(/\D/g, "").slice(0, 6);

    setDeliveryPincode(normalizedPincode);

    if (!/^[1-9][0-9]{5}$/.test(normalizedPincode)) {
      setPincodeStatus("invalid");
      return;
    }

    setSavedDeliveryPincode(normalizedPincode);
    setPincodeStatus("valid");

    try {
      window.localStorage.setItem(
        "deals-ai-grocery-pincode",
        normalizedPincode,
      );
    } catch {
      // Saving the pincode is optional.
    }
  };

  const providerHomepage = (platform: string) => {
    const normalized = platform
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

    const providerHomepages: Record<string, string> = {
      blinkit: "https://blinkit.com/",
      zepto: "https://www.zeptonow.com/",
      swiggyinstamart: "https://www.swiggy.com/instamart",
      instamart: "https://www.swiggy.com/instamart",
      flipkartminutes: "https://www.flipkart.com/",
      flipkart: "https://www.flipkart.com/",
      amazonnow: "https://www.amazon.in/",
      amazonfresh: "https://www.amazon.in/fresh",
      amazon: "https://www.amazon.in/",
      bigbasket: "https://www.bigbasket.com/",
      bbnow: "https://www.bigbasket.com/",
      jiomart: "https://www.jiomart.com/",
      dunzo: "https://www.dunzo.com/",
    };

    return providerHomepages[normalized] || "";
  };

  const specificRetailerUrl = (value: string) => {
    if (!value?.trim()) {
      return "";
    }

    try {
      const parsed = new URL(value);
      const pathname = parsed.pathname.replace(/\/+$/, "");

      if (
        !["http:", "https:"].includes(parsed.protocol) ||
        !parsed.hostname ||
        pathname.length <= 1
      ) {
        return "";
      }

      const genericPaths = new Set([
        "/grocery",
        "/groceries",
        "/search",
        "/shop",
        "/store",
        "/stores",
        "/category",
        "/categories",
        "/collections",
      ]);

      if (genericPaths.has(pathname.toLowerCase())) {
        return "";
      }

      return parsed.toString();
    } catch {
      return "";
    }
  };

  const copyCode = async (code: string) => {
    await navigator.clipboard?.writeText(code);
    setCopied(code);
    window.setTimeout(() => setCopied(""), 1400);
  };

  if (isGroceryPage) {
    return (
      <main className="grocery-only-page">
        <div className="grocery-only-top-strip">
          Grocery deals from available retailer feeds
          <span>
            Always verify price and delivery availability on the retailer site
          </span>
        </div>

        <header className="grocery-only-header">
          <a className="brand" href="/" aria-label="Deals home">
            <span className="brand-mark">%</span>
            <span>
              deals<span className="brand-dot">.</span>
              <small>ai</small>
            </span>
          </a>

          <a className="grocery-home-link" href="/">
            ← All deals
          </a>
        </header>

        <section className="grocery-only-hero">
          <div className="grocery-only-heading">
            <span className="grocery-only-eyebrow">GROCERY DEALS</span>

            <h1>
              All grocery deals.
              <em> One simple place.</em>
            </h1>

            <p>
              Search grocery products and open the exact retailer item page when
              a valid product link is available.
            </p>
          </div>

          <div className="grocery-pincode-card">
            <div>
              <span className="grocery-pincode-icon">⌖</span>

              <div>
                <strong>Delivery pincode</strong>
                <small>Save your six-digit Indian pincode</small>
              </div>
            </div>

            <div className="grocery-pincode-form">
              <input
                type="text"
                inputMode="numeric"
                value={deliveryPincode}
                maxLength={6}
                placeholder="Enter pincode"
                aria-label="Delivery pincode"
                onChange={(event) => {
                  setDeliveryPincode(
                    event.target.value.replace(/\D/g, "").slice(0, 6),
                  );
                  setPincodeStatus("idle");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    saveDeliveryPincode();
                  }
                }}
              />

              <button type="button" onClick={saveDeliveryPincode}>
                Save pincode
              </button>
            </div>

            {pincodeStatus === "valid" && (
              <p className="grocery-pincode-success">
                Pincode {savedDeliveryPincode} saved. Final item availability
                must be confirmed on the retailer site.
              </p>
            )}

            {pincodeStatus === "invalid" && (
              <p className="grocery-pincode-error">
                Enter a valid six-digit Indian pincode.
              </p>
            )}
          </div>
        </section>

        <section className="grocery-only-catalogue" id="grocery-deals">
          <div className="grocery-only-toolbar">
            <div className="grocery-only-search">
              <Icon name="search" />

              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search grocery products or stores"
                aria-label="Search grocery deals"
              />

              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear grocery search"
                >
                  ×
                </button>
              )}
            </div>

            <div className="grocery-only-sort">
              <label htmlFor="grocery-sort">Sort by</label>

              <select
                id="grocery-sort"
                value={sort}
                onChange={(event) => setSort(event.target.value)}
              >
                <option>Latest</option>
                <option>Popular</option>
                <option>Discount</option>
                <option>Price: Low</option>
              </select>
            </div>
          </div>

          <div className="grocery-provider-tabs" aria-label="Grocery retailers">
            {groceryOnlyProviders.map((provider) => (
              <button
                type="button"
                key={provider}
                className={groceryOnlyProvider === provider ? "active" : ""}
                onClick={() => setGroceryOnlyProvider(provider)}
              >
                {provider}
              </button>
            ))}
          </div>

          <div className="grocery-results-heading">
            <div>
              <span>
                {groceryOnlyProvider === "All"
                  ? "All grocery deals"
                  : `${groceryOnlyProvider} grocery deals`}
              </span>

              <h2>
                {groceryOnlyDeals.length} deal
                {groceryOnlyDeals.length === 1 ? "" : "s"}
              </h2>
            </div>

            {savedDeliveryPincode && (
              <small>Pincode: {savedDeliveryPincode}</small>
            )}
          </div>

          {groceryOnlyDeals.length ? (
            <div className="deal-grid grocery-only-grid">
              {groceryOnlyDeals.map((deal) => {
                const discount =
                  deal.mrp > 0
                    ? Math.max(0, Math.round((1 - deal.price / deal.mrp) * 100))
                    : 0;

                const retailerUrl = specificRetailerUrl(deal.url);

                const fallbackRetailerUrl = providerHomepage(deal.platform);

                const destinationUrl = retailerUrl || fallbackRetailerUrl;

                return (
                  <article
                    className="deal-card grocery-only-card"
                    key={deal.id}
                  >
                    <div
                      className="product-visual"
                      style={{ background: deal.color }}
                    >
                      <span className="deal-tag">
                        <Icon name="tag" />
                        {deal.tag}
                      </span>

                      <span className="ai-score">
                        <Icon name="sparkles" />
                        <b>{scoreDeal(deal)}</b>
                        <small>AI signal</small>
                      </span>

                      <button
                        type="button"
                        className={
                          saved.includes(deal.id) ? "heart saved" : "heart"
                        }
                        onClick={() =>
                          setSaved((items) =>
                            items.includes(deal.id)
                              ? items.filter((id) => id !== deal.id)
                              : [...items, deal.id],
                          )
                        }
                        aria-label="Save deal"
                      >
                        <Icon name="heart" filled={saved.includes(deal.id)} />
                      </button>

                      {deal.imageUrl ? (
                        <img
                          className="product-image"
                          src={deal.imageUrl}
                          alt={deal.title}
                          loading="lazy"
                        />
                      ) : (
                        <span className="product-emoji">{deal.emoji}</span>
                      )}
                    </div>

                    <div className="deal-content">
                      <div className="platform-name">
                        {deal.platform}

                        <span>
                          <Icon name="star" filled />
                          {formatRating(deal.rating)}
                        </span>
                      </div>

                      <h3>{deal.title}</h3>

                      <div className="price-row">
                        <strong>₹{inr.format(deal.price)}</strong>

                        {deal.mrp > deal.price && (
                          <>
                            <s>₹{inr.format(deal.mrp)}</s>

                            <b>{discount}% off</b>
                          </>
                        )}
                      </div>

                      {deal.code ? (
                        <button
                          type="button"
                          className="coupon"
                          onClick={() => copyCode(deal.code)}
                        >
                          <span>
                            {copied === deal.code ? "Copied!" : deal.code}
                          </span>

                          <b>
                            {copied === deal.code ? (
                              <Icon name="check" />
                            ) : (
                              "Copy"
                            )}
                          </b>
                        </button>
                      ) : (
                        <div className="auto-deal">
                          <Icon name="check" />
                          Deal shown by retailer
                        </div>
                      )}

                      <div className="deal-footer">
                        <span className="expiry-pill">
                          <Icon name="clock" />
                          {deal.expires}
                        </span>

                        {destinationUrl ? (
                          <div className="grocery-deal-action">
                            <a
                              className="get-deal-button"
                              href={destinationUrl}
                              target="_blank"
                              rel="noopener noreferrer sponsored"
                            >
                              <span>
                                {retailerUrl
                                  ? "View exact item"
                                  : `Visit ${deal.platform}`}
                              </span>
                              <Icon name="arrow" />
                            </a>

                            {!retailerUrl && (
                              <small className="brand-fallback-note">
                                Exact item link is unavailable. Search for this
                                product on the retailer website to find the
                                offer.
                              </small>
                            )}
                          </div>
                        ) : (
                          <span className="item-link-unavailable">
                            Retailer link unavailable
                          </span>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty grocery-only-empty">
              <span>⌕</span>
              <h3>No matching grocery deals</h3>
              <p>Try another search or retailer.</p>
            </div>
          )}
        </section>
      </main>
    );
  }

  return (
    <main>
      <div className="top-strip">
        <span className="pulse-dot" /> AI-assisted deal discovery for India{" "}
        <i>Prices may change at the retailer</i>
      </div>
      <header className="site-header">
        <a className="brand" href="/" aria-label="Deals home">
          <span className="brand-mark">%</span>
          <span>
            deals<span className="brand-dot">.</span>
            <small>ai</small>
          </span>
        </a>
        <div className="search-box">
          <Icon name="search" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask for a product, brand or store"
            aria-label="Search deals"
          />
          <kbd>⌘ K</kbd>
        </div>
        <nav
          className={`main-navigation ${menuOpen ? "open" : ""}`}
          aria-label="Main navigation"
        >
          <a href="#deals" onClick={() => setMenuOpen(false)}>
            Deals
          </a>

          <div className="nav-dropdown grocery-navigation">
            <button
              type="button"
              className={activeMenu === "grocery" ? "active" : ""}
              onClick={() =>
                setActiveMenu((current) =>
                  current === "grocery" ? null : "grocery",
                )
              }
            >
              <span className="grocery-nav-label">
                <span aria-hidden="true">🛒</span>
                Grocery Deals
              </span>
              <span aria-hidden="true">⌄</span>
            </button>

            <div
              className={`nav-submenu grocery-submenu ${
                activeMenu === "grocery" ? "open" : ""
              }`}
            >
              <div className="submenu-heading">
                <span>Quick-commerce deals</span>
                <small>
                  Compare fresh grocery offers across supported providers
                </small>
              </div>

              <div className="grocery-menu-grid">
                <a href="/grocery" onClick={() => setMenuOpen(false)}>
                  <span className="grocery-menu-brand grocery-menu-all">
                    AI
                  </span>
                  <span>
                    <b>All Grocery Deals</b>
                    <small>Open the Grocery experience</small>
                  </span>
                </a>

                <a href="/grocery" onClick={() => setMenuOpen(false)}>
                  <span className="grocery-menu-brand grocery-menu-blinkit">
                    B
                  </span>
                  <span>
                    <b>Blinkit</b>
                    <small>Instant grocery offers</small>
                  </span>
                </a>

                <a href="/grocery" onClick={() => setMenuOpen(false)}>
                  <span className="grocery-menu-brand grocery-menu-zepto">
                    Z
                  </span>
                  <span>
                    <b>Zepto</b>
                    <small>Fast delivery savings</small>
                  </span>
                </a>

                <a href="/grocery" onClick={() => setMenuOpen(false)}>
                  <span className="grocery-menu-brand grocery-menu-flipkart">
                    F
                  </span>
                  <span>
                    <b>Flipkart Minutes</b>
                    <small>Everyday essentials</small>
                  </span>
                </a>

                <a href="/grocery" onClick={() => setMenuOpen(false)}>
                  <span className="grocery-menu-brand grocery-menu-amazon">
                    A
                  </span>
                  <span>
                    <b>Amazon Now</b>
                    <small>Quick-commerce discoveries</small>
                  </span>
                </a>
              </div>
            </div>
          </div>

          <div className="nav-dropdown">
            <button
              type="button"
              className={activeMenu === "categories" ? "active" : ""}
              onClick={() =>
                setActiveMenu((current) =>
                  current === "categories" ? null : "categories",
                )
              }
            >
              Categories
              <span aria-hidden="true">⌄</span>
            </button>

            <div
              className={`nav-submenu category-submenu ${
                activeMenu === "categories" ? "open" : ""
              }`}
            >
              <div className="submenu-heading">
                <span>Shop by category</span>
                <small>Explore deals that match your interest</small>
              </div>

              <div className="submenu-grid">
                {dynamicCategories.map((item) => (
                  <button
                    type="button"
                    key={item}
                    onClick={() => chooseCategory(item)}
                  >
                    <span className="submenu-icon">
                      {item === "All" ? "✦" : item.substring(0, 1)}
                    </span>
                    <span>{item}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="nav-dropdown">
            <button
              type="button"
              className={activeMenu === "stores" ? "active" : ""}
              onClick={() =>
                setActiveMenu((current) =>
                  current === "stores" ? null : "stores",
                )
              }
            >
              Stores
              <span aria-hidden="true">⌄</span>
            </button>

            <div
              className={`nav-submenu store-submenu ${
                activeMenu === "stores" ? "open" : ""
              }`}
            >
              <div className="submenu-heading">
                <span>Popular stores</span>
                <small>Browse deals by retailer</small>
              </div>

              <div className="submenu-grid">
                {stores.map((store) => (
                  <button
                    type="button"
                    key={store}
                    onClick={() => chooseStore(store)}
                  >
                    <span className="submenu-icon">
                      {store.substring(0, 1).toUpperCase()}
                    </span>
                    <span>{store}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <a href="#ai-lab" onClick={() => setMenuOpen(false)}>
            AI Signals
          </a>

          <a href="#about" onClick={() => setMenuOpen(false)}>
            How it works
          </a>

          <a href="#contact" onClick={() => setMenuOpen(false)}>
            Feedback
          </a>
        </nav>

        <div className="header-actions">
          <button
            className="saved-button"
            aria-label={`${saved.length} saved deals`}
          >
            <Icon name="heart" />
            <span>Saved</span>
            <b>{saved.length}</b>
          </button>

          <a
            className="header-lightning"
            href="#deals"
            title="Fresh offers unlock every 6 hours"
            aria-label={`Next lightning deals in ${lightningTime.hours} hours, ${lightningTime.minutes} minutes and ${lightningTime.seconds} seconds`}
          >
            <span className="header-lightning-icon" aria-hidden="true">
              ⚡
            </span>

            <span className="header-lightning-copy">
              <small>Next drop</small>
              <b>
                {lightningTime.hours}:{lightningTime.minutes}:
                {lightningTime.seconds}
              </b>
            </span>
          </a>

          <button
            type="button"
            className={`mobile-menu-button ${menuOpen ? "active" : ""}`}
            onClick={() => {
              setMenuOpen((current) => !current);
              setActiveMenu(null);
            }}
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <span className="eyebrow">
            <Icon name="sparkles" /> MEET YOUR AI DEAL RADAR
          </span>
          <h1>
            Smarter finds.
            <br />
            <em>Brighter savings.</em>
          </h1>
          <p>
            Explore colorful, curated offers with an AI-inspired value signal
            that makes the strongest deals easier to spot.
          </p>
          <div className="hero-actions">
            <a className="primary" href="#deals">
              Explore smart picks <Icon name="arrow" />
            </a>
            <a className="text-link" href="#ai-lab">
              See how signals work
            </a>
          </div>
          <div className="trust-row">
            <span>
              <b>Clear</b> comparisons
            </span>
            <i />
            <span>
              <b>Fast</b> discovery
            </span>
            <i />
            <span>
              <b>Free</b> to explore
            </span>
          </div>
        </div>
        <div
          className="ai-orbit"
          aria-label="AI deal intelligence illustration"
        >
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="ai-core">
            <small>AI DEAL</small>
            <strong>RADAR</strong>
            <span>✦</span>
          </div>
          <div className="signal-card signal-price">
            <span>PRICE SIGNAL</span>
            <b>Strong value</b>
            <small>Based on price gap</small>
          </div>
          <div className="signal-card signal-rating">
            <span>SHOPPER SIGNAL</span>
            <b>★ 4.6</b>
            <small>Rating confidence</small>
          </div>
          <div className="signal-card signal-save">
            <span>SMART PICK</span>
            <b>Save more</b>
            <small>Compare before buying</small>
          </div>
        </div>
      </section>

      <section className="platforms" id="stores">
        <span>Explore stores you know</span>
        <div>
          <b className="store amazon">
            <img src="/store-logos/amazon.svg" alt="Amazon" />
          </b>
          <b className="store flipkart">
            <img src="/store-logos/flipkart.png" alt="Flipkart" />
          </b>
          <b className="store myntra">
            <img src="/store-logos/myntra.svg" alt="Myntra" />
          </b>
          <b className="store nykaa">
            <img src="/store-logos/nykaa.svg" alt="Nykaa" />
          </b>
          <b className="store croma">
            <img src="/store-logos/croma.png" alt="Croma" />
          </b>
          <b className="store tata">
            <img src="/store-logos/tata-cliq.jpg" alt="Tata CLiQ" />
          </b>
        </div>
      </section>

      {!isGroceryPage && (
        <section className="ai-grocery-reach" aria-label="AI Grocery Reach">
          <a href="/grocery" className="ai-grocery-reach-link">
            <div className="ai-grocery-copy">
              <span className="ai-grocery-eyebrow">
                <Icon name="sparkles" />
                AI QUICK-COMMERCE REACH
              </span>

              <h2>
                Grocery deals.
                <br />
                <em>Compared smarter.</em>
              </h2>

              <p>
                Discover cached offers from India&apos;s leading quick-commerce
                providers in one dedicated Grocery experience.
              </p>

              <span className="ai-grocery-action">
                Explore Grocery Deals
                <Icon name="arrow" />
              </span>
            </div>

            <div className="ai-grocery-brands" aria-label="Grocery providers">
              <span className="ai-grocery-brand brand-blinkit">
                <b>B</b>
                <span>Blinkit</span>
              </span>

              <span className="ai-grocery-brand brand-zepto">
                <b>Z</b>
                <span>Zepto</span>
              </span>

              <span className="ai-grocery-brand brand-flipkart-minutes">
                <b>F</b>
                <span>Flipkart Minutes</span>
              </span>

              <span className="ai-grocery-brand brand-amazon-now">
                <b>A</b>
                <span>Amazon Now</span>
              </span>
            </div>

            <span className="ai-grocery-orb ai-grocery-orb-one" />
            <span className="ai-grocery-orb ai-grocery-orb-two" />
          </a>
        </section>
      )}

      <section className="deals-section" id="deals">
        <div className="deals-search-panel">
          <div className="deals-search-copy">
            <span>
              <Icon name="search" />
            </span>

            <div>
              <strong>Find your perfect deal</strong>
              <small>Search by product, brand or store</small>
            </div>
          </div>

          <div className="deals-search-field">
            <Icon name="search" />

            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search mobiles, laptops, Amazon, Flipkart..."
              aria-label="Search products and stores"
            />

            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear deal search"
              >
                ×
              </button>
            )}
          </div>
        </div>
        <div
          className="collection-heroes"
          aria-label="Special deal collections"
        >
          {(Object.keys(collectionDetails) as DealCollection[]).map((item) => {
            const details = collectionDetails[item];

            return (
              <button
                type="button"
                key={item}
                className={`collection-hero collection-${item} ${
                  collection === item ? "active" : ""
                }`}
                onClick={() => {
                  setCollection(item);
                  setCategory("All");

                  window.requestAnimationFrame(() => {
                    document
                      .querySelector(".deal-results-anchor")
                      ?.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      });
                  });
                }}
              >
                <span className="collection-eyebrow">{details.eyebrow}</span>

                <strong>{details.title}</strong>

                <p>{details.description}</p>

                <span className="collection-action">
                  {details.action}
                  <Icon name="arrow" />
                </span>

                <b className="collection-count">{collectionCounts[item]}</b>
              </button>
            );
          })}
        </div>

        <div className="deal-results-anchor" />

        <div className="section-head">
          <div>
            <span className="eyebrow dark">
              <Icon name="sparkles" />
              {collectionDetails[collection].eyebrow}
            </span>

            <h2>{collectionDetails[collection].title}</h2>

            <p>
              Compare prices, savings, ratings and shopper interest before
              visiting the retailer.
            </p>
          </div>

          <div className="sort">
            <label htmlFor="sort">Sort by</label>

            <select
              id="sort"
              value={sort}
              onChange={(event) => setSort(event.target.value)}
            >
              <option>Latest</option>
              <option>Popular</option>
              <option>Discount</option>
              <option>Price: Low</option>
            </select>
          </div>
        </div>

        {!isGroceryPage && (
          <div
            className="category-tabs"
            role="tablist"
            aria-label="Deal categories"
          >
            {dynamicCategories.map((item) => (
              <button
                type="button"
                key={item}
                className={category === item ? "active" : ""}
                onClick={() => setCategory(item)}
                role="tab"
                aria-selected={category === item}
              >
                <span>{item}</span>
              </button>
            ))}
          </div>
        )}

        {isGroceryPage && (
          <section
            className="grocery-provider-panel"
            aria-labelledby="grocery-provider-title"
          >
            <div className="grocery-provider-heading">
              <div>
                <span>QUICK-COMMERCE PROVIDERS</span>
                <h3 id="grocery-provider-title">
                  Browse grocery deals by provider
                </h3>
              </div>

              <p>
                {groceryProviderCounts.All} cached grocery{" "}
                {groceryProviderCounts.All === 1 ? "deal" : "deals"}
              </p>
            </div>

            <div
              className="grocery-provider-filters"
              role="tablist"
              aria-label="Grocery providers"
            >
              {groceryProviders.map((provider) => {
                const count = groceryProviderCounts[provider];

                return (
                  <button
                    type="button"
                    key={provider}
                    className={groceryProvider === provider ? "active" : ""}
                    onClick={() => setGroceryProvider(provider)}
                    role="tab"
                    aria-selected={groceryProvider === provider}
                    disabled={provider !== "All" && count === 0}
                  >
                    <span>{provider}</span>
                    <b>{count}</b>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {filtered.length ? (
          <div className="deal-grid">
            {filtered.map((deal) => {
              const groceryProviderName = getGroceryProvider(deal);

              const groceryAvailability = getGroceryAvailability(deal);

              const groceryFreshness = getFreshnessLabel(deal.lastCheckedAt);

              const discount = Math.round((1 - deal.price / deal.mrp) * 100);
              return (
                <article
                  className="deal-card"
                  key={deal.id}
                  role="link"
                  tabIndex={0}
                  onClick={(event) => {
                    const target = event.target as HTMLElement;

                    if (
                      target.closest(
                        "button, a, input, select, textarea, [role='button']",
                      )
                    ) {
                      return;
                    }

                    window.location.href = `/deal/${slugify(deal.title)}`;
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      window.location.href = `/deal/${slugify(deal.title)}`;
                    }
                  }}
                >
                  <div
                    className="product-visual"
                    style={{ background: deal.color }}
                  >
                    <span className="deal-tag">
                      <Icon name="tag" />
                      {deal.tag}
                    </span>
                    <span className="ai-score">
                      <Icon name="sparkles" />
                      <b>{scoreDeal(deal)}</b>
                      <small>AI signal</small>
                    </span>
                    <button
                      className={
                        saved.includes(deal.id) ? "heart saved" : "heart"
                      }
                      onClick={() =>
                        setSaved((items) =>
                          items.includes(deal.id)
                            ? items.filter((id) => id !== deal.id)
                            : [...items, deal.id],
                        )
                      }
                      aria-label="Save deal"
                    >
                      <Icon name="heart" filled={saved.includes(deal.id)} />
                    </button>
                    {deal.imageUrl ? (
                      <img
                        className="product-image"
                        src={deal.imageUrl}
                        alt={deal.title}
                        loading="lazy"
                      />
                    ) : (
                      <span className="product-emoji">{deal.emoji}</span>
                    )}
                  </div>
                  <div className="deal-content">
                    {isGroceryPage && (
                      <div className="grocery-card-intelligence">
                        <div className="grocery-card-badges">
                          <span
                            className={`grocery-provider-badge provider-${getProviderClassName(
                              groceryProviderName,
                            )}`}
                          >
                            {groceryProviderName ||
                              deal.providerPlatform ||
                              deal.platform}
                          </span>

                          <span
                            className={`grocery-availability-badge availability-${groceryAvailability}`}
                          >
                            <i aria-hidden="true" />

                            {groceryAvailabilityLabels[groceryAvailability]}
                          </span>
                        </div>

                        <div className="grocery-cache-metadata">
                          <span
                            className={`grocery-freshness freshness-${groceryFreshness.level}`}
                            title={`Last checked: ${formatCachedTimestamp(
                              deal.lastCheckedAt,
                            )}`}
                          >
                            <span className="grocery-clock" aria-hidden="true">
                              ◷
                            </span>

                            {groceryFreshness.label}
                          </span>

                          <span
                            className="grocery-imported"
                            title={`Imported: ${formatCachedTimestamp(
                              deal.importedAt,
                            )}`}
                          >
                            Cached provider data
                          </span>
                        </div>
                      </div>
                    )}
                    <div className="platform-name">
                      {deal.platform}
                      <span>
                        <Icon name="star" filled /> {formatRating(deal.rating)}
                      </span>
                    </div>
                    <h3>{deal.title}</h3>
                    <div className="price-row">
                      <strong>₹{inr.format(deal.price)}</strong>
                      <s>₹{inr.format(deal.mrp)}</s>
                      <b>{discount}% off</b>
                    </div>
                    {deal.code ? (
                      <button
                        className="coupon"
                        onClick={() => copyCode(deal.code)}
                      >
                        <span>
                          {copied === deal.code ? "Copied!" : deal.code}
                        </span>
                        <b>
                          {copied === deal.code ? (
                            <Icon name="check" />
                          ) : (
                            "Copy"
                          )}
                        </b>
                      </button>
                    ) : (
                      <div className="auto-deal">
                        <Icon name="check" /> Deal applied automatically
                      </div>
                    )}
                    <div className="deal-footer">
                      <span className="expiry-pill">
                        <Icon name="clock" />
                        {deal.expires}
                      </span>
                      <a
                        className="get-deal-button"
                        href={`/deal/${slugify(deal.title)}`}
                      >
                        <span>Get deal</span>
                        <Icon name="arrow" />
                      </a>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty">
            <span>⌕</span>

            <h3>
              {isGroceryPage && groceryProvider !== "All"
                ? `No ${groceryProvider} grocery deals yet`
                : isGroceryPage
                  ? "No matching grocery deals yet"
                  : "No matching deals yet"}
            </h3>

            <p>
              {isGroceryPage && groceryProvider !== "All"
                ? "Choose another provider or clear your search."
                : isGroceryPage
                  ? "Try another search, price collection or provider."
                  : "Try another search or category."}
            </p>

            {isGroceryPage && groceryProvider !== "All" && (
              <button
                type="button"
                className="grocery-empty-reset"
                onClick={() => setGroceryProvider("All")}
              >
                Show all grocery deals
              </button>
            )}
          </div>
        )}
      </section>

      <section className="ai-lab" id="ai-lab">
        <div className="ai-lab-copy">
          <span className="eyebrow">THE SMART LAYER</span>
          <h2>
            A little intelligence.
            <br />A lot less scrolling.
          </h2>
          <p>
            Every listing gets a transparent value signal generated from the
            information shown on the card—discount depth, customer rating and
            shopper interest.
          </p>
          <div className="signal-legend">
            <span>
              <i className="violet" />
              Price gap
            </span>
            <span>
              <i className="cyan" />
              Rating
            </span>
            <span>
              <i className="lime" />
              Popularity
            </span>
          </div>
        </div>
        <div className="formula-card">
          <div className="formula-top">
            <span>DEAL INTELLIGENCE</span>
            <b>Transparent by design</b>
          </div>
          <div className="formula-score">
            <small>VALUE SIGNAL</small>
            <strong>92</strong>
            <span>/ 98</span>
          </div>
          <div className="formula-bars">
            <i style={{ width: "88%" }} />
            <i style={{ width: "74%" }} />
            <i style={{ width: "82%" }} />
          </div>
          <p>
            This is a discovery aid—not a guarantee or price-history claim.
            Always confirm the final price on the retailer site.
          </p>
        </div>
      </section>

      <section className="how" id="about">
        <div>
          <span className="eyebrow">DEALS, MINUS THE DRAMA</span>
          <h2>
            From signal
            <br />
            <em>to smart choice.</em>
          </h2>
        </div>
        <div className="steps">
          <article>
            <b>01</b>
            <span>
              <Icon name="scan" />
            </span>
            <h3>Bring together</h3>
            <p>
              Selected offers from popular Indian stores appear in one colorful
              catalogue.
            </p>
          </article>
          <article>
            <b>02</b>
            <span>
              <Icon name="chart" />
            </span>
            <h3>Score the value</h3>
            <p>
              A simple signal combines the displayed savings, rating and shopper
              interest.
            </p>
          </article>
          <article>
            <b>03</b>
            <span>
              <Icon name="shield" />
            </span>
            <h3>Choose confidently</h3>
            <p>
              Compare the details, then complete your purchase securely on the
              retailer’s site.
            </p>
          </article>
        </div>
      </section>
      <section className="newsletter">
        <div>
          <span>✦</span>
          <div>
            <h2>Let smart deals find you.</h2>
            <p>A short, useful weekly roundup. No spam.</p>
          </div>
        </div>
        <form onSubmit={(e) => e.preventDefault()}>
          <input
            type="email"
            placeholder="you@email.com"
            aria-label="Email address"
            required
          />
          <button>Join the radar →</button>
        </form>
      </section>
      <section className="feedback-section" id="contact">
        <div className="feedback-intro">
          <span className="eyebrow dark">FEEDBACK & CONTACT</span>

          <h2>Help us make deal discovery better.</h2>

          <p>
            Found an incorrect price, expired offer or missing category? Send
            your feedback and our team will review it.
          </p>

          <div className="feedback-contact-cards">
            <article>
              <span>✉</span>
              <div>
                <small>Email</small>
                <a href="mailto:tech@ads-ai.in">tech@ads-ai.in</a>
              </div>
            </article>

            <article>
              <span>◉</span>
              <div>
                <small>WhatsApp</small>
                <a
                  href="https://wa.me/916383777055"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  +91 6383 777 055
                </a>
              </div>
            </article>
          </div>
        </div>

        <div className="feedback-form-card">
          <form onSubmit={submitFeedback} noValidate>
            {contactStatus === "success" && (
              <div className="form-status success" role="status">
                Thank you. Your feedback was sent successfully.
              </div>
            )}

            {contactStatus === "error" && (
              <div className="form-status error" role="alert">
                We could not send your feedback. Please try again.
              </div>
            )}

            <div className="feedback-form-grid">
              <label>
                <span>Full name</span>
                <input
                  name="name"
                  type="text"
                  placeholder="Your full name"
                  autoComplete="name"
                  maxLength={100}
                  required
                />
              </label>

              <label>
                <span>Email address</span>
                <input
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  maxLength={150}
                  required
                />
              </label>
            </div>

            <div className="feedback-form-grid">
              <label>
                <span>Feedback type</span>
                <select name="service" defaultValue="" required>
                  <option value="" disabled>
                    Select feedback type
                  </option>
                  <option value="Incorrect deal">Incorrect deal</option>
                  <option value="Expired offer">Expired offer</option>
                  <option value="Missing category">Missing category</option>
                  <option value="Store request">Store request</option>
                  <option value="General feedback">General feedback</option>
                </select>
              </label>

              <label>
                <span>Deal URL</span>
                <input
                  name="company"
                  type="url"
                  placeholder="Optional deal link"
                  maxLength={500}
                />
              </label>
            </div>

            <label>
              <span>Your feedback</span>
              <textarea
                name="message"
                rows={6}
                placeholder="Tell us what we should correct or improve..."
                maxLength={3000}
                required
              />
            </label>

            <div className="feedback-honeypot" aria-hidden="true">
              <label>
                Website
                <input
                  name="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                />
              </label>
            </div>

            <button
              type="submit"
              className="feedback-submit"
              disabled={contactStatus === "sending"}
            >
              {contactStatus === "sending"
                ? "Sending feedback..."
                : "Send feedback"}
              <span aria-hidden="true">→</span>
            </button>
          </form>
        </div>
      </section>

      <footer>
        <a className="brand" href="#top">
          <span className="brand-mark">%</span>
          <span>
            deals<span className="brand-dot">.</span>
          </span>
        </a>
        <p>
          AI-assisted savings for everyday India.
          <br />
          <span className="affiliate-disclosure">
            As an Amazon Associate I earn from qualifying purchases.
          </span>
        </p>
        <div>
          <a href="#about">About</a>
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="#contact">Contact</a>
        </div>
        <small>© 2026 deals.ads-ai.in</small>
        <div className="footer-signature">
          <span>
            Handcrafted by
            <a
              href="https://ads-ai.in"
              target="_blank"
              rel="noopener noreferrer"
            >
              ADS AI
            </a>
          </span>

          <i />

          <span>
            We
            <b aria-label="love">♥</b>
            India 🇮🇳
          </span>
        </div>
      </footer>
    </main>
  );
}
