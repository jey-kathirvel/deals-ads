"use client";

import { useMemo, useState } from "react";
import type { Deal } from "@/lib/deal-types";
import { slugify } from "@/lib/slug";
const categories = ["All", "Mobiles", "Electronics", "Fashion", "Home", "Beauty", "Travel"];
const inr = new Intl.NumberFormat("en-IN");
const scoreDeal = (deal: Deal) => Math.min(98, Math.round(38 + Math.max(0, (1 - deal.price / deal.mrp) * 100) * .55 + deal.rating * 4 + Math.min(deal.votes, 250) * .04));
type IconName = "search" | "heart" | "sparkles" | "arrow" | "scan" | "chart" | "shield" | "tag" | "star" | "check" | "trending" | "clock";
const paths: Record<IconName, React.ReactNode> = {
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
  heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />,
  sparkles: <><path d="m12 3-1.4 3.6L7 8l3.6 1.4L12 13l1.4-3.6L17 8l-3.6-1.4L12 3Z" /><path d="m5 15-.8 2.2L2 18l2.2.8L5 21l.8-2.2L8 18l-2.2-.8L5 15Z" /><path d="m19 13-.7 1.7-1.8.8 1.8.7L19 18l.7-1.8 1.8-.7-1.8-.8L19 13Z" /></>,
  arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
  scan: <><path d="M4 7V4h3M17 4h3v3M20 17v3h-3M7 20H4v-3" /><circle cx="12" cy="12" r="3" /></>,
  chart: <><path d="M4 19V9M10 19V5M16 19v-7M22 19H2" /></>,
  shield: <><path d="M12 3 4.5 6v5.5c0 4.8 3.2 8 7.5 9.5 4.3-1.5 7.5-4.7 7.5-9.5V6L12 3Z" /><path d="m9 12 2 2 4-4" /></>,
  tag: <><path d="M20 13 13 20l-9-9V4h7l9 9Z" /><circle cx="8.5" cy="8.5" r="1" /></>,
  star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z" />,
  check: <path d="m5 12 4 4L19 6" />,
  trending: <><path d="m3 17 6-6 4 4 7-8" /><path d="M15 7h5v5" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
};
function Icon({ name, filled = false }: { name: IconName; filled?: boolean }) {
  return <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export default function DealsApp({ initialDeals = [] }: { initialDeals?: Deal[] }) {
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("Popular");
  const [saved, setSaved] = useState<number[]>([]);
  const [copied, setCopied] = useState("");
  const filtered = useMemo(() => {
    const result = initialDeals.filter((deal) => (category === "All" || deal.category === category) && `${deal.title} ${deal.platform}`.toLowerCase().includes(query.toLowerCase()));
    return [...result].sort((a, b) => sort === "Discount" ? (1 - b.price / b.mrp) - (1 - a.price / a.mrp) : sort === "Price: Low" ? a.price - b.price : b.votes - a.votes);
  }, [category, query, sort, initialDeals]);
  const copyCode = async (code: string) => {
    await navigator.clipboard?.writeText(code);
    setCopied(code);
    window.setTimeout(() => setCopied(""), 1400);
  };

  return <main>
    <div className="top-strip"><span className="pulse-dot" /> AI-assisted deal discovery for India <i>Prices may change at the retailer</i></div>
    <header className="site-header">
      <a className="brand" href="#top" aria-label="Deals home"><span className="brand-mark">%</span><span>deals<span className="brand-dot">.</span><small>ai</small></span></a>
      <div className="search-box"><Icon name="search" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ask for a product, brand or store" aria-label="Search deals" /><kbd>⌘ K</kbd></div>
      <nav><a href="#deals">Deals</a><a href="#ai-lab">AI Signals</a><a href="#stores">Stores</a><a href="#about">How it works</a></nav>
      <button className="saved-button" aria-label={`${saved.length} saved deals`}><Icon name="heart" /> <span>Saved</span> <b>{saved.length}</b></button>
    </header>

    <section className="hero" id="top">
      <div className="hero-copy"><span className="eyebrow"><Icon name="sparkles" /> MEET YOUR AI DEAL RADAR</span><h1>Smarter finds.<br /><em>Brighter savings.</em></h1><p>Explore colorful, curated offers with an AI-inspired value signal that makes the strongest deals easier to spot.</p><div className="hero-actions"><a className="primary" href="#deals">Explore smart picks <Icon name="arrow" /></a><a className="text-link" href="#ai-lab">See how signals work</a></div><div className="trust-row"><span><b>Clear</b> comparisons</span><i /><span><b>Fast</b> discovery</span><i /><span><b>Free</b> to explore</span></div></div>
      <div className="ai-orbit" aria-label="AI deal intelligence illustration"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="ai-core"><small>AI DEAL</small><strong>RADAR</strong><span>✦</span></div><div className="signal-card signal-price"><span>PRICE SIGNAL</span><b>Strong value</b><small>Based on price gap</small></div><div className="signal-card signal-rating"><span>SHOPPER SIGNAL</span><b>★ 4.6</b><small>Rating confidence</small></div><div className="signal-card signal-save"><span>SMART PICK</span><b>Save more</b><small>Compare before buying</small></div></div>
    </section>

    <section className="platforms" id="stores"><span>Explore stores you know</span><div>
      <b className="store amazon"><img src="/store-logos/amazon.svg" alt="Amazon" /></b>
      <b className="store flipkart"><img src="/store-logos/flipkart.png" alt="Flipkart" /></b>
      <b className="store myntra"><img src="/store-logos/myntra.svg" alt="Myntra" /></b>
      <b className="store nykaa"><img src="/store-logos/nykaa.svg" alt="Nykaa" /></b>
      <b className="store croma"><img src="/store-logos/croma.png" alt="Croma" /></b>
      <b className="store tata"><img src="/store-logos/tata-cliq.jpg" alt="Tata CLiQ" /></b>
    </div></section>

    <section className="deals-section" id="deals">
      <div className="section-head"><div><span className="eyebrow dark"><Icon name="sparkles" /> AI-ASSISTED PICKS</span><h2>Deals worth a closer look</h2><p>Compare savings, ratings and shopper interest at a glance.</p></div><div className="sort"><label htmlFor="sort">Sort by</label><select id="sort" value={sort} onChange={(e) => setSort(e.target.value)}><option>Popular</option><option>Discount</option><option>Price: Low</option></select></div></div>
      <div className="category-tabs" role="tablist">{categories.map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)} role="tab" aria-selected={category === item}>{item}</button>)}</div>
      {filtered.length ? <div className="deal-grid">{filtered.map((deal) => {
        const discount = Math.round((1 - deal.price / deal.mrp) * 100);
        return <article className="deal-card" key={deal.id}
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
          <div className="product-visual" style={{ background: deal.color }}><span className="deal-tag"><Icon name="tag" />{deal.tag}</span><span className="ai-score"><Icon name="sparkles" /><b>{scoreDeal(deal)}</b><small>AI signal</small></span><button className={saved.includes(deal.id) ? "heart saved" : "heart"} onClick={() => setSaved((items) => items.includes(deal.id) ? items.filter((id) => id !== deal.id) : [...items, deal.id])} aria-label="Save deal"><Icon name="heart" filled={saved.includes(deal.id)} /></button>{deal.imageUrl ? <img className="product-image" src={deal.imageUrl} alt={deal.title} loading="lazy" /> : <span className="product-emoji">{deal.emoji}</span>}</div>
          <div className="deal-content"><div className="platform-name">{deal.platform}<span><Icon name="star" filled /> {deal.rating}</span></div><h3>{deal.title}</h3><div className="price-row"><strong>₹{inr.format(deal.price)}</strong><s>₹{inr.format(deal.mrp)}</s><b>{discount}% off</b></div>{deal.code ? <button className="coupon" onClick={() => copyCode(deal.code)}><span>{copied === deal.code ? "Copied!" : deal.code}</span><b>{copied === deal.code ? <Icon name="check" /> : "Copy"}</b></button> : <div className="auto-deal"><Icon name="check" /> Deal applied automatically</div>}<div className="deal-footer"><span className="expiry-pill"><Icon name="clock" />{deal.expires}</span><a className="get-deal-button" href={`/deal/${slugify(deal.title)}`}><span>Get deal</span><Icon name="arrow" /></a></div></div>
        </article>;
      })}</div> : <div className="empty"><span>⌕</span><h3>No matching deals yet</h3><p>Try another search or category.</p></div>}
    </section>

    <section className="ai-lab" id="ai-lab"><div className="ai-lab-copy"><span className="eyebrow">THE SMART LAYER</span><h2>A little intelligence.<br />A lot less scrolling.</h2><p>Every listing gets a transparent value signal generated from the information shown on the card—discount depth, customer rating and shopper interest.</p><div className="signal-legend"><span><i className="violet" />Price gap</span><span><i className="cyan" />Rating</span><span><i className="lime" />Popularity</span></div></div><div className="formula-card"><div className="formula-top"><span>DEAL INTELLIGENCE</span><b>Transparent by design</b></div><div className="formula-score"><small>VALUE SIGNAL</small><strong>92</strong><span>/ 98</span></div><div className="formula-bars"><i style={{width:"88%"}} /><i style={{width:"74%"}} /><i style={{width:"82%"}} /></div><p>This is a discovery aid—not a guarantee or price-history claim. Always confirm the final price on the retailer site.</p></div></section>

    <section className="how" id="about"><div><span className="eyebrow">DEALS, MINUS THE DRAMA</span><h2>From signal<br /><em>to smart choice.</em></h2></div><div className="steps"><article><b>01</b><span><Icon name="scan" /></span><h3>Bring together</h3><p>Selected offers from popular Indian stores appear in one colorful catalogue.</p></article><article><b>02</b><span><Icon name="chart" /></span><h3>Score the value</h3><p>A simple signal combines the displayed savings, rating and shopper interest.</p></article><article><b>03</b><span><Icon name="shield" /></span><h3>Choose confidently</h3><p>Compare the details, then complete your purchase securely on the retailer’s site.</p></article></div></section>
    <section className="newsletter"><div><span>✦</span><div><h2>Let smart deals find you.</h2><p>A short, useful weekly roundup. No spam.</p></div></div><form onSubmit={(e) => e.preventDefault()}><input type="email" placeholder="you@email.com" aria-label="Email address" required /><button>Join the radar →</button></form></section>
    <footer><a className="brand" href="#top"><span className="brand-mark">%</span><span>deals<span className="brand-dot">.</span></span></a><p>AI-assisted savings for everyday India.<br /><span className="affiliate-disclosure">As an Amazon Associate I earn from qualifying purchases.</span></p><div><a href="#about">About</a><a href="#">Privacy</a><a href="#">Terms</a><a href="#">Contact</a></div><small>© 2026 deals.ads-ai.in</small></footer>
  </main>;
}
