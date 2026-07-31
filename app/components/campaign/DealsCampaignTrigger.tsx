"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type LightningCampaign = {
  id: string;
  type: "iframe" | "image" | "html";
  title: string;
  subtitle: string;
  iframeUrl?: string;
  redirectUrl?: string;
  redirectLabel?: string;
  delaySeconds?: number;
};

export default function DealsCampaignTrigger() {
  const pathname = usePathname();
  const loadedForPageView = useRef(false);
  const [campaign, setCampaign] = useState<LightningCampaign | null>(null);
  const [visible, setVisible] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(10);

  const close = useCallback(() => setVisible(false), []);

  useEffect(() => {
    if (pathname.startsWith("/admin") || loadedForPageView.current) {
      return;
    }
    loadedForPageView.current = true;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function load() {
      try {
        const response = await fetch(
          "/api/campaigns/active?placement=lightning",
          { cache: "no-store" },
        );
        if (!response.ok) return;

        const data = (await response.json()) as LightningCampaign | null;
        if (
          cancelled ||
          !data ||
          data.type !== "iframe" ||
          !data.iframeUrl
        ) {
          return;
        }

        setCampaign(data);
        timer = setTimeout(
          () => {
            if (!cancelled) setVisible(true);
          },
          Math.max(0, data.delaySeconds ?? 5) * 1000,
        );
      } catch {
        // Campaigns are optional and must never interrupt the storefront.
      }
    }

    void load();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [pathname]);

  useEffect(() => {
    if (!visible) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setRemainingSeconds(10);
    const autoCloseTimer = window.setTimeout(close, 10_000);
    const countdownTimer = window.setInterval(() => {
      setRemainingSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1_000);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.clearTimeout(autoCloseTimer);
      window.clearInterval(countdownTimer);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [close, visible]);

  if (!visible || !campaign?.iframeUrl) return null;

  const isDirectImage =
    /\.(avif|gif|jpe?g|png|webp)(?:[?#].*)?$/i.test(campaign.iframeUrl) ||
    campaign.iframeUrl.includes("m.media-amazon.com/images/");

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-sm sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="lightning-deal-title"
    >
      <div className="flex h-[88dvh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-yellow-300/40 bg-white shadow-2xl">
        <header className="flex shrink-0 items-center justify-between gap-4 bg-slate-950 px-4 py-3 text-white sm:px-6">
          <div className="min-w-0">
            <div className="mb-1 text-xs font-black uppercase tracking-[0.18em] text-yellow-300">
              ⚡ Lightning deal
            </div>
            <h2
              id="lightning-deal-title"
              className="truncate text-base font-bold sm:text-xl"
            >
              {campaign.title || "Limited-time deal"}
            </h2>
            {campaign.subtitle && (
              <p className="mt-0.5 line-clamp-1 text-xs text-slate-300 sm:text-sm">
                {campaign.subtitle}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <span
              className="rounded-full bg-yellow-300/15 px-2.5 py-1.5 text-[11px] font-bold tabular-nums text-yellow-300 sm:px-3 sm:text-xs"
              aria-live="polite"
            >
              Closes in {remainingSeconds}s
            </span>
            <button
              type="button"
              onClick={close}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/20 bg-white/10 text-2xl leading-none text-white transition hover:bg-yellow-300 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-yellow-300"
              aria-label="Close lightning deal"
            >
              ×
            </button>
          </div>
        </header>
        <div className="relative min-h-0 flex-1 overflow-hidden bg-white">
          {isDirectImage ? (
            // A plain image URL inside an iframe renders at its natural size and
            // creates scrollbars. Object-contain keeps the entire product visible.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={campaign.iframeUrl}
              alt={campaign.title || "Lightning deal product"}
              className="h-full w-full object-contain p-3 sm:p-6"
              referrerPolicy="no-referrer"
            />
          ) : (
            <iframe
              src={campaign.iframeUrl}
              title={campaign.title || "Lightning deal"}
              className="h-full w-full bg-white"
              loading="eager"
              referrerPolicy="strict-origin-when-cross-origin"
              sandbox="allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
              allowFullScreen
            />
          )}
        </div>
        {campaign.redirectUrl && (
          <footer className="flex shrink-0 justify-end border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
            <a
              href={campaign.redirectUrl}
              target="_blank"
              rel="noopener noreferrer nofollow sponsored"
              onClick={close}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-yellow-300 px-6 py-2.5 text-sm font-black text-slate-950 shadow-sm transition hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
            >
              {campaign.redirectLabel || "View Deal"} →
            </a>
          </footer>
        )}
      </div>
    </div>
  );
}
