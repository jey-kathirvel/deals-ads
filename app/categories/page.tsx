import type { Metadata } from "next";
import Link from "next/link";

import {
  getDealCategories,
  getDealsByCategory,
} from "@/lib/catalog";
import { getPublishedDeals } from "@/lib/deals-store";

import styles from "./categories-page.module.css";

const SITE_URL = "https://deals.ads-ai.in";

export const metadata: Metadata = {
  title: "Deal Categories | Deals.ai",
  description:
    "Browse curated shopping deals by category across popular online stores in India.",
  alternates: {
    canonical: `${SITE_URL}/categories`,
  },
  openGraph: {
    type: "website",
    siteName: "Deals.ai",
    title: "Browse Deal Categories",
    description:
      "Discover electronics, fashion, home, beauty and other shopping deals by category.",
    url: `${SITE_URL}/categories`,
  },
  twitter: {
    card: "summary_large_image",
    title: "Browse Deal Categories",
    description:
      "Discover curated shopping offers organised by category.",
  },
};

function getCategoryAccent(index: number): string {
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

export default async function CategoriesPage() {
  const deals = await getPublishedDeals();
  const categories = getDealCategories(deals);

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Categories",
        item: `${SITE_URL}/categories`,
      },
    ],
  };

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Deal Categories",
    url: `${SITE_URL}/categories`,
    numberOfItems: categories.length,
    hasPart: categories.map((category) => ({
      "@type": "CollectionPage",
      name: category.name,
      url: `${SITE_URL}/category/${category.slug}`,
    })),
  };

  return (
    <main className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema),
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(collectionSchema),
        }}
      />

      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link className={styles.brand} href="/">
            <span>%</span>
            deals.ai
          </Link>

          <Link className={styles.homeLink} href="/">
            Home
          </Link>
        </div>
      </header>

      <section className={styles.hero}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span>/</span>
          <strong>Categories</strong>
        </nav>

        <p className={styles.eyebrow}>EXPLORE SMARTER</p>
        <h1>
          Browse deals
          <em> by category.</em>
        </h1>

        <p className={styles.description}>
          Find active offers grouped into clear shopping categories, then open
          any deal to compare its price, discount and retailer details.
        </p>

        <div className={styles.stats}>
          <div>
            <strong>{categories.length}</strong>
            <span>Categories</span>
          </div>

          <div>
            <strong>{deals.length}</strong>
            <span>Published deals</span>
          </div>
        </div>
      </section>

      <section className={styles.content}>
        {categories.length > 0 ? (
          <div className={styles.grid}>
            {categories.map((category, index) => {
              const categoryDeals = getDealsByCategory(
                deals,
                category.slug,
              );

              const exampleTitles = categoryDeals
                .slice(0, 3)
                .map((deal) => deal.title);

              return (
                <article
                  className={`${styles.card} ${getCategoryAccent(index)}`}
                  key={category.slug}
                >
                  <Link
                    className={styles.cardLink}
                    href={`/category/${category.slug}`}
                    aria-label={`Browse ${category.name} deals`}
                  >
                    <div className={styles.cardTop}>
                      <span className={styles.icon}>
                        {String(index + 1).padStart(2, "0")}
                      </span>

                      <span className={styles.count}>
                        {category.count}
                        {category.count === 1 ? " deal" : " deals"}
                      </span>
                    </div>

                    <h2>{category.name}</h2>

                    {exampleTitles.length > 0 ? (
                      <ul>
                        {exampleTitles.map((title) => (
                          <li key={title}>{title}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>New deals will appear here after publication.</p>
                    )}

                    <div className={styles.cardFooter}>
                      <span>Explore category</span>
                      <b>→</b>
                    </div>
                  </Link>
                </article>
              );
            })}
          </div>
        ) : (
          <div className={styles.empty}>
            <h2>No categories available yet</h2>
            <p>
              Categories will appear automatically when published deals are
              available.
            </p>
            <Link href="/">Return home</Link>
          </div>
        )}
      </section>
    </main>
  );
}
