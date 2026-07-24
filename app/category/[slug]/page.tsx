import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getCategoryNameBySlug,
  getDealCategories,
  getDealsByCategory,
} from "@/lib/catalog";
import { getPublishedDeals } from "@/lib/deals-store";
import { slugify } from "@/lib/slug";

import styles from "./category-page.module.css";

type CategoryPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

const SITE_URL = "https://deals.ads-ai.in";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function calculateDiscount(price: number, mrp: number): number {
  if (!mrp || mrp <= price) {
    return 0;
  }

  return Math.round(((mrp - price) / mrp) * 100);
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const deals = await getPublishedDeals();
  const categoryName = getCategoryNameBySlug(deals, slug);

  if (!categoryName) {
    return {
      title: "Category not found | Deals.ai",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const canonicalUrl = `${SITE_URL}/category/${slug}`;
  const description =
    `Explore the latest ${categoryName} offers, discounts and curated ` +
    "shopping deals from popular online stores in India.";

  return {
    title: `${categoryName} Deals & Offers | Deals.ai`,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: "website",
      siteName: "Deals.ai",
      title: `${categoryName} Deals & Offers`,
      description,
      url: canonicalUrl,
    },
    twitter: {
      card: "summary_large_image",
      title: `${categoryName} Deals & Offers`,
      description,
    },
  };
}

export async function generateStaticParams() {
  const deals = await getPublishedDeals();

  return getDealCategories(deals).map((category) => ({
    slug: category.slug,
  }));
}

export default async function CategoryPage({
  params,
}: CategoryPageProps) {
  const { slug } = await params;
  const deals = await getPublishedDeals();
  const categoryName = getCategoryNameBySlug(deals, slug);

  if (!categoryName) {
    notFound();
  }

  const categoryDeals = getDealsByCategory(deals, slug);
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
        item: `${SITE_URL}/#categories`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: categoryName,
        item: `${SITE_URL}/category/${slug}`,
      },
    ],
  };

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${categoryName} Deals`,
    url: `${SITE_URL}/category/${slug}`,
    numberOfItems: categoryDeals.length,
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

          <Link className={styles.backLink} href="/#deals">
            ← All deals
          </Link>
        </div>
      </header>

      <section className={styles.hero}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span>/</span>
          <span>Categories</span>
          <span>/</span>
          <strong>{categoryName}</strong>
        </nav>

        <p className={styles.eyebrow}>CURATED CATEGORY</p>
        <h1>{categoryName} Deals</h1>
        <p className={styles.description}>
          Explore selected {categoryName.toLowerCase()} offers with clear
          prices, discounts and retailer information.
        </p>

        <div className={styles.summary}>
          <strong>{categoryDeals.length}</strong>
          <span>
            {categoryDeals.length === 1 ? "deal available" : "deals available"}
          </span>
        </div>
      </section>

      <section className={styles.content}>
        <div className={styles.categoryNav} id="categories">
          {categories.map((category) => (
            <Link
              key={category.slug}
              className={
                category.slug === slug
                  ? styles.activeCategory
                  : styles.categoryLink
              }
              href={`/category/${category.slug}`}
            >
              <span>{category.name}</span>
              <b>{category.count}</b>
            </Link>
          ))}
        </div>

        {categoryDeals.length > 0 ? (
          <div className={styles.grid}>
            {categoryDeals.map((deal) => {
              const discount = calculateDiscount(deal.price, deal.mrp);
              const dealUrl = `/deal/${slugify(deal.title)}`;

              return (
                <article className={styles.card} key={deal.id}>
                  <Link
                    className={styles.cardLink}
                    href={dealUrl}
                    aria-label={`View ${deal.title}`}
                  >
                    <div className={styles.imageWrap}>
                      {deal.imageUrl ? (
                        <Image
                          className={styles.image}
                          src={deal.imageUrl}
                          alt={deal.title}
                          width={620}
                          height={460}
                          sizes="(max-width: 700px) 100vw, 33vw"
                        />
                      ) : (
                        <div className={styles.imageFallback}>DEAL</div>
                      )}

                      {discount > 0 ? (
                        <span className={styles.discount}>
                          {discount}% OFF
                        </span>
                      ) : null}
                    </div>

                    <div className={styles.cardBody}>
                      <div className={styles.platformRow}>
                        <span>{deal.platform}</span>
                        {deal.rating ? <b>★ {deal.rating}</b> : null}
                      </div>

                      <h2>{deal.title}</h2>

                      <div className={styles.priceRow}>
                        <strong>{formatCurrency(deal.price)}</strong>
                        {deal.mrp > deal.price ? (
                          <s>{formatCurrency(deal.mrp)}</s>
                        ) : null}
                      </div>

                      <div className={styles.cardFooter}>
                        <span>{deal.expires || "Limited-time deal"}</span>
                        <b>View deal →</b>
                      </div>
                    </div>
                  </Link>
                </article>
              );
            })}
          </div>
        ) : (
          <div className={styles.empty}>
            <h2>No active deals found</h2>
            <p>New deals will appear here after they are published.</p>
            <Link href="/">Browse all deals</Link>
          </div>
        )}
      </section>
    </main>
  );
}
