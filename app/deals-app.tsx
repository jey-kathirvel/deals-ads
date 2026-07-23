"use client";

import { useMemo, useState } from "react";
import type { Deal } from "@/lib/deal-types";

const categories = ["All", "Mobiles", "Electronics", "Fashion", "Home", "Beauty", "Travel"];
const inr = new Intl.NumberFormat("en-IN");
const scoreDeal = (deal: Deal) => Math.min(98, Math.round(38 + Math.max(0, (1 - deal.price / deal.mrp) * 100) * .55 + deal.rating * 4 + Math.min(deal.votes, 250) * .04));

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
      <div className="search-box"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ask for a product, brand or store" aria-label="Search deals" /><kbd>⌘ K</kbd></div>
      <nav><a href="#deals">Deals</a><a href="#ai-lab">AI Signals</a><a href="#stores">Stores</a><a href="#about">How it works</a></nav>
      <button className="saved-button" aria-label={`${saved.length} saved deals`}>♡ <span>Saved</span> <b>{saved.length}</b></button>
    </header>

    <section className="hero" id="top">
      <div className="hero-copy"><span className="eyebrow">✦ MEET YOUR AI DEAL RADAR</span><h1>Smarter finds.<br /><em>Brighter savings.</em></h1><p>Explore colorful, curated offers with an AI-inspired value signal that makes the strongest deals easier to spot.</p><div className="hero-actions"><a className="primary" href="#deals">Explore smart picks <span>→</span></a><a className="text-link" href="#ai-lab">See how signals work</a></div><div className="trust-row"><span><b>Clear</b> comparisons</span><i /><span><b>Fast</b> discovery</span><i /><span><b>Free</b> to explore</span></div></div>
      <div className="ai-orbit" aria-label="AI deal intelligence illustration"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="ai-core"><small>AI DEAL</small><strong>RADAR</strong><span>✦</span></div><div className="signal-card signal-price"><span>PRICE SIGNAL</span><b>Strong value</b><small>Based on price gap</small></div><div className="signal-card signal-rating"><span>SHOPPER SIGNAL</span><b>★ 4.6</b><small>Rating confidence</small></div><div className="signal-card signal-save"><span>SMART PICK</span><b>Save more</b><small>Compare before buying</small></div></div>
    </section>

    <section className="platforms" id="stores"><span>Explore stores you know</span><div><b className="amazon">amazon</b><b className="flipkart">Flipkart</b><b className="myntra">Myntra</b><b className="nykaa">NYKAA</b><b className="croma">CROMA</b><b className="tata">TATA CLiQ</b></div></section>

    <section className="deals-section" id="deals">
      <div className="section-head"><div><span className="eyebrow dark">✦ AI-ASSISTED PICKS</span><h2>Deals worth a closer look</h2><p>Compare savings, ratings and shopper interest at a glance.</p></div><div className="sort"><label htmlFor="sort">Sort by</label><select id="sort" value={sort} onChange={(e) => setSort(e.target.value)}><option>Popular</option><option>Discount</option><option>Price: Low</option></select></div></div>
      <div className="category-tabs" role="tablist">{categories.map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)} role="tab" aria-selected={category === item}>{item}</button>)}</div>
      {filtered.length ? <div className="deal-grid">{filtered.map((deal) => {
        const discount = Math.round((1 - deal.price / deal.mrp) * 100);
        return <article className="deal-card" key={deal.id}>
          <div className="product-visual" style={{ background: deal.color }}><span className="deal-tag">{deal.tag}</span><span className="ai-score"><b>{scoreDeal(deal)}</b><small>AI signal</small></span><button className={saved.includes(deal.id) ? "heart saved" : "heart"} onClick={() => setSaved((items) => items.includes(deal.id) ? items.filter((id) => id !== deal.id) : [...items, deal.id])} aria-label="Save deal">{saved.includes(deal.id) ? "♥" : "♡"}</button>{deal.imageUrl ? <img className="product-image" src={deal.imageUrl} alt={deal.title} loading="lazy" /> : <span className="product-emoji">{deal.emoji}</span>}</div>
          <div className="deal-content"><div className="platform-name">{deal.platform}<span>★ {deal.rating}</span></div><h3>{deal.title}</h3><div className="price-row"><strong>₹{inr.format(deal.price)}</strong><s>₹{inr.format(deal.mrp)}</s><b>{discount}% off</b></div>{deal.code ? <button className="coupon" onClick={() => copyCode(deal.code)}><span>{copied === deal.code ? "Copied!" : deal.code}</span><b>{copied === deal.code ? "✓" : "Copy"}</b></button> : <div className="auto-deal">✓ Deal applied automatically</div>}<div className="deal-footer"><small>{deal.expires}</small><a href={deal.url || "#"} target="_blank" rel="nofollow sponsored noopener">Get deal <span>↗</span></a></div></div>
        </article>;
      })}</div> : <div className="empty"><span>⌕</span><h3>No matching deals yet</h3><p>Try another search or category.</p></div>}
    </section>

    <section className="ai-lab" id="ai-lab"><div className="ai-lab-copy"><span className="eyebrow">THE SMART LAYER</span><h2>A little intelligence.<br />A lot less scrolling.</h2><p>Every listing gets a transparent value signal generated from the information shown on the card—discount depth, customer rating and shopper interest.</p><div className="signal-legend"><span><i className="violet" />Price gap</span><span><i className="cyan" />Rating</span><span><i className="lime" />Popularity</span></div></div><div className="formula-card"><div className="formula-top"><span>DEAL INTELLIGENCE</span><b>Transparent by design</b></div><div className="formula-score"><small>VALUE SIGNAL</small><strong>92</strong><span>/ 98</span></div><div className="formula-bars"><i style={{width:"88%"}} /><i style={{width:"74%"}} /><i style={{width:"82%"}} /></div><p>This is a discovery aid—not a guarantee or price-history claim. Always confirm the final price on the retailer site.</p></div></section>

    <section className="how" id="about"><div><span className="eyebrow">DEALS, MINUS THE DRAMA</span><h2>From signal<br /><em>to smart choice.</em></h2></div><div className="steps"><article><b>01</b><span>⌁</span><h3>Bring together</h3><p>Selected offers from popular Indian stores appear in one colorful catalogue.</p></article><article><b>02</b><span>✦</span><h3>Score the value</h3><p>A simple signal combines the displayed savings, rating and shopper interest.</p></article><article><b>03</b><span>↗</span><h3>Choose confidently</h3><p>Compare the details, then complete your purchase securely on the retailer’s site.</p></article></div></section>
    <section className="newsletter"><div><span>✦</span><div><h2>Let smart deals find you.</h2><p>A short, useful weekly roundup. No spam.</p></div></div><form onSubmit={(e) => e.preventDefault()}><input type="email" placeholder="you@email.com" aria-label="Email address" required /><button>Join the radar →</button></form></section>
    <footer><a className="brand" href="#top"><span className="brand-mark">%</span><span>deals<span className="brand-dot">.</span></span></a><p>AI-assisted savings for everyday India.<br /><span className="affiliate-disclosure">As an Amazon Associate I earn from qualifying purchases.</span></p><div><a href="#about">About</a><a href="#">Privacy</a><a href="#">Terms</a><a href="#">Contact</a></div><small>© 2026 deals.ads-ai.in</small></footer>
  </main>;
}
