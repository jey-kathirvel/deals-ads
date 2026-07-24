import Link from "next/link";

import {
  getDealCategories,
  getDealsByCategory,
} from "@/lib/catalog";
import { getPublishedDeals } from "@/lib/deals-store";

import styles from "./home-category-showcase.module.css";

const MAX_CATEGORIES = 6;

function categoryAccent(index: number): string {
  const accents = [
    styles.violet,
    styles.blue,
    styles.green,
    styles.orange,
    styles.pink,
    styles.cyan,
  ];

  return accents[index % accents.length];
}

export default async function HomeCategoryShowcase() {
  const deals = await getPublishedDeals();
  const categories = getDealCategories(deals).slice(0, MAX_CATEGORIES);

  if (categories.length === 0) {
    return null;
  }

  return (
    <section
      className={styles.section}
      id="categories"
      aria-labelledby="home-categories-title"
    >
      <div className={styles.headingRow}>
        <div>
          <p className={styles.eyebrow}>SHOP BY CATEGORY</p>

          <h2 id="home-categories-title">
            Find the right deal,
            <span> faster.</span>
          </h2>

          <p className={styles.description}>
            Explore published offers grouped into clear shopping categories.
          </p>
        </div>

        <Link className={styles.viewAll} href="/categories">
          View all categories
          <span aria-hidden="true">→</span>
        </Link>
      </div>

      <div className={styles.grid}>
        {categories.map((category, index) => {
          const categoryDeals = getDealsByCategory(
            deals,
            category.slug,
          );

          const preview = categoryDeals
            .slice(0, 2)
            .map((deal) => deal.title);

          return (
            <article
              className={`${styles.card} ${categoryAccent(index)}`}
              key={category.slug}
            >
              <Link
                className={styles.cardLink}
                href={`/category/${category.slug}`}
                aria-label={`Browse ${category.name} deals`}
              >
                <div className={styles.cardHeader}>
                  <span className={styles.number}>
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <span className={styles.count}>
                    {category.count}
                    {category.count === 1 ? " deal" : " deals"}
                  </span>
                </div>

                <h3>{category.name}</h3>

                {preview.length > 0 ? (
                  <ul>
                    {preview.map((title) => (
                      <li key={title}>{title}</li>
                    ))}
                  </ul>
                ) : (
                  <p>New offers will appear here after publication.</p>
                )}

                <div className={styles.cardFooter}>
                  <span>Browse deals</span>
                  <strong aria-hidden="true">↗</strong>
                </div>
              </Link>
            </article>
          );
        })}
      </div>

      <div className={styles.mobileAction}>
        <Link href="/categories">
          Browse every category
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}
