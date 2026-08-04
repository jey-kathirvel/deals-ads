import type { Metadata } from "next";
import Link from "next/link";

import styles from "../legal.module.css";

export const metadata: Metadata = {
  title: "Deal Selection & Editorial Policy",
  description:
    "Learn how Deals.ai discovers, checks, ranks and removes online deals.",
  alternates: { canonical: "/editorial-policy" },
};

export default function EditorialPolicyPage() {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <Link className={styles.back} href="/">
          ← Back to deals
        </Link>
        <article className={styles.article}>
          <span className={styles.eyebrow}>TRANSPARENT BY DESIGN</span>
          <h1>Deal Selection Policy</h1>
          <p className={styles.updated}>Last updated: 31 July 2026</p>

          <h2>How deals are discovered</h2>
          <p>
            Deals are collected from supported retailer and quick-commerce data
            sources. A listing must include a product name, working image,
            current price, listed price and destination link before it can
            appear publicly.
          </p>

          <h2>How deals are selected</h2>
          <p>
            Eligible offers are assessed using displayed savings, product
            relevance, rating and shopper-interest signals. Category balancing
            helps prevent one product type from occupying the entire feed.
          </p>

          <h2>Freshness checks</h2>
          <p>
            Published provider deals are rechecked on a rolling basis. A
            successful availability check remains fresh for up to 72 hours.
            Deals confirmed as inactive or expired are permanently removed.
            Temporary provider errors do not cause automatic deletion.
          </p>

          <h2>Corrections</h2>
          <p>
            Retailer information can change quickly. Report an inaccurate
            listing through the <Link href="/#contact">feedback form</Link> and
            include the product name and retailer.
          </p>
        </article>
      </div>
    </main>
  );
}
