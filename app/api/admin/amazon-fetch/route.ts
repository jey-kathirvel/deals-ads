import {
  fetchAmazonProductDetails,
} from "@/lib/amazon/product-fetch";

import {
  parseAmazonAffiliateLink,
} from "@/lib/amazon/affiliate-link";

export const dynamic = "force-dynamic";

type FetchRequest = {
  amazonUrl?: string;
};

const AMAZON_SHORT_HOSTS = new Set([
  "amzn.to",
  "www.amzn.to",
  "link.amazon",
  "www.link.amazon",
  "amazon.app.link",
  "www.amazon.app.link",
  "amazon.page.link",
  "www.amazon.page.link",
]);

function normalizeInputUrl(value: string): URL {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error("Amazon URL is required.");
  }

  const normalized = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  const parsed = new URL(normalized);

  if (parsed.protocol !== "https:") {
    throw new Error(
      "Only HTTPS Amazon URLs are supported.",
    );
  }

  return parsed;
}

function getLastPathToken(url: URL): string {
  const segments = url.pathname
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);

  return segments.at(-1) || "";
}

function isValidAsin(value: string): boolean {
  return /^[A-Z0-9]{10}$/i.test(value);
}

function buildPartialProduct(
  sourceUrl: string,
  asin: string,
) {
  const canonicalUrl =
    `https://www.amazon.in/dp/${asin}`;

  const affiliate =
    parseAmazonAffiliateLink(canonicalUrl);

  return {
    asin: asin.toUpperCase(),
    sourceUrl,
    resolvedUrl: canonicalUrl,
    affiliateUrl: affiliate.affiliateUrl,
    title: "",
    imageUrl: "",
    price: 0,
    mrp: 0,
    discountPercent: 0,
    rating: 0,
    reviewCount: 0,
    availability: "",
    category: "Amazon Deals",
  };
}

export async function POST(request: Request) {
  try {
    const body =
      (await request.json()) as FetchRequest;

    const amazonUrl =
      body.amazonUrl?.trim() || "";

    if (!amazonUrl) {
      return Response.json(
        {
          error: "Amazon URL is required.",
        },
        {
          status: 400,
        },
      );
    }

    try {
      const product =
        await fetchAmazonProductDetails(
          amazonUrl,
        );

      const partial = !product.title;

      return Response.json({
        success: true,
        partial,
        message: partial
          ? "Amazon URL and affiliate link were processed. Amazon blocked automatic product metadata, so enter the remaining fields manually."
          : "Amazon product details fetched successfully.",
        product,
      });
    } catch (fetchError) {
      const parsedUrl =
        normalizeInputUrl(amazonUrl);

      const host =
        parsedUrl.hostname.toLowerCase();

      if (!AMAZON_SHORT_HOSTS.has(host)) {
        throw fetchError;
      }

      const pathToken =
        getLastPathToken(parsedUrl);

      /*
       * Some SiteStripe links expose the ASIN directly
       * as their final path token. In that case we do not
       * need Amazon's redirect response.
       */
      if (isValidAsin(pathToken)) {
        const product =
          buildPartialProduct(
            amazonUrl,
            pathToken,
          );

        return Response.json({
          success: true,
          partial: true,
          message:
            "Amazon blocked the short-link redirect, but a valid ASIN was found in the URL. The affiliate link was generated successfully. Enter the remaining product fields manually.",
          product,
        });
      }

      const tokenLength = pathToken.length;

      return Response.json(
        {
          error:
            "Amazon blocked the SiteStripe redirect.",
          message:
            pathToken
              ? `The short-link token "${pathToken}" contains ${tokenLength} characters and is not a valid 10-character ASIN. Open the SiteStripe link in your browser, copy the final amazon.in product URL, and paste that URL here.`
              : "Open the SiteStripe link in your browser, copy the final amazon.in product URL, and paste that URL here.",
          shortLinkBlocked: true,
          token: pathToken,
          tokenLength,
        },
        {
          status: 422,
        },
      );
    }
  } catch (error) {
    return Response.json(
      {
        error:
          "Unable to process Amazon URL.",
        message:
          error instanceof Error
            ? error.message
            : String(error),
      },
      {
        status: 400,
      },
    );
  }
}
