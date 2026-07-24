import {
  calculateDiscountPercent,
  normalizeAmazonImageUrl,
  parseAmazonAffiliateLink,
} from "@/lib/amazon/affiliate-link";

import {
  importDeals,
} from "@/lib/deals-store";

export const dynamic = "force-dynamic";

type ImportRequest = {
  amazonUrl?: string;
  title?: string;
  category?: string;
  price?: number | string;
  mrp?: number | string;
  rating?: number | string;
  votes?: number | string;
  imageUrl?: string;
  expiryDate?: string;
  couponCode?: string;
  couponTerms?: string;
  publish?: boolean;
};

function numberValue(
  value: number | string | undefined,
  fallback = 0,
): number {
  if (typeof value === "number") {
    return Number.isFinite(value)
      ? value
      : fallback;
  }

  if (typeof value === "string") {
    const parsed = Number(
      value.replace(/[₹,\s]/g, ""),
    );

    return Number.isFinite(parsed)
      ? parsed
      : fallback;
  }

  return fallback;
}

function validateExpiryDate(
  value: string,
): string {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  const timestamp = new Date(trimmed).getTime();

  if (!Number.isFinite(timestamp)) {
    throw new Error("Expiry date is invalid.");
  }

  return trimmed;
}

export async function POST(
  request: Request,
) {
  try {
    const body =
      (await request.json()) as ImportRequest;

    const title =
      body.title?.trim() || "";

    const category =
      body.category?.trim() ||
      "Amazon Deals";

    const price =
      numberValue(body.price);

    const mrp =
      numberValue(body.mrp);

    const rating =
      numberValue(body.rating, 0);

    const votes = Math.max(
      0,
      Math.round(
        numberValue(body.votes, 0),
      ),
    );

    if (!title) {
      throw new Error(
        "Product title is required.",
      );
    }

    if (title.length < 5) {
      throw new Error(
        "Product title must contain at least 5 characters.",
      );
    }

    if (price <= 0) {
      throw new Error(
        "Current selling price must be greater than zero.",
      );
    }

    if (mrp <= 0) {
      throw new Error(
        "MRP must be greater than zero.",
      );
    }

    if (price > mrp) {
      throw new Error(
        "Selling price cannot be greater than MRP.",
      );
    }

    if (rating < 0 || rating > 5) {
      throw new Error(
        "Rating must be between 0 and 5.",
      );
    }

    const amazon =
      parseAmazonAffiliateLink(
        body.amazonUrl || "",
      );

    const discount =
      calculateDiscountPercent(
        price,
        mrp,
      );

    const imageUrl =
      normalizeAmazonImageUrl(
        body.imageUrl || "",
      );

    const expiryDate =
      validateExpiryDate(
        body.expiryDate || "",
      );

    const result = await importDeals(
      [
        {
          title,
          platform: "Amazon",
          category,
          price: String(price),
          mrp: String(mrp),
          rating: String(rating),
          votes: String(votes),
          tag:
            discount > 0
              ? `${discount}% OFF`
              : "Amazon deal",
          imageUrl,
          code:
            body.couponCode?.trim() ||
            "",
          couponTerms:
            body.couponTerms?.trim() ||
            "",
          expires: expiryDate
            ? "Deal ends soon"
            : "Limited time",
          expiryDate,
          url: amazon.affiliateUrl,
          sourceUrl: amazon.sourceUrl,
        },
      ],
      {
        publish:
          body.publish === true,
        source: "amazon",
      },
    );

    if (
      result.imported === 0 &&
      result.skipped > 0
    ) {
      return Response.json(
        {
          error: "Duplicate deal",
          message:
            "This Amazon product already exists in the deals store.",
          asin: amazon.asin,
          ...result,
        },
        {
          status: 409,
        },
      );
    }

    if (result.errors.length > 0) {
      return Response.json(
        {
          error:
            "Import validation failed",
          errors: result.errors,
        },
        {
          status: 400,
        },
      );
    }

    return Response.json(
      {
        success: true,
        asin: amazon.asin,
        affiliateUrl:
          amazon.affiliateUrl,
        discountPercent: discount,
        status:
          body.publish === true
            ? "published"
            : "review",
        ...result,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    return Response.json(
      {
        error:
          "Amazon deal import failed",
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
