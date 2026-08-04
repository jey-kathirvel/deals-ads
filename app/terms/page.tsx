import type { Metadata } from "next";
import Link from "next/link";

import styles from "../legal.module.css";

export const metadata: Metadata = {
  title: "Terms of Use",
  description:
    "Read the terms for using Deals.ai deal-discovery information and retailer links.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <Link className={styles.back} href="/">
          ← Back to deals
        </Link>
        <article className={styles.article}>
          <span className={styles.eyebrow}>DEALS.AI</span>
          <h1>Terms of Use</h1>
          <p className={styles.updated}>Last updated: 31 July 2026</p>

          <h2>Deal-discovery service</h2>
          <p>
            Deals.ai helps users discover offers published by third-party
            retailers. We do not sell or fulfil the products displayed on this
            website.
          </p>

          <h2>Prices and availability</h2>
          <p>
            Prices, discounts, stock and delivery availability can change
            without notice. Always confirm the final details on the retailer
            website before purchasing.
          </p>

          <h2>External websites</h2>
          <p>
            Purchases and customer support are governed by the retailer’s
            policies. Deals.ai is not responsible for third-party websites,
            products, delivery or transactions.
          </p>

          <h2>Affiliate disclosure</h2>
          <p>
            Some links may be affiliate links. When applicable, Deals.ai may
            receive a commission without increasing the price paid by the
            shopper.
          </p>
        </article>
      </div>
    </main>
  );
}
