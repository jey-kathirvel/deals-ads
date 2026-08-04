import type { Metadata } from "next";
import Link from "next/link";

import styles from "../legal.module.css";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Read how Deals.ai handles information submitted through the website.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <Link className={styles.back} href="/">
          ← Back to deals
        </Link>
        <article className={styles.article}>
          <span className={styles.eyebrow}>DEALS.AI</span>
          <h1>Privacy Policy</h1>
          <p className={styles.updated}>Last updated: 31 July 2026</p>

          <h2>Information you provide</h2>
          <p>
            When you send feedback or contact us, we may process the name, email
            address and message you submit so we can respond and improve the
            service.
          </p>

          <h2>Technical information</h2>
          <p>
            Our hosting and security systems may record standard technical
            information such as request times, browser details, IP addresses and
            error logs for reliability, abuse prevention and diagnostics.
          </p>

          <h2>Retailer links</h2>
          <p>
            Deals.ai links to third-party retailers. Their websites have their
            own privacy practices, which apply after you leave Deals.ai.
          </p>

          <h2>Contact</h2>
          <p>
            For privacy questions, use the feedback form on the{" "}
            <Link href="/#contact">home page</Link>.
          </p>
        </article>
      </div>
    </main>
  );
}
