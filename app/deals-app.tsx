"use client";

import { useMemo, useState } from "react";
import type { Deal } from "@/lib/deal-types";

const categories = ["All", "Mobiles", "Electronics", "Fashion", "Home", "Beauty", "Travel"];

const deals = [
  { id: 1, title: "Noise ColorFit Pro 5 Smartwatch", platform: "Amazon", category: "Electronics", price: 2999, mrp: 6999, rating: 4.4, votes: 126, tag: "Lowest price", color: "#f4e8ff", emoji: "⌚", code: "", expires: "Ends tonight" },
  { id: 2, title: "Samsung Galaxy S24 5G, 128 GB", platform: "Flipkart", category: "Mobiles", price: 46999, mrp: 74999, rating: 4.7, votes: 214, tag: "Bank offer", color: "#e5efff", emoji: "▯", code: "SAMSUNG2K", expires: "Limited time" },
  { id: 3, title: "Puma Unisex Sneakers", platform: "Myntra", category: "Fashion", price: 1799, mrp: 4999, rating: 4.5, votes: 89, tag: "Trending", color: "#fff0e3", emoji: "👟", code: "STYLE10", expires: "2 days left" },
  { id: 4, title: "boAt Airdopes 141 ANC", platform: "Amazon", category: "Electronics", price: 1499, mrp: 5990, rating: 4.3, votes: 178, tag: "Hot deal", color: "#e3f8f0", emoji: "🎧", code: "", expires: "Ends today" },
  { id: 5, title: "Minimalist Skin Essentials Combo", platform: "Nykaa", category: "Beauty", price: 899, mrp: 1399, rating: 4.6, votes: 73, tag: "Extra 10% off", color: "#ffeaf0", emoji: "✦", code: "GLOW10", expires: "3 days left" },
  { id: 6, title: "Urban Ladder Study Table", platform: "Tata CLiQ", category: "Home", price: 5299, mrp: 9999, rating: 4.2, votes: 45, tag: "Best seller", color: "#f5eddf", emoji: "▰", code: "HOME500", expires: "This week" },
  { id: 7, title: "OnePlus Nord CE4 Lite 5G", platform: "Croma", category: "Mobiles", price: 17999, mrp: 23999, rating: 4.5, votes: 194, tag: "Exchange bonus", color: "#e6f2f5", emoji: "▯", code: "", expires: "Limited stock" },
  { id: 8, title: "Goa return flights from Bengaluru", platform: "MakeMyTrip", category: "Travel", price: 4499, mrp: 6899, rating: 4.4, votes: 61, tag: "Summer sale", color: "#fff4d7", emoji: "✈", code: "FLYHIGH", expires: "Book by Friday" },
];

const inr = new Intl.NumberFormat("en-IN");

export default function DealsApp({ initialDeals = deals as Deal[] }: { initialDeals?: Deal[] }) {
  const liveDeals = initialDeals;
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("Popular");
  const [saved, setSaved] = useState<number[]>([]);
  const [copied, setCopied] = useState("");

  const filtered = useMemo(() => {
    const result = liveDeals.filter((deal) => (category === "All" || deal.category === category) && `${deal.title} ${deal.platform}`.toLowerCase().includes(query.toLowerCase()));
    return [...result].sort((a, b) => sort === "Discount" ? (1 - b.price / b.mrp) - (1 - a.price / a.mrp) : sort === "Price: Low" ? a.price - b.price : b.votes - a.votes);
  }, [category, query, sort, liveDeals]);

  const copyCode = async (code: string) => {
    await navigator.clipboard?.writeText(code);
    setCopied(code);
    window.setTimeout(() => setCopied(""), 1400);
  };

  return (
    <main>
      <div className="top-strip">India’s smartest deals, handpicked daily <span>•</span> Prices may change at the retailer</div>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Deals home"><span className="brand-mark">%</span><span>deals<span className="brand-dot">.</span></span></a>
        <div className="search-box">
          <span aria-hidden="true">⌕</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products, brands or stores" aria-label="Search deals" />
          <kbd>⌘ K</kbd>
        </div>
        <nav><a href="#deals">Deals</a><a href="#stores">Stores</a><a href="#about">How it works</a></nav>
        <button className="saved-button" onClick={() => setQuery(saved.length ? "" : "saved-deals")} aria-label={`${saved.length} saved deals`}>♡ <span>Saved</span> <b>{saved.length}</b></button>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <span className="eyebrow">● LIVE DEALS ACROSS INDIA</span>
          <h1>Spend less.<br /><em>Live more.</em></h1>
          <p>We scan India’s favourite stores to surface deals worth your time — no noise, just genuine savings.</p>
          <div className="hero-actions"><a className="primary" href="#deals">Explore today’s deals <span>→</span></a><a className="text-link" href="#about">How we find deals</a></div>
          <div className="trust-row"><span><b>500+</b> deals checked daily</span><i></i><span><b>₹12L+</b> saved by shoppers</span><i></i><span><b>100%</b> free to use</span></div>
        </div>
        <div className="hero-card" aria-label="Featured deal">
          <div className="deal-stamp">DEAL OF<br />THE DAY</div>
          <div className="hero-product">🎧</div>
          <div className="hero-card-content"><span>Amazon • Electronics</span><h3>Sony WH-CH720N Headphones</h3><div><strong>₹7,990</strong><s>₹14,990</s><b>47% OFF</b></div><a href="#deals">View deal →</a></div>
        </div>
      </section>

      <section className="platforms" id="stores"><span>Deals from stores you trust</span><div><b className="amazon">amazon</b><b className="flipkart">Flipkart</b><b className="myntra">Myntra</b><b className="nykaa">NYKAA</b><b className="croma">CROMA</b><b className="tata">TATA CLiQ</b></div></section>

      <section className="deals-section" id="deals">
        <div className="section-head"><div><span className="eyebrow dark">FRESH PICKS</span><h2>Today’s best deals</h2><p>Updated throughout the day. The good ones don’t last.</p></div><div className="sort"><label htmlFor="sort">Sort by</label><select id="sort" value={sort} onChange={(e) => setSort(e.target.value)}><option>Popular</option><option>Discount</option><option>Price: Low</option></select></div></div>
        <div className="category-tabs" role="tablist">{categories.map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)} role="tab" aria-selected={category === item}>{item}</button>)}</div>
        {filtered.length ? <div className="deal-grid">{filtered.map((deal) => {
          const discount = Math.round((1 - deal.price / deal.mrp) * 100);
          return <article className="deal-card" key={deal.id}>
            <div className="product-visual" style={{ background: deal.color }}><span className="deal-tag">{deal.tag}</span><button className={saved.includes(deal.id) ? "heart saved" : "heart"} onClick={() => setSaved((items) => items.includes(deal.id) ? items.filter((id) => id !== deal.id) : [...items, deal.id])} aria-label="Save deal">{saved.includes(deal.id) ? "♥" : "♡"}</button><span className="product-emoji">{deal.emoji}</span></div>
            <div className="deal-content"><div className="platform-name">{deal.platform}<span>★ {deal.rating}</span></div><h3>{deal.title}</h3><div className="price-row"><strong>₹{inr.format(deal.price)}</strong><s>₹{inr.format(deal.mrp)}</s><b>{discount}% off</b></div>
              {deal.code ? <button className="coupon" onClick={() => copyCode(deal.code)}><span>{copied === deal.code ? "Copied!" : deal.code}</span><b>{copied === deal.code ? "✓" : "Copy"}</b></button> : <div className="auto-deal">✓ Deal applied automatically</div>}
              <div className="deal-footer"><small>{deal.expires}</small><a href={deal.url || "#"} target="_blank" rel="nofollow sponsored noopener">Get deal <span>↗</span></a></div>
            </div>
          </article>;
        })}</div> : <div className="empty"><span>⌕</span><h3>No matching deals yet</h3><p>Try another search or category.</p></div>}
      </section>

      <section className="how" id="about"><div><span className="eyebrow">DEALS, MINUS THE DRAMA</span><h2>Good deals.<br /><em>Zero guesswork.</em></h2></div><div className="steps"><article><b>01</b><span>⌁</span><h3>We scan</h3><p>Offers across India’s leading online stores are brought into one place.</p></article><article><b>02</b><span>✓</span><h3>We verify</h3><p>Prices, coupon codes and terms are checked before a deal is listed.</p></article><article><b>03</b><span>↗</span><h3>You save</h3><p>Tap “Get deal” and complete your purchase securely on the retailer’s site.</p></article></div></section>

      <section className="newsletter"><div><span>✦</span><div><h2>The best deals, before they’re gone.</h2><p>A short, useful weekly roundup. No spam.</p></div></div><form onSubmit={(e) => e.preventDefault()}><input type="email" placeholder="you@email.com" aria-label="Email address" required /><button>Send me deals →</button></form></section>
      <footer><a className="brand" href="#top"><span className="brand-mark">%</span><span>deals<span className="brand-dot">.</span></span></a><p>Smart savings for everyday India.</p><div><a href="#about">About</a><a href="#">Privacy</a><a href="#">Terms</a><a href="#">Contact</a></div><small>© 2026 deals.ads-ai.in</small></footer>
    </main>
  );
}
