import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getDealBySlug,
  getDealSlug,
  getRelatedDeals,
} from "@/lib/deals-store";

import styles from "./deal-page.module.css";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const deal = await getDealBySlug(slug);

  if (!deal) {
    return {
      title: "Deal not found | Deals.ai",
    };
  }

  const discount = Math.max(
    0,
    Math.round((1 - deal.price / deal.mrp) * 100),
  );

  const description =
    `${deal.title} for ₹${deal.price.toLocaleString("en-IN")} ` +
    `on ${deal.platform}. Save ${discount}% compared with the listed MRP.`;

  return {
    title: `${deal.title} Deal | Deals.ai`,
    description,
    alternates: {
      canonical: `/deal/${getDealSlug(deal)}`,
    },
    openGraph: {
      title: `${deal.title} Deal`,
      description,
      type: "website",
      url: `/deal/${getDealSlug(deal)}`,
      siteName: "Deals.ai",
      images: deal.imageUrl
        ? [
            {
              url: deal.imageUrl,
              alt: deal.title,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${deal.title} Deal | Deals.ai`,
      description,
      images: deal.imageUrl ? [deal.imageUrl] : undefined,
    },
  };
}

export default async function DealPage({ params }: PageProps) {
  const { slug } = await params;
  const deal = await getDealBySlug(slug);

  if (!deal) {
    notFound();
  }

  const relatedDeals = await getRelatedDeals(deal, 4);

  const discount = Math.max(
    0,
    Math.round((1 - deal.price / deal.mrp) * 100),
  );

  const savings = Math.max(0, deal.mrp - deal.price);
  const dealPath = `/deal/${getDealSlug(deal)}`;
  const dealUrl = `https://deals.ads-ai.in${dealPath}`;

  const breadcrumbStructuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://deals.ads-ai.in",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Deals",
        item: "https://deals.ads-ai.in",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: deal.title,
        item: dealUrl,
      },
    ],
  };

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: deal.title,
    image: deal.imageUrl ? [deal.imageUrl] : undefined,
    description:
      `${deal.title} available on ${deal.platform} for ` +
      `₹${deal.price.toLocaleString("en-IN")}.`,
    brand: {
      "@type": "Brand",
      name: deal.platform,
    },
    offers: {
      "@type": "Offer",
      url: dealUrl,
      priceCurrency: "INR",
      price: deal.price,
      availability: "https://schema.org/InStock",
      seller: {
        "@type": "Organization",
        name: deal.platform,
      },
    },
    aggregateRating:
      deal.rating > 0 && deal.votes > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: deal.rating,
            ratingCount: deal.votes,
          }
        : undefined,
  };

  return (
    <main className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbStructuredData).replace(
            /</g,
            "\\u003c",
          ),
        }}
      />

      <div className={styles.container}>
        <nav
          className={styles.breadcrumb}
          aria-label="Breadcrumb"
        >
          <Link href="/">Home</Link>
          <span>/</span>
          <Link href="/">Deals</Link>
          <span>/</span>
          <span>{deal.title}</span>
        </nav>

        <Link className={styles.backLink} href="/">
          ← Back to all deals
        </Link>

        <article className={styles.dealCard}>
          <div className={styles.visual}>
            <span className={styles.discountBadge}>{discount}% OFF</span>

            {deal.imageUrl ? (
              <img
                className={styles.image}
                src={deal.imageUrl}
                alt={deal.title}
              />
            ) : (
              <span className={styles.emoji}>{deal.emoji}</span>
            )}
          </div>

          <div className={styles.content}>
            <p className={styles.platform}>{deal.platform}</p>

            <h1 className={styles.title}>{deal.title}</h1>

            <div className={styles.rating}>
              <span className={styles.star}>★</span>
              <strong>{deal.rating}</strong>
              <span>({deal.votes.toLocaleString("en-IN")} shopper votes)</span>
            </div>

            <div className={styles.priceRow}>
              <strong className={styles.price}>
                ₹{deal.price.toLocaleString("en-IN")}
              </strong>

              <del className={styles.mrp}>
                ₹{deal.mrp.toLocaleString("en-IN")}
              </del>

              <span className={styles.saving}>
                Save ₹{savings.toLocaleString("en-IN")}
              </span>
            </div>

            <p className={styles.notice}>
              Price and availability may change on the retailer website.
              Confirm the final price before completing your purchase.
            </p>

            <a
              className={styles.buyButton}
              href={deal.url}
              target="_blank"
              rel="nofollow sponsored noopener"
            >
              Buy on {deal.platform} →
            </a>

            <span className={styles.disclosure}>
              Affiliate link. Deals.ai may earn a commission from qualifying
              purchases.
            </span>
          </div>
        </article>

        {relatedDeals.length > 0 && (
          <section className={styles.relatedSection}>
            <h2 className={styles.relatedHeading}>Related Deals</h2>

            <div className={styles.relatedGrid}>
              {relatedDeals.map((item) => (
                <Link
                  className={styles.relatedCard}
                  href={`/deal/${getDealSlug(item)}`}
                  key={item.id}
                >
                  <div className={styles.relatedImageWrap}>
                    {item.imageUrl ? (
                      <img
                        className={styles.relatedImage}
                        src={item.imageUrl}
                        alt={item.title}
                        loading="lazy"
                      />
                    ) : (
                      <span className={styles.relatedEmoji}>{item.emoji}</span>
                    )}
                  </div>

                  <span className={styles.relatedPlatform}>
                    {item.platform}
                  </span>

                  <h3 className={styles.relatedTitle}>{item.title}</h3>

                  <strong className={styles.relatedPrice}>
                    ₹{item.price.toLocaleString("en-IN")}
                  </strong>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
