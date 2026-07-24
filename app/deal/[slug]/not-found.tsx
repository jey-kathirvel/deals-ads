import Link from "next/link";

import styles from "./deal-page.module.css";

export default function DealNotFound() {
  return (
    <main className={styles.notFoundPage}>
      <section className={styles.notFoundCard}>
        <span className={styles.notFoundCode}>404</span>

        <h1 className={styles.notFoundTitle}>
          This deal is no longer available
        </h1>

        <p className={styles.notFoundText}>
          The deal may have expired, been removed, or its link may have
          changed. Browse the latest verified deals instead.
        </p>

        <Link className={styles.notFoundButton} href="/">
          View Latest Deals
        </Link>
      </section>
    </main>
  );
}
